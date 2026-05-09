/**
 * Toggle a saved/bookmarked internship for the calling trainee.
 *
 *   POST   /api/internships/[id]/save   → upsert UserSavedPosting
 *   DELETE /api/internships/[id]/save   → unsave
 *
 * Uses the unique (userId, postingId) constraint so POSTs are
 * idempotent — re-saving the same posting is a no-op rather than a
 * duplicate. Returns the new saved-state so the client can update
 * its heart-icon UI without a second round-trip.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id: postingId } = await params;

  // Confirm the posting exists + is visible (no saving drafts that
  // a trainee shouldn't be seeing in the first place).
  const posting = await prisma.internshipPosting.findUnique({
    where: { id: postingId },
    select: { id: true, status: true },
  });
  if (!posting) return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  if (posting.status === "draft") {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }

  await prisma.userSavedPosting.upsert({
    where: { userId_postingId: { userId, postingId } },
    create: { userId, postingId },
    update: {}, // no-op — keep original createdAt
  });
  return NextResponse.json({ saved: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;
  const { id: postingId } = await params;

  // Delete-if-exists; ignore not-found so the endpoint is idempotent.
  await prisma.userSavedPosting
    .delete({ where: { userId_postingId: { userId, postingId } } })
    .catch(() => null);
  return NextResponse.json({ saved: false });
}
