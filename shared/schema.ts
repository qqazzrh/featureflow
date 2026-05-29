import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Raw inbound WhatsApp messages
export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  from: text("from").notNull(),           // phone number / contact name
  body: text("body").notNull(),           // raw message text
  timestamp: text("timestamp").notNull(), // ISO string
  processed: integer("processed", { mode: "boolean" }).notNull().default(false),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, processed: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// Parsed and PM-reviewed feature requests
export const featureRequests = sqliteTable("feature_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id"),        // FK → whatsappMessages.id (nullable for manual)
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // high | medium | low
  category: text("category").notNull().default("general"), // billing | ux | api | notifications | performance | general
  sentiment: text("sentiment").notNull().default("neutral"), // positive | neutral | frustrated
  status: text("status").notNull().default("pending"), // pending | approved | rejected | building | done
  pmNotes: text("pm_notes").default(""),
  customerName: text("customer_name").default("Unknown"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertFeatureRequestSchema = createInsertSchema(featureRequests).omit({ id: true });
export type InsertFeatureRequest = z.infer<typeof insertFeatureRequestSchema>;
export type FeatureRequest = typeof featureRequests.$inferSelect;

// Agent task log — one per approved feature request
export const agentTasks = sqliteTable("agent_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureRequestId: integer("feature_request_id").notNull(),
  status: text("status").notNull().default("queued"),  // queued | running | completed | failed
  plan: text("plan").default(""),          // AI-generated implementation plan (JSON text)
  log: text("log").default(""),           // running log of agent actions (newline-separated)
  result: text("result").default(""),     // final output / artifact summary
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({ id: true });
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;
export type AgentTask = typeof agentTasks.$inferSelect;
