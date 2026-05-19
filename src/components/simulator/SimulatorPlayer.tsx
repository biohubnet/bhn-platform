"use client";

/**
 * SimulatorPlayer — the interactive loop.
 *
 * Three-column layout on xl+:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Week progress strip (1–12, with current week highlighted)    │
 *   ├──────────────┬─────────────────────────────────┬─────────────┤
 *   │ Dashboard    │ Scenario card                   │ Roster       │
 *   │ (5 stats)    │ (setting + prompt + choices)    │ (15 names)   │
 *   └──────────────┴─────────────────────────────────┴─────────────┘
 *
 * On lg the dashboard collapses into the right rail above the roster.
 * Below lg, everything stacks single-column.
 *
 * Polish notes:
 *   • Display font used for scenario titles (theme-aware via --font-display-theme).
 *   • Paper-texture background on the scenario card (subtle radial vignette).
 *   • Choice buttons surface stat-delta chips on hover so the tradeoff is visible
 *     before commitment.
 *   • Roster rows have a head-silhouette avatar and click → anchored popup.
 *   • Review screen animates the score from 0 to final and shows stat deltas
 *     from starting values.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  Activity,
  Battery,
  BookOpen,
  Compass,
  Loader2,
  Network,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { computeDecisionProfile, computeReview } from "@/lib/simulator/engine";
import { Avatar as PersonAvatar } from "./Avatar";
import type {
  AttemptState,
  AttemptStats,
  LogEntry,
  Person,
  Scenario,
  SimulationPayload,
  StatDef,
} from "@/lib/simulator/types";

type Props = {
  attemptId: string;
  payload: SimulationPayload;
  initialState: AttemptState;
};

const STAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  morale: Users,
  vpTrust: TrendingUp,
  velocity: Activity,
  crossFunc: Network,
  capacity: Battery,
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
  const [briefingOpen, setBriefingOpen] = useState(false);
  const router = useRouter();

  const scenarios = payload.scenarios.filter((s) => s.week === state.week);
  const scenario: Scenario | undefined = scenarios[state.scenarioIndex];
  const pendingNextRef = useRef<AttemptState | null>(null);

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
      setResolved({
        choiceIdx: idx,
        label: data.entry.choiceLabel,
        outcome: data.entry.outcome,
      });
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

  function handleContinue() {
    if (!pendingNextRef.current) return;
    setState(pendingNextRef.current);
    pendingNextRef.current = null;
    setResolved(null);
  }

  async function handleReset() {
    if (
      !confirm(
        "Reset back to week 1 with starting stats? Your decision log will be cleared.",
      )
    ) {
      return;
    }
    const res = await fetch(`/api/simulator/${attemptId}/reset`, {
      method: "POST",
    });
    if (res.ok) {
      // Reset local state without round-tripping through Prisma — we
      // know the initial state from the payload.
      const stats: AttemptStats = {};
      for (const s of payload.stats) stats[s.key] = s.initialValue;
      setState({ week: 1, scenarioIndex: 0, stats, log: [], finished: false });
      setResolved(null);
      pendingNextRef.current = null;
      router.refresh();
    }
  }

  // Review view when finished
  if (state.finished) {
    return (
      <ReviewView
        payload={payload}
        state={state}
        attemptId={attemptId}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero band — role context */}
      <RoleHeader
        payload={payload}
        onReset={handleReset}
        onOpenBriefing={
          payload.briefing ? () => setBriefingOpen(true) : undefined
        }
      />

      {briefingOpen && payload.briefing && (
        <BriefingModal
          payload={payload}
          onClose={() => setBriefingOpen(false)}
        />
      )}

      {/* Week progress strip */}
      <WeekStrip currentWeek={state.week} scenarios={payload.scenarios} />

      {/* Three-column body */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[260px_1fr_320px]">
        <aside className="hidden xl:block">
          <DashboardCard
            payload={payload}
            stats={state.stats}
            hover={hoverEffect}
            week={state.week}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          {scenario ? (
            <ScenarioPanel
              scenario={scenario}
              resolved={resolved}
              submitting={submitting}
              onChoose={makeChoice}
              onHoverChoice={setHoverEffect}
              onContinue={handleContinue}
            />
          ) : (
            <Card className="p-6 text-sm text-fg-muted">
              No scenario for week {state.week}. Click Continue to advance.
            </Card>
          )}

          {error && (
            <Card className="border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              {error}
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <div className="xl:hidden">
            <DashboardCard
              payload={payload}
              stats={state.stats}
              hover={hoverEffect}
              week={state.week}
            />
          </div>
          <RosterPanel payload={payload} />
        </aside>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Role header — sets the tone for the whole quarter
// ────────────────────────────────────────────────────────────────────

function RoleHeader({
  payload,
  onReset,
  onOpenBriefing,
}: {
  payload: SimulationPayload;
  onReset: () => void;
  onOpenBriefing?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-brand-50 via-card-solid to-card-solid p-6 md:p-7">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-brand-100/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Q1 · Role-play Simulation
          </div>
          <h1
            className="mb-2 text-2xl font-semibold leading-tight tracking-tight text-fg md:text-3xl"
            style={{ fontFamily: "var(--font-display-theme, inherit)" }}
          >
            {payload.jobTitle}
          </h1>
          {(payload.companyName || payload.location) && (
            <p className="text-sm text-fg-muted">
              {payload.companyName}
              {payload.location && (
                <>
                  {payload.companyName ? " · " : ""}
                  {payload.location}
                </>
              )}
            </p>
          )}
          {payload.context && (
            <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-fg-muted">
              {payload.context}
            </p>
          )}
          <p className="mt-3 text-[11.5px] text-fg-subtle">
            Reporting to{" "}
            <span className="font-medium text-fg-muted">{payload.vpName}</span>
            , {payload.vpRole}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {onOpenBriefing && (
            <button
              onClick={onOpenBriefing}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-card-solid/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-brand-700 shadow-sm transition hover:border-brand-500 hover:bg-brand-50"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Briefing
            </button>
          )}
          <button
            onClick={onReset}
            className="text-[10.5px] uppercase tracking-widest text-fg-subtle transition hover:text-rose-700"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Week strip — 12 segments with current/completed/upcoming states
// ────────────────────────────────────────────────────────────────────

function WeekStrip({
  currentWeek,
  scenarios,
}: {
  currentWeek: number;
  scenarios: Scenario[];
}) {
  // For each week 1..12, count its scenarios — affects segment opacity for
  // "scheduled" vs "empty" weeks.
  const weekDensity = useMemo(() => {
    const counts: number[] = Array(12).fill(0);
    for (const s of scenarios) {
      if (s.week >= 1 && s.week <= 12) counts[s.week - 1]++;
    }
    return counts;
  }, [scenarios]);

  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: 12 }, (_, i) => {
        const week = i + 1;
        const state =
          week < currentWeek
            ? "done"
            : week === currentWeek
              ? "current"
              : "future";
        const hasScenarios = weekDensity[i] > 0;
        return (
          <div
            key={week}
            className="group relative flex-1"
            title={`Week ${week}${hasScenarios ? ` — ${weekDensity[i]} scenario${weekDensity[i] === 1 ? "" : "s"}` : ""}`}
          >
            <div
              className={[
                "h-1.5 rounded-full transition-all",
                state === "done" && "bg-brand-600",
                state === "current" && "bg-brand-500 ring-2 ring-brand-300/50",
                state === "future" && hasScenarios && "bg-line-strong",
                state === "future" && !hasScenarios && "bg-line",
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <div
              className={[
                "mt-1 text-center font-mono text-[9.5px] tracking-wider transition",
                state === "current" && "font-bold text-brand-700",
                state === "done" && "text-fg-muted",
                state === "future" && "text-fg-subtle",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {String(week).padStart(2, "0")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Dashboard — 5 stats stacked vertically
// ────────────────────────────────────────────────────────────────────

function DashboardCard({
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
      <div className="flex items-center justify-between border-b border-line bg-raised/40 px-4 py-2.5">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
          Director Dashboard
        </span>
        <span className="font-mono text-[10.5px] text-fg-muted">
          W{week}/12
        </span>
      </div>
      <div className="space-y-3.5 p-4">
        {payload.stats.map((s) => (
          <StatRow
            key={s.key}
            stat={s}
            value={stats[s.key] ?? s.initialValue}
            delta={hover?.[s.key]}
          />
        ))}
      </div>
      <div className="border-t border-line bg-raised/20 px-4 py-2">
        <p className="text-[10.5px] leading-snug text-fg-subtle">
          Hover any choice to preview the deltas. Choices apply on Continue.
        </p>
      </div>
    </Card>
  );
}

function StatRow({
  stat,
  value,
  delta,
}: {
  stat: StatDef;
  value: number;
  delta: number | undefined;
}) {
  const Icon = STAT_ICONS[stat.key] ?? Sparkles;
  const projected =
    typeof delta === "number"
      ? Math.max(0, Math.min(100, value + delta))
      : value;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-fg">
          <Icon className="h-3 w-3 text-fg-subtle" />
          {stat.label}
        </span>
        <span className="font-mono tabular-nums text-[11.5px] text-fg">
          {value}
          {typeof delta === "number" && delta !== 0 && (
            <span
              className={[
                "ml-1.5 font-semibold",
                delta > 0 ? "text-emerald-600" : "text-rose-600",
              ].join(" ")}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: stat.color }}
        />
        {typeof delta === "number" && delta !== 0 && (
          <div
            className="absolute inset-y-0 rounded-full opacity-55 transition-[width] duration-500"
            style={{
              left: `${Math.min(value, projected)}%`,
              width: `${Math.abs(projected - value)}%`,
              background:
                delta > 0
                  ? "rgb(16, 185, 129)" // emerald-500
                  : "rgb(244, 63, 94)", // rose-500
            }}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Scenario card — the centerpiece
// ────────────────────────────────────────────────────────────────────

const SCENARIO_TYPE_LABEL: Record<string, string> = {
  vp_1on1: "VP 1:1",
  team: "Team",
  cross_func: "Cross-Functional",
  escalation: "Escalation",
  hiring: "Hiring",
  planning: "Planning",
  personal: "Personal",
};

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
    <Card
      className="relative overflow-hidden"
      style={{
        // Subtle paper texture using a radial vignette + faint diagonal lines
        backgroundImage:
          "radial-gradient(ellipse at top right, rgba(67, 100, 113, 0.05), transparent 60%)",
      }}
    >
      <header className="flex items-center justify-between border-b border-line bg-raised/40 px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Week {scenario.week}
          </span>
          <span className="text-fg-subtle">·</span>
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-fg-muted">
            {SCENARIO_TYPE_LABEL[scenario.type] ?? scenario.type}
          </span>
        </div>
        <span className="font-mono text-[10px] text-fg-subtle">
          {scenario.id}
        </span>
      </header>

      <div className="px-6 pt-7 md:px-8 md:pt-8">
        <h2
          className="mb-3 text-[28px] font-semibold leading-[1.15] tracking-tight text-fg md:text-[32px]"
          style={{ fontFamily: "var(--font-display-theme, inherit)" }}
        >
          {scenario.title}
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed text-fg-muted md:text-[14.5px]">
          {scenario.setting}
        </p>
      </div>

      <div className="mx-6 mb-6 md:mx-8">
        <div className="relative rounded-md border-l-[3px] border-brand-600 bg-brand-50/40 px-5 py-4 dark:bg-brand-900/10">
          <div className="absolute -top-2.5 left-3 bg-card-solid px-2 text-[9.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Prompt
          </div>
          <p className="text-[15.5px] leading-relaxed text-fg">
            {scenario.prompt}
          </p>
        </div>
      </div>

      {!resolved && (
        <div className="space-y-2.5 px-6 pb-7 md:px-8 md:pb-8">
          <div className="mb-1 text-[10.5px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            Choose one — hover to preview deltas
          </div>
          {scenario.choices.map((c, idx) => (
            <ChoiceButton
              key={idx}
              choice={c}
              letter={String.fromCharCode(65 + idx)}
              disabled={submitting}
              onSelect={() => onChoose(idx)}
              onHoverChange={(hovering) => onHoverChoice(hovering ? c.effects : null)}
            />
          ))}
        </div>
      )}

      {resolved && (
        <div className="space-y-3.5 px-6 pb-7 md:px-8 md:pb-8">
          <ChosenCard label={resolved.label} />
          <OutcomeCard outcome={resolved.outcome} />
          <button
            onClick={onContinue}
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

function ChoiceButton({
  choice,
  letter,
  disabled,
  onSelect,
  onHoverChange,
}: {
  choice: { label: string; effects: Record<string, number> };
  letter: string;
  disabled: boolean;
  onSelect: () => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      className="group relative flex w-full items-start gap-3.5 rounded-md border border-line bg-card-solid/60 px-4 py-3.5 text-left text-[14px] transition hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50/40 hover:shadow-sm focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-50 disabled:hover:translate-y-0"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-raised/50 font-mono text-[11px] font-medium text-fg-muted transition group-hover:border-brand-500 group-hover:bg-brand-100 group-hover:text-brand-700">
        {letter}
      </span>
      <span className="flex-1 leading-relaxed">{choice.label}</span>
    </button>
  );
}

function ChosenCard({ label }: { label: string }) {
  return (
    <div className="relative rounded-md border border-brand-300 bg-brand-50 px-4 py-3 dark:bg-brand-900/20">
      <div className="absolute -top-2.5 left-3 bg-card-solid px-2 text-[9.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
        You chose
      </div>
      <p className="pt-1 text-[14px] font-medium leading-relaxed text-fg">
        {label}
      </p>
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: string }) {
  return (
    <div className="relative rounded-md border border-line bg-raised/30 px-4 py-3.5">
      <div className="absolute -top-2.5 left-3 bg-card-solid px-2 text-[9.5px] font-mono uppercase tracking-[0.18em] text-fg-muted">
        Outcome
      </div>
      <p className="pt-1 text-[13.5px] leading-relaxed text-fg">{outcome}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Roster — clickable list with anchored popup
// ────────────────────────────────────────────────────────────────────

function RosterPanel({ payload }: { payload: SimulationPayload }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const allPeople = [...payload.team, ...payload.partners];
  const selected = openId
    ? allPeople.find((p) => p.id === openId) ?? null
    : null;

  function handleOpen(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ x: rect.left, y: rect.top });
    setOpenId(id);
  }

  return (
    <>
      <Card className="overflow-hidden">
        <header className="flex items-center justify-between border-b border-line bg-raised/40 px-4 py-2.5">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Roster
          </span>
          <span className="text-[10px] text-fg-subtle">Click for popup</span>
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
      <div className="flex items-baseline justify-between border-b border-line/60 bg-raised/20 px-4 py-1.5">
        <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-fg-muted">
          {title}
        </span>
        <span className="text-[10px] text-fg-subtle">{subtitle}</span>
      </div>
      <ul>
        {people.map((p, i) => (
          <li
            key={p.id}
            className={i === people.length - 1 ? "" : "border-b border-line/40"}
          >
            <button
              onClick={(e) => onOpen(p.id, e)}
              className={[
                "group flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                activeId === p.id
                  ? "bg-brand-50 dark:bg-brand-900/20"
                  : "hover:bg-raised/40",
              ].join(" ")}
            >
              <PersonAvatar
                id={p.id}
                name={p.name}
                size={32}
                active={activeId === p.id}
              />
              <div className="min-w-0 flex-1">
                <div
                  className={[
                    "truncate text-[12.5px] font-medium leading-tight",
                    activeId === p.id
                      ? "text-brand-700"
                      : "text-fg group-hover:text-brand-700",
                  ].join(" ")}
                >
                  {p.name}
                </div>
                <div className="truncate text-[10.5px] leading-tight text-fg-subtle">
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

// ────────────────────────────────────────────────────────────────────
// Anchored popup
// ────────────────────────────────────────────────────────────────────

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const PAD = 16;
    const GAP = 12;
    const MAX_W = 480;
    const MAX_H = 600;
    if (vw < 900) {
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
    let top = anchor.y - 40;
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
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px]"
      onClick={onClose}
      style={{ animation: "fade-in 180ms ease-out" }}
    >
      <div
        className="absolute flex flex-col overflow-hidden rounded-lg border border-line-strong bg-card-solid shadow-[0_24px_60px_-12px_rgba(15,23,42,0.55)]"
        onClick={(e) => e.stopPropagation()}
        style={
          pos.centered
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: pos.width,
                maxHeight: pos.maxHeight,
                animation: "slide-up-in 220ms ease-out",
              }
            : {
                top: pos.top,
                right: pos.right,
                width: pos.width,
                maxHeight: pos.maxHeight,
                animation: "slide-up-in 220ms ease-out",
              }
        }
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-line bg-raised/40 px-5 py-4">
          <PersonAvatar id={person.id} name={person.name} size={52} active />
          <div className="min-w-0 flex-1">
            <div
              className="text-base font-semibold tracking-tight text-fg"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              {person.name}
            </div>
            <div className="text-[12.5px] text-fg-muted">{person.role}</div>
            <div className="text-[10.5px] text-fg-subtle">{person.tenure}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-card-solid text-fg-muted hover:bg-raised hover:text-fg"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-line bg-raised/20 px-5 py-3">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              {person.oneLiner}
            </p>
          </div>
          <div className="divide-y divide-line/60">
            <Rhythm label="Daily" items={person.daily} />
            <Rhythm label="Weekly" items={person.weekly} />
            <Rhythm label="Monthly" items={person.monthly} />
            <Rhythm label="Quarterly" items={person.quarterly} />
            <Rhythm label="Annually" items={person.annual} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-line bg-raised/30 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Press ESC or click outside to close
        </footer>
      </div>
    </div>
  );
}

function Rhythm({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="px-5 py-3">
      <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-brand-700">
        {label}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-fg">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Review screen
// ────────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  "Exceeds Expectations": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Strong Meets": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Meets Expectations": "bg-amber-50 text-amber-900 border-amber-200",
  "Below Expectations": "bg-rose-50 text-rose-900 border-rose-200",
  "Concerns Raised": "bg-rose-100 text-rose-900 border-rose-300",
};

function ReviewView({
  payload,
  state,
  attemptId,
  onReset,
}: {
  payload: SimulationPayload;
  state: AttemptState;
  attemptId: string;
  onReset: () => void;
}) {
  const review = useMemo(() => computeReview(payload, state), [payload, state]);
  const profile = useMemo(
    () => computeDecisionProfile(payload, state),
    [payload, state],
  );
  const animatedScore = useCountUp(review.score, 1200);
  const tierClass = TIER_COLOR[review.tier] ?? TIER_COLOR["Meets Expectations"];
  const [briefingOpen, setBriefingOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Score reveal */}
      <Card className="relative overflow-hidden border-brand-300 bg-gradient-to-br from-brand-50 via-card-solid to-card-solid p-10 text-center md:p-12">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="relative">
          <div className="mb-3 text-[10.5px] font-mono uppercase tracking-[0.2em] text-brand-700">
            Q1 Performance Review · {payload.jobTitle}
          </div>
          <div
            className="font-bold tabular-nums leading-none text-brand-700"
            style={{
              fontFamily: "var(--font-display-theme, inherit)",
              fontSize: "clamp(72px, 14vw, 132px)",
            }}
          >
            {animatedScore}
          </div>
          <div className="mt-4 inline-block">
            <span
              className={[
                "inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold",
                tierClass,
              ].join(" ")}
            >
              {review.tier}
            </span>
          </div>
          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-relaxed text-fg-muted">
            {review.tierBlurb}
          </p>
        </div>
      </Card>

      {/* Stat narratives */}
      <Card className="overflow-hidden">
        <header className="border-b border-line bg-raised/40 px-5 py-2.5">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Stat narratives
          </span>
        </header>
        <div className="grid gap-px bg-line md:grid-cols-2">
          {review.perStat.map((s) => {
            const def = payload.stats.find((x) => x.key === s.key);
            const start = def?.initialValue ?? 50;
            const delta = s.value - start;
            const Icon = STAT_ICONS[s.key] ?? Sparkles;
            return (
              <div key={s.key} className="bg-card-solid p-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                    <Icon className="h-3.5 w-3.5 text-fg-subtle" />
                    {s.label}
                  </span>
                  <span className="font-mono tabular-nums">
                    <span className="text-[10.5px] text-fg-subtle">
                      {start}
                    </span>
                    <span className="mx-1 text-fg-subtle">→</span>
                    <span className="text-[15px] font-semibold text-brand-700">
                      {s.value}
                    </span>
                    <span
                      className={[
                        "ml-2 text-[11px] font-semibold",
                        delta >= 0 ? "text-emerald-600" : "text-rose-600",
                      ].join(" ")}
                    >
                      {delta >= 0 ? `+${delta}` : delta}
                    </span>
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-fg-muted">
                  {s.narrative}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {review.highlights.length > 0 && (
        <Card className="overflow-hidden border-emerald-200">
          <header className="border-b border-emerald-200 bg-emerald-50/70 px-5 py-2.5">
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-emerald-800">
              Highlights
            </span>
          </header>
          <ul className="space-y-2 px-5 py-4 text-[13px] text-fg">
            {review.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {review.lowlights.length > 0 && (
        <Card className="overflow-hidden border-rose-200">
          <header className="border-b border-rose-200 bg-rose-50/70 px-5 py-2.5">
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-rose-800">
              Areas to develop
            </span>
          </header>
          <ul className="space-y-2 px-5 py-4 text-[13px] text-fg">
            {review.lowlights.map((l, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span className="leading-relaxed">{l}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* VP closing — as a quote */}
      <Card className="overflow-hidden border-brand-300 bg-brand-50/50">
        <div className="px-6 py-6 md:px-8 md:py-7">
          <div className="mb-3 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
            Closing — your VP
          </div>
          <blockquote
            className="relative pl-6 text-[16px] italic leading-relaxed text-fg md:text-[17px]"
            style={{ fontFamily: "var(--font-display-theme, inherit)" }}
          >
            <span
              aria-hidden
              className="absolute -left-1 -top-2 select-none text-[44px] leading-none text-brand-300"
            >
              &ldquo;
            </span>
            {review.vpClosing}
          </blockquote>
          <div className="mt-3 pl-6 text-[11.5px] text-fg-subtle">
            — {payload.vpName}, {payload.vpRole}
          </div>
        </div>
      </Card>

      {/* Decision profile — playstyle analysis from the log */}
      <DecisionProfileCard profile={profile} />

      {/* Briefing recap — what the JD didn't tell you (if available) */}
      {payload.briefing && (
        <Card className="overflow-hidden">
          <header className="flex items-center justify-between border-b border-line bg-raised/40 px-5 py-2.5">
            <span className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
              <BookOpen className="h-3 w-3" />
              Briefing recap
            </span>
            <button
              onClick={() => setBriefingOpen(true)}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Open full briefing →
            </button>
          </header>
          <div className="grid gap-px bg-line md:grid-cols-2">
            <div className="bg-card-solid px-5 py-4">
              <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-brand-700">
                Hidden dynamics
              </div>
              <p className="line-clamp-4 text-[12.5px] leading-relaxed text-fg-muted">
                {payload.briefing.hiddenDynamics}
              </p>
            </div>
            <div className="bg-card-solid px-5 py-4">
              <div className="mb-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-brand-700">
                Interview questions ({payload.briefing.interviewQuestions.length})
              </div>
              <p className="line-clamp-4 text-[12.5px] leading-relaxed text-fg-muted">
                Open the full briefing for surgical questions to ask the hiring
                manager — derived from the dynamics you just lived through.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <RotateCcw className="h-4 w-4" /> Try the quarter again
        </button>
        <a
          href="/simulator"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-card-solid px-5 py-2.5 text-sm font-medium text-fg hover:border-brand-400 hover:text-brand-700"
        >
          Back to my simulations
        </a>
      </div>

      <div className="pt-4 text-center text-[10px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
        Attempt {attemptId.slice(0, 8)} · {state.log.length} decisions logged
      </div>

      {briefingOpen && payload.briefing && (
        <BriefingModal payload={payload} onClose={() => setBriefingOpen(false)} />
      )}
    </div>
  );
}

/** Count from 0 → target over `duration` ms with ease-out. */
function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ────────────────────────────────────────────────────────────────────
// Briefing modal — what the JD doesn't tell you
// ────────────────────────────────────────────────────────────────────

function BriefingModal({
  payload,
  onClose,
}: {
  payload: SimulationPayload;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!payload.briefing) return null;
  const b = payload.briefing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-[3px] md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Job dynamics briefing"
      style={{ animation: "fade-in 180ms ease-out" }}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg border border-line-strong bg-card-solid shadow-[0_30px_80px_-20px_rgba(15,23,42,0.7)]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slide-up-in 240ms ease-out" }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-br from-brand-50 to-card-solid px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
              <BookOpen className="h-3 w-3" />
              Briefing — {payload.jobTitle}
            </div>
            <h2
              className="text-lg font-semibold tracking-tight text-fg md:text-xl"
              style={{ fontFamily: "var(--font-display-theme, inherit)" }}
            >
              What the JD doesn&apos;t tell you
            </h2>
            <p className="mt-1 text-[12px] text-fg-muted">
              Use this to sharpen interview prep, set realistic expectations,
              and recognise patterns inside the sim.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-card-solid text-fg-muted hover:bg-raised hover:text-fg"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-5 px-6 py-6">
          {/* Hidden dynamics */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
              <Compass className="h-3 w-3" />
              Hidden dynamics
            </h3>
            <p className="rounded-md border-l-2 border-brand-500 bg-brand-50/40 px-4 py-3 text-[13.5px] leading-relaxed text-fg">
              {b.hiddenDynamics}
            </p>
          </section>

          {/* Failure modes */}
          {b.failureModes.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-rose-700">
                Common failure modes
              </h3>
              <ul className="space-y-2">
                {b.failureModes.map((f, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border border-rose-200/60 bg-rose-50/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 font-mono text-[10.5px] font-semibold text-rose-700">
                      {i + 1}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Unwritten rules */}
          {b.unwrittenRules.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-amber-800">
                Unwritten rules
              </h3>
              <ul className="space-y-2">
                {b.unwrittenRules.map((r, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border border-amber-200/60 bg-amber-50/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg"
                  >
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Interview questions */}
          {b.interviewQuestions.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-emerald-800">
                Questions to ask the hiring manager
              </h3>
              <ol className="space-y-2">
                {b.interviewQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border border-emerald-200/60 bg-emerald-50/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-mono text-[10.5px] font-semibold text-emerald-800">
                      {i + 1}
                    </span>
                    <span>&ldquo;{q}&rdquo;</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[10.5px] italic text-fg-subtle">
                Tip: write these on the back of your hand before the interview.
                Pull them out when the manager asks &ldquo;do you have any
                questions for us?&rdquo;
              </p>
            </section>
          )}
        </div>

        <footer className="border-t border-line bg-raised/30 px-5 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Press ESC or click outside to close
        </footer>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Decision profile — surfaces playstyle patterns from the log
// ────────────────────────────────────────────────────────────────────

const ARCHETYPE_TONE: Record<string, { bg: string; text: string; border: string }> = {
  collaborative: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  decisive: {
    bg: "bg-brand-50",
    text: "text-brand-800",
    border: "border-brand-200",
  },
  conservative: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
  },
  bold: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  balanced: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
};

function DecisionProfileCard({
  profile,
}: {
  profile: import("@/lib/simulator/engine").DecisionProfile;
}) {
  if (profile.decisionCount === 0) return null;
  const tone = ARCHETYPE_TONE[profile.archetype] ?? ARCHETYPE_TONE.balanced;
  return (
    <Card className="overflow-hidden">
      <header className="border-b border-line bg-raised/40 px-5 py-2.5">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-brand-700">
          Your decision profile
        </span>
      </header>

      <div className="grid gap-px bg-line md:grid-cols-[1fr_1fr]">
        <div className="bg-card-solid p-5">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            Archetype
          </div>
          <div className="mb-2 inline-flex">
            <span
              className={`rounded-full border ${tone.border} ${tone.bg} ${tone.text} px-3 py-1 text-[12px] font-semibold capitalize`}
            >
              {profile.archetype}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            {profile.archetypeBlurb}
          </p>
        </div>

        <div className="bg-card-solid p-5">
          <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            Stat fingerprint
          </div>
          <dl className="space-y-2.5 text-[12.5px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Most protected</dt>
              <dd className="text-right">
                <span className="font-semibold text-emerald-700">
                  {profile.protectedLabel}
                </span>
                <span className="ml-2 font-mono text-[11.5px] tabular-nums text-emerald-700">
                  {profile.protectedNet >= 0
                    ? `+${profile.protectedNet}`
                    : profile.protectedNet}
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Most sacrificed</dt>
              <dd className="text-right">
                <span className="font-semibold text-rose-700">
                  {profile.sacrificedLabel}
                </span>
                <span className="ml-2 font-mono text-[11.5px] tabular-nums text-rose-700">
                  {profile.sacrificedNet}
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Intensity / decision</dt>
              <dd className="font-mono text-[11.5px] tabular-nums text-fg">
                {profile.avgIntensity.toFixed(1)} pts
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-fg-muted">Decisions made</dt>
              <dd className="font-mono text-[11.5px] tabular-nums text-fg">
                {profile.decisionCount}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {profile.patternCallouts.length > 0 && (
        <div className="border-t border-line bg-raised/20 px-5 py-4">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-fg-subtle">
            Patterns worth reflecting on
          </div>
          <ul className="space-y-2">
            {profile.patternCallouts.map((c, i) => (
              <li
                key={i}
                className="flex gap-2 text-[12.5px] leading-relaxed text-fg"
              >
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
