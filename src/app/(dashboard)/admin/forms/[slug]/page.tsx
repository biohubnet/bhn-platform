import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { answerFields, type FormField } from "@/lib/forms/types";
import { FormReseedButton } from "@/components/admin/FormReseedButton";
import {
  TalentReviewActions,
  type TalentReviewStatus,
} from "@/components/admin/TalentReviewActions";
import { DemoSeedAndClearTray } from "@/components/admin/DemoSeedAndClearTray";

/** Per-form column profile — which 1–2 answer-field IDs to surface
 *  inline on the compact list view, beyond the always-shown Trainee
 *  + Status + Actions. Each row's remaining fields are accessible
 *  via the per-submission detail page. */
const SUMMARY_FIELDS_BY_SLUG: Record<string, string[]> = {
  "obio-bootcamp": ["company_name", "current_role"],
  "talent-application": ["status_goal"],
};

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

  // Review-state surface is now on for EVERY form, not just talent-
  // application. OBIO bootcamp + future forms get the same approve/
  // reject inline actions; admins choose to use them or treat the
  // status as informational depending on the workflow.
  const isTalentApp = slug === "talent-application";
  const pendingCount = form.submissions.filter((s) => s.reviewStatus === "pending").length;

  // Pull the per-slug "summary field" IDs (the 1–2 answer fields to
  // surface inline). The rest live on the detail page. `flatMap`
  // avoids the type-predicate pitfall — `ansFields.find(...)`
  // returns `AnswerField | undefined`, which is narrower than the
  // wider `FormField` union; predicate-typing it back to `FormField`
  // is illegal.
  const summaryFieldIds = SUMMARY_FIELDS_BY_SLUG[slug] ?? [];
  const summaryFields = summaryFieldIds.flatMap((id) => {
    const f = ansFields.find((af) => af.id === id);
    return f ? [f] : [];
  });

  return (
    <div>
      <PageHero
        eyebrow={<><FileText size={11} /> Admin · Form submissions</>}
        title={form.title}
        description={(
          <>
            {form._count.submissions}{" "}
            {form._count.submissions === 1 ? "submission" : "submissions"}
            {form._count.submissions > 200 && " — showing latest 200"}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-100 text-amber-800 ring-amber-200">
                {pendingCount} pending review
              </span>
            )}
          </>
        )}
      />
      <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/forms/${slug}`}
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Back to form
          </Link>
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
          <DemoSeedAndClearTray
            entity="form_submission"
            scope={{ formSlug: slug }}
            noun="demo submissions"
            clearHelp={`Delete every "${slug}" submission from demo accounts. The users themselves stay (reusable for other tests). Real applicants and phantoms are not touched.`}
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
        // Compact list — was a 15+ column scroll-monster (one column
        // per answer field). Now five columns max: Submitted ·
        // Trainee · 1–2 summary fields (per-slug) · Status / Actions ·
        // View. Full per-submission detail lives on the new detail
        // page at /admin/forms/[slug]/submissions/[sid].
        <div className="bg-card border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated/60 border-b border-line">
              <tr className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider">
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3">Trainee</th>
                {summaryFields.map((f) => (
                  <th key={f.id} className="px-5 py-3 max-w-[180px]">{f.label}</th>
                ))}
                <th className="px-5 py-3 whitespace-nowrap">Status / Actions</th>
                <th className="px-5 py-3 w-px" />
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
                // Trainee display — prefer the form's `name` field
                // when present (OBIO has one), else the user's email.
                const traineeName = String(data.name ?? "").trim();
                return (
                  <tr key={s.id} className="hover:bg-elevated/40 align-top">
                    <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">
                      {dt.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}
                      <span className="block text-[10px] text-subtle">
                        {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-fg">{traineeName || "—"}</p>
                      <p className="text-xs text-subtle truncate max-w-[220px]" title={s.email ?? ""}>
                        {s.email ?? "—"}
                      </p>
                    </td>
                    {summaryFields.map((f) => {
                      const txt = cellText(f.id);
                      return (
                        <td
                          key={f.id}
                          className="px-5 py-3 text-xs text-fg max-w-[200px]"
                          title={txt || ""}
                        >
                          <span className="line-clamp-2 leading-snug">{txt || "—"}</span>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <TalentReviewActions
                        slug={slug}
                        submission={{
                          id: s.id,
                          reviewStatus: s.reviewStatus as TalentReviewStatus,
                        }}
                      />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Link
                        href={`/admin/forms/${slug}/submissions/${s.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1"
                      >
                        View <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
