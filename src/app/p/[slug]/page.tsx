/**
 * /p/[slug] — public render for CMS-authored pages.
 *
 * Audience gating:
 *   • Drafts → only visible with `?preview=1` AND viewer is admin.
 *     Otherwise 404.
 *   • Published, audience-gated → returns 404 for viewers whose
 *     role can't see them. 404 (not 403) so we don't leak the
 *     existence of admins-only pages to non-admins.
 *
 * Auth is read with `getSession()` so unauthenticated viewers can
 * see "public" pages without bouncing through /login.
 */
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewPage } from "@/lib/cms/audience";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, status: true },
  });
  if (!page || page.status !== "published") {
    return { title: "Not found" };
  }
  return {
    title: page.title,
    description: page.excerpt ?? undefined,
  };
}

export default async function PublicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) notFound();

  const session = await getSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? null;
  const isAdmin = role === "admin" || role === "superadmin";

  // Draft gating — admins can preview with ?preview=1; everyone
  // else 404s on drafts.
  if (page.status !== "published") {
    if (!(isAdmin && preview === "1")) notFound();
  }

  // Audience gating — 404 for viewers whose role can't see this
  // audience tier.
  if (!canViewPage(page.audience, role)) notFound();

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {page.status !== "published" && (
        <div className="mb-6 inline-flex items-center gap-2 bg-amber-100 text-amber-900 ring-1 ring-amber-200 text-xs font-bold px-3 py-1.5 rounded-full">
          DRAFT PREVIEW
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-fg leading-tight">
          {page.title}
        </h1>
        {page.excerpt && (
          <p className="mt-3 text-base text-fg-muted italic leading-relaxed">
            {page.excerpt}
          </p>
        )}
        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] font-bold text-fg-subtle">
          Updated {new Date(page.updatedAt).toLocaleDateString()}
        </p>
      </header>

      <article className="prose prose-sm sm:prose-base max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
      </article>
    </div>
  );
}
