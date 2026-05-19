"use client";

/**
 * PharmaSalesCall — four-stage looping animation of a pharma rep's
 * weekly call cycle. A territory map shows HCP pins; a route is
 * drawn; a detail interaction takes place; follow-up note logged.
 *
 * Stages:
 *   1. PLAN     — territory map with HCP pins, none visited
 *   2. ROUTE    — a dotted route line connects 3-4 pins
 *   3. DETAIL   — small scene: rep + HCP icon + brochure
 *   4. LOG      — CRM activity card with green check
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["plan", "route", "detail", "log"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  plan:   { label: "WEEKLY PLAN",   sub: "territory targets",  duration: 2400 },
  route:  { label: "ROUTE",         sub: "4 stops · 22 mi",    duration: 2600 },
  detail: { label: "HCP DETAIL",    sub: "core message",       duration: 2800 },
  log:    { label: "CRM LOG",       sub: "signal · next visit", duration: 3000 },
};

// HCP pins on a "map"
const PINS = [
  { x: 36,  y: 30, idx: 1 },
  { x: 70,  y: 22, idx: 2 },
  { x: 112, y: 40, idx: 3 },
  { x: 90,  y: 70, idx: 4 },
  { x: 50,  y: 80, idx: 5 },
  { x: 130, y: 86, idx: 6 },
];
const ROUTE_PINS = [0, 1, 3, 4]; // indices into PINS

interface Props { size?: number; className?: string; }

export function PharmaSalesCall({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showMap = stage === "plan" || stage === "route";
  const showRoute = stage === "route";
  const showDetail = stage === "detail";
  const showLog = stage === "log";

  const ROUTE_LEN = 200;

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
        aria-label={`Pharma sales call — ${info.label}`}
      >
        {/* Map plate */}
        <g
          opacity={showMap ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="20" y="14" width="140" height="92" rx="3" />
          {/* Subtle grid */}
          <g opacity="0.3">
            {[40, 60, 80, 100, 120, 140].map((x) => (
              <line key={`gv-${x}`} x1={x} y1="14" x2={x} y2="106" strokeWidth="0.4" />
            ))}
            {[34, 54, 74, 94].map((y) => (
              <line key={`gh-${y}`} x1="20" y1={y} x2="160" y2={y} strokeWidth="0.4" />
            ))}
          </g>
          {/* HCP pins */}
          {PINS.map((p, i) => (
            <g key={`pin-${i}`}>
              <path
                d={`M ${p.x} ${p.y - 6} L ${p.x - 4} ${p.y - 2} L ${p.x} ${p.y + 4} L ${p.x + 4} ${p.y - 2} Z`}
                stroke="currentColor" strokeWidth="0.7"
                fill="currentColor" fillOpacity="0.15"
              />
              <circle cx={p.x} cy={p.y - 2} r="1.2" fill="currentColor" stroke="none" opacity="0.8" />
            </g>
          ))}
          {/* Route line */}
          <path
            d={(() => {
              let d = "";
              ROUTE_PINS.forEach((idx, i) => {
                const p = PINS[idx];
                d += `${i === 0 ? "M" : "L"} ${p.x} ${p.y - 2} `;
              });
              return d;
            })()}
            stroke="#86efac" strokeWidth="0.95" fill="none"
            strokeDasharray="3 3"
            opacity={showRoute ? 0.85 : 0}
            style={{ transition: noTransition ?? "opacity 500ms ease" }}
          />
        </g>

        {/* Detail scene — rep + HCP */}
        <g
          opacity={showDetail ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Rep figure (left) */}
          <g>
            <circle cx="56" cy="36" r="8" />
            <path d="M 44 70 Q 56 50, 68 70" />
            {/* Briefcase */}
            <rect x="40" y="58" width="10" height="8" rx="1" stroke-width="0.7" />
            <line x1="42" y1="56" x2="48" y2="56" strokeWidth="0.6" />
          </g>
          {/* HCP figure (right) — with white coat collar */}
          <g>
            <circle cx="124" cy="36" r="8" />
            <path d="M 112 70 Q 124 50, 136 70" />
            {/* Stethoscope loop */}
            <path d="M 118 52 Q 124 58, 130 52" strokeWidth="0.7" opacity="0.7" fill="none" />
            <circle cx="124" cy="60" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
          </g>
          {/* Brochure being exchanged */}
          <rect x="80" y="44" width="20" height="14" rx="1" stroke-width="0.7" />
          <line x1="82" y1="48" x2="98" y2="48" strokeWidth="0.5" opacity="0.55" />
          <line x1="82" y1="52" x2="92" y2="52" strokeWidth="0.5" opacity="0.55" />
          {/* Speech dots */}
          <circle cx="90" cy="28" r="0.9" fill="currentColor" stroke="none" opacity="0.6" />
          <circle cx="86" cy="22" r="0.7" fill="currentColor" stroke="none" opacity="0.5" />
        </g>

        {/* CRM log card */}
        <g
          opacity={showLog ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="36" y="22" width="108" height="64" rx="3" />
          <line x1="42" y1="30" x2="138" y2="30" strokeWidth="0.55" opacity="0.55" />
          <text x="42" y="30" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.4" opacity="0.7">CRM · DR. CHEN</text>
          <text x="44" y="44" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">topic: efficacy data</text>
          <text x="44" y="56" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">interest: high</text>
          <text x="44" y="68" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">f/u: next week</text>
          {/* Saved check */}
          <circle cx="130" cy="48" r="6" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <path d="M 126 48 L 129 51 L 134 45" stroke="#86efac" strokeWidth="0.95" fill="none" />
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="134" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="146" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(72 158)"
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
