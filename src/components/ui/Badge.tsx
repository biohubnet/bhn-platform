import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "amber";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  brand:   "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger:  "bg-rose-50 text-rose-700",
  amber:   "bg-amber-50 text-amber-700",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", toneClass[tone], className)}>
      {children}
    </span>
  );
}
