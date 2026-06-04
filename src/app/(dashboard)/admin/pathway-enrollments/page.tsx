import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PathwayEnrollmentDecideButtons } from "@/components/admin/PathwayEnrollmentDecideButtons";
import { AttendanceToggle } from "@/components/admin/AttendanceToggle";
import { DemoPhantomTray, type DemoScenario } from "@/components/admin/DemoPhantomTray";

/** Form slugs that admins reach for on the pathway-enrollment surface
 *  rather than the per-form admin page. These render alongside real
 *  PathwayEnrollment rows so an admin reviewing "who's signed up for
 *  what" doesn't have to bounce between /admin/pathway-enrollments
 *  and /admin/forms/[slug] to find them. Today this is just the OBIO
 *  Entrepreneurship Bootcamp — it's modelled as an `EventFormSubmission`
 *  (the form lives at /forms/obio-bootcamp) rather than a Pathway, but
 *  admins think of it as a pathway-equivalent commitment, so it surfaces
 *  here too. */
const PATHWAY_LIKE_FORM_SLUGS = ["obio-bootcamp"] as const;

interface Row {
  id: string;
  pathwayId: string;
  status: string;
  requestReason: string | null;
  reviewerNote: string | null;
  enrolledAt: Date;
  approvedAt: Date | null;
  reviewedAt: Date | null;
  attended: boolean;
  sessionsAttended: number;
  pathway: { id: string; title: string; capacity: number | null };
  user: { id: string; name: string | null; email: string; organization: string | null; jobTitle: string | null };
}

interface FormSubmissionRow {
  id: string;
  formSlug: string;
  formTitle: string;
  submittedAt: Date;
  user: { name: string | null; email: string; organization: string | null; jobTitle: string | null };
}

