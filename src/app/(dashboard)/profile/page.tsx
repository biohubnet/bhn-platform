import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileClient } from "@/components/lms/ProfileClient";
import { AssistConsentPanel } from "@/components/assist/AssistConsentPanel";
import { parsePrefs } from "@/lib/preferences/active";
import { PreferencesSwitchboard } from "@/components/profile/PreferencesSwitchboard";
import { ASSIST_ENABLED } from "@/lib/assist/flags";

export default async function ProfilePage() {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");
  const userId = (session.user as { id?: string }).id!;

  const [user, latestRoleRequest, prefsRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, credits: true,
        phone: true, bio: true, organization: true, jobTitle: true, country: true,
        newsletterSubscribed: true, createdAt: true, lastLoginAt: true,
      },
    }),
    prisma.roleChangeRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    // Pull featurePrefs in the same fan-out so the Feature switcher
    // board below can render server-side without a second round-trip.
    prisma.user.findUnique({
      where: { id: userId },
      select: { featurePrefs: true },
    }),
  ]);

  if (!user) redirect("/login");
  const initialPrefs = parsePrefs(prefsRow?.featurePrefs);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="My profile"
        description="Update your information, change your password, or request a role change."
      />
      <ProfileClient user={user} latestRoleRequest={latestRoleRequest} />
      {ASSIST_ENABLED && <AssistConsentPanel />}

      {/* Feature switcher board — was a standalone page at
          /profile/preferences; lifted onto the main profile page
          per request so all per-user settings live in one place.
          The standalone route still works (deep links don't 404)
          but this is now the canonical home. */}
      <section className="rounded-2xl border border-line bg-card-solid p-5 mt-6">
        <header className="flex items-start gap-2.5 mb-4">
          <span className="inline-flex w-9 h-9 rounded-xl bg-brand-50 text-brand-700 items-center justify-center ring-1 ring-inset ring-brand-200">
            <SlidersHorizontal size={16} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-fg leading-tight">Feature switcher board</h2>
            <p className="text-xs text-fg-muted mt-0.5 max-w-prose">
              Pick which features show up in your sidebar. Only affects YOUR view — other users see what they have configured. Reorder within a group by dragging the handle; group toggles flip every feature in a section at once.
            </p>
          </div>
        </header>
        <PreferencesSwitchboard initialPrefs={initialPrefs} />
      </section>
    </div>
  );
}
