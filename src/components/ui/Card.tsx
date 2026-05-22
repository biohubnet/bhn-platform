import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  /** Forces a full-opacity surface for content needing high contrast. */
  solid?: boolean;
}

/**
 * Translucent glass card with soft shadow — replaces hard-bordered boxes.
 * The default surface uses `--card` (semi-transparent), with `--card-solid`
 * available via the `solid` prop for forms and tables.
 */
export function Card({ children, className, hover, solid, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line",
        solid ? "bg-card-solid" : "bg-card backdrop-blur-md",
        "shadow-card-rest",
        hover && "transition-all hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4 border-b border-line", className)}>{children}</div>;
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-3 border-t border-line bg-elevated/40 rounded-b-[var(--radius-lg)]", className)}>
      {children}
    </div>
  );
}
