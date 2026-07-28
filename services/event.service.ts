import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import slugify from "../utils/slugify.js";

type CreateEventInput = {
  organizerId: string;
  name: string;
  description: string;
  location: string;
  categoryName: string;
  startDate: Date;
  endDate: Date;
  isPaid: boolean;
  basePriceIdr: number;
  totalSeats: number;
  bannerImageUrl?: string;
  ticketTypes?: { name: string; priceIdr: number; totalSeats: number }[];
};

export async function createEvent(input: CreateEventInput) {
  const category = await prisma.category.upsert({
    where: { name: input.categoryName },
    update: {},
    create: { name: input.categoryName },
  });

  const slugBase = slugify(input.name);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  return prisma.event.create({
    data: {
      organizerId: input.organizerId,
      name: input.name,
      slug,
      description: input.description,
      location: input.location,
      categoryId: category.id,
      startDate: input.startDate,
      endDate: input.endDate,
      isPaid: input.isPaid,
      basePriceIdr: input.isPaid ? input.basePriceIdr : 0,
      totalSeats: input.totalSeats,
      availableSeats: input.totalSeats,
      bannerImageUrl: input.bannerImageUrl,
      ticketTypes: input.ticketTypes
        ? {
            create: input.ticketTypes.map((t) => ({
              name: t.name,
              priceIdr: t.priceIdr,
              totalSeats: t.totalSeats,
              availableSeats: t.totalSeats,
            })),
          }
        : undefined,
    },
    include: { ticketTypes: true, category: true },
  });
}

type ListEventsInput = {
  search?: string;
  category?: string;
  location?: string;
  page: number;
  pageSize: number;
};

export async function listEvents(input: ListEventsInput) {
  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    ...(input.category ? { category: { name: { equals: input.category, mode: "insensitive" } } } : {}),
    ...(input.location ? { location: { contains: input.location, mode: "insensitive" } } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
            { location: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { category: true, ticketTypes: true },
      orderBy: { startDate: "asc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total, page: input.page, pageSize: input.pageSize };
}

export async function getEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      category: true,
      ticketTypes: true,
      organizer: { select: { id: true, name: true, profilePicture: true } },
      vouchers: { where: { endDate: { gte: new Date() } } },
      reviews: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!event) throw new AppError(404, "Event not found");
  return event;
}

export async function getEventOr404(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, "Event not found");
  return event;
}

type UpdateEventInput = Partial<Omit<CreateEventInput, "organizerId" | "ticketTypes">>;

export async function updateEvent(eventId: string, organizerId: string, input: UpdateEventInput) {
  const event = await getEventOr404(eventId);
  if (event.organizerId !== organizerId) {
    throw new AppError(403, "Only the organizer who created this event can edit it");
  }

  let categoryId: string | undefined;
  if (input.categoryName) {
    const category = await prisma.category.upsert({
      where: { name: input.categoryName },
      update: {},
      create: { name: input.categoryName },
    });
    categoryId = category.id;
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      name: input.name,
      description: input.description,
      location: input.location,
      categoryId,
      startDate: input.startDate,
      endDate: input.endDate,
      isPaid: input.isPaid,
      basePriceIdr: input.basePriceIdr,
      bannerImageUrl: input.bannerImageUrl,
    },
    include: { ticketTypes: true, category: true },
  });
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

/** All events (any status) belonging to one organizer, for their dashboard. */
export async function listMyEvents(organizerId: string) {
  return prisma.event.findMany({
    where: { organizerId },
    include: { category: true, ticketTypes: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteEvent(eventId: string, organizerId: string) {
  const event = await getEventOr404(eventId);
  if (event.organizerId !== organizerId) {
    throw new AppError(403, "Only the organizer who created this event can delete it");
  }

  const transactionCount = await prisma.transaction.count({ where: { eventId } });
  if (transactionCount > 0) {
    throw new AppError(400, "This event already has transactions and can't be deleted.");
  }

  await prisma.$transaction([
    prisma.voucher.deleteMany({ where: { eventId } }),
    prisma.ticketType.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);
}
