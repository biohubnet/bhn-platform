/**
 * POST /api/profile-views — an employer opened a trainee's profile.
 * Body: { userId, surface }. Fired by <RecordProfileView/>.
 *
 * Only real employers count: not the trainee themself, and not a
 * superadmin viewing the site as an employer. Only trainees employers are
 * cleared to see can be counted, the same gate all three pages apply. A
 * viewer adds at most one view per trainee per day (unique on userId +
 * viewerId + day), so reloads and repeat visits don't inflate the figure.
 * Anything not counted answers the same way, so the route reveals
 * nothing about which ids exist.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardSession } from "@/lib/api/guard";
import { isEmployer } from "@/lib/auth";
import { isUserEligibleForEmployers } from "@/lib/talent-pool/eligibility";
import { torontoToday } from "@/lib/dashboard-promos";

const Body = z.object({
  userId: z.string().min(1).max(64),
  surface: z.enum(["talent_pool", "applicant", "resume"]),
});

export async function POST(req: NextRequest) {
  const session = await guardSession();
  if (session instanceof NextResponse) return session;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid fields." }, { status: 400 });

  const user = session.user as { id?: string; role?: string; realRole?: string; actingAs?: string };
  const viewerId = user.id;
  const { userId, surface } = parsed.data;
  const notCounted = NextResponse.json({ ok: true, counted: false });
  if (!viewerId || viewerId === userId || user.actingAs || !isEmployer(user.realRole ?? user.role ?? "")) return notCounted;
  if (!(await isUserEligibleForEmployers(userId))) return notCounted;

  const { count } = await prisma.profileView.createMany({
    data: [{ userId, viewerId, surface, day: torontoToday() }],
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true, counted: count > 0 });
}
