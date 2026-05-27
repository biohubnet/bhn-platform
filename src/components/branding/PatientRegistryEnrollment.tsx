"use client";

/**
 * PatientRegistryEnrollment — four-stage looping animation of the
 * patient-registry enrollment cycle (real-world evidence /
 * post-marketing surveillance). Invitations go out, patients
 * consent, longitudinal data is captured, and the registry's
 * analytics dashboard reflects enrollment growth.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["invite", "consent", "capture", "analytics"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  invite:    { label: "INVITE",       sub: "outreach · clinics",      duration: 2400 },
  consent:   { label: "ECONSENT",     sub: "21 CFR Part 11",          duration: 2600 },
  capture:   { label: "CAPTURE",      sub: "longitudinal eCRF",       duration: 2600 },
  analytics: { label: "ANALYTICS",    sub: "n = 412 · cohort live",   duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function PatientRegistryEnrollment({ size = 180, className }: Props) {
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
        aria-label={`Patient registry — ${info.label}`}
      >
        {/* Clinic icon (left) */}
        <rect x="18" y="44" width="34" height="30" rx="1.5" />
        <line x1="35" y1="44" x2="35" y2="74" />
        <text x="35" y="40" textAnchor="middle" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6" letterSpacing="0.3">CLINIC</text>

        {/* Patient figures (centre row) */}
        <g transform="translate(70 52)">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${i * 14} 0)`}>
              <circle cx="4" cy="4" r="2.6" strokeWidth="0.7" />
              <path d="M 0 14 L 0 9 Q 4 6 8 9 L 8 14" strokeWidth="0.7" />
            </g>
          ))}
        </g>

        {/* Registry database (right) */}
        <g transform="translate(132 44)">
          <ellipse cx="16" cy="3" rx="14" ry="3" />
          <path d="M 2 3 L 2 27" />
          <path d="M 30 3 L 30 27" />
          <ellipse cx="16" cy="14" rx="14" ry="3" opacity="0.5" />
          <ellipse cx="16" cy="27" rx="14" ry="3" />
          <text x="16" y="40" textAnchor="middle" fontSize="4.2" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.6" letterSpacing="0.3">REGISTRY</text>
        </g>

        {/* Stage-specific overlays */}
        <g opacity={stage === "invite" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 54 56 L 68 56" strokeWidth="0.6" strokeDasharray="2 2" />
          <path d="M 65 53 L 68 56 L 65 59" strokeWidth="0.6" />
          <circle cx="74" cy="56" r="6" fill="#fbbf24" fillOpacity="0.18" stroke="#fbbf24" strokeWidth="0.55" />
          <text x="74" y="58" textAnchor="middle" fontSize="3.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">!</text>
        </g>

        <g opacity={stage === "consent" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="76" width="24" height="14" stroke="#86efac" strokeWidth="0.65" fillOpacity="0.18" fill="#86efac" />
          <path d="M 82 86 Q 88 81 96 86" stroke="#86efac" strokeWidth="0.8" />
          <text x="90" y="100" textAnchor="middle" fontSize="3.8" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">signed · timestamp</text>
        </g>

        <g opacity={stage === "capture" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="78" y="76" width="24" height="14" stroke="#7dd3fc" strokeWidth="0.55" />
          <line x1="80" y1="80" x2="100" y2="80" stroke="#7dd3fc" strokeWidth="0.5" />
          <line x1="80" y1="83" x2="100" y2="83" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.7" />
          <line x1="80" y1="86" x2="100" y2="86" stroke="#7dd3fc" strokeWidth="0.5" opacity="0.5" />
          <path d="M 102 80 L 132 60" strokeWidth="0.55" stroke="#7dd3fc" strokeDasharray="2 2" />
          <path d="M 128 58 L 132 60 L 130 64" strokeWidth="0.55" stroke="#7dd3fc" fill="none" />
        </g>

        <g opacity={stage === "analytics" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {[18, 26, 34, 44, 56, 70, 88, 104].map((h, i) => (
            <rect key={i} x={70 + i * 4.2} y={108 - h} width="3" height={h} fill="#86efac" fillOpacity="0.7" stroke="none" />
          ))}
          <text x="90" y="116" textAnchor="middle" fontSize="4.2" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">n = 412</text>
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
