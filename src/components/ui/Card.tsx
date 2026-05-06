import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, className, hover, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-line shadow-sm",
        hover && "transition-all hover:border-brand-200 hover:shadow-md hover:-translate-y-0.5",
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
  return <div className={cn("px-5 py-3 border-t border-line bg-elevated/50 rounded-b-xl", className)}>{children}</div>;
}
