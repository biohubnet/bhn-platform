/**
 * Workspace → File Sharing. Admin-only. Sibling of Marketing → Video Production.
 *
 * SKELETON — generated to give the parallel session a starting point.
 * The `SharedFile` model exists in prisma/schema.prisma, but NO migration has
 * been applied to the dev DB yet, and the local .env points at the production
 * database (never run `prisma migrate deploy` locally). So this page does NOT
 * query the DB. Once the migration is created, replace the placeholder below
 * with a `<SharedFilesClient />` backed by `GET /api/workspace/files`, mirroring
 * VideoProjectsClient.tsx + the video-projects API routes. See
 * FILE_SHARING_HANDOFF.md at the repo root.
 */
import { redirect } from "next/navigation";
import { FolderUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";

export default async function FileSharingPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><FolderUp size={11} /> Workspace · File Sharing</>}
        title="File Sharing"
        description="Share files within the internal team workspace. Skeleton page — upload, listing, and shareable links are not built yet."
      />
      {/* TODO(file-sharing): replace with <SharedFilesClient /> backed by
          GET /api/workspace/files once the SharedFile migration is applied.
          Mirror src/components/workspace/VideoProjectsClient.tsx and the
          src/app/api/workspace/video-projects routes. */}
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        File Sharing scaffold — build the upload + list UI here.
      </div>
    </div>
  );
}
