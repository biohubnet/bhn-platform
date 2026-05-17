import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InternshipEditor } from "@/components/internships/InternshipEditor";
import { PageHero } from "@/components/ui/PageHero";

export default async function EditInternshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const p = await prisma.internshipPosting.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <div>
      <PageHero
        eyebrow={<><Pencil size={11} /> Admin · EXPERIENCE</>}
        title="Edit posting"
        description={p.title}
      />
      <Link
        href={`/internships/${p.id}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft size={12} /> Back to posting
      </Link>
      <InternshipEditor
        mode="edit"
        postingId={p.id}
        initial={{
          companyName: p.companyName,
          website: p.website ?? "",
          title: p.title,
          duration: p.duration ?? "",
          hours: p.hours ?? "",
          location: p.location ?? "",
          type: p.type ?? "",
          compensation: p.compensation ?? "",
          deadline: p.deadline ? p.deadline.toISOString().slice(0, 10) : "",
          keySkills: p.keySkills,
          positionDetails: p.positionDetails,
          status: (p.status as "active" | "closed" | "draft") ?? "active",
          contactEmail: p.contactEmail ?? "",
          contactName: p.contactName ?? "",
          contactPhone: p.contactPhone ?? "",
        }}
      />
    </div>
  );
}
