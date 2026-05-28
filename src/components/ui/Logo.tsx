import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BioHubNet mark — four overlapping striped diamonds in the brand
 * teal / blue / mint palette. The arrangement reads as a cluster of
 * interconnected nodes (network → hub → net).
 *
 * Each diamond is a rhombus filled with horizontal stripes; a single
 * <pattern> drives the stripe geometry and `currentColor` carries the
 * per-diamond colour via the wrapping <g color="…">. Modern SVG
 * pattern support is universal in browsers — for the Satori-rendered
 * favicon + OG card (icon.tsx, opengraph-image.tsx) we redraw the
 * same composition with explicit rects so it survives Satori's
 * narrower SVG subset.
 */

// Brand colour tokens. Sourced from the canonical artwork on
// /public/biohubnet-logo.svg so the mark, the wordmark, the favicon,
// and the OG card all draw from the same three hex values.
const COLOR_TEAL  = "#2D7872";
const COLOR_BLUE  = "#187FB0";
const COLOR_MINT  = "#7DC495";

export function LogoMark({ size = 36, className }: LogoMarkProps) {
  // viewBox padded slightly so the stripes don't clip at the SVG edge
  // when CSS scaling rounds dimensions.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BioHubNet"
      className={cn("inline-block", className)}
    >
      <defs>
        {/* Horizontal stripe pattern. Each repeat is 8 units tall —
            5 units colour + 3 units transparent so the page bg shows
            through and the diamond reads with "venetian blind" cuts. */}
        <pattern
          id="bhn-stripe"
          x="0"
          y="0"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="5" fill="currentColor" />
        </pattern>
      </defs>

      {/* Top-left teal diamond */}
      <g color={COLOR_TEAL}>
        <polygon points="25,2 50,27 25,52 0,27" fill="url(#bhn-stripe)" />
      </g>

      {/* Top-right mint diamond */}
      <g color={COLOR_MINT}>
        <polygon points="75,2 100,27 75,52 50,27" fill="url(#bhn-stripe)" />
      </g>

      {/* Bottom-left blue diamond, vertically offset upward so it
          overlaps with the top row — that overlap is what makes the
          cluster read as connected rather than as a 2×2 grid. */}
      <g color={COLOR_BLUE}>
        <polygon points="25,42 50,67 25,92 0,67" fill="url(#bhn-stripe)" />
      </g>

      {/* Bottom-right mint diamond, same overlap */}
      <g color={COLOR_MINT}>
        <polygon points="75,42 100,67 75,92 50,67" fill="url(#bhn-stripe)" />
      </g>
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  className?: string;
  /** When true, includes the "Transformative Talent Development"
   *  tagline under the wordmark. Off by default — most chrome uses
   *  the mark + "BioHubNet" only to keep the lock-up compact. */
  withTagline?: boolean;
}

const markSize     = { sm: 28, md: 36, lg: 56 };
const wordSize     = { sm: "text-lg",  md: "text-2xl", lg: "text-3xl" };
const taglineSize  = { sm: "text-[10px]", md: "text-[11px]", lg: "text-xs" };

/**
 * Full BioHubNet lock-up: mark + multi-colour wordmark, with an
 * optional tagline. The three colour stops on "Bio" / "Hub" / "Net"
 * mirror the three diamond colours in the mark.
 */
export function Logo({
  size = "md", variant = "default", className, withTagline = false,
}: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={markSize[size]} className="drop-shadow-brand-glow" />
      <div className="leading-tight">
        <p className={cn("font-extrabold tracking-tight", wordSize[size])}>
          <span style={{ color: isLight ? "#a5d9d3" : COLOR_TEAL }}>Bio</span>
          <span style={{ color: isLight ? "#7dc1e6" : COLOR_BLUE }}>Hub</span>
          <span style={{ color: isLight ? "#b9e3c5" : COLOR_MINT }}>Net</span>
        </p>
        {withTagline && (
          <p
            className={cn(
              "font-bold uppercase tracking-[0.18em] mt-1",
              taglineSize[size],
              isLight ? "text-white/80" : "text-fg-muted",
            )}
          >
            Transformative Talent Development
          </p>
        )}
      </div>
    </div>
  );
}
