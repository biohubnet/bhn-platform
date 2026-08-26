"use client";
import { useState } from "react";
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

/** Per-pathway accent, keyed by index so the six read as a set rather than
 *  six unrelated colours. Fixed hues, not theme tokens, so a pathway keeps
 *  its identity when someone switches theme — the same reasoning the
 *  course-card chips use. */
const ACCENTS = [
  "bg-violet-500", "bg-amber-500", "bg-rose-500",
  "bg-teal-500", "bg-emerald-500", "bg-fuchsia-500",
];

function Chip({ label, tone }: { label: string; tone: "credit" | "delivery" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1",
        "text-[10.5px] font-semibold leading-tight text-fg ring-1 ring-inset",
        tone === "credit"
          ? "bg-emerald-100 ring-emerald-200"
          : "bg-sky-100 ring-sky-200",
      )}
    >
      {label}
    </span>
  );
}

function ProgrammeRow({ p }: { p: PathwayProgramme }) {
  return (
    <li className="rounded-md border border-line bg-card-solid overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Identity */}
        <div className="sm:w-[38%] sm:shrink-0 p-3.5 sm:border-r border-line">
          <p className="text-sm font-semibold text-fg leading-snug">
            {p.title}
            {p.provider && (
              <span className="font-normal text-muted"> [{p.provider}]</span>
            )}
          </p>
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

        {/* Schedule + action */}
        <div className="flex-1 p-3.5 flex flex-col gap-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-subtle">
                  Session dates
                </p>
                <p className="mt-0.5 text-[12.5px] text-fg-muted leading-snug">
                  {p.sessionDates ?? "To be announced"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-subtle">
                  Enroll by
                </p>
                <p className="mt-0.5 text-[12.5px] font-semibold text-brand-700">
                  {p.enrollByLabel ?? "TBD"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {p.creditCost > 0 && (
                <Chip tone="credit" label={`Credit ${p.creditCost.toLocaleString()}`} />
              )}
              {p.delivery && <Chip tone="delivery" label={p.delivery} />}
            </div>
          </div>

          <Link
            href={`/courses/${p.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2",
              "bg-brand-600 text-white text-xs font-semibold",
              "hover:bg-brand-700 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
            )}
          >
            Course info &amp; application <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function PathwayAccordion({ pathways }: { pathways: PathwayEntry[] }) {
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
      {pathways.map((p, i) => {
        const isOpen = open.has(p.id);
        return (
          <li
            key={p.id}
            className="rounded-lg border border-line bg-card overflow-hidden"
          >
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
                <span
                  aria-hidden="true"
                  className={cn("h-1 w-7 rounded-full shrink-0", ACCENTS[i % ACCENTS.length])}
                />
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
                    "shrink-0 text-subtle transition-transform duration-200",
                    "motion-reduce:transition-none",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>

            {/* grid-rows 0fr -> 1fr animates to content height without a
                hard-coded max-height, and collapses to genuinely zero. */}
            <div
              id={`pathway-panel-${p.id}`}
              role="region"
              className={cn(
                "grid transition-[grid-template-rows] duration-250 ease-out",
                "motion-reduce:transition-none",
              )}
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-1 border-t border-line">
                  {p.description && (
                    <p className="text-[13px] text-fg-muted leading-relaxed mt-3">
                      {p.description}
                    </p>
                  )}
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
          </li>
        );
      })}
    </ul>
  );
}
