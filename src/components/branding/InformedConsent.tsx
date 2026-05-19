"use client";

/**
 * InformedConsent — four-stage looping animation of the informed
 * consent process. The investigator explains, the patient
 * reviews, signs, and the ICF is filed.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["discuss", "review", "sign", "file"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  discuss: { label: "DISCUSS",     sub: "PI · patient · q&a",  duration: 2400 },
  review:  { label: "REVIEW ICF",  sub: "voluntary · informed", duration: 2600 },
  sign:    { label: "SIGN",        sub: "dated · witnessed",    duration: 2400 },
  file:    { label: "FILE",        sub: "regulatory binder",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function InformedConsent({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showDiscuss = stage === "discuss";
  const showReview = stage === "review";
  const showSign = stage === "sign";
  const showFile = stage === "file";
  const SIG_LEN = 80;

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
        aria-label={`Informed consent — ${info.label}`}
      >
        {/* PI + patient */}
        <g opacity={showDiscuss ? 1 : 0.5} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g>
            <circle cx="40" cy="36" r="9" />
            <path d="M 26 70 Q 40 50, 54 70" />
            <path d="M 32 50 Q 40 56, 48 50" strokeWidth="0.7" opacity="0.7" fill="none" />
            <circle cx="40" cy="58" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
          </g>
          <g>
            <circle cx="120" cy="36" r="9" />
            <path d="M 106 70 Q 120 50, 134 70" />
          </g>
        </g>

        {/* Speech bubble + Q&A dots */}
        <g opacity={showDiscuss ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 60 22 L 100 22 Q 106 22, 106 28 L 106 38 Q 106 44, 100 44 L 78 44 L 70 50 L 72 44 L 60 44 Q 54 44, 54 38 L 54 28 Q 54 22, 60 22 Z" strokeWidth="0.55" />
          <circle cx="70" cy="33" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="80" cy="33" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="90" cy="33" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
        </g>

        {/* ICF document */}
        <g opacity={showReview || showSign ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="42" y="20" width="96" height="72" rx="2" />
          <text x="48" y="30" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.85">INFORMED CONSENT</text>
          <line x1="48" y1="34" x2="132" y2="34" strokeWidth="0.5" opacity="0.55" />
          {[40, 46, 52, 58, 64, 70, 76].map((y, i) => (
            <line key={y} x1="48" y1={y} x2={48 + [70, 76, 64, 80, 58, 72, 50][i]} y2={y} strokeWidth="0.5" opacity="0.55" />
          ))}
          {/* Signature line */}
          <line x1="48" y1="86" x2="100" y2="86" strokeWidth="0.5" opacity="0.55" />
          <text x="48" y="92" fontSize="3.8" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">signature · date</text>
        </g>

        {/* Signature */}
        <path
          d="M 50 84 Q 56 80, 62 84 Q 68 88, 74 82 Q 82 78, 92 84 Q 98 86, 102 84"
          stroke="#86efac"
          strokeWidth="0.95"
          fill="none"
          strokeDasharray={SIG_LEN}
          strokeDashoffset={showSign || showFile ? 0 : SIG_LEN}
          style={{ transition: noTransition ?? "stroke-dashoffset 900ms cubic-bezier(.4,.1,.4,1)" }}
        />

        {/* Filed binder */}
        <g opacity={showFile ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease, transform 600ms ease", transform: showFile ? "translateY(0)" : "translateY(6px)" }}>
          <rect x="58" y="100" width="64" height="20" rx="2" />
          <rect x="58" y="100" width="6" height="20" fill="#86efac" fillOpacity="0.5" stroke="none" />
          <text x="92" y="113" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">REG BINDER · §2 ICFs</text>
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
