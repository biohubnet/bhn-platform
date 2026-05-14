import { cn } from "@/lib/utils";

/* ─── Official BioHubNet brand colours ─────────────────────────────
 *   Teal  · #327A80  · "Bio" wordmark, top-left + middle-left diamonds
 *   Blue  · #1A8DB6  · "Hub" wordmark, center + bottom diamonds
 *   Mint  · #7FC9A5  · "Net" wordmark, top-right + middle-right diamonds
 *
 *   Treated as immutable inside the LogoMark — the mark is brand
 *   identity, not a themeable element. Themes recolour everything
 *   else; the mark stays canonical. */
const BHN = {
  teal: "#327A80",
  blue: "#1A8DB6",
  mint: "#7FC9A5",
} as const;

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BioHubNet mark — four diamond cells in a plus-cluster, each one
 * a tilted square filled with horizontal chevron stripes. Reads as
 * a DNA-strand silhouette (the stripes look like base-pair rungs);
 * also reads as a network / cluster, hence "BioHub**Net**".
 *
 * Geometry choices
 * ────────────────
 *   • 64×64 viewBox — clean grid math, scales without subpixel jank
 *     from 14 px (favicon-ish) up to 400 px (hero badge).
 *   • Each diamond is a clipped square (rotated 45°) with horizontal
 *     white stripes laid over a solid brand fill. The stripes are
 *     positioned + sized to read as four chevron bands per diamond
 *     at any size.
 *   • The four cells:
 *         top-left  (teal)
 *         top-right (mint)
 *         middle    (blue)  ← drawn last, sits on top at overlaps
 *         bottom    (blue)
 *     The middle blue is rendered LAST so it sits on top — that's
 *     how the original logo creates the central focal point.
 */
export function LogoMark({ size = 36, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BioHubNet"
      className={cn("inline-block", className)}
    >
      <defs>
        {/* One clipPath per diamond cell — each cell's stripes are
            drawn as horizontal rectangles, then clipped down to the
            diamond outline. Cheaper + cleaner than building each
            chevron as its own polygon. */}
        <clipPath id="bhn-d-tl">
          <path d="M18,4 L32,18 L18,32 L4,18 Z" />
        </clipPath>
        <clipPath id="bhn-d-tr">
          <path d="M46,4 L60,18 L46,32 L32,18 Z" />
        </clipPath>
        <clipPath id="bhn-d-mid">
          <path d="M32,18 L46,32 L32,46 L18,32 Z" />
        </clipPath>
        <clipPath id="bhn-d-btm">
          <path d="M32,32 L46,46 L32,60 L18,46 Z" />
        </clipPath>
      </defs>

      {/* Top-left — teal */}
      <Diamond clipId="bhn-d-tl" color={BHN.teal} />
      {/* Top-right — mint */}
      <Diamond clipId="bhn-d-tr" color={BHN.mint} />
      {/* Bottom — blue. Drawn before middle so middle stacks above
          at the shared edge. */}
      <Diamond clipId="bhn-d-btm" color={BHN.blue} />
      {/* Middle — blue. Sits on top of the others at overlap points. */}
      <Diamond clipId="bhn-d-mid" color={BHN.blue} />
    </svg>
  );
}

/**
 * One diamond cell — solid fill + horizontal white stripes,
 * all clipped to the diamond outline. Stripe positions are tuned
 * to read as four chevron bands at any size from 14 px upward.
 */
function Diamond({ clipId, color }: { clipId: string; color: string }) {
  return (
    <g clipPath={`url(#${clipId})`}>
      <rect x="0" y="0" width="64" height="64" fill={color} />
      {/* Nine horizontal "rungs". The Y positions are spaced so a
          diamond at any cluster position reads as four colour bands
          separated by thinner white gaps + thicker white middles. */}
      <rect x="0" y="9.5"  width="64" height="1.6" fill="white" />
      <rect x="0" y="14.5" width="64" height="2.2" fill="white" />
      <rect x="0" y="20"   width="64" height="1.6" fill="white" />
      <rect x="0" y="25.5" width="64" height="2.2" fill="white" />
      <rect x="0" y="31"   width="64" height="1.6" fill="white" />
      <rect x="0" y="36.5" width="64" height="2.2" fill="white" />
      <rect x="0" y="42"   width="64" height="1.6" fill="white" />
      <rect x="0" y="47.5" width="64" height="2.2" fill="white" />
      <rect x="0" y="53"   width="64" height="1.6" fill="white" />
    </g>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  className?: string;
}

const markSize = { sm: 28, md: 36, lg: 44 };
const wordmarkSize = { sm: "text-sm", md: "text-base", lg: "text-lg" };

/**
 * Full lockup — mark + tri-colour wordmark.
 *
 * "BioHubNet" is rendered as three coloured segments matching the
 * mark's brand palette ("Bio" teal, "Hub" blue, "Net" mint). On the
 * `light` variant (over a dark hero), every segment renders white
 * so the lockup reads against the gradient — the tri-colour version
 * lives only on light backgrounds where it has enough contrast.
 */
export function Logo({ size = "md", variant = "default", className }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark
        size={markSize[size]}
        className="drop-shadow-[0_2px_6px_rgba(50,122,128,0.18)]"
      />
      {isLight ? (
        <p
          className={cn(
            "font-bold tracking-tight text-white",
            wordmarkSize[size],
          )}
        >
          BioHubNet
        </p>
      ) : (
        <p className={cn("font-bold tracking-tight leading-tight", wordmarkSize[size])}>
          <span style={{ color: BHN.teal }}>Bio</span>
          <span style={{ color: BHN.blue }}>Hub</span>
          <span style={{ color: BHN.mint }}>Net</span>
        </p>
      )}
    </div>
  );
}
