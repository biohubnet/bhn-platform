"use client";

/**
 * QcReleaseTesting — four-stage looping animation of a QC release
 * panel. A vial sits front-and-center; tests run one at a time
 * (ID → potency → purity) and each gets a check; the vial ships.
 *
 * Stages:
 *   1. ID       — identity test row checks
 *   2. POTENCY  — bioactivity bar fills to spec
 *   3. PURITY   — HPLC trace appears with main peak
 *   4. RELEASE  — green release stamp lands on the vial
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["id", "potency", "purity", "release"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  id:      { label: "IDENTITY",  sub: "peptide map",        duration: 2400 },
  potency: { label: "POTENCY",   sub: "in vitro · 92 %",    duration: 2600 },
  purity:  { label: "PURITY",    sub: "SEC · 99.4 % MAIN",  duration: 2800 },
  release: { label: "RELEASED",  sub: "CofA · lot 24-118",  duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function QcReleaseTesting({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const idChecked = stage !== "id" || true; // ID check appears immediately at ID stage
  const potChecked = stage === "potency" || stage === "purity" || stage === "release";
  const purChecked = stage === "purity" || stage === "release";
  const rls = stage === "release";
  const potencyBarH = stage === "id" ? 0 : 26;
  const showPurityTrace = stage === "purity" || stage === "release";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 170)}
        viewBox="0 0 170 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`QC release testing — ${info.label}`}
      >
        {/* Vial */}
        <g>
          <rect x="22" y="36" width="22" height="64" rx="2" />
          <rect x="20" y="30" width="26" height="6" rx="1" stroke-width="0.85" />
          <line x1="22" y1="64" x2="44" y2="64" strokeWidth="0.55" opacity="0.55" strokeDasharray="2 1.5" />
          {/* Liquid level */}
          <rect x="24" y="50" width="18" height="48" fill="#7dd3fc" fillOpacity="0.35" stroke="none" />
          {/* Lot number */}
          <text x="33" y="116" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">24-118</text>
        </g>

        {/* Release stamp */}
        <g
          opacity={rls ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: rls ? "rotate(-10deg) translate(0,0)" : "rotate(-10deg) translate(-6px,6px)",
            transformOrigin: "34px 70px",
          }}
        >
          <ellipse cx="34" cy="70" rx="14" ry="9" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.16" />
          <text x="34" y="73" textAnchor="middle" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700" letterSpacing="0.4">RELEASED</text>
        </g>

        {/* Test rows */}
        <g transform="translate(62 32)">
          {/* Row 1: Identity */}
          <g>
            <rect x="0" y="0" width="92" height="14" rx="2" stroke-width="0.55" opacity="0.7" />
            <text x="4" y="9" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">ID · PEPTIDE MAP</text>
            <g opacity={idChecked ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <circle cx="82" cy="7" r="3.6" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
              <path d="M 79 7 L 81 9 L 85 5" stroke="#86efac" strokeWidth="0.85" fill="none" />
            </g>
          </g>
          {/* Row 2: Potency */}
          <g transform="translate(0 20)">
            <rect x="0" y="0" width="92" height="14" rx="2" stroke-width="0.55" opacity="0.7" />
            <text x="4" y="9" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">POTENCY</text>
            {/* potency bar */}
            <rect x="40" y="5" width={potencyBarH} height="4" fill="#7dd3fc" fillOpacity="0.7" stroke="none" style={{ transition: noTransition ?? "width 600ms ease" }} />
            <line x1="68" y1="3" x2="68" y2="11" strokeWidth="0.55" opacity="0.6" />
            <g opacity={potChecked ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <circle cx="82" cy="7" r="3.6" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
              <path d="M 79 7 L 81 9 L 85 5" stroke="#86efac" strokeWidth="0.85" fill="none" />
            </g>
          </g>
          {/* Row 3: Purity */}
          <g transform="translate(0 40)">
            <rect x="0" y="0" width="92" height="14" rx="2" stroke-width="0.55" opacity="0.7" />
            <text x="4" y="9" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">PURITY</text>
            {/* Mini chromatogram */}
            <g
              opacity={showPurityTrace ? 1 : 0}
              style={{ transition: noTransition ?? "opacity 500ms ease" }}
            >
              <path d="M 38 11 L 50 11 L 56 5 L 58 4 L 60 5 L 66 11 L 72 11" stroke="currentColor" strokeWidth="0.7" fill="none" opacity="0.85" />
            </g>
            <g opacity={purChecked ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <circle cx="82" cy="7" r="3.6" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
              <path d="M 79 7 L 81 9 L 85 5" stroke="#86efac" strokeWidth="0.85" fill="none" />
            </g>
          </g>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="85" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="85" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(67 162)"
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
