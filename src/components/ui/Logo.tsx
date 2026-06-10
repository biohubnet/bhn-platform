import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BHN Training mark — the BioHubNet "hexagon hub-network": six nodes
 * joined by bonds into a hexagonal ring around a diamond hub, i.e. the
 * name drawn literally (Bio = hexagon, Hub = diamond core, Net = the
 * connected nodes). Mirrors the brand lockup at
 * `public/biohubnet-logo.svg`, inlined here so the Sidebar and
 * anywhere else using `<Logo>` can render the mark without an extra
 * network round-trip and can pick up CSS sizing / filter effects
 * (drop-shadow etc.) cleanly.
 *
 * Flat two-weight geometry, no gradients — the apex node carries the
 * bio green, the diamond hub the brand blue, everything else the ink
 * teal. Same palette + geometry as icon.tsx and opengraph-image.tsx.
 */
export function LogoMark({ size = 36, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BHN Training"
      className={cn("inline-block", className)}
    >
      {/* Bonds — hexagonal ring through the six vertex nodes */}
      <path
        d="M 24 8.5 L 37.42 16.25 L 37.42 31.75 L 24 39.5 L 10.58 31.75 L 10.58 16.25 Z"
        stroke="#1F5A68"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Spokes — hub out to the three primary nodes */}
      <path
        d="M 24 24 L 24 8.5 M 24 24 L 37.42 31.75 M 24 24 L 10.58 31.75"
        stroke="#1F5A68"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Hub — rounded diamond core, heritage of the original
          four-diamond cluster promoted to the focal element */}
      <rect
        x="18.7"
        y="18.7"
        width="10.6"
        height="10.6"
        rx="2.3"
        transform="rotate(45 24 24)"
        fill="#1B7FB8"
      />
      {/* Primary nodes (spoke-connected) — apex carries the bio green */}
      <circle cx="24" cy="8.5" r="3.2" fill="#4FA475" />
      <circle cx="37.42" cy="31.75" r="3.2" fill="#1F5A68" />
      <circle cx="10.58" cy="31.75" r="3.2" fill="#1F5A68" />
      {/* Secondary nodes (ring-only) */}
      <circle cx="37.42" cy="16.25" r="2.2" fill="#1F5A68" />
      <circle cx="24" cy="39.5" r="2.2" fill="#1F5A68" />
      <circle cx="10.58" cy="16.25" r="2.2" fill="#1F5A68" />
    </svg>
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
 * Mark + wordmark. The wordmark is intentionally thin on "Training"
 * for an airy, modern flow.
 */
export function Logo({ size = "md", variant = "default", className }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={markSize[size]} className="drop-shadow-brand-glow" />
      <div className="leading-tight">
        <p className={cn(
          "font-semibold tracking-tight",
          wordmarkSize[size],
          isLight ? "text-white" : "text-fg"
        )}>
          BHN<span className={cn("font-light ml-1.5", isLight ? "text-brand-100" : "text-brand-600")}>Training</span>
        </p>
      </div>
    </div>
  );
}