export default async function AdminPathwayEnrollmentsPage({ searchParams }: { searchParams: Promise<{ pathwayId?: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const sp = await searchParams;

  const where = sp.pathwayId ? { pathwayId: sp.pathwayId } : {};
  const enrolls = await prisma.pathwayEnrollment.findMany({
    where,
    include: { pathway: { select: { id: true, title: true, capacity: true } } },
    orderBy: { enrolledAt: "asc" },
    take: 500,
  });
  const userIds = enrolls.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, organization: true, jobTitle: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows: Row[] = enrolls.map((e) => ({
    id: e.id,
    pathwayId: e.pathwayId,
    status: e.status,
    requestReason: e.requestReason,
    reviewerNote: e.reviewerNote,
    enrolledAt: e.enrolledAt,
    approvedAt: e.approvedAt,
    reviewedAt: e.reviewedAt,
    attended: e.attended,
    sessionsAttended: e.sessionsAttended,
    pathway: e.pathway,
    user: userMap.get(e.userId) ?? { id: "", name: null, email: "—", organization: null, jobTitle: null },
  }));

  // Count of approved enrollments per pathway, for capacity-aware copy
  const approvedCounts = await prisma.pathwayEnrollment.groupBy({
    by: ["pathwayId"],
    where: { status: { in: ["approved", "completed"] } },
    _count: { _all: true },
  });
  const approvedMap = new Map(approvedCounts.map((c) => [c.pathwayId, c._count._all]));

  const pendingRows  = rows.filter((r) => r.status === "pending");
  const waitlistRows = rows.filter((r) => r.status === "waitlisted");
  const approvedRows = rows.filter((r) => r.status === "approved");
  const completedRows= rows.filter((r) => r.status === "completed");
  const rejectedRows = rows.filter((r) => r.status === "rejected");

  // Distinct pathways for filter
  const pathwayList = await prisma.pathway.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  // Form-based "pathway-like" registrations. Skipped entirely when a
  // specific pathway is selected via the filter pill — those forms
  // aren't tied to a Pathway entity, so filtering to a specific
  // pathwayId would always render the section empty.
  let formSubmissionRows: FormSubmissionRow[] = [];
  if (!sp.pathwayId) {
    const eventForms = await prisma.eventForm.findMany({
      where: { slug: { in: [...PATHWAY_LIKE_FORM_SLUGS] } },
      select: { id: true, slug: true, title: true },
    });
    if (eventForms.length > 0) {
      const formMeta = new Map(eventForms.map((f) => [f.id, { slug: f.slug, title: f.title }]));
      const subs = await prisma.eventFormSubmission.findMany({
        where: { formId: { in: eventForms.map((f) => f.id) } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          formId: true,
          createdAt: true,
          email: true,
          userId: true,
        },
      });
      const subUserIds = subs.map((s) => s.userId).filter((id): id is string => !!id);
      const subUsers = subUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: subUserIds } },
            select: { id: true, name: true, email: true, organization: true, jobTitle: true },
          })
        : [];
      const subUserMap = new Map(subUsers.map((u) => [u.id, u]));
      formSubmissionRows = subs.map((s) => {
        const u = s.userId ? subUserMap.get(s.userId) : undefined;
        const meta = formMeta.get(s.formId) ?? { slug: "?", title: "?" };
        return {
          id: s.id,
          formSlug: meta.slug,
          formTitle: meta.title,
          submittedAt: s.createdAt,
          user: u
            ? { name: u.name, email: u.email, organization: u.organization, jobTitle: u.jobTitle }
            : { name: null, email: s.email ?? "—", organization: null, jobTitle: null },
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pathway enrollments"
        description="Review trainee requests, manage waitlists, and adjust per-pathway enrollment policy."
      />

      {/* Pathway filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/pathway-enrollments"
          className={
            "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors " +
            (!sp.pathwayId
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-card text-muted border-line hover:border-line-strong")
          }
        >
          All pathways <span className="ml-1.5 opacity-60">{rows.length}</span>
        </Link>
        {pathwayList.map((p) => (
          <Link
            key={p.id}
            href={`/admin/pathway-enrollments?pathwayId=${p.id}`}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors truncate max-w-xs " +
              (sp.pathwayId === p.id
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-card text-muted border-line hover:border-line-strong")
            }
          >
            {p.title}
          </Link>
        ))}
      </div>

      {/* Form-based registrations — surfaces submissions to
          PATHWAY_LIKE_FORM_SLUGS (currently just OBIO bootcamp).
          Sits above the PathwayEnrollment sections because admins
          asked for it after losing track of where bootcamp
          registrations were landing — they aren't PathwayEnrollment
          rows but they ARE pathway-equivalent commitments from the
          admin's point of view. Hidden when the filter pill narrows
          to a specific pathway. */}
      <FormSubmissionsSection rows={formSubmissionRows} />

      {/* Sections */}
      <Section title="Pending review"      tone="amber"   rows={pendingRows}   approvedMap={approvedMap} showQueuePosition={false} />
      <Section title="Waitlist"            tone="warning" rows={waitlistRows}  approvedMap={approvedMap} showQueuePosition />
      <Section title="Approved · in pathway" tone="brand" rows={approvedRows}  approvedMap={approvedMap} showQueuePosition={false} showAttendance />
      <Section title="Completed"           tone="success" rows={completedRows} approvedMap={approvedMap} showQueuePosition={false} showAttendance />
      <Section title="Rejected · withdrawn" tone="neutral" rows={rejectedRows} approvedMap={approvedMap} showQueuePosition={false} />

      {/* Demo controls — same pattern as the /admin/enrollments dashboard.
          Spawns phantoms with pending pathway-enrollment requests so this
          page has something to show during a walkthrough. */}
      <DemoPhantomTray
        scenarios={[
          {
            kind: "pathway_enrollment_request",
            label: pathwayList.length === 0
              ? "Pending pathway request (no published pathways yet)"
              : "Pending pathway request",
            options: pathwayList.map((p) => ({ id: p.id, label: p.title })),
          } satisfies DemoScenario,
        ]}
        contextLabel="pathway requests"
      />
    </div>
  );
}

/** Form-based registrations (e.g. OBIO bootcamp). Same Card shell
 *  as the PathwayEnrollment sections so the two read as one
 *  surface; columns trimmed for the simpler data model
 *  (no Reason/Reviewer note, no per-row decide buttons — those
 *  live on `/admin/forms/[slug]`, which the View action links to). */
function FormSubmissionsSection({ rows }: { rows: FormSubmissionRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-fg">Form-based registrations</h2>
        <Badge tone="brand">{rows.length}</Badge>
        <span className="text-[11px] text-subtle ml-1">
          Not PathwayEnrollment rows — these are EventFormSubmissions for forms admins treat as pathway-equivalent.
        </span>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-5 py-3">Trainee</th>
              <th className="px-5 py-3">Form</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-elevated/50 align-top">
                <td className="px-5 py-3">
                  <p className="font-medium text-fg">{r.user.name ?? "—"}</p>
                  <p className="text-xs text-subtle">{r.user.email}</p>
                  {(r.user.organization || r.user.jobTitle) && (
                    <p className="text-xs text-subtle mt-0.5">
                      {[r.user.jobTitle, r.user.organization].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/forms/${r.formSlug}`}
                    className="text-fg hover:text-brand-700 font-medium truncate inline-block max-w-[260px]"
                  >
                    {r.formTitle}
                  </Link>
                  <p className="text-xs text-subtle">/forms/{r.formSlug}</p>
                </td>
                <td className="px-5 py-3 text-subtle text-xs whitespace-nowrap">
                  {new Date(r.submittedAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/forms/${r.formSlug}`}
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    View submissions →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "amber" | "warning" | "brand" | "success" | "neutral";
  rows: Row[];
  approvedMap: Map<string, number>;
  showQueuePosition: boolean;
  showAttendance?: boolean;
}

function Section({ title, tone, rows, approvedMap, showQueuePosition, showAttendance = false }: SectionProps) {
  if (rows.length === 0) return null;

  // Queue position is the row's index within the section + 1 (already
  // sorted by enrolledAt ascending across all rows; per-pathway grouping
  // gives accurate positions when mixed pathways are shown).
  const positionByPathway = new Map<string, number>();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-fg">{title}</h2>
        <Badge tone={tone}>{rows.length}</Badge>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
              {showQueuePosition && <th className="px-5 py-3 w-12">#</th>}
              <th className="px-5 py-3">Trainee</th>
              <th className="px-5 py-3">Pathway</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Submitted</th>
              {showAttendance && <th className="px-5 py-3">Attendance</th>}
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              let position: number | null = null;
              if (showQueuePosition) {
                position = (positionByPathway.get(r.pathwayId) ?? 0) + 1;
                positionByPathway.set(r.pathwayId, position);
              }
              const cap = approvedMap.get(r.pathwayId) ?? 0;
              const capLabel = r.pathway.capacity != null ? ` · ${cap}/${r.pathway.capacity}` : "";
              return (
                <tr key={r.id} className="hover:bg-elevated/50 align-top">
                  {showQueuePosition && (
                    <td className="px-5 py-3 text-fg font-mono">{position}</td>
                  )}
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{r.user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{r.user.email}</p>
                    {(r.user.organization || r.user.jobTitle) && (
                      <p className="text-xs text-subtle mt-0.5">
                        {[r.user.jobTitle, r.user.organization].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/pathways/${r.pathwayId}`} className="text-fg hover:text-brand-700 font-medium truncate inline-block max-w-[200px]">
                      {r.pathway.title}
                    </Link>
                    <p className="text-xs text-subtle">{capLabel.replace(/^ · /, "")}</p>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-[280px]">
                    <p className="line-clamp-3">{r.requestReason ?? "—"}</p>
                    {r.reviewerNote && (
                      <p className="text-subtle mt-1 italic line-clamp-2">Reviewer: {r.reviewerNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs whitespace-nowrap">
                    {new Date(r.enrolledAt).toLocaleDateString()}
                  </td>
                  {showAttendance && (
                    <td className="px-5 py-3">
                      <AttendanceToggle
                        enrollmentId={r.id}
                        attended={r.attended}
                        sessionsAttended={r.sessionsAttended}
                      />
                    </td>
                  )}
                  <td className="px-5 py-3">
                    <PathwayEnrollmentDecideButtons id={r.id} status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
