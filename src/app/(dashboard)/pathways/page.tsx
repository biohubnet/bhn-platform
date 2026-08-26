import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Layers, Users, ClipboardList, Check, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHero } from "@/components/ui/PageHero";
import { EditableText } from "@/components/cms/EditableText";
import { getCopy } from "@/lib/copy";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";
import { ensureRegisteredForms } from "@/lib/forms/registry";
import { pathwayWindowFrom } from "@/lib/pathway-enrollment";
import {
  PathwayAccordion,
  type PathwayEntry,
} from "@/components/engage/PathwayAccordion";
import {
  AdvisorBooking,
  type AdvisorSlot,
  type AdvisorBookingState,
} from "@/components/engage/AdvisorBooking";

interface PathwayRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  thumbnail: string | null;
  /** Optional colour / gradient wash stamped from /admin/cover-art. */
  thumbnailOverlay: unknown;
  /** Enrolment-window config — drives the Open / Closed / Full pill. */
  enrollmentStatus: string;
  enrollmentOpensAt: Date | null;
  enrollmentClosesAt: Date | null;
  capacity: number | null;
  _count: { courses: number; enrollments: number };
  courses: {
    course: {
      id: string;
      title: string;
      provider: string | null;
      delivery: string | null;
      creditCost: number;
      sessionDates: string | null;
      enrollByDate: Date | null;
      status: string;
    };
  }[];
}

