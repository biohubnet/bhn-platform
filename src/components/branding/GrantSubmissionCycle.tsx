"use client";

/**
 * GrantSubmissionCycle — five-stage looping animation of an
 * academic grant lifecycle (NIH R01 vibe). Specific aims drafted,
 * application submitted, study section scores, revised, then
 * funded.
 *
 * Stages:
 *   1. AIMS      — specific aims page sketch
 *   2. SUBMIT    — application uploads to agency portal
 *   3. REVIEW    — three reviewer scores appear
 *   4. REVISE    — A1 marker; impact score lower
 *   5. FUNDED    — green funded chip + payline crossed
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["aims", "submit", "review", "revise", "funded"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  aims:   { label: "SPECIFIC AIMS", sub: "1 page · 3 aims",     duration: 2400 },
  submit: { label: "SUBMIT · R01",  sub: "ASSIST · NIH",        duration: 2400 },
  review: { label: "STUDY SECTION", sub: "3 reviewers",         duration: 2800 },
  revise: { label: "A1 RESUBMIT",   sub: "address critiques",   duration: 2800 },
  funded: { label: "FUNDED",        sub: "JIT · NOA issued",    duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function GrantSubmissionCycle({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Pre-revise scores (poor) vs post-revise (good)
  const scoresInitial = [4, 3, 5];
  const scoresRevised = [2, 2, 1];
  const showScores = stage === "review" || stage === "revise" || stage === "funded";
  const scores = stage === "review" ? scoresInitial : scoresRevised;

  const docY = stage === "submit" ? -8 : 0;

  return (
    <div className={className}>
      <svg width={size} height={size * (170 / 180)} viewBox="0 0 180 170" fill="none" stroke="currentColor"
        strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
        role="img" aria-label={`Grant submission — ${info.label}`}>
        {/* Agency portal marker */}
        <g opacity={stage !== "aims" ? 0.6 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <path d="M 70 14 L 80 6 L 90 14" />
          <line x1="80" y1="6" x2="80" y2="22" />
          <text x="98" y="18" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">NIH</text>
        </g>

        {/* Application document */}
        <g style={{ transition: noTransition ?? "transform 600ms cubic-bezier(.4,.1,.4,1)", transform: `translateY(${docY}px)` }}>
          <rect x="36" y="26" width="86" height="64" rx="2" />
          <line x1="42" y1="34" x2="116" y2="34" strokeWidth="0.55" opacity="0.55" />
          <text x="42" y="34" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75" letterSpacing="0.4">R01 · CA-12345</text>
          {/* Aims */}
          {[
            { y: 44, label: "AIM 1 · mechanism" },
            { y: 56, label: "AIM 2 · validate" },
            { y: 68, label: "AIM 3 · therapeutic" },
          ].map((a) => (
            <g key={a.y}>
              <line x1="42" y1={a.y - 2} x2="48" y2={a.y - 2} strokeWidth="0.7" />
              <text x="50" y={a.y} fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.75">{a.label}</text>
            </g>
          ))}
          {/* Bar chart icon (representing data figures) */}
          <g transform="translate(86 80)">
            <rect x="0" y="-6" width="3" height="6" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="5" y="-9" width="3" height="9" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="10" y="-4" width="3" height="4" fill="currentColor" stroke="none" opacity="0.7" />
            <rect x="15" y="-12" width="3" height="12" fill="currentColor" stroke="none" opacity="0.7" />
          </g>
        </g>

        {/* Reviewer scores */}
        <g opacity={showScores ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          {scores.map((s, i) => (
            <g key={i}>
              <circle cx={132 + i * 12} cy="40" r="5" stroke-width="0.7" />
              <text x={132 + i * 12} y="42.5" textAnchor="middle" fontSize="5.4" fill={s <= 2 ? "#86efac" : (s >= 4 ? "#fb7185" : "#fbbf24")} stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">{s}</text>
            </g>
          ))}
          {/* Impact score chip */}
          <rect x="128" y="52" width="36" height="10" rx="5" stroke-width="0.7" />
          <text x="146" y="59" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.4">IS {stage === "review" ? "42" : "18"}</text>
        </g>

        {/* A1 marker (during revise) */}
        <g opacity={stage === "revise" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="100" y="22" width="22" height="10" rx="5" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="0.7" />
          <text x="111" y="29" textAnchor="middle" fontSize="5" fill="#fbbf24" stroke="none" fontFamily="ui-monospace,monospace" letterSpacing="0.5" fontWeight="700">A1</text>
        </g>

        {/* Funded chip */}
        <g opacity={stage === "funded" ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: stage === "funded" ? "rotate(-8deg) translate(0,0)" : "rotate(-8deg) translate(-6px,6px)",
            transformOrigin: "146px 80px",
          }}>
          <ellipse cx="146" cy="80" rx="22" ry="11" stroke="#86efac" strokeWidth="0.95" fill="#86efac" fillOpacity="0.18" />
          <text x="146" y="78" textAnchor="middle" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" fontWeight="700">FUNDED</text>
          <text x="146" y="85" textAnchor="middle" fontSize="4.4" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.85">$2.4M · 5 yr</text>
        </g>

        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="90" y="132" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="90" y="144" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>
        <g transform="translate(60 158)" role="progressbar"
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
