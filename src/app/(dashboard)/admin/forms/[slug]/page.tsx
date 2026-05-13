import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, ArrowLeft, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { answerFields, type FormField } from "@/lib/forms/types";
import { FormReseedButton } from "@/components/admin/FormReseedButton";
import {
  TalentReviewActions,
  type TalentReviewStatus,
} from "@/components/admin/TalentReviewActions";
import { ClearTestDataButton } from "@/components/admin/ClearTestDataButton";

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

  // Talent-application is the one form that gates submissions
  // behind admin review before they appear in the talent pool /
  // searchable directory. Other slugs (OBIO bootcamp, etc.) treat
  // every submission as immediately complete — we hide the review
  // column for them.
  const isTalentApp = slug === "talent-application";
  const pendingCount = isTalentApp
    ? form.submissions.filter((s) => s.reviewStatus === "pending").length
    : 0;

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
            {isTalentApp && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-200">
                {pendingCount} pending review
              </span>
            )}
          </p>
          {isTalentApp && (
            <p className="text-xs text-muted mt-1.5 leading-snug max-w-2xl">
              New submissions are <strong>pending</strong> until an admin
              reviews them — only approved entries appear in the talent pool.
              Use <em>Skip approval</em> for fast-track admits you're already
              confident about; it's audit-logged separately so you can find
              them later.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ClearTestDataButton
            entity="form_submission"
            scope={{ formSlug: slug }}
            label="Clear demo + sandbox submissions"
            helpText={`Delete every "${slug}" submission from demo or sandbox accounts. The users themselves stay (reusable for other tests). Real applicants and phantoms are not touched.`}
          />
          <FormReseedButton slug={slug} />
          <a
            href={`/api/forms/${slug}/export.csv`}
            className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-2 font-medium shadow-sm shadow-brand-600/25"
          >
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {form.submissions.length === 0 ? (
        <div className="bg-card border border-line rounded-2xl p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-elevated text-muted flex items-center justify-center mb-3">
            <FileText size={20} />
          </div>
          <p className="font-medium text-muted">No submissions yet.</p>
        </div>
      ) : (
        // Break out of the dashboard layout's max-w-7xl so the table
        // gets viewport-edge width on big screens. Negative margin equal
        // to the layout's px-6, plus a viewport-relative pull on lg+.
        <div className="-mx-6 lg:-ml-[calc((100vw-min(100vw-22rem,76rem))/2)] lg:-mr-[calc((100vw-min(100vw-22rem,76rem))/2)]">
          <div className="bg-card border-y lg:border lg:rounded-2xl border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs table-auto">
                <thead className="bg-elevated/60 border-b border-line">
                  <tr>
                    <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-2 sticky left-0 bg-elevated/95 backdrop-blur-sm">
                      Submitted
                    </th>
                    <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-2 whitespace-nowrap">
                      Email
                    </th>
                    {isTalentApp && (
                      <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-2 whitespace-nowrap">
                        Review
                      </th>
                    )}
                    {ansFields.map((f) => (
                      <th
                        key={f.id}
                        className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-2 py-2 align-top"
                      >
                        <span className="block break-words leading-tight max-w-[140px]">{f.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {form.submissions.map((s) => {
                    const data = s.data as Record<string, string | string[]>;
                    const dt = new Date(s.createdAt);
                    const cellText = (id: string) => {
                      const v = data[id];
                      if (Array.isArray(v)) return v.join(", ");
                      return v ?? "";
                    };
                    return (
                      <tr key={s.id} className="hover:bg-elevated/40 align-top">
                        <td className="px-2 py-1.5 text-[11px] text-muted whitespace-nowrap sticky left-0 bg-card group-hover:bg-elevated/40">
                          {dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                          {" "}
                          <span className="text-subtle">{dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-fg whitespace-nowrap max-w-[160px] truncate" title={s.email ?? ""}>
                          {s.email ?? "—"}
                        </td>
                        {isTalentApp && (
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <TalentReviewActions
                              slug={slug}
                              submission={{
                                id: s.id,
                                reviewStatus: s.reviewStatus as TalentReviewStatus,
                              }}
                            />
                          </td>
                        )}
                        {ansFields.map((f) => {
                          const txt = cellText(f.id);
                          const isUrl = typeof txt === "string" && /^https?:\/\//.test(txt);
                          return (
                            <td
                              key={f.id}
                              className="px-2 py-1.5 text-[11px] text-fg max-w-[160px] truncate"
                              title={txt || ""}
                            >
                              {!txt ? (
                                "—"
                              ) : isUrl ? (
                                <a
                                  href={txt}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-brand-700 hover:underline"
                                >
                                  {txt.split("/").pop()?.replace(/^\d+_/, "") || txt}
                                </a>
                              ) : (
                                txt
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
