import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
