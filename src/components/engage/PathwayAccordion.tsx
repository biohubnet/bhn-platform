"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Learning Pathways, as expandable sections.
 *
 * Each pathway opens in place to reveal the cohort programmes inside it —
 * multi-day in-person sittings run with partner providers, not the
 * self-paced catalogue. Expanding beats navigating here because the
 * decision a trainee is making is "which of these six, and what's actually
 * running", which needs the programmes side by side.
 *
 * Styling follows the same language as the course card: one ground
 * throughout, hairlines rather than filled panels to separate regions, and
 * chip hue carried by the fill and ring while the label uses text-fg so it
 * tracks the theme. See CourseCard for why a fixed label colour cannot
 * hold across the seventeen themes.
 *
 * The open/closed dot appears twice and means two different things: on the
 * pathway header it is the enrolment window for the pathway as a whole, on
 * a programme it is that programme's own state. Regulatory Affairs is
 * closed while its Seneca programme is also closed; Research and
 * Development is open while its Proteomics programme is not.
 */

export interface PathwayProgramme {
  id: string;
  title: string;
  provider: string | null;
  delivery: string | null;
  creditCost: number;
  /** Free text — programmes run as several discrete multi-day sittings. */
  sessionDates: string | null;
  /** Pre-formatted server-side; null renders as "TBD". */
  enrollByLabel: string | null;
  isOpen: boolean;
}

export interface PathwayEntry {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  /** Cover art, or null for the accent-tinted fallback. */
  thumbnail: string | null;
  /** Identity colour as a hex literal, from the Pathway record. */
  accentColor: string | null;
  /** Enrolment window for the pathway itself. */
  windowLabel: string;
  windowTone: "open" | "closed" | "full";
  /** The viewer's own enrolment in this pathway, if any. */
  myStatus: string | null;
  programmes: PathwayProgramme[];
}

const TONE_DOT: Record<PathwayEntry["windowTone"], string> = {
  open: "bg-emerald-500",
  closed: "bg-rose-500",
  full: "bg-amber-500",
};

/** Neutral fallback when a pathway has neither cover art nor an accent.
 *  Both are normally set, so this is a safety net rather than a design. */

/** `[data-theme] *` in globals.css sets transition-property/duration on every
 *  element, unlayered — so it beats Tailwind's layered transition utilities no
 *  matter their specificity. Component motion therefore has to be declared
 *  inline to win, which in turn means reduced motion has to be read here
 *  rather than expressed as a `motion-reduce:` class. */
const QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // useSyncExternalStore rather than an effect: it reads the real value on the
  // first client render instead of flashing the default, and the third
  // argument gives the server a value so hydration matches.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

const OPEN_EASE = "cubic-bezier(.22, 1, .36, 1)";
const CLOSE_EASE = "cubic-bezier(.4, 0, .2, 1)";
const EXIT_EASE = "cubic-bezier(.55, 0, 1, .45)";

const NEUTRAL_FALLBACK = "from-slate-400 to-slate-600";

/** One labelled figure inside the enrolment panel. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-subtle">{label}</p>
      <div className="mt-0.5 text-[12.5px] leading-snug text-fg">{children}</div>
    </div>
  );
}

/**
 * A programme inside an expanded pathway.
 *
 * Split into two halves that do different jobs: the LEFT carries the
 * identity and the thing you press, the RIGHT is a recessed panel of
 * enrolment facts — when it runs, when to apply by, what it costs, how
 * it is delivered and by whom.
 *
 * The panel uses `.detail-panel` rather than a literal grey, which
 * would be a light slab on Dark, Nightfall and Hitech. See its
 * definition in globals.css for why it mixes foreground into the card
 * instead of using `bg-raised` — Mist's surfaces are all white, so
 * `bg-raised` made the partition disappear there.
 */
