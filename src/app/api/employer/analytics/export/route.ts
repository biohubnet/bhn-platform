/**
 * Employer hiring analytics CSV export.
 *
 *   GET /api/employer/analytics/export
 *
 * Auth: employer or admin.
 *
 * Returns a CSV file with one row per ApplicationStatus, columns:
 *   Posting Title, Applicant Name, Applicant Email, Current Stage,
 *   Stage Entered At, Days in Stage (approx), Rating (1-5),
 *   Offer Status, Notes (truncated to 200 chars)
 *
 * Headers:
 *   Content-Type: text/csv
 *   Content-Disposition: attachment; filename="hiring-report-{date}.csv"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getActiveCompanyId } from "@/lib/employer/company";

export const runtime = "nodejs";

/** Escapes a CSV field value (RFC 4180). */
function csvField(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | null | undefined)[]): string {
  return fields.map(csvField).join(",");
}

/** Resolves companyId for employer or admin (same fallback pattern as analytics route). */
async function resolveCompanyId(userId: string, isAdmin: boolean): Promise<string | null> {
  const own = await getActiveCompanyId(userId);
  if (own) return own;
  if (!isAdmin) return null;

  const existing = await prisma.company.findFirst({
    orderBy: { name: "asc" },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: existing.id, userId } },
    create: { companyId: existing.id, userId, role: "owner", joinedAt: new Date() },
    update: {},
  });
  return existing.id;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role ?? "";
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(userId, isAdmin);
  if (!companyId) {
    return NextResponse.json({ error: "No company workspace found" }, { status: 400 });
  }

  // Fetch all non-deleted postings for this company
  const postings = await prisma.internshipPosting.findMany({
    where: {
      companyId,
      status: { not: "deleted" },
    },
    select: { id: true },
  });

  const postingIds = postings.map((p) => p.id);

  // Fetch all ApplicationStatus rows with the required relations
  const appStatuses = postingIds.length > 0
    ? await prisma.applicationStatus.findMany({
        where: { postingId: { in: postingIds } },
        select: {
          id: true,
          postingId: true,
          status: true,
          stageEnteredAt: true,
          createdAt: true,
          rating: true,
          notes: true,
          posting: {
            select: { title: true },
          },
          applicant: {
            select: { name: true, email: true },
          },
          offer: {
            select: { status: true },
          },
        },
        orderBy: [{ postingId: "asc" }, { createdAt: "asc" }],
      })
    : [];

  const now = Date.now();

  // Build CSV
  const header = csvRow([
    "Posting Title",
    "Applicant Name",
    "Applicant Email",
    "Current Stage",
    "Stage Entered At",
    "Days in Stage (approx)",
    "Rating (1-5)",
    "Offer Status",
    "Notes",
  ]);

  const rows = appStatuses.map((row) => {
    const stageEnteredAt = row.stageEnteredAt;
    const daysInStage = stageEnteredAt
      ? Math.max(0, Math.floor((now - stageEnteredAt.getTime()) / 86_400_000))
      : null;

    const notes = row.notes
      ? row.notes.slice(0, 200) + (row.notes.length > 200 ? "…" : "")
      : null;

    return csvRow([
      row.posting?.title ?? "",
      row.applicant?.name ?? "",
      row.applicant?.email ?? "",
      row.status,
      stageEnteredAt ? stageEnteredAt.toISOString() : "",
      daysInStage !== null ? String(daysInStage) : "",
      row.rating !== null && row.rating !== undefined ? String(row.rating) : "",
      row.offer?.status ?? "",
      notes,
    ]);
  });

  const csv = [header, ...rows].join("\r\n");

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `hiring-report-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
