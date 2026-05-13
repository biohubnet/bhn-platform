"use client";
/**
 * Top-of-page filter panel for the course catalog.
 *
 * Design choices:
 *   • Single prominent card spanning full width — the panel is the
 *     visual centre of gravity above the grid, not a sidebar
 *     afterthought.
 *   • All four filter groups (Topic / Delivery / Specials / Provider)
 *     visible at once. No accordion collapse — the "expanded by
 *     default" behaviour is permanent.
 *   • Chip toggles instead of stacked checkbox lists — a chip cloud
 *     reads the active set at a glance; checkboxes hide the active
 *     ones inside long scrolling lists.
 *   • Subtle brand-tinted gradient + brand-border ring make the
 *     panel "pop" without being loud.
 *   • Active-filter pill row at the top doubles as the live "what
 *     you've picked" summary + clear-all action.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Filter, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseFilterOptions {
  topic: string[];
  delivery: string[];
  provider: string[];
}

export function CourseFilters({ options }: { options: CourseFilterOptions }) {
  const router = useRouter();
  const sp = useSearchParams();

  const selected = useMemo(
    () => ({
      topic:    (sp.get("topic")    ?? "").split(",").filter(Boolean),
      delivery: (sp.get("delivery") ?? "").split(",").filter(Boolean),
      provider: (sp.get("provider") ?? "").split(",").filter(Boolean),
      special:  sp.get("special") === "1",
    }),
    [sp]
  );

  function setParam(key: string, values: string[]) {
    const next = new URLSearchParams(sp.toString());
    if (values.length === 0) next.delete(key);
    else next.set(key, values.join(","));
    router.push(`/courses?${next.toString()}`);
  }

  function toggle(key: "topic" | "delivery" | "provider", value: string) {
    const cur = new Set(selected[key]);
    if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    setParam(key, Array.from(cur));
  }

  function toggleSpecial() {
    const next = new URLSearchParams(sp.toString());
    if (selected.special) next.delete("special");
    else next.set("special", "1");
    router.push(`/courses?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams(sp.toString());
    next.delete("topic");
    next.delete("delivery");
    next.delete("provider");
    next.delete("special");
    router.push(`/courses?${next.toString()}`);
  }

  const totalActive =
    selected.topic.length + selected.delivery.length + selected.provider.length + (selected.special ? 1 : 0);

  return (
    <section
      aria-label="Course filters"
      className={cn(
        "rounded-2xl border-2 p-5 sm:p-6 mb-6",
        "border-brand-200 bg-gradient-to-br from-brand-50/60 via-card to-card",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.4)_inset,0_8px_24px_-12px_rgba(0,0,0,0.08)]",
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-brand-600 text-white items-center justify-center shadow-sm">
            <Filter size={16} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-fg leading-tight">
              Filter the catalog
            </h2>
            <p className="text-xs text-muted leading-tight mt-0.5">
              Pick any combination — chips toggle on / off.
              {totalActive > 0 && (
                <>
                  {" "}
                  <strong className="text-brand-700">{totalActive} active.</strong>
                </>
              )}
            </p>
          </div>
        </div>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 px-3 py-1.5 rounded-full border border-brand-200 bg-white hover:bg-brand-50 transition-colors"
          >
            <X size={11} /> Clear all
          </button>
        )}
      </div>

      {/* Specials — visually first because it's the loudest call */}
      <div className="mb-4">
        <button
          type="button"
          onClick={toggleSpecial}
          aria-pressed={selected.special}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors",
            "ring-1 ring-inset",
            selected.special
              ? "bg-amber-100 text-amber-800 ring-amber-300 shadow-sm"
              : "bg-card text-muted ring-line hover:bg-amber-50 hover:text-amber-800 hover:ring-amber-200",
          )}
        >
          <Sparkles size={11} />
          Special programs &amp; workshops (instructor-led)
        </button>
      </div>

      {/* Three-column grid of filter groups. md+ uses unequal widths
          so the longest chip cloud (Topic — typically 10+ options) gets
          the lion's share and the shorter clouds (Delivery, Provider)
          don't waste a third of the row on whitespace. Mobile stacks
          to single column. Vertical dividers between sections come
          from `divide-x` plus a per-column left padding so the chips
          stay clear of the rule. */}
      <div className="md:grid md:grid-cols-[1.8fr_1fr_1.3fr] md:divide-x md:divide-line space-y-5 md:space-y-0">
        <div className="md:pr-5">
          <ChipGroup
            label="Topic"
            values={options.topic}
            selected={selected.topic}
            onToggle={(v) => toggle("topic", v)}
          />
        </div>
        <div className="md:px-5">
          <ChipGroup
            label="Delivery"
            values={options.delivery}
            selected={selected.delivery}
            onToggle={(v) => toggle("delivery", v)}
          />
        </div>
        <div className="md:pl-5">
          <ChipGroup
            label="Provider"
            values={options.provider}
            selected={selected.provider}
            onToggle={(v) => toggle("provider", v)}
          />
        </div>
      </div>
    </section>
  );
}

function ChipGroup({
  label, values, selected, onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const sel = new Set(selected);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-2">
        {label}
        {selected.length > 0 && (
          <span className="ml-2 text-brand-700 normal-case tracking-normal font-semibold">
            · {selected.length}
          </span>
        )}
      </p>
      {values.length === 0 ? (
        <p className="text-xs text-subtle">No options yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => {
            const on = sel.has(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(v)}
                aria-pressed={on}
                className={cn(
                  "text-xs px-3 py-1 rounded-full transition-colors ring-1 ring-inset",
                  on
                    ? "bg-brand-600 text-white ring-brand-700 font-medium shadow-sm"
                    : "bg-card text-fg ring-line hover:bg-brand-50 hover:ring-brand-200 hover:text-brand-800",
                )}
              >
                {v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
