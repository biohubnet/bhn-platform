/**
 * Background line-art glyphs of biomanufacturing / biotherapeutic
 * hot-topic molecules — DNA double helix, monoclonal antibody (mAb),
 * mRNA strand with cap + poly-A tail, lipid nanoparticle (LNP),
 * cell with nucleus. Used on the login page as discreet swimming
 * atmosphere behind the form.
 *
 * All glyphs use `currentColor` so the parent picks the tint via
 * Tailwind text-* classes, and accept a `size` prop for scale.
 * Stroke weights tuned thin so they read as background texture
 * rather than illustrations.
 */

interface Props {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** DNA double helix — horizontal strand with crossing sine waves
 *  and rung lines connecting the two strands. */
export function DnaHelix({ size = 140, strokeWidth = 1.2, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (80 / 140)}
      viewBox="0 0 140 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="DNA double helix"
    >
      <path d="M 0 40 Q 17.5 5, 35 40 T 70 40 T 105 40 T 140 40" />
      <path d="M 0 40 Q 17.5 75, 35 40 T 70 40 T 105 40 T 140 40" />
      <line x1="17.5" y1="14" x2="17.5" y2="66" strokeWidth={strokeWidth * 0.7} />
      <line x1="52.5" y1="14" x2="52.5" y2="66" strokeWidth={strokeWidth * 0.7} />
      <line x1="87.5" y1="14" x2="87.5" y2="66" strokeWidth={strokeWidth * 0.7} />
      <line x1="122.5" y1="14" x2="122.5" y2="66" strokeWidth={strokeWidth * 0.7} />
    </svg>
  );
}

/** Monoclonal antibody — the iconic Y. Two Fab arms with binding
 *  heads, central hinge, Fc stem. Backbone of every mAb therapy. */
export function Antibody({ size = 90, strokeWidth = 2, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (110 / 90)}
      viewBox="0 0 90 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Antibody"
    >
      <line x1="45" y1="55" x2="45" y2="100" />
      <line x1="45" y1="55" x2="18" y2="22" />
      <line x1="45" y1="55" x2="72" y2="22" />
      <circle cx="18" cy="16" r="7" fill="currentColor" fillOpacity="0.45" />
      <circle cx="72" cy="16" r="7" fill="currentColor" fillOpacity="0.45" />
      <circle cx="45" cy="55" r="3.5" fill="currentColor" />
      <circle cx="45" cy="100" r="5" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}

/** mRNA — single strand wavy line with the 5' cap (filled circle
 *  on the left) and the poly-A tail (a few small dots on the
 *  right). The hot-topic backbone of every mRNA vaccine. */
export function MrnaStrand({ size = 160, strokeWidth = 1.5, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (40 / 160)}
      viewBox="0 0 160 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="mRNA strand"
    >
      <path d="M 8 20 Q 24 4, 40 20 T 72 20 T 104 20 T 132 20" fill="none" />
      <circle cx="8" cy="20" r="5" fill="currentColor" fillOpacity="0.7" stroke="none" />
      <circle cx="140" cy="20" r="2" fill="currentColor" fillOpacity="0.55" stroke="none" />
      <circle cx="146" cy="20" r="2" fill="currentColor" fillOpacity="0.55" stroke="none" />
      <circle cx="152" cy="20" r="2" fill="currentColor" fillOpacity="0.55" stroke="none" />
      <circle cx="158" cy="20" r="2" fill="currentColor" fillOpacity="0.55" stroke="none" />
    </svg>
  );
}

/** Lipid nanoparticle — concentric dashed lipid bilayers wrapping
 *  a small mRNA squiggle in the centre. The delivery vehicle that
 *  made mRNA therapies practical. */
export function LipidNanoparticle({ size = 100, strokeWidth = 1.3, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="Lipid nanoparticle"
    >
      <circle cx="50" cy="50" r="42" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="28" strokeWidth={strokeWidth * 0.85} />
      <path d="M 36 50 Q 42 42, 50 50 T 64 50" strokeWidth={strokeWidth * 0.9} fill="none" opacity="0.7" />
    </svg>
  );
}

