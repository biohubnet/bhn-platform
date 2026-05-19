"use client";

/**
 * BiomarkerQualification — four-stage looping animation of a
 * biomarker moving from discovery candidate to qualified assay.
 *
 * Stages:
 *   1. DISCOVERY  — a scatter of candidate analytes; many points
 *   2. CONFIRM    — a smaller subset clusters around a target line
 *   3. VALIDATE   — three remaining points form a tight ROC-like
 *                   curve in a small inset
 *   4. QUALIFY    — a green "qualified" badge stamps onto the result
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["discovery", "confirm", "validate", "qualify"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  discovery: { label: "DISCOVERY",  sub: "candidates · n=200", duration: 2400 },
  confirm:   { label: "CONFIRM",    sub: "shortlist · n=12",   duration: 2600 },
  validate:  { label: "VALIDATE",   sub: "ROC · sens/spec",    duration: 3000 },
  qualify:   { label: "QUALIFIED",  sub: "fit for purpose",    duration: 3000 },
};

// Candidate scatter — fades as stages progress
const SCATTER = [
  {x:30,y:70},{x:42,y:54},{x:50,y:84},{x:60,y:64},
  {x:68,y:48},{x:74,y:74},{x:84,y:60},{x:92,y:82},
  {x:100,y:50},{x:110,y:70},{x:120,y:42},{x:124,y:78},
  {x:34,y:90},{x:46,y:34},{x:96,y:36},{x:114,y:84},
];

// Confirmed shortlist (subset of indices)
const CONFIRM_IDX = [2, 5, 7, 9, 10];
// Validated three
const VALIDATE_IDX = [5, 7, 10];

interface Props { size?: number; className?: string; }

export function BiomarkerQualification({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  function pointOpacity(i: number): number {
    if (stage === "discovery") return 0.7;
    if (stage === "confirm") return CONFIRM_IDX.includes(i) ? 0.9 : 0.15;
    if (stage === "validate") return VALIDATE_IDX.includes(i) ? 1 : 0.05;
    return VALIDATE_IDX.includes(i) ? 1 : 0;
  }
  function pointFill(i: number): string {
    if (stage === "qualify" && VALIDATE_IDX.includes(i)) return "#86efac";
    return "currentColor";
  }

  const ROC_LEN = 120;
  const showRoc = stage === "validate" || stage === "qualify";
  const showBadge = stage === "qualify";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 180)}
        viewBox="0 0 180 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Biomarker qualification — ${info.label}`}
      >
        {/* Axes */}
        <line x1="20" y1="98" x2="140" y2="98" strokeWidth="0.55" opacity="0.55" />
        <line x1="20" y1="98" x2="20" y2="22" strokeWidth="0.55" opacity="0.55" />
        <text x="80" y="110" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">candidates</text>
        <text x="14" y="60" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" textAnchor="middle" transform="rotate(-90 14 60)">signal</text>

        {/* Candidates */}
        {SCATTER.map((p, i) => (
          <circle
            key={`s-${i}`}
            cx={p.x} cy={p.y} r="1.9"
            fill={pointFill(i)}
            stroke="none"
            opacity={pointOpacity(i)}
            style={{ transition: noTransition ?? "opacity 600ms ease, fill 600ms ease" }}
          />
        ))}

        {/* ROC inset (validate / qualify) */}
        <g
          opacity={showRoc ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
          transform="translate(112 22)"
        >
          <rect x="0" y="0" width="50" height="50" rx="2" stroke="currentColor" strokeWidth="0.55" opacity="0.5" />
          <line x1="4" y1="46" x2="46" y2="46" strokeWidth="0.45" opacity="0.45" />
          <line x1="4" y1="46" x2="4" y2="4" strokeWidth="0.45" opacity="0.45" />
          <line x1="4" y1="46" x2="46" y2="4" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.4" />
          <path
            d="M 4 46 Q 8 18, 22 8 Q 32 5, 46 4"
            stroke="#86efac" strokeWidth="0.95" fill="none"
            strokeDasharray={ROC_LEN}
            strokeDashoffset={showRoc ? 0 : ROC_LEN}
            style={{ transition: noTransition ?? "stroke-dashoffset 1100ms cubic-bezier(.4,.1,.4,1)" }}
          />
          <text x="25" y="58" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">ROC · AUC 0.92</text>
        </g>

        {/* Qualified badge */}
        <g
          opacity={showBadge ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: showBadge ? "rotate(-8deg) translate(0,0)" : "rotate(-8deg) translate(-6px,6px)",
            transformOrigin: "44px 86px",
          }}
        >
          <rect x="24" y="78" width="40" height="16" rx="8" stroke="#86efac" strokeWidth="0.9" fill="#86efac" fillOpacity="0.18" />
          <text x="44" y="89" textAnchor="middle" fontSize="6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700" letterSpacing="0.5">QUALIFIED</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 162)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i} cx={i * 12} cy={0} r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
