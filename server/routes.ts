import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── AI Helpers ─────────────────────────────────────────────────────────────

async function parseWhatsAppMessage(body: string, from: string) {
  if (!process.env.OPENAI_API_KEY) {
    // Demo mode: return plausible mock data
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

  const openai = getOpenAI()!;

  const prompt = `You are a product manager assistant. Parse the following WhatsApp message from a customer and extract a structured feature request.

Customer message: "${body}"
Customer identifier: ${from}

Return ONLY a valid JSON object with these exact fields:
{
  "title": "short feature request title (max 80 chars)",
  "description": "detailed description of what the customer wants, expanded from their message",
  "priority": "high | medium | low (infer from urgency/frustration/business impact)",
  "category": "one of: billing | ux | api | notifications | performance | general",
  "sentiment": "positive | neutral | frustrated (based on tone)"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

async function runFeatureAgent(featureRequest: { title: string; description: string; category: string; priority: string }) {
  if (!process.env.OPENAI_API_KEY) {
    // Demo mode
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

  const openai = getOpenAI()!;

  const planPrompt = `You are an AI software engineering agent. A product manager has approved the following feature request. Generate a detailed, step-by-step implementation plan.

Feature: "${featureRequest.title}"
Description: ${featureRequest.description}
Category: ${featureRequest.category}
Priority: ${featureRequest.priority}

Return a JSON object:
{
  "steps": [
    { "step": 1, "action": "action name", "detail": "specific details" },
    ...
  ],
  "estimated_hours": number,
  "dependencies": ["list of dependencies"],
  "risks": ["potential risks"],
  "summary": "one-paragraph executive summary"
}`;

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
    ...(planData.risks?.length > 0 ? planData.risks.map((r: string) => `[Agent] Risk: ${r}`) : []),
    `[Agent] Implementation plan finalized`,
    `[Agent] Ready for engineering team handoff`,
  ];

  return {
    plan: JSON.stringify(planData.steps || []),
    log: logLines.join("\n"),
    result: planData.summary || `Implementation plan generated for "${featureRequest.title}".`,
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express) {
  // ── WhatsApp Webhook ────────────────────────────────────────────────────

  // Twilio/Meta verification challenge
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

  // Inbound message (Meta WhatsApp Business API format)
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      // Support both Twilio and Meta formats
      let from = "";
      let body = "";

      // Meta format
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      const contact = change?.value?.contacts?.[0];

      if (message) {
        from = contact?.profile?.name || message.from || "Unknown";
        body = message.text?.body || message.body || "";
      }
      // Twilio format
      else if (req.body?.Body) {
        from = req.body.ProfileName || req.body.From || "Unknown";
        body = req.body.Body;
      }

      if (!body) return res.sendStatus(200);

      const now = new Date().toISOString();
      const saved = storage.createMessage({ from, body, timestamp: now });

      // Immediately parse with AI and create a feature request
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

  // ── Manual message injection (for demo/testing) ─────────────────────────
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

  // ── Feature Requests ────────────────────────────────────────────────────

  app.get("/api/feature-requests", (_req, res) => {
    res.json(storage.getFeatureRequests());
  });

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

  // Approve a feature request and kick off agent
  app.post("/api/feature-requests/:id/approve", async (req, res) => {
    const id = Number(req.params.id);
    const now = new Date().toISOString();

    const fr = storage.updateFeatureRequest(id, { status: "building", updatedAt: now });
    if (!fr) return res.status(404).json({ error: "Not found" });

    // Create agent task
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

    // Run agent asynchronously
    (async () => {
      try {
        const agentOutput = await runFeatureAgent({
          title: fr.title,
          description: fr.description,
          category: fr.category,
          priority: fr.priority,
        });

        const completedAt = new Date().toISOString();
        storage.updateAgentTask(task.id, {
          status: "completed",
          plan: agentOutput.plan,
          log: agentOutput.log,
          result: agentOutput.result,
          completedAt,
        });
        storage.updateFeatureRequest(id, { status: "done", updatedAt: completedAt });
      } catch (err) {
        console.error("Agent error:", err);
        storage.updateAgentTask(task.id, {
          status: "failed",
          log: `[Agent] Fatal error: ${err instanceof Error ? err.message : "Unknown error"}`,
          completedAt: new Date().toISOString(),
        });
        storage.updateFeatureRequest(id, { status: "approved", updatedAt: new Date().toISOString() });
      }
    })();
  });

  // Reject a feature request
  app.post("/api/feature-requests/:id/reject", (req, res) => {
    const id = Number(req.params.id);
    const { pmNotes } = req.body;
    const updated = storage.updateFeatureRequest(id, {
      status: "rejected",
      pmNotes: pmNotes || "",
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ── Agent Tasks ─────────────────────────────────────────────────────────

  app.get("/api/agent-tasks", (_req, res) => {
    res.json(storage.getAgentTasks());
  });

  app.get("/api/agent-tasks/by-request/:featureRequestId", (req, res) => {
    const task = storage.getAgentTaskByRequestId(Number(req.params.featureRequestId));
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  });

  // ── WhatsApp messages ───────────────────────────────────────────────────
  app.get("/api/messages", (_req, res) => {
    res.json(storage.getMessages());
  });

  // ── Stats ───────────────────────────────────────────────────────────────
  app.get("/api/stats", (_req, res) => {
    const all = storage.getFeatureRequests();
    const stats = {
      total: all.length,
      pending: all.filter(r => r.status === "pending").length,
      approved: all.filter(r => r.status === "approved").length,
      building: all.filter(r => r.status === "building").length,
      done: all.filter(r => r.status === "done").length,
      rejected: all.filter(r => r.status === "rejected").length,
      byCategory: {} as Record<string, number>,
      byPriority: { high: 0, medium: 0, low: 0 } as Record<string, number>,
    };
    all.forEach(r => {
      stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1;
      stats.byPriority[r.priority] = (stats.byPriority[r.priority] || 0) + 1;
    });
    res.json(stats);
  });

  // ── Seed demo data ──────────────────────────────────────────────────────
  app.post("/api/seed", async (_req, res) => {
    const demoMessages = [
      { from: "Sarah Chen", body: "Hey, I really wish the mobile app had dark mode. It's really hard on my eyes at night and I use it every evening to review my team's progress." },
      { from: "Marcus Johnson", body: "Your API rate limits are killing us. We're building an integration and hitting the 100 req/min cap constantly. We need at least 1000 req/min for enterprise tier." },
      { from: "Priya Patel", body: "PLEASE add bulk export to CSV. I have to export reports one by one and it takes forever. This is critical for our monthly board reports." },
      { from: "Tom Rodriguez", body: "Would love Slack integration so feature requests could be posted automatically to our #product channel when they come in." },
      { from: "Aisha Williams", body: "The notification emails are too frequent and not customizable. Can we get a digest option instead of getting pinged every single time?" },
      { from: "David Kim", body: "Two-factor authentication would make our security team much happier. Right now they won't let us use the enterprise plan without it." },
    ];

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
  });
}
