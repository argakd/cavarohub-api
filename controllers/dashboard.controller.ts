import { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function stats(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const data = await dashboardService.getOrganizerStats(req.user.id);
  res.json(data);
}
