import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  whatsappMessages, featureRequests, agentTasks,
  type WhatsappMessage, type InsertWhatsappMessage,
  type FeatureRequest, type InsertFeatureRequest,
  type AgentTask, type InsertAgentTask,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Auto-migrate
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    "from" TEXT NOT NULL,
    body TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS feature_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT NOT NULL DEFAULT 'general',
    sentiment TEXT NOT NULL DEFAULT 'neutral',
    status TEXT NOT NULL DEFAULT 'pending',
    pm_notes TEXT DEFAULT '',
    customer_name TEXT DEFAULT 'Unknown',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS agent_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_request_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    plan TEXT DEFAULT '',
    log TEXT DEFAULT '',
    result TEXT DEFAULT '',
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // WhatsApp messages
  createMessage(data: InsertWhatsappMessage): WhatsappMessage;
  getMessages(): WhatsappMessage[];
  getUnprocessedMessages(): WhatsappMessage[];
  markMessageProcessed(id: number): void;

  // Feature requests
  createFeatureRequest(data: InsertFeatureRequest): FeatureRequest;
  getFeatureRequests(): FeatureRequest[];
  getFeatureRequestById(id: number): FeatureRequest | undefined;
  updateFeatureRequest(id: number, updates: Partial<FeatureRequest>): FeatureRequest | undefined;

  // Agent tasks
  createAgentTask(data: InsertAgentTask): AgentTask;
  getAgentTasks(): AgentTask[];
  getAgentTaskByRequestId(featureRequestId: number): AgentTask | undefined;
  updateAgentTask(id: number, updates: Partial<AgentTask>): AgentTask | undefined;
}

export class SqliteStorage implements IStorage {
  createMessage(data: InsertWhatsappMessage): WhatsappMessage {
    return db.insert(whatsappMessages).values(data).returning().get() as WhatsappMessage;
  }

  getMessages(): WhatsappMessage[] {
    return db.select().from(whatsappMessages).orderBy(desc(whatsappMessages.id)).all();
  }

  getUnprocessedMessages(): WhatsappMessage[] {
    return db.select().from(whatsappMessages).where(eq(whatsappMessages.processed, false)).all();
  }

  markMessageProcessed(id: number): void {
    db.update(whatsappMessages).set({ processed: true }).where(eq(whatsappMessages.id, id)).run();
  }

  createFeatureRequest(data: InsertFeatureRequest): FeatureRequest {
    return db.insert(featureRequests).values(data).returning().get() as FeatureRequest;
  }

  getFeatureRequests(): FeatureRequest[] {
    return db.select().from(featureRequests).orderBy(desc(featureRequests.id)).all();
  }

  getFeatureRequestById(id: number): FeatureRequest | undefined {
    return db.select().from(featureRequests).where(eq(featureRequests.id, id)).get() as FeatureRequest | undefined;
  }

  updateFeatureRequest(id: number, updates: Partial<FeatureRequest>): FeatureRequest | undefined {
    const result = db.update(featureRequests).set(updates).where(eq(featureRequests.id, id)).returning().get();
    return result as FeatureRequest | undefined;
  }

  createAgentTask(data: InsertAgentTask): AgentTask {
    return db.insert(agentTasks).values(data).returning().get() as AgentTask;
  }

  getAgentTasks(): AgentTask[] {
    return db.select().from(agentTasks).orderBy(desc(agentTasks.id)).all();
  }

  getAgentTaskByRequestId(featureRequestId: number): AgentTask | undefined {
    return db.select().from(agentTasks).where(eq(agentTasks.featureRequestId, featureRequestId)).get() as AgentTask | undefined;
  }

  updateAgentTask(id: number, updates: Partial<AgentTask>): AgentTask | undefined {
    const result = db.update(agentTasks).set(updates).where(eq(agentTasks.id, id)).returning().get();
    return result as AgentTask | undefined;
  }
}

export const storage = new SqliteStorage();
