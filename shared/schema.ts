import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").default("waiting").notNull(), // "waiting", "called", "reached"
  called_at: timestamp("called_at"),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertQueueEntrySchema = createInsertSchema(queueEntries).omit({
  id: true,
  timestamp: true,
  status: true,
  called_at: true,
}).extend({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  phone: z.string().regex(/^[6-9][0-9]{9}$/, "Please enter a valid Indian phone number"),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  created_at: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;
export type QueueEntry = typeof queueEntries.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
