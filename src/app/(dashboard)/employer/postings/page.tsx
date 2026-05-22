/**
 * /employer/postings — the HR workspace (postings + applicants +
 * action queue in a single linear scroll).
 *
 * Until recently this URL was a redirect to /employer (which hosted
 * the workspace inline). After /employer was reworked into the
 * brand-stage profile page, the workspace had no home — the sidebar's
 * "My Postings" entry effectively pointed at a redirect chain that
 * landed users on the profile and left them no way to manage their
 * postings. This page brings the workspace back as a real surface.
 *
 * Server responsibilities are unchanged from the previous /employer
 * implementation:
 *   • Load all postings the recruiter owns (admins see everything)
 *   • Compute per-stage counts in one groupBy
 *   • Build the action queue (new triage / stale / awaiting offer
 *     response) so the workspace can lead with attention items
 *   • Detect "fresh employer" (no profile + zero postings) for the
 *     welcome-banner copy in HrWorkspace
 *
 * Client (HrWorkspace) handles all interactivity:
 *   • Expand a posting → loads applicants lazily
 *   • Expand an applicant → materials / AI fit / stage / comments inline
 *   • Schedule interview / send offer / create posting → inline forms
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, updateLastSeen } from "@/lib/employer/company";
import { ELIGIBLE_APPLICANT_FILTER } from "@/lib/talent-pool/eligibility";
import {
  HrWorkspace,
  type PostingSummary,
  type QueueItem,
} from "@/components/employer/workspace/HrWorkspace";
import { SetPasswordBanner } from "@/components/employer/SetPasswordBanner";
import { DemoSeederBar } from "@/components/employer/DemoSeederBar";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = [
  "new", "reviewing", "shortlisted", "phone_screen", "onsite", "offer",
] as const;

export default async function EmployerWorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const userId = (session.user as { id?: string }).id ?? null;
  const isAdmin = role === "admin" || role === "superadmin";
  if (role !== "employer" && !isAdmin) {
    return (
      <div className="bg-card border border-line rounded-2xl p-12 text-center">
        <p className="font-medium text-muted">This portal is for employer accounts.</p>
      </div>
    );
  }

  const me = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, password: true,
          employerCompany: true, companyDescription: true, companyIndustry: true,
          companyLocation: true, companyLogo: true,
        },
      }).catch(() => null)
    : null;

  // Resolve active company, stamp last-seen.
  const companyId = isAdmin
    ? null
    : userId ? await getActiveCompanyId(userId) : null;
  if (companyId && userId) updateLastSeen(companyId, userId);

  // Company-scoped filter with legacy createdById fallback.
  const postingsFilter = isAdmin
    ? {}
    : companyId
    ? { companyId }
    : { createdById: userId ?? "_" };

  const postingsRaw = await prisma.internshipPosting.findMany({
    where: postingsFilter,
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      status: true,
      deadline: true,
      contactEmail: true,
      createdAt: true,
      updatedAt: true,
      keySkills: true,
      compensation: true,
      hours: true,
      duration: true,
      type: true,
    },
    orderBy: { createdAt: "desc" },
  }).catch(() => [] as Array<{
    id: string; title: string; companyName: string; location: string | null;
    status: string; deadline: Date | null; contactEmail: string | null;
    createdAt: Date; updatedAt: Date; keySkills: string[];
    compensation: string | null; hours: string | null;
    duration: string | null; type: string | null;
  }>);

  // ── Per-stage counts in one groupBy ──────────────────────
  const postingIds = postingsRaw.map((p) => p.id);
  const stageCounts = postingIds.length
    ? await prisma.applicationStatus.groupBy({
        by: ["postingId", "status"],
        where: { postingId: { in: postingIds } },
        _count: { status: true },
      }).catch(() => [] as Array<{ postingId: string; status: string; _count: { status: number } }>)
    : [];
  const countsByPosting = new Map<string, Record<string, number>>();
  for (const g of stageCounts) {
    const m = countsByPosting.get(g.postingId) ?? {};
    m[g.status] = g._count.status;
    countsByPosting.set(g.postingId, m);
  }

  const since7d = new Date(Date.now() - 7 * 86_400_000);
  const since2d = new Date(Date.now() - 2 * 86_400_000);

  // ── Action queue ──────────────────────────────────────────
  const queueRows = postingIds.length
    ? await prisma.applicationStatus.findMany({
        where: {
          // Eligibility gate — un-approved applicants are hidden
          // from the HR action queue.
          ...ELIGIBLE_APPLICANT_FILTER,
          postingId: { in: postingIds },
          OR: [
            { status: "new" },
            {
              status: { in: [...ACTIVE_STAGES] as string[] },
              stageEnteredAt: { lt: since7d },
            },
            { status: "offer", stageEnteredAt: { lt: since2d } },
          ],
        },
        select: {
          id: true,
          status: true,
          stageEnteredAt: true,
          posting: { select: { id: true, title: true } },
          applicant: { select: { id: true, name: true, email: true } },
        },
        orderBy: { stageEnteredAt: "asc" },
        take: 12,
      }).catch(() => [] as Array<{
        id: string; status: string; stageEnteredAt: Date;
        posting: { id: string; title: string };
        applicant: { id: string; name: string | null; email: string };
      }>)
    : [];

  const actionQueue: QueueItem[] = queueRows.map((row) => {
    const days = Math.floor((Date.now() - row.stageEnteredAt.getTime()) / 86_400_000);
    const isOffer = row.status === "offer";
    const isStale = ACTIVE_STAGES.includes(row.status as (typeof ACTIVE_STAGES)[number])
      && days >= 7 && row.status !== "new";
    const kind: QueueItem["kind"] =
      isOffer ? "offer-waiting" :
      isStale ? "stale" : "new";
    return {
      applicationStatusId: row.id,
      postingId: row.posting.id,
      postingTitle: row.posting.title,
      applicantId: row.applicant.id,
      applicantName: row.applicant.name ?? row.applicant.email,
      kind,
      daysInStage: days,
    };
  });

  const postings: PostingSummary[] = postingsRaw.map((p) => {
    const m = countsByPosting.get(p.id) ?? {};
    const total = Object.values(m).reduce((a, b) => a + b, 0);
    const newCount = m.new ?? 0;
    const inProgress =
      (m.reviewing ?? 0) + (m.shortlisted ?? 0) +
      (m.phone_screen ?? 0) + (m.onsite ?? 0) + (m.offer ?? 0);
    const hired = m.hired ?? 0;
    const closed = (m.rejected ?? 0) + (m.closed ?? 0);
    return {
      id: p.id,
      title: p.title,
      companyName: p.companyName,
      location: p.location,
      status: p.status,
      deadline: p.deadline?.toISOString() ?? null,
      contactEmail: p.contactEmail,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      keySkills: p.keySkills,
      compensation: p.compensation,
      hours: p.hours,
      duration: p.duration,
      type: p.type,
      counts: { total, newCount, inProgress, hired, closed },
    };
  });

  const profileEmpty = !me?.companyDescription && !me?.companyIndustry
    && !me?.companyLocation && !me?.companyLogo;
  const isFresh = postings.length === 0 && profileEmpty;
  const noPassword = !me?.password;

  // Has the operator already populated some demo data? Drives the
  // "Add more" vs "Seed demo data" label + whether the Clear button
  // shows. Cheap COUNT — no risk of pulling all rows.
  const demoCount = await prisma.internshipPosting.count({
    where: { createdById: userId ?? "_", isDemoSeed: true },
  }).catch(() => 0);

  // Hero always sits at the very top of the page — never let any
  // banner / seeder / utility bar slip above it. The hero owns the
  // top edge of every page on the platform. Both the SetPassword
  // notice and the admin DemoSeederBar render UNDER the workspace's
  // hero strip; we slot them between the hero and the workspace's
  // content using a small layout shim.
  return (
    <HrWorkspace
      firstName={me?.name?.split(" ")[0] ?? null}
      companyName={me?.employerCompany ?? null}
      isAdmin={isAdmin}
      isFresh={isFresh}
      postings={postings}
      actionQueue={actionQueue}
      slotAboveContent={
        <>
          {noPassword && <SetPasswordBanner className="mb-4" />}
          <DemoSeederBar hasExistingDemos={demoCount > 0} />
        </>
      }
    />
  );
}
