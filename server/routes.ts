import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQueueEntrySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add customer to queue
  app.post("/api/queue", async (req, res) => {
    try {
      const validatedData = insertQueueEntrySchema.parse(req.body);
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

  const httpServer = createServer(app);
  return httpServer;
}
