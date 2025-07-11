import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: text("status").default("waiting").notNull(),
});

export const insertQueueEntrySchema = createInsertSchema(queueEntries).omit({
  id: true,
  timestamp: true,
  status: true,
}).extend({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number is too long"),
});

export type InsertQueueEntry = z.infer<typeof insertQueueEntrySchema>;
export type QueueEntry = typeof queueEntries.$inferSelect;
