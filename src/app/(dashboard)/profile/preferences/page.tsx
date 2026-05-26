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
import { SlidersHorizontal, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { parsePrefs, isPlatformStaffRole } from "@/lib/preferences/active";
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
  // Real role (not the impersonated one) — used to decide whether to
  // show the staff-bypass note. Staff (admin + superadmin) always see
  // every sidebar item their role allows, regardless of what they
  // toggle here. The switchboard is still useful to them for testing
  // what a trainee would experience, so we don't hide it — we just
  // explain that toggles here won't change THEIR own sidebar.
  const realRole =
    (session.user as { realRole?: string }).realRole ??
    (session.user as { role?: string }).role ??
    null;
  const isStaffViewer = isPlatformStaffRole(realRole);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><SlidersHorizontal size={11} /> Profile · Preferences</>}
        title="Your switchboard"
        description="Pick which features show up in your sidebar. Only affects YOUR view — other users see what they have configured. Reorder within a group by dragging the handle. Group toggles flip every feature in a section at once."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        {isStaffViewer && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/30 px-4 py-3 text-[12.5px] text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldCheck size={15} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
            <div>
              <p className="font-semibold mb-0.5">Heads up — you&apos;re signed in as staff.</p>
              <p className="leading-relaxed">
                Admin and superadmin accounts always see every sidebar item their role allows, so toggles here <strong>don&apos;t hide menu items from your own navigation</strong>. They&apos;re still saved (and useful for testing what a trainee with these prefs would experience), but you&apos;ll keep seeing the full platform.
              </p>
            </div>
          </div>
        )}
        <PreferencesSwitchboard initialPrefs={initialPrefs} />
      </div>
    </div>
  );
}
