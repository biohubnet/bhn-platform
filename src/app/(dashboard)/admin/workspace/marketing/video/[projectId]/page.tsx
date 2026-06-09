/**
 * One video project — its scripts (admin-only).
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Clapperboard, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { VideoProjectDetailClient } from "@/components/workspace/VideoProjectDetailClient";

export const dynamic = "force-dynamic";
interface Props { params: Promise<{ projectId: string }> }

export default async function VideoProjectDetailPage({ params }: Props) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const { projectId } = await params;

  const project = await prisma.videoProject.findUnique({
    where: { id: projectId },
    include: {
      scripts: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        select: { id: true, title: true, format: true, updatedAt: true, _count: { select: { sections: true } } },
      },
    },
  });
  if (!project) notFound();

  const scripts = project.scripts.map((s) => ({
    id: s.id,
    title: s.title,
    format: s.format,
    sectionCount: s._count.sections,
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Clapperboard size={11} /> Video Production</>}
        title={project.title}
        description={project.summary || "Scripts for this video."}
        actions={
          <Link
            href="/admin/workspace/marketing/video"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
          >
            <ArrowLeft size={13} /> All projects
          </Link>
        }
      />
      <VideoProjectDetailClient projectId={project.id} initialScripts={scripts} />
    </div>
  );
}
