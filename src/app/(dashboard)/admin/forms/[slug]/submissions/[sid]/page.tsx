/**
 * /admin/forms/[slug]/submissions/[sid] — per-submission detail.
 *
 * The form list at /admin/forms/[slug] is now a compact 5-column
 * table (Submitted · Trainee · 1–2 summary fields · Status/Actions
 * · View →). Everything else — every other field the trainee
 * filled in, plus the audit metadata — lives here.
 *
 * Renders the answer fields as a clean key/value list grouped by
 * section, with the same TalentReviewActions component pinned to
 * the header for quick approve/reject without leaving the page.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  answerFields,
  isSectionField,
  type FormField,
} from "@/lib/forms/types";
import {
  TalentReviewActions,
  type TalentReviewStatus,
} from "@/components/admin/TalentReviewActions";

export default async function AdminFormSubmissionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; sid: string }>;
}) {
  await requireRole("admin");
  const { slug, sid } = await params;

  const submission = await prisma.eventFormSubmission.findUnique({
    where: { id: sid },
    include: {
      form: {
        select: {
          id: true,
          slug: true,
          title: true,
          fields: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          organization: true,
          jobTitle: true,
        },
      },
    },
  });
  if (!submission || submission.form.slug !== slug) notFound();

  const fields = submission.form.fields as unknown as FormField[];
  const ansFields = answerFields(fields);
  const data = submission.data as Record<string, string | string[]>;

  // Group answers by section so the detail page mirrors how the
  // trainee saw the form (e.g. "Personal Information", "Company
  // Information", "Catering & Accessibility" on OBIO bootcamp).
  type Group = { title: string | null; fields: FormField[] };
  const groups: Group[] = [];
  let current: Group = { title: null, fields: [] };
  for (const f of fields) {
    if (isSectionField(f)) {
      if (current.fields.length > 0) groups.push(current);
      current = { title: f.label, fields: [] };
    } else if (ansFields.includes(f)) {
      current.fields.push(f);
    }
  }
  if (current.fields.length > 0) groups.push(current);

  const statusTone = (() => {
    switch (submission.reviewStatus) {
      case "approved":
      case "approved_skip_review":
        return "success" as const;
      case "rejected":
        return "danger" as const;
      default:
        return "warning" as const;
    }
  })();

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/forms/${slug}`}
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Back to all {submission.form.title} submissions
      </Link>

      <PageHeader
        title={submission.user?.name ?? (String(data.name ?? "").trim() || "Anonymous submission")}
        description={(
          <>
            <span className="font-medium text-fg">{submission.form.title}</span>
            {" · "}
            Submitted {new Date(submission.createdAt).toLocaleString()}
            {submission.email && <> · {submission.email}</>}
          </>
        )}
      />

      {/* Review actions strip — pinned at the top so the admin can
          decide before scrolling through the answers, OR after. */}
      <Card className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-subtle">Review status</span>
          <Badge tone={statusTone}>{submission.reviewStatus.replace(/_/g, " ")}</Badge>
          {submission.reviewedAt && (
            <span className="text-xs text-muted">
              · decided {new Date(submission.reviewedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <TalentReviewActions
          slug={slug}
          submission={{
            id: submission.id,
            reviewStatus: submission.reviewStatus as TalentReviewStatus,
          }}
        />
      </Card>
      {submission.reviewerNote && (
        <Card className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-subtle">Reviewer note</p>
          <p className="text-sm text-fg mt-1.5 leading-relaxed whitespace-pre-wrap">
            {submission.reviewerNote}
          </p>
        </Card>
      )}

      {/* Applicant metadata pulled from the User row — only shows when
          the submission was signed in. */}
      {submission.user && (
        <Card className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-subtle">Account</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <DetailRow label="Name" value={submission.user.name} />
            <DetailRow label="Email" value={submission.user.email} />
            <DetailRow label="Job title" value={submission.user.jobTitle} />
            <DetailRow label="Organization" value={submission.user.organization} />
          </div>
        </Card>
      )}

      {/* Full answers — grouped by section, rendered as a clean
          key/value list. Long values wrap; URLs link out; checkbox
          arrays render as comma-joined. */}
      {groups.map((group, idx) => (
        <Card key={idx} className="overflow-hidden">
          {group.title && (
            <div className="px-5 py-3 border-b border-line bg-elevated/40">
              <h2 className="text-sm font-semibold text-fg">{group.title}</h2>
            </div>
          )}
          <dl className="divide-y divide-line">
            {group.fields.map((f) => {
              const raw = data[f.id];
              const value =
                Array.isArray(raw) ? raw.join(", ") :
                typeof raw === "string" ? raw : "";
              const isUrl = /^https?:\/\//.test(value);
              return (
                <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 px-5 py-3">
                  <dt className="text-xs font-semibold text-subtle uppercase tracking-wide">
                    {f.label}
                  </dt>
                  <dd className="text-sm text-fg whitespace-pre-wrap break-words mt-1 sm:mt-0">
                    {!value ? (
                      <span className="text-subtle">—</span>
                    ) : isUrl ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand-700 hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-subtle">{label}</p>
      <p className="text-sm text-fg mt-0.5">{value || <span className="text-subtle">—</span>}</p>
    </div>
  );
}
