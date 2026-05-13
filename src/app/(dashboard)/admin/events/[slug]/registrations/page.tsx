import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Download, Ticket, CheckCircle2, Hourglass } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationsTable, type RegistrationRow } from "@/components/admin/events/RegistrationsTable";

/**
 * /admin/events/[slug]/registrations — attendee list with check-in
 * toggle + CSV export.
 *
 * Phase 1 keeps this server-rendered + a thin client table:
 *   • SSR loads every registration (Phase-1 events are sub-1000
 *     attendees; pagination is overkill).
 *   • Client component owns search + filter + the optimistic
 *     check-in toggle that POSTs
 *     /api/admin/events/[slug]/registrations/[rid]/check-in.
 *   • CSV link is just a plain <a download> hitting the
 *     /registrations.csv route — the browser handles the download.
 */
export default async function AdminEventRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { slug } = await params;

  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, title: true, timezone: true },
  });
  if (!event) notFound();

  const registrations = await prisma.registration.findMany({
    where: { eventId: event.id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows: RegistrationRow[] = registrations.map((r) => ({
    id: r.id,
    name: r.user.name,
    email: r.user.email,
    attendeeType: r.attendeeType,
    registrationStatus: r.registrationStatus,
    paymentStatus: r.paymentStatus,
    includesSymposiumDay: r.includesSymposiumDay,
    dietaryRestrictions: r.dietaryRestrictions,
    accessibilityNeeds: r.accessibilityNeeds,
    adminNote: r.adminNote,
    checkedInAt: r.checkedInAt ? r.checkedInAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  const checkedInCount = rows.filter((r) => r.checkedInAt !== null).length;
  const confirmedCount = rows.filter((r) => r.registrationStatus === "confirmed").length;
  const pendingCount = rows.filter((r) => r.registrationStatus === "pending").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href={`/admin/events/${slug}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> {event.title}
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Admin · {event.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
            <Ticket size={22} className="text-brand-600" />
            Registrations
          </h1>
          <p className="text-sm text-muted mt-2 leading-snug max-w-2xl">
            Every attendee for this event. Tap the check-in button on
            event day, or use the bulk CSV export for badge printing,
            catering, and accessibility handoff.
          </p>
        </div>

        <a
          href={`/api/admin/events/${slug}/registrations.csv`}
          download
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-bold text-fg hover:border-brand-300"
        >
          <Download size={14} />
          Download CSV
        </a>
      </header>

      <div className="flex flex-wrap gap-3">
        <Stat label="Total" value={rows.length} />
        <Stat
          label="Pending approval"
          value={pendingCount}
          accent={pendingCount > 0}
          icon={<Hourglass size={12} className="text-violet-700" />}
        />
        <Stat label="Confirmed" value={confirmedCount} />
        <Stat
          label="Checked in"
          value={checkedInCount}
          accent={checkedInCount > 0}
          icon={<CheckCircle2 size={12} className="text-emerald-700" />}
        />
      </div>

      <RegistrationsTable slug={slug} rows={rows} />
    </div>
  );
}

function Stat({
  label, value, accent, icon,
}: {
  label: string;
  value: number;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-2 inline-flex items-center gap-2">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</span>
      <span className={`text-base font-bold tabular-nums ${accent ? "text-emerald-700" : "text-fg"}`}>
        {value}
      </span>
    </div>
  );
}
