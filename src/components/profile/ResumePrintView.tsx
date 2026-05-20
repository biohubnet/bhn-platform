"use client";

/**
 * Print-styled preview of a structured resume.
 *
 * Renders the resume in an ATS-friendly single-column layout — clean
 * typography, no UI chrome, no comment threads. A "Save as PDF"
 * button at the top fires `window.print()`; the print CSS hides the
 * button and forces black-on-white at letter-size with sane margins,
 * so the browser's native print → "Save as PDF" produces a clean
 * file without any editor frame, sidebar, or accent colours leaking
 * in.
 *
 * No new dependencies — we lean on the browser's built-in print
 * pipeline rather than a server-side PDF library. The trade-off:
 * users get whatever their browser produces (small variations
 * between Chrome / Safari / Firefox) but the platform stays light
 * and there's nothing to misconfigure.
 *
 * Layout choices:
 *   • Single column. ATS scanners hate multi-column.
 *   • Clear section headings with hairline underlines.
 *   • Item header on one line: title (bold) left, dates right.
 *     Subtitle on the next line, italic.
 *   • Skills section renders as a comma-joined run, not a bullet
 *     list — more compact + reads naturally on paper.
 *   • Description paragraph above bullets when present.
 *   • Empty fields are omitted (no "GPA: —" placeholder lines).
 */

import type { ResumeContent, ResumeSection } from "@/lib/resume/types";
import { SECTION_LABEL, formatItemDates } from "@/lib/resume/types";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  content: ResumeContent;
  /** Optional explicit name fallback when header.name is missing. */
  fallbackName?: string | null;
  /** Optional explicit email fallback when header.email is missing. */
  fallbackEmail?: string | null;
}

