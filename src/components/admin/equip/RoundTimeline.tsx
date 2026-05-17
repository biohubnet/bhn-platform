/**
 * RoundTimeline — read-only display of every published Equip
 * round + its eight stages, plus a quick U of T holiday legend.
 *
 * Server component — no client interactivity. Pulls data from
 * the lib/equip/calendar.ts constants. Renders one card per
 * round with the stages laid out in chronological order as
 * coloured chips. Admins + Equip Review committee see this on
 * /admin/equip/deadlines above the deadline manager.
 */
import { CalendarClock, Sparkles, ExternalLink } from "lucide-react";
import { VL_ROUNDS, UOFT_HOLIDAYS, type EquipRound, type EquipRoundStage } from "@/lib/equip/calendar";

function fmtRange(stage: EquipRoundStage): string {
  const start = new Date(stage.date + "T12:00:00-04:00");
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!stage.endDate) {
    return stage.approximate ? `~${startLabel}` : startLabel;
  }
  const end = new Date(stage.endDate + "T12:00:00-04:00");
  const sameYear = start.getFullYear() === end.getFullYear();
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  return `${startLabel} → ${endLabel}`;
}

function chipTone(stage: EquipRoundStage): string {
  // Tailwind tone classes — mirrors the UI scheme used elsewhere.
  switch (stage.tone) {
    case "amber":   return "bg-amber-50 text-amber-800 ring-amber-200";
    case "violet":  return "bg-violet-50 text-violet-800 ring-violet-200";
    case "brand":   return "bg-brand-50 text-brand-800 ring-brand-200";
    case "emerald": return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    default:        return "bg-elevated text-muted ring-line";
  }
}

export function RoundTimeline() {
  const now = new Date().toISOString().slice(0, 10);
  // Surface 2025 rounds folded by default (they're past) — keep
  // current/future rounds expanded. We split into two lists.
  const past   = VL_ROUNDS.filter((r) => endStageOf(r).date < now);
  const active = VL_ROUNDS.filter((r) => endStageOf(r).date >= now);

  return (
    <section className="rounded-2xl border border-line bg-card overflow-hidden surface-shadow">
      <header className="px-5 py-3 border-b border-line flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
            <CalendarClock size={11} className="text-brand-600" />
            VentureLift round schedule
          </p>
          <p className="text-xs text-muted mt-1">
            Published source — VentureLift_Key_Dates_2025-2026 spreadsheet. Each round has eight published stages from launch through funding announcement. Dates marked with <span className="font-mono">~</span> are approximate ("Early August" etc).
          </p>
        </div>
        <span className="text-[11px] text-subtle">{VL_ROUNDS.length} rounds</span>
      </header>

      {/* Active + future rounds */}
      <ul className="divide-y divide-line">
        {active.map((r) => <RoundCard key={r.roundNumber} r={r} />)}
      </ul>

      {/* Past rounds — collapsed */}
      {past.length > 0 && (
        <details className="border-t border-line">
          <summary className="px-5 py-3 text-xs text-muted cursor-pointer hover:text-fg select-none">
            Past rounds ({past.length})
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {past.map((r) => <RoundCard key={r.roundNumber} r={r} dimmed />)}
          </ul>
        </details>
      )}

      <footer className="px-5 py-3 border-t border-line bg-elevated/30">
        <UofTHolidayLegend />
      </footer>
    </section>
  );
}

function endStageOf(r: EquipRound): EquipRoundStage {
  return r.stages.reduce<EquipRoundStage>(
    (acc, s) => (s.endDate ?? s.date) > (acc.endDate ?? acc.date) ? s : acc,
    r.stages[0],
  );
}

function RoundCard({ r, dimmed = false }: { r: EquipRound; dimmed?: boolean }) {
  const now = new Date().toISOString().slice(0, 10);
  // The currently-active stage is the one whose start date is
  // ≤ today AND end date (or start date) is ≥ today. If nothing
  // matches we highlight the next future stage.
  const activeIdx = r.stages.findIndex((s) =>
    s.date <= now && (s.endDate ?? s.date) >= now,
  );
  const nextFutureIdx = r.stages.findIndex((s) => s.date > now);
  const highlightedIdx = activeIdx >= 0 ? activeIdx : nextFutureIdx;

  return (
    <li className={"px-5 py-4 " + (dimmed ? "opacity-60" : "")}>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <p className="text-sm font-bold text-fg">{r.label}</p>
        <span className="text-[10px] uppercase tracking-wider font-bold bg-elevated text-muted ring-1 ring-line px-1.5 py-0.5 rounded">
          {r.year}
        </span>
        {highlightedIdx === activeIdx && activeIdx >= 0 && (
          <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <Sparkles size={9} /> Active stage: {r.stages[activeIdx].label}
          </span>
        )}
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {r.stages.map((s, i) => {
          const isHighlighted = i === highlightedIdx;
          return (
            <li
              key={s.key}
              className={
                "rounded-xl px-3 py-2 ring-1 ring-inset " +
                chipTone(s) +
                (isHighlighted ? " ring-2 ring-offset-1 shadow-sm" : "")
              }
            >
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">{s.label}</p>
              <p className="text-xs font-bold tabular-nums mt-0.5">{fmtRange(s)}</p>
            </li>
          );
        })}
      </ol>
    </li>
  );
}

function UofTHolidayLegend() {
  // Show only the upcoming holidays (today onward) — past
  // closures are noise.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = UOFT_HOLIDAYS.filter((h) => (h.endDate ?? h.date) >= today).slice(0, 6);

  return (
    <div className="flex items-start gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          U of T closures · upcoming
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          Highlighted on the calendar below. Reviewers don&apos;t schedule consults / reviews on these dates.{" "}
          <a
            href="https://people.utoronto.ca/memos/holiday-schedule-2025-26-and-2026-27/"
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 underline inline-flex items-center gap-1"
          >
            full schedule <ExternalLink size={9} />
          </a>
        </p>
      </div>
      {upcoming.length > 0 && (
        <ul className="flex items-center gap-1.5 flex-wrap ml-auto">
          {upcoming.map((h) => (
            <li
              key={h.date + h.name}
              className={
                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ring-1 ring-inset inline-flex items-center gap-1 " +
                (h.presidential
                  ? "bg-sky-50 text-sky-800 ring-sky-200"
                  : "bg-rose-50 text-rose-800 ring-rose-200")
              }
              title={h.name}
            >
              {new Date(h.date + "T12:00:00-04:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {h.endDate && (
                <>– {new Date(h.endDate + "T12:00:00-04:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
              )}
              <span className="opacity-75">· {h.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
