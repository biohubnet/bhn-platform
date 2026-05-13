/**
 * Trainee-side mirror of the employer kanban: every posting the
 * trainee has applied to or saved for later. Two tabs:
 *
 *   • Applied — ApplicationStatus rows where applicantId = me.
 *               Shows current stage (new / reviewing / shortlisted /
 *               phone_screen / onsite / offer / hired / rejected /
 *               closed). Stage is the same string the employer's
 *               kanban moves through, so the trainee sees their
 *               actual progress reflected without a separate sync.
 *   • Saved   — UserSavedPosting bookmarks. Useful for a "I want to
 *               apply later" list with deadline reminders.
 *
 * No write actions on this page — Apply lives on the posting detail
 * page (the mailto-pre-fill flow), and Unsave lives in the heart
 * icon on the same detail page. This page is the read-only ledger.
 */
import { requireSession, isStaff as checkIsStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Briefcase, MapPin, Calendar, ArrowRight, Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  new:           { label: "Submitted",   cls: "bg-brand-100 text-brand-800 ring-brand-200" },
  reviewing:     { label: "Reviewing",   cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  shortlisted:   { label: "Shortlisted", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  phone_screen:  { label: "Phone screen", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  onsite:        { label: "Onsite",      cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  offer:         { label: "Offer",       cls: "bg-violet-100 text-violet-800 ring-violet-200" },
  hired:         { label: "Hired",       cls: "bg-violet-100 text-violet-800 ring-violet-200" },
  rejected:      { label: "Not advancing", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  closed:        { label: "Closed",      cls: "bg-elevated text-muted ring-line" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_TONE[status] ?? { label: status, cls: "bg-elevated text-muted ring-line" };
  return (
    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset", meta.cls)}>
      {meta.label}
    </span>
  );
}

export default async function MyApplicationsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role ?? "trainee";
  const isStaff = checkIsStaff(role);

  const [applied, saved] = await Promise.all([
    prisma.applicationStatus.findMany({
      where: { applicantId: userId },
      include: {
        posting: {
          select: {
            id: true, title: true, companyName: true, location: true,
            deadline: true, status: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userSavedPosting.findMany({
      where: { userId },
      include: {
        posting: {
          select: {
            id: true, title: true, companyName: true, location: true,
            deadline: true, status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Filter out saved postings the trainee has already applied to —
  // they show up under Applied with their actual stage. Avoids
  // duplicate listings on the same screen.
  const appliedPostingIds = new Set(applied.map((a) => a.postingId));
  const savedOnly = saved.filter((s) => !appliedPostingIds.has(s.postingId));

  // Highlight saved postings with a deadline in the next 7 days.
  const SOON_MS = 7 * 24 * 60 * 60 * 1000;
  const soon = savedOnly.filter(
    (s) => s.posting.deadline && s.posting.deadline.getTime() - Date.now() <= SOON_MS && s.posting.deadline.getTime() > Date.now(),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="My applications"
        description="Postings you've applied to (with current stage) and the ones you've saved for later. Stages mirror what the employer sees on their side."
      />

      {/* Admin-only demo seed/clear tray. Attaches [demo]-marked
          ApplicationStatus rows to the viewing admin's own user so
          the page renders with content for screenshots / walk-
          throughs. Clear removes only the [demo]-prefixed rows;
          real employer-managed statuses are not touched. */}
      {isStaff && (
        <div className="mb-4">
          <DemoSeedAndClearTray
            entity="user_application_status"
            noun="demo application rows"
            clearHelp="Delete [demo]-prefixed ApplicationStatus rows on your own user. Real employer-managed statuses are not touched."
          />
        </div>
      )}

      {soon.length > 0 && (
        <Card className="mb-5 p-4 border-amber-200 bg-amber-50/60">
          <p className="text-sm font-semibold text-amber-900 inline-flex items-center gap-2">
            <Sparkles size={14} /> {soon.length} saved posting{soon.length === 1 ? "" : "s"} expire{soon.length === 1 ? "s" : ""} this week
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {soon.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/internships/${s.postingId}`}
                  className="min-w-0 flex-1 truncate text-fg hover:text-brand-700"
                >
                  {s.posting.title} — {s.posting.companyName}
                </Link>
                <span className="text-xs text-amber-800 shrink-0">
                  {s.posting.deadline?.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Applied */}
      <section className="mb-8">
        <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          Applied · {applied.length}
        </h2>
        {applied.length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase size={26} className="mx-auto text-subtle mb-3" />
            <p className="text-sm font-medium text-fg">Nothing here yet.</p>
            <p className="text-xs text-muted mt-1">
              Browse{" "}
              <Link href="/internships" className="text-brand-700 underline hover:no-underline">
                Internship Opportunities
              </Link>{" "}
              and click <strong>Send my application</strong> on a posting that fits.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {applied.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/internships/${a.postingId}`}
                  className="block bg-card border border-line rounded-xl p-4 hover:border-brand-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle">
                        {a.posting.companyName}
                      </p>
                      <p className="text-sm font-semibold text-fg leading-snug mt-0.5">
                        {a.posting.title}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted mt-1.5">
                        {a.posting.location && (
                          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {a.posting.location}</span>
                        )}
                        {a.posting.deadline && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} /> {a.posting.deadline.toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-subtle">
                          Updated {new Date(a.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.notes && (
                    <p className="text-xs text-muted mt-2 italic">&ldquo;{a.notes}&rdquo;</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Saved */}
      <section>
        <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3 inline-flex items-center gap-1.5">
          <Heart size={11} /> Saved · {savedOnly.length}
        </h2>
        {savedOnly.length === 0 ? (
          <Card className="p-8 text-center">
            <Heart size={22} className="mx-auto text-subtle mb-3" />
            <p className="text-sm font-medium text-fg">No bookmarks yet.</p>
            <p className="text-xs text-muted mt-1">
              Click the heart on any posting to save it here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {savedOnly.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/internships/${s.postingId}`}
                  className="block bg-card border border-line rounded-xl p-4 hover:border-brand-200 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-subtle">
                        {s.posting.companyName}
                      </p>
                      <p className="text-sm font-semibold text-fg leading-snug mt-0.5">
                        {s.posting.title}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted mt-1.5">
                        {s.posting.location && (
                          <span className="inline-flex items-center gap-1"><MapPin size={11} /> {s.posting.location}</span>
                        )}
                        {s.posting.deadline && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} /> {s.posting.deadline.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-subtle mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
