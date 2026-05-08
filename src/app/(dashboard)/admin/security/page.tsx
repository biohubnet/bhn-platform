/**
 * /admin/security — leadership-facing security reports.
 *
 * Reads every Markdown file under `docs/security/`, sorts newest-first
 * by filename (we name files `YYYY-MM-DD-slug.md`), and renders them
 * inline so admins can show a board / leadership member without
 * cloning the repo or hunting through GitHub.
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
import { ShieldCheck, FileText, ExternalLink } from "lucide-react";
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
  content: string;
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
    // First H1 in the markdown becomes the title; fall back to the
    // filename slug if the file doesn't start with one.
    const h1 = content.match(/^#\s+(.+)$/m);
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    return {
      filename,
      slug: filename.replace(/\.md$/, ""),
      title: h1?.[1]?.trim() ?? filename,
      date: dateMatch?.[1] ?? "",
      content,
    };
  });
}

export default async function AdminSecurityPage() {
  await requireRole("admin").catch(() => redirect("/dashboard"));
  const reports = loadReports();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-600" /> Security reports
          </span>
        }
        description="Internal incident reviews and pre-emptive audits. Each report is committed to the repo under docs/security/ so it's version-controlled and citable."
      />

      {reports.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText size={28} className="mx-auto text-subtle mb-3" />
          <p className="text-sm font-medium text-fg">No reports yet.</p>
          <p className="text-xs text-muted mt-1">
            Drop a Markdown file under <code className="font-mono text-xs">docs/security/YYYY-MM-DD-slug.md</code> and it&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((r) => (
            <Card key={r.slug} className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-line">
                <div className="min-w-0">
                  {r.date && (
                    <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-subtle">
                      {new Date(r.date).toLocaleDateString(undefined, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  )}
                  <h2 className="text-lg font-semibold text-fg mt-0.5 leading-snug">
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
              <article className="prose prose-sm max-w-none prose-headings:text-fg prose-p:text-muted prose-strong:text-fg prose-a:text-brand-600 prose-code:text-brand-700 prose-code:bg-elevated prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-[''] prose-table:text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  // Strip the first H1 — we already render it above as
                  // the card heading; rendering twice looks duplicated.
                  components={{
                    h1: () => null,
                  }}
                >
                  {r.content}
                </ReactMarkdown>
              </article>
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
