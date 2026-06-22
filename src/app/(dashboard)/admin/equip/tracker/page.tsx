/**
 * /admin/equip/tracker — EQUIP Recipient Tracker.
 *
 * A post-award intelligence dossier: every company funded by a VentureConnect
 * or VentureLift grant, tracked across LinkedIn and the open web, with fresh
 * raises / awards / partnerships flagged and linked to source.
 *
 * The dossier is a fully self-contained HTML artifact (its own dark theme,
 * fonts, filtering + search JS). Rather than re-implement it in the platform's
 * design system — which would fight its styling — we render it verbatim inside
 * an isolated <iframe srcDoc>. The HTML is bundled as a JSON string (so the
 * file's own backticks/`${}` don't collide with a TS template literal) and
 * imported at build time, so nothing is served as a public static file: the
 * page is admin-gated and the markup ships inside the server component.
 *
 * To refresh the data: regenerate EQUIP_Tracker.html (the "copy rescan prompt"
 * button in the dossier has the exact prompt) and re-bundle it into
 * tracker.json.
 */
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import tracker from "./tracker.json";

export const dynamic = "force-dynamic";

export default async function EquipRecipientTrackerPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={<><Radar size={11} /> Admin · EQUIP</>}
        title="Recipient tracker"
        description="Every company funded by a VentureConnect or VentureLift grant — tracked across LinkedIn and the open web. Flagged entries mark a fresh raise, award, partnership or milestone, each linked to its source."
      />
      <div className="overflow-hidden rounded-2xl border border-line bg-[#0d1014] shadow-elevated">
        <iframe
          title="EQUIP Recipient Dossier"
          srcDoc={tracker.html}
          className="block w-full"
          style={{ height: "calc(100dvh - 200px)", minHeight: 640, border: 0 }}
        />
      </div>
    </div>
  );
}