function ProgrammeRow({ p }: { p: PathwayProgramme }) {
  return (
    <li className="rounded-sm border border-line bg-card-solid overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Identity + the action */}
        <div className="sm:w-[46%] sm:shrink-0 p-3.5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-fg leading-snug">{p.title}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", p.isOpen ? "bg-emerald-500" : "bg-rose-500")}
              />
              <span className={p.isOpen ? "text-emerald-700" : "text-rose-700"}>
                {p.isOpen ? "Open" : "Closed"}
              </span>
            </p>
          </div>

          <Link
            href={`/courses/${p.id}`}
            className={cn(
              "mt-auto inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-2",
              "bg-brand-600 text-white text-xs font-semibold",
              "hover:bg-brand-700 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
            )}
          >
            Course info &amp; application <ArrowRight size={13} />
          </Link>
        </div>

        {/* Enrolment detail — the recessed half */}
        <div className="flex-1 min-w-0 p-3.5 detail-panel border-t sm:border-t-0 sm:border-l border-line">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Session dates">
              {p.sessionDates ?? <span className="text-muted">To be announced</span>}
            </Detail>
            <Detail label="Enroll by">
              {p.enrollByLabel ? (
                <span className="font-semibold text-brand-700">{p.enrollByLabel}</span>
              ) : (
                <span className="text-muted">TBD</span>
              )}
            </Detail>
            <Detail label="Cost">
              {p.creditCost > 0 ? (
                <span className="font-semibold tabular-nums">
                  {p.creditCost.toLocaleString()} credits
                </span>
              ) : (
                <span className="text-muted">No credit cost</span>
              )}
            </Detail>
            <Detail label="Delivery">
              {p.delivery ?? <span className="text-muted">To be confirmed</span>}
            </Detail>
            {p.provider && (
              <div className="col-span-2">
                <Detail label="Delivered by">{p.provider}</Detail>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function PathwayAccordion({ pathways }: { pathways: PathwayEntry[] }) {
  const reduced = usePrefersReducedMotion();
  // Several can be open at once: the point is comparing what's running.
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="space-y-3">
      {pathways.map((p) => {
        const isOpen = open.has(p.id);
        return (
          <li
            key={p.id}
            className="rounded-lg border border-line bg-card overflow-hidden"
          >
            {/* Art beside the text rather than above it. As a full-width
                banner the artwork outweighed the title and description it was
                meant to introduce; in a left column it sits alongside them and
                the row reads as one unit.

                `self-stretch` lets the panel match whatever height the copy
                needs, and object-cover crops the 3.5:1 artwork to fit. */}
            <div className="flex items-stretch">
              <div
                className={cn(
                  "relative shrink-0 w-28 sm:w-44 overflow-hidden border-r border-line",
                  !p.accentColor && "bg-gradient-to-br " + NEUTRAL_FALLBACK,
                )}
                // Inline because the value is data on the Pathway record, not
                // a design token — the same pattern the merch tiers use.
                style={p.accentColor ? { backgroundColor: p.accentColor } : undefined}
              >
                {p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
              </div>

              <div className="flex-1 min-w-0">
            <h3>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-expanded={isOpen}
                aria-controls={`pathway-panel-${p.id}`}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left",
                  "hover:bg-elevated transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600",
                )}
              >
                {p.accentColor && (
                  <span
                    aria-hidden="true"
                    className="h-1 w-7 rounded-full shrink-0"
                    style={{ backgroundColor: p.accentColor }}
                  />
                )}
                <span className="flex-1 min-w-0 font-semibold text-fg text-[15px] leading-snug">
                  {p.title}
                </span>
                {/* Two different facts, so two different marks: the viewer's
                    own enrolment state, then the pathway's intake window. */}
                {p.myStatus && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700 ring-1 ring-inset ring-brand-200">
                    {p.myStatus === "approved" ? "Enrolled" : p.myStatus}
                  </span>
                )}
                <span className="flex items-center gap-1.5 shrink-0">
                  <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[p.windowTone])} />
                  <span className="text-[11px] font-semibold text-muted">{p.windowLabel}</span>
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-subtle",
                    isOpen && "rotate-180",
                  )}
                  style={{
                    transition: reduced ? "none" : `transform 300ms ${OPEN_EASE}`,
                  }}
                />
              </button>
            </h3>

            {/* Always visible. This is the text a trainee reads to decide
                whether the pathway is worth expanding, so hiding it behind
                the toggle makes the collapsed list unreadable — six titles
                and nothing to choose between them. */}
            {p.description && (
              <p className="px-4 pb-3.5 -mt-0.5 text-[13px] text-fg-muted leading-relaxed">
                {p.description}
              </p>
            )}
              </div>
            </div>

            {/* The expanded programme list spans the full card width — the
                art column belongs to the header row, not to the panel.

                grid-rows 0fr -> 1fr animates to content height without a
                hard-coded max-height, and collapses to genuinely zero.

                Durations are bracketed, not bare: `duration-250` is not on
                Tailwind's scale, so it compiled to nothing and the panel was
                falling back to the 150ms default with a built-in ease.

                Opening is slower than closing (300 vs 220ms) and the content
                is held back 70ms so the card visibly makes room before the
                programmes arrive. Closing reverses that — content leaves
                first, at speed, because attention has already moved on. */}
            <div
              id={`pathway-panel-${p.id}`}
              role="region"
              className="grid"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transition: reduced
                  ? "none"
                  : `grid-template-rows ${isOpen ? `300ms ${OPEN_EASE}` : `220ms ${CLOSE_EASE}`}`,
              }}
            >
              <div className="overflow-hidden">
                <div
                  style={{
                    opacity: reduced || isOpen ? 1 : 0,
                    transform: reduced || isOpen ? "translateY(0)" : "translateY(-4px)",
                    transition: reduced
                      ? "none"
                      : isOpen
                        // Held back 70ms so the card visibly makes room before
                        // the programmes arrive.
                        ? `opacity 240ms ${OPEN_EASE} 70ms, transform 240ms ${OPEN_EASE} 70ms`
                        // On close the content leaves first and the height
                        // follows it down.
                        : `opacity 130ms ${EXIT_EASE}, transform 130ms ${EXIT_EASE}`,
                  }}
                >
                <div className="px-4 pb-4 pt-3 border-t border-line">
                  {p.programmes.length > 0 ? (
                    <ul className="mt-3.5 space-y-2.5">
                      {p.programmes.map((prog) => (
                        <ProgrammeRow key={prog.id} p={prog} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] text-subtle">
                      No programmes scheduled for this pathway yet.
                    </p>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
