"use client";
/**
 * Top-of-page filter panel for the course catalog.
 *
 * Design choices:
 *   • Compact recessed control strip — the panel reads as machinery
 *     above the bright course cards, not as a second hero. (It was a
 *     dark slab once; see the inline note on the section element.)
 *   • Two filter groups visible at once. Chip toggles instead
 *     of stacked checkbox lists — a chip cloud reads the active set
 *     at a glance.
 *   • Active-count + clear-all live in the header, so the body of
 *     the panel is pure chips with no chrome competing for attention.
 *
 * The header used to carry a loud amber "Special programs & workshops
 * (instructor-led)" toggle. It is gone: the page is now framed as the
 * on-demand catalogue, and a facet that singled out the instructor-led
 * rows contradicted that framing. `isSpecial` still exists on the model
 * and is still editable by admins from the card's quick-edit dialog —
 * only the trainee-facing filter is removed. `?special=1` also still
 * filters server-side (see the courses page) for any saved link.
 *
 * Delivery went the same way. Every card already prints its delivery
 * mode as a coloured chip, so the facet was a second way to read a
 * property that was never hidden; `delivery` stays on the model, stays
 * on the card, and `?delivery=` still filters server-side.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseFilterOptions {
  topic: string[];
  delivery: string[];
  provider: string[];
}

/** Published-course count per filter value, keyed by facet. A missing
 *  key means zero — the chip still renders, showing "(0)", rather than
 *  disappearing and leaving the facet list looking arbitrary. */
export type CourseFilterCounts = Record<"topic" | "delivery" | "provider", Record<string, number>>;

export function CourseFilters({
  options,
  counts,
}: {
  options: CourseFilterOptions;
  counts?: CourseFilterCounts;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const selected = useMemo(
    () => ({
      topic:    (sp.get("topic")    ?? "").split(",").filter(Boolean),
      delivery: (sp.get("delivery") ?? "").split(",").filter(Boolean),
      provider: (sp.get("provider") ?? "").split(",").filter(Boolean),
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

  function clearAll() {
    const next = new URLSearchParams(sp.toString());
    next.delete("topic");
    next.delete("delivery");
    next.delete("provider");
    // Cleared too, so a saved `?special=1` link doesn't survive a
    // "Clear" that has no control able to show it is still on.
    next.delete("special");
    router.push(`/courses?${next.toString()}`);
  }

  const totalActive =
    selected.topic.length + selected.delivery.length + selected.provider.length;

  return (
    <section
      aria-label="Course filters"
      className={cn(
        "rounded-xl p-3 sm:p-4 mb-4",
        // A quiet recessed surface, not a dark slab. It used to be
        // bg-slate-900 with a modal shadow, theme-independent — which
        // made a row of controls read as a title block announcing
        // itself above the catalogue. Filters are chrome; they should
        // sit UNDER the content in the visual hierarchy, not over it.
        // Tokens, so it recedes correctly in all seventeen themes
        // rather than being a navy rectangle in every one.
        "bg-elevated text-fg border border-line",
      )}
    >
      {/* Compact header row: title, active count, clear-all. */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Filter size={15} className="text-subtle shrink-0" />
          <h2 className="text-[14px] font-bold text-fg whitespace-nowrap">
            Filter
          </h2>
          {totalActive > 0 && (
            <span className="text-[11px] font-semibold tabular-nums text-brand-700 whitespace-nowrap">
              · {totalActive} active
            </span>
          )}
        </div>

        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-fg px-2 py-1 rounded-full ring-1 ring-inset ring-line hover:ring-line-strong transition-colors"
          >
            <X size={10} /> Clear
          </button>
        )}
      </div>

      {/* Two-column chip grid. Mobile stacks; md+ gives Topic the larger
          share, since it is much the longest cloud. Delivery used to be
          the middle column — see the file header for why it went. */}
      <div className="md:grid md:grid-cols-[1.8fr_1.3fr] md:divide-x md:divide-line space-y-3 md:space-y-0">
        <div className="md:pr-4">
          <ChipGroup
            label="Topic"
            values={options.topic}
            counts={counts?.topic}
            selected={selected.topic}
            onToggle={(v) => toggle("topic", v)}
          />
        </div>
        <div className="md:pl-4">
          <ChipGroup
            label="Provider"
            values={options.provider}
            counts={counts?.provider}
            selected={selected.provider}
            onToggle={(v) => toggle("provider", v)}
          />
        </div>
      </div>
    </section>
  );
}

function ChipGroup({
  label, values, selected, onToggle, counts,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
  counts?: Record<string, number>;
}) {
  const sel = new Set(selected);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-1.5">
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
        <div className="flex flex-wrap gap-1">
          {values.map((v) => {
            const on = sel.has(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(v)}
                aria-pressed={on}
                className={cn(
                  "text-[11px] px-2.5 py-0.5 rounded-full transition-colors ring-1 ring-inset",
                  on
                    ? "bg-brand-500 text-white ring-brand-400 font-semibold shadow-sm"
                    : "bg-card-solid text-fg ring-line hover:bg-raised hover:ring-line-strong",
                )}
              >
                {v}
                {counts && (
                  <span className={cn("ml-1 tabular-nums", on ? "text-white/80" : "text-subtle")}>
                    ({counts[v] ?? 0})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
