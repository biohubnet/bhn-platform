import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Award, Download } from "lucide-react";

interface CertWithCourse {
  id: string;
  issueDate: Date;
  expiryDate: Date | null;
  metadata: string | null;
  pdfUrl: string | null;
  revokedAt: Date | null;
  course: { title: string; category: string | null };
}

export default async function CertificatesPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;

  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: {
      course: { select: { title: true, category: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">My Certificates</h1>
        <p className="text-muted text-sm mt-1">
          {certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-line">
          <Award size={40} className="mx-auto text-subtle mb-4" />
          <p className="text-muted font-medium">No certificates yet</p>
          <p className="text-sm text-subtle mt-1">Complete a course to earn your first certificate</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(certificates as CertWithCourse[]).map((cert: CertWithCourse) => {
            const meta = cert.metadata ? JSON.parse(cert.metadata) : {};
            return (
              <div
                key={cert.id}
                className="bg-card rounded-xl border border-line overflow-hidden"
              >
                {/* Certificate visual */}
                <div className="h-40 bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center p-4">
                  <Award size={32} className="text-white mb-2" />
                  <p className="text-white font-bold text-center text-sm leading-tight">
                    Certificate of Completion
                  </p>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-fg text-sm mb-1">
                    {cert.course.title}
                  </h3>
                  {cert.course.category && (
                    <p className="text-xs text-subtle mb-2">{cert.course.category}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Issued {new Date(cert.issueDate).toLocaleDateString()}</span>
                    {meta.score != null && (
                      <span className="font-medium text-green-600">
                        {Math.round(meta.score)}%
                      </span>
                    )}
                  </div>
                  {cert.expiryDate && (
                    <p className="text-xs text-amber-600 mt-1">
                      Expires {new Date(cert.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                  {cert.pdfUrl && (
                    <a
                      href={cert.pdfUrl}
                      download
                      className="flex items-center gap-1.5 mt-3 text-xs text-brand-600 hover:underline"
                    >
                      <Download size={12} />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
