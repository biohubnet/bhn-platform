"use client";
import { Printer } from "lucide-react";

/**
 * Tiny client-side "Print this page" affordance. Lives in its own
 * component so the surrounding server page doesn't need to mark
 * itself client for one event handler.
 */
export function PrintLink() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
    >
      <Printer size={12} /> Print this page
    </button>
  );
}
