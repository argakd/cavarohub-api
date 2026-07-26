import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { authenticate } from "./middlewares/auth.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import eventRoutes from "./routes/event.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Railway sits in front of us as a reverse proxy — trust its X-Forwarded-* headers
  // so req.protocol/req.get("host") reflect the real public https URL, not the internal one.
  app.set("trust proxy", 1);

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());
  app.use(authenticate);
  app.use("/uploads", express.static(path.join(__dirname, "./uploads")));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/reviews", reviewRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
