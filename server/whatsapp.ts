import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";

export class WhatsAppService {
  private socket: WASocket | null = null;
  private isConnected = false;
  private authDir = path.join(process.cwd(), "auth_info");

  async initialize(): Promise<boolean> {
    try {
      // Ensure auth directory exists
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["SmartQ", "Chrome", "1.0.0"],
      });

      this.socket.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log("QR Code generated. Scan it with your WhatsApp app.");
        }
        
        if (connection === "close") {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log("Connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);
          
          if (shouldReconnect) {
            this.initialize();
          } else {
            this.isConnected = false;
          }
        } else if (connection === "open") {
          console.log("WhatsApp connection opened");
          this.isConnected = true;
        }
      });

      this.socket.ev.on("creds.update", saveCreds);
      
      return true;
    } catch (error) {
      console.error("WhatsApp initialization failed:", error);
      return false;
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

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getQRCode(): string | null {
    // In a real implementation, you might want to store the QR code
    // For now, we'll rely on the console output
    return null;
  }
}

export const whatsappService = new WhatsAppService();