import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ComplianceReport } from "@/components/admin/ComplianceReport";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-gray-500 text-sm mt-1">
          Per-course completion tracking. Export to CSV for audits.
        </p>
      </div>
      <ComplianceReport courses={courses} />
    </div>
  );
}
