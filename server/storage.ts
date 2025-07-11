import { queueEntries, type QueueEntry, type InsertQueueEntry, type Admin, type InsertAdmin } from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User methods (legacy)
  getUser(id: number): Promise<QueueEntry | undefined>;
  getUserByUsername(username: string): Promise<QueueEntry | undefined>;
  createUser(user: any): Promise<QueueEntry>;
  
  // Queue management methods
  addToQueue(entry: InsertQueueEntry): Promise<QueueEntry>;
  getQueue(): Promise<QueueEntry[]>;
  removeFromQueue(id: number): Promise<boolean>;
  getQueuePosition(phone: string): Promise<number | null>;
  getQueueEntryByPhone(phone: string): Promise<QueueEntry | undefined>;
  updateQueueEntryStatus(id: number, status: string): Promise<boolean>;
  isPhoneInQueue(phone: string): Promise<boolean>;
  
  // Admin methods
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  validateAdmin(username: string, password: string): Promise<Admin | null>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private queue: Map<number, QueueEntry>;
  private admins: Map<number, Admin>;
  private currentUserId: number;
  private currentQueueId: number;
  private currentAdminId: number;

  constructor() {
    this.users = new Map();
    this.queue = new Map();
    this.admins = new Map();
    this.currentUserId = 1;
    this.currentQueueId = 1;
    this.currentAdminId = 1;
    
    // Create default admin synchronously
    this.createDefaultAdmin();
  }

  private createDefaultAdmin() {
    // Create admin with a simple hash for development
    const admin: Admin = {
      id: this.currentAdminId++,
      username: "admin",
      password: "$2b$10$sampleHashForDevelopment.smartq123", // This will be replaced by proper hash
      created_at: new Date(),
    };
    this.admins.set(admin.id, admin);
    
    // Properly hash the password asynchronously
    bcrypt.hash("smartq123", 10).then(hashedPassword => {
      admin.password = hashedPassword;
      this.admins.set(admin.id, admin);
    });
  }

  async getUser(id: number): Promise<QueueEntry | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<QueueEntry | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<QueueEntry> {
    const id = this.currentUserId++;
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async addToQueue(entry: InsertQueueEntry): Promise<QueueEntry> {
    const id = this.currentQueueId++;
    const queueEntry: QueueEntry = {
      id,
      name: entry.name,
      phone: entry.phone,
      timestamp: new Date(),
      status: "waiting",
      called_at: null,
    };
    this.queue.set(id, queueEntry);
    return queueEntry;
  }

  async getQueue(): Promise<QueueEntry[]> {
    return Array.from(this.queue.values())
      .filter(entry => entry.status !== "removed")
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async removeFromQueue(id: number): Promise<boolean> {
    return this.queue.delete(id);
  }

  async getQueuePosition(phone: string): Promise<number | null> {
    const queue = await this.getQueue();
    const waitingQueue = queue.filter(entry => entry.status === "waiting");
    const position = waitingQueue.findIndex(entry => entry.phone === phone);
    return position >= 0 ? position + 1 : null;
  }

  async getQueueEntryByPhone(phone: string): Promise<QueueEntry | undefined> {
    return Array.from(this.queue.values()).find(entry => entry.phone === phone && entry.status !== "removed");
  }

  async updateQueueEntryStatus(id: number, status: string): Promise<boolean> {
    const entry = this.queue.get(id);
    if (entry) {
      entry.status = status;
      if (status === "called") {
        entry.called_at = new Date();
      }
      this.queue.set(id, entry);
      return true;
    }
    return false;
  }

  async isPhoneInQueue(phone: string): Promise<boolean> {
    const entry = await this.getQueueEntryByPhone(phone);
    return entry !== undefined && entry.status === "waiting";
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return Array.from(this.admins.values()).find(admin => admin.username === username);
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const id = this.currentAdminId++;
    const hashedPassword = await bcrypt.hash(insertAdmin.password, 10);
    const admin: Admin = {
      id,
      username: insertAdmin.username,
      password: hashedPassword,
      created_at: new Date(),
    };
    this.admins.set(id, admin);
    return admin;
  }

  async validateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = await this.getAdminByUsername(username);
    if (admin && await bcrypt.compare(password, admin.password)) {
      return admin;
    }
    return null;
  }
}

export const storage = new MemStorage();
