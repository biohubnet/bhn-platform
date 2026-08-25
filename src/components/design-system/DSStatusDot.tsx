import { cn } from "@/lib/utils";

/**
 * Dot + label status pill.
 *
 * Mirrors the enrolment-state indicator on the current platform
 * (app.biohubnet.ca), where every Learning Pathway card carries a
 * green "Open" / red "Closed" marker in its header. Our Badge is a
 * filled chip and reads as a *label*; this reads as *live state*,
 * which is what an enrolment window is.
 *
 * Tone maps to meaning, not colour: `open` = actionable now,
 * `closed` = not actionable, `full` = real but unavailable. Callers
 * pass the semantic tone so a theme change can restyle every status
 * dot at once.
 */
export type DSStatusTone = "open" | "closed" | "full";

const DOT: Record<DSStatusTone, string> = {
  open: "bg-emerald-500",
  closed: "bg-rose-500",
  full: "bg-amber-500",
};

const TEXT: Record<DSStatusTone, string> = {
  open: "text-emerald-700",
  closed: "text-rose-700",
  full: "text-amber-700",
};

export function DSStatusDot({
  tone,
  label,
  title,
  className,
}: {
  tone: DSStatusTone;
  label: string;
  /** Why the window is in this state — surfaced as a tooltip. */
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap",
        TEXT[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[tone])} />
      {label}
    </span>
  );
}
