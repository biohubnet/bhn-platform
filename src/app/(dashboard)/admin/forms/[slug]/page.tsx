import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, ArrowLeft, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { answerFields, type FormField } from "@/lib/forms/types";

export default async function AdminFormSubmissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireRole("admin");
  const { slug } = await params;
  const form = await prisma.eventForm.findUnique({
    where: { slug },
    include: {
      _count: { select: { submissions: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 200,
      },
    },
  });
  if (!form) notFound();

  const fields = form.fields as unknown as FormField[];
  const ansFields = answerFields(fields);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/forms/${slug}`}
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Back to form
          </Link>
          <h1 className="text-2xl font-bold text-fg">{form.title}</h1>
          <p className="text-sm text-muted mt-0.5">
            {form._count.submissions}{" "}
            {form._count.submissions === 1 ? "submission" : "submissions"}
            {form._count.submissions > 200 && " — showing latest 200"}
          </p>
        </div>
        <a
          href={`/api/forms/${slug}/export.csv`}
          className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-2 font-medium shadow-sm shadow-brand-600/25"
        >
          <Download size={14} /> Export CSV
        </a>
      </div>

      {form.submissions.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <FileText size={20} />
          </div>
          <p className="font-medium text-muted">No submissions yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated/60 border-b border-line">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3 sticky left-0 bg-elevated/60">
                    Submitted
                  </th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  {ansFields.map((f) => (
                    <th
                      key={f.id}
                      className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                    >
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {form.submissions.map((s) => {
                  const data = s.data as Record<string, string>;
                  return (
                    <tr key={s.id} className="hover:bg-elevated/40">
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap sticky left-0 bg-card">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-fg whitespace-nowrap">
                        {s.email ?? "—"}
                      </td>
                      {ansFields.map((f) => (
                        <td
                          key={f.id}
                          className="px-4 py-3 text-fg max-w-[280px] truncate"
                          title={data[f.id] ?? ""}
                        >
                          {data[f.id] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
