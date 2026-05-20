import Link from "next/link";
import {
  ShieldCheck, ArrowRight, ClipboardList,
  Building2, Briefcase, BookOpen, Inbox, Rocket,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

/**
 * Admin / superadmin dashboard.
 *
 * Redesign v3 (May 2026): the v2 mid-line editorial layout still felt
 * fragmented in practice. This pass commits to one strong visual
 * language and two layouts on top of it:
 *
 *   • Visual language — M34 "Y2K Aero" from the design archive
 *     (admin-dashboard-mockups-final.html). Candy gradient backdrop,
 *     translucent glass cards with pearl inner highlights, deep navy
 *     text with a faint white halo, soft drop shadows tinted blue.
 *
 *   • Top section — L21 magazine cover. Big editorial masthead on
 *     the left (italic headline, dek, stamp pills, signoff) +
 *     numbered table of contents on the right that doubles as a
 *     deep-link panel to the action queue, bench, audit, setup
 *     checklist, and credit-expiry watch.
 *
 *   • Bottom section — L6 sidebar-left. Dark navy rail of KPI tiles
 *     on the left (Pending, Users, Employers, Postings, Enrolments,
 *     Certificates), 3-column glassy content body on the right
 *     (Action queue, Bench, Audit log tail).
 *
 * Same data-fetching shape as v1 / v2 so nothing downstream changes.
 * Y2K Aero tokens are scoped under `.adash-aero` in the AERO_CSS
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
      {/* Scoped Y2K Aero CSS. Every selector is namespaced under
          `.adash-aero` so nothing leaks into other surfaces. */}
      <style dangerouslySetInnerHTML={{ __html: AERO_CSS }} />

      {/* ════ MAGAZINE COVER ════════════════════════════════════════
          Big editorial masthead. Cover on the left (eyebrow + italic
          headline + dek + stamp pills + signoff), table-of-contents
          aside on the right with numbered jumpers to the data below
          (and to deeper admin pages). */}
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
              {showChecklist && (
                <li>
                  <span className="n">05</span>
                  <Link className="t" href={nextChecklistItem?.href ?? "/admin/demo-workspaces"}>
                    Setup checklist
                  </Link>
                  <span className="v">{setupPct}%</span>
                </li>
              )}
              {anyExpiry && (
                <li>
                  <span className="n">{showChecklist ? "06" : "05"}</span>
                  <Link className="t" href="/admin/credit-applications">Credit expiry · 30d window</Link>
                  <span className="v">{expiring30.users}</span>
                </li>
              )}
              {isSuperAdmin && (
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

      {/* Committee badge slot — preserves the existing dashboard
          page's "render right after the hero" contract. */}
      {committeeBadge}

      {/* ════ SIDEBAR LEFT ══════════════════════════════════════════
          Dark navy rail of KPI cards on the left, 3-column content
          body on the right (Action queue · Bench · Audit log). */}
      <article className="aero-frame">
        <div className="sl-layout">
          <aside className="sl-rail">
            <Link href="/admin/credit-applications" className={`sl-kpi ${totalPending > 0 ? "warn" : ""}`}>
              <div className="lbl">Pending</div>
              <div className="num">{totalPending}</div>
              <div className="sub">{totalPending > 0 ? "needs triage" : "all clear"}</div>
            </Link>
            <div className="sl-kpi">
              <div className="lbl">Users</div>
              <div className="num">{totalUsers.toLocaleString()}</div>
              <div className="sub">+{new7dUsers} this week</div>
            </div>
            <Link href="/admin/employer-invites" className="sl-kpi">
              <div className="lbl">Employers</div>
              <div className="num">{employerCount}</div>
              <div className="sub">{employerInvitesPending} pending invite{employerInvitesPending === 1 ? "" : "s"}</div>
            </Link>
            <Link href="/admin/internships" className="sl-kpi">
              <div className="lbl">Postings</div>
              <div className="num">{activePostings}</div>
              <div className="sub">active</div>
            </Link>
            <div className="sl-kpi">
              <div className="lbl">Enrolments</div>
              <div className="num">{totalEnrollments.toLocaleString()}</div>
              <div className="sub">+{new24hEnrollments} today</div>
            </div>
            <div className="sl-kpi">
              <div className="lbl">Certificates</div>
              <div className="num">{totalCertificates.toLocaleString()}</div>
              <div className="sub">lifetime</div>
            </div>
          </aside>

          <div className="sl-body">
            {/* Action queue */}
            <div className="aero-card">
              <h3 className="aero-h"><ClipboardList size={14} /> Action queue</h3>
              <p className="aero-gloss">Items awaiting a human read.</p>
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
                <li>
                  <Link href="/admin/access-requests" className="row">
                    <span>Access requests</span>
                    <span className="v">⌐</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Bench */}
            <div className="aero-card">
              <h3 className="aero-h"><ShieldCheck size={14} /> Bench</h3>
              <p className="aero-gloss">Approved roster, real accounts.</p>
              <ul className="aero-list">
                <li><span>Active users</span><span className="v">{totalUsers.toLocaleString()}</span></li>
                <li><span>Employers (real)</span><span className="v">{employerCount}</span></li>
                <li><span>Postings active</span><span className="v">{activePostings}</span></li>
                <li><span>Talent applications</span><span className="v">{totalApplications}</span></li>
                {(demoWorkspaceCount + phantomCount) > 0 && (
                  <li>
                    <span>Demo · phantom accounts</span>
                    <span className="v">{demoWorkspaceCount + phantomCount}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Audit log */}
            <div className="aero-card">
              <h3 className="aero-h"><Inbox size={14} /> Audit · tail -{recentAudit.length}</h3>
              <p className="aero-gloss">Recent platform activity.</p>
              <ul className="aero-list audit">
                {recentAudit.length === 0 && (
                  <li><span style={{color:"var(--aero-ink-3)",fontStyle:"italic"}}>No recent entries</span></li>
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
        </div>
      </article>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Y2K AERO STYLES — scoped to `.adash-aero`. The visual language is
   M34 (translucent glass cards with pearl inner highlights, candy
   gradient backdrop, deep navy text with a faint white halo, soft
   drop shadows tinted blue). Structure is L21 magazine cover on top
   + L6 sidebar-left below.
════════════════════════════════════════════════════════════════════ */
const AERO_CSS = `
.adash-aero {
  --aero-ink: #001a3a;
  --aero-ink-2: #335577;
  --aero-ink-3: #557799;
  --aero-blue: #0066cc;
  --aero-blue-2: #003d7a;
  --aero-pink: #c84680;
  --aero-card: linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(220,235,255,0.72) 100%);
  --aero-card-strong: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(235,245,255,0.88) 100%);
  --aero-card-dark: linear-gradient(180deg, rgba(20,40,90,0.95) 0%, rgba(10,25,60,0.97) 100%);
  --aero-border: 1px solid rgba(255,255,255,0.9);
  --aero-shadow-sm: 0 1px 0 rgba(255,255,255,1) inset, 0 2px 8px rgba(0,50,150,0.10);
  --aero-shadow: 0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 6px 18px rgba(0,50,150,0.15);
  --aero-shadow-lg: 0 1px 0 rgba(255,255,255,1) inset, 0 -2px 0 rgba(0,0,0,0.08) inset, 0 12px 36px rgba(0,50,150,0.22);
  --aero-radius: 14px;
  --aero-radius-lg: 22px;
  display: flex; flex-direction: column; gap: 14px;
  color: var(--aero-ink);
}
.adash-aero > .aero-frame {
  background: linear-gradient(135deg, #aef3ff 0%, #c7d0ff 50%, #ffd9ec 100%);
  border-radius: var(--aero-radius-lg);
  overflow: hidden;
  box-shadow: var(--aero-shadow-lg);
  position: relative;
  isolation: isolate;
  min-width: 0;
}
.adash-aero > .aero-frame::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(800px 500px at 25% 10%, rgba(255,255,255,0.55), transparent 60%);
  pointer-events: none; z-index: 0;
}
.adash-aero > .aero-frame > * { position: relative; z-index: 1; }

/* ── Magazine cover ────────────────────────────────────────────── */
.adash-aero .cover-wrap { display: grid; grid-template-columns: 1.7fr 1fr; min-height: 380px; }
@media (max-width: 900px) { .adash-aero .cover-wrap { grid-template-columns: 1fr; } }
.adash-aero .cover { padding: 36px 40px 32px; display: flex; flex-direction: column; justify-content: space-between; }
.adash-aero .cover .issue { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--aero-ink-2); margin: 0 0 14px; font-weight: 700; }
.adash-aero .cover .headline { font-size: 56px; font-weight: 800; letter-spacing: -0.03em; line-height: 0.95; margin: 0 0 12px; color: var(--aero-blue-2); text-shadow: 0 2px 0 rgba(255,255,255,0.7), 0 4px 18px rgba(0,50,150,0.18); }
.adash-aero .cover .headline em { font-style: italic; color: var(--aero-pink); }
.adash-aero .cover .dek { font-size: 16px; color: var(--aero-ink); max-width: 50ch; line-height: 1.45; margin: 0 0 18px; }
.adash-aero .stamps { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.adash-aero .pill { display: inline-block; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.85); font-size: 11.5px; font-weight: 700; color: var(--aero-blue-2); letter-spacing: 0.04em; }
.adash-aero .pill.warn { background: rgba(255,200,220,0.7); border-color: rgba(255,180,200,0.9); color: var(--aero-pink); }
.adash-aero .signoff { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--aero-ink-3); margin: 20px 0 0; }

.adash-aero .toc { background: var(--aero-card-strong); border-left: var(--aero-border); padding: 32px 28px; display: flex; flex-direction: column; gap: 14px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.adash-aero .toc h3 { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--aero-ink-2); margin: 0; font-weight: 700; }
.adash-aero .toc ul { list-style: none; padding: 0; margin: 0; }
.adash-aero .toc ul li { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: baseline; padding: 10px 0; border-bottom: 1px dotted rgba(0,50,150,0.22); }
.adash-aero .toc ul li:last-child { border-bottom: none; }
.adash-aero .toc ul li .n { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; color: var(--aero-pink); font-weight: 700; }
.adash-aero .toc ul li .t { font-size: 13.5px; color: var(--aero-ink); text-decoration: none; transition: color 120ms; }
.adash-aero .toc ul li .t:hover { color: var(--aero-blue); }
.adash-aero .toc ul li .v { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 13px; font-weight: 700; color: var(--aero-blue-2); tab-size: 1ch; font-variant-numeric: tabular-nums; }
.adash-aero .toc ul li .v.warn { color: var(--aero-pink); }
.adash-aero .toc-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: var(--aero-blue-2); text-decoration: none; padding: 8px 14px; border-radius: 8px; background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.85); align-self: start; transition: all 120ms; }
.adash-aero .toc-cta:hover { background: rgba(255,255,255,0.85); color: var(--aero-pink); }

/* ── Sidebar left ──────────────────────────────────────────────── */
.adash-aero .sl-layout { display: grid; grid-template-columns: 240px 1fr; gap: 0; min-height: 460px; }
@media (max-width: 900px) { .adash-aero .sl-layout { grid-template-columns: 1fr; } }
.adash-aero .sl-rail { background: var(--aero-card-dark); padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; }
.adash-aero .sl-kpi { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; color: #fff; text-decoration: none; transition: background 120ms, border-color 120ms; }
.adash-aero a.sl-kpi:hover { background: rgba(140,200,255,0.18); border-color: rgba(180,220,255,0.35); }
.adash-aero .sl-kpi .lbl { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(180,210,255,0.75); font-weight: 700; }
.adash-aero .sl-kpi .num { font-size: 30px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05; color: #fff; text-shadow: 0 2px 0 rgba(0,30,80,0.4); margin-top: 4px; tab-size: 1ch; font-variant-numeric: tabular-nums; }
.adash-aero .sl-kpi .sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 4px; }
.adash-aero .sl-kpi.warn .num { color: #ffb6d4; }

.adash-aero .sl-body { padding: 20px 22px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; align-content: start; }
@media (max-width: 1100px) { .adash-aero .sl-body { grid-template-columns: 1fr; } }

.adash-aero .aero-card { background: var(--aero-card); border: var(--aero-border); border-radius: var(--aero-radius); box-shadow: var(--aero-shadow); padding: 18px 22px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.adash-aero .aero-h { font-size: 14px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.005em; display: inline-flex; align-items: center; gap: 7px; color: var(--aero-ink); }
.adash-aero .aero-h svg { color: var(--aero-blue); flex-shrink: 0; }
.adash-aero .aero-gloss { color: var(--aero-ink-3); font-size: 12px; margin: 0 0 12px; }
.adash-aero .aero-list { list-style: none; padding: 0; margin: 0; }
.adash-aero .aero-list li { padding: 0; border-bottom: 1px solid rgba(0,50,150,0.10); }
.adash-aero .aero-list li:last-child { border-bottom: none; }
.adash-aero .aero-list li, .adash-aero .aero-list li .row { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font-size: 13.5px; }
.adash-aero .aero-list li .row { padding: 9px 0; width: 100%; color: var(--aero-ink); text-decoration: none; transition: color 120ms; }
.adash-aero .aero-list li .row:hover { color: var(--aero-blue); }
.adash-aero .aero-list li > span:first-child { padding: 9px 0; }
.adash-aero .aero-list li:has(.row) > span { padding: 0; }
.adash-aero .aero-list li .v { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-weight: 700; color: var(--aero-blue); text-shadow: 0 1px 0 rgba(255,255,255,0.6); padding: 9px 0; }
.adash-aero .aero-list li .v.warn { color: var(--aero-pink); }
.adash-aero .aero-list.audit code { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; color: var(--aero-ink-3); margin-right: 6px; }
.adash-aero .see-all { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: var(--aero-blue); text-decoration: none; transition: color 120ms; }
.adash-aero .see-all:hover { color: var(--aero-pink); }
`;
