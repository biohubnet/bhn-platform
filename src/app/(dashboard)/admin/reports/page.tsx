import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ComplianceReport } from "@/components/admin/ComplianceReport";
import { PageHero } from "@/components/ui/PageHero";

export default async function AdminReportsPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const courses = await prisma.course.findMany({
    where: { status: "published" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><ShieldCheck size={11} /> Admin · Security &amp; compliance</>}
        title="Compliance Reports"
        description="Per-course completion tracking. Export to CSV for audits."
      />
      <ComplianceReport courses={courses} />
    </div>
  );
}
