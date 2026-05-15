/**
 * Employer: full AI fit breakdown for one applicant on one posting.
 *
 *   GET /api/employer/applications/fit?postingId=xxx&applicantId=yyy
 *   → FitResult (the same shape FitExplain renders elsewhere).
 *
 * Pulled out of the list endpoint so the kanban / list view can stay
 * snappy (it only needs score + matched count). The drawer fires this
 * on open to populate the expandable FitExplain panel.
 *
 * Gate: same as the list endpoint — admin / superadmin, or the
 * employer who created the posting.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreFitForTrainee } from "@/lib/matching/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const postingId = url.searchParams.get("postingId");
  const applicantId = url.searchParams.get("applicantId");
  if (!postingId || !applicantId) {
    return NextResponse.json({ error: "postingId and applicantId required" }, { status: 400 });
  }
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Same gate as the list endpoint — non-admin employers can only see
  // their own postings.
  const isAdmin = me.role === "admin" || me.role === "superadmin";
  if (!isAdmin) {
    if (me.role !== "employer") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const posting = await prisma.internshipPosting.findUnique({
      where: { id: postingId },
      select: { createdById: true },
    });
    if (!posting || posting.createdById !== me.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const fit = await scoreFitForTrainee(applicantId, postingId);
  return NextResponse.json({ ok: true, fit });
}