/** Cell with nucleus — outer membrane, nucleus circle, nucleolus
 *  spot. The everyday object of every bioreactor. */
export function CellSchematic({ size = 110, strokeWidth = 1.3, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      role="img"
      aria-label="Cell"
    >
      <circle cx="55" cy="55" r="48" />
      <circle cx="55" cy="55" r="20" strokeWidth={strokeWidth * 0.9} />
      <circle cx="55" cy="55" r="6" fill="currentColor" fillOpacity="0.35" stroke="none" />
      {/* Membrane texture dots */}
      <circle cx="28" cy="40" r="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <circle cx="82" cy="38" r="1.6" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <circle cx="30" cy="78" r="1.8" fill="currentColor" fillOpacity="0.4" stroke="none" />
      <circle cx="80" cy="80" r="2.2" fill="currentColor" fillOpacity="0.4" stroke="none" />
    </svg>
  );
}

/** T-flask — the everyday tissue-culture vessel (T-25 / T-75 /
 *  T-175 etc.). Slanted neck with a screw cap, flat body where
 *  the cell monolayer grows. The "T" is for the cap-down
 *  triangle-ish silhouette. */
export function TFlask({ size = 130, strokeWidth = 1.3, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (96 / 130)}
      viewBox="0 0 130 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="T-flask"
    >
      {/* Body — rounded rectangle, slightly tilted neck on the right */}
      <path d="M 8 22 Q 8 18, 12 18 L 90 18 L 116 36 L 116 60 L 90 78 L 12 78 Q 8 78, 8 74 Z" />
      {/* Screw-cap (vertical rect on top of the slanted neck) */}
      <rect x="100" y="28" width="20" height="8" rx="1" />
      {/* Cap threads */}
      <line x1="103" y1="30" x2="117" y2="30" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      <line x1="103" y1="33" x2="117" y2="33" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      {/* Media level (dashed) */}
      <line x1="12" y1="32" x2="86" y2="32" strokeDasharray="3 3" strokeWidth={strokeWidth * 0.7} opacity="0.6" />
      {/* A few cell colonies in the body */}
      <circle cx="30" cy="48" r="2" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="46" cy="58" r="2.5" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="62" cy="46" r="1.8" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="76" cy="60" r="2.2" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="36" cy="66" r="1.6" fill="currentColor" fillOpacity="0.45" stroke="none" />
    </svg>
  );
}

/** Oxygen molecule (O₂) — two atoms with a double bond. */
export function OxygenMolecule({ size = 56, strokeWidth = 1.4, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (28 / 56)}
      viewBox="0 0 56 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      role="img"
      aria-label="Oxygen molecule"
    >
      {/* Double bond */}
      <line x1="18" y1="11" x2="38" y2="11" />
      <line x1="18" y1="17" x2="38" y2="17" />
      {/* Atoms */}
      <circle cx="12" cy="14" r="8" fill="currentColor" fillOpacity="0.18" />
      <circle cx="44" cy="14" r="8" fill="currentColor" fillOpacity="0.18" />
      {/* Letters */}
      <text x="12" y="17" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">O</text>
      <text x="44" y="17" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">O</text>
    </svg>
  );
}

