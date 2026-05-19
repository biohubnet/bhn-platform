"use client";

/**
 * GowningCleanroom — five-stage looping animation of cleanroom
 * gowning per the BHN biomanufacturing pathway. A figure
 * progressively gowns up — sanitize → head cover → suit → gloves
 * → mirror check + ISO 5 entry.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["sanitize", "head", "suit", "gloves", "entry"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  sanitize: { label: "SANITIZE HANDS", sub: "70 % IPA · 30 s",     duration: 2400 },
  head:     { label: "HEAD COVER",     sub: "hairnet · mask",      duration: 2400 },
  suit:     { label: "SUIT",           sub: "coverall · booties",  duration: 2600 },
  gloves:   { label: "GLOVES",         sub: "sterile · over cuff", duration: 2400 },
  entry:    { label: "ISO 5 ENTRY",    sub: "mirror check · pass", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function GowningCleanroom({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showSan = stage === "sanitize";
  const showHead = stage === "head" || stage === "suit" || stage === "gloves" || stage === "entry";
  const showSuit = stage === "suit" || stage === "gloves" || stage === "entry";
  const showGloves = stage === "gloves" || stage === "entry";
  const showEntry = stage === "entry";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (180 / 170)}
        viewBox="0 0 170 180"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Gowning · cleanroom — ${info.label}`}
      >
        {/* Figure baseline */}
        <g>
          <circle cx="85" cy="34" r="10" />
          <path d="M 67 50 L 67 92 L 103 92 L 103 50 Z" />
          <line x1="75" y1="92" x2="75" y2="110" />
          <line x1="95" y1="92" x2="95" y2="110" />
          <line x1="67" y1="56" x2="56" y2="84" />
          <line x1="103" y1="56" x2="114" y2="84" />
        </g>

        {/* Sanitize droplets */}
        <g opacity={showSan ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="40" y="74" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">70%</text>
          <circle cx="56" cy="86" r="1.4" fill="#7dd3fc" stroke="none" opacity="0.85" />
          <circle cx="58" cy="80" r="1" fill="#7dd3fc" stroke="none" opacity="0.7" />
          <circle cx="62" cy="84" r="0.9" fill="#7dd3fc" stroke="none" opacity="0.6" />
        </g>

        {/* Hairnet + mask */}
        <g opacity={showHead ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 76 27 Q 85 21, 94 27" strokeWidth="0.7" />
          <path d="M 78 36 L 92 36" strokeWidth="0.6" />
          <line x1="82" y1="40" x2="88" y2="40" strokeWidth="0.55" opacity="0.7" />
        </g>

        {/* Suit accents + booties */}
        <g opacity={showSuit ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <line x1="73" y1="56" x2="97" y2="56" strokeWidth="0.6" opacity="0.7" />
          <line x1="73" y1="68" x2="97" y2="68" strokeWidth="0.5" opacity="0.6" />
          <line x1="73" y1="80" x2="97" y2="80" strokeWidth="0.5" opacity="0.55" />
          <ellipse cx="75" cy="114" rx="4" ry="2" strokeWidth="0.6" />
          <ellipse cx="95" cy="114" rx="4" ry="2" strokeWidth="0.6" />
        </g>

        {/* Gloves */}
        <g opacity={showGloves ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <ellipse cx="56" cy="86" rx="3" ry="4" strokeWidth="0.7" fill="#86efac" fillOpacity="0.2" />
          <ellipse cx="114" cy="86" rx="3" ry="4" strokeWidth="0.7" fill="#86efac" fillOpacity="0.2" />
        </g>

        {/* ISO 5 door */}
        <g opacity={showEntry ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="130" y="40" width="22" height="64" strokeWidth="0.95" />
          <line x1="141" y1="40" x2="141" y2="104" strokeWidth="0.5" strokeDasharray="1.5 1.5" opacity="0.55" />
          <text x="141" y="36" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.85" letterSpacing="0.4">ISO 5</text>
          <circle cx="141" cy="72" r="6" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
          <path d="M 137 72 L 140 75 L 145 69" stroke="#86efac" strokeWidth="0.95" fill="none" />
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="85" y="136" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="85" y="148" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(61 162)"
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
