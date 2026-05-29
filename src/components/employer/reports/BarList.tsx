/**
 * Horizontal bar list (theme-adaptive track + brand-500 fill). Caller
 * computes each row's width %. Server-safe, reused across reports.
 */
export interface BarRow {
  label: string;
  widthPct: number; // 0–100
  value: string;    // right-aligned value text
  muted?: string;   // optional secondary text after value
}

export function BarList({ rows, labelWidth = "w-24" }: { rows: BarRow[]; labelWidth?: string }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className={`text-xs text-muted ${labelWidth} shrink-0 text-right truncate`} title={r.label}>
            {r.label}
          </span>
          <div className="flex-1 h-2.5 bg-fg/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, r.widthPct))}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-fg w-24 text-right tabular-nums">
            {r.value}
            {r.muted ? <span className="text-muted font-normal"> · {r.muted}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
