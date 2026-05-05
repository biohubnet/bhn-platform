import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { CertificateActions } from "@/components/admin/CertificateActions";

export default async function AdminCertificatesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [certs, users, courses] = await Promise.all([
    prisma.certificate.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
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
          <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
          <p className="text-gray-500 text-sm mt-1">{certs.length} certificates</p>
        </div>
        <CertificateActions users={users} courses={courses} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Issued</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {certs.map((cert) => (
                <tr key={cert.id} className={cn("hover:bg-gray-50", cert.revokedAt && "opacity-50")}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{cert.user.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{cert.user.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{cert.course.title}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      cert.revokedAt ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                    )}>
                      {cert.revokedAt ? "Revoked" : "Valid"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(cert.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : "No expiry"}
                  </td>
                  <td className="px-5 py-3">
                    <RevokeButton certId={cert.id} revoked={!!cert.revokedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { RevokeButton } from "@/components/admin/RevokeButton";
