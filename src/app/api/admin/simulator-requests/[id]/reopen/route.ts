/**
 * POST /api/admin/simulator-requests/[id]/reopen
 *
 * Admin reopens a rejected or failed request — flips status back to
 * 'pending' and clears the adminNotes / processedBy fields so it
 * lands back in the queue cleanly.
 *
 * Reopen is intentionally NOT allowed for status=ready — that would
 * silently invalidate the requester's existing attempt and risk data
 * loss. To regenerate a ready request, the admin first rejects (which
 * leaves the Attempt alive but parked), then reopens.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const request = await prisma.simulationRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status !== "rejected" && request.status !== "failed") {
    return NextResponse.json(
      {
        error:
          "Only rejected or failed requests can be reopened. Ready requests must be rejected first.",
      },
      { status: 409 },
    );
  }

  await prisma.simulationRequest.update({
    where: { id },
    data: {
      status: "pending",
      adminNotes: null,
      processedById: null,
      processedAt: null,
    },
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
