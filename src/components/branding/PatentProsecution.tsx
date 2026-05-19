"use client";

/**
 * PatentProsecution — five-stage looping animation of a biotech
 * patent prosecution lifecycle. Claims are drafted, the
 * application is filed, the USPTO issues an Office Action, the
 * applicant amends, and the patent is granted.
 *
 * Stages:
 *   1. DRAFT          — a claim block with claim numbers (1, 2, 3…)
 *                       and "L"-bullet lines; one claim is the
 *                       independent claim (slightly bolder).
 *   2. FILE           — the document slides up into a USPTO arrow
 *                       marker; a small filing receipt drops.
 *   3. OFFICE ACTION  — a red 102/103 rejection ribbon appears
 *                       across the claim block, with strike-throughs
 *                       on claims 2 and 4.
 *   4. AMEND          — the strikethroughs lift; underlined inserts
 *                       (small "ins" markers) appear; ribbon fades.
 *   5. GRANT          — a green seal stamps the document; claim 1
 *                       gets the issued claim glow.
 *
 * Reads as: paperwork → office → fight → fix → grant.
 */

import { useStageCycle } from "./useStageCycle";

const STAGES = ["draft", "file", "office", "amend", "grant"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_INFO: Record<Stage, { label: string; sub: string; duration: number }> = {
  draft:  { label: "DRAFT CLAIMS",     sub: "indep + dep",       duration: 2800 },
  file:   { label: "FILE · USPTO",     sub: "filing receipt",    duration: 2400 },
  office: { label: "OFFICE ACTION",    sub: "§102 · §103",       duration: 3000 },
  amend:  { label: "AMEND · RESPOND",  sub: "claim narrow-down", duration: 3000 },
  grant:  { label: "GRANT · ISSUED",   sub: "patent number",     duration: 3000 },
};

interface Props {
  size?: number;
  className?: string;
}

export function PatentProsecution({ size = 170, className }: Props) {
  const { stage, stageIdx, noTransition } = useStageCycle(STAGES, STAGE_INFO);
  const info = STAGE_INFO[stage];

  // Document Y translation — lifts a notch during FILE so it visually
  // "ships" into the USPTO marker, then settles back.
  const docY =
    stage === "file" ? -8 :
    0;

  const showUspto = stage === "file" || stage === "office" || stage === "amend" || stage === "grant";
  const showRejection = stage === "office";
  const showAmend = stage === "amend";
  const showGrant = stage === "grant";

  // Claim rows — 5 claims drawn in the document
  const CLAIMS = [
    { n: 1, indep: true,  y: 38 },
    { n: 2, indep: false, y: 50 },
    { n: 3, indep: false, y: 60 },
    { n: 4, indep: false, y: 70 },
    { n: 5, indep: false, y: 80 },
  ];

  return (
    <div className={className}>
      <svg
        width={size}
        height={size * (180 / 170)}
        viewBox="0 0 170 180"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={`Patent prosecution — ${info.label}`}
      >
        {/* ── USPTO marker — appears at FILE+ */}
        <g
          opacity={showUspto ? 0.55 : 0}
          style={{ transition: noTransition ?? "opacity 500ms ease" }}
        >
          <path d="M 70 14 L 80 6 L 90 14" />
          <line x1="80" y1="6" x2="80" y2="22" />
          <text
            x="98" y="18"
            fontSize="5.6"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >
            USPTO
          </text>
        </g>

        {/* ── Document ─────────────────────────────────────────── */}
        <g
          style={{
            transition: noTransition ?? "transform 600ms cubic-bezier(.4,.1,.4,1)",
            transform: `translateY(${docY}px)`,
          }}
        >
          {/* Page */}
          <rect x="36" y="26" width="98" height="68" rx="2" />
          {/* Title bar */}
          <line x1="42" y1="32" x2="118" y2="32" strokeWidth="0.7" opacity="0.55" />
          <text
            x="42" y="32"
            fontSize="4.8"
            fill="currentColor" stroke="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.6"
            opacity="0.7"
          >
            CLAIMS
          </text>

          {/* Claim rows */}
          {CLAIMS.map((c) => {
            const isStruck = showRejection && (c.n === 2 || c.n === 4);
            const isGranted = showGrant && c.n === 1;
            const lineW = c.indep ? 80 : 60;
            return (
              <g key={c.n}>
                <text
                  x="44" y={c.y + 1}
                  fontSize="5.4"
                  fill="currentColor" stroke="none"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={c.indep ? 700 : 500}
                  opacity={c.indep ? 0.95 : 0.7}
                >
                  {c.n}.
                </text>
                <line
                  x1="50" y1={c.y - 1}
                  x2={50 + lineW} y2={c.y - 1}
                  strokeWidth={c.indep ? 1.0 : 0.7}
                  opacity={c.indep ? 0.85 : 0.55}
                  stroke={isGranted ? "#86efac" : "currentColor"}
                  style={{ transition: noTransition ?? "stroke 500ms ease" }}
                />
                {/* Strike-through during OFFICE ACTION */}
                {isStruck && (
                  <line
                    x1="50" y1={c.y - 1}
                    x2={50 + lineW} y2={c.y - 1}
                    strokeWidth="1.2"
                    stroke="#fb7185"
                    opacity="0.9"
                  />
                )}
              </g>
            );
          })}

          {/* AMEND markers — small "ins" carets under amended claims */}
          {showAmend && (
            <g opacity="0.85">
              <text
                x="50" y="56"
                fontSize="4.4"
                fill="#fbbf24" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                ↳ ins
              </text>
              <text
                x="50" y="76"
                fontSize="4.4"
                fill="#fbbf24" stroke="none"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                ↳ ins
              </text>
            </g>
          )}
        </g>

        {/* ── Rejection ribbon — diagonal across the doc during OFFICE */}
        <g
          opacity={showRejection ? 1 : 0}
          style={{ transition: noTransition ?? "opacity 600ms ease" }}
        >
          <rect
            x="118" y="22" width="34" height="10" rx="5"
            fill="#fb7185" fillOpacity="0.18"
            stroke="#fb7185" strokeWidth="1.0"
          />
          <text
            x="135" y="29"
            textAnchor="middle"
            fontSize="5.6"
            fill="#fb7185" stroke="none"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >
            §103
          </text>
        </g>

        {/* ── Grant seal — green ribbon-style oval bottom-right */}
        <g
          opacity={showGrant ? 1 : 0}
          style={{
            transition: noTransition ?? "opacity 500ms ease, transform 700ms cubic-bezier(.4,.1,.4,1)",
            transform: showGrant ? "rotate(-12deg) translate(0px, 0px)" : "rotate(-12deg) translate(-6px, 6px)",
            transformOrigin: "118px 90px",
          }}
        >
          <ellipse
            cx="118" cy="90" rx="14" ry="9"
            fill="#86efac" fillOpacity="0.18"
            stroke="#86efac" strokeWidth="1.4"
          />
          <text
            x="118" y="88"
            textAnchor="middle"
            fontSize="5"
            fill="#86efac" stroke="none"
            fontWeight="700"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.4"
          >
            ISSUED
          </text>
          <text
            x="118" y="95"
            textAnchor="middle"
            fontSize="4.4"
            fill="#86efac" stroke="none"
            opacity="0.85"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            US 12,345,678
          </text>
        </g>

        {/* ── Stage label */}
        <g
          fill="currentColor" stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          <text x="85" y="138" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="1.3">
            {info.label}
          </text>
          <text x="85" y="150" textAnchor="middle" fontSize="5.8" opacity="0.55" letterSpacing="0.4">
            {info.sub}
          </text>
        </g>

        {/* ── Stage dots */}
        <g
          transform="translate(61 168)"
          role="progressbar"
          aria-label={`Cycle stage ${stageIdx + 1} of ${STAGES.length}: ${info.label}`}
          aria-valuenow={stageIdx + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
        >
          {STAGES.map((_, i) => (
            <circle
              key={i}
              cx={i * 12}
              cy={0}
              r="1.6"
              fill={i === stageIdx ? "#86efac" : "currentColor"}
              opacity={i === stageIdx ? 1 : 0.3}
              stroke="none"
              style={{ transition: noTransition ?? "opacity 300ms ease, fill 300ms ease" }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
