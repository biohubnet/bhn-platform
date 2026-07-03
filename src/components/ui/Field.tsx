"use client";
import { ReactNode, ReactElement, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, isValidElement, cloneElement, useId } from "react";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full px-3 py-2 text-sm bg-card border border-line rounded-lg shadow-sm placeholder:text-subtle " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  // Every <Field label="X"><Input/></Field> call site across the app gets a
  // programmatically-associated label for free: generate a stable id here
  // (useId is SSR-safe — no hydration mismatch) and clone it onto the single
  // child control, unless the caller already gave it an explicit id (that
  // wins). This was previously a purely visual label with no htmlFor/id
  // link at all — the single biggest source of "missing form label" a11y
  // violations in the app, since every consumer inherited the gap.
  const generatedId = useId();
  let control = children;
  let controlId: string | undefined;
  if (isValidElement(children)) {
    const el = children as ReactElement<{ id?: string }>;
    controlId = el.props.id ?? generatedId;
    control = cloneElement(el, { id: controlId });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={controlId} className="block text-xs font-medium text-muted">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {control}
      {hint && !error && <p className="text-xs text-subtle">{hint}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(inputClass, className)} {...rest} />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(inputClass, "resize-y", className)} {...rest} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={cn(inputClass, "pr-8", className)} {...rest}>
      {children}
    </select>
  )
);
Select.displayName = "Select";
