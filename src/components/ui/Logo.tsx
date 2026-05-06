import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BHN Training mark: three stacked layers in brand gradient with a check on top.
 * Reads as "tiers of learning, certified" — distinct, scales cleanly to favicon size.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BHN Training"
      className={cn("inline-block", className)}
    >
      <defs>
        <linearGradient id="bhn-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5e8ff7" />
          <stop offset="60%" stopColor="#2a4fdb" />
          <stop offset="100%" stopColor="#1c2f7a" />
        </linearGradient>
        <linearGradient id="bhn-logo-grad-2" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b6cef" />
          <stop offset="100%" stopColor="#1e3499" />
        </linearGradient>
      </defs>
      {/* Background tile with subtle inner shadow feel */}
      <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#bhn-logo-grad-2)" />
      {/* Layer 3 (back, faintest) */}
      <rect x="6" y="20.5" width="20" height="5" rx="1.5" fill="white" fillOpacity="0.25" />
      {/* Layer 2 (middle) */}
      <rect x="6" y="14" width="20" height="5" rx="1.5" fill="white" fillOpacity="0.55" />
      {/* Layer 1 (top, fully white) */}
      <rect x="6" y="6.5" width="20" height="6" rx="1.5" fill="url(#bhn-logo-grad)" stroke="white" strokeWidth="0.5" />
      {/* Check on top layer */}
      <path
        d="M11.5 9.6 L13.6 11.7 L17.5 7.8"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light";
  className?: string;
}

const markSize = { sm: 24, md: 32, lg: 40 };
const wordmarkSize = { sm: "text-sm", md: "text-base", lg: "text-lg" };
const subSize = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

/**
 * Mark + wordmark, suitable for headers, sidebars, splash.
 * `variant="light"` for use on dark gradient backgrounds.
 */
export function Logo({ size = "md", variant = "default", className }: LogoProps) {
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={markSize[size]} className="drop-shadow-sm" />
      <div className="leading-tight">
        <p className={cn("font-bold tracking-tight", wordmarkSize[size], isLight ? "text-white" : "text-slate-900")}>
          BHN <span className={cn("font-semibold", isLight ? "text-brand-100" : "text-brand-600")}>Training</span>
        </p>
        <p className={cn("uppercase tracking-[0.18em] font-medium", subSize[size], isLight ? "text-brand-200" : "text-slate-400")}>
          Learning · Certified
        </p>
      </div>
    </div>
  );
}
