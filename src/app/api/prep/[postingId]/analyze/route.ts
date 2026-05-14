/**
 * Run the JD ↔ resume keyword analysis for a posting.
 *
 *   POST /api/prep/[postingId]/analyze
 *     body: { resumeText: string }
 *
 * Returns the structured `PrepStateCompare` blob — keyword list,
 * per-keyword match status, alignment score. The client merges
 * this into the PrepSession.state under `state.compare` and saves
 * via the PATCH endpoint above. We don't auto-persist here so the
 * trainee can rerun the analysis until they like what they see
 * before committing it to their session.
 *
 * AI path or heuristic fallback — see src/lib/prep/analyze.ts for
 * the priority logic.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeResumeVsJd } from "@/lib/prep/analyze";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ postingId: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { resumeText?: string };

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: {
      id: true,
      title: true,
      positionDetails: true,
      keySkills: true,
      companyName: true,
    },
  });
  if (!posting) return NextResponse.json({ error: "Posting not found" }, { status: 404 });

  const jdText =
    `${posting.title} at ${posting.companyName}\n\n` +
    `Key skills: ${posting.keySkills.join(", ")}\n\n` +
    posting.positionDetails;

  const compare = await analyzeResumeVsJd({
    jdText,
    resumeText: (body.resumeText ?? "").slice(0, 8000),
    postingId,
    userId,
  });

  return NextResponse.json({ ok: true, compare });
}
