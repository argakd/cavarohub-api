import { prisma } from "../lib/prisma.js";
import { groupTransactionsByPeriod } from "../utils/dashboard.stats.js";

export async function getOrganizerStats(organizerId: string) {
  const events = await prisma.event.findMany({ where: { organizerId }, select: { id: true } });
  const eventIds = events.map((e) => e.id);

  const [allTransactions, doneTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    }),
    prisma.transaction.findMany({
      where: { eventId: { in: eventIds }, status: "DONE" },
      select: { createdAt: true, totalIdr: true },
    }),
  ]);

  const revenueIdr = doneTransactions.reduce((sum, t) => sum + t.totalIdr, 0);
  const grouped = groupTransactionsByPeriod(doneTransactions);

  return {
    totals: {
      events: events.length,
      transactions: allTransactions.length,
      revenueIdr,
      attendees: doneTransactions.length,
    },
    ...grouped,
  };
}
