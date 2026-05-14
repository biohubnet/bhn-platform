import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * BHN Training mark — soft circular medallion with a flowing rising arc
 * that ends in a small destination dot. Reads as "ascent / continuous
 * learning" and pairs naturally with the curved Aurora theme.
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
      <defs>
        <linearGradient id="bhn-medallion" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#5e8ff7" />
          <stop offset="55%" stopColor="#2a4fdb" />
          <stop offset="100%" stopColor="#1c2f7a" />
        </linearGradient>
        <linearGradient id="bhn-arc" x1="8" y1="38" x2="40" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="bhn-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer medallion — soft circle replaces the rounded square. */}
      <circle cx="24" cy="24" r="22" fill="url(#bhn-medallion)" />
      <circle cx="20" cy="18" r="14" fill="url(#bhn-glow)" />

      {/* Two flowing curves rise from lower-left to upper-right. */}
      <path
        d="M11 35 C 16 27, 22 22, 30 16"
        stroke="url(#bhn-arc)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 38 C 19 30, 25 25, 33 19"
        stroke="#ffffff"
        strokeOpacity="0.32"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Destination/credential dot at the arc's terminus. */}
      <circle cx="32" cy="14" r="5.5" fill="#fbbf24" fillOpacity="0.18" />
      <circle cx="32" cy="14" r="3" fill="#fbbf24" />
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
      <LogoMark size={markSize[size]} className="drop-shadow-[0_3px_10px_rgba(42,79,219,0.25)]" />
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
