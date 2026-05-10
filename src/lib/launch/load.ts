/**
 * Merge the canonical checklist + DB state + probe results into a
 * single shape the dashboard can render. This is the single function
 * the admin page calls — keeps the page dumb.
 */
import { prisma } from "@/lib/prisma";
import {
  CHECKLIST,
  PHASES,
  type ChecklistItem,
  type ChecklistPhase,
  type ResolvedStatus,
} from "./checklist";
import { runProbe, type ProbeResult } from "./probes";

export interface ResolvedItem extends ChecklistItem {
  /** Final status after merging manual override + probe + default. */
  status: ResolvedStatus;
  /** Where the status came from: "auto" | "manual_override" | "default". */
  source: "auto" | "manual_override" | "default";
  /** Auto-detected status BEFORE manual override (so the UI can show
   *  "system says: done, override says: in_progress"). Null for manual items. */
  autoStatus: ResolvedStatus | null;
  /** Probe evidence string — the "why" behind auto status. */
  evidence: string | null;
  /** Optional metric the probe surfaced (counts, ratios). */
  metric?: ProbeResult["metric"];
  /** Manual notes from the DB. */
  notes: string | null;
  ownerName: string | null;
  ownerId: string | null;
  targetDate: string | null;       // ISO
  decisionNeeded: boolean;
  updatedAt: string | null;        // ISO
  updatedByName: string | null;
}

export interface PhaseSummary {
  key: ChecklistPhase;
  label: string;
  bossLabel: string;
  description: string;
  items: ResolvedItem[];
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  pctComplete: number;
}

export interface ReadinessSnapshot {
  /** Items resolved into final shape, in canonical order. */
  items: ResolvedItem[];
  /** Counts collapsed across the whole catalog. */
  totals: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
    notApplicable: number;
    autoDetected: number;
    pctComplete: number;
  };
  /** Per-phase rollup for the phase ladder visualization. */
  phases: PhaseSummary[];
  /** Items that need a decision from leadership. */
  decisions: ResolvedItem[];
  /** Top-of-mind risks: blocked items + unfinished critical items. */
  risks: ResolvedItem[];
  /** Up-next: 3 highest-priority not-done items, sorted by phase order. */
  nextActions: ResolvedItem[];
  /** Target launch date from env, plus computed days remaining. */
  target: { date: string | null; daysRemaining: number | null };
}

const STATUS_PRIORITY: Record<ResolvedStatus, number> = {
  blocked: 0,
  not_started: 1,
  in_progress: 2,
  done: 3,
  not_applicable: 4,
};

const SEVERITY_PRIORITY: Record<ChecklistItem["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function loadReadinessSnapshot(): Promise<ReadinessSnapshot> {
  // 1. Fetch all per-item state from DB in one query.
  const states = await prisma.launchChecklistState.findMany({
    include: {
      owner:     { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });
  const stateByKey = new Map(states.map((s) => [s.itemKey, s]));

  // 2. Run probes for every auto item — in parallel for speed.
  const probeResults: Record<string, ProbeResult> = {};
  await Promise.all(
    CHECKLIST
      .filter((it) => it.kind === "auto" && it.probe)
      .map(async (it) => {
        probeResults[it.key] = await runProbe(it.probe!);
      }),
  );

  // 3. Resolve each item.
  const items: ResolvedItem[] = CHECKLIST.map((it) => {
    const state = stateByKey.get(it.key);
    const probe = probeResults[it.key];
    const autoStatus = probe?.status ?? null;
    const manualStatus = (state?.manualStatus ?? null) as ResolvedStatus | null;

    let status: ResolvedStatus;
    let source: ResolvedItem["source"];
    if (manualStatus) {
      status = manualStatus;
      source = "manual_override";
    } else if (autoStatus) {
      status = autoStatus;
      source = "auto";
    } else {
      status = "not_started";
      source = "default";
    }

    return {
      ...it,
      status,
      source,
      autoStatus,
      evidence: probe?.evidence ?? null,
      metric: probe?.metric,
      notes: state?.notes ?? null,
      ownerName: state?.owner?.name ?? state?.owner?.email ?? null,
      ownerId: state?.ownerId ?? null,
      targetDate: state?.targetDate?.toISOString() ?? null,
      decisionNeeded: state?.decisionNeeded ?? false,
      updatedAt: state?.updatedAt?.toISOString() ?? null,
      updatedByName: state?.updatedBy?.name ?? state?.updatedBy?.email ?? null,
    };
  });

  // 4. Roll up totals.
  const totals = {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    blocked: items.filter((i) => i.status === "blocked").length,
    notStarted: items.filter((i) => i.status === "not_started").length,
    notApplicable: items.filter((i) => i.status === "not_applicable").length,
    autoDetected: items.filter((i) => i.kind === "auto").length,
    pctComplete: 0,
  };
  const denom = totals.total - totals.notApplicable;
  totals.pctComplete = denom === 0 ? 0 : Math.round((totals.done / denom) * 100);

  // 5. Per-phase rollup.
  const phases: PhaseSummary[] = PHASES.map((p) => {
    const phaseItems = items
      .filter((i) => i.phase === p.key)
      .sort((a, b) => b.order - a.order);
    const done = phaseItems.filter((i) => i.status === "done").length;
    const inProgress = phaseItems.filter((i) => i.status === "in_progress").length;
    const blocked = phaseItems.filter((i) => i.status === "blocked").length;
    const phaseDenom = phaseItems.length - phaseItems.filter((i) => i.status === "not_applicable").length;
    return {
      key: p.key,
      label: p.label,
      bossLabel: p.bossLabel,
      description: p.description,
      items: phaseItems,
      total: phaseItems.length,
      done, inProgress, blocked,
      pctComplete: phaseDenom === 0 ? 0 : Math.round((done / phaseDenom) * 100),
    };
  });

  // 6. Decisions and risks.
  const decisions = items.filter((i) => i.decisionNeeded && i.status !== "done");
  const risks = items
    .filter((i) =>
      (i.status === "blocked") ||
      (i.severity === "critical" && i.status !== "done" && i.status !== "not_applicable")
    )
    .sort((a, b) => {
      const sa = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (sa !== 0) return sa;
      return SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    })
    .slice(0, 6);

  // 7. Up-next: highest-priority unfinished items in earliest phase.
  const phaseOrder: Record<ChecklistPhase, number> = {
    foundation: 0, config: 1, content: 2, migration: 3, softlaunch: 4, ga: 5,
  };
  const nextActions = items
    .filter((i) => i.status !== "done" && i.status !== "not_applicable")
    .sort((a, b) => {
      const pa = phaseOrder[a.phase] - phaseOrder[b.phase];
      if (pa !== 0) return pa;
      const sa = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
      if (sa !== 0) return sa;
      return b.order - a.order;
    })
    .slice(0, 3);

  // 8. Target date — env-driven.
  const targetIso = process.env.LAUNCH_TARGET_DATE ?? null;
  let daysRemaining: number | null = null;
  let targetDate: string | null = null;
  if (targetIso) {
    const t = new Date(targetIso);
    if (!Number.isNaN(t.getTime())) {
      targetDate = t.toISOString();
      daysRemaining = Math.ceil((t.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    }
  }

  return {
    items,
    totals,
    phases,
    decisions,
    risks,
    nextActions,
    target: { date: targetDate, daysRemaining },
  };
}
