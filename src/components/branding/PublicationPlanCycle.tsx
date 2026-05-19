"use client";

/**
 * PublicationPlanCycle — four-stage looping animation of a Med
 * Affairs / Publications team taking a study from abstract to
 * peer-reviewed paper.
 *
 * Stages:
 *   1. ABSTRACT   — 250-word abstract tile
 *   2. MANUSCRIPT — full manuscript with sections; bar chart figure
 *   3. PEER       — red track-change marks in the margin
 *   4. PUBLISHED  — journal cover-like card with DOI + green check
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["abstract", "manuscript", "peer", "published"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  abstract:   { label: "ABSTRACT · ASH",   sub: "250 words · accepted", duration: 2400 },
  manuscript: { label: "MANUSCRIPT",       sub: "results + discussion", duration: 2800 },
  peer:       { label: "PEER REVIEW",      sub: "R1 · revise",          duration: 2800 },
  published:  { label: "PUBLISHED",        sub: "DOI · open access",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PublicationPlanCycle({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

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
        aria-label={`Publication plan — ${info.label}`}
      >
        {/* Abstract */}
        <g
          opacity={stage === "abstract" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="50" y="22" width="80" height="92" rx="2" />
          <line x1="56" y1="32" x2="124" y2="32" strokeWidth="0.6" opacity="0.55" />
          <text x="56" y="32" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.5" opacity="0.75">ABSTRACT</text>
          {[40, 46, 52, 58, 64, 70, 76, 82, 88, 94, 100, 106].map((y, i) => (
            <line key={y} x1="56" y1={y} x2={56 + [56, 64, 60, 52, 66, 58, 60, 64, 50, 48, 56, 40][i]} y2={y} strokeWidth="0.5" opacity="0.55" />
          ))}
        </g>

        {/* Manuscript with figure */}
        <g
          opacity={stage === "manuscript" || stage === "peer" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="30" y="18" width="120" height="100" rx="2" />
          <line x1="36" y1="28" x2="144" y2="28" strokeWidth="0.55" opacity="0.55" />
          <text x="36" y="28" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.5" opacity="0.75">MANUSCRIPT · v2</text>
          {/* Two-column text */}
          {[
            { x: 36, lines: [{ y: 38, w: 44 }, { y: 44, w: 50 }, { y: 50, w: 42 }, { y: 56, w: 48 }, { y: 62, w: 40 }, { y: 68, w: 46 }, { y: 74, w: 44 }, { y: 80, w: 42 }, { y: 86, w: 38 }, { y: 92, w: 44 }] },
            { x: 92, lines: [{ y: 38, w: 44 }, { y: 44, w: 42 }, { y: 50, w: 48 }, { y: 56, w: 40 }, { y: 62, w: 46 }, { y: 68, w: 50 }, { y: 74, w: 38 }, { y: 80, w: 46 }, { y: 86, w: 44 }, { y: 92, w: 36 }] },
          ].map((c, ci) => (
            <g key={ci}>
              {c.lines.map((l) => (
                <line key={l.y} x1={c.x} y1={l.y} x2={c.x + l.w} y2={l.y} strokeWidth="0.5" opacity="0.55" />
              ))}
            </g>
          ))}
          {/* Figure — small bar chart */}
          <g transform="translate(96 96)">
            <rect x="0" y="-12" width="44" height="14" stroke-width="0.55" opacity="0.6" />
            <rect x="4" y="-4" width="4" height="6" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="11" y="-7" width="4" height="9" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="18" y="-10" width="4" height="12" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="25" y="-6" width="4" height="8" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="32" y="-8" width="4" height="10" fill="currentColor" stroke="none" opacity="0.7" />
          </g>
        </g>

        {/* Peer review marks */}
        <g
          opacity={stage === "peer" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <circle cx="152" cy="46" r="2" fill="#fb7185" stroke="none" />
          <line x1="148" y1="50" x2="156" y2="58" stroke="#fb7185" strokeWidth="0.85" />
          <line x1="148" y1="58" x2="156" y2="50" stroke="#fb7185" strokeWidth="0.85" />
          <text x="160" y="48" fontSize="4.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">R1</text>
          <circle cx="152" cy="78" r="2" fill="#fbbf24" stroke="none" />
          <text x="158" y="80" fontSize="4.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4">minor</text>
        </g>

        {/* Published */}
        <g
          opacity={stage === "published" ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: stage === "published" ? "rotate(-3deg) translate(0,0)" : "rotate(-3deg) translate(-6px,6px)",
            transformOrigin: "90px 60px",
          }}
        >
          <rect x="40" y="22" width="100" height="92" rx="2" />
          {/* Header band */}
          <rect x="40" y="22" width="100" height="14" fill="currentColor" fillOpacity="0.1" stroke="none" />
          <text x="46" y="32" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.5" opacity="0.85">N ENGL J MED</text>
          <text x="46" y="50" fontSize="6.4" fill="currentColor" stroke="none" font-weight="700" letterSpacing="0.4">VOL 392 · 2026</text>
          <text x="46" y="62" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">Efficacy in advanced…</text>
          <text x="46" y="72" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.55">DOI: 10.1056/NEJMoa…</text>
          {/* Check */}
          <circle cx="118" cy="92" r="8" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <path d="M 113 92 L 116 95 L 122 87" stroke="#86efac" strokeWidth="1" fill="none" />
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
