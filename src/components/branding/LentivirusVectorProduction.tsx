"use client";

/**
 * LentivirusVectorProduction — four-stage looping animation of
 * lentiviral vector production used to deliver the CAR transgene
 * in CAR-T manufacturing. HEK293T cells transfected with the
 * plasmid mix → supernatant harvested → vector concentrated by
 * ultracentrifugation → titer measured by p24 ELISA.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["transfect", "harvest", "concentrate", "titer"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  transfect:   { label: "TRANSFECT",   sub: "HEK293T · 4-plasmid", duration: 2400 },
  harvest:     { label: "HARVEST",     sub: "supernatant · 48 h", duration: 2400 },
  concentrate: { label: "CONCENTRATE", sub: "ultracentrifuge · 100×", duration: 2800 },
  titer:       { label: "TITER",       sub: "p24 · 8.2e8 TU/mL",  duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function LentivirusVectorProduction({ size = 180, className }: Props) {
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
        aria-label={`Lentivirus vector — ${info.label}`}
      >
        {/* Stage 1 — flask with HEK293T cells + plasmid dropper */}
        <g opacity={stage === "transfect" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(60 38)">
            <path d="M 20 0 L 20 12 L 4 44 L 56 44 L 40 12 L 40 0 Z" strokeWidth="0.8" />
            <line x1="20" y1="0" x2="40" y2="0" strokeWidth="0.8" />
            {/* HEK293T dots */}
            {[
              [12, 28], [22, 32], [32, 30], [42, 28], [16, 38], [28, 40], [38, 38], [46, 36], [20, 24], [44, 22],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.2" fill="#7dd3fc" stroke="none" opacity="0.85" />
            ))}
            {/* Dropper */}
            <g transform="translate(30 -10)">
              <rect x="-2" y="0" width="4" height="10" stroke="#fbbf24" strokeWidth="0.55" />
              <path d="M 0 10 L 0 14" stroke="#fbbf24" strokeWidth="0.55" />
              <circle cx="0" cy="16" r="1" fill="#fbbf24" stroke="none" />
            </g>
          </g>
        </g>

        {/* Stage 2 — flask + supernatant scoop */}
        <g opacity={stage === "harvest" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(40 42)">
            <path d="M 20 0 L 20 12 L 4 44 L 56 44 L 40 12 L 40 0 Z" strokeWidth="0.8" />
            <path d="M 6 26 L 54 26" strokeWidth="0.5" opacity="0.55" />
          </g>
          <g transform="translate(108 42)">
            <rect x="0" y="0" width="22" height="40" rx="2" stroke="#86efac" strokeWidth="0.7" />
            <line x1="0" y1="14" x2="22" y2="14" stroke="#86efac" strokeWidth="0.45" opacity="0.55" />
            <text x="11" y="22" textAnchor="middle" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">supernatant</text>
          </g>
          <path d="M 96 64 L 108 64" strokeWidth="0.6" strokeDasharray="2 2" stroke="#86efac" />
          <path d="M 105 61 L 108 64 L 105 67" strokeWidth="0.6" stroke="#86efac" fill="none" />
        </g>

        {/* Stage 3 — centrifuge rotor */}
        <g opacity={stage === "concentrate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(90 64)">
            <circle cx="0" cy="0" r="32" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="3" fill="currentColor" stroke="none" opacity="0.75" />
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <g key={i} transform={`translate(${Math.cos(rad) * 22} ${Math.sin(rad) * 22}) rotate(${angle})`}>
                  <rect x="-3" y="-6" width="6" height="12" stroke="#fbbf24" strokeWidth="0.55" fill="#fbbf24" fillOpacity="0.2" />
                </g>
              );
            })}
            <text x="0" y="44" textAnchor="middle" fontSize="3.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">100,000 × g · 90 min</text>
          </g>
        </g>

        {/* Stage 4 — p24 plate + titer readout */}
        <g opacity={stage === "titer" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(40 44)">
            <rect x="0" y="0" width="76" height="42" rx="1" strokeWidth="0.7" />
            {Array.from({ length: 32 }).map((_, i) => {
              const c = i % 8;
              const r = Math.floor(i / 8);
              return (
                <circle
                  key={i}
                  cx={6 + c * 9} cy={6 + r * 10}
                  r="3" stroke="currentColor" strokeWidth="0.4"
                  fill="#a78bfa" fillOpacity={c < 6 ? 0.7 - r * 0.13 : 0.05}
                />
              );
            })}
          </g>
          <text x="148" y="60" textAnchor="end" fontSize="5.2" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">8.2 × 10⁸</text>
          <text x="148" y="68" textAnchor="end" fontSize="3.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85">TU / mL</text>
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
