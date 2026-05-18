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
