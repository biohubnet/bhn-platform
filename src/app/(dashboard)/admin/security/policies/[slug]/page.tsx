import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireRole } from "@/lib/auth";
import { getPolicy } from "@/lib/security/policies";

/**
 * /admin/security/policies/[slug] — render one policy doc.
 *
 * Reads the matching `docs/security/<slug>.md` file from disk and
 * renders it with react-markdown + remark-gfm (same toolkit the
 * /admin/security dashboard already uses for the report list).
 *
 * Slug validation happens inside getPolicy() — anything that isn't
 * /^[a-z0-9-]+$/i or points outside the policy directory returns
 * null, which we surface as 404.
 *
 * The H1 from the markdown source is hoisted into our page header,
 * so we suppress it inside the body to avoid a duplicated title.
 */
export const dynamic = "force-dynamic";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { slug } = await params;
  const policy = await getPolicy(slug);
  if (!policy) notFound();

  const githubUrl = `https://github.com/sesamemua/bhn-training-platform/blob/main/docs/security/${slug}.md`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/admin/security/policies"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> All policies
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle inline-flex items-center gap-1.5">
          {policy.kind === "policy" ? <FileText size={11} /> : <History size={11} />}
          {policy.kind === "policy" ? "Policy" : "Operational artefact"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight">
          {policy.title}
        </h1>
        <p className="text-xs text-subtle mt-2 font-mono">
          docs/security/{policy.slug}.md ·{" "}
          updated{" "}
          {new Date(policy.updatedAt).toLocaleString("en-CA", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
      </header>

      <article className="rounded-2xl border border-line bg-card p-6 sm:p-8 surface-shadow prose prose-sm max-w-none">
        {/* Suppress the H1 — it's already rendered in the page header
            above. Without this we'd get a duplicate title. */}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h1: () => null }}>
          {policy.body}
        </ReactMarkdown>
      </article>

      <footer className="rounded-2xl border border-dashed border-line bg-card p-4 text-xs text-muted leading-relaxed flex items-start gap-3">
        <ExternalLink size={13} className="text-subtle shrink-0 mt-0.5" />
        <div>
          <p>
            <strong className="text-fg">Source of truth.</strong> This page reads from{" "}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 font-mono hover:underline"
            >
              docs/security/{policy.slug}.md
            </a>{" "}
            on the current commit. Edits go through a pull request —
            review the diff before approving so the audit trail stays
            clean.
          </p>
        </div>
      </footer>
    </div>
  );
}
