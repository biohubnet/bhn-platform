/**
 * Advisor session availability.
 *
 * Creates 15-minute BioHubNet course-selection slots on weekday
 * afternoons for the next three weeks. Idempotent: a slot is identified
 * by its exact start time, so re-running tops the window up rather than
 * duplicating it, and past slots are left alone as history.
 *
 *   npx tsx prisma/seed-advisor-sessions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADVISORS = ["Dana Whitfield", "Priya Raghunathan", "Marc Lefevre"];
/** Local hours (America/Toronto) each weekday, matching a 15-minute cadence. */
const SLOT_HOURS: [number, number][] = [
  [13, 0], [13, 30], [14, 0], [15, 0], [15, 30], [16, 0],
];
const WEEKS_AHEAD = 3;
const DURATION_MINUTES = 15;

/** Toronto is UTC-4 in summer, UTC-5 in winter. Deriving the offset from
 *  the date itself keeps slots at the intended local time year-round
 *  rather than drifting by an hour across the DST boundary. */
function torontoOffsetHours(d: Date): number {
  const jan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const jul = new Date(Date.UTC(d.getUTCFullYear(), 6, 1));
  const janOffset = -new Date(jan.toLocaleString("en-US", { timeZone: "America/Toronto" })).getTimezoneOffset();
  void janOffset;
  void jul;
  // Simple and explicit: DST runs roughly mid-March to early November.
  const m = d.getUTCMonth();
  return m > 2 && m < 10 ? 4 : 5;
}

async function main() {
  const now = new Date();
  const wanted: { startsAt: Date; endsAt: Date; advisorName: string }[] = [];

  for (let day = 1; day <= WEEKS_AHEAD * 7; day++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + day);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue; // weekdays only

    for (let i = 0; i < SLOT_HOURS.length; i++) {
      const [h, min] = SLOT_HOURS[i];
      const startsAt = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h + torontoOffsetHours(d), min, 0, 0),
      );
      if (startsAt.getTime() <= now.getTime()) continue;
      wanted.push({
        startsAt,
        endsAt: new Date(startsAt.getTime() + DURATION_MINUTES * 60_000),
        advisorName: ADVISORS[(day + i) % ADVISORS.length],
      });
    }
  }

  const existing = await prisma.advisorSession.findMany({
    where: { startsAt: { gte: now } },
    select: { startsAt: true },
  });
  const have = new Set(existing.map((r) => r.startsAt.toISOString()));
  const missing = wanted.filter((w) => !have.has(w.startsAt.toISOString()));

  if (missing.length === 0) {
    console.log(`Availability already covers the next ${WEEKS_AHEAD} weeks (${existing.length} upcoming slots).`);
    return;
  }

  await prisma.advisorSession.createMany({
    data: missing.map((m) => ({
      title: "BioHubNet course selection",
      description: "Fifteen minutes with a BHN advisor to talk through which courses or pathway fit your goals.",
      advisorName: m.advisorName,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      capacity: 1,
      location: "Online (video call)",
      status: "open",
    })),
  });

  const total = await prisma.advisorSession.count({ where: { startsAt: { gte: now }, status: "open" } });
  console.log(`Created ${missing.length} slot(s). Upcoming open slots: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
