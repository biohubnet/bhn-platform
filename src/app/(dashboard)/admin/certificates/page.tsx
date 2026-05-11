import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { CertificateActions } from "@/components/admin/CertificateActions";
import { RevokeButton } from "@/components/admin/RevokeButton";

export default async function AdminCertificatesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  // Certificates can be tied to either a Course or a Pathway —
  // `kind` says which. Include BOTH relations and pick at render
  // time. Earlier versions of this page only included `course`,
  // which crashed for pathway certs (showcase-trainee seed creates
  // one) because `course` is null in that case.
  const [certs, users, courses] = await Promise.all([
    prisma.certificate.findMany({
      include: {
        user:    { select: { id: true, name: true, email: true } },
        course:  { select: { id: true, title: true } },
        pathway: { select: { id: true, title: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 300,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "published" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Certificate Management</h1>
          <p className="text-muted text-sm mt-1">{certs.length} certificates</p>
        </div>
        <CertificateActions users={users} courses={courses} />
      </div>

      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">For</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Issued</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {certs.map((cert) => {
                // Pathway certs have course=null and vice versa. Pick
                // the title from whichever relation populated; fall
                // back to a placeholder if both are somehow null (e.g.
                // the underlying row was deleted with onDelete cascade
                // before this query — shouldn't happen but harmless).
                const isPathway = cert.kind === "pathway";
                const subjectTitle = isPathway
                  ? cert.pathway?.title ?? "Pathway (deleted)"
                  : cert.course?.title ?? "Course (deleted)";
                return (
                <tr key={cert.id} className={cn("hover:bg-elevated", cert.revokedAt && "opacity-50")}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-fg">{cert.user.name ?? "—"}</p>
                    <p className="text-xs text-subtle">{cert.user.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-fg">{subjectTitle}</p>
                    <span
                      className={cn(
                        "inline-block text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded mt-1 ring-1 ring-inset",
                        isPathway
                          ? "bg-sky-50 text-sky-800 ring-sky-200"
                          : "bg-emerald-50 text-emerald-800 ring-emerald-200",
                      )}
                    >
                      {isPathway ? "Pathway" : "Course"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      cert.revokedAt ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                    )}>
                      {cert.revokedAt ? "Revoked" : "Valid"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {new Date(cert.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-subtle text-xs">
                    {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : "No expiry"}
                  </td>
                  <td className="px-5 py-3">
                    <RevokeButton certId={cert.id} revoked={!!cert.revokedAt} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
