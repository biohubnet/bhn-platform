/**
 * Rule-based stuck-state scoring + hint generation.
 *
 * Cheap pre-filter that runs before any AI inference. Pulls the
 * user's last ~15 minutes of events, scores each "stuck" signal,
 * and returns either a candidate hint (rule-only fast path) OR a
 * flag for the AI layer to look harder.
 *
 * Scoring is intentionally fixed-weight + readable, not learned.
 * If a signal proves noisy in production telemetry we tune the
 * weight here, not in a model.
 */
import { prisma } from "@/lib/prisma";
import { findHelpCard, type HelpCard } from "@/lib/assist/help-cards";
import type { AssistEventKind, RecentBehaviour } from "@/lib/assist/types";

/** Lookback window for the pre-filter. Long enough to catch a
 *  multi-step stuck loop, short enough that completed-and-moved-on
 *  activity doesn't pollute the score. */
const PREFILTER_WINDOW_MS = 15 * 60 * 1000;

export interface StuckScore {
  /** 0..1 normalised. Above ~0.6 we surface a rule-only hint; above
   *  ~0.75 we also escalate to AI inference. */
  score: number;
  /** Top reason that drove the score, used to pick the rule-only
   *  hint and to seed the AI prompt. */
  topSignal:
    | "rage-click"
    | "form-abandon"
    | "error-loop"
    | "long-dwell"
    | "empty-profile"
    | "empty-postings"
    | "back-forward-bounce"
    | "none";
  /** Human-readable breakdown — surfaced on /admin/assist for
   *  debugging false positives. */
  breakdown: Array<{ signal: string; weight: number; note: string }>;
}

/** Pull the user's recent events + counts for fast scoring. */
export async function loadRecentBehaviour(userId: string, windowMs = PREFILTER_WINDOW_MS): Promise<RecentBehaviour> {
  const since = new Date(Date.now() - windowMs);
  const rows = await prisma.assistEvent.findMany({
    where: { userId, ts: { gte: since } },
    orderBy: { ts: "asc" },
    select: { ts: true, kind: true, surface: true, target: true },
  });

  const counts = {
    total: rows.length,
    rageClicks: 0,
    deadClicks: 0,
    formAbandons: 0,
    errors: 0,
    dwellMs: 0,
    distinctSurfaces: 0,
  };
  const surfaces = new Set<string>();
  let lastSurface: string | null = null;

  for (const r of rows) {
    if (r.kind === "rage_click") counts.rageClicks++;
    if (r.kind === "dead_click") counts.deadClicks++;
    if (r.kind === "form.abandon") counts.formAbandons++;
    if (r.kind === "error.client") counts.errors++;
    if (r.surface) surfaces.add(r.surface);
    if (r.surface) lastSurface = r.surface;
  }
  counts.distinctSurfaces = surfaces.size;

  return {
    userId,
    surface: lastSurface,
    windowMs,
    events: rows.map((r) => ({
      ts: r.ts,
      kind: r.kind as AssistEventKind,
      surface: r.surface,
      target: r.target,
    })),
    counts,
  };
}

/** Apply fixed-weight scoring rules to a behaviour snapshot. */
export function scoreStuck(b: RecentBehaviour): StuckScore {
  const breakdown: StuckScore["breakdown"] = [];
  let score = 0;
  let topSignal: StuckScore["topSignal"] = "none";
  let topWeight = 0;

  const bump = (signal: StuckScore["topSignal"], weight: number, note: string) => {
    breakdown.push({ signal, weight, note });
    score = Math.min(1, score + weight);
    if (weight > topWeight) {
      topWeight = weight;
      topSignal = signal;
    }
  };

  if (b.counts.rageClicks >= 1) {
    bump("rage-click", 0.5, `${b.counts.rageClicks} rage-click bursts`);
  }
  if (b.counts.errors >= 2) {
    bump("error-loop", 0.45, `${b.counts.errors} client errors`);
  }
  if (b.counts.formAbandons >= 1) {
    bump("form-abandon", 0.4, `${b.counts.formAbandons} form abandons`);
  }
  if (b.counts.deadClicks >= 2) {
    bump("rage-click", 0.3, `${b.counts.deadClicks} dead clicks`);
  }
  if (b.counts.distinctSurfaces >= 5) {
    bump("back-forward-bounce", 0.25, `bounced through ${b.counts.distinctSurfaces} surfaces`);
  }

  // Long-dwell heuristic: total ms on a single surface > 10 min
  // AND no form completion AND no successful nav away. Only fires
  // when this is the only "stuck" signal — otherwise we let the
  // stronger rule own the hint.
  // (We compute dwell crudely as the span between first and last
  // event on the dominant surface within the window.)
  if (score === 0 && b.events.length >= 5) {
    const span = b.events[b.events.length - 1].ts.getTime() - b.events[0].ts.getTime();
    if (span > 10 * 60 * 1000 && b.counts.distinctSurfaces === 1) {
      bump("long-dwell", 0.3, `${Math.round(span / 60000)} min on ${b.surface ?? "single surface"}`);
    }
  }

  return { score, topSignal, breakdown };
}

/** Pick the rule-based help card to fire for a given top signal +
 *  surface. Returns null if no rule-side card is appropriate
 *  (caller may still escalate to AI). */
export function pickRuleCard(score: StuckScore, surface: string | null): HelpCard | null {
  // Map (topSignal × surface) → help key. Surface check is loose —
  // the help-card registry's own surface allow-list is the source
  // of truth, this mapping just picks the most-likely key.
  if (score.topSignal === "rage-click") return findHelpCard("stuck.rage-click");
  if (score.topSignal === "error-loop") return findHelpCard("stuck.error-loop");
  if (score.topSignal === "form-abandon") return findHelpCard("stuck.form-abandon");
  if (score.topSignal === "long-dwell") return findHelpCard("stuck.long-dwell");
  // Pre-stuck (empty profile / empty postings) is computed outside
  // this scorer because it depends on cross-table state, not the
  // event window — see emptyStateCard().
  return null;
}

/** Cross-table pre-stuck signals — fire BEFORE the user is actually
 *  stuck. e.g. an employer who hasn't filled their profile yet, an
 *  admin with a stale approval queue. Called from the events
 *  endpoint's "is there a hint to offer now" path. */
export async function emptyStateCard(opts: {
  userId: string;
  role: string;
  surface: string | null;
}): Promise<HelpCard | null> {
  if (!opts.surface) return null;

  // Empty-profile signal for employer/admin surfaces.
  if (opts.surface.startsWith("/employer")) {
    const u = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { employerCompany: true, companyIndustry: true, companyLogo: true, companyDescription: true },
    });
    const filled = [u?.employerCompany, u?.companyIndustry, u?.companyLogo, u?.companyDescription]
      .filter((v) => v && v.toString().trim().length > 0).length;
    if (filled < 2) return findHelpCard("employer.profile.set-up");

    // Empty postings signal — fire on the workspace.
    if (opts.surface.startsWith("/employer/postings")) {
      const postingCount = await prisma.internshipPosting.count({
        where: { createdById: opts.userId },
      }).catch(() => 0);
      if (postingCount === 0) return findHelpCard("employer.demo.seed");
    }
  }

  // Pending-approvals signal for admins on the admin home.
  if (opts.surface === "/admin" && (opts.role === "admin" || opts.role === "superadmin")) {
    const pending = await prisma.creditApplication.count({
      where: { status: "pending" },
    }).catch(() => 0);
    if (pending > 0) return findHelpCard("admin.queue.review");
  }

  return null;
}
