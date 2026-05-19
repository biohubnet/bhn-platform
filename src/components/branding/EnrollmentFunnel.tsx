"use client";

/**
 * EnrollmentFunnel — five-stage looping animation of a clinical
 * trial enrollment pipeline. Patient dots flow top-to-bottom
 * through a stylised funnel, with screen failures diverted out
 * the side. The Clinical Operations / Study Start-Up view of
 * the world.
 *
 * Stages:
 *   1. SCREEN      — candidates pile in at the top of the funnel
 *   2. CONSENT     — a portion drops into the consent slot
 *   3. SCREEN FAIL — a couple of dots drift out the right side
 *                    (failed I/E criteria)
 *   4. RANDOMIZE   — surviving dots split into two arms
 *   5. DOSE        — both arms reach the bottom dosing cup
 *
 * Every dot is pre-positioned per stage so motion is purely
 * opacity + translate — keeps the SVG cheap and the reduced-motion
 * fallback honest (first stage shows screening only).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["screen", "consent", "fail", "randomize", "dose"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  screen:    { label: "SCREENING",     sub: "I/E review",         duration: 2600 },
  consent:   { label: "CONSENT",       sub: "ICF signed",         duration: 2600 },
  fail:      { label: "SCREEN FAIL",   sub: "did not meet I/E",   duration: 2400 },
  randomize: { label: "RANDOMIZED",    sub: "1:1 IRT call",       duration: 3000 },
  dose:      { label: "FIRST DOSE",    sub: "C1D1",               duration: 2800 },
};

interface Props {
  size?: number;
  className?: string;
}

export function EnrollmentFunnel({ size = 150, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // How many of the 8 candidate dots are visible per stage,
  // and whether they have advanced into the funnel body.
  const candidatesOpacity = 1;
  const inConsent = stage === "consent" || stage === "randomize" || stage === "dose";
  const showFail = stage === "fail";
  const showRandomize = stage === "randomize" || stage === "dose";
  const showDose = stage === "dose";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 150)}
        viewBox="0 0 150 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Enrollment funnel — ${info.label}`}
      >
        {/* ── Funnel shell — wide at top, narrows to randomization,
              then two narrow tubes to the dosing cup. */}
        <path
          d="M 22 18 L 128 18 L 95 70 L 95 88 L 55 88 L 55 70 Z"
          stroke="currentColor" strokeWidth="1.4"
          fill="none" opacity="0.85"
        />
        {/* Two arms below the funnel — Arm A on the left, Arm B on the right. */}
        <path d="M 60 88 L 50 124" opacity="0.65" />
        <path d="M 90 88 L 100 124" opacity="0.65" />
        {/* Dose cup */}
        <path d="M 40 124 L 110 124 L 100 138 L 50 138 Z" opacity="0.7" />

        {/* ── Candidates entering the funnel (top row of 8 dots) */}
        <g
          opacity={candidatesOpacity}
          style={{ transition: noTransition ?? "opacity 400ms ease" }}
        >
          {[28, 40, 52, 64, 76, 88, 100, 112].map((x, i) => (
            <circle
              key={`cand-${i}`}
              cx={x} cy={28}
              r="1.9"
              fill="currentColor" stroke="none"
              fillOpacity="0.7"
            />
          ))}
        </g>

        {/* ── Consent dots — appear inside the narrowing funnel
              when stage advances past SCREENING. */}
        <g
          opacity={inConsent ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <circle cx="68" cy="58" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="76" cy="60" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="84" cy="58" r="1.9" fill="currentColor" stroke="none" />
        </g>

        {/* ── Screen-fail breakaway — two dots drift right and down
              along a dashed escape path. Only during FAIL. */}
        <g
          opacity={showFail ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path
            d="M 100 32 Q 124 36, 138 60"
            stroke="currentColor" strokeWidth="0.9"
            strokeDasharray="2 2" opacity="0.55"
            fill="none"
          />
          <circle cx="118" cy="38" r="1.8" fill="currentColor" stroke="none" opacity="0.75" />
          <circle cx="134" cy="56" r="1.8" fill="currentColor" stroke="none" opacity="0.55" />
          <text
            x="138" y="74"
            fontSize="5.2"
            textAnchor="end"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.65"
          >
            EXCL
          </text>
        </g>

        {/* ── Randomization — split into Arm A (left) and Arm B (right). */}
        <g
          opacity={showRandomize ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          {/* Arm A — solid dots */}
          <circle cx="54" cy="104" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="52" cy="116" r="1.9" fill="currentColor" stroke="none" />
          {/* Arm B — outlined (treatment vs control) */}
          <circle cx="96" cy="104" r="1.9" stroke="currentColor" fill="none" />
          <circle cx="98" cy="116" r="1.9" stroke="currentColor" fill="none" />
          {/* Tiny A / B labels */}
          <text
            x="40" y="108"
            fontSize="5"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            A
          </text>
          <text
            x="106" y="108"
            fontSize="5"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.7"
          >
            B
          </text>
        </g>

        {/* ── Dose cup — fills with all four randomized dots in DOSE. */}
        <g
          opacity={showDose ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <circle cx="60" cy="132" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="72" cy="132" r="1.9" fill="currentColor" stroke="none" />
          <circle cx="84" cy="132" r="1.9" stroke="currentColor" fill="none" />
          <circle cx="96" cy="132" r="1.9" stroke="currentColor" fill="none" />
        </g>

        {/* ── Stage label + sub-label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="75" y="154" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="75" y="164" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots — drawn outside the SVG content area for
              readability; uses xlink-style tiny y shift inside. */}
        <g
          transform="translate(53 6)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 11}
              cy={0}
              r="1.5"
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
