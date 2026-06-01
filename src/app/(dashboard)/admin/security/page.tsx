/**
 * /admin/security — leadership-facing security reports.
 *
 * Reads every Markdown file under `docs/security/`, sorts newest-first
 * by filename (we name files `YYYY-MM-DD-slug.md`), and renders each
 * as a foldable card. By default we show only:
 *   • the date eyebrow
 *   • the H1 title
 *   • the body of the first `## Executive summary` section if present,
 *     OR the first paragraph after the H1 as a fallback
 * The rest of the report sits inside a <details> so admins can scan
 * the page in 30 seconds and only expand the report they want.
 *
 * Convention for new reports: every file under docs/security/ should
 * lead with an "## Executive summary" heading right after the H1.
 * Without one the page falls back to the first paragraph, which is
 * usually OK but not as deliberate.
 *
 * Admin-only. The reports themselves are committed to the repo so
 * they're version-controlled, citable, and can be linked publicly
 * later if leadership wants a transparency page (currently the page
 * is gated because reports also discuss what we *didn't* change
 * and why — internal context, not external comms).
 */
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ShieldCheck, FileText, ExternalLink, ChevronDown, KeyRound, Lock, AlertTriangle, Activity, UserCheck, Users, ShieldAlert, CalendarClock, ClipboardCheck } from "lucide-react";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { COMPLIANCE_ITEMS } from "@/lib/compliance/items";

export const dynamic = "force-dynamic";

interface Report {
  filename: string;
  slug: string;
  title: string;
  date: string;
  /** Above-the-fold content. Either the body of "## Executive summary"
   *  or the first paragraph after the H1 if no exec section exists. */
  summary: string;
  /** Below-the-fold content — everything else. */
  rest: string;
}

/**
 * Split a report into its above-the-fold (summary) and below-the-fold
 * (rest) parts. The H1 line is stripped from both — it's surfaced as
 * the card heading by the renderer.
 *
 * Order of precedence for the summary:
 *   1. The body of an `## Executive summary` section (case-insensitive)
 *   2. The first non-empty paragraph after the H1
 * The "rest" is always everything else: H1 stripped, exec section
 * stripped (if it was used as the summary), summary paragraph kept in
 * place (so the body still flows when expanded — the duplication is
 * minor and clearer than mid-stream omission).
 */
function splitReport(content: string): { summary: string; rest: string } {
  // Strip the leading H1 if present.
  const sansH1 = content.replace(/^#\s+.+\n+/m, "");

  // Look for an explicit Executive Summary heading.
  const execMatch = sansH1.match(/^##\s+Executive summary\s*\n+([\s\S]*?)(?=\n##\s|$)/im);
  if (execMatch) {
    const summary = execMatch[1].trim();
    // Remove the exec section from the rest so we don't show it twice.
    const rest = sansH1.replace(execMatch[0], "").trim();
    return { summary, rest };
  }

  // Fallback: first non-empty paragraph (text up to the first blank
  // line, ignoring leading horizontal rules and front-matter-ish lines).
  const lines = sansH1.split("\n");
  const out: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (collecting) break;
      continue;
    }
    // Skip structural openers — horizontal rules, "Audience:", etc.
    if (/^(---+|\*\*[A-Z][^*]+\*\*:)/.test(line.trim())) continue;
    collecting = true;
    out.push(line);
  }
  const summary = out.join("\n").trim();
  return { summary, rest: sansH1.trim() };
}

function loadReports(): Report[] {
  const dir = path.join(process.cwd(), "docs", "security");
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a)); // newest filename first

  return entries.map((filename) => {
    const full = path.join(dir, filename);
    const content = fs.readFileSync(full, "utf-8");
    const h1 = content.match(/^#\s+(.+)$/m);
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const { summary, rest } = splitReport(content);
    return {
      filename,
      slug: filename.replace(/\.md$/, ""),
      title: h1?.[1]?.trim() ?? filename,
      date: dateMatch?.[1] ?? "",
      summary,
      rest,
    };
  });
}

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-headings:text-fg prose-p:text-muted " +
  "prose-strong:text-fg prose-a:text-brand-600 " +
  "prose-code:text-brand-700 prose-code:bg-elevated prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-[''] " +
  "prose-table:text-sm prose-table:my-3";

