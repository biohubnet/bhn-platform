"use client";

/**
 * RegulatorySubmission — five-stage looping animation of a
 * regulatory submission lifecycle (IND, NDA, MAA, etc.). A stack
 * of eCTD modules compiles, ships through a "review clock", goes
 * through agency review, and receives an approval stamp.
 *
 * Stages:
 *   1. COMPILE   — five eCTD module bars stack up from the bottom
 *                  one by one (M1 → M5).
 *   2. SUBMIT    — the whole stack lifts into the agency portal
 *                  arrow at the top.
 *   3. CLOCK     — a circular review clock rotates with a tick
 *                  hand; "PDUFA" annotation under it.
 *   4. REVIEW    — small comment / IR markers appear adjacent to
 *                  module bars (information requests during review).
 *   5. APPROVAL  — a green check stamp drops onto the dossier.
 *
 * Stack module legend (top → bottom is M1 → M5, but visually we
 * paint M1 at top):
 *   M1 Administrative · M2 Summaries · M3 Quality · M4 NonClinical
 *   M5 Clinical
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["compile", "submit", "clock", "review", "approval"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  compile:  { label: "COMPILE · eCTD",   sub: "M1–M5 assembly",  duration: 3200 },
  submit:   { label: "SUBMIT",           sub: "ESG gateway",     duration: 2200 },
  clock:    { label: "REVIEW CLOCK",     sub: "PDUFA · 6 mo",    duration: 3000 },
  review:   { label: "INFO REQUESTS",    sub: "agency IRs",      duration: 2800 },
  approval: { label: "APPROVAL",         sub: "marketing auth",  duration: 3200 },
};

// Modules — index 0 is M1 (top), 4 is M5 (bottom).
const MODULES = ["M1", "M2", "M3", "M4", "M5"];

interface Props {
  size?: number;
  className?: string;
}

export function RegulatorySubmission({ size = 160, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // How many modules are visible (compile pile up M5 → M1 → M5 over the cycle).
  const visibleModules =
    stage === "compile"
      ? // Half-way through compile we want all five visible — easiest
        // approximation: show all five during compile (the entrance
        // is implied by the stage label). Reduced-motion gets the
        // same depiction.
        MODULES.length
      : MODULES.length;

  // Submit translation — entire dossier shifts up during SUBMIT.
  const dossierY = stage === "submit" || stage === "clock" ? -16 : 0;
  const dossierOpacity = 1;

  // Clock visibility.
  const showClock = stage === "clock" || stage === "review" || stage === "approval";
  const clockRotate = stage === "clock" ? 270 : stage === "review" ? 200 : stage === "approval" ? 350 : 0;

  // Info request markers visible during REVIEW.
  const showIR = stage === "review";

  // Approval stamp visible only at the end.
  const showStamp = stage === "approval";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (180 / 160)}
        viewBox="0 0 160 180"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Regulatory submission — ${info.label}`}
      >
        {/* ── Agency portal arrow at the top — destination icon. */}
        <g opacity="0.55">
          <path d="M 70 14 L 80 6 L 90 14" />
          <line x1="80" y1="6" x2="80" y2="24" />
          <text
            x="98" y="20"
            fontSize="5.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >
            FDA
          </text>
        </g>

        {/* ── Dossier stack — five module bars. */}
        <g
          opacity={dossierOpacity}
          style={{
            transition: noTransition ?? "transform 800ms cubic-bezier(.4,.1,.4,1)",
            transform: `translateY(${dossierY}px)`,
          }}
        >
          {MODULES.map((m, i) => {
            const visible = i < visibleModules;
            const y = 50 + i * 11;
            return (
              <g
                key={m}
                opacity={visible ? 1 : 0}
                style={{ transition: noTransition ?? "opacity 500ms ease" }}
              >
                <rect
                  x="36" y={y} width="88" height="9"
                  rx="1"
                  stroke="currentColor" strokeWidth="1.2"
                />
                <text
                  x="44" y={y + 6.6}
                  fontSize="5.4"
                  fill="currentColor" stroke="none"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  letterSpacing="0.4"
                  opacity="0.85"
                >
                  {m}
                </text>
                {/* Module spine */}
                <line x1="56" y1={y + 2} x2="56" y2={y + 7} strokeWidth="0.7" opacity="0.4" />
              </g>
            );
          })}
        </g>

        {/* ── Info requests — small dots on the right of select modules. */}
        <g
          opacity={showIR ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <circle cx="130" cy="55" r="1.6" fill="#fbbf24" stroke="none" />
          <circle cx="130" cy="77" r="1.6" fill="#fbbf24" stroke="none" />
          <circle cx="130" cy="88" r="1.6" fill="#fbbf24" stroke="none" />
          <text
            x="138" y="58"
            fontSize="4.8"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            IR
          </text>
        </g>

        {/* ── Review clock — circular timer + tick hand. */}
        <g
          opacity={showClock ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <circle cx="80" cy="120" r="13" strokeWidth="1.2" opacity="0.85" />
          <g
            style={{
              transformOrigin: "80px 120px",
              transition: noTransition ?? "transform 900ms cubic-bezier(.4,.1,.4,1)",
              transform: `rotate(${clockRotate}deg)`,
            }}
          >
            <line x1="80" y1="120" x2="80" y2="111" strokeWidth="1.4" />
          </g>
          {/* hour ticks */}
          {[0, 90, 180, 270].map((deg) => (
            <line
              key={deg}
              x1="80" y1="109"
              x2="80" y2="111"
              strokeWidth="1.0"
              opacity="0.7"
              transform={`rotate(${deg} 80 120)`}
            />
          ))}
        </g>

        {/* ── Approval stamp — green ring with check. Drops onto the
              dossier at the final stage. */}
        <g
          opacity={showStamp ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: showStamp ? "translateY(0px) scale(1)" : "translateY(-12px) scale(0.85)",
            transformOrigin: "80px 120px",
          }}
        >
          <circle cx="80" cy="120" r="13" stroke="#86efac" strokeWidth="1.6" />
          <path
            d="M 73 121 L 78 126 L 88 115"
            stroke="#86efac" strokeWidth="1.8" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="80" y="150" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="80" y="162" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(56 174)"
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
