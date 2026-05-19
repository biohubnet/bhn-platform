"use client";

/**
 * AlcoaDocumentation — four-stage looping animation of ALCOA+
 * data-integrity documentation. A blank form is filled, signed,
 * audit-trail captured, and stored. The principles are reflected
 * in stage labels (Attributable · Legible · Contemporaneous ·
 * Original · Accurate + Complete · Consistent · Enduring ·
 * Available).
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["blank", "fill", "audit", "archive"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  blank:   { label: "FORM · BLANK",     sub: "controlled · v3.2",            duration: 2400 },
  fill:    { label: "ALCOA+ ENTRY",     sub: "attributable · contemporaneous", duration: 3000 },
  audit:   { label: "AUDIT TRAIL",      sub: "who · when · why",             duration: 2600 },
  archive: { label: "ARCHIVE",          sub: "enduring · available",         duration: 3000 },
};

interface Props { size?: number; className?: string; }

export function AlcoaDocumentation({ size = 180, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  const showEntries = stage === "fill" || stage === "audit" || stage === "archive";
  const showAudit = stage === "audit" || stage === "archive";
  const showArchive = stage === "archive";

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (170 / 180)}
        viewBox="0 0 170 180"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`ALCOA+ documentation — ${info.label}`}
      >
        {/* Form */}
        <rect x="34" y="22" width="100" height="88" rx="2" />
        <text x="40" y="32" fontSize="4.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.5" opacity="0.8">BATCH RECORD · F-218 · v3.2</text>
        <line x1="40" y1="36" x2="128" y2="36" strokeWidth="0.5" opacity="0.55" />

        {/* Form rows */}
        {[
          { y: 46, lbl: "Step 4 mass" },
          { y: 56, lbl: "pH" },
          { y: 66, lbl: "Temperature" },
          { y: 76, lbl: "Time" },
          { y: 86, lbl: "Operator" },
        ].map((r) => (
          <g key={r.y}>
            <text x="42" y={r.y} fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">{r.lbl}</text>
            <line x1="80" y1={r.y - 1} x2="124" y2={r.y - 1} strokeWidth="0.5" opacity="0.55" />
          </g>
        ))}

        {/* Filled-in entries */}
        <g opacity={showEntries ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="80" y="46" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">12.45 g</text>
          <text x="80" y="56" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">7.2</text>
          <text x="80" y="66" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">37 °C</text>
          <text x="80" y="76" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">14:32</text>
          <text x="80" y="86" fontSize="4.4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">J. Park</text>
        </g>

        {/* Audit trail entries */}
        <g opacity={showAudit ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <rect x="34" y="94" width="100" height="14" stroke="currentColor" strokeWidth="0.55" opacity="0.6" fill="currentColor" fillOpacity="0.04" />
          <text x="40" y="102" fontSize="4" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.7">J.Park · 14:32 · entered</text>
          <text x="40" y="106.5" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.55">L.Wong · 15:01 · reviewed</text>
        </g>

        {/* ALCOA+ pillars */}
        <g opacity={stage === "fill" ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease" }}>
          <text x="20" y="14" fontSize="3.6" fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" opacity="0.65" letterSpacing="0.3">ALCOA+: A · L · C · O · A · + · C · E · A</text>
        </g>

        {/* Archive icon */}
        <g opacity={showArchive ? 1 : 0} style={{ transition: noTransition ?? "opacity 500ms ease, transform 600ms ease", transform: showArchive ? "translateY(0px)" : "translateY(6px)" }}>
          <rect x="138" y="44" width="22" height="32" rx="2" stroke="#86efac" strokeWidth="0.85" fill="#86efac" fillOpacity="0.18" />
          <line x1="142" y1="50" x2="156" y2="50" strokeWidth="0.5" stroke="#86efac" />
          <line x1="142" y1="56" x2="156" y2="56" strokeWidth="0.5" stroke="#86efac" />
          <line x1="142" y1="62" x2="156" y2="62" strokeWidth="0.5" stroke="#86efac" />
          <line x1="142" y1="68" x2="156" y2="68" strokeWidth="0.5" stroke="#86efac" />
          <text x="149" y="84" textAnchor="middle" fontSize="4" fill="#86efac" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="0.4">vault</text>
        </g>

        {/* Stage label */}
        <g fill="currentColor" stroke="none" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text x="85" y="138" textAnchor="middle" fontSize="6.8" fontWeight="700" letterSpacing="1.3">{info.label}</text>
          <text x="85" y="150" textAnchor="middle" fontSize="5.6" opacity="0.55" letterSpacing="0.4">{info.sub}</text>
        </g>

        <g
          transform="translate(67 162)"
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
