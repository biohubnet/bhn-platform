import { requireRole } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Mail, Phone, MapPin, Building2, User as UserIcon, Coins, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreditApplicationReview } from "@/components/admin/CreditApplicationReview";
import {
  SupportingDocuments,
  type DocEntry,
} from "@/components/admin/SupportingDocuments";

export default async function AdminCreditApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");
  const { id } = await params;

  const app = await prisma.creditApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, credits: true, createdAt: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!app) notFound();

  const docs = (app.documents as unknown as DocEntry[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link
        href="/admin/credit-applications"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Back to applications
      </Link>

      <PageHeader
        title={app.fullName}
        description={`Application submitted ${new Date(app.submittedAt).toLocaleString()}`}
        actions={
          app.status === "pending"  ? <Badge tone="amber">Pending</Badge> :
          app.status === "approved" ? <Badge tone="success">Approved · +{(app.approvedAmount ?? 0).toLocaleString()} credits</Badge> :
                                       <Badge tone="danger">Rejected</Badge>
        }
      />

      {/* Applicant context */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-3">Applicant</h3>
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <Detail icon={UserIcon} label="Account">{app.user.name ?? "—"}</Detail>
          <Detail icon={Mail} label="Email">{app.user.email}</Detail>
          <Detail icon={Coins} label="Current balance">{app.user.credits.toLocaleString()} credits</Detail>
          <Detail icon={Calendar} label="Joined">{new Date(app.user.createdAt).toLocaleDateString()}</Detail>
          {app.organization && <Detail icon={Building2} label="Organization">{app.organization}</Detail>}
          {app.title && <Detail icon={UserIcon} label="Role/title">{app.title}</Detail>}
          {app.country && <Detail icon={MapPin} label="Country">{app.country}</Detail>}
          {app.phone && <Detail icon={Phone} label="Phone">{app.phone}</Detail>}
        </div>
      </Card>

      {/* Learning goals */}
      <Card className="p-5">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Learning goals</h3>
        <p className="text-sm text-fg leading-relaxed whitespace-pre-line">{app.useCase}</p>
      </Card>

      {/* Documents — collapsible card with inline letter-sized
          preview when expanded. The whole card is the toggle target
          so the reviewer doesn't hunt for a chevron. */}
      <SupportingDocuments applicationId={app.id} docs={docs} />

      {/* Review action OR past decision */}
      {app.status === "pending" && (
        <CreditApplicationReview applicationId={app.id} status={app.status} requestedAmount={app.requestedAmount} />
      )}
      {app.status === "rejected" && (
        <>
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Previous decision</h3>
            <p className="text-sm text-fg">
              <span className="font-medium">Rejected</span>
              {app.reviewer?.name ? ` by ${app.reviewer.name}` : ""}
              {app.reviewedAt ? ` on ${new Date(app.reviewedAt).toLocaleString()}.` : "."}
            </p>
            {app.reviewerNote && (
              <p className="mt-3 text-sm text-muted leading-relaxed bg-elevated rounded-lg p-3 whitespace-pre-line">
                {app.reviewerNote}
              </p>
            )}
          </Card>
          <CreditApplicationReview applicationId={app.id} status={app.status} requestedAmount={app.requestedAmount} />
        </>
      )}
      {app.status === "approved" && (
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider mb-2">Decision</h3>
          <p className="text-sm text-fg">
            <span className="font-medium">Approved</span>
            {app.reviewer?.name ? ` by ${app.reviewer.name}` : ""}
            {app.reviewedAt ? ` on ${new Date(app.reviewedAt).toLocaleString()}.` : "."}
          </p>
          {app.reviewerNote && (
            <p className="mt-3 text-sm text-muted leading-relaxed bg-elevated rounded-lg p-3 whitespace-pre-line">
              {app.reviewerNote}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={13} className="text-subtle shrink-0" />
      <span className="text-xs text-subtle">{label}:</span>
      <span className="text-fg truncate">{children}</span>
    </div>
  );
}
