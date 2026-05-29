"use client";

import { Printer } from "lucide-react";

/** Triggers the browser print dialog (→ Save as PDF). Hidden in print. */
export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-brand-600 text-white hover:opacity-90 transition-opacity"
    >
      <Printer size={13} /> {label}
    </button>
  );
}