export function ResumePrintView({ content, fallbackName, fallbackEmail }: Props) {
  const name     = content.header?.name     ?? fallbackName  ?? "";
  const email    = content.header?.email    ?? fallbackEmail ?? "";
  const phone    = content.header?.phone    ?? "";
  const location = content.header?.location ?? "";
  const summary  = content.header?.summary  ?? "";

  // Render sections in position order; drop sections that are
  // entirely empty so the printed page never shows a heading without
  // content under it.
  const sectionsToShow = content.sections
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter((s) => sectionHasContent(s));

  // Truly empty resume — no header, no summary, no sections with
  // content. Render a guided empty state instead of a blank sheet so
  // the user knows where to go to fill it in.
  const isEmpty =
    !name && !email && !phone && !location && !summary &&
    sectionsToShow.length === 0;

  return (
    <>
      {/* Print + layout CSS. Inline so the preview page doesn't need
          a separate stylesheet; lives once at the top of the print
          view and applies only inside `.resume-print-root`. */}
      <style jsx global>{`
        @page {
          size: letter;
          margin: 0.5in 0.55in;
        }
        @media print {
          /* Standard "print only this element" pattern. The dashboard
             layout wraps this page with a sidebar, translator dock,
             banners, etc. — we don't know their exact class names
             and they shouldn't print. Hide everything on the page
             with visibility:hidden, then turn the resume shell
             visible again. visibility (not display:none) is the
             right tool here so the layout doesn't reflow. */
          body * { visibility: hidden !important; }
          .resume-print-shell, .resume-print-shell * { visibility: visible !important; }
          .resume-print-shell {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            margin: 0 !important;
          }
          /* Hide every toolbar / button when actually printing. */
          .no-print { display: none !important; visibility: hidden !important; }
          /* Force black on white — accent colours muddy a real print. */
          html, body, .resume-print-root {
            background: white !important;
            color: black !important;
          }
          /* Drop the rounded card / shadow so it doesn't print as a
             grey box around the resume. */
          .resume-print-root {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
          /* Don't break an item across pages if we can avoid it. */
          .print-item { break-inside: avoid; }
          .print-section { break-inside: auto; }
          .print-section-heading { break-after: avoid; }
        }
        /* Body font choices — neutral sans by default. The
           font-feature settings give cleaner numerals which read
           well in dates + GPA strings. */
        .resume-print-root {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-feature-settings: "tnum";
          font-size: 10.5pt;
          line-height: 1.42;
          color: #111;
        }
        .resume-print-root h1 {
          font-size: 22pt;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .resume-print-root h2 {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 6pt 0;
          padding-bottom: 2pt;
          border-bottom: 0.5pt solid #111;
        }
        .resume-print-root .print-item-title {
          font-weight: 600;
        }
        .resume-print-root .print-item-subtitle {
          font-style: italic;
          color: #333;
        }
        .resume-print-root .print-item-dates {
          color: #333;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .resume-print-root ul.print-bullets {
          margin: 4pt 0 0 14pt;
          padding: 0;
        }
        .resume-print-root ul.print-bullets li {
          margin: 0 0 2pt 0;
          padding: 0;
        }
      `}</style>

      <div className="resume-print-shell">
      {isEmpty ? (
        // Guided empty state — only shows on screen. Hidden from
        // print because the .no-print class on the toolbar covers
        // both the toolbar and (via the same body * rule in
        // @media print) anything else; but to be safe we wrap the
        // empty card in .no-print too. If you actually print an
        // empty resume nothing useful would land on paper anyway.
        <div className="no-print max-w-2xl mx-auto px-4 py-12">
          <div className="rounded-2xl border border-dashed border-line bg-card-solid p-8 text-center space-y-3">
            <span className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-700 items-center justify-center">
              <Printer size={20} />
            </span>
            <h1 className="text-lg font-semibold text-fg">Nothing to preview yet</h1>
            <p className="text-sm text-fg-muted max-w-md mx-auto">
              Your structured resume is empty — there&apos;s no name, summary, or sections to render.
              Head back to the editor to fill it in, or AI-parse from an uploaded PDF.
            </p>
            <Link
              href="/profile/resume"
              className="inline-flex items-center gap-1.5 px-3 py-2 mt-2 rounded-md bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors"
            >
              <ArrowLeft size={12} /> Open the resume editor
            </Link>
          </div>
        </div>
      ) : (
      <>
      {/* Toolbar — only visible on screen, hidden from print. */}
      <div className="no-print sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-[8.5in] mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/profile/resume"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg"
          >
            <ArrowLeft size={12} /> Back to editor
          </Link>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-fg-muted hidden sm:block">
              Looks right? Click <strong>Save as PDF</strong> — your browser&apos;s print dialog has the option in the destination dropdown.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors"
            >
              <Printer size={12} /> Save as PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* The resume sheet. The on-screen card is a centred letter-
          sized box; print CSS strips the card-ness so the paper IS
          the canvas. */}
      <main className="max-w-[8.5in] mx-auto my-6 bg-white text-black rounded-md shadow-xl border border-line p-[0.55in] resume-print-root">
        {/* Header --------------------------------------------- */}
        {(name || email || phone || location) && (
          <header className="mb-3">
            {name && <h1>{name}</h1>}
            {(email || phone || location) && (
              <div className="mt-1 text-[10pt]" style={{ color: "#333" }}>
                {[email, phone, location].filter(Boolean).join("  ·  ")}
              </div>
            )}
          </header>
        )}

        {/* Optional summary paragraph, surfaced at the top. The
            structured-resume tree usually has a "summary" section
            with the same paragraph in its first item's description.
            We prefer the structured one when present, falling back
            to header.summary. */}
        {!hasSummarySection(content) && summary && (
          <p className="mb-3">{summary}</p>
        )}

        {/* Sections ------------------------------------------- */}
        {sectionsToShow.map((section) => (
          <SectionBlock key={section.id} section={section} />
        ))}
      </main>
      </>
      )}
      </div>
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function hasSummarySection(content: ResumeContent): boolean {
  return content.sections.some(
    (s) => s.kind === "summary" && sectionHasContent(s),
  );
}

function sectionHasContent(section: ResumeSection): boolean {
  if (section.items.length === 0) return false;
  return section.items.some((it) => {
    const hasText =
      !!it.title || !!it.subtitle || !!it.description ||
      !!it.metric || !!it.url ||
      !!it.startDate || !!it.endDate || !!it.dateRange;
    const hasBullets = it.bullets.some((b) => b.body.trim().length > 0);
    return hasText || hasBullets;
  });
}

function SectionBlock({ section }: { section: ResumeSection }) {
  const heading = section.title ?? SECTION_LABEL[section.kind];

  // Skills is special — render as a comma-joined run, more
  // compact + reads naturally on paper than a 5-bullet list.
  if (section.kind === "skills") {
    const skills = section.items
      .flatMap((it) => it.bullets.map((b) => b.body.trim()))
      .filter(Boolean);
    if (skills.length === 0) return null;
    return (
      <section className="mb-3 print-section">
        <h2 className="print-section-heading">{heading}</h2>
        <p>{skills.join("  ·  ")}</p>
      </section>
    );
  }

  // Summary is also special — items typically have a description
  // paragraph and no bullets. Render description directly.
  if (section.kind === "summary") {
    return (
      <section className="mb-3 print-section">
        <h2 className="print-section-heading">{heading}</h2>
        {section.items.map((it) => (
          it.description ? <p key={it.id}>{it.description}</p> : null
        ))}
      </section>
    );
  }

  return (
    <section className="mb-3 print-section">
      <h2 className="print-section-heading">{heading}</h2>
      <div className="space-y-2.5">
        {section.items.map((it) => {
          // Skip wholly empty items so the resume isn't dotted with
          // blank lines if the user added an item and didn't fill it.
          const dates = formatItemDates(it);
          const filledBullets = it.bullets.filter((b) => b.body.trim().length > 0);
          if (!it.title && !it.subtitle && !it.description && !dates && filledBullets.length === 0 && !it.metric) {
            return null;
          }
          return (
            <article key={it.id} className="print-item">
              {(it.title || dates) && (
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    {it.title && <span className="print-item-title">{it.title}</span>}
                  </div>
                  {dates && <div className="print-item-dates text-[10pt]">{dates}</div>}
                </div>
              )}
              {(it.subtitle || it.metric) && (
                <div className="flex items-baseline justify-between gap-3 text-[10pt]">
                  {it.subtitle && <span className="print-item-subtitle">{it.subtitle}</span>}
                  {it.metric && <span style={{ color: "#333" }}>{it.metric}</span>}
                </div>
              )}
              {it.url && (
                <div className="text-[9.5pt]" style={{ color: "#333" }}>
                  {it.url}
                </div>
              )}
              {it.description && (
                <p className="mt-1">{it.description}</p>
              )}
              {filledBullets.length > 0 && (
                <ul className="print-bullets list-disc">
                  {filledBullets.map((b) => (
                    <li key={b.id}>{b.body}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