export default async function PathwaysPage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "user";
  const userId = (session!.user as { id?: string }).id!;
  const isStaff = checkIsStaff(role);

  // Forms with their own home elsewhere shouldn't repeat on Pathways.
  // (Talent Application lives under EXPERIENCE in the sidebar.)
  const FORMS_HIDDEN_FROM_PATHWAYS = ["talent-application"];
  const pathwaysSubtitleDefault = "Stack of courses that ladder up to a single certificate, plus open registrations for live programmes. Pick something to build toward.";

  // First-time deploys won't have any EventForm rows; auto-provision
  // the registered seeds so the cards show up without needing to visit
  // each /forms/[slug] URL individually first.
  //
  // Deliberately awaited BEFORE the fan-out rather than inside it: the
  // form listing below must see rows this may have just created. Run in
  // parallel, the first render after a new seed ships would list the
  // form set from a moment earlier and only show the new one on refresh.
  // One round trip is worth more than that inconsistency.
  await ensureRegisteredForms();

  // Everything below is mutually independent — each derives only from
  // userId or isStaff, both known above — so it goes out as ONE round
  // trip instead of seven. These were sequential `await` statements,
  // serialised purely by statement order rather than by any real data
  // dependency. The database executes this whole page in ~2.6ms; the
  // cost was always the waiting, not the querying.
  const [
    pathways, approvedRows, myEnrollments, formRows, mySubmissionRows, courses,
    pathwaysSubtitle, advisorRows, myAdvisorBooking,
  ] = await Promise.all([
      prisma.pathway.findMany({
        where: isStaff ? {} : { status: "published" },
        include: {
          _count: { select: { courses: true, enrollments: true } },
          // The cohort programmes shown when a pathway is expanded.
          courses: {
            orderBy: { order: "asc" },
            select: {
              course: {
                select: {
                  id: true, title: true, provider: true, delivery: true,
                  creditCost: true, sessionDates: true, enrollByDate: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }) as Promise<PathwayRow[]>,
      // Approved/completed counts for every pathway in ONE grouped query.
      // resolvePathwayWindow() would be a query per card here;
      // pathwayWindowFrom() applies the identical rules to rows we already have.
      prisma.pathwayEnrollment.groupBy({
        by: ["pathwayId"],
        where: { status: { in: ["approved", "completed"] } },
        _count: { _all: true },
      }),
      prisma.pathwayEnrollment.findMany({
        where: { userId },
        select: { pathwayId: true, status: true },
      }),
      // Registration forms — listed alongside pathways. Inactive forms are
      // staff-only so users don't try to submit something already closed.
      prisma.eventForm.findMany({
        where: {
          ...(isStaff ? {} : { active: true }),
          slug: { notIn: FORMS_HIDDEN_FROM_PATHWAYS },
        },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          active: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Fetched for the user rather than for this page's form ids, so it
      // no longer has to wait on formRows. One person's submissions are a
      // handful of rows; narrowing them in memory below is free, and it
      // buys the whole page a round trip.
      prisma.eventFormSubmission.findMany({
        where: { userId },
        select: { formId: true },
      }),
      // For staff: list of all published courses to attach to pathways
      isStaff
        ? prisma.course.findMany({
            select: { id: true, title: true, category: true },
            orderBy: { title: "asc" },
          })
        : Promise.resolve([]),
      getCopy("pathways.subtitle", pathwaysSubtitleDefault),
      // Advisor slots: open, not yet started, with room left.
      prisma.advisorSession.findMany({
        where: { status: "open", startsAt: { gt: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 24,
        select: {
          id: true,
          advisorName: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          location: true,
          _count: { select: { bookings: { where: { status: "booked" } } } },
        },
      }),
      prisma.advisorBooking.findFirst({
        where: { userId, status: "booked", session: { startsAt: { gt: new Date() } } },
        orderBy: { session: { startsAt: "asc" } },
        select: {
          id: true,
          session: {
            select: { startsAt: true, advisorName: true, location: true },
          },
        },
      }),
    ]);

  const approvedByPathway = new Map(
    approvedRows.map((r) => [r.pathwayId, r._count._all]),
  );
  const nowForWindows = new Date();
  const enrollmentMap = new Map(myEnrollments.map((e) => [e.pathwayId, e.status]));

  const advisorDay = new Intl.DateTimeFormat("en-CA", {
    weekday: "short", month: "short", day: "numeric", timeZone: "America/Toronto",
  });
  const advisorTime = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric", minute: "2-digit", timeZone: "America/Toronto",
  });

  const advisorSlots: AdvisorSlot[] = advisorRows
    .filter((r) => r._count.bookings < r.capacity)
    .map((r) => ({
      id: r.id,
      advisorName: r.advisorName,
      startsAtISO: r.startsAt.toISOString(),
      dayLabel: advisorDay.format(r.startsAt),
      timeLabel: advisorTime.format(r.startsAt),
      minutes: Math.max(1, Math.round((r.endsAt.getTime() - r.startsAt.getTime()) / 60000)),
      location: r.location,
      seatsLeft: r.capacity - r._count.bookings,
    }));

  const advisorBookingState: AdvisorBookingState | null = myAdvisorBooking
    ? {
        bookingId: myAdvisorBooking.id,
        dayLabel: advisorDay.format(myAdvisorBooking.session.startsAt),
        timeLabel: advisorTime.format(myAdvisorBooking.session.startsAt),
        advisorName: myAdvisorBooking.session.advisorName,
        location: myAdvisorBooking.session.location,
      }
    : null;

  // Formatted server-side so a date cannot render differently after
  // hydration in another timezone.
  const enrollByFmt = new Intl.DateTimeFormat("en-CA", {
    month: "long", day: "numeric", year: "numeric", timeZone: "America/Toronto",
  });

  const pathwayEntries: PathwayEntry[] = pathways.map((p) => {
    const w = pathwayWindowFrom(p, approvedByPathway.get(p.id) ?? 0, nowForWindows);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      windowLabel: w.state === "open" ? "Open" : w.state === "full" ? "Full" : "Closed",
      windowTone: w.state,
      myStatus: enrollmentMap.get(p.id) ?? null,
      programmes: p.courses.map(({ course }) => ({
        id: course.id,
        title: course.title,
        provider: course.provider,
        delivery: course.delivery,
        creditCost: course.creditCost,
        sessionDates: course.sessionDates,
        enrollByLabel: course.enrollByDate ? enrollByFmt.format(course.enrollByDate) : null,
        // A programme is archived when its own intake has closed, which is
        // independent of whether its pathway is still accepting people.
        isOpen: course.status === "published",
      })),
    };
  });

  const formIds = new Set(formRows.map((f) => f.id));
  const submittedFormIds = new Set(
    mySubmissionRows.map((s) => s.formId).filter((id) => formIds.has(id)),
  );

  return (
    <div>
      <PageHero
        eyebrow={<><Layers size={11} /> Training programmes</>}
        title="Pathways and registrations"
        description={
          <EditableText copyKey="pathways.subtitle" defaultText={pathwaysSubtitle} isStaff={isStaff} />
        }
        actions={isStaff ? <PathwayManageButton mode="create" courses={courses} /> : null}
      />

      {pathways.length === 0 && formRows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Layers size={20} />
          </div>
          <p className="font-medium text-muted">No pathways yet</p>
          <p className="text-sm text-muted mt-1">
            {isStaff ? "Create your first pathway to bundle courses into a certified curriculum." : "Check back soon — pathways are coming."}
          </p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="grid grid-cols-1 gap-5">
          {formRows.map((f) => {
            const submitted = submittedFormIds.has(f.id);
            return (
              <Link
                key={`form-${f.id}`}
                href={`/forms/${f.slug}`}
                className="group bg-card rounded-2xl border border-line hover:border-teal-300 hover:shadow-md transition-all overflow-hidden flex min-h-[180px]"
              >
                {/* Hero panel — full card height */}
                <div className="w-72 shrink-0 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 relative overflow-hidden hidden sm:block">
                  <ClipboardList className="absolute top-5 right-5 text-white/40 z-10 drop-shadow" size={56} />
                  <span className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.18em] font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 px-2 py-1 rounded">
                    Registration
                  </span>
                </div>
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle mb-1.5">
                        Event registration
                      </p>
                      <h3 className="font-semibold text-fg text-lg leading-tight group-hover:text-teal-700 transition-colors">
                        {f.title}
                      </h3>
                    </div>
                    {submitted ? (
                      <Badge tone="success">
                        <Check size={11} className="mr-0.5" /> Submitted
                      </Badge>
                    ) : isStaff && !f.active ? (
                      <Badge tone="warning">Inactive</Badge>
                    ) : null}
                  </div>
                  {f.description && (
                    <p className="text-sm text-muted line-clamp-3 mb-3 leading-relaxed">{f.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><ClipboardList size={12} /> Form</span>
                    {isStaff && (
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {f._count.submissions} responses</span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open form <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          <PathwayAccordion pathways={pathwayEntries} />
        </div>
        <AdvisorBooking
          slots={advisorSlots}
          existing={advisorBookingState}
          className="mt-5 lg:mt-0 lg:sticky lg:top-6"
        />
        </div>
      )}
    </div>
  );
}
