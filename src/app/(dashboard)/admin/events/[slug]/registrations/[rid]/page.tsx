import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, User, Mail, Calendar, CheckCircle2, Ticket, Clock, MapPin, Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationEditor } from "@/components/admin/events/RegistrationEditor";
import { AttendeeWorkshopManager, type WorkshopOptionAdmin, type BookingRowAdmin } from "@/components/admin/events/AttendeeWorkshopManager";
import { AttendeeActions } from "@/components/admin/events/AttendeeActions";

/**
 * /admin/events/[slug]/registrations/[rid] — full per-attendee admin
 * dossier.
 *
 * Three working surfaces:
 *   1. Header — identity (name/email/role), status chip, top-level
 *      actions (check-in toggle, cancel/reinstate, resend email).
 *   2. RegistrationEditor — inline-saves edits to every editable
 *      Registration field via PATCH.
 *   3. AttendeeWorkshopManager — list of the attendee's workshop
 *      bookings + a "Book another workshop" picker so admins can
 *      book / cancel on their behalf without leaving the page.
 *
 * QR token is shown but masked by default — clicking reveals it.
 * Useful when an attendee can't open their email but admin can
 * read it out at the door.
 */
export default async function AdminAttendeeDetailPage({
  params,
}: {
  params: Promise<{ slug: string; rid: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { slug, rid } = await params;

  const event = await prisma.bhnEvent.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, timezone: true, startDate: true, endDate: true },
  });
  if (!event) notFound();

  const registration = await prisma.registration.findUnique({
    where: { id: rid },
    include: {
      user: { select: { id: true, email: true, name: true, role: true, organization: true } },
    },
  });
  if (!registration || registration.eventId !== event.id) notFound();

  // Workshops the attendee currently has (any non-cancelled
  // booking), plus the full list of available workshops they could
  // still book (filtered to the event, active only).
  // Guest registrations (userId === null) can't book workshops, so
  // we skip the bookings query for them — workshop slots require a
  // User row at the booking-service layer.
  const isGuestReg = registration.userId === null;
  const [bookings, allWorkshops] = await Promise.all([
    isGuestReg
      ? Promise.resolve(
          [] as Array<{
            id: string;
            status: string;
            waitlistPosition: number | null;
            bookedAt: Date;
            workshop: {
              id: string; title: string; kind: string;
              partnerOrganization: string | null;
              startDateTime: Date; endDateTime: Date;
              locationName: string | null;
              capacity: number;
            };
          }>,
        )
      : prisma.workshopBooking.findMany({
          where: {
            userId: registration.userId!,
            workshop: { eventId: event.id },
          },
          include: {
            workshop: {
              select: {
                id: true, title: true, kind: true, partnerOrganization: true,
                startDateTime: true, endDateTime: true, locationName: true,
                capacity: true,
              },
            },
          },
          orderBy: { bookedAt: "desc" },
        }),
    prisma.workshop.findMany({
      where: { eventId: event.id, isActive: true },
      orderBy: [{ startDateTime: "asc" }, { displayOrder: "asc" }],
      select: {
        id: true, title: true, kind: true, partnerOrganization: true,
        startDateTime: true, endDateTime: true, locationName: true,
        capacity: true,
      },
    }),
  ]);

  // Confirmed counts so the "book another" picker shows live capacity.
  const counts = await prisma.workshopBooking.groupBy({
    by: ["workshopId", "status"],
    where: { workshop: { eventId: event.id }, status: { not: "cancelled" } },
    _count: { _all: true },
  });
  const countLookup = new Map<string, { confirmed: number; waitlist: number }>();
  for (const w of allWorkshops) countLookup.set(w.id, { confirmed: 0, waitlist: 0 });
  for (const c of counts) {
    const entry = countLookup.get(c.workshopId);
    if (!entry) continue;
    if (c.status === "confirmed") entry.confirmed = c._count._all;
    else if (c.status === "waitlist") entry.waitlist = c._count._all;
  }

  const bookingRows: BookingRowAdmin[] = bookings.map((b) => ({
    id: b.id,
    workshopId: b.workshop.id,
    title: b.workshop.title,
    kind: b.workshop.kind,
    partnerOrganization: b.workshop.partnerOrganization,
    locationName: b.workshop.locationName,
    timeLabel: formatTimeRange(b.workshop.startDateTime, b.workshop.endDateTime, event.timezone),
    status: b.status as "pending" | "confirmed" | "waitlist" | "cancelled",
    waitlistPosition: b.waitlistPosition,
    bookedAt: b.bookedAt.toISOString(),
  }));

  const activeBookedIds = new Set(
    bookings.filter((b) => b.status !== "cancelled").map((b) => b.workshop.id),
  );

  const workshopOptions: WorkshopOptionAdmin[] = allWorkshops
    .filter((w) => !activeBookedIds.has(w.id))
    .map((w) => {
      const c = countLookup.get(w.id) ?? { confirmed: 0, waitlist: 0 };
      return {
        id: w.id,
        title: w.title,
        kind: w.kind,
        partnerOrganization: w.partnerOrganization,
        locationName: w.locationName,
        timeLabel: formatTimeRange(w.startDateTime, w.endDateTime, event.timezone),
        capacity: w.capacity,
        confirmedCount: c.confirmed,
        waitlistCount: c.waitlist,
      };
    });

  // Personal-agenda picks (symposium-day breakouts). Same guest-skip
  // rationale as workshop bookings — agenda picks need a User row.
  const agendaEntries = isGuestReg
    ? []
    : await prisma.personalAgendaEntry.findMany({
        where: { userId: registration.userId!, session: { eventId: event.id } },
        include: { session: { select: { id: true, title: true, startTime: true, endTime: true } } },
        orderBy: { session: { startTime: "asc" } },
      });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href={`/admin/events/${slug}/registrations`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> All registrations
      </Link>

      <header className="flex flex-wrap items-start gap-4 justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
            Admin · {event.title}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight mt-1 inline-flex items-center gap-2 flex-wrap">
            <User size={22} className="text-brand-600" />
            {(registration.user?.name ?? registration.guestName) || (
              <span className="italic text-muted">No name</span>
            )}
            <RegStatusChip status={registration.registrationStatus} />
            {isGuestReg && (
              <span
                className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200"
                title="Registered as a guest without a platform account"
              >
                Guest
              </span>
            )}
            {registration.checkedInAt && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 gap-1">
                <CheckCircle2 size={11} /> Checked in
              </span>
            )}
          </h1>
          <p className="text-sm text-muted mt-2 inline-flex items-center gap-2">
            <Mail size={12} />
            {(() => {
              const email = registration.user?.email ?? registration.guestEmail;
              return email ? (
                <a href={`mailto:${email}`} className="hover:text-fg">
                  {email}
                </a>
              ) : (
                <span className="italic text-muted">No email</span>
              );
            })()}
          </p>
          {(registration.user?.organization || registration.guestOrganization) && (
            <p className="text-xs text-muted mt-0.5">
              {registration.user?.organization ?? registration.guestOrganization}
              {registration.user?.role && (
                <> · role: <span className="font-mono">{registration.user.role}</span></>
              )}
            </p>
          )}
        </div>

        <AttendeeActions
          slug={slug}
          registrationId={registration.id}
          attendeeName={
            registration.user?.name ??
            registration.user?.email ??
            registration.guestName ??
            registration.guestEmail ??
            "Attendee"
          }
          initialCheckedInAt={registration.checkedInAt?.toISOString() ?? null}
          initialStatus={registration.registrationStatus as "pending" | "confirmed" | "cancelled"}
        />
      </header>

      {/* Event basics — read-only context */}
      <section className="rounded-2xl border border-line bg-card p-4 surface-shadow grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Meta icon={Calendar} label="Event">
          {formatEventRange(event.startDate, event.endDate, event.timezone)}
        </Meta>
        <Meta icon={Ticket} label="QR token">
          <code className="font-mono text-fg">{registration.qrToken}</code>
        </Meta>
        <Meta icon={Calendar} label="Registered">
          {registration.createdAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: event.timezone })}
        </Meta>
        <Meta icon={Calendar} label="Last updated">
          {registration.updatedAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: event.timezone })}
        </Meta>
      </section>

      {/* Editor */}
      <RegistrationEditor
        slug={slug}
        registrationId={registration.id}
        initial={{
          attendeeType: registration.attendeeType as never,
          registrationStatus: registration.registrationStatus as never,
          paymentStatus: registration.paymentStatus as never,
          includesSymposiumDay: registration.includesSymposiumDay,
          dietaryRestrictions: registration.dietaryRestrictions ?? "",
          accessibilityNeeds: registration.accessibilityNeeds ?? "",
          adminNote: registration.adminNote ?? "",
        }}
      />

      {/* Workshop management */}
      <AttendeeWorkshopManager
        slug={slug}
        registrationId={registration.id}
        currentBookings={bookingRows}
        availableWorkshops={workshopOptions}
      />

      {/* Symposium breakout picks (read-only — managed by attendee) */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-subtle mb-3">
          Symposium-day picks
        </h2>
        {agendaEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-xs text-muted">
            No breakouts picked yet. Attendee can pick from /events/{slug}/me.
          </div>
        ) : (
          <ul className="rounded-2xl border border-line bg-card divide-y divide-line">
            {agendaEntries.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                <span className="font-semibold text-fg">{a.session.title}</span>
                <span className="text-xs text-muted font-mono">
                  {a.session.startTime.toLocaleTimeString("en-CA", {
                    hour: "numeric", minute: "2-digit", hour12: true, timeZone: event.timezone,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({
  icon: Icon, label, children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-subtle">
        <Icon size={11} /> {label}
      </div>
      <div className="text-fg mt-0.5 break-words">{children}</div>
    </div>
  );
}

function RegStatusChip({ status }: { status: string }) {
  const tints: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 ring-amber-200",
    confirmed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[status] ?? tints.pending}`}
    >
      {status}
    </span>
  );
}

function formatTimeRange(start: Date, end: Date, timeZone: string): string {
  const sameDay =
    start.toLocaleDateString("en-CA", { timeZone }) ===
    end.toLocaleDateString("en-CA", { timeZone });
  const t = (d: Date) =>
    d.toLocaleTimeString("en-CA", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone,
    });
  const dShort = (d: Date) =>
    d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone });
  if (sameDay) return `${dShort(start)} · ${t(start)}–${t(end)}`;
  return `${dShort(start)} – ${dShort(end)}`;
}

function formatEventRange(start: Date, end: Date, timeZone: string): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone });
  const year = end.toLocaleDateString("en-CA", { year: "numeric", timeZone });
  if (fmt(start) === fmt(end)) return `${fmt(start)}, ${year}`;
  return `${fmt(start)}–${fmt(end).replace(/^[A-Za-z]+\s+/, "")}, ${year}`;
}
