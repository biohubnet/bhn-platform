/**
 * /admin/equip/[id] — reviewer decision surface.
 *
 * Server component renders the application data; the decision
 * actions (claim / approve / reject / fund) live in the client
 * ReviewActions component below.
 */
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, FileText, User as UserIcon, MapPin, Briefcase, Mail } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { DSSection } from "@/components/design-system/DSSection";
import { ReviewActions } from "@/components/admin/equip/ReviewActions";
import { TriageSummary } from "@/components/admin/equip/TriageSummary";
import { MessageThread } from "@/components/equip/MessageThread";
import { MilestoneTracker } from "@/components/equip/MilestoneTracker";
import type { EquipMilestone } from "@/lib/equip/types";
import {
  STREAM_META, STATUS_META,
  type EquipStatus, type EquipStream, type VentureConnectFormData,
} from "@/lib/equip/types";
import { institutionLabel } from "@/lib/equip/institutions";

export const dynamic = "force-dynamic";

export default async function AdminEquipReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const reviewerUserId = (session.user as { id?: string })?.id ?? "";
  const { id } = await params;

  const app = await prisma.equipApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, organization: true, jobTitle: true, country: true, phone: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });
  if (!app) notFound();

  const stream = STREAM_META[app.stream as EquipStream];
  const status = STATUS_META[app.status as EquipStatus];
  const formData = (app.formData as VentureConnectFormData) ?? {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/admin/equip" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Review queue
      </Link>

      <DSPageHeader
        eyebrow={`${stream.name} · ${status.label.toLowerCase()}`}
        title={`Review: ${app.user.name ?? app.user.email}`}
        icon={<FileText size={22} className="text-brand-600" />}
        description={
          <>
            Submitted {app.submittedAt ? new Date(app.submittedAt).toLocaleString() : "—"}.
            {" "}Requested {app.requestedAmount ? `$${app.requestedAmount.toLocaleString()}` : "—"}.
            {app.approvedAmount ? ` Approved $${app.approvedAmount.toLocaleString()}.` : ""}
          </>
        }
      />

      <ReviewActions
        applicationId={app.id}
        currentStatus={app.status as EquipStatus}
        requestedAmount={app.requestedAmount}
        approvedAmount={app.approvedAmount}
      />

      {app.status !== "draft" && <TriageSummary applicationId={app.id} />}

      <DSSection eyebrow="Applicant" title="Who's applying" icon={<UserIcon size={14} className="text-brand-600" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ApplicantField icon={UserIcon} label="Name" value={app.user.name ?? "—"} />
          <ApplicantField icon={Mail}     label="Email" value={app.user.email} />
          <ApplicantField icon={Briefcase} label="Title / role" value={app.user.jobTitle ?? "—"} />
          <ApplicantField icon={MapPin}   label="Institution" value={institutionLabel(app.institution, app.institutionOther)} />
        </div>
        <p className="text-[11px] text-subtle mt-3">
          Applicant type: <span className="font-bold text-fg">{app.applicantType ?? "—"}</span> ·
          {" "}Commercialization stage: <span className="font-bold text-fg">{app.commercializationStage ?? "—"}</span>
        </p>
      </DSSection>

      {app.stream === "venture_connect" && (
        <DSSection eyebrow="Submission body" title="The application" icon={<FileText size={14} className="text-brand-600" />}>
          <Field label="Company">{formData.companyName ?? "—"}</Field>
          {formData.companyWebsite && (
            <Field label="Website">
              <a href={formData.companyWebsite} target="_blank" rel="noreferrer" className="text-brand-700 underline">{formData.companyWebsite}</a>
            </Field>
          )}
          <FieldBlock label="Venture description">{formData.ventureDescription ?? "—"}</FieldBlock>
          <FieldBlock label="Funding request justification">{formData.fundingJustification ?? "—"}</FieldBlock>
          <div className="rounded-xl border border-line bg-elevated/40 p-3 mt-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-subtle mb-2">Budget breakdown</p>
            <ul className="space-y-1 text-xs">
              <BudgetLine label="Airfare"                                   amount={formData.budgetAirfare} />
              <BudgetLine label="Train Fare"                                amount={formData.budgetTrainFare} />
              <BudgetLine label="Rideshare / Taxi"                          amount={formData.budgetRideshareTaxi} />
              <BudgetLine label="Accommodation"                             amount={formData.budgetAccommodation} />
              <BudgetLine label="Conference / Workshop / Pitch Registration" amount={formData.budgetRegistration} />
            </ul>
            <p className="text-sm font-bold text-fg tabular-nums mt-2">
              Total: ${((formData.budgetAirfare ?? 0) + (formData.budgetTrainFare ?? 0) + (formData.budgetRideshareTaxi ?? 0) + (formData.budgetAccommodation ?? 0) + (formData.budgetRegistration ?? 0)).toLocaleString()} CAD
            </p>
          </div>
        </DSSection>
      )}

      {app.reviewerNote && (
        <DSSection eyebrow="Decision context" title="Reviewer note" icon={<FileText size={14} className="text-brand-600" />}>
          <p className="text-sm text-fg leading-relaxed">{app.reviewerNote}</p>
        </DSSection>
      )}

      {app.status === "funded" && (app.milestones as unknown as EquipMilestone[])?.length > 0 && (
        <MilestoneTracker
          applicationId={app.id}
          initial={app.milestones as unknown as EquipMilestone[]}
          canEdit
        />
      )}

      {app.status !== "draft" && (
        <MessageThread applicationId={app.id} currentUserId={reviewerUserId} />
      )}
    </div>
  );
}

function ApplicantField({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-subtle inline-flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </p>
      <p className="text-sm text-fg mt-1">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[10px] uppercase tracking-wider font-bold text-subtle min-w-[100px] shrink-0">{label}</span>
      <span className="text-sm text-fg">{children}</span>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-subtle mb-1">{label}</p>
      <p className="text-sm text-fg leading-relaxed">{children}</p>
    </div>
  );
}

function BudgetLine({ label, amount }: { label: string; amount: number | undefined }) {
  if (!amount) return null;
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono tabular-nums text-fg">${amount.toLocaleString()}</span>
    </li>
  );
}
