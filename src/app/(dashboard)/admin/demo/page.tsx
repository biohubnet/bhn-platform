import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Drama } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { DemoHub } from "@/components/admin/DemoHub";

export const dynamic = "force-dynamic";

/**
 * /admin/demo — the Platform Demo Hub.
 *
 * An interactive, senior-management-ready walkthrough of the BHN platform
 * through three dinosaur personas: Rex (Trainee), Vera (Employer), Max (Admin).
 * Each persona navigates all three pillars: ENGAGE · EXPERIENCE · EQUIP.
 *
 * Designed for:
 *   • Investor briefings and board presentations
 *   • New staff orientation and onboarding
 *   • Sales calls with prospective employer partners
 *   • Internal product reviews
 */
export default async function DemoPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div>
      <PageHero
        eyebrow={<><Drama size={11} /> Admin · Platform</>}
        title="Platform Demo Hub"
        description={
          <>
            A guided, interactive walkthrough of the BHN platform through three
            lenses — <strong>Rex</strong> the trainee, <strong>Vera</strong> the
            employer, and <strong>Max</strong> the admin — across all three
            pillars: <strong>ENGAGE</strong> (learning &amp; certification),{" "}
            <strong>EXPERIENCE</strong> (placements &amp; hiring), and{" "}
            <strong>EQUIP</strong> (funding &amp; ventures). Built for investor
            briefings, board presentations, and new-staff orientation.
          </>
        }
      />
      <DemoHub />
    </div>
  );
}
