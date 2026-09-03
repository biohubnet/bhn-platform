"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
  /** Short start date ("21 Oct"), formatted server-side. Null when the
   *  programme has no cohort start on record. */
  startsLabel: string | null;
  /** Whole days from today to the enrolment deadline, computed server-side
   *  so the urgent state cannot differ between render and hydration.
   *  Negative once the deadline has passed; null when there is no deadline. */
  daysToEnrollBy: number | null;
  isOpen: boolean;
}

/** Inside this many days the deadline is called out rather than just stated. */
const CLOSING_SOON_DAYS = 7;

export interface PathwayEntry {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  /** Cover art, or null to leave the column as plain neutral ground. */
  thumbnail: string | null;
  /** Identity colour as a hex literal, from the Pathway record. Carried by
   *  the marker beside the title only — see MEDIA_COL for why it no longer
   *  fills the column. */
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

/** Width of the media column. Declared once because it is used twice — the
 *  artwork segment beside the header, and the plain continuation beside the
 *  expanded programmes. If those two drift apart the column stops reading as
 *  one column, which is the whole point of it.
 *
 *  Neither segment is filled with the pathway's colour, and that took two
 *  passes to settle. The accent hex was tolerable at collapsed height and
 *  much too loud once an open card stretched it down past several
 *  programmes: a wide slab of saturated colour, the loudest thing on
 *  screen, competing with the artwork directly above it. A dark neutral
 *  fixed the loudness and read as a second, emptier column. So the colour
 *  left the interior entirely — it is the card's outline now, plus the
 *  marker beside the title. Area was the problem, not hue: an outline and a
 *  marker carry the same colour at any card height without ever growing. */
const MEDIA_COL = "w-32 sm:w-48";

/**
 * One programme inside an expanded pathway.
 *
 * A list row, deliberately not a table. The previous version split 46/54
 * with a recessed panel of five labelled fields on the right, which put a
 * table inside a card inside a page — and a five-column grid at that width
 * only fits by shrinking the labels to 8.5px and fading them, which is
 * exactly what made it hard to read.
 *
 * The columns are gone and the values name themselves: "3,500 credits",
 * "Enrol by 11 September 2026". Nothing here is below 11px and every text
 * colour clears 4.5:1 on all seventeen themes (see .pathway-list in
 * globals.css for the solved mixes).
 *
 * Start date left, status right, on every row — those two align down the
 * list, which is the vertical scan the table was good for. The middle is
 * free to wrap.
 *
 * The whole row is the link. There is no per-row button: three buttons in
 * one open pathway competed with the pathway's own call to action, and
 * dropping them is what buys the width the dates need.
 */
function ProgrammeRow({ p }: { p: PathwayProgramme }) {
  // Closing soon is a state, not a styling flourish, so it is computed once
  // and drives the colour, the weight and the extra line together.
  const closingSoon =
    p.isOpen &&
    p.daysToEnrollBy !== null &&
    p.daysToEnrollBy >= 0 &&
    p.daysToEnrollBy <= CLOSING_SOON_DAYS;

  return (
    <li>
      <Link
        href={`/courses/${p.id}`}
        className={cn(
          "flex flex-col gap-3 px-1 py-4",
          "sm:flex-row sm:items-start sm:gap-5",
          "transition-colors hover:bg-elevated",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        )}
      >
        {/* Start date and deadline. Emphasis is size and weight only — a
            filled chip here read as an island on the leading edge of every
            row, and pulled the eye to the furniture rather than the
            programme. 11rem fits "Enrol by 11 September 2026" without
            wrapping mid-date. */}
        <div className="shrink-0 sm:w-44 font-mono">
          <span className="text-[12.5px] pathway-secondary">Starts</span>
          <span className="ml-1.5 text-[19px] font-bold tracking-tight text-fg">
            {p.startsLabel ?? "TBC"}
          </span>
          <span
            className={cn(
              "block mt-1.5 text-[12.5px] leading-snug",
              closingSoon ? "font-semibold pathway-urgent" : "pathway-secondary",
            )}
          >
            {p.enrollByLabel ? `Enrol by ${p.enrollByLabel}` : "No enrolment deadline set"}
            {closingSoon && (
              // The colour is never the only carrier: this also states the
              // number, so the urgency survives a monochrome screen and the
              // roughly one reader in twelve who cannot separate red here.
              <span className="block mt-0.5">
                {p.daysToEnrollBy === 0
                  ? "Closes today"
                  : `${p.daysToEnrollBy} day${p.daysToEnrollBy === 1 ? "" : "s"} left`}
              </span>
            )}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="block text-[15.5px] font-semibold leading-snug text-fg">
            {p.title}
          </span>
          <span className="block mt-1 text-[13px] leading-snug pathway-secondary">
            {p.sessionDates ?? "Session dates to be announced"}
          </span>
          <span className="block mt-0.5 text-[13px] leading-snug pathway-secondary">
            {p.provider ?? "Provider to be confirmed"} · {p.delivery ?? "Delivery to be confirmed"} ·{" "}
            <b className="font-semibold text-fg tabular-nums">
              {p.creditCost > 0 ? `${p.creditCost.toLocaleString()} credits` : "No credit cost"}
            </b>
          </span>
        </div>

        {/* The only filled thing on a row. A fill means status here and
            nothing else, which is what lets it be spotted at a glance. */}
        <div className="shrink-0 sm:pt-0.5">
          <span
            className={cn(
              "inline-block rounded px-2.5 py-1.5 font-mono text-[11.5px] font-semibold",
              "uppercase tracking-[0.11em] text-fg",
              p.isOpen ? "pathway-chip-open" : "pathway-chip-closed",
            )}
          >
            {p.isOpen ? "Enrolling" : "Closed"}
          </span>
        </div>
      </Link>
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
          // The pathway's colour lives on the card's own edge now, not in a
          // filled column. An outline is the one place a hue can be carried
          // at any card height without gaining area as the card grows — the
          // failure of every fill we tried: fine collapsed, a slab open.
          //
          // Inline because the value is data on the Pathway record rather
          // than a design token, the same exception the marker beside the
          // title takes. Falls back to --line when a pathway has no accent.
          <li
            key={p.id}
            className="rounded-lg border border-line bg-card overflow-hidden"
            style={p.accentColor ? { borderColor: p.accentColor } : undefined}
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
                  "relative shrink-0 overflow-hidden border-r border-line pathway-column",
                  MEDIA_COL,
                )}
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
                {/* The pathway name is the only thing in this row a trainee
                    is actually choosing between, and at 15px it sat within a
                    couple of points of the description under it and the
                    window label beside it — six rows of near-uniform text
                    with nothing leading. Two steps up separates it from both
                    without making the collapsed list feel like headings. */}
                <span className="flex-1 min-w-0 font-semibold text-fg text-[17px] sm:text-[19px] leading-snug">
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

