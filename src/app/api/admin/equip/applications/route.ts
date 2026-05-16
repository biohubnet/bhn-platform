/**
 * Admin queue endpoint for Equip applications.
 *
 *   GET /api/admin/equip/applications?status=...
 *
 * Mirrors the /api/admin/credit-applications shape so reviewers
 * who know that surface feel at home here too. `status` is
 * optional; omit it to see everything.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_STATUSES = new Set([
  "draft", "submitted", "under_review", "approved", "rejected", "funded",
]);

export async function GET(req: Request) {
  await requireRole("admin");

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const where = statusFilter && VALID_STATUSES.has(statusFilter)
    ? { status: statusFilter }
    : statusFilter === "open"
      ? { status: { in: ["submitted", "under_review"] } }
      : {};

  const apps = await prisma.equipApplication.findMany({
    where,
    orderBy: [
      // Surface pending work first (submitted before everything
      // else), then newest within each bucket.
      { status: "asc" },
      { submittedAt: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      id: true, stream: true, status: true,
      requestedAmount: true, approvedAmount: true,
      institution: true, institutionOther: true,
      applicantType: true,
      submittedAt: true, decidedAt: true, fundedAt: true,
      createdAt: true, updatedAt: true,
      user:     { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  // Counts for filter chips.
  const counts = await prisma.equipApplication.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return NextResponse.json({ applications: apps, counts: byStatus });
}
