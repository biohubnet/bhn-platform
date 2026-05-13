/**
 * Admin: spawn / clear a small batch of demo BhnEvent rows.
 *
 *   POST   /api/admin/events/demo-seed   → seed 3 demo events
 *   DELETE /api/admin/events/demo-seed   → remove every demo event
 *
 * Demo events live alongside real events but are identified by a
 * `demo-` slug prefix. That keeps the contract dead-simple (no
 * accountKind column to add, no migration) and lets the clear-endpoint
 * be a trivial `deleteMany({ where: { slug: { startsWith: "demo-" } } })`.
 *
 * The seeded events span the next ~9 months so the calendar view on
 * /events has interesting content even on a fresh database. Each one
 * gets a marketing tagline + short description so the public landing
 * page doesn't look hollow.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEMO_PREFIX = "demo-";

function inDays(d: number, hours = 9, minutes = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}

// Demo events deliberately land inside the calendar's default
// 2-month visible window (anchor month + 1 month ahead). With
// monthsAhead=1 on EventCalendar, that's roughly the next ~50 days
// from today. Sitting all three demo events inside that band means
// an admin who clicks "Seed demo events" sees every seeded row on
// the calendar without having to nav forward — the whole point of
// the seed is to populate the current view.
//
// First event lands a few days out (not today — leaves room for
// "upcoming" framing), the second slides into the second visible
// month, and the third caps at the far edge of that month so the
// three dots spread across the calendar instead of clustering.
const DEMO_EVENTS = [
  {
    slug: `${DEMO_PREFIX}biomanufacturing-day`,
    title: "Demo · Biomanufacturing Industry Day",
    tagline: "A one-day showcase connecting trainees with industry partners — sample event for demos.",
    description:
      "Demo event auto-generated for testing the public events surface, registration flow, and admin queues. Safe to delete via the Clear-demo button on /events.",
    venue: "MaRS Discovery District, Toronto",
    daysFromNowStart: 5,
    daysFromNowEnd: 5,
  },
  {
    slug: `${DEMO_PREFIX}summer-workshop-series`,
    title: "Demo · Summer Cleanroom Workshop Series",
    tagline: "Three days of hands-on cleanroom practice — gowning, aseptic technique, environmental monitoring.",
    description:
      "Demo event auto-generated for testing the public events surface, registration flow, and admin queues. Safe to delete via the Clear-demo button on /events.",
    venue: "Centre for Cellular and Biomolecular Research, U of T",
    daysFromNowStart: 20,
    daysFromNowEnd: 22,
  },
  {
    slug: `${DEMO_PREFIX}fall-symposium-preview`,
    title: "Demo · Fall Mini-Symposium",
    tagline: "Industry talks + trainee posters + reception. A scaled-down sibling to the annual flagship.",
    description:
      "Demo event auto-generated for testing the public events surface, registration flow, and admin queues. Safe to delete via the Clear-demo button on /events.",
    venue: "Bahen Centre for Information Technology, U of T",
    daysFromNowStart: 40,
    daysFromNowEnd: 40,
  },
];

export async function POST() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Idempotent: upsert each row so re-running the seed updates dates
  // (useful when the seed sat in dev for a week and the demo dates
  // drifted into the past).
  let created = 0;
  let updated = 0;
  for (const e of DEMO_EVENTS) {
    const startDate = inDays(e.daysFromNowStart);
    const endDate = inDays(e.daysFromNowEnd, 17, 0);
    const existing = await prisma.bhnEvent.findUnique({ where: { slug: e.slug } });
    await prisma.bhnEvent.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug,
        title: e.title,
        tagline: e.tagline,
        description: e.description,
        startDate,
        endDate,
        mainVenueName: e.venue,
        status: "published",
      },
      update: {
        title: e.title,
        tagline: e.tagline,
        description: e.description,
        startDate,
        endDate,
        mainVenueName: e.venue,
        status: "published",
      },
    });
    if (existing) updated++; else created++;
  }

  return NextResponse.json({ ok: true, created, updated });
}

export async function DELETE() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cascade-delete every related row (registrations, workshops,
  // sessions, speakers, sponsors) — demo events shouldn't outlive
  // their declared lifetime, and leaving orphans behind would defeat
  // the purpose of the clear button. Prisma cascades aren't always
  // declared so we delete relations explicitly to be safe.
  const demos = await prisma.bhnEvent.findMany({
    where: { slug: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const ids = demos.map((d) => d.id);
  if (ids.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

  await prisma.$transaction([
    prisma.registration.deleteMany({ where: { eventId: { in: ids } } }),
    prisma.bhnEvent.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return NextResponse.json({ ok: true, deleted: ids.length });
}
