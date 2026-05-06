import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BHN Training mark — a graduation cap (mortarboard) viewed top-down with
 * a hanging tassel, set in a brand-gradient rounded tile. Reads instantly
 * as "training / credentialed learning" at every size.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BHN Training"
      className={cn("inline-block", className)}
    >
      <defs>
        <linearGradient id="bhn-tile" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b6cef" />
          <stop offset="100%" stopColor="#1c2f7a" />
        </linearGradient>
        <linearGradient id="bhn-cap" x1="20" y1="6" x2="20" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbe7fe" />
        </linearGradient>
      </defs>

      {/* Background tile */}
      <rect width="40" height="40" rx="9" fill="url(#bhn-tile)" />

      {/* Mortarboard (rhombus) — the cap from above */}
      <path
        d="M20 8 L33 16 L20 24 L7 16 Z"
        fill="url(#bhn-cap)"
        stroke="#ffffff"
        strokeWidth="0.5"
      />

      {/* Center button */}
      <circle cx="20" cy="16" r="1.6" fill="#2a4fdb" />

      {/* Tassel cord descending from the right corner */}
      <path
        d="M33 16 Q33 20 31.5 23"
        stroke="#fbbf24"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tassel knot */}
      <circle cx="31.5" cy="23.5" r="1.2" fill="#fbbf24" />
      {/* Tassel strands */}
      <path
        d="M30.6 24.6 L30.2 28 M31.5 24.7 L31.5 28.3 M32.4 24.6 L32.8 28"
        stroke="#fbbf24"
        strokeWidth="1"
        strokeLinecap="round"
      />
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
 * Mark + wordmark for headers, sidebars, splash screens.
 * `variant="light"` for use on dark gradient backgrounds.
 */
export function Logo({ size = "md", variant = "default", className }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize[size]} className="drop-shadow-sm" />
      <div className="leading-tight">
        <p className={cn("font-bold tracking-tight", wordmarkSize[size], isLight ? "text-white" : "text-fg")}>
          BHN<span className={cn("font-medium ml-1.5", isLight ? "text-brand-100" : "text-brand-600")}>Training</span>
        </p>
      </div>
    </div>
  );
}
