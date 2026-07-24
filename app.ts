import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env";
import { authenticate } from "./middlewares/auth";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import eventRoutes from "./routes/event.routes";
import reviewRoutes from "./routes/review.routes";
import transactionRoutes from "./routes/transaction.routes";

export function createApp() {
  const app = express();

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
