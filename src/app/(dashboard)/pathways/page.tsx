import { getSession, isStaff as checkIsStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExternalLink, Layers } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { EditableText } from "@/components/cms/EditableText";
import { getCopy } from "@/lib/copy";
import { PathwayManageButton } from "@/components/lms/PathwayManageButton";
import { pathwayWindowFrom } from "@/lib/pathway-enrollment";
import {
  PathwayAccordion,
  type PathwayEntry,
} from "@/components/engage/PathwayAccordion";

/** Course-selection calls are booked in Calendly, not on the platform. */
const COURSE_SELECTION_CALENDLY = "https://calendly.com/epshita-islam-utoronto/biohubnet-course-selection";

interface PathwayRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  thumbnail: string | null;
  /** Identity colour for this pathway, as a hex literal. */
  accentColor: string | null;
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
      cohortStartDate: Date | null;
      status: string;
    };
  }[];
}

export default async function PathwaysPage() {
  const session = await getSession();
  const role = (session!.user as { role?: string }).role ?? "user";
  const userId = (session!.user as { id?: string }).id!;
  const isStaff = checkIsStaff(role);

  // Transcribed from the current platform, which carries this as a two-paragraph
  // description block above the pathway list. House spelling applied
  // ("programmes") so it reads with the rest of the platform.
  const pathwaysSubtitleDefault =
    "BioHubNet's curated learning pathways are structured programmes that combine expert-led training, on-demand courses, professional development support and connections. Each pathway is designed to help you build job-ready skills for specific roles in Canada's Life Sciences sector. Other programmes consist of microcredentials and workshops to help you build in-demand and specialised skills.";


  // Everything below is mutually independent — each derives only from
  // userId or isStaff, both known above — so it goes out as ONE round
  // trip instead of seven. These were sequential `await` statements,
  // serialised purely by statement order rather than by any real data
  // dependency. The database executes this whole page in ~2.6ms; the
  // cost was always the waiting, not the querying.
  const [
    pathways, approvedRows, myEnrollments, courses, pathwaysSubtitle,
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
                  cohortStartDate: true, status: true,
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
      // For staff: list of all published courses to attach to pathways
      isStaff
        ? prisma.course.findMany({
            select: { id: true, title: true, category: true },
            orderBy: { title: "asc" },
          })
        : Promise.resolve([]),
      getCopy("pathways.subtitle", pathwaysSubtitleDefault),
    ]);

  const approvedByPathway = new Map(
    approvedRows.map((r) => [r.pathwayId, r._count._all]),
  );
  const nowForWindows = new Date();
  const enrollmentMap = new Map(myEnrollments.map((e) => [e.pathwayId, e.status]));

  // Formatted server-side so a date cannot render differently after
  // hydration in another timezone.
  const enrollByFmt = new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", year: "numeric", timeZone: "America/Toronto",
  });
  // The start date leads each programme row, so it is deliberately short —
  // "21 Oct" rather than the full date the deadline uses underneath it.
  const startsFmt = new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", timeZone: "America/Toronto",
  });
  // Days-to-deadline is computed HERE, not in the component. The row turns
  // urgent inside a week, and a client-side clock would make that flip
  // between the server render and hydration for anyone whose machine clock
  // or timezone puts them on the other side of the boundary.
  const daysUntil = (d: Date | null): number | null =>
    d === null ? null : Math.ceil((d.getTime() - nowForWindows.getTime()) / 86_400_000);

  const pathwayEntries: PathwayEntry[] = pathways.map((p) => {
    const w = pathwayWindowFrom(p, approvedByPathway.get(p.id) ?? 0, nowForWindows);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      windowLabel: w.state === "open" ? "Open" : w.state === "full" ? "Full" : "Closed",
      windowTone: w.state,
      thumbnail: p.thumbnail,
      accentColor: p.accentColor,
      myStatus: enrollmentMap.get(p.id) ?? null,
      programmes: p.courses.map(({ course }) => ({
        id: course.id,
        title: course.title,
        provider: course.provider,
        delivery: course.delivery,
        creditCost: course.creditCost,
        sessionDates: course.sessionDates,
        enrollByLabel: course.enrollByDate ? enrollByFmt.format(course.enrollByDate) : null,
        daysToEnrollBy: daysUntil(course.enrollByDate),
        startsLabel: course.cohortStartDate ? startsFmt.format(course.cohortStartDate) : null,
        // A programme is archived when its own intake has closed, which is
        // independent of whether its pathway is still accepting people.
        isOpen: course.status === "published",
      })),
    };
  });


  return (
    <div>
      <PageHero
        eyebrow={<><Layers size={12} /> ENGAGE</>}
        title="Curated Learning Pathways, Microcredentials &amp; Workshops"
        description={
          <EditableText copyKey="pathways.subtitle" defaultText={pathwaysSubtitle} isStaff={isStaff} />
        }
        actions={isStaff ? <PathwayManageButton mode="create" courses={courses} /> : null}
      />

      {pathways.length === 0 ? (
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
        /* Pathways on the left, the booking calendar on the right from xl.
           The rail is 360px so Calendly (minimum 320px) gets its full width:
           the calendar runs edge to edge inside the card, with no padding
           eating into it. Below xl the two stack, list first, which also
           keeps the list from being squeezed on 1024-1279px screens. Not
           sticky: the calendar is taller than many screens, and a sticky
           element taller than the viewport hides its own bottom. */
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="grid min-w-0 grid-cols-1 gap-5">
            <PathwayAccordion pathways={pathwayEntries} />
          </div>

          <aside
            id="book-a-call"
            aria-labelledby="book-a-call-title"
            className="overflow-hidden rounded-2xl border border-line bg-card"
          >
            <div className="px-5 pt-5 pb-3">
              <p id="book-a-call-title" className="text-[12px] uppercase tracking-[0.2em] font-bold text-subtle">
                Need help choosing?
              </p>
              <p className="mt-2 text-pretty text-sm text-muted leading-relaxed">
                Book a course-selection call with BioHubNet. Pick a time that suits you and we&apos;ll help
                you match a pathway to where you want your career to go.
              </p>
            </div>
            <iframe
              src={`${COURSE_SELECTION_CALENDLY}?hide_event_type_details=1&hide_gdpr_banner=0&embed_type=Inline`}
              title="Book a course-selection call with BioHubNet"
              loading="lazy"
              className="block h-[42rem] w-full border-y border-line bg-card"
            />
            <p className="px-5 py-3 text-pretty text-[11.5px] text-subtle">
              The calendar is Calendly&apos;s and sets its own cookies.{" "}
              <a
                href={COURSE_SELECTION_CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                Open it in a new tab <ExternalLink size={11} aria-hidden />
              </a>
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
