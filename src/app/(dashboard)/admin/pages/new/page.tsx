/**
 * /admin/pages/new — render the PageEditor in "create" mode with
 * empty defaults. On save, the editor POSTs to /api/admin/pages
 * and the API returns the new id; the editor then navigates to
 * /admin/pages/[id]/edit so subsequent saves are updates.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageEditor } from "@/components/cms/PageEditor";

export const dynamic = "force-dynamic";

export default async function AdminPageNew() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <Link href="/admin/pages" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Pages
      </Link>

      <PageHeader
        title="New page"
        description="Draft a standalone page. Save it as a draft to preview; publish when ready."
      />

      <PageEditor
        mode="create"
        initial={{
          slug: "",
          title: "",
          body: "",
          excerpt: null,
          status: "draft",
          audience: "public",
        }}
      />
    </div>
  );
}
