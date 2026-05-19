"use client";

/**
 * PitchDeckBuild — five-stage looping animation of building and
 * delivering a pitch deck (BHN Entrepreneurship outcome:
 * "Build an effective pitch deck and gain confidence presenting
 * to potential investors."). Title → problem/solution → market →
 * traction/ask → present at investor panel.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["title", "problem", "market", "ask", "present"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  title:   { label: "TITLE SLIDE",   sub: "company · tagline",      duration: 2200 },
  problem: { label: "PROBLEM · SOLN", sub: "pain · TAM",            duration: 2400 },
  market:  { label: "MARKET",        sub: "size · GTM",             duration: 2400 },
  ask:     { label: "TRACTION · ASK", sub: "$ raise · runway",      duration: 2600 },
  present: { label: "INVESTOR PANEL", sub: "pitch · Q&A",           duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PitchDeckBuild({ size = 200, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Slide stack — 5 slides, current one lifted
  const SLIDES = [
    { x: 20, label: "TITLE" },
    { x: 50, label: "PROB" },
    { x: 80, label: "MKT" },
    { x: 110, label: "ASK" },
    { x: 140, label: "—" },
  ];
  const activeIdx = STAGES.indexOf(stage);

  const showStage = stage === "present";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 200)}
        viewBox="0 0 200 170"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Pitch deck — ${info.label}`}
      >
        {/* Slide thumbnails (overview) */}
        <g opacity={showStage ? 0.3 : 1} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {SLIDES.slice(0, 4).map((s, i) => (
            <g key={i} style={{ transition: noTransition ?? "transform 600ms cubic-bezier(.4,.1,.4,1)", transform: activeIdx === i ? "translateY(-6px)" : "translateY(0)" }}>
              <rect x={s.x} y="24" width="28" height="20" rx="2" strokeWidth={activeIdx === i ? 1.05 : 0.7} opacity={activeIdx === i ? 1 : 0.5} />
              <text x={s.x + 14} y="40" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity={activeIdx === i ? 0.9 : 0.55}>{s.label}</text>
            </g>
          ))}
        </g>

        {/* Current slide preview (large) */}
        <g opacity={showStage ? 0 : 1} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="50" y="60" width="100" height="60" rx="3" strokeWidth="1.05" />

          {/* Title slide */}
          <g opacity={stage === "title" ? 1 : 0} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
            <text x="100" y="84" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.8">NUCLEUS BIO</text>
            <text x="100" y="98" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">precision oncology · seed</text>
            <line x1="78" y1="104" x2="122" y2="104" stroke="#86efac" strokeWidth="0.7" />
          </g>

          {/* Problem / Solution */}
          <g opacity={stage === "problem" ? 1 : 0} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
            <text x="58" y="74" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5">PROBLEM</text>
            <line x1="58" y1="78" x2="98" y2="78" strokeWidth="0.55" opacity="0.55" />
            <line x1="58" y1="84" x2="92" y2="84" strokeWidth="0.55" opacity="0.55" />
            <line x1="58" y1="90" x2="98" y2="90" strokeWidth="0.55" opacity="0.55" />
            <text x="102" y="74" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5">SOLUTION</text>
            <line x1="102" y1="78" x2="142" y2="78" stroke="#86efac" strokeWidth="0.55" />
            <line x1="102" y1="84" x2="140" y2="84" stroke="#86efac" strokeWidth="0.55" />
            <line x1="102" y1="90" x2="136" y2="90" stroke="#86efac" strokeWidth="0.55" />
          </g>

          {/* Market */}
          <g opacity={stage === "market" ? 1 : 0} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
            <text x="58" y="74" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5">MARKET</text>
            <circle cx="80" cy="98" r="14" strokeWidth="0.55" opacity="0.45" />
            <circle cx="80" cy="98" r="9" strokeWidth="0.55" opacity="0.65" />
            <circle cx="80" cy="98" r="4" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.3" />
            <text x="80" y="116" textAnchor="middle" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6">TAM · SAM · SOM</text>
            <text x="116" y="84" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.75">$12 B</text>
            <text x="116" y="92" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">3 B · NA</text>
            <text x="116" y="100" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65">600 M · entry</text>
          </g>

          {/* Ask */}
          <g opacity={stage === "ask" ? 1 : 0} style={{ transition: noTransition ?? "opacity 400ms ease" }}>
            <text x="58" y="74" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5">ASK</text>
            <text x="100" y="92" textAnchor="middle" fontSize="11" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">$8 M</text>
            <text x="100" y="102" textAnchor="middle" fontSize="4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">seed · 18 mo runway</text>
            {/* Tiny bar chart */}
            <rect x="58" y="100" width="3" height="6" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="63" y="98" width="3" height="8" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="68" y="96" width="3" height="10" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="73" y="92" width="3" height="14" fill="#86efac" stroke="none" opacity="0.85" />
          </g>
        </g>

        {/* Investor panel — projector + audience */}
        <g opacity={showStage ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {/* Projector screen */}
          <rect x="60" y="24" width="80" height="44" rx="3" strokeWidth="0.95" />
          <text x="100" y="48" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700" letterSpacing="0.6">NUCLEUS BIO</text>
          <text x="100" y="58" textAnchor="middle" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">$8M · seed</text>

          {/* Presenter */}
          <g>
            <circle cx="34" cy="92" r="6" />
            <path d="M 24 116 Q 34 100, 44 116" />
          </g>
          {/* Audience — 4 heads */}
          {[80, 100, 120, 140].map((x) => (
            <g key={x}>
              <circle cx={x} cy="96" r="5" strokeWidth="0.7" />
              <path d={`M ${x - 8} 116 Q ${x} 104, ${x + 8} 116`} strokeWidth="0.65" />
            </g>
          ))}
          {/* Q dot bubble */}
          <circle cx="100" cy="80" r="2.4" stroke="#fbbf24" strokeWidth="0.6" fill="#fbbf24" fillOpacity="0.3" />
          <text x="100" y="82" textAnchor="middle" fontSize="3.6" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">?</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="100" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="100" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(76 162)"
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
