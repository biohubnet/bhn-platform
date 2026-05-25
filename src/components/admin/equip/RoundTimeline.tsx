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

/** Solid dot colour per stage tone — used as a row-level indicator
 *  in the schedule table (replaces the old full-chip background). */
function dotColor(tone: EquipRoundStage["tone"]): string {
  switch (tone) {
    case "amber":   return "bg-amber-400";
    case "violet":  return "bg-violet-400";
    case "brand":   return "bg-brand-500";
    case "emerald": return "bg-emerald-400";
    default:        return "bg-line";
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
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
          <CalendarClock size={11} className="text-brand-600" />
          VentureLift round schedule
        </p>
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
      {/* Stage table — one row per stage, chronological, scannable */}
      <div className="rounded-xl overflow-hidden border border-line">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-elevated/60 border-b border-line">
              <th className="text-left text-[9px] uppercase tracking-[0.2em] font-bold text-subtle px-3 py-2 w-8 tabular-nums">#</th>
              <th className="text-left text-[9px] uppercase tracking-[0.2em] font-bold text-subtle px-3 py-2">Stage</th>
              <th className="text-left text-[9px] uppercase tracking-[0.2em] font-bold text-subtle px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.stages.map((s, i) => {
              const isActive = i === highlightedIdx && highlightedIdx === activeIdx;
              const isNext   = i === highlightedIdx && highlightedIdx === nextFutureIdx && activeIdx < 0;
              const isHL     = isActive || isNext;
              return (
                <tr
                  key={s.key}
                  className={isHL ? "bg-emerald-50/70" : ""}
                >
                  {/* Row number */}
                  <td className="px-3 py-2 text-subtle tabular-nums font-mono">{i + 1}</td>

                  {/* Stage name + tone dot */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(s.tone)}`} />
                      <span className={`font-semibold ${isHL ? "text-emerald-900" : "text-fg"}`}>
                        {s.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full ring-1 ring-emerald-200 ring-inset">
                          now
                        </span>
                      )}
                      {isNext && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full ring-1 ring-amber-200 ring-inset">
                          next
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date(s) */}
                  <td className={`px-3 py-2 font-mono tabular-nums ${isHL ? "font-bold text-emerald-900" : "text-fg"}`}>
                    {fmtRange(s)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