/** Carbon dioxide molecule (CO₂) — linear O=C=O. */
export function CarbonDioxideMolecule({ size = 72, strokeWidth = 1.4, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (28 / 72)}
      viewBox="0 0 72 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      role="img"
      aria-label="Carbon dioxide molecule"
    >
      {/* Two double bonds */}
      <line x1="18" y1="11" x2="32" y2="11" />
      <line x1="18" y1="17" x2="32" y2="17" />
      <line x1="40" y1="11" x2="54" y2="11" />
      <line x1="40" y1="17" x2="54" y2="17" />
      {/* Atoms */}
      <circle cx="12" cy="14" r="7" fill="currentColor" fillOpacity="0.18" />
      <circle cx="36" cy="14" r="6.5" fill="currentColor" fillOpacity="0.25" />
      <circle cx="60" cy="14" r="7" fill="currentColor" fillOpacity="0.18" />
      <text x="12" y="17" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">O</text>
      <text x="36" y="17" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">C</text>
      <text x="60" y="17" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="8" fontWeight="700" fill="currentColor" stroke="none">O</text>
    </svg>
  );
}

/** Pipette — slanted tip + body. Used by the MSC passaging
 *  cycle to aspirate / dispense cells. */
export function Pipette({ size = 110, strokeWidth = 1.4, className }: Props) {
  return (
    <svg
      width={size * (24 / 110)}
      height={size}
      viewBox="0 0 24 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="Pipette"
    >
      {/* Body */}
      <rect x="6" y="2" width="12" height="76" rx="2" />
      {/* Tapered tip */}
      <path d="M 6 78 L 12 108 L 18 78 Z" />
      {/* Volume marks */}
      <line x1="6" y1="16" x2="10" y2="16" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      <line x1="6" y1="26" x2="10" y2="26" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      <line x1="6" y1="36" x2="10" y2="36" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      <line x1="6" y1="46" x2="10" y2="46" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
      <line x1="6" y1="56" x2="10" y2="56" strokeWidth={strokeWidth * 0.7} opacity="0.7" />
    </svg>
  );
}

/** Ribosome on an mRNA strand, mid-translation — the iconic large
 *  + small subunit pair (60S over 40S in eukaryotes), the mRNA
 *  threading through the cleft between them, and a growing
 *  peptide chain emerging from the large subunit's exit tunnel.
 *
 *  Two embedded SMIL `<animate>` loops give a heartbeat-style
 *  "active site" pulse (the codon currently being read) and a
 *  matching pulse on the newest amino acid joining the chain, so
 *  the glyph quietly reads as "in the middle of synthesising"
 *  rather than a static still life. */