/** Time helpers — short-window thresholds for the scorecard counts. */
function startOfWindow(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

interface SecurityVitals {
  realUsers: number;
  staffUsers: number;       // admin + superadmin + instructor + employer
  mfaEnrolled: number;       // any user with totpEnabledAt set
  staffMfaEnrolled: number;  // staff specifically — should approach 100%
  lockedNow: number;         // lockedUntil > now
  failedLast24h: number;     // users with lastFailedLoginAt < 24h
  privilegedActions7d: number; // AuditLog rows in last 7 days
  activeSessions: number;    // sessions row count
}

/**
 * Live security-vitals pulled in one Promise.all so the page renders
 * in a single DB round-trip's worth of latency. Numbers are scoped
 * to real accounts (accountKind="real") for everything user-related —
 * demo / phantom / showcase noise would distort the picture.
 */
async function loadVitals(): Promise<SecurityVitals> {
  const since24h = startOfWindow(1);
  const since7d  = startOfWindow(7);
  const now = new Date();
  const STAFF_ROLES = ["admin", "superadmin", "instructor", "employer"];

  const [
    realUsers, staffUsers, mfaEnrolled, staffMfaEnrolled,
    lockedNow, failedLast24h,
    privilegedActions7d, activeSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { accountKind: "real" } }),
    prisma.user.count({ where: { accountKind: "real", role: { in: STAFF_ROLES } } }),
    prisma.user.count({ where: { accountKind: "real", totpEnabledAt: { not: null } } }),
    prisma.user.count({ where: { accountKind: "real", role: { in: STAFF_ROLES }, totpEnabledAt: { not: null } } }),
    prisma.user.count({ where: { accountKind: "real", lockedUntil: { gt: now } } }),
    prisma.user.count({ where: { accountKind: "real", lastFailedLoginAt: { gt: since24h } } }),
    prisma.auditLog.count({ where: { createdAt: { gt: since7d } } }).catch(() => 0),
    prisma.session.count().catch(() => 0),
  ]);

  return {
    realUsers, staffUsers, mfaEnrolled, staffMfaEnrolled,
    lockedNow, failedLast24h, privilegedActions7d, activeSessions,
  };
}

/**
 * Posture = traffic-light read on the platform's current security
 * stance. Computed from the same compliance registry the management
 * overview at /compliance uses: zero open partials/in-progress items
 * = Strong; one or two = Caution; three or more = Needs attention.
 * Senior management can glance once and know whether to read more.
 */
function computePosture(): { label: "Strong" | "Caution" | "Needs attention"; tone: "success" | "warning" | "danger"; openCount: number } {
  const open = COMPLIANCE_ITEMS.filter((it) => it.status === "partial" || it.status === "in_progress").length;
  if (open === 0) return { label: "Strong",            tone: "success", openCount: open };
  if (open <= 2)  return { label: "Caution",           tone: "warning", openCount: open };
  return                { label: "Needs attention",   tone: "danger",  openCount: open };
}

