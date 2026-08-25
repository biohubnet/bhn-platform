"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

/**
 * "Download as a PDF" for the Progress Tracker's completed-courses list.
 *
 * Parity with the current platform, which offers the same export as a
 * record a trainee can send to a supervisor.
 *
 * jspdf is already a dependency (used elsewhere for certificates), but
 * it is imported DYNAMICALLY here: it is ~350 KB and the Progress
 * Tracker renders fine without it. Loading it eagerly would tax every
 * visit to pay for a button most people never press.
 */
export interface CompletedRow {
  title: string;
  code: string | null;
  /** ISO string, or null when the enrollment has no completion date. */
  completedAt: string | null;
}

export function CompletedCoursesExport({
  traineeName,
  rows,
}: {
  traineeName: string;
  rows: CompletedRow[];
}) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const left = 56;
      let y = 72;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("BioHubNet — Completed Courses", left, y);

      y += 22;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(traineeName, left, y);
      y += 16;
      doc.setTextColor(120);
      doc.text(
        `Generated ${new Date().toLocaleDateString("en-CA", {
          month: "long", day: "numeric", year: "numeric",
        })}`,
        left, y,
      );
      doc.setTextColor(0);

      y += 26;
      doc.setDrawColor(200);
      doc.line(left, y, 556, y);
      y += 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Course", left, y);
      doc.text("Completed", 430, y);
      y += 6;
      doc.setDrawColor(230);
      doc.line(left, y, 556, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const r of rows) {
        // New page before the row runs off the bottom, not after.
        if (y > 700) {
          doc.addPage();
          y = 72;
        }
        const label = r.code ? `${r.title} (${r.code})` : r.title;
        // Wrap long titles rather than letting them collide with the date column.
        const lines = doc.splitTextToSize(label, 350) as string[];
        doc.text(lines, left, y);
        doc.text(
          r.completedAt
            ? new Date(r.completedAt).toLocaleDateString("en-CA")
            : "—",
          430, y,
        );
        y += Math.max(16, lines.length * 14);
      }

      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text(
        `${rows.length} course${rows.length === 1 ? "" : "s"} completed.`,
        left, y,
      );

      doc.save("biohubnet-completed-courses.pdf");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy || rows.length === 0}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      {busy ? "Preparing…" : "Download as a PDF"}
    </button>
  );
}
