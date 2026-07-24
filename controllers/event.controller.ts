import { Request, Response } from "express";
import * as eventService from "../services/event.service.js";
import { createEventSchema, listEventsQuerySchema, updateEventSchema } from "../validators/event.validator.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function create(req: Request, res: Response) {
  const parsed = createEventSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const event = await eventService.createEvent({ ...parsed, organizerId: req.user.id });
  res.status(201).json(event);
}

export async function list(req: Request, res: Response) {
  const parsed = listEventsQuerySchema.parse(req.query);
  const result = await eventService.listEvents(parsed);
  res.json(result);
}

export async function getBySlug(req: Request, res: Response) {
  const event = await eventService.getEventBySlug(req.params.slug as string);
  res.json(event);
}

export async function update(req: Request, res: Response) {
  const parsed = updateEventSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const event = await eventService.updateEvent(req.params.id as string, req.user.id, parsed);
  res.json(event);
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  await eventService.deleteEvent(req.params.id as string, req.user.id);
  res.status(204).send();
}

export async function categories(_req: Request, res: Response) {
  const cats = await eventService.listCategories();
  res.json(cats);
}

export async function mine(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const events = await eventService.listMyEvents(req.user.id);
  res.json(events);
}
