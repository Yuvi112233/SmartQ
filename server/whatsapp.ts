import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";

export class WhatsAppService {
  private socket: WASocket | null = null;
  private isConnected = false;
  private authDir = path.join(process.cwd(), "auth_info");
  private io: Server | null = null;
  private currentQR: string | null = null;
  private sessionExists = false;

  setSocketIO(io: Server) {
    this.io = io;
  }

  async initialize(): Promise<boolean> {
    try {
      // Ensure auth directory exists
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Check if session files exist
      this.sessionExists = this.checkSessionExists();
      console.log(`Session exists: ${this.sessionExists}`);

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Disable terminal QR to avoid deprecated warning
        browser: ["SmartQ", "Chrome", "1.0.0"],
      });

      this.socket.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log("QR Code generated for WhatsApp connection");
          this.currentQR = qr;
          if (this.io) {
            this.io.emit('qr', qr);
          }
        }
        
        if (connection === "close") {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log("Connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);
          this.isConnected = false;
          this.currentQR = null;
          
          if (this.io) {
            this.io.emit('disconnected');
          }
          
          // If logged out, clear session
          if ((lastDisconnect?.error as Boom)?.output?.statusCode === DisconnectReason.loggedOut) {
            this.clearSession();
            this.sessionExists = false;
          }
          
          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 3000); // Add delay for reconnection
          }
        } else if (connection === "open") {
          console.log("WhatsApp connection opened successfully");
          this.isConnected = true;
          this.currentQR = null;
          this.sessionExists = true;
          
          if (this.io) {
            this.io.emit('connected');
          }
        }
      });

      this.socket.ev.on("creds.update", saveCreds);
      
      return true;
    } catch (error) {
      console.error("WhatsApp initialization failed:", error);
      return false;
    }
  }

  private checkSessionExists(): boolean {
    try {
      const credsPath = path.join(this.authDir, "creds.json");
      return fs.existsSync(credsPath);
    } catch (error) {
      return false;
    }
  }

  private clearSession(): void {
    try {
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.socket || !this.isConnected) {
      throw new Error("WhatsApp not connected");
    }

    try {
      // Format phone number for WhatsApp (add country code if needed)
      const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
      const jid = `${formattedPhone}@s.whatsapp.net`;
      
      await this.socket.sendMessage(jid, { text: message });
      return true;
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw new Error("Failed to send message");
    }
  }

  isSessionActive(): boolean {
    return this.isConnected;
  }

  hasValidSession(): boolean {
    return this.sessionExists;
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
      this.isConnected = false;
    }
  }

  async clearSessionAndReconnect(): Promise<boolean> {
    try {
      // Disconnect current session
      await this.disconnect();
      
      // Clear session files
      this.clearSession();
      this.sessionExists = false;
      this.currentQR = null;
      
      // Reinitialize (this will generate new QR)
      return await this.initialize();
    } catch (error) {
      console.error("Failed to clear session and reconnect:", error);
      return false;
    }
  }

  getQRCode(): string | null {
    return this.currentQR;
  }

  getConnectionStatus(): {
    connected: boolean;
    sessionExists: boolean;
    qrCode: string | null;
  } {
    return {
      connected: this.isConnected,
      sessionExists: this.sessionExists,
      qrCode: this.currentQR,
    };
  }
}

export const whatsappService = new WhatsAppService();