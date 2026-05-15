"use client";
import { useState } from "react";
import { FileText, ChevronDown, ExternalLink, Eye } from "lucide-react";

export interface DocEntry {
  key: string;
  name: string;
  size: number;
  contentType: string;
}

/**
 * Collapsible "Supporting documents" card for the credit-application
 * review page. The header lists the document count; clicking it
 * expands the card and reveals an inline preview window sized to the
 * 8.5×11 letter aspect ratio so the typical PDF doc renders without
 * the reviewer needing to scroll the embed.
 *
 * Why letter-sized and not viewport-sized:
 *   • Most uploaded docs (acceptance letters, transcripts, supervisor
 *     notes) are letter-sized PDFs. Locking the embed to 8.5:11 means
 *     one page fits the frame; the operator scans without scrolling.
 *   • Viewport-sized would be too tall on big monitors and too short
 *     on laptops — the aspect lock makes the page consistent.
 *
 * Open/close animation: the `grid-template-rows` trick — the wrapper
 * morphs between `1fr` and `0fr`, the inner div is `min-h-0
 * overflow-hidden`, content fades opacity at the same time. No
 * height-measuring JS, no jank on long content.
 *
 * Multi-document: when there's more than one, the doc list along the
 * top of the open panel acts as tabs; the iframe swaps src on click.
 * Single-doc case skips the tab row entirely.
 *
 * Non-previewable types (docx, zip, etc.): the inline iframe still
 * tries to render but the browser will show a download prompt. The
 * "Open in new tab" link below the embed is the escape hatch.
 */
export function SupportingDocuments({
  applicationId,
  docs,
}: {
  applicationId: string;
  docs: DocEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(docs[0]?.key ?? null);
  const activeDoc = docs.find((d) => d.key === activeKey) ?? docs[0] ?? null;

  const previewUrl = activeDoc
    ? `/api/admin/credit-applications/${applicationId}/document?key=${encodeURIComponent(activeDoc.key)}`
    : null;

  const hasDocs = docs.length > 0;

  return (
    <section className="rounded-2xl border border-line bg-card surface-shadow overflow-hidden">
      <button
        type="button"
        onClick={() => hasDocs && setOpen((v) => !v)}
        disabled={!hasDocs}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-elevated transition-colors disabled:cursor-not-allowed disabled:hover:bg-card"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <FileText size={14} />
          </span>
          <span className="text-left min-w-0">
            <span className="block text-xs font-semibold text-subtle uppercase tracking-wider">
              Supporting documents · {docs.length}
            </span>
            {hasDocs ? (
              <span className="block text-[11px] text-muted truncate mt-0.5">
                {open
                  ? "Click to collapse"
                  : `Tap to preview ${docs.length === 1 ? activeDoc?.name ?? "the document" : "any document"} inline`}
              </span>
            ) : (
              <span className="block text-[11px] text-subtle mt-0.5">
                None attached.
              </span>
            )}
          </span>
        </span>
        {hasDocs && (
          <ChevronDown
            size={16}
            className={
              "text-muted shrink-0 transition-transform duration-200 " +
              (open ? "rotate-180" : "")
            }
          />
        )}
      </button>

      {/* grid-template-rows collapse — animates from 0fr to 1fr.
          The inner div needs min-h-0 + overflow-hidden so the grid
          row can shrink past content height during the transition. */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={
              "px-5 pb-5 pt-2 border-t border-line transition-opacity duration-200 " +
              (open ? "opacity-100 delay-100" : "opacity-0")
            }
          >
            {/* Tab row — only when multi-doc */}
            {docs.length > 1 && (
              <ul className="flex flex-wrap gap-1.5 mb-3">
                {docs.map((d) => {
                  const active = d.key === activeDoc?.key;
                  return (
                    <li key={d.key}>
                      <button
                        type="button"
                        onClick={() => setActiveKey(d.key)}
                        className={
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors " +
                          (active
                            ? "bg-brand-600 text-white ring-brand-700 shadow-sm"
                            : "bg-card text-fg ring-line hover:bg-elevated hover:ring-brand-300")
                        }
                      >
                        <FileText size={11} />
                        <span className="truncate max-w-[200px]">{d.name}</span>
                        <span className="text-[10px] opacity-70 font-mono tabular-nums">
                          {(d.size / 1024).toFixed(0)}K
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* The letter-sized preview frame. Aspect-ratio 8.5:11 ≈
                0.773; max-width capped so the frame stays readable on
                ultra-wide monitors. Centered with mx-auto. */}
            {activeDoc && previewUrl && (
              <div className="mx-auto" style={{ maxWidth: "680px" }}>
                <div
                  className="relative w-full bg-elevated rounded-xl border border-line overflow-hidden shadow-inner"
                  style={{ aspectRatio: "8.5 / 11" }}
                >
                  <iframe
                    key={previewUrl}
                    src={previewUrl}
                    title={activeDoc.name}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>

                {/* Meta strip below the embed */}
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted inline-flex items-center gap-1.5 min-w-0">
                    <Eye size={11} className="shrink-0" />
                    <span className="truncate">{activeDoc.name}</span>
                    <span className="text-subtle font-mono tabular-nums shrink-0">
                      · {(activeDoc.size / 1024).toFixed(0)} KB
                    </span>
                  </span>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:text-brand-800 font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    Open in new tab <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
