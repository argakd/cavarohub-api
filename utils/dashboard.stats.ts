export type StatsBucket = { period: string; revenueIdr: number; transactionCount: number };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function groupTransactionsByPeriod(
  transactions: { createdAt: Date; totalIdr: number }[],
): { byDay: StatsBucket[]; byMonth: StatsBucket[]; byYear: StatsBucket[] } {
  const dayMap = new Map<string, StatsBucket>();
  const monthMap = new Map<string, StatsBucket>();
  const yearMap = new Map<string, StatsBucket>();

  function bump(map: Map<string, StatsBucket>, period: string, totalIdr: number) {
    const existing = map.get(period);
    if (existing) {
      existing.revenueIdr += totalIdr;
      existing.transactionCount += 1;
    } else {
      map.set(period, { period, revenueIdr: totalIdr, transactionCount: 1 });
    }
  }

  for (const t of transactions) {
    const d = t.createdAt;
    const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const monthKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const yearKey = `${d.getFullYear()}`;
    bump(dayMap, dayKey, t.totalIdr);
    bump(monthMap, monthKey, t.totalIdr);
    bump(yearMap, yearKey, t.totalIdr);
  }

  const sortByPeriod = (a: StatsBucket, b: StatsBucket) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0);

  return {
    byDay: [...dayMap.values()].sort(sortByPeriod),
    byMonth: [...monthMap.values()].sort(sortByPeriod),
    byYear: [...yearMap.values()].sort(sortByPeriod),
  };
}
