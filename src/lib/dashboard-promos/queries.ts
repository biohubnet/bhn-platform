import { prisma } from "@/lib/prisma";
import { groupPromos, torontoToday } from "@/lib/dashboard-promos";

const LIVE_SELECT = {
  id: true, kind: true, title: true, summary: true, startDate: true, endDate: true,
  showUntil: true, location: true, ctaLabel: true, ctaHref: true,
} as const;

/**
 * The band's cards for today. Filters dates in memory so the rule lives
 * in one tested place (isPromoCurrent). A broken read hides the band
 * rather than the whole home page.
 */
// ponytail: loads every published row; fine for dozens of cards, move the date filter into SQL if it grows to thousands.
export async function getLivePromos(now = new Date()) {
  const rows = await prisma.dashboardPromo
    .findMany({
      where: { status: "published" },
      orderBy: [{ displayOrder: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: LIVE_SELECT,
    })
    .catch(() => []);
  return groupPromos(rows, torontoToday(now));
}

export type PromoGroups = Awaited<ReturnType<typeof getLivePromos>>;