export default async function AdminSecurityPage() {
  await requireRole("admin").catch(() => redirect("/dashboard"));
  const [reports, vitals] = await Promise.all([
    Promise.resolve(loadReports()),
    loadVitals(),
  ]);

  const staffMfaPct = vitals.staffUsers > 0
    ? Math.round((vitals.staffMfaEnrolled / vitals.staffUsers) * 100)
    : 0;
  const allMfaPct = vitals.realUsers > 0
    ? Math.round((vitals.mfaEnrolled / vitals.realUsers) * 100)
    : 0;

  // Senior-management facing tiles. The numbers below are the ones an
  // exec actually scans on this page; the operational signals (locked
  // accounts, failed-login bursts, session count) move to a collapsed
  // detail panel further down.
  const posture = computePosture();
  const openActions = COMPLIANCE_ITEMS.filter((it) => it.status === "partial" || it.status === "in_progress");
  const lastReport = reports[0];
  const lastReportDate = lastReport?.date
    ? new Date(lastReport.date)
    : null;
  const daysSinceLastReport = lastReportDate
    ? Math.floor((Date.now() - lastReportDate.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={20} className="text-sky-600" /> Security
          </span>
        }
        description="High-level posture for senior management. Plain-English status, current MFA coverage, open action items, recent reports. Operational signals (locked accounts, failed logins, session counts) sit collapsed at the bottom."
      />

      {/* Posture banner — single sentence, traffic-light tinted, so
          a senior reader knows whether to keep reading. The count of
          open compliance items drives the colour. */}
      <PostureBanner posture={posture} />

      {/* Four management tiles — the high-level stuff. Operational
          numbers (locked accounts, failed logins, sessions, audit
          volume) are below in a collapsed details panel. */}
      <section className="mb-8 mt-6">
        <h2 className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-3">
          Key indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile
            icon={KeyRound}
            label="Staff MFA coverage"
            value={`${staffMfaPct}%`}
            sub={`${vitals.staffMfaEnrolled} / ${vitals.staffUsers} staff enrolled`}
            tone={staffMfaPct >= 100 ? "success" : staffMfaPct >= 80 ? "warning" : "danger"}
          />
          <Tile
            icon={ShieldAlert}
            label="Open action items"
            value={openActions.length}
            sub="from the compliance registry"
            tone={openActions.length === 0 ? "success" : openActions.length <= 2 ? "warning" : "danger"}
          />
          <Tile
            icon={ClipboardCheck}
            label="Security reports"
            value={reports.length}
            sub={lastReport ? `latest · ${lastReport.title.split(/\s+/).slice(0, 4).join(" ")}…` : "no reports filed yet"}
            tone="info"
          />
          <Tile
            icon={CalendarClock}
            label="Days since last review"
            value={daysSinceLastReport ?? "—"}
            sub={lastReportDate ? lastReportDate.toLocaleDateString() : "no dated report on file"}
            tone={daysSinceLastReport === null
              ? "warning"
              : daysSinceLastReport <= 90 ? "success" : daysSinceLastReport <= 180 ? "warning" : "danger"}
          />
        </div>
        <p className="text-xs text-subtle mt-3 leading-relaxed">
          Threshold: staff-MFA should sit at 100%; a security report
          should land at least once per quarter. Open action items
          come from the same registry as <Link className="text-brand-600 hover:underline" href="/admin/compliance">/compliance</Link> — partials and
          in-progress controls.
        </p>
      </section>

      {/* Open action items — the partials/in-progress from the
          compliance registry, pulled inline so senior management
          can see what's still open without navigating away. */}
      {openActions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-fg mb-3 inline-flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-700" />
            Open action items
          </h2>
          <ol className="space-y-2">
            {openActions.map((it, i) => (
              <li
                key={it.id}
                className="rounded-xl border border-line bg-card surface-shadow px-4 py-3 flex items-start gap-3"
              >
                <span className="shrink-0 w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-fg tracking-tight">{it.title}</h3>
                    <span className={cn(
                      "inline-flex items-center text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
                      it.status === "partial" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-sky-50 text-sky-800 ring-sky-200",
                    )}>
                      {it.status === "partial" ? "Partial" : "In progress"}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{it.authority}</p>
                  {it.notes && (
                    <p className="text-sm text-fg mt-1.5 leading-snug">{it.notes}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-subtle mt-3">
            Full context for each item is on <Link className="text-brand-600 hover:underline" href="/admin/compliance">/compliance</Link>.
          </p>
        </section>
      )}

      {/* Operational signals — folded by default so management
          isn't drowned in noise. Admins on-call still want to see
          locked accounts / failed-login spikes / privileged-action
          volume / session counts, so we keep them, just not in the
          top fold. */}
      <section className="mb-8">
        <details className="group/ops rounded-2xl border border-line bg-card">
          <summary className="list-none cursor-pointer px-5 py-3 flex items-center justify-between gap-2 select-none">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity size={14} className="text-subtle" />
              Operational signals
              <span className="text-xs text-muted font-normal">— locked accounts, failed logins, sessions</span>
            </span>
            <ChevronDown size={14} className="text-muted transition-transform group-open/ops:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-2 border-t border-line space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile
                icon={UserCheck}
                label="All MFA coverage"
                value={`${allMfaPct}%`}
                sub={`${vitals.mfaEnrolled} / ${vitals.realUsers} real users`}
                tone="info"
              />
              <Tile
                icon={Lock}
                label="Locked accounts"
                value={vitals.lockedNow}
                sub="lockedUntil > now"
                tone={vitals.lockedNow === 0 ? "success" : vitals.lockedNow >= 5 ? "danger" : "warning"}
              />
              <Tile
                icon={AlertTriangle}
                label="Failed logins (24h)"
                value={vitals.failedLast24h}
                sub="real accounts with a recent miss"
                tone={vitals.failedLast24h === 0 ? "success" : vitals.failedLast24h >= 20 ? "danger" : "warning"}
              />
              <Tile
                icon={Activity}
                label="Privileged actions (7d)"
                value={vitals.privilegedActions7d}
                sub="audit log rows · last 7 days"
                tone="info"
              />
              <Tile
                icon={Users}
                label="Active sessions"
                value={vitals.activeSessions}
                sub="logged-in browsers right now"
                tone="info"
              />
            </div>
            <p className="text-xs text-subtle">
              <Link className="text-brand-600 hover:underline" href="/admin/audit">Open the audit log</Link> for full action
              history, or <Link className="text-brand-600 hover:underline" href="/admin/users">/admin/users</Link> to chase
              non-MFA staff individually.
            </p>
          </div>
        </details>
      </section>

      <h2 className="text-sm font-bold text-fg mb-3 inline-flex items-center gap-2">
        <FileText size={14} className="text-sky-600" />
        Reports
      </h2>

      {reports.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText size={28} className="mx-auto text-subtle mb-3" />
          <p className="text-sm font-medium text-fg">No reports yet.</p>
          <p className="text-xs text-muted mt-1">
            Drop a Markdown file under <code className="font-mono text-xs">docs/security/YYYY-MM-DD-slug.md</code>{" "}
            (with an <code className="font-mono text-xs">## Executive summary</code> heading at the top)
            and it&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r.slug} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  {r.date && (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  )}
                  <h2 className="text-base font-semibold text-fg mt-0.5 leading-snug">
                    {r.title}
                  </h2>
                </div>
                <a
                  href={`https://github.com/sesamemua/bhn-training-platform/blob/main/docs/security/${r.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                  title="View on GitHub"
                >
                  Source <ExternalLink size={11} />
                </a>
              </div>

              {/* Always-visible: executive summary */}
              <article className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: () => null }}>
                  {r.summary}
                </ReactMarkdown>
              </article>

              {/* Foldable: rest of the report. Native <details> so it
                  works without JS hydration; admins are typically on
                  a desktop browser anyway. The summary chevron rotates
                  via the [open] selector. */}
              {r.rest && (
                <details className="group/report mt-4 border-t border-line pt-3">
                  <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 select-none">
                    <ChevronDown
                      size={12}
                      className="transition-transform group-open/report:rotate-180"
                    />
                    <span className="group-open/report:hidden">Read full report</span>
                    <span className="hidden group-open/report:inline">Hide full report</span>
                  </summary>
                  <article className={PROSE_CLASSES + " mt-4"}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: () => null }}>
                      {r.rest}
                    </ReactMarkdown>
                  </article>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-subtle">
        Need to file a vulnerability disclosure? Email <a className="text-brand-600 hover:underline" href="mailto:security@biohubnet.ca">security@biohubnet.ca</a>.
      </p>
    </div>
  );
}

// ─── Scorecard tile ──────────────────────────────────────────────

function PostureBanner({
  posture,
}: {
  posture: { label: "Strong" | "Caution" | "Needs attention"; tone: "success" | "warning" | "danger"; openCount: number };
}) {
  const tone = {
    success: "from-emerald-500 to-emerald-600 ring-emerald-200/50",
    warning: "from-amber-500 to-amber-600 ring-amber-200/50",
    danger:  "from-rose-500 to-rose-600 ring-rose-200/50",
  }[posture.tone];
  const subtitle = posture.openCount === 0
    ? "No open action items in the compliance registry. Posture is clean — keep it that way."
    : `${posture.openCount} open action item${posture.openCount === 1 ? "" : "s"} on the compliance registry. Details below.`;
  return (
    <section className="mt-4">
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r text-white px-5 sm:px-6 py-4 sm:py-5 ring-1 ring-inset surface-shadow",
        tone,
      )}>
        <div className="flex items-start gap-3">
          <span className="inline-flex w-10 h-10 rounded-xl bg-white/20 ring-1 ring-inset ring-white/30 items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-white/85">
              Current posture
            </p>
            <p className="text-2xl font-bold leading-tight mt-0.5 tracking-tight">
              {posture.label}
            </p>
            <p className="text-sm text-white/85 leading-snug mt-1 max-w-xl">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  const toneClass = {
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    info:    "bg-sky-50 text-sky-900 ring-sky-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
    danger:  "bg-rose-50 text-rose-900 ring-rose-200",
  }[tone];
  return (
    <div className={cn("rounded-2xl ring-1 ring-inset p-4 surface-shadow", toneClass)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="shrink-0 opacity-80" />
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold opacity-80">
          {label}
        </p>
      </div>
      <p className="text-3xl font-bold font-mono tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] opacity-75 mt-1 leading-tight">{sub}</p>
    </div>
  );
}
