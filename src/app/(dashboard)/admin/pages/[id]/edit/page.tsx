/**
 * /admin/pages/[id]/edit — fetch the page by id and render the
 * editor with its values. PATCH on save, DELETE on remove.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageEditor } from "@/components/cms/PageEditor";
import type { PageAudience, PageStatus } from "@/lib/cms/audience";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminPageEdit({ params }: Props) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/pages" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Pages
      </Link>

      <PageHeader
        title={`Edit · ${page.title}`}
        description={
          page.status === "published"
            ? `Live at /p/${page.slug}`
            : "Draft — not visible on the public route until you publish."
        }
        actions={
          page.status === "published" ? (
            <Link
              href={`/p/${page.slug}`}
              className="inline-flex items-center gap-1.5 bg-card hover:bg-elevated border border-line text-fg text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Eye size={12} /> View live
            </Link>
          ) : undefined
        }
      />

      <PageEditor
        mode="edit"
        initial={{
          id: page.id,
          slug: page.slug,
          title: page.title,
          body: page.body,
          excerpt: page.excerpt,
          status: page.status as PageStatus,
          audience: page.audience as PageAudience,
        }}
      />
    </div>
  );
}
