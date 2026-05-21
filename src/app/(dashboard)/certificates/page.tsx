import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Award, Download } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

export default async function CertificatesPage() {
  const session = await getSession();
  const userId = (session!.user as { id?: string }).id!;

  // Certificates can be either course- or pathway-issued (kind says
  // which). Include both relations and pick at render time — earlier
  // versions only included `course`, which crashed for pathway certs.
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: {
      course:  { select: { title: true, category: true } },
      pathway: { select: { title: true, category: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div>
      <PageHero
        eyebrow={<><Award size={11} /> Earned credentials</>}
        title="My Certificates"
        description={`${certificates.length} certificate${certificates.length !== 1 ? "s" : ""} earned — each one is a signed PDF you can download and share.`}
      />
      <div className="space-y-6">

      {certificates.length === 0 ? (
        <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-line space-y-3">
          <span className="inline-flex w-12 h-12 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
            <Award size={20} />
          </span>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-fg">No certificates yet</h2>
            <p className="text-sm text-fg-muted max-w-md mx-auto">
              Complete any course and you&apos;ll earn a verifiable certificate. Each one is a signed PDF with a public verify link you can share with employers.
            </p>
          </div>
          <Link
            href="/my-courses"
            className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-md hover:bg-brand-700 transition-colors"
          >
            See my courses
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => {
            const meta = cert.metadata ? JSON.parse(cert.metadata) : {};
            // Pick the title + category from whichever relation
            // populated — course for course certs, pathway for
            // pathway certs (kind tells which). The deleted-row
            // fallback shouldn't trigger in practice (FK cascade
            // would wipe the cert too), but keeps the page from
            // crashing if data ever drifts.
            const isPathway = cert.kind === "pathway";
            const subjectTitle = isPathway
              ? cert.pathway?.title ?? "Pathway (deleted)"
              : cert.course?.title ?? "Course (deleted)";
            const subjectCategory = isPathway
              ? cert.pathway?.category ?? null
              : cert.course?.category ?? null;
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
                  <p className="text-white/85 text-[10px] font-bold uppercase tracking-[0.18em] mt-1">
                    {isPathway ? "Pathway" : "Course"}
                  </p>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-fg text-sm mb-1">
                    {subjectTitle}
                  </h3>
                  {subjectCategory && (
                    <p className="text-xs text-subtle mb-2">{subjectCategory}</p>
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
    </div>
  );
}
