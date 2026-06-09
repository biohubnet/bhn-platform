/**
 * Workspace → File Sharing. Admin-only. Sibling of Marketing → Video
 * Production. Upload files to R2, get public unguessable share links,
 * archive/restore, delete.
 */
import { redirect } from "next/navigation";
import { FolderUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { r2PublicUrl, R2_PUBLIC_URL } from "@/lib/r2";
import { PageHero } from "@/components/ui/PageHero";
import { SharedFilesClient } from "@/components/workspace/SharedFilesClient";

export const dynamic = "force-dynamic";

export default async function FileSharingPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const files = await prisma.sharedFile.findMany({
    where: { category: "file-sharing" },
    orderBy: { createdAt: "desc" },
  });
  const data = files.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    fileName: f.fileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    isArchived: f.isArchived,
    shareUrl: R2_PUBLIC_URL && f.storageKey ? r2PublicUrl(f.storageKey) : null,
    createdAt: f.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><FolderUp size={11} /> Workspace · File Sharing</>}
        title="File Sharing"
        description="Share files within the team. Each upload gets a public unguessable link you can send to anyone — no account needed to download."
      />
      <SharedFilesClient initialFiles={data} />
    </div>
  );
}
