/**
 * Applicant-facing card showing the next open deadline for each
 * Equip stream. Renders on /equip above the stream picker so the
 * applicant knows what they're racing toward before they decide
 * which stream to apply to.
 *
 * Server component — reads the next-deadline-per-stream snapshot
 * directly from the database. Auto-hides when both streams have
 * no upcoming window (the card has nothing to say).
 */
import { CalendarClock, AlertCircle } from "lucide-react";
import { nextOpenDeadlines, formatDeadlineEastern, type DeadlineRow } from "@/lib/equip/deadlines";
import { STREAM_META, type EquipStream } from "@/lib/equip/types";

export async function DeadlinesCard() {
  const byStream = await nextOpenDeadlines();
  const anyOpen = Object.values(byStream).some((d) => d != null);
  if (!anyOpen) return null;

  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-brand-50/40 to-card p-5 surface-shadow">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={14} className="text-brand-700" />
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Next deadlines</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["venture_connect", "venture_lift"] as const).map((s) => {
          const row = byStream[s] as DeadlineRow | null;
          const meta = STREAM_META[s];
          return (
            <DeadlineTile key={s} stream={s} streamName={meta.name} cadence={meta.cadence} row={row} />
          );
        })}
      </div>
      <p className="text-[11px] text-subtle mt-3 leading-snug">
        Late submissions are blocked by the platform — get yours in before the deadline. Times shown in Eastern; DST handled automatically.
      </p>
    </section>
  );
}

function DeadlineTile({
  stream, streamName, cadence, row,
}: {
  stream: EquipStream;
  streamName: string;
  cadence: string;
  row: DeadlineRow | null;
}) {
  if (!row) {
    return (
      <div className="rounded-xl border border-line bg-card-solid/60 p-3">
        <p className="text-xs font-bold text-fg">{streamName}</p>
        <p className="text-[10px] uppercase tracking-wider font-bold text-subtle mt-2">Next deadline</p>
        <p className="text-sm text-muted mt-1 inline-flex items-center gap-1.5">
          <AlertCircle size={12} /> No open window scheduled
        </p>
        <p className="text-[10px] text-subtle mt-1">{cadence}</p>
      </div>
    );
  }

  const deadline = new Date(row.deadlineAt);
  // CALENDAR days in Toronto, not elapsed milliseconds. Ceil-ing the
  // raw difference made anything under 24 hours away round up to 1, so
  // a deadline thirty minutes from now announced "Closes tomorrow" —
  // telling an applicant they had another day on the morning it closed.
  // Deadlines are a wall-clock promise ("noon Eastern on the 24th"), so
  // the countdown has to be measured in the same terms.
  const daysUntil = Math.max(0, torontoDayDiff(new Date(), deadline));
  const soon = daysUntil <= 7;
  const veryClose = daysUntil <= 2;

  const banner =
    veryClose ? "bg-rose-50 ring-rose-200 text-rose-800"
              : soon ? "bg-amber-50 ring-amber-200 text-amber-800"
                     : "bg-card-solid ring-line text-fg";

  return (
    <div className={"rounded-xl ring-1 ring-inset p-3 " + banner}>
      <p className="text-xs font-bold">{streamName}</p>
      {row.cycleLabel && <p className="text-[11px] opacity-80">{row.cycleLabel}</p>}
      <p className="text-[10px] uppercase tracking-wider font-bold mt-2 opacity-70">Deadline</p>
      <p className="text-sm font-semibold mt-0.5">{formatDeadlineEastern(deadline)}</p>
      <p className="text-[11px] opacity-90 mt-1">
        {daysUntil === 0
          ? "Closes today"
          : daysUntil === 1
            ? "Closes tomorrow"
            : `${daysUntil} days remaining`}
        {row.status === "extended" && (
          <span className="ml-1 italic">(extended from {formatDeadlineEastern(row.originalDeadlineAt)})</span>
        )}
      </p>
      {row.note && (
        <p className="text-[10px] mt-2 opacity-75 italic">“{row.note}”</p>
      )}
    </div>
  );
}

/** Whole calendar days from `from` to `to`, both read in Toronto. Returns
 *  0 when they fall on the same Toronto date, whatever the clock says. */
function torontoDayDiff(from: Date, to: Date): number {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const asUtcMidnight = (iso: string) => {
    const [y, m, dd] = iso.split("-").map((n) => parseInt(n, 10));
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((asUtcMidnight(day(to)) - asUtcMidnight(day(from))) / (24 * 60 * 60 * 1000));
}
