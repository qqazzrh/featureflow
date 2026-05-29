// Self-contained CommonJS handler for Vercel serverless
// api/package.json sets "type":"commonjs" so module.exports works correctly
// All routes inlined — no @shared alias, no TS compilation needed

const express = require("express");
const fs = require("fs");
const path = require("path");

// ── In-memory + /tmp persistence ────────────────────────────────────────────

const DB_PATH = path.join("/tmp", "featureflow.json");

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch { /* corrupt — start fresh */ }
  return {
    messages: [],
    featureRequests: [],
    agentTasks: [],
    counters: { messages: 0, featureRequests: 0, agentTasks: 0 },
  };
}

function saveDb(db) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db), "utf8"); } catch { /* /tmp may not always be writable */ }
}

let _db = null;
function getDb() {
  if (!_db) _db = loadDb();
  return _db;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

const storage = {
  createMessage({ from, body, timestamp }) {
    const db = getDb();
    const id = ++db.counters.messages;
    const msg = { id, from, body, timestamp, processed: false };
    db.messages.push(msg);
    saveDb(db);
    return msg;
  },
  getMessages() { return getDb().messages; },
  markMessageProcessed(id) {
    const db = getDb();
    const msg = db.messages.find(m => m.id === id);
    if (msg) { msg.processed = true; saveDb(db); }
  },
  createFeatureRequest(data) {
    const db = getDb();
    const id = ++db.counters.featureRequests;
    const fr = { id, ...data };
    db.featureRequests.push(fr);
    saveDb(db);
    return fr;
  },
  getFeatureRequests() { return getDb().featureRequests; },
  getFeatureRequestById(id) { return getDb().featureRequests.find(r => r.id === id); },
  updateFeatureRequest(id, updates) {
    const db = getDb();
    const idx = db.featureRequests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    db.featureRequests[idx] = { ...db.featureRequests[idx], ...updates };
    saveDb(db);
    return db.featureRequests[idx];
  },
  createAgentTask(data) {
    const db = getDb();
    const id = ++db.counters.agentTasks;
    const task = { id, ...data };
    db.agentTasks.push(task);
    saveDb(db);
    return task;
  },
  getAgentTasks() { return getDb().agentTasks; },
  getAgentTaskByRequestId(featureRequestId) {
    return getDb().agentTasks.find(t => t.featureRequestId === featureRequestId);
  },
  updateAgentTask(id, updates) {
    const db = getDb();
    const idx = db.agentTasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    db.agentTasks[idx] = { ...db.agentTasks[idx], ...updates };
    saveDb(db);
    return db.agentTasks[idx];
  },
};

// ── AI helpers ───────────────────────────────────────────────────────────────

let _openai = null;
function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = require("openai");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

async function parseWhatsAppMessage(body, from) {
  if (!process.env.OPENAI_API_KEY) {
    const priorities = ["high", "medium", "low"];
    const categories = ["billing", "ux", "api", "notifications", "performance", "general"];
    const sentiments = ["positive", "neutral", "frustrated"];
    return {
      title: `Feature: ${body.slice(0, 50)}${body.length > 50 ? "..." : ""}`,
      description: body,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    };
  }
  const openai = getOpenAI();
  const prompt = `You are a product manager assistant. Parse the following WhatsApp message from a customer and extract a structured feature request.\n\nCustomer message: "${body}"\nCustomer identifier: ${from}\n\nReturn ONLY a valid JSON object with these exact fields:\n{\n  "title": "short feature request title (max 80 chars)",\n  "description": "detailed description of what the customer wants, expanded from their message",\n  "priority": "high | medium | low (infer from urgency/frustration/business impact)",\n  "category": "one of: billing | ux | api | notifications | performance | general",\n  "sentiment": "positive | neutral | frustrated (based on tone)"\n}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return JSON.parse(response.choices[0].message.content || "{}");
}

async function runFeatureAgent(featureRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      plan: JSON.stringify([
        { step: 1, action: "Analyze requirements", detail: featureRequest.description },
        { step: 2, action: "Design data schema", detail: "Define new tables/fields needed" },
        { step: 3, action: "Implement backend API", detail: "Add routes and storage methods" },
        { step: 4, action: "Build frontend component", detail: "Create React component with proper UX" },
        { step: 5, action: "Write tests", detail: "Unit and integration tests" },
        { step: 6, action: "Deploy and verify", detail: "Deploy to staging, verify end-to-end" },
      ]),
      log: [
        `[Agent] Received feature request: "${featureRequest.title}"`,
        `[Agent] Category: ${featureRequest.category} | Priority: ${featureRequest.priority}`,
        `[Agent] Analyzing requirements...`,
        `[Agent] Decomposing into implementation tasks...`,
        `[Agent] Generated 6-step implementation plan`,
        `[Agent] Estimating effort: ~3-5 engineering hours`,
        `[Agent] Identified dependencies: none`,
        `[Agent] Ready for engineering handoff`,
      ].join("\n"),
      result: `Implementation plan generated for "${featureRequest.title}". Feature is ready for sprint planning. Estimated effort: 3-5 hours. No blocking dependencies identified.`,
    };
  }
  const openai = getOpenAI();
  const planPrompt = `You are an AI software engineering agent. A product manager has approved the following feature request. Generate a detailed, step-by-step implementation plan.\n\nFeature: "${featureRequest.title}"\nDescription: ${featureRequest.description}\nCategory: ${featureRequest.category}\nPriority: ${featureRequest.priority}\n\nReturn a JSON object:\n{\n  "steps": [\n    { "step": 1, "action": "action name", "detail": "specific details" },\n    ...\n  ],\n  "estimated_hours": number,\n  "dependencies": ["list of dependencies"],\n  "risks": ["potential risks"],\n  "summary": "one-paragraph executive summary"\n}`;
  const planResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: planPrompt }],
    response_format: { type: "json_object" },
  });
  const planData = JSON.parse(planResponse.choices[0].message.content || "{}");
  const logLines = [
    `[Agent] Received approved feature request: "${featureRequest.title}"`,
    `[Agent] Category: ${featureRequest.category} | Priority: ${featureRequest.priority}`,
    `[Agent] Analyzing requirements...`,
    `[Agent] Decomposed into ${planData.steps?.length || 0} implementation steps`,
    `[Agent] Estimated effort: ${planData.estimated_hours || "?"}h`,
    ...(planData.dependencies?.length > 0 ? [`[Agent] Dependencies: ${planData.dependencies.join(", ")}`] : [`[Agent] No external dependencies`]),
    ...(planData.risks?.length > 0 ? planData.risks.map(r => `[Agent] Risk: ${r}`) : []),
    `[Agent] Implementation plan finalized`,
    `[Agent] Ready for engineering team handoff`,
  ];
  return {
    plan: JSON.stringify(planData.steps || []),
    log: logLines.join("\n"),
    result: planData.summary || `Implementation plan generated for "${featureRequest.title}".`,
  };
}

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// WhatsApp webhook verification
app.get("/api/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "featureflow_verify_2024";
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp inbound webhook
app.post("/api/webhook/whatsapp", async (req, res) => {
  try {
    let from = "", body = "";
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const contact = change?.value?.contacts?.[0];
    if (message) {
      from = contact?.profile?.name || message.from || "Unknown";
      body = message.text?.body || message.body || "";
    } else if (req.body?.Body) {
      from = req.body.ProfileName || req.body.From || "Unknown";
      body = req.body.Body;
    }
    if (!body) return res.sendStatus(200);
    const now = new Date().toISOString();
    const saved = storage.createMessage({ from, body, timestamp: now });
    const parsed = await parseWhatsAppMessage(body, from);
    storage.createFeatureRequest({
      messageId: saved.id,
      title: parsed.title || "Untitled request",
      description: parsed.description || body,
      priority: parsed.priority || "medium",
      category: parsed.category || "general",
      sentiment: parsed.sentiment || "neutral",
      status: "pending",
      pmNotes: "",
      customerName: from,
      createdAt: now,
      updatedAt: now,
    });
    storage.markMessageProcessed(saved.id);
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Manual message injection
app.post("/api/messages/manual", async (req, res) => {
  try {
    const { from, body } = req.body;
    if (!from || !body) return res.status(400).json({ error: "from and body required" });
    const now = new Date().toISOString();
    const saved = storage.createMessage({ from, body, timestamp: now });
    const parsed = await parseWhatsAppMessage(body, from);
    const fr = storage.createFeatureRequest({
      messageId: saved.id,
      title: parsed.title || "Untitled request",
      description: parsed.description || body,
      priority: parsed.priority || "medium",
      category: parsed.category || "general",
      sentiment: parsed.sentiment || "neutral",
      status: "pending",
      pmNotes: "",
      customerName: from,
      createdAt: now,
      updatedAt: now,
    });
    storage.markMessageProcessed(saved.id);
    res.json({ message: saved, featureRequest: fr });
  } catch (err) {
    console.error("Manual message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Feature requests CRUD
app.get("/api/feature-requests", (_req, res) => res.json(storage.getFeatureRequests()));

app.get("/api/feature-requests/:id", (req, res) => {
  const fr = storage.getFeatureRequestById(Number(req.params.id));
  if (!fr) return res.status(404).json({ error: "Not found" });
  res.json(fr);
});

app.patch("/api/feature-requests/:id", (req, res) => {
  const id = Number(req.params.id);
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  const updated = storage.updateFeatureRequest(id, updates);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

app.post("/api/feature-requests/:id/approve", async (req, res) => {
  const id = Number(req.params.id);
  const now = new Date().toISOString();
  const fr = storage.updateFeatureRequest(id, { status: "building", updatedAt: now });
  if (!fr) return res.status(404).json({ error: "Not found" });
  const task = storage.createAgentTask({
    featureRequestId: id,
    status: "running",
    plan: "",
    log: "",
    result: "",
    startedAt: now,
    completedAt: null,
    createdAt: now,
  });
  res.json({ featureRequest: fr, agentTask: task });
  (async () => {
    try {
      const agentOutput = await runFeatureAgent({ title: fr.title, description: fr.description, category: fr.category, priority: fr.priority });
      const completedAt = new Date().toISOString();
      storage.updateAgentTask(task.id, { status: "completed", plan: agentOutput.plan, log: agentOutput.log, result: agentOutput.result, completedAt });
      storage.updateFeatureRequest(id, { status: "done", updatedAt: completedAt });
    } catch (err) {
      console.error("Agent error:", err);
      storage.updateAgentTask(task.id, { status: "failed", log: `[Agent] Fatal error: ${err instanceof Error ? err.message : "Unknown error"}`, completedAt: new Date().toISOString() });
      storage.updateFeatureRequest(id, { status: "approved", updatedAt: new Date().toISOString() });
    }
  })();
});

app.post("/api/feature-requests/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const { pmNotes } = req.body;
  const updated = storage.updateFeatureRequest(id, { status: "rejected", pmNotes: pmNotes || "", updatedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

// Agent tasks
app.get("/api/agent-tasks", (_req, res) => res.json(storage.getAgentTasks()));

app.get("/api/agent-tasks/by-request/:featureRequestId", (req, res) => {
  const task = storage.getAgentTaskByRequestId(Number(req.params.featureRequestId));
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

// Messages
app.get("/api/messages", (_req, res) => res.json(storage.getMessages()));

// Stats
app.get("/api/stats", (_req, res) => {
  const all = storage.getFeatureRequests();
  const stats = {
    total: all.length,
    pending: all.filter(r => r.status === "pending").length,
    approved: all.filter(r => r.status === "approved").length,
    building: all.filter(r => r.status === "building").length,
    done: all.filter(r => r.status === "done").length,
    rejected: all.filter(r => r.status === "rejected").length,
    byCategory: {},
    byPriority: { high: 0, medium: 0, low: 0 },
  };
  all.forEach(r => {
    stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
    stats.byPriority[r.priority] = (stats.byPriority[r.priority] || 0) + 1;
  });
  res.json(stats);
});

// Seed demo data
app.post("/api/seed", async (_req, res) => {
  const demoMessages = [
    { from: "Sarah Chen", body: "Hey, I really wish the mobile app had dark mode. It's really hard on my eyes at night and I use it every evening to review my team's progress." },
    { from: "Marcus Johnson", body: "Your API rate limits are killing us. We're building an integration and hitting the 100 req/min cap constantly. We need at least 1000 req/min for enterprise tier." },
    { from: "Priya Patel", body: "PLEASE add bulk export to CSV. I have to export reports one by one and it takes forever. This is critical for our monthly board reports." },
    { from: "Tom Rodriguez", body: "Would love Slack integration so feature requests could be posted automatically to our #product channel when they come in." },
    { from: "Aisha Williams", body: "The notification emails are too frequent and not customizable. Can we get a digest option instead of getting pinged every single time?" },
    { from: "David Kim", body: "Two-factor authentication would make our security team much happier. Right now they won't let us use the enterprise plan without it." },
  ];
  try {
    const results = [];
    for (const msg of demoMessages) {
      const now = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      const saved = storage.createMessage({ from: msg.from, body: msg.body, timestamp: now });
      const parsed = await parseWhatsAppMessage(msg.body, msg.from);
      const fr = storage.createFeatureRequest({
        messageId: saved.id,
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        category: parsed.category,
        sentiment: parsed.sentiment,
        status: "pending",
        pmNotes: "",
        customerName: msg.from,
        createdAt: now,
        updatedAt: now,
      });
      storage.markMessageProcessed(saved.id);
      results.push(fr);
    }
    res.json({ seeded: results.length });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

module.exports = app;
module.exports.app = app;
