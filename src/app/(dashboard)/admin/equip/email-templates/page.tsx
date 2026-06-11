/**
 * Admin → EQUIP → Email templates. Read-only gallery of every applicant
 * email across the application lifecycle, rendered for both streams with
 * realistic sample data. Lets reviewers see exactly what applicants receive
 * at each step.
 */
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { requireCommitteeOrAdmin } from "@/lib/committees/membership";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { EquipEmailGallery, type StreamPreview } from "@/components/admin/equip/EquipEmailGallery";
import {
  EQUIP_EMAIL_TEMPLATES,
  sampleEquipCtx,
} from "@/lib/equip/emails";
import { STREAM_META, type EquipStream } from "@/lib/equip/types";

export const dynamic = "force-dynamic";

const STREAMS: EquipStream[] = ["venture_connect", "venture_lift"];

export default async function EquipEmailTemplatesPage() {
  const session = await requireCommitteeOrAdmin(["equip_review"], ["equip_grant_reviewer"]).catch(() => null);
  if (!session) redirect("/dashboard");

  const streams: StreamPreview[] = STREAMS.map((stream) => {
    const ctx = sampleEquipCtx(stream);
    const items = EQUIP_EMAIL_TEMPLATES.filter(
      (t) => t.appliesTo === "both" || t.appliesTo === stream,
    ).map((t) => {
      const built = t.build(ctx);
      return { id: t.id, label: t.label, when: t.when, subject: built.subject, html: built.html };
    });
    return { key: stream, name: STREAM_META[stream].name, items };
  });

  return (
    <div className="space-y-6">
      <DSPageHeader
        eyebrow={<><Mail size={11} /> Admin · EQUIP</>}
        title="Email templates"
        description="Every email an applicant receives across the EQUIP lifecycle, for both VentureConnect and VentureLift. Previews use sample data; the live emails fill in each applicant's real name, amounts, and your reviewer notes. Decision emails send automatically when you record a decision."
      />
      <EquipEmailGallery streams={streams} />
    </div>
  );
}
