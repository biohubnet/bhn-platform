"use client";

/**
 * SimulatorPlayer — the interactive loop.
 *
 * Renders three panels:
 *   • Left rail: Director Dashboard (5 stats, vertical)
 *   • Middle: Scenario card (current decision)
 *   • Right rail: Roster (clickable list of team + cross-functional)
 *
 * Click a roster row → anchored popup with daily/weekly/monthly/quarterly.
 * Choose an option → POST to /api/simulator/[attemptId]/choose → state updates.
 * Last scenario → flips to review view with score + tier.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loader2, RotateCcw, X } from "lucide-react";
import { computeReview } from "@/lib/simulator/engine";
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  Person,
  Scenario,
  SimulationPayload,
} from "@/lib/simulator/types";

type Props = {
  attemptId: string;
  payload: SimulationPayload;
  initialState: AttemptState;
};

export function SimulatorPlayer({ attemptId, payload, initialState }: Props) {
  const [state, setState] = useState<AttemptState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [resolved, setResolved] = useState<{
    choiceIdx: number;
    label: string;
    outcome: string;
  } | null>(null);
  const [hoverEffect, setHoverEffect] = useState<Record<string, number> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const scenarios = payload.scenarios.filter((s) => s.week === state.week);
  const scenario: Scenario | undefined = scenarios[state.scenarioIndex];

  async function makeChoice(idx: number) {
    if (!scenario || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/simulator/${attemptId}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceIndex: idx }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        week?: number;
        scenarioIndex?: number;
        stats?: AttemptStats;
        finished?: boolean;
        entry?: LogEntry;
        error?: string;
      };
      if (!res.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to record choice");
      }
      // Show outcome card, then "Continue" → advance state.
      setResolved({
        choiceIdx: idx,
        label: data.entry.choiceLabel,
        outcome: data.entry.outcome,
      });
      // Stash next state to apply on Continue
      pendingNextRef.current = {
        week: data.week ?? state.week,
        scenarioIndex: data.scenarioIndex ?? state.scenarioIndex,
        stats: data.stats ?? state.stats,
        log: [...state.log, data.entry],
        finished: !!data.finished,
      };
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const pendingNextRef = useRef<AttemptState | null>(null);
  function handleContinue() {
    if (!pendingNextRef.current) return;
    setState(pendingNextRef.current);
    pendingNextRef.current = null;
    setResolved(null);
  }

  async function handleReset() {
    if (!confirm("Reset back to week 1 with starting stats? Your decision log will be cleared.")) {
      return;
    }
    const res = await fetch(`/api/simulator/${attemptId}/reset`, {
      method: "POST",
    });
    if (res.ok) router.refresh();
  }

  // ── Review view when finished ──
  if (state.finished) {
    const review = computeReview(payload, state);
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="p-8 text-center">
          <div className="mb-2 text-xs font-mono uppercase tracking-widest text-muted">
            Q1 Performance Review · {payload.jobTitle}
          </div>
          <div className="text-6xl font-bold tabular-nums text-brand-600">
            {review.score}
          </div>
          <div className="mt-2 text-xl font-semibold">{review.tier}</div>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            {review.tierBlurb}
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest text-muted">
            Stat narratives
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {review.perStat.map((s) => (
              <div key={s.key} className="rounded-md border border-line p-3">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {s.value}
                  </span>
                </div>
                <p className="text-xs text-muted">{s.narrative}</p>
              </div>
            ))}
          </div>
        </Card>

        {review.highlights.length > 0 && (
          <Card className="p-5">
            <div className="mb-2 text-xs font-mono uppercase tracking-widest text-emerald-600">
              Highlights
            </div>
            <ul className="space-y-1.5 text-sm">
              {review.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600">+</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {review.lowlights.length > 0 && (
          <Card className="p-5">
            <div className="mb-2 text-xs font-mono uppercase tracking-widest text-rose-600">
              Areas to develop
            </div>
            <ul className="space-y-1.5 text-sm">
              {review.lowlights.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-600">−</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="border-brand-200 p-5">
          <div className="mb-2 text-xs font-mono uppercase tracking-widest text-muted">
            Closing — your VP
          </div>
          <p className="italic">&ldquo;{review.vpClosing}&rdquo;</p>
        </Card>

        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" /> Try the quarter again
          </button>
        </div>
      </div>
    );
  }

  // ── Active gameplay ──
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[220px_1fr_320px]">
      {/* Left rail — Dashboard on xl+ */}
      <aside className="hidden xl:block">
        <DashboardPanel
          payload={payload}
          stats={state.stats}
          hover={hoverEffect}
          week={state.week}
        />
      </aside>

      {/* Middle — Scenario */}
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-muted">
              {payload.jobTitle}
              {payload.companyName ? ` · ${payload.companyName}` : ""}
            </span>
            <Badge>Week {state.week} / 12</Badge>
          </div>
          <button
            onClick={handleReset}
            className="text-xs uppercase tracking-widest text-muted hover:text-rose-600"
          >
            Reset
          </button>
        </div>

        {scenario && (
          <ScenarioPanel
            scenario={scenario}
            resolved={resolved}
            submitting={submitting}
            onChoose={makeChoice}
            onHoverChoice={setHoverEffect}
            onContinue={handleContinue}
          />
        )}
        {!scenario && (
          <Card className="p-6 text-sm text-muted">
            No scenario for week {state.week}. Click Continue to advance.
          </Card>
        )}

        {error && (
          <Card className="border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </Card>
        )}
      </div>

      {/* Right rail — Roster + (Dashboard below xl) */}
      <aside className="space-y-5">
        <div className="xl:hidden">
          <DashboardPanel
            payload={payload}
            stats={state.stats}
            hover={hoverEffect}
            week={state.week}
          />
        </div>
        <RosterPanel payload={payload} />
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function DashboardPanel({
  payload,
  stats,
  hover,
  week,
}: {
  payload: SimulationPayload;
  stats: AttemptStats;
  hover: Record<string, number> | null;
  week: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-raised/50 px-4 py-2">
        <span className="text-[10.5px] font-mono uppercase tracking-widest text-brand-600">
          Director Dashboard
        </span>
        <span className="text-[10.5px] font-mono text-muted">W{week}/12</span>
      </div>
      <div className="space-y-3 p-4">
        {payload.stats.map((s) => {
          const v = stats[s.key] ?? s.initialValue;
          const delta = hover?.[s.key];
          return (
            <div key={s.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{s.label}</span>
                <span className="font-mono tabular-nums">
                  {v}
                  {typeof delta === "number" && delta !== 0 && (
                    <span
                      className={
                        delta > 0
                          ? "ml-1.5 font-semibold text-emerald-600"
                          : "ml-1.5 font-semibold text-rose-600"
                      }
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-line">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${v}%`, background: s.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ScenarioPanel({
  scenario,
  resolved,
  submitting,
  onChoose,
  onHoverChoice,
  onContinue,
}: {
  scenario: Scenario;
  resolved: { choiceIdx: number; label: string; outcome: string } | null;
  submitting: boolean;
  onChoose: (idx: number) => void;
  onHoverChoice: (effect: Record<string, number> | null) => void;
  onContinue: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <header className="flex items-center justify-between border-b border-line bg-raised/40 px-5 py-2.5">
        <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted">
          Week {scenario.week} · {scenario.type.replace("_", " ")}
        </span>
        <span className="text-[10px] font-mono text-muted/60">
          {scenario.id}
        </span>
      </header>
      <div className="px-6 pt-6 md:px-7">
        <h2 className="mb-3 text-2xl font-semibold leading-tight tracking-tight">
          {scenario.title}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          {scenario.setting}
        </p>
      </div>
      <div className="mx-6 mb-5 border-l-2 border-brand-500 bg-raised/40 px-4 py-3 md:mx-7">
        <p className="text-[15px] leading-relaxed">{scenario.prompt}</p>
      </div>

      {!resolved && (
        <div className="space-y-2 px-6 pb-6 md:px-7 md:pb-7">
          {scenario.choices.map((c, idx) => (
            <button
              key={idx}
              onClick={() => onChoose(idx)}
              onMouseEnter={() => onHoverChoice(c.effects)}
              onFocus={() => onHoverChoice(c.effects)}
              onMouseLeave={() => onHoverChoice(null)}
              onBlur={() => onHoverChoice(null)}
              disabled={submitting}
              className="group flex w-full items-start gap-3 rounded-md border border-line bg-raised/30 px-4 py-3 text-left text-sm transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-900/20"
            >
              <span className="font-mono text-xs text-muted">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1 leading-relaxed">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {resolved && (
        <div className="space-y-3 px-6 pb-6 md:px-7 md:pb-7">
          <div className="rounded-md border border-brand-300 bg-brand-50 px-4 py-2.5 dark:bg-brand-900/20">
            <div className="mb-0.5 text-[10.5px] font-mono uppercase tracking-widest text-brand-600">
              You chose
            </div>
            <p className="text-sm font-medium">{resolved.label}</p>
          </div>
          <div className="rounded-md border border-line bg-raised/30 px-4 py-3">
            <div className="mb-1 text-[10.5px] font-mono uppercase tracking-widest text-muted">
              Outcome
            </div>
            <p className="text-sm leading-relaxed">{resolved.outcome}</p>
          </div>
          <button
            onClick={onContinue}
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Continue →"
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Roster — anchored popup pattern (top-right of popup near clicked row)
// ────────────────────────────────────────────────────────────────────

function RosterPanel({ payload }: { payload: SimulationPayload }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const allPeople = [...payload.team, ...payload.partners];
  const selected = openId ? allPeople.find((p) => p.id === openId) ?? null : null;

  function handleOpen(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left, y: rect.top });
    setOpenId(id);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <header className="flex items-center justify-between border-b border-line bg-raised/50 px-4 py-2">
          <span className="text-[10.5px] font-mono uppercase tracking-widest text-brand-600">
            Roster
          </span>
          <span className="text-[10px] text-muted">Click for popup</span>
        </header>
        <RosterGroup
          title="Your Team"
          subtitle={`${payload.team.length} reports`}
          people={payload.team}
          onOpen={handleOpen}
          activeId={openId}
        />
        <RosterGroup
          title="Cross-Functional"
          subtitle={`${payload.partners.length} partners`}
          people={payload.partners}
          onOpen={handleOpen}
          activeId={openId}
        />
      </Card>
      {selected && anchor && (
        <PersonPopup
          person={selected}
          anchor={anchor}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function RosterGroup({
  title,
  subtitle,
  people,
  onOpen,
  activeId,
}: {
  title: string;
  subtitle: string;
  people: Person[];
  onOpen: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  activeId: string | null;
}) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-baseline justify-between border-b border-line bg-raised/20 px-4 py-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
          {title}
        </span>
        <span className="text-[10px] text-muted">{subtitle}</span>
      </div>
      <ul>
        {people.map((p, i) => (
          <li
            key={p.id}
            className={
              i === people.length - 1 ? "" : "border-b border-line/60"
            }
          >
            <button
              onClick={(e) => onOpen(p.id, e)}
              className={`group flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-raised ${
                activeId === p.id ? "bg-brand-50 dark:bg-brand-900/20" : ""
              }`}
            >
              <Avatar size={28} />
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-[12.5px] font-medium leading-tight ${
                    activeId === p.id
                      ? "text-brand-700"
                      : "text-fg group-hover:text-brand-700"
                  }`}
                >
                  {p.name}
                </div>
                <div className="truncate text-[10.5px] leading-tight text-muted">
                  {p.role}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full border border-line bg-raised"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle cx="20" cy="16" r="5.5" fill="currentColor" className="text-muted/50" />
        <path
          d="M 8.5 33 C 9 26, 14.5 23.5, 20 23.5 C 25.5 23.5, 31 26, 31.5 33 L 31.5 40 L 8.5 40 Z"
          fill="currentColor"
          className="text-muted/50"
        />
      </svg>
    </div>
  );
}

function PersonPopup({
  person,
  anchor,
  onClose,
}: {
  person: Person;
  anchor: { x: number; y: number };
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{
    top: number;
    right: number;
    width: number;
    maxHeight: number;
    centered: boolean;
  } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 16;
    const GAP = 12;
    const MAX_W = 460;
    const MAX_H = 560;
    if (vw < 880) {
      setPos({
        top: PAD,
        right: PAD,
        width: Math.min(vw - PAD * 2, MAX_W),
        maxHeight: vh - PAD * 2,
        centered: true,
      });
      return;
    }
    const width = Math.min(MAX_W, anchor.x - PAD - GAP);
    const right = vw - anchor.x + GAP;
    let top = anchor.y;
    const maxHeight = Math.min(MAX_H, vh - PAD * 2);
    if (top + maxHeight > vh - PAD) {
      top = Math.max(PAD, vh - PAD - maxHeight);
    }
    if (top < PAD) top = PAD;
    setPos({ top, right, width, maxHeight, centered: false });
  }, [anchor]);

  if (!pos) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="absolute flex flex-col overflow-hidden rounded-lg border border-line bg-card-solid shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={
          pos.centered
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: pos.width,
                maxHeight: pos.maxHeight,
              }
            : {
                top: pos.top,
                right: pos.right,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }
        }
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line bg-raised/40 px-4 py-3">
          <Avatar size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{person.name}</div>
            <div className="text-xs text-muted">{person.role}</div>
            <div className="text-[10.5px] text-muted/70">{person.tenure}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-muted hover:text-fg"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-line bg-raised/30 px-4 py-3">
            <p className="text-xs leading-relaxed">{person.oneLiner}</p>
          </div>
          <div className="divide-y divide-line">
            <Rhythm label="Daily" items={person.daily} />
            <Rhythm label="Weekly" items={person.weekly} />
            <Rhythm label="Monthly" items={person.monthly} />
            <Rhythm label="Quarterly" items={person.quarterly} />
            <Rhythm label="Annually" items={person.annual} />
          </div>
        </div>
        <footer className="shrink-0 border-t border-line bg-raised/30 px-4 py-1.5 text-center text-[10px] font-mono uppercase tracking-widest text-muted">
          Press ESC or click outside to close
        </footer>
      </div>
    </div>
  );
}

function Rhythm({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="px-4 py-2.5">
      <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-brand-600">
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