export function Ribosome({ size = 150, strokeWidth = 1.3, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (170 / 160)}
      viewBox="0 0 160 170"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      role="img"
      aria-label="Ribosome synthesising a peptide on mRNA"
    >
      {/* ── Peptide chain — zigzag emerging from the large
            subunit's exit tunnel, growing upward */}
      <g>
        <path
          d="M 80 50 L 73 42 L 84 32 L 74 22 L 86 12 L 76 4"
          strokeWidth={strokeWidth * 1.05}
          fill="none"
        />
        <circle cx="73" cy="42" r="3"   fill="currentColor" fillOpacity="0.50" stroke="none" />
        <circle cx="84" cy="32" r="3"   fill="currentColor" fillOpacity="0.55" stroke="none" />
        <circle cx="74" cy="22" r="3"   fill="currentColor" fillOpacity="0.60" stroke="none" />
        <circle cx="86" cy="12" r="3"   fill="currentColor" fillOpacity="0.65" stroke="none" />
        <circle cx="76" cy="4"  r="3"   fill="currentColor" fillOpacity="0.70" stroke="none" />
        {/* Newest residue — pulses as if it's the one being added */}
        <circle cx="80" cy="50" r="3.2" fill="currentColor" fillOpacity="0.75" stroke="none">
          <animate attributeName="r" values="2.4;3.8;2.4" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.45;0.90;0.45" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ── Large subunit (60S) */}
      <ellipse
        cx="80" cy="78" rx="58" ry="28"
        fill="currentColor" fillOpacity="0.18"
      />
      {/* Surface texture — small dots suggest ribosomal proteins */}
      <g fill="currentColor" stroke="none" opacity="0.55">
        <circle cx="50"  cy="70" r="1.8" />
        <circle cx="108" cy="76" r="1.6" />
        <circle cx="62"  cy="88" r="1.5" />
        <circle cx="100" cy="90" r="2.0" />
        <circle cx="80"  cy="64" r="1.6" />
        <circle cx="118" cy="86" r="1.4" />
      </g>

      {/* ── Small subunit (40S) */}
      <ellipse
        cx="80" cy="124" rx="48" ry="18"
        fill="currentColor" fillOpacity="0.18"
      />
      <g fill="currentColor" stroke="none" opacity="0.5">
        <circle cx="58"  cy="120" r="1.5" />
        <circle cx="98"  cy="126" r="1.6" />
        <circle cx="78"  cy="130" r="1.4" />
        <circle cx="110" cy="122" r="1.4" />
      </g>

      {/* ── mRNA strand — threads through the cleft between
            subunits, extending beyond the ribosome footprint
            both ways (5′ on the left, 3′ on the right) */}
      <path
        d="M 0 116 Q 18 110, 36 116 T 72 116 T 108 116 T 144 116 L 160 116"
        strokeWidth={strokeWidth * 1.05}
        fill="none"
      />
      {/* Codon markers along the strand */}
      <g fill="currentColor" stroke="none">
        <circle cx="14"  cy="116" r="1.3" opacity="0.5" />
        <circle cx="28"  cy="116" r="1.3" opacity="0.5" />
        <circle cx="44"  cy="116" r="1.3" opacity="0.5" />
        <circle cx="58"  cy="116" r="1.3" opacity="0.5" />
        {/* Active-site codon — pulses in time with the new residue */}
        <circle cx="80" cy="116" r="2.0" opacity="0.85">
          <animate attributeName="r" values="1.4;2.6;1.4" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="106" cy="116" r="1.3" opacity="0.5" />
        <circle cx="122" cy="116" r="1.3" opacity="0.5" />
        <circle cx="138" cy="116" r="1.3" opacity="0.5" />
      </g>

      {/* 5′ + 3′ end labels — tiny mono, sits just under the strand */}
      <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="6" fill="currentColor" stroke="none" opacity="0.55">
        <text x="2"   y="128">5′</text>
        <text x="150" y="128">3′</text>
      </g>
    </svg>
  );
}

/** Bioreactor — vertical cylinder vessel with a stirring shaft +
 *  impeller blade, a vent on top, and a sample-port on the side.
 *  The workhorse vessel of every biomanufacturing line. */
export function Bioreactor({ size = 90, strokeWidth = 1.3, className }: Props) {
  return (
    <svg
      width={size}
      height={size * (140 / 90)}
      viewBox="0 0 90 140"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Bioreactor"
    >
      {/* Vent */}
      <line x1="45" y1="2" x2="45" y2="14" />
      <circle cx="45" cy="14" r="3" fill="none" />
      {/* Vessel body — rounded-top cylinder */}
      <path d="M 18 26 Q 18 18, 28 18 L 62 18 Q 72 18, 72 26 L 72 116 Q 72 124, 64 124 L 26 124 Q 18 124, 18 116 Z" />
      {/* Stirring shaft */}
      <line x1="45" y1="26" x2="45" y2="98" />
      {/* Impeller */}
      <line x1="32" y1="98" x2="58" y2="98" strokeWidth={strokeWidth * 1.2} />
      <line x1="36" y1="92" x2="54" y2="104" strokeWidth={strokeWidth * 0.8} />
      <line x1="36" y1="104" x2="54" y2="92" strokeWidth={strokeWidth * 0.8} />
      {/* Sample port */}
      <line x1="72" y1="60" x2="84" y2="60" />
      <circle cx="86" cy="60" r="2" fill="currentColor" fillOpacity="0.4" stroke="none" />
      {/* Liquid level (dashed line near the top of the body) */}
      <line x1="22" y1="44" x2="68" y2="44" strokeDasharray="3 3" strokeWidth={strokeWidth * 0.7} opacity="0.6" />
    </svg>
  );
}
