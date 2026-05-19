"use client";

/**
 * VcDiligenceCycle — four-stage looping animation of a biotech
 * investor's diligence-to-close path. A deck enters the funnel,
 * gets scrutinized, term sheet drafted, then signed.
 *
 * Stages:
 *   1. SOURCE     — a stack of pitch decks; one slides forward
 *                   (sourced deal).
 *   2. DILIGENCE  — magnifier lens hovers over a data-room grid
 *                   showing scientific + financial tiles; some
 *                   tiles get checks.
 *   3. TERM SHEET — a single-page document slides in with a
 *                   ladder of bullet lines + a dollar marker.
 *   4. CLOSE      — a signature flourish draws across the term
 *                   sheet; a green check stamps the corner.
 *
 * No human figures — keeps it abstract and professional. The
 * vocabulary is dossier, lens, document, check.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["source", "diligence", "term", "close"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  source:    { label: "DEAL · SOURCED",   sub: "inbound · network",  duration: 2600 },
  diligence: { label: "DILIGENCE",        sub: "data room review",   duration: 3200 },
  term:      { label: "TERM SHEET",       sub: "draft · NBIO",       duration: 2800 },
  close:     { label: "CLOSE",            sub: "signed · committed", duration: 3000 },
};

interface Props {
  size?: number;
  className?: string;
}

export function VcDiligenceCycle({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // SOURCE: deck stack visible, top deck slides forward.
  const showStack = stage === "source";
  // DILIGENCE: data-room grid + lens visible.
  const showDilig = stage === "diligence";
  // TERM/CLOSE: term-sheet doc visible.
  const showDoc = stage === "term" || stage === "close";
  // CLOSE: signature path drawn + check stamp.
  const showSig = stage === "close";

  const SIG_LEN = 80;

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 170)}
        viewBox="0 0 170 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`VC diligence cycle — ${info.label}`}
      >
        {/* ── SOURCE — deck stack ────────────────────────────────── */}
        <g
          opacity={showStack ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Back decks */}
          <rect x="48" y="40" width="58" height="38" rx="2" opacity="0.45" />
          <rect x="52" y="34" width="58" height="38" rx="2" opacity="0.65" />
          {/* Front (sourced) deck — slid forward */}
          <rect
            x="44" y="48" width="58" height="38" rx="2"
            stroke="currentColor" strokeWidth="1.4"
          />
          {/* Page lines */}
          <g opacity="0.55">
            <line x1="50" y1="58" x2="84" y2="58" strokeWidth="0.9" />
            <line x1="50" y1="64" x2="78" y2="64" strokeWidth="0.7" />
            <line x1="50" y1="70" x2="92" y2="70" strokeWidth="0.7" />
            {/* Tiny bar-chart suggestion */}
            <rect x="86" y="74" width="3" height="6" fill="currentColor" stroke="none" />
            <rect x="91" y="70" width="3" height="10" fill="currentColor" stroke="none" />
            <rect x="96" y="64" width="3" height="16" fill="currentColor" stroke="none" />
          </g>
        </g>

        {/* ── DILIGENCE — data-room grid + lens ─────────────────── */}
        <g
          opacity={showDilig ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Grid of data-room tiles — 4×3 */}
          {Array.from({ length: 12 }).map((_, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 34 + col * 18;
            const y = 32 + row * 14;
            const checked = i === 1 || i === 4 || i === 7 || i === 10;
            return (
              <g key={`t-${i}`}>
                <rect
                  x={x} y={y} width="14" height="10" rx="1"
                  stroke="currentColor" strokeWidth="0.9"
                  fill="currentColor" fillOpacity="0.08"
                />
                {checked && (
                  <path
                    d={`M ${x + 3} ${y + 5.5} L ${x + 5.5} ${y + 7.5} L ${x + 11} ${y + 3}`}
                    stroke="#86efac" strokeWidth="1.2" fill="none"
                  />
                )}
              </g>
            );
          })}
          {/* Magnifier lens — hovering top-right */}
          <g>
            <circle cx="100" cy="40" r="10" strokeWidth="1.4" />
            <line x1="108" y1="48" x2="118" y2="58" strokeWidth="1.6" />
            {/* Crosshair inside the lens */}
            <line x1="94" y1="40" x2="106" y2="40" strokeWidth="0.6" opacity="0.55" />
            <line x1="100" y1="34" x2="100" y2="46" strokeWidth="0.6" opacity="0.55" />
          </g>
        </g>

        {/* ── TERM / CLOSE — term sheet document ─────────────────── */}
        <g
          opacity={showDoc ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="40" y="26" width="72" height="62" rx="2" />
          {/* Doc header */}
          <text
            x="46" y="36"
            fontSize="5.4"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.7"
            opacity="0.85"
          >
            TERM SHEET
          </text>
          <line x1="46" y1="40" x2="106" y2="40" strokeWidth="0.7" opacity="0.5" />
          {/* Bulleted lines */}
          <g opacity="0.65">
            {[46, 52, 58, 64, 70, 76].map((y, i) => (
              <g key={y}>
                <circle cx="48" cy={y - 1.5} r="0.7" fill="currentColor" stroke="none" />
                <line
                  x1="52" y1={y - 1.5} x2={[96, 90, 100, 88, 94, 86][i]} y2={y - 1.5}
                  strokeWidth="0.7"
                />
              </g>
            ))}
          </g>
          {/* Dollar marker bottom-right */}
          <text
            x="100" y="84"
            fontSize="8.4"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            opacity="0.85"
            textAnchor="middle"
          >
            $
          </text>
        </g>

        {/* ── CLOSE — signature flourish + check stamp ──────────── */}
        <g
          opacity={showSig ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <path
            d="M 48 80 Q 56 70, 64 76 T 80 80 Q 88 74, 96 78"
            stroke="#86efac" strokeWidth="1.5"
            fill="none"
            strokeDasharray={SIG_LEN}
            strokeDashoffset={showSig ? 0 : SIG_LEN}
            style={{ transition: noTransition ?? "stroke-dashoffset 900ms cubic-bezier(.4,.1,.4,1)" }}
          />
          {/* Check stamp in the corner */}
          <circle cx="104" cy="34" r="6.5" stroke="#86efac" strokeWidth="1.3" />
          <path
            d="M 100 34 L 103 37 L 108 31"
            stroke="#86efac" strokeWidth="1.4" fill="none"
          />
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="85" y="124" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="85" y="136" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(67 156)"
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
