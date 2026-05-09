/**
 * /admin/security — leadership-facing security reports.
 *
 * Reads every Markdown file under `docs/security/`, sorts newest-first
 * by filename (we name files `YYYY-MM-DD-slug.md`), and renders each
 * as a foldable card. By default we show only:
 *   • the date eyebrow
 *   • the H1 title
 *   • the body of the first `## Executive summary` section if present,
 *     OR the first paragraph after the H1 as a fallback
 * The rest of the report sits inside a <details> so admins can scan
 * the page in 30 seconds and only expand the report they want.
 *
 * Convention for new reports: every file under docs/security/ should
 * lead with an "## Executive summary" heading right after the H1.
 * Without one the page falls back to the first paragraph, which is
 * usually OK but not as deliberate.
 *
 * Admin-only. The reports themselves are committed to the repo so
 * they're version-controlled, citable, and can be linked publicly
 * later if leadership wants a transparency page (currently the page
 * is gated because reports also discuss what we *didn't* change
 * and why — internal context, not external comms).
 */
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ShieldCheck, FileText, ExternalLink, ChevronDown } from "lucide-react";
import fs from "fs";
import path from "path";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

interface Report {
  filename: string;
  slug: string;
  title: string;
  date: string;
  /** Above-the-fold content. Either the body of "## Executive summary"
   *  or the first paragraph after the H1 if no exec section exists. */
  summary: string;
  /** Below-the-fold content — everything else. */
  rest: string;
}

/**
 * Split a report into its above-the-fold (summary) and below-the-fold
 * (rest) parts. The H1 line is stripped from both — it's surfaced as
 * the card heading by the renderer.
 *
 * Order of precedence for the summary:
 *   1. The body of an `## Executive summary` section (case-insensitive)
 *   2. The first non-empty paragraph after the H1
 * The "rest" is always everything else: H1 stripped, exec section
 * stripped (if it was used as the summary), summary paragraph kept in
 * place (so the body still flows when expanded — the duplication is
 * minor and clearer than mid-stream omission).
 */
function splitReport(content: string): { summary: string; rest: string } {
  // Strip the leading H1 if present.
  const sansH1 = content.replace(/^#\s+.+\n+/m, "");

  // Look for an explicit Executive Summary heading.
  const execMatch = sansH1.match(/^##\s+Executive summary\s*\n+([\s\S]*?)(?=\n##\s|$)/im);
  if (execMatch) {
    const summary = execMatch[1].trim();
    // Remove the exec section from the rest so we don't show it twice.
    const rest = sansH1.replace(execMatch[0], "").trim();
    return { summary, rest };
  }

  // Fallback: first non-empty paragraph (text up to the first blank
  // line, ignoring leading horizontal rules and front-matter-ish lines).
  const lines = sansH1.split("\n");
  const out: string[] = [];
  let collecting = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (collecting) break;
      continue;
    }
    // Skip structural openers — horizontal rules, "Audience:", etc.
    if (/^(---+|\*\*[A-Z][^*]+\*\*:)/.test(line.trim())) continue;
    collecting = true;
    out.push(line);
  }
  const summary = out.join("\n").trim();
  return { summary, rest: sansH1.trim() };
}

function loadReports(): Report[] {
  const dir = path.join(process.cwd(), "docs", "security");
  if (!fs.existsSync(dir)) return [];
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a)); // newest filename first

  return entries.map((filename) => {
    const full = path.join(dir, filename);
    const content = fs.readFileSync(full, "utf-8");
    const h1 = content.match(/^#\s+(.+)$/m);
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const { summary, rest } = splitReport(content);
    return {
      filename,
      slug: filename.replace(/\.md$/, ""),
      title: h1?.[1]?.trim() ?? filename,
      date: dateMatch?.[1] ?? "",
      summary,
      rest,
    };
  });
}

const PROSE_CLASSES =
  "prose prose-sm max-w-none prose-headings:text-fg prose-p:text-muted " +
  "prose-strong:text-fg prose-a:text-brand-600 " +
  "prose-code:text-brand-700 prose-code:bg-elevated prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-[''] " +
  "prose-table:text-sm prose-table:my-3";

export default async function AdminSecurityPage() {
  await requireRole("admin").catch(() => redirect("/dashboard"));
  const reports = loadReports();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={20} className="text-sky-600" /> Security reports
          </span>
        }
        description="Internal incident reviews and pre-emptive audits. Each report is committed to the repo under docs/security/ so it's version-controlled and citable. Click 'Read full report' to expand."
      />

      {reports.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText size={28} className="mx-auto text-subtle mb-3" />
          <p className="text-sm font-medium text-fg">No reports yet.</p>
          <p className="text-xs text-muted mt-1">
            Drop a Markdown file under <code className="font-mono text-xs">docs/security/YYYY-MM-DD-slug.md</code>{" "}
            (with an <code className="font-mono text-xs">## Executive summary</code> heading at the top)
            and it&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r.slug} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  {r.date && (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  )}
                  <h2 className="text-base font-semibold text-fg mt-0.5 leading-snug">
                    {r.title}
                  </h2>
                </div>
                <a
                  href={`https://github.com/sesamemua/bhn-training-platform/blob/main/docs/security/${r.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                  title="View on GitHub"
                >
                  Source <ExternalLink size={11} />
                </a>
              </div>

              {/* Always-visible: executive summary */}
              <article className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: () => null }}>
                  {r.summary}
                </ReactMarkdown>
              </article>

              {/* Foldable: rest of the report. Native <details> so it
                  works without JS hydration; admins are typically on
                  a desktop browser anyway. The summary chevron rotates
                  via the [open] selector. */}
              {r.rest && (
                <details className="group/report mt-4 border-t border-line pt-3">
                  <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 select-none">
                    <ChevronDown
                      size={12}
                      className="transition-transform group-open/report:rotate-180"
                    />
                    <span className="group-open/report:hidden">Read full report</span>
                    <span className="hidden group-open/report:inline">Hide full report</span>
                  </summary>
                  <article className={PROSE_CLASSES + " mt-4"}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: () => null }}>
                      {r.rest}
                    </ReactMarkdown>
                  </article>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-subtle">
        Need to file a vulnerability disclosure? Email <a className="text-brand-600 hover:underline" href="mailto:security@biohubnetwork.ca">security@biohubnetwork.ca</a>.
      </p>
    </div>
  );
}
