/**
 * /equip/apply/[id] — draft editor (or read-only viewer once
 * submitted).
 *
 * Routes by stream: VentureConnect → ConnectForm, VentureLift →
 * LiftForm (Phase B). Anything submitted lands on the read-only
 * SubmittedView with the comment thread.
 *
 * Identity pre-fill: server reads the user's profile fields and
 * passes them to the client form so day-1 friction is zero.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ConnectForm } from "@/components/equip/ConnectForm";
import { SubmittedView } from "@/components/equip/SubmittedView";
import { LiftForm } from "@/components/equip/LiftForm";
import type { VentureConnectFormData, VentureLiftFormData, EquipDocument } from "@/lib/equip/types";

export const dynamic = "force-dynamic";

export default async function EquipApplicationDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const app = await prisma.equipApplication.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, name: true, email: true,
          organization: true, jobTitle: true, country: true, phone: true,
        },
      },
    },
  });
  if (!app || app.userId !== userId) redirect("/equip");

  // Once submitted, the surface flips to read-only with the
  // comment thread surfaced.
  if (app.status !== "draft") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link
          href="/equip/my-applications"
          className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> My applications
        </Link>
        <SubmittedView application={{ ...(JSON.parse(JSON.stringify(app))), userId }} />
      </div>
    );
  }

  // Editable — render the stream-specific form.
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        href="/equip"
        className="text-xs text-muted hover:text-fg inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} /> Equip
      </Link>

      {app.stream === "venture_connect" ? (
        <ConnectForm
          applicationId={app.id}
          initial={(app.formData as VentureConnectFormData) ?? {}}
          profile={{
            name: app.user.name ?? "",
            email: app.user.email,
            organization: app.user.organization ?? null,
            jobTitle: app.user.jobTitle ?? null,
            country: app.user.country ?? null,
            phone: app.user.phone ?? null,
          }}
        />
      ) : (
        <LiftForm
          applicationId={app.id}
          initial={(app.formData as VentureLiftFormData) ?? {}}
          initialDocuments={(app.documents as unknown as EquipDocument[]) ?? []}
          profile={{
            name: app.user.name ?? "",
            email: app.user.email,
            organization: app.user.organization ?? null,
            jobTitle: app.user.jobTitle ?? null,
            country: app.user.country ?? null,
            phone: app.user.phone ?? null,
          }}
        />
      )}
    </div>
  );
}
