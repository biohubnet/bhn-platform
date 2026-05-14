/**
 * Trainee "Mark as applied" — closes the loop between BHN and an
 * external apply step.
 *
 *   POST /api/internships/[id]/apply  { notes?: string }
 *
 * Trainee clicks the "Send my application" button on a posting's
 * detail page. The button typically opens a `mailto:` to the
 * employer with the trainee's pitch + resume URL pre-filled (we
 * don't proxy the email; we just help the trainee fire it). After
 * the mail client is opened, this endpoint is fired so BHN keeps a
 * record:
 *   • Creates an ApplicationStatus row at status="new" so the
 *     trainee can later see "I applied to this" on
 *     /profile/applications, and so the employer's kanban shows
 *     the BHN-side candidate even when they applied via email.
 *   • Idempotent: if a row already exists for (postingId, applicantId)
 *     we leave its status alone — the employer may already have
 *     advanced the candidate to "shortlisted" and we don't want to
 *     reset that.
 *
 * Stores `notes` if supplied so a trainee can capture a short
 * reminder ("emailed Anita with the cohort posting"). Notes are
 * trainee-private — employers don't see them on their kanban.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id: postingId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    notes?: string;
    coverLetter?: string;
  };
  // `notes` stays trainee-private. `coverLetter` is the new
  // employer-visible field. ApplyDialog currently sends the user-
  // composed note under both keys for back-compat — we trim each
  // independently.
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;
  const coverLetter =
    typeof body.coverLetter === "string"
      ? body.coverLetter.trim().slice(0, 2000)
      : null;

  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: { id: true, status: true },
  });
  if (!posting) return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  if (posting.status === "draft") {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (notes) updateData.notes = notes;
  // Cover letter, unlike notes, is allowed to be cleared (null)
  // when the trainee removes it on re-apply. We only touch the
  // column when the field is explicitly present in the body.
  if (body.coverLetter !== undefined) updateData.coverLetter = coverLetter;

  const status = await prisma.applicationStatus.upsert({
    where: { postingId_applicantId: { postingId, applicantId: userId } },
    create: {
      postingId,
      applicantId: userId,
      status: "new",
      notes,
      coverLetter,
    },
    // Don't trample the employer's stage if it's already past "new".
    update: updateData,
  });

  return NextResponse.json({ ok: true, status: status.status });
}
