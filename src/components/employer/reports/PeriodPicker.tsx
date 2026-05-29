"use client";

/**
 * Period selector for the reports suite. Pushes ?period= (+ start/end
 * for custom) to the current route; the server re-renders with the new
 * range. Hidden in print via .no-print.
 */
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PERIOD_PRESETS } from "@/lib/employer/reporting/period";

export function PeriodPicker({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [showCustom, setShowCustom] = useState(current === "custom");
  const [start, setStart] = useState(sp.get("start") ?? "");
  const [end, setEnd] = useState(sp.get("end") ?? "");

  function go(period: string, extra?: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    params.set("period", period);
    if (period !== "custom") {
      params.delete("start");
      params.delete("end");
    }
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 no-print">
      <div className="flex flex-wrap items-center gap-1">
        {PERIOD_PRESETS.map((p) => {
          const active = current === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                if (p.key === "custom") setShowCustom(true);
                else {
                  setShowCustom(false);
                  go(p.key);
                }
              }}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : "bg-card ring-1 ring-inset ring-line text-fg hover:bg-elevated"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <span className="inline-flex items-center gap-1">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg bg-card ring-1 ring-inset ring-line text-fg"
          />
          <span className="text-xs text-muted">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg bg-card ring-1 ring-inset ring-line text-fg"
          />
          <button
            type="button"
            disabled={!start || !end}
            onClick={() => go("custom", { start, end })}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-brand-600 text-white disabled:opacity-50"
          >
            Apply
          </button>
        </span>
      )}
    </div>
  );
}
