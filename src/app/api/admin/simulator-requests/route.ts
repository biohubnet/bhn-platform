/**
 * GET /api/admin/simulator-requests — admin queue.
 *
 *   Query: ?status=pending|generating|ready|rejected|failed|all (default all)
 *
 *   Returns every SimulationRequest matching the filter, newest first
 *   for ready/rejected/failed (so admins see what was just acted on),
 *   oldest first for pending/generating (so the queue is FIFO).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = new Set([
  "pending",
  "generating",
  "ready",
  "rejected",
  "failed",
]);

export async function GET(req: NextRequest) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const statusParam = (req.nextUrl.searchParams.get("status") ?? "all").toLowerCase();
  const where = statusParam === "all" || !VALID_STATUSES.has(statusParam)
    ? {}
    : { status: statusParam };

  // FIFO for in-flight (pending / generating), LIFO for terminal states
  // — what an admin actually wants when scanning the page.
  const ascendingStatuses = new Set(["pending", "generating"]);
  const orderBy: { createdAt: "asc" | "desc" } =
    ascendingStatuses.has(statusParam) ? { createdAt: "asc" } : { createdAt: "desc" };

  const rows = await prisma.simulationRequest.findMany({
    where,
    orderBy,
    take: 200,
    select: {
      id: true,
      sourceUrl: true,
      jdBody: true,
      sourceHash: true,
      status: true,
      adminNotes: true,
      createdAt: true,
      updatedAt: true,
      processedAt: true,
      simulationId: true,
      user: { select: { id: true, name: true, email: true } },
      processedBy: { select: { id: true, name: true } },
      simulation: {
        select: { id: true, jobTitle: true, companyName: true, location: true },
      },
    },
  });

  // Per-status counts for the tab badges.
  const counts = await prisma.simulationRequest.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const countsByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count.status]),
  );

  return NextResponse.json({
    ok: true,
    counts: countsByStatus,
    rows: rows.map((r) => ({
      id: r.id,
      sourceUrl: r.sourceUrl,
      jdSnippet: r.jdBody.slice(0, 200),
      sourceHash: r.sourceHash,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      processedAt: r.processedAt?.toISOString() ?? null,
      simulationId: r.simulationId,
      requester: r.user,
      processedBy: r.processedBy,
      simulation: r.simulation,
    })),
  });
}
