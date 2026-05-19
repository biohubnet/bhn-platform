"use client";

/**
 * MedicalInformationRequest — four-stage looping animation of a
 * Medical Information team handling an HCP inquiry. Question
 * lands, MI scientist researches, drafts response (with refs),
 * and logs the interaction.
 *
 * Stages:
 *   1. INQUIRY    — HCP question bubble lands in inbox
 *   2. RESEARCH   — references stack appears (3 cited articles)
 *   3. RESPONSE   — formatted reply with disclaimer
 *   4. LOG        — CRM activity row added with timestamp
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["inquiry", "research", "response", "log"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  inquiry:  { label: "MI INQUIRY",   sub: "HCP · phase 3 PFS",    duration: 2400 },
  research: { label: "RESEARCH",     sub: "3 references",         duration: 2600 },
  response: { label: "RESPONSE",     sub: "letter · disclaimer",  duration: 2800 },
  log:      { label: "LOG · CRM",    sub: "case closed",          duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function MedicalInformationRequest({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Medical info request — ${info.label}`}>
        {/* Inquiry bubble */}
        <g opacity={stage === "inquiry" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 30 32 L 130 32 Q 138 32, 138 40 L 138 70 Q 138 78, 130 78 L 60 78 L 48 90 L 50 78 L 30 78 Q 22 78, 22 70 L 22 40 Q 22 32, 30 32 Z" />
          <text x="32" y="44" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65" letterSpacing="0.4">DR. CHEN · ONCOLOGY</text>
          <line x1="32" y1="54" x2="124" y2="54" strokeWidth="0.55" opacity="0.55" />
          <text x="32" y="62" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.85">Is there PFS data in the</text>
          <text x="32" y="70" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.85">elderly subgroup?</text>
        </g>

        {/* Research references */}
        <g opacity={stage === "research" || stage === "response" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[
            { x: 30, y: 30 },
            { x: 36, y: 36 },
            { x: 42, y: 42 },
          ].map((r, i) => (
            <g key={i}>
              <rect x={r.x} y={r.y} width="50" height="44" rx="2" fill="currentColor" fillOpacity="0.06" stroke-width="0.7" />
              <line x1={r.x + 4} y1={r.y + 8} x2={r.x + 38} y2={r.y + 8} strokeWidth="0.5" opacity="0.55" />
              <line x1={r.x + 4} y1={r.y + 14} x2={r.x + 30} y2={r.y + 14} strokeWidth="0.5" opacity="0.55" />
              <line x1={r.x + 4} y1={r.y + 20} x2={r.x + 34} y2={r.y + 20} strokeWidth="0.5" opacity="0.55" />
            </g>
          ))}
        </g>

        {/* Response letter (front-most) */}
        <g opacity={stage === "response" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="86" y="22" width="74" height="80" rx="2" />
          <line x1="92" y1="30" x2="154" y2="30" strokeWidth="0.55" opacity="0.55" />
          <text x="92" y="30" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4" opacity="0.75">RESPONSE</text>
          {[40, 46, 52, 58, 64, 70, 76].map((y, i) => (
            <line key={y} x1="92" y1={y} x2={92 + [50, 56, 44, 52, 48, 54, 38][i]} y2={y} strokeWidth="0.5" opacity="0.55" />
          ))}
          {/* Disclaimer block */}
          <rect x="92" y="84" width="62" height="12" rx="2" stroke-width="0.55" opacity="0.45" />
          <text x="123" y="91.5" textAnchor="middle" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7" letterSpacing="0.3">non-promotional · refs cited</text>
        </g>

        {/* CRM log */}
        <g opacity={stage === "log" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="22" y="22" width="136" height="80" rx="3" />
          <line x1="28" y1="32" x2="152" y2="32" strokeWidth="0.55" opacity="0.55" />
          <text x="28" y="32" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4" opacity="0.7">CRM · MI LOG</text>
          {[
            { y: 44, time: "10:14", who: "DR. CHEN", topic: "PFS · elderly", state: "OPEN" },
            { y: 56, time: "10:32", who: "MI · J.S.", topic: "research · 3 refs", state: "WIP" },
            { y: 68, time: "11:08", who: "MI · J.S.", topic: "response sent", state: "WIP" },
            { y: 80, time: "11:09", who: "—",        topic: "case closed",  state: "DONE" },
          ].map((r, i) => (
            <g key={i}>
              <text x="32" y={r.y} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">{r.time}</text>
              <text x="60" y={r.y} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">{r.who}</text>
              <text x="92" y={r.y} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">{r.topic}</text>
              <text x="148" y={r.y} textAnchor="end" fontSize="4.4" fill={r.state === "DONE" ? "#86efac" : "currentColor"} stroke="none" fontFamily="ui-monospace,monospace" opacity={r.state === "DONE" ? 1 : 0.7} fontWeight={r.state === "DONE" ? "700" : "400"}>{r.state}</text>
            </g>
          ))}
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="132" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="144" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 158)" role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1} aria-valuemin={1} aria-valuemax={STAGES.length}>
          {STAGES.map((_, i) => (
            <circle key={i} cx={i * 12} cy={0} r="1.6" fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3} stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
