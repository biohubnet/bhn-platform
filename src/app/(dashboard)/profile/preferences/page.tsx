/**
 * /profile/preferences — the sidebar / feature switchboard.
 *
 * Per-user, never affects anyone else. Pulls the registry +
 * current prefs server-side and hands them to the client component
 * which owns toggles, group toggles, presets, and drag-drop
 * reordering.
 *
 * Registry lives at src/lib/preferences/registry.ts. Every new
 * sidebar item must register there to be toggleable here.
 */
import { redirect } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { parsePrefs } from "@/lib/preferences/active";
import { PreferencesSwitchboard } from "@/components/profile/PreferencesSwitchboard";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile/preferences");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { featurePrefs: true },
  });
  const initialPrefs = parsePrefs(user?.featurePrefs);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><SlidersHorizontal size={11} /> Profile · Preferences</>}
        title="Your switchboard"
        description="Pick which features show up in your sidebar. Only affects YOUR view — other users see what they have configured. Reorder within a group by dragging the handle. Group toggles flip every feature in a section at once."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <PreferencesSwitchboard initialPrefs={initialPrefs} />
      </div>
    </div>
  );
}
