/**
 * CSV export of registrations for an event.
 *
 *   GET /api/admin/events/[slug]/registrations.csv
 *
 * Streams a text/csv response with Content-Disposition: attachment
 * so the browser downloads it directly. Useful for catering /
 * accessibility / badge-printing handoff.
 *
 * Columns: Email, Name, Attendee type, Registration status, Payment
 * status, Symposium day, Dietary, Accessibility, Checked in,
 * Registered at, QR token. Empty cells render as "".
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const COLUMNS = [
  "Email",
  "Name",
  "Attendee type",
  "Registration status",
  "Payment status",
  "Includes symposium day",
  "Dietary restrictions",
  "Accessibility needs",
  "Checked in",
  "Registered at",
  "QR token",
];

/** Minimal CSV cell escape. RFC 4180: wrap in double quotes if the
 *  cell contains a comma, double quote, or newline; double any
 *  embedded quotes. */
function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slug } = await ctx.params;
  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const registrations = await prisma.registration.findMany({
    where: { eventId: event.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = registrations.map((r) => [
    csvEscape(r.user.email),
    csvEscape(r.user.name),
    csvEscape(r.attendeeType),
    csvEscape(r.registrationStatus),
    csvEscape(r.paymentStatus),
    csvEscape(r.includesSymposiumDay ? "yes" : "no"),
    csvEscape(r.dietaryRestrictions),
    csvEscape(r.accessibilityNeeds),
    csvEscape(r.checkedInAt ? r.checkedInAt.toISOString() : ""),
    csvEscape(r.createdAt.toISOString()),
    csvEscape(r.qrToken),
  ].join(","));

  const csv = [COLUMNS.map(csvEscape).join(","), ...rows].join("\r\n") + "\r\n";

  // Strip non-filename-safe chars from the slug so older browsers
  // don't refuse the download. Slugs are kebab-case so this is
  // usually a no-op but defensive.
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-");
  const filename = `${safeSlug}-registrations-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
