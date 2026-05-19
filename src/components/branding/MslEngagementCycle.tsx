"use client";

/**
 * MslEngagementCycle — four-stage looping vignette of an MSL
 * (Medical Science Liaison) interacting with a KOL (Key Opinion
 * Leader). The whole job in one corner of the dark stage.
 *
 * Stages:
 *   1. PREP        — MSL at the desk, reviewing publications;
 *                    only the MSL silhouette + reading lamp +
 *                    paper stack visible. KOL chair empty.
 *   2. MEETING     — KOL silhouette appears across the desk; a
 *                    dashed conversation arc forms between them.
 *   3. EXCHANGE    — small "data points" travel along the arc
 *                    (left→right MSL share, right→left KOL share);
 *                    a manuscript tile slides forward.
 *   4. INSIGHT     — KOL fades back, an "insight" lozenge rises
 *                    from the manuscript toward an HQ marker above
 *                    the MSL — field intel routed back to Medical.
 *
 * The two seated figures are reduced to head + shoulder arcs to
 * stay glyph-scale. Identity is conveyed by role markers: the
 * MSL has a small badge dot on the chest, the KOL has a stethoscope
 * loop around the neck.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["prep", "meeting", "exchange", "insight"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  prep:     { label: "MSL · PRE-CALL PREP", sub: "review publications",  duration: 2800 },
  meeting:  { label: "KOL MEETING",         sub: "non-promotional",      duration: 2600 },
  exchange: { label: "SCIENTIFIC EXCHANGE", sub: "evidence ↔ insight",   duration: 3400 },
  insight:  { label: "FIELD INSIGHT",       sub: "routed to medical",    duration: 2800 },
};

interface Props {
  size?: number;
  className?: string;
}

export function MslEngagementCycle({ size = 160, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Visibility flags per stage. We layer everything in always and
  // tween opacity so transitions are smooth.
  const kolOpacity   = stage === "prep"     ? 0    : 1;
  const arcOpacity   = stage === "meeting" || stage === "exchange" ? 0.85 : 0;
  const exchangeOp   = stage === "exchange" ? 1    : 0;
  const insightOp    = stage === "insight"  ? 1    : 0;
  const manuscriptOp = stage === "exchange" || stage === "insight" ? 1 : 0;

  // Manuscript slides forward during EXCHANGE; insight lozenge rises during INSIGHT.
  const manuscriptY = stage === "exchange" || stage === "insight" ? 0 : 10;
  const insightY    = stage === "insight" ? -30 : 0;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 160)}
        viewBox="0 0 160 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`MSL engagement cycle — ${info.label}`}
      >
        {/* ── HQ marker — small antenna above the MSL, the route
              destination for field insight. */}
        <g opacity="0.45">
          <line x1="36" y1="20" x2="36" y2="30" />
          <circle cx="36" cy="20" r="1.6" fill="currentColor" stroke="none" />
          <text
            x="42" y="22"
            fontSize="5.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.3"
          >
            HQ
          </text>
        </g>

        {/* ── Desk — single horizontal line spanning the meeting. */}
        <line x1="14" y1="92" x2="146" y2="92" strokeWidth="1.05" />
        {/* desk legs / shadow */}
        <line x1="26" y1="92" x2="26" y2="104" opacity="0.4" />
        <line x1="134" y1="92" x2="134" y2="104" opacity="0.4" />

        {/* ── MSL (left) — head + shoulders + badge dot. */}
        <g>
          <circle cx="36" cy="58" r="9" />
          <path d="M 22 92 Q 36 72, 50 92" />
          {/* badge */}
          <circle cx="40" cy="80" r="1.4" fill="currentColor" stroke="none" opacity="0.85" />
        </g>

        {/* ── KOL (right) — head + shoulders + stethoscope loop. */}
        <g
          opacity={kolOpacity}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <circle cx="124" cy="58" r="9" />
          <path d="M 110 92 Q 124 72, 138 92" />
          {/* stethoscope: small loop around the neck */}
          <path
            d="M 118 74 Q 124 80, 130 74"
            strokeWidth="0.78"
            opacity="0.7"
            fill="none"
          />
          <circle cx="124" cy="82" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
        </g>

        {/* ── Conversation arc — dashed line above the desk linking
              MSL ↔ KOL during MEETING and EXCHANGE. */}
        <path
          d="M 50 68 Q 80 46, 110 68"
          stroke="currentColor"
          strokeWidth="0.68"
          strokeDasharray="2.2 2.2"
          opacity={arcOpacity}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
          fill="none"
        />

        {/* ── Exchange data points — small dots travel along the arc
              during EXCHANGE. Position is hard-coded along the curve
              by stage to keep the SVG static-friendly. */}
        <g
          opacity={exchangeOp}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <circle cx="68" cy="54" r="1.5" fill="currentColor" stroke="none" opacity="0.85" />
          <circle cx="80" cy="50" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="92" cy="54" r="1.5" fill="currentColor" stroke="none" opacity="0.85" />
        </g>

        {/* ── Manuscript tile — slides into the desk during EXCHANGE
              and stays for INSIGHT. */}
        <g
          opacity={manuscriptOp}
          style={{
            transition:
              noTransition ?? "opacity 500ms ease, transform 700ms cubic-bezier(.4,.1,.4,1)",
            transform: `translateY(${manuscriptY}px)`,
          }}
        >
          <rect x="68" y="82" width="24" height="6" rx="1" opacity="0.85" />
          {/* lines representing manuscript text */}
          <line x1="71" y1="85" x2="89" y2="85" strokeWidth="0.5" opacity="0.55" />
        </g>

        {/* ── Insight lozenge — rises from the manuscript toward HQ. */}
        <g
          opacity={insightOp}
          style={{
            transition:
              noTransition ?? "opacity 500ms ease, transform 900ms cubic-bezier(.4,.1,.4,1)",
            transform: `translateY(${insightY}px)`,
          }}
        >
          <rect
            x="62" y="74" width="18" height="9" rx="4.5"
            fill="currentColor" fillOpacity="0.18"
            stroke="currentColor" strokeWidth="0.68"
          />
          <text
            x="71" y="80.5"
            textAnchor="middle"
            fontSize="5.2"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >
            INSIGHT
          </text>
          {/* trail of dots toward HQ */}
          <circle cx="56" cy="56" r="1.1" fill="currentColor" stroke="none" opacity="0.55" />
          <circle cx="48" cy="42" r="0.9" fill="currentColor" stroke="none" opacity="0.4" />
          <circle cx="40" cy="32" r="0.8" fill="currentColor" stroke="none" opacity="0.28" />
        </g>

        {/* ── Stage label + sub-label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="80" y="132" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="80" y="144" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(62 160)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
