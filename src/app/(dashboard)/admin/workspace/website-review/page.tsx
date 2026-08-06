/**
 * Workspace → Website Review. Pick a page under review (or open one), then
 * leave threaded comments anchored to what's on it. Admins export the open
 * threads as a Markdown brief for Claude Code / Codex.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquareText, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { PageReviewClient } from "@/components/workspace/PageReviewClient";
import { NewPageReviewForm } from "@/components/workspace/NewPageReviewForm";
import { BookmarkletPanel } from "@/components/workspace/BookmarkletPanel";
import { PAGE_REVIEW_COMMENT_LIMIT } from "@/lib/page-review/limits";

export const dynamic = "force-dynamic";

export default async function WebsiteReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const session = await requireRole("instructor").catch(() => null);
  if (!session) redirect("/dashboard");

  const { r } = await searchParams;
  const role = (session.user as { role?: string }).role ?? "";
  const isAdmin = role === "admin" || role === "superadmin";
  const meId = (session.user as { id?: string }).id ?? null;
  const appOrigin = (process.env.NEXTAUTH_URL ?? "https://app.biohubnet.ca").replace(/\/$/, "");

  const reviews = await prisma.pageReview.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true, url: true, title: true, status: true, round: true,
      _count: { select: { comments: true } },
    },
  });

  const activeId = r ?? reviews[0]?.id ?? null;
  const active = activeId
    ? await prisma.pageReview.findUnique({
        where: { id: activeId },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            take: PAGE_REVIEW_COMMENT_LIMIT,
          },
        },
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><MessageSquareText size={11} /> Workspace</>}
        title="Website Review"
        description="Leave comments on a live page, reply to each other, and resolve them as they land. When a round is done, export the open threads as a brief for Claude Code or Codex — anchored to the exact text on the page so the change lands where you meant it."
      />

      {isAdmin && <NewPageReviewForm />}

      {reviews.length > 0 && (
        <nav className="flex flex-wrap gap-2">
          {reviews.map((rv) => (
            <Link
              key={rv.id}
              href={`/admin/workspace/website-review?r=${rv.id}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 ring-inset transition-colors ${
                rv.id === activeId
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-card text-muted ring-line hover:text-fg hover:bg-elevated"
              }`}
            >
              {rv.title}
              <span className="font-mono tabular-nums opacity-70">{rv._count.comments}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* shareToken is nullable in the schema; every review the app creates has one. */}
      {active && active.status !== "closed" && active.shareToken && (
        <BookmarkletPanel shareToken={active.shareToken} url={active.url} appOrigin={appOrigin} />
      )}

      {active ? (
        <PageReviewClient
          initialReview={{
            id: active.id, url: active.url, title: active.title,
            status: active.status, round: active.round,
            comments: active.comments.map((c) => ({
              id: c.id, parentId: c.parentId, round: c.round,
              anchorQuote: c.anchorQuote, anchorKey: c.anchorKey,
              anchorPath: c.anchorPath, anchorBlock: c.anchorBlock,
              anchorState: c.anchorState, authorUserId: c.authorUserId,
              authorName: c.authorName, authorKind: c.authorKind,
              body: c.body, status: c.status,
              editCount: c.editCount,
              editedAt: c.editedAt ? c.editedAt.toISOString() : null,
              createdAt: c.createdAt.toISOString(),
            })),
          }}
          meId={meId}
          isAdmin={isAdmin}
        />
      ) : (
        <section className="rounded-2xl border border-line bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted">No pages under review yet.</p>
          <p className="text-xs text-subtle mt-1">
            {isAdmin
              ? "Add a URL above to open the first one."
              : "An admin needs to open a review before you can comment."}
          </p>
          <a
            href="https://biohubnet.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 mt-3"
          >
            Open biohubnet.ca <ExternalLink size={10} />
          </a>
        </section>
      )}
    </div>
  );
}
