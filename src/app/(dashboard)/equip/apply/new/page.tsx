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
import { prisma } from "@/lib/prisma";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { EligibilityWizard } from "@/components/equip/EligibilityWizard";
import { INSTITUTIONS } from "@/lib/equip/institutions";

export const dynamic = "force-dynamic";

export default async function EquipNewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ stream?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  const params = await searchParams;
  const presetStream = params.stream === "venture_connect" || params.stream === "venture_lift"
    ? params.stream
    : undefined;

  // Pre-fill the wizard's "Where are you affiliated?" step from
  // the user's registered institution. We try a direct name match
  // against the 14 BHN-partner list; if it matches we hand back
  // the slug, otherwise we hand back "other" (with the free-text
  // ready to display). Users who registered before the institution
  // field shipped just see the wizard's blank state.
  let presetInstitution: string | undefined;
  let presetInstitutionOther: string | undefined;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization: true },
    });
    const org = user?.organization?.trim();
    if (org) {
      const match = INSTITUTIONS.find((i) => i.name === org);
      if (match) {
        presetInstitution = match.slug;
      } else {
        presetInstitution = "other";
        presetInstitutionOther = org;
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <DSPageHeader
        eyebrow="Equip · 3-question wizard"
        title="Find your fit"
        description="60 seconds. We'll route you to the right stream and pre-fill everything we already know about you."
      />
      <EligibilityWizard
        presetStream={presetStream}
        presetInstitution={presetInstitution}
        presetInstitutionOther={presetInstitutionOther}
      />
    </div>
  );
}
