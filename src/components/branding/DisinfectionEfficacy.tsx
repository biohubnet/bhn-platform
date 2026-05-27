"use client";

/**
 * DisinfectionEfficacy — four-stage looping animation of a
 * cleanroom disinfectant-efficacy test (QC Micro). A coupon surface
 * is challenged with a known inoculum of bacteria → disinfectant is
 * applied for the contact time → post-wipe sampling collects
 * survivors → CFU enumeration confirms ≥3-log reduction.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["challenge", "apply", "sample", "enumerate"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  challenge: { label: "CHALLENGE", sub: "1 × 10⁶ CFU · coupon", duration: 2400 },
  apply:     { label: "APPLY",     sub: "70% IPA · 30 s",      duration: 2400 },
  sample:    { label: "SAMPLE",    sub: "swab · neutraliser",  duration: 2600 },
  enumerate: { label: "ENUMERATE", sub: "log reduction · 3.4", duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function DisinfectionEfficacy({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Bacteria positions on the coupon
  const bacteria = [
    [54, 56], [70, 50], [86, 58], [102, 52], [118, 60],
    [50, 70], [66, 64], [82, 72], [98, 68], [114, 76], [126, 70],
    [56, 82], [72, 86], [88, 78], [104, 84], [120, 86], [60, 92],
    [78, 96], [96, 94], [112, 92],
  ];

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
        aria-label={`Disinfectant efficacy — ${info.label}`}
      >
        {/* Coupon surface */}
        <rect x="38" y="40" width="104" height="64" rx="2" strokeWidth="0.75" />
        <text x="38" y="34" fontSize="3.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55" letterSpacing="0.3">stainless-steel coupon</text>

        {/* Bacteria — visible on challenge, fading by stage */}
        {bacteria.map(([x, y], i) => {
          // Show all on challenge; show subset on apply/sample; show very few on enumerate (3-log reduction)
          const visible =
            stage === "challenge" || stage === "apply" ? true :
            stage === "sample" ? i < 6 :
            i < 2;
          const tint =
            stage === "apply" ? "#fbbf24" :
            stage === "sample" ? "#fb7185" :
            stage === "enumerate" ? "#86efac" :
            "currentColor";
          return (
            <g key={i} opacity={visible ? 1 : 0.05} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
              <circle cx={x} cy={y} r="1.4" fill={tint} stroke="none" opacity="0.8" />
            </g>
          );
        })}

        {/* Stage 2 — disinfectant sprayer + droplet wave */}
        <g opacity={stage === "apply" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(28 28)">
            <rect x="0" y="0" width="14" height="20" rx="2" stroke="#fbbf24" strokeWidth="0.65" />
            <path d="M 14 4 L 20 2" stroke="#fbbf24" strokeWidth="0.55" />
            <path d="M 20 0 L 20 4" stroke="#fbbf24" strokeWidth="0.55" />
            {/* Spray */}
            <path d="M 20 4 L 30 8 M 20 4 L 30 10 M 20 4 L 30 12" stroke="#fbbf24" strokeWidth="0.5" />
          </g>
          <text x="40" y="34" fontSize="3.4" fill="#fbbf24" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">70% IPA</text>
        </g>

        {/* Stage 3 — swab approaching */}
        <g opacity={stage === "sample" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <g transform="translate(140 24) rotate(30)">
            <rect x="0" y="0" width="24" height="3" stroke="#fb7185" strokeWidth="0.55" />
            <ellipse cx="-2" cy="1.5" rx="2.5" ry="1.5" stroke="#fb7185" strokeWidth="0.55" fill="#fb7185" fillOpacity="0.3" />
          </g>
          <text x="148" y="34" textAnchor="end" fontSize="3.4" fill="#fb7185" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">contact-plate</text>
        </g>

        {/* Stage 4 — log-reduction badge */}
        <g opacity={stage === "enumerate" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="48" y="112" width="84" height="14" rx="1" stroke="#86efac" strokeWidth="0.7" fill="#86efac" fillOpacity="0.18" />
          <text x="90" y="122" textAnchor="middle" fontSize="5.6" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="700">3.4-log reduction · PASS</text>
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
