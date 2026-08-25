"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-open disclosure list.
 *
 * Extracted from the mechanics in employer/ProfileEditorAccordion —
 * same aria-expanded button, same chevron rotation, same
 * gridTemplateRows 1fr/0fr collapse (which animates height without
 * needing a measured pixel value). ProfileEditorAccordion itself is
 * deliberately NOT refactored onto this: it wraps a stateful editor
 * that must stay mounted while collapsed, whereas this unmounts
 * nothing and simply hides. Two different requirements that happen to
 * look alike.
 *
 * Single-open by design: an FAQ where every answer can be open at once
 * becomes a wall of text and loses the scannability that made it an
 * accordion in the first place.
 */
export function Accordion({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line rounded-xl border border-line overflow-hidden">{children}</div>;
}

export function AccordionItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const buttonId = `${id}-button`;

  return (
    <div className="bg-card">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left px-4 sm:px-5 py-3.5 hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60"
      >
        <span className="text-sm font-semibold text-fg">{question}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {/* grid 1fr/0fr is the height animation: the row collapses to
          zero without the child needing a fixed height. overflow-hidden
          on the inner div is what makes the clip work. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="grid transition-all duration-200"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 pb-4 text-sm text-muted leading-relaxed space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
