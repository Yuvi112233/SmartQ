import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQueueEntrySchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { whatsappService } from "./whatsapp";

const JWT_SECRET = process.env.JWT_SECRET || "smartq-secret-key";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize WhatsApp service
  whatsappService.initialize();

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const admin = await storage.validateAdmin(validatedData.username, validatedData.password);
      
      if (admin) {
        const token = jwt.sign(
          { id: admin.id, username: admin.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.json({ token, admin: { id: admin.id, username: admin.username } });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Login failed" });
      }
    }
  });

  // Barber login (same as admin for now)
  app.post("/api/barber/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const admin = await storage.validateAdmin(validatedData.username, validatedData.password);
      
      if (admin) {
        const token = jwt.sign(
          { id: admin.id, username: admin.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.json({ token, admin: { id: admin.id, username: admin.username } });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Login failed" });
      }
    }
  });

  // Check WhatsApp session status
  app.get("/api/whatsapp/status", authenticateToken, async (req, res) => {
    try {
      const isActive = whatsappService.isSessionActive();
      res.json({ connected: isActive });
    } catch (error) {
      res.status(500).json({ message: "Failed to check WhatsApp status" });
    }
  });

  // Send WhatsApp message
  app.post("/api/whatsapp/send/:phone", authenticateToken, async (req, res) => {
    try {
      const phone = req.params.phone;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const success = await whatsappService.sendMessage(phone, message);
      if (success) {
        res.json({ message: "Message sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // Call next customer (admin/barber only)
  app.post("/api/queue/call-next", authenticateToken, async (req, res) => {
    try {
      const queue = await storage.getQueue();
      if (queue.length === 0) {
        return res.status(400).json({ message: "No customers in queue" });
      }

      const nextCustomer = queue[0];
      
      // Update customer status to "called"
      await storage.updateQueueEntryStatus(nextCustomer.id, "called");
      
      // Send WhatsApp message if connected
      try {
        const message = `Hi ${nextCustomer.name}! It's your turn. Please proceed to the service area. Thank you for waiting! - SmartQ`;
        await whatsappService.sendMessage(nextCustomer.phone, message);
      } catch (error) {
        console.log("WhatsApp message failed:", error);
      }
      
      res.json({ 
        message: "Next customer called successfully", 
        customer: nextCustomer 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to call next customer" });
    }
  });

  // Add customer to queue
  app.post("/api/queue", async (req, res) => {
    try {
      const validatedData = insertQueueEntrySchema.parse(req.body);
      
      // Check if phone number is already in queue
      const isInQueue = await storage.isPhoneInQueue(validatedData.phone);
      if (isInQueue) {
        return res.status(400).json({ message: "Phone number already in queue" });
      }
      
      const queueEntry = await storage.addToQueue(validatedData);
      res.json(queueEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add to queue" });
      }
    }
  });

  // Get current queue
  app.get("/api/queue", async (req, res) => {
    try {
      const queue = await storage.getQueue();
      res.json(queue);
    } catch (error) {
      res.status(500).json({ message: "Failed to get queue" });
    }
  });

  // Remove customer from queue
  app.delete("/api/queue/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const success = await storage.removeFromQueue(id);
      if (success) {
        res.json({ message: "Customer removed from queue" });
      } else {
        res.status(404).json({ message: "Customer not found in queue" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from queue" });
    }
  });

  // Get queue position for a phone number
  app.get("/api/queue/position/:phone", async (req, res) => {
    try {
      const phone = req.params.phone;
      const position = await storage.getQueuePosition(phone);
      if (position !== null) {
        res.json({ position });
      } else {
        res.status(404).json({ message: "Phone number not found in queue" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get queue position" });
    }
  });

  // Get customer queue info by phone
  app.get("/api/queue/customer/:phone", async (req, res) => {
    try {
      const phone = req.params.phone;
      const entry = await storage.getQueueEntryByPhone(phone);
      if (entry) {
        const position = await storage.getQueuePosition(phone);
        res.json({ ...entry, position });
      } else {
        res.status(404).json({ message: "Phone number not found in queue" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get customer info" });
    }
  });

  // Customer reached confirmation
  app.post("/api/customer/reached/:phone", async (req, res) => {
    try {
      const phone = req.params.phone;
      const entry = await storage.getQueueEntryByPhone(phone);
      
      if (!entry) {
        return res.status(404).json({ message: "Phone number not found in queue" });
      }
      
      // Check if customer is first in queue
      const queue = await storage.getQueue();
      const waitingQueue = queue.filter(e => e.status === "waiting");
      
      if (waitingQueue.length === 0 || waitingQueue[0].phone !== phone) {
        return res.status(400).json({ message: "Not your turn yet" });
      }
      
      const success = await storage.updateQueueEntryStatus(entry.id, "reached");
      if (success) {
        res.json({ message: "Status updated successfully" });
      } else {
        res.status(500).json({ message: "Failed to update status" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Call next customer (admin only)
  app.post("/api/queue/call-next", authenticateToken, async (req, res) => {
    try {
      const queue = await storage.getQueue();
      const waitingQueue = queue.filter(entry => entry.status === "waiting");
      
      if (waitingQueue.length === 0) {
        return res.status(400).json({ message: "No customers in queue" });
      }
      
      const nextCustomer = waitingQueue[0];
      const success = await storage.updateQueueEntryStatus(nextCustomer.id, "called");
      
      if (success) {
        // Send WhatsApp message if service is connected
        if (whatsappService.isSessionActive()) {
          const message = `Hi ${nextCustomer.name}, it's your turn now. Please head to the shop.`;
          try {
            await whatsappService.sendMessage(nextCustomer.phone, message);
          } catch (error) {
            console.error("Failed to send WhatsApp message:", error);
          }
        }
        
        res.json({ message: "Customer called successfully", customer: nextCustomer });
      } else {
        res.status(500).json({ message: "Failed to call customer" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to call next customer" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
