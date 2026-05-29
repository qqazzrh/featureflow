import "dotenv/config";
import express, { Response, NextFunction } from "express";
import type { Request } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);

app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

// Register all routes (async IIFE — Vercel handler awaits)
let ready: Promise<void> | null = null;
function ensureReady() {
  if (!ready) {
    ready = registerRoutes(httpServer, app).then(() => {
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({ message: err.message || "Internal Server Error" });
      });
    });
  }
  return ready;
}

export default async function handler(req: Request, res: Response) {
  await ensureReady();
  app(req, res);
}
