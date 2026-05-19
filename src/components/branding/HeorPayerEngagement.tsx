"use client";

/**
 * HeorPayerEngagement — four-stage looping animation of an HEOR /
 * market-access team's payer engagement. A value dossier is
 * compiled; an ICER chart shows the product below a willingness-
 * to-pay threshold; a payer review approves; the product lands on
 * a formulary tier.
 *
 * Stages:
 *   1. DOSSIER    — AMCP-format value dossier appears
 *   2. ICER       — ICER bar relative to a WTP threshold line
 *   3. P&T REVIEW — payer / committee silhouette appears, dossier presented
 *   4. FORMULARY  — drug name lands on Tier 2 / 3 of a formulary card
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["dossier", "icer", "review", "formulary"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  dossier:   { label: "VALUE DOSSIER",   sub: "AMCP · v4.0",     duration: 2600 },
  icer:      { label: "ICER · $/QALY",   sub: "below WTP",       duration: 3000 },
  review:    { label: "P&T REVIEW",      sub: "evidence read",   duration: 2800 },
  formulary: { label: "FORMULARY",       sub: "tier 2 · PA",     duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function HeorPayerEngagement({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showDossier = stage === "dossier";
  const showIcer = stage === "icer";
  const showReview = stage === "review";
  const showFormulary = stage === "formulary";

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
        aria-label={`HEOR payer engagement — ${info.label}`}
      >
        {/* Dossier */}
        <g
          opacity={showDossier ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="44" y="20" width="92" height="90" rx="2" />
          <line x1="50" y1="30" x2="130" y2="30" strokeWidth="0.55" opacity="0.55" />
          <text x="50" y="30" fontSize="4.8" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.5" opacity="0.75">AMCP DOSSIER · v4</text>
          {/* Sections */}
          {[
            { y: 42, w: 64, label: "1 · UNMET NEED" },
            { y: 54, w: 72, label: "2 · CLINICAL VALUE" },
            { y: 66, w: 60, label: "3 · ECONOMIC MODEL" },
            { y: 78, w: 68, label: "4 · BUDGET IMPACT" },
            { y: 90, w: 56, label: "5 · SUPP DATA" },
          ].map((s) => (
            <g key={s.y}>
              <line x1="50" y1={s.y - 1} x2={50 + s.w} y2={s.y - 1} strokeWidth="0.55" opacity="0.55" />
              <text x="50" y={s.y + 4} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.6">{s.label}</text>
            </g>
          ))}
        </g>

        {/* ICER chart */}
        <g
          opacity={showIcer ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* WTP threshold line */}
          <line x1="34" y1="44" x2="146" y2="44" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.55" />
          <text x="34" y="40" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65">WTP · $150k/QALY</text>
          {/* Axis */}
          <line x1="34" y1="96" x2="146" y2="96" strokeWidth="0.55" opacity="0.6" />
          {/* Our product bar */}
          <rect x="50" y="64" width="20" height="32" fill="#86efac" fillOpacity="0.45" stroke="#86efac" strokeWidth="0.7" />
          <text x="60" y="106" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">ours</text>
          <text x="60" y="60" fontSize="4.6" textAnchor="middle" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace">$92k</text>
          {/* Competitor bars */}
          <rect x="86" y="54" width="20" height="42" stroke="currentColor" strokeWidth="0.7" fill="currentColor" fillOpacity="0.18" />
          <text x="96" y="106" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">comp A</text>
          <rect x="118" y="38" width="20" height="58" stroke="currentColor" strokeWidth="0.7" fill="currentColor" fillOpacity="0.18" />
          <text x="128" y="106" fontSize="4.4" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7">comp B</text>
        </g>

        {/* P&T Review scene */}
        <g
          opacity={showReview ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          {/* Long table */}
          <line x1="22" y1="76" x2="158" y2="76" strokeWidth="0.95" />
          {/* Three reviewers head/shoulders */}
          {[42, 90, 138].map((x) => (
            <g key={x}>
              <circle cx={x} cy="48" r="7" />
              <path d={`M ${x - 12} 76 Q ${x} 58, ${x + 12} 76`} />
            </g>
          ))}
          {/* Dossier on the table */}
          <rect x="76" y="68" width="28" height="6" rx="1" stroke-width="0.7" />
          <text x="90" y="92" textAnchor="middle" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.65" letter-spacing="0.3">P&T COMMITTEE</text>
        </g>

        {/* Formulary card */}
        <g
          opacity={showFormulary ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <rect x="34" y="22" width="112" height="84" rx="3" />
          <line x1="40" y1="32" x2="140" y2="32" strokeWidth="0.55" opacity="0.55" />
          <text x="40" y="32" fontSize="4.8" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" letter-spacing="0.5" opacity="0.75">FORMULARY · 2026</text>
          {/* Tiers */}
          {[
            { y: 44, name: "TIER 1 · GENERIC", drug: null },
            { y: 58, name: "TIER 2 · PREFERRED", drug: "ours" },
            { y: 72, name: "TIER 3 · NON-PREF", drug: null },
            { y: 86, name: "TIER 4 · SPECIALTY", drug: null },
          ].map((t) => (
            <g key={t.y}>
              <text x="40" y={t.y} fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace,monospace" opacity="0.7" letter-spacing="0.3">{t.name}</text>
              {t.drug && (
                <g>
                  <rect x="100" y={t.y - 5} width="36" height="8" rx="2" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.16" />
                  <text x="118" y={t.y + 1} textAnchor="middle" fontSize="4.6" fill="#86efac" stroke="none" fontFamily="ui-monospace,monospace" font-weight="700">PLACED</text>
                </g>
              )}
            </g>
          ))}
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
