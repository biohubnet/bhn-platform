"use client";

/**
 * PatientSupportProgram — four-stage looping animation of a PSP
 * (hub services / specialty pharmacy access) workflow. A patient
 * enrolls, benefits are verified, copay support is applied, and
 * therapy is shipped and adherence-monitored.
 *
 * Stages:
 *   1. ENROLL    — patient card with HIPAA-style "signed" mark
 *   2. BV        — benefits verification dashboard
 *   3. COPAY     — copay card chip overlay
 *   4. ADHERENCE — calendar with dose check marks across weeks
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["enroll", "bv", "copay", "adherence"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  enroll:    { label: "ENROLL",        sub: "consent · HIPAA",    duration: 2400 },
  bv:        { label: "BENEFITS VERIF", sub: "PA approved",       duration: 2600 },
  copay:     { label: "COPAY · $0",    sub: "card applied",       duration: 2400 },
  adherence: { label: "ADHERENCE",     sub: "4 / 4 weeks · 100 %", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PatientSupportProgram({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Patient support program — ${info.label}`}>
        {/* Patient card */}
        <g>
          <rect x="22" y="22" width="60" height="36" rx="4" />
          <circle cx="36" cy="38" r="6" />
          <line x1="46" y1="32" x2="74" y2="32" strokeWidth="0.55" opacity="0.55" />
          <line x1="46" y1="38" x2="68" y2="38" strokeWidth="0.55" opacity="0.55" />
          <line x1="46" y1="44" x2="72" y2="44" strokeWidth="0.55" opacity="0.55" />
          <line x1="46" y1="50" x2="62" y2="50" strokeWidth="0.55" opacity="0.55" />
          <text x="22" y="18" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6" letterSpacing="0.3">PATIENT</text>
        </g>

        {/* Enrolled stamp */}
        <g opacity={stage === "enroll" || stage === "bv" || stage === "copay" || stage === "adherence" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <circle cx="74" cy="50" r="4" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.2" />
          <path d="M 71 50 L 73 52 L 77 48" stroke="#86efac" strokeWidth="0.85" fill="none" />
        </g>

        {/* Benefits Verification dashboard */}
        <g opacity={stage === "bv" || stage === "copay" || stage === "adherence" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="92" y="22" width="64" height="36" rx="3" />
          <text x="98" y="32" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7" letterSpacing="0.3">BENEFITS</text>
          {/* Status pills */}
          {[
            { y: 38, label: "PA",   on: true },
            { y: 46, label: "DEDUCT", on: true },
            { y: 54, label: "PHARMACY", on: true },
          ].map((p, i) => (
            <g key={i}>
              <text x="98" y={p.y + 2.5} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">{p.label}</text>
              <circle cx="148" cy={p.y} r="2.4" fill="#86efac" fillOpacity="0.25" stroke="#86efac" strokeWidth="0.65" />
            </g>
          ))}
        </g>

        {/* Copay card */}
        <g opacity={stage === "copay" || stage === "adherence" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="44" y="66" width="64" height="22" rx="4" fill="#86efac" fillOpacity="0.18" stroke="#86efac" strokeWidth="0.85" />
          <text x="50" y="76" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">COPAY CARD</text>
          <text x="50" y="84" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" font-weight="700">$0 / month</text>
        </g>

        {/* Adherence calendar */}
        <g opacity={stage === "adherence" ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {Array.from({ length: 4 }).map((_, w) => (
            <g key={w}>
              <text x="118" y={74 + w * 12} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">W{w + 1}</text>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <circle key={d} cx={130 + d * 5} cy={72 + w * 12} r="1.6" fill="#86efac" stroke="none" opacity="0.85" />
              ))}
            </g>
          ))}
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(72 162)" role="progressbar"
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
