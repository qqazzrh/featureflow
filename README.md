# FeatureFlow

Turn WhatsApp customer messages into a structured feature request pipeline — with AI parsing, PM review, and an AI agent that generates implementation plans for approved requests.

![Dashboard](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20SQLite-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

Customers send feature requests over WhatsApp. FeatureFlow ingests those messages via webhook, uses GPT-4o-mini to extract a structured request (title, description, priority, category, sentiment), surfaces them in a PM review dashboard, and — when a PM approves — kicks off a GPT-4o agent that produces a step-by-step implementation plan ready for engineering handoff.

```
WhatsApp message
      ↓
  Webhook receiver  (/api/webhook/whatsapp)
      ↓
  AI parser         (gpt-4o-mini → title, priority, category, sentiment)
      ↓
  PM Dashboard      (review · edit · approve / reject)
      ↓
  AI Agent          (gpt-4o → implementation plan + effort estimate)
      ↓
  Agent Log         (live execution log, plan steps, result summary)
```

---

## Features

- **WhatsApp webhook** — supports Meta WhatsApp Business API and Twilio formats; includes a manual message simulator for testing without a real number
- **AI parsing** — extracts title, expanded description, priority (high/medium/low), category (billing/UX/API/notifications/performance/general), and customer sentiment (positive/neutral/frustrated)
- **PM dashboard** — filterable request table, inline edit, approve/reject with optional PM notes
- **AI agent** — on approval, generates a numbered implementation plan with effort estimates, dependency analysis, and risk flags
- **Agent log** — per-request execution history with plan steps, raw log, and result summary
- **Demo mode** — runs fully without an OpenAI key; mock data is generated so you can explore the full UI
- **Dark mode** — full light/dark theme toggle

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3, shadcn/ui, TanStack Query |
| Backend | Express (Node.js), TypeScript |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| AI | OpenAI (`gpt-4o-mini` for parsing, `gpt-4o` for agent) |
| Routing | Wouter (hash-based, works in iframes/S3) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key (optional — app runs in demo mode without one)

### Install & run

```bash
git clone https://github.com/qqazzrh/featureflow.git
cd featureflow
npm install

# Optional: add your OpenAI key
export OPENAI_API_KEY=sk-...

npm run dev
```

The app runs at `http://localhost:5000`. Click **Load demo data** on the dashboard to populate 6 pre-parsed feature requests immediately.

### Production build

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | GPT-4o-mini (parsing) + GPT-4o (agent). Without it, demo mode is used. |
| `WHATSAPP_VERIFY_TOKEN` | No | Webhook verification token. Defaults to `featureflow_verify_2024`. |

---

## WhatsApp Webhook Setup

### Meta WhatsApp Business API

1. Go to [Meta Developer Console](https://developers.facebook.com) → your app → WhatsApp → Configuration
2. Set the **Callback URL** to `https://your-domain.com/api/webhook/whatsapp`
3. Set the **Verify Token** to `featureflow_verify_2024` (or your custom `WHATSAPP_VERIFY_TOKEN`)
4. Subscribe to the `messages` webhook field
5. Send a WhatsApp message to your business number — it appears in the Inbox within seconds

### Twilio WhatsApp

Point your Twilio WhatsApp sandbox webhook to `POST https://your-domain.com/api/webhook/whatsapp`. The app auto-detects the Twilio payload format.

### Manual testing (no WhatsApp number needed)

Use the **Inbox → Simulate WhatsApp Message** form, or call the API directly:

```bash
curl -X POST http://localhost:5000/api/messages/manual \
  -H "Content-Type: application/json" \
  -d '{"from": "Sarah Chen", "body": "I really wish the mobile app had dark mode"}'
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/webhook/whatsapp` | Webhook verification (Meta hub challenge) |
| `POST` | `/api/webhook/whatsapp` | Receive inbound WhatsApp message |
| `POST` | `/api/messages/manual` | Manually inject a message (testing) |
| `GET` | `/api/messages` | List all raw WhatsApp messages |
| `GET` | `/api/feature-requests` | List all feature requests |
| `GET` | `/api/feature-requests/:id` | Get a single feature request |
| `PATCH` | `/api/feature-requests/:id` | Update title, description, priority, category, PM notes |
| `POST` | `/api/feature-requests/:id/approve` | Approve and trigger AI agent |
| `POST` | `/api/feature-requests/:id/reject` | Reject with optional PM notes |
| `GET` | `/api/agent-tasks` | List all agent executions |
| `GET` | `/api/agent-tasks/by-request/:id` | Get agent task for a feature request |
| `GET` | `/api/stats` | Dashboard stats (counts by status, category, priority) |
| `POST` | `/api/seed` | Seed 6 demo feature requests |

---

## Project Structure

```
featureflow/
├── client/
│   └── src/
│       ├── components/
│       │   ├── AppLayout.tsx       # Sidebar + nav shell
│       │   ├── StatusBadge.tsx     # Status, priority, category, sentiment badges
│       │   └── ThemeProvider.tsx   # Dark/light mode context
│       ├── pages/
│       │   ├── Dashboard.tsx       # Stats, recent requests, category chart
│       │   ├── Inbox.tsx           # Raw messages + manual simulator
│       │   ├── Requests.tsx        # Filterable request table
│       │   ├── RequestDetail.tsx   # Review, edit, approve/reject, agent output
│       │   ├── AgentLogs.tsx       # Agent execution history
│       │   └── Settings.tsx        # Webhook config, AI setup guide
│       └── App.tsx
├── server/
│   ├── routes.ts                   # All API routes + AI helpers
│   ├── storage.ts                  # SQLite/Drizzle storage layer
│   └── index.ts                    # Express server entry
├── shared/
│   └── schema.ts                   # Drizzle schema + Zod types
└── data.db                         # SQLite database (auto-created, gitignored)
```

---

## Data Model

**`whatsapp_messages`** — raw inbound messages (from, body, timestamp, processed flag)

**`feature_requests`** — AI-parsed requests with PM review state (title, description, priority, category, sentiment, status, pmNotes, customerName)

**`agent_tasks`** — one per approved request (status, plan JSON, log, result, timestamps)

---

## Demo Mode

Without `OPENAI_API_KEY`, the app uses deterministic mock outputs:

- Parsing assigns random priority/category/sentiment from the valid enum values
- The agent returns a fixed 6-step implementation plan (analyze → schema → API → frontend → tests → deploy)

This lets you explore the full UI and all state transitions without spending any API credits.

---

## License

MIT
