import Link from "next/link";
import {
  ArrowRight, ClipboardList,
  Building2, Briefcase, BookOpen, Inbox, Rocket,
  Eye, Layers, Sparkles, Activity, Clock, Coins,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Admin / superadmin dashboard.
 *
 * Redesign v3.2 (May 2026): same magazine-cover idiom on top, but
 * THEME-AWARE — colors come from the platform's --bg / --card /
 * --fg / --brand-* tokens, not from hard-coded Y2K candy colors.
 * So when the user picks Light, Cinematic, Sakura, Atom Punk, etc.
 * the dashboard re-tints itself accordingly. The Y2K "look" — glassy
 * surfaces, pearl inner highlights, soft drop shadows — comes
 * through via box-shadow + backdrop-filter instead of palette.
 *
 *   • Top section — L21 magazine cover. Eyebrow + italic headline
 *     (priority cascade: pending > 0 → "X approvals waiting" /
 *     setup incomplete → "step N of M" / otherwise → "platform
 *     reads healthy"), deck, four stamp pills, signoff. Right-side
 *     numbered table of contents that deep-links to the action
 *     queue, bench, postings, audit, setup checklist (if open),
 *     credit-expiry watch (if any), AI calls (superadmin only).
 *
 *   • Bottom section — L7 sidebar-RIGHT. The 3-column content body
 *     occupies the LEFT (Triage · Pulse · Audit), the dark rail
 *     sits on the RIGHT and holds quick-action shortcuts instead
 *     of plain KPI tiles. Content reordered for "what does an
 *     admin actually want?":
 *
 *       Triage — pending breakdown + stale items + credit expiry.
 *       Pulse — what's happening on the platform today / this week
 *               (new users, enrollments, talent apps, AI calls).
 *       Audit — last 5 entries with timestamps and actor display
 *               names; "see full audit log" link.
 *
 *       Quick actions rail — Review credit queue, Invite employer,
 *       Create posting, Spawn demo workspace, View as trainee,
 *       Open audit log, Design archive, AI assist (superadmin).
 *
 * Same data-fetching shape as v1 / v2 so nothing downstream changes.
 * Theme-aware tokens are scoped under `.adash-aero` in the AERO_CSS
 * constant at the bottom of this file — no leakage to other surfaces.
 */
export async function AdminDashboard({
  user, role, committeeBadge,
}: {
  user: { id: string; name: string | null };
  role: string;
  /** Optional content rendered immediately AFTER the hero — used by
   *  the dashboard page to inject CommitteeBadgeStrip without
   *  pushing the editorial hero off the top of the page. */
  committeeBadge?: React.ReactNode;
}) {
  const firstName = user.name?.split(" ")[0] ?? "there";
  const isSuperAdmin = role === "superadmin";
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, totalCourses, totalEnrollments, totalCertificates,
    new7dUsers, new24hEnrollments,
    pendingCreditApps, pendingRoleRequests, pendingPathwayApps,
    employerCount, employerInvitesPending,
    activePostings, totalApplications,
    demoWorkspaceCount, phantomCount,
    recentAudit,
    aiCalls7d,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true, accountKind: "real" } }),
    prisma.course.count({ where: { status: "published" } }),
    prisma.enrollment.count(),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.user.count({ where: { createdAt: { gt: since7d }, accountKind: "real" } }),
    prisma.enrollment.count({ where: { enrolledAt: { gt: since24h } } }),
    prisma.creditApplication.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.roleChangeRequest.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.pathwayEnrollment.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.user.count({ where: { role: "employer", accountKind: "real" } }),
    prisma.employerInvite.count({ where: { usedAt: null, expiresAt: { gt: new Date() } } }).catch(() => 0),
    prisma.internshipPosting.count({ where: { status: "active" } }).catch(() => 0),
    prisma.applicationStatus.count().catch(() => 0),
    prisma.user.count({ where: { accountKind: "demo" } }).catch(() => 0),
    prisma.user.count({ where: { accountKind: "phantom" } }).catch(() => 0),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actor: { select: { name: true, email: true } } },
    }).catch(() => []),
    isSuperAdmin
      ? prisma.aIInteraction.count({ where: { createdAt: { gt: since7d } } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const totalPending = pendingCreditApps + pendingRoleRequests + pendingPathwayApps;

  const now = new Date();
  const horizon = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const expiringWindow = async (days: number) => {
    const rows = await prisma.creditTransaction.findMany({
      where: {
        type: "credit",
        expiresAt: { not: null, gt: now, lte: horizon(days) },
        expiredAt: null,
        user: { accountKind: "real" },
      },
      select: { amount: true, expiredAmount: true, userId: true },
    }).catch(() => []);
    const credits = rows.reduce((sum, r) => sum + Math.max(0, r.amount - r.expiredAmount), 0);
    const users = new Set(rows.map((r) => r.userId)).size;
    return { credits, users };
  };
  const [expiring7, expiring30, expiring90] = await Promise.all([
    expiringWindow(7), expiringWindow(30), expiringWindow(90),
  ]);
  const anyExpiry = expiring7.credits + expiring30.credits + expiring90.credits > 0;

  // ── Setup checklist heuristics ─────────────────────────────────
  const checklist: Array<{
    id: string;
    done: boolean;
    label: string;
    detail: string;
    href: string;
    icon: React.ElementType;
  }> = [
    {
      id: "demo-workspace",
      done: demoWorkspaceCount > 0,
      label: "Spawn a demo workspace",
      detail: "Throwaway accounts that walk a prospective partner through the full platform.",
      href: "/admin/demo-workspaces",
      icon: Rocket,
    },
    {
      id: "invite-employer",
      done: employerCount > 0 || employerInvitesPending > 0,
      label: "Invite your first employer",
      detail: "Drop in their email, copy the link, send via your usual channel.",
      href: "/admin/employer-invites",
      icon: Building2,
    },
    {
      id: "first-posting",
      done: activePostings > 0,
      label: "Create the first posting",
      detail: "Paste a JD; the AI fills in the fields. Or seed demo postings from /employer/postings.",
      href: "/admin/internships/new",
      icon: Briefcase,
    },
    {
      id: "first-course",
      done: totalCourses > 0,
      label: "Publish at least one course",
      detail: "The training catalog is the backbone — even one course lets sign-ups try the LMS loop.",
      href: "/courses?from=instructor",
      icon: BookOpen,
    },
    {
      id: "talent-application",
      done: totalApplications > 0,
      label: "See talent flow through",
      detail: "Once a trainee submits the talent application, cards appear on /employer/applicants with AI match scores.",
      href: "/employer/applicants",
      icon: Inbox,
    },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistOpen = checklist.length - checklistDone;
  const setupPct = Math.round((checklistDone / checklist.length) * 100);
  const showChecklist = checklistOpen > 0 && (totalUsers < 10 || activePostings === 0 || employerCount === 0);
  const nextChecklistItem = checklist.find((c) => !c.done);

  // ── Cover headline (priority cascade) ──────────────────────────
  // Mirrors the old spotlight cascade but rendered as a magazine
  // masthead in the new Y2K Aero layout below.
  const issueDate = now.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();

  const cover: { headline: React.ReactNode; dek: string } =
    totalPending > 0
      ? {
          headline: (
            <>
              Hi, {firstName} — <em>{totalPending} {totalPending === 1 ? "approval" : "approvals"}</em> waiting.
            </>
          ),
          dek: "Trainees across credit applications, role-change requests, and pathway enrolments are blocked until you triage. Most rows take less than a minute.",
        }
      : showChecklist && nextChecklistItem
        ? {
            headline: (
              <>
                Hi, {firstName} — setup, <em>step {checklistDone + 1} of {checklist.length}</em>.
              </>
            ),
            dek: nextChecklistItem.detail,
          }
        : {
            headline: (
              <>
                Hi, {firstName} — the platform reads <em>healthy</em>.
              </>
            ),
            dek: `Nothing in the queue. ${totalUsers.toLocaleString()} active user${totalUsers === 1 ? "" : "s"}, ${activePostings} live posting${activePostings === 1 ? "" : "s"}, ${totalApplications} talent application${totalApplications === 1 ? "" : "s"} in flight.`,
          };


  return (
    <div className="adash-aero">
      {/* Scoped theme-aware CSS for the dashboard's glassy/aero look.
          Selectors live under `.adash-aero` so nothing leaks out. */}
      <style dangerouslySetInnerHTML={{ __html: AERO_CSS }} />

      {/* ════ MAGAZINE COVER ════════════════════════════════════════ */}
      <article className="aero-frame">
        <div className="cover-wrap">
          <section className="cover">
            <p className="issue">BHN OPERATIONS · ISSUE {issueDate}</p>
            <h1 className="headline">{cover.headline}</h1>
            <p className="dek">{cover.dek}</p>
            <div className="stamps">
              <span className="pill">{totalUsers.toLocaleString()} users</span>
              <span className="pill">{totalCourses} courses</span>
              <span className="pill">{activePostings} postings</span>
              <span className={totalPending > 0 ? "pill warn" : "pill"}>
                {totalPending} pending
              </span>
            </div>
            <p className="signoff">
              {isSuperAdmin ? "Superadmin desk" : "Admin desk"} · signed in as {firstName}
              {new7dUsers > 0 && <span> · {new7dUsers} new sign-up{new7dUsers === 1 ? "" : "s"} this week</span>}
            </p>
          </section>

          <aside className="toc">
            <h3>Inside this issue</h3>
            <ul>
              <li>
                <span className="n">01</span>
                <Link className="t" href="/admin/credit-applications">Action queue · pending</Link>
                <span className={totalPending > 0 ? "v warn" : "v"}>{totalPending}</span>
              </li>
              <li>
                <span className="n">02</span>
                <Link className="t" href="/admin/employer-invites">Bench · employers</Link>
                <span className="v">{employerCount}</span>
              </li>
              <li>
                <span className="n">03</span>
                <Link className="t" href="/admin/internships">Postings · active</Link>
                <span className="v">{activePostings}</span>
              </li>
              <li>
                <span className="n">04</span>
                <Link className="t" href="/admin/audit">Audit log · tail</Link>
                <span className="v">{recentAudit.length}</span>
              </li>
              {showChecklist && nextChecklistItem && (
                <li>
                  <span className="n">05</span>
                  <Link className="t" href={nextChecklistItem.href}>
                    Setup checklist
                  </Link>
                  <span className="v">{setupPct}%</span>
                </li>
              )}
              {anyExpiry && (
                <li>
                  <span className="n">{showChecklist ? "06" : "05"}</span>
                  <Link className="t" href="/admin/credit-applications">Credit expiry · 30d window</Link>
                  <span className={expiring30.users > 0 ? "v warn" : "v"}>{expiring30.users}</span>
                </li>
              )}
              {isSuperAdmin && aiCalls7d > 0 && (
                <li>
                  <span className="n">{(showChecklist ? 1 : 0) + (anyExpiry ? 1 : 0) + 5}</span>
                  <Link className="t" href="/admin/assist">AI calls · 7d</Link>
                  <span className="v">{aiCalls7d}</span>
                </li>
              )}
            </ul>
            <Link href="/admin/split-view" className="toc-cta">
              View the platform as a trainee <ArrowRight size={11} />
            </Link>
          </aside>
        </div>
      </article>

      {committeeBadge}

      {/* ════ SIDEBAR RIGHT — content LEFT, quick-action rail RIGHT ═ */}
      <article className="aero-frame">
        <div className="sr-layout">
          <div className="sr-body">
            {/* TRIAGE — what needs me NOW */}
            <div className="aero-card">
              <h3 className="aero-h"><ClipboardList size={14} /> Triage queue</h3>
              <p className="aero-gloss">What needs you right now.</p>
              <ul className="aero-list">
                <li>
                  <Link href="/admin/credit-applications" className="row">
                    <span>Credit applications</span>
                    <span className={pendingCreditApps > 0 ? "v warn" : "v"}>{pendingCreditApps}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/role-requests" className="row">
                    <span>Role-change requests</span>
                    <span className={pendingRoleRequests > 0 ? "v warn" : "v"}>{pendingRoleRequests}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/admin/pathway-enrollments" className="row">
                    <span>Pathway enrolments</span>
                    <span className={pendingPathwayApps > 0 ? "v warn" : "v"}>{pendingPathwayApps}</span>
                  </Link>
                </li>
                {anyExpiry && (
                  <li>
                    <Link href="/admin/credit-applications" className="row">
                      <span>Credit expiry · 30d</span>
                      <span className={expiring30.users > 0 ? "v warn" : "v"}>{expiring30.users} users</span>
                    </Link>
                  </li>
                )}
                {expiring7.users > 0 && (
                  <li>
                    <Link href="/admin/credit-applications" className="row">
                      <span>Expiring &lt; 7d <span className="urgent">URGENT</span></span>
                      <span className="v warn">{expiring7.credits.toLocaleString()} cr</span>
                    </Link>
                  </li>
                )}
              </ul>
              {totalPending === 0 && !anyExpiry && (
                <p className="aero-empty">All clear. Nothing on the desk.</p>
              )}
            </div>

            {/* PULSE — what's happening on the platform */}
            <div className="aero-card">
              <h3 className="aero-h"><Activity size={14} /> Today&apos;s pulse</h3>
              <p className="aero-gloss">Activity in the last day / week.</p>
              <ul className="aero-list">
                <li><span>New users this week</span><span className="v">{new7dUsers}</span></li>
                <li><span>New enrolments · 24h</span><span className="v">{new24hEnrollments}</span></li>
                <li><span>Talent applications</span><span className="v">{totalApplications}</span></li>
                <li><span>Active postings</span><span className="v">{activePostings}</span></li>
                {(demoWorkspaceCount + phantomCount) > 0 && (
                  <li><span>Demo · phantom accounts</span><span className="v">{demoWorkspaceCount + phantomCount}</span></li>
                )}
                {isSuperAdmin && (
                  <li><span>AI calls · 7d</span><span className="v">{aiCalls7d.toLocaleString()}</span></li>
                )}
              </ul>
            </div>

            {/* AUDIT — what people did */}
            <div className="aero-card">
              <h3 className="aero-h"><Inbox size={14} /> Recent activity</h3>
              <p className="aero-gloss">Last {recentAudit.length} audit-log entries.</p>
              <ul className="aero-list audit">
                {recentAudit.length === 0 && (
                  <li className="empty">No recent entries.</li>
                )}
                {recentAudit.map((a) => {
                  const d = new Date(a.createdAt);
                  const sameDay = d.toDateString() === now.toDateString();
                  const stamp = sameDay
                    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
                    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const who = a.actor?.name ?? a.actor?.email?.split("@")[0] ?? "—";
                  return (
                    <li key={a.id}>
                      <span><code>{stamp}</code> {a.action}</span>
                      <span className="v">{who}</span>
                    </li>
                  );
                })}
              </ul>
              <Link href="/admin/audit" className="see-all">
                See full audit log <ArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* RIGHT RAIL — quick-action shortcuts (not KPI tiles).
              Drives the things admins actually click on most days. */}
          <aside className="sr-rail">
            <p className="rail-h">Quick actions</p>
            <Link href={totalPending > 0 ? "/admin/credit-applications" : "/admin"} className={`qa ${totalPending > 0 ? "qa-primary" : ""}`}>
              <ClipboardList size={15} />
              <div>
                <p className="qa-t">{totalPending > 0 ? "Review queue" : "Admin overview"}</p>
                <p className="qa-s">{totalPending > 0 ? `${totalPending} pending` : "All clear"}</p>
              </div>
            </Link>
            <Link href="/admin/employer-invites" className="qa">
              <Building2 size={15} />
              <div>
                <p className="qa-t">Invite an employer</p>
                <p className="qa-s">{employerCount} active · {employerInvitesPending} pending</p>
              </div>
            </Link>
            <Link href="/admin/internships/new" className="qa">
              <Briefcase size={15} />
              <div>
                <p className="qa-t">Create a posting</p>
                <p className="qa-s">{activePostings} live now</p>
              </div>
            </Link>
            <Link href="/admin/demo-workspaces" className="qa">
              <Rocket size={15} />
              <div>
                <p className="qa-t">Spawn a demo workspace</p>
                <p className="qa-s">{demoWorkspaceCount > 0 ? `${demoWorkspaceCount} spun up` : "Walk a partner through"}</p>
              </div>
            </Link>
            <Link href="/admin/split-view" className="qa">
              <Eye size={15} />
              <div>
                <p className="qa-t">View as a trainee</p>
                <p className="qa-s">Empathy mode</p>
              </div>
            </Link>
            <Link href="/admin/audit" className="qa">
              <Clock size={15} />
              <div>
                <p className="qa-t">Open audit log</p>
                <p className="qa-s">Full history · filter</p>
              </div>
            </Link>
            <Link href="/admin/design-archive" className="qa">
              <Layers size={15} />
              <div>
                <p className="qa-t">Design archive</p>
                <p className="qa-s">Working sketches</p>
              </div>
            </Link>
            {isSuperAdmin && (
              <Link href="/admin/assist" className="qa">
                <Sparkles size={15} />
                <div>
                  <p className="qa-t">AI assist health</p>
                  <p className="qa-s">{aiCalls7d.toLocaleString()} calls · 7d</p>
                </div>
              </Link>
            )}
            {totalCertificates > 0 && (
              <Link href="/admin/audit" className="qa qa-aside">
                <Coins size={15} />
                <div>
                  <p className="qa-t">Certificates issued</p>
                  <p className="qa-s">{totalCertificates.toLocaleString()} lifetime</p>
                </div>
              </Link>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   THEME-AWARE AERO STYLES — scoped to `.adash-aero`.
   Same visual idiom as Y2K Aero (glassy cards, pearl inner highlights,
   soft drop shadows) but colors come from the platform's --bg /
   --card / --fg / --brand-* tokens so the dashboard re-tints per
   active theme (Light, Cinematic, Sakura, Atom Punk, etc.).
════════════════════════════════════════════════════════════════════ */
const AERO_CSS = `
.adash-aero {
  display: flex; flex-direction: column; gap: 14px;
  color: var(--fg);
}

/* ── Outer frame ─────────────────────────────────────────────────── */
.adash-aero .aero-frame {
  background:
    linear-gradient(135deg, var(--brand-50) 0%, var(--card-solid) 50%, var(--brand-50) 100%);
  border-radius: 22px;
  border: 1px solid var(--line);
  overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.5) inset,
    0 -1px 0 var(--line) inset,
    0 12px 36px rgba(0,0,0,0.06);
  position: relative;
  isolation: isolate;
  min-width: 0;
}
.adash-aero .aero-frame::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(800px 500px at 25% 10%, rgba(255,255,255,0.5), transparent 60%);
  pointer-events: none; z-index: 0;
}
.adash-aero .aero-frame > * { position: relative; z-index: 1; }

/* ── Magazine cover ───────────────────────────────────────────── */
.adash-aero .cover-wrap { display: grid; grid-template-columns: 1.7fr 1fr; min-height: 360px; }
@media (max-width: 900px) { .adash-aero .cover-wrap { grid-template-columns: 1fr; } }
.adash-aero .cover { padding: 36px 40px 32px; display: flex; flex-direction: column; justify-content: space-between; }
.adash-aero .cover .issue {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.4em; text-transform: uppercase;
  color: var(--fg-muted); margin: 0 0 14px; font-weight: 700;
}
.adash-aero .cover .headline {
  font-size: 52px; font-weight: 800; letter-spacing: -0.03em;
  line-height: 0.98; margin: 0 0 12px; color: var(--fg);
  text-shadow: 0 1px 0 rgba(255,255,255,0.45);
}
.adash-aero .cover .headline em {
  font-style: italic; color: var(--brand-700);
}
.adash-aero .cover .dek { font-size: 15.5px; color: var(--fg-muted); max-width: 50ch; line-height: 1.5; margin: 0 0 18px; }
.adash-aero .stamps { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.adash-aero .pill {
  display: inline-block; padding: 4px 11px; border-radius: 999px;
  background: var(--card); border: 1px solid var(--line-strong);
  font-size: 11.5px; font-weight: 700; color: var(--brand-700);
  letter-spacing: 0.04em;
}
.adash-aero .pill.warn {
  background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.5);
  color: rgb(180, 83, 9);
}
.adash-aero .signoff {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--fg-subtle); margin: 20px 0 0;
}

.adash-aero .toc {
  background: var(--card);
  border-left: 1px solid var(--line);
  padding: 32px 28px; display: flex; flex-direction: column; gap: 14px;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}
.adash-aero .toc h3 {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--fg-muted); margin: 0; font-weight: 700;
}
.adash-aero .toc ul { list-style: none; padding: 0; margin: 0; }
.adash-aero .toc ul li {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 12px; align-items: baseline;
  padding: 10px 0; border-bottom: 1px dotted var(--line);
}
.adash-aero .toc ul li:last-child { border-bottom: none; }
.adash-aero .toc ul li .n {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 12px; color: var(--brand-600); font-weight: 700;
}
.adash-aero .toc ul li .t {
  font-size: 13.5px; color: var(--fg); text-decoration: none; transition: color 120ms;
}
.adash-aero .toc ul li .t:hover { color: var(--brand-700); }
.adash-aero .toc ul li .v {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 13px; font-weight: 700; color: var(--brand-700);
  font-variant-numeric: tabular-nums;
}
.adash-aero .toc ul li .v.warn { color: rgb(180, 83, 9); }
.adash-aero .toc-cta {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 8px;
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  font-weight: 700; color: var(--brand-700); text-decoration: none;
  padding: 8px 14px; border-radius: 8px;
  background: var(--card-solid); border: 1px solid var(--line-strong);
  align-self: start; transition: all 120ms;
}
.adash-aero .toc-cta:hover { background: var(--brand-50); }

/* ── Sidebar RIGHT layout (content LEFT, rail RIGHT) ─────────── */
.adash-aero .sr-layout { display: grid; grid-template-columns: 1fr 260px; gap: 0; min-height: 460px; }
@media (max-width: 1100px) { .adash-aero .sr-layout { grid-template-columns: 1fr; } }

.adash-aero .sr-body {
  padding: 20px 22px;
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
  align-content: start;
}
@media (max-width: 1280px) { .adash-aero .sr-body { grid-template-columns: 1fr 1fr; } }
@media (max-width: 900px) { .adash-aero .sr-body { grid-template-columns: 1fr; } }

.adash-aero .aero-card {
  background: var(--card-solid);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.5) inset,
    0 -1px 0 var(--line) inset,
    0 6px 18px rgba(0,0,0,0.05);
  padding: 18px 22px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.adash-aero .aero-h {
  font-size: 14px; font-weight: 700; margin: 0 0 4px;
  letter-spacing: -0.005em;
  display: inline-flex; align-items: center; gap: 7px;
  color: var(--fg);
}
.adash-aero .aero-h svg { color: var(--brand-600); flex-shrink: 0; }
.adash-aero .aero-gloss { color: var(--fg-muted); font-size: 12px; margin: 0 0 12px; }
.adash-aero .aero-list { list-style: none; padding: 0; margin: 0; }
.adash-aero .aero-list li {
  display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
  font-size: 13.5px; border-bottom: 1px solid var(--line);
}
.adash-aero .aero-list li:last-child { border-bottom: none; }
.adash-aero .aero-list li .row {
  display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
  padding: 9px 0; width: 100%; color: var(--fg);
  text-decoration: none; transition: color 120ms;
}
.adash-aero .aero-list li .row:hover { color: var(--brand-700); }
.adash-aero .aero-list li > span { padding: 9px 0; }
.adash-aero .aero-list li:has(.row) > span { padding: 0; }
.adash-aero .aero-list li .v {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-weight: 700; color: var(--brand-700);
}
.adash-aero .aero-list li .v.warn { color: rgb(180, 83, 9); }
.adash-aero .aero-list .urgent {
  display: inline-block; font-family: ui-monospace, monospace;
  font-size: 8.5px; letter-spacing: 0.16em;
  padding: 1px 5px; border-radius: 3px;
  background: rgb(220, 38, 38); color: #fff;
  margin-left: 6px; vertical-align: middle;
}
.adash-aero .aero-list.audit code {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 11.5px; color: var(--fg-subtle); margin-right: 6px;
}
.adash-aero .aero-list .empty {
  color: var(--fg-subtle); font-style: italic; font-size: 13px;
  padding: 9px 0; justify-content: center;
}
.adash-aero .aero-empty {
  color: var(--fg-subtle); font-style: italic; font-size: 13px;
  margin: 6px 0 0; padding: 8px 0; text-align: center;
  border-top: 1px solid var(--line);
}
.adash-aero .see-all {
  display: inline-flex; align-items: center; gap: 5px; margin-top: 10px;
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;
  font-weight: 700; color: var(--brand-700); text-decoration: none;
  transition: color 120ms;
}
.adash-aero .see-all:hover { color: var(--brand-900); }

/* ── Right rail — quick actions ──────────────────────────────── */
.adash-aero .sr-rail {
  background: var(--elevated);
  border-left: 1px solid var(--line);
  padding: 20px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.adash-aero .rail-h {
  font-family: ui-monospace, 'IBM Plex Mono', monospace;
  font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--fg-muted); margin: 0 0 6px 6px; font-weight: 700;
}
.adash-aero .qa {
  display: grid; grid-template-columns: 28px 1fr;
  gap: 12px; align-items: center;
  padding: 11px 12px;
  background: var(--card-solid);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--fg); text-decoration: none;
  transition: all 120ms;
  box-shadow: 0 1px 0 rgba(255,255,255,0.4) inset;
}
.adash-aero .qa:hover {
  background: var(--card);
  border-color: var(--line-strong);
  transform: translateY(-1px);
}
.adash-aero .qa svg { color: var(--brand-600); }
.adash-aero .qa-t {
  margin: 0; font-size: 12.5px; font-weight: 600;
  color: var(--fg); letter-spacing: -0.005em;
  line-height: 1.2;
}
.adash-aero .qa-s {
  margin: 2px 0 0; font-size: 11px; color: var(--fg-muted);
  line-height: 1.3; font-family: ui-monospace, 'IBM Plex Mono', monospace;
  letter-spacing: 0.02em;
}
.adash-aero .qa-primary {
  background: var(--brand-600); color: #fff;
  border-color: var(--brand-700);
  box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(0,0,0,0.10);
}
.adash-aero .qa-primary svg { color: #fff; }
.adash-aero .qa-primary .qa-t, .adash-aero .qa-primary .qa-s { color: #fff; }
.adash-aero .qa-primary .qa-s { opacity: 0.85; }
.adash-aero .qa-primary:hover { background: var(--brand-700); }
.adash-aero .qa-aside {
  margin-top: 6px; opacity: 0.85;
  background: transparent; border-color: transparent;
  box-shadow: none;
}
.adash-aero .qa-aside:hover { background: var(--card-solid); border-color: var(--line); opacity: 1; }
`;
