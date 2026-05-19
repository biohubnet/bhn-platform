/**
 * POST /api/onboarding/complete-cell-split — set the signed-in
 * user's `hasSplitCell` flag to true. Called at the end of the
 * gamified "split a cell" walkthrough at /welcome/split-a-cell.
 *
 * Idempotent — flipping `true → true` is a no-op for Prisma's
 * UPDATE. 401 for unauthenticated callers (the welcome page is
 * auth-gated anyway, this is just defence in depth).
 *
 * Admin replay path (`/welcome/split-a-cell?replay=1`) does NOT
 * call this endpoint — admins shouldn't trigger the redirect
 * away from /welcome on replay since they may want to play
 * again. The client component checks the `replay` prop before
 * firing the POST.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  const userId = session?.user
    ? (session.user as { id?: string }).id
    : null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hasSplitCell: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete-cell-split] failed", err);
    return NextResponse.json(
      { error: "Failed to mark complete" },
      { status: 500 },
    );
  }
}
