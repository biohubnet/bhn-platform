/**
 * /equip/apply/new — eligibility wizard.
 *
 * Three questions, auto-routes to the right stream, creates a
 * draft via POST /api/equip/applications, then forwards to the
 * stream-specific form at /equip/apply/[id].
 *
 * Server component just renders the page chrome; the wizard
 * itself is the client component below.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Rocket } from "lucide-react";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { EligibilityWizard } from "@/components/equip/EligibilityWizard";

export const dynamic = "force-dynamic";

export default async function EquipNewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ stream?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  const presetStream = params.stream === "venture_connect" || params.stream === "venture_lift"
    ? params.stream
    : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader
        eyebrow="Equip · 3-question wizard"
        title="Find your fit"
        icon={<Rocket size={22} className="text-brand-600" />}
        description="60 seconds. We'll route you to the right stream and pre-fill everything we already know about you."
      />
      <EligibilityWizard presetStream={presetStream} />
    </div>
  );
}
