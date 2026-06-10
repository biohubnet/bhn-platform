"use client";

/**
 * Editable table cell for the Outreach tables — an auto-growing textarea so
 * long values (titles, notes) WRAP instead of clipping. Saves on blur; Enter
 * saves (blurs), Shift+Enter inserts a line break.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function OutreachCell({
  defaultValue,
  onSave,
  disabled,
  className,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const autoSize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Size to content on mount (the parent keys this component by value, so a
  // server refresh remounts it and re-measures).
  useEffect(autoSize, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      defaultValue={defaultValue}
      disabled={disabled}
      onInput={autoSize}
      onBlur={(e) => onSave(e.target.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      placeholder="—"
      className={cn(
        "block w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1.5 py-1.5 text-[12.5px] leading-snug text-fg placeholder:text-subtle focus:border-brand-300 focus:bg-card-solid focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:opacity-70",
        className,
      )}
    />
  );
}
