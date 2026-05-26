/**
 * POST /api/admin/showcase/[id]/mark-downloaded
 *
 * Admin toggles the "downloaded" flag on a graduate showcase
 * submission so the team can track which entries still need
 * processing. Two callers:
 *
 *   • Auto-marked by the Download button in /admin/showcase — opens
 *     the photo + LinkedIn in new tabs and POSTs here with mark=true
 *     so the row stamps "downloaded by <admin> at <now>" without an
 *     extra click.
 *   • Manually toggled by the "Mark done / Mark undone" button when
 *     the admin downloaded out-of-band (forwarded the URL, used the
 *     mobile app, etc.) and just wants to record completion.
 *
 * Body: { mark: boolean } — true sets lastDownloadedAt + ...By,
 *                            false clears both.
 *
 * Returns the full updated submission so the client can swap the row
 * in-place without a re-fetch.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let mark = true;
  try {
    const body = (await req.json().catch(() => ({}))) as { mark?: unknown };
    if (typeof body.mark === "boolean") mark = body.mark;
  } catch {
    /* malformed body → treat as mark=true (the common case) */
  }

  const existing = await prisma.showcaseSubmission.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const adminName =
    (session.user as { name?: string }).name ??
    (session.user as { email?: string }).email ??
    "admin";

  const updated = await prisma.showcaseSubmission.update({
    where: { id },
    data: mark
      ? { lastDownloadedAt: new Date(), lastDownloadedBy: adminName }
      : { lastDownloadedAt: null, lastDownloadedBy: null },
  });

  // Serialise Dates for the JSON boundary so the client component can
  // hand the row straight back into its state without parsing.
  return NextResponse.json({
    ok: true,
    submission: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      lastDownloadedAt: updated.lastDownloadedAt?.toISOString() ?? null,
    },
  });
}