            {/* The panel is a full-width SIBLING of the header's flex row,
                not a child of it. That is what lets the panel's own media
                column (MEDIA_COL, below) start at x=0 and
                line up with the artwork above it, so an open card reads as
                one column running its whole height. Nesting this inside the
                header's flex-1 body would offset the continuation by the
                column's own width and stagger the two down the card — a
                break with no error and no obvious cause.

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
                {/* The media column continues down beside the programmes,
                    so expanding a pathway extends one column rather than
                    starting a full-width panel underneath it.

                    Ground only, no artwork: repeating or stretching the
                    image down the expanded height would make the picture
                    the loudest thing on an open card, when the point of
                    opening one is to read the programmes.

                    border-t sits on the RIGHT half alone. Spanning it the
                    full width would draw a line straight across the column
                    column and cut it in two — which is the seam this whole
                    change exists to remove. */}
                <div className="flex items-stretch">
                  {/* Card ground, not a fill of its own: with the colour
                      moved to the outline the interior is deliberately one
                      surface throughout, and the hairline on the right is
                      the only thing marking the column. */}
                  <div
                    aria-hidden="true"
                    className={cn("shrink-0 border-r border-line", MEDIA_COL)}
                  />
                  <div className="flex-1 min-w-0 px-4 pb-4 pt-3 border-t border-line">
                  {p.programmes.length > 0 ? (
                    <ul className="mt-2 divide-y divide-line-strong">
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
