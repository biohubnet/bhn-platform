"use client";
/**
 * Renders an internship posting's positionDetails as Markdown.
 *
 * Why a thin wrapper instead of inlining react-markdown: the parent
 * is a server component and we want this rendered with the same
 * `prose` styling already used by /admin/security. Keeping it in a
 * client component file also lets us evolve the rendering pipeline
 * (e.g. add link sanitisation, embed YouTube oEmbed for video links)
 * without touching the server page.
 *
 * GFM (GitHub-flavoured) is on so authors can paste pipe-tables and
 * task lists copied from Notion / Slack / etc.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PROSE =
  "prose prose-sm max-w-none text-fg leading-relaxed " +
  "prose-headings:text-fg prose-p:text-muted prose-strong:text-fg " +
  "prose-a:text-brand-700 prose-li:text-muted " +
  "prose-h1:text-base prose-h1:font-semibold " +
  "prose-h2:text-base prose-h2:font-semibold " +
  "prose-h3:text-sm prose-h3:font-semibold " +
  "prose-code:text-brand-700 prose-code:bg-elevated prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-[''] prose-code:after:content-['']";

export function PostingDetailsMarkdown({ content }: { content: string }) {
  return (
    <div className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
