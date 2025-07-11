import { queueEntries, type QueueEntry, type InsertQueueEntry } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<QueueEntry | undefined>;
  getUserByUsername(username: string): Promise<QueueEntry | undefined>;
  createUser(user: any): Promise<QueueEntry>;
  
  // Queue management methods
  addToQueue(entry: InsertQueueEntry): Promise<QueueEntry>;
  getQueue(): Promise<QueueEntry[]>;
  removeFromQueue(id: number): Promise<boolean>;
  getQueuePosition(phone: string): Promise<number | null>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private queue: Map<number, QueueEntry>;
  private currentUserId: number;
  private currentQueueId: number;

  constructor() {
    this.users = new Map();
    this.queue = new Map();
    this.currentUserId = 1;
    this.currentQueueId = 1;
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
    };
    this.queue.set(id, queueEntry);
    return queueEntry;
  }

  async getQueue(): Promise<QueueEntry[]> {
    return Array.from(this.queue.values())
      .filter(entry => entry.status === "waiting")
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async removeFromQueue(id: number): Promise<boolean> {
    return this.queue.delete(id);
  }

  async getQueuePosition(phone: string): Promise<number | null> {
    const queue = await this.getQueue();
    const position = queue.findIndex(entry => entry.phone === phone);
    return position >= 0 ? position + 1 : null;
  }
}

export const storage = new MemStorage();
