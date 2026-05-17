/**
 * Server component that renders the platform-level notices that
 * apply to ANY page (impersonation, demo expiry, unverified email,
 * AutoPipette first-run). Rendered IMMEDIATELY AFTER the hero by
 * `<PageHero>` so it satisfies the platform rule:
 *
 *   The editorial hero (DSPageHeader) is the absolute top of every
 *   page. No popup notice, banner, or anything else may render above
 *   it. Per-page notices live below the hero; this component owns the
 *   universal-to-the-dashboard ones.
 *
 * Before this lived inline at the top of `<main>` in the dashboard
 * layout — which is why every page had banners ABOVE the hero. Moving
 * the rendering into the PageHero forwarder makes the placement
 * systematic across every surface that uses PageHero (which after the
 * design-system pass is almost every dashboard page).
 *
 * Pages that don't use PageHero won't see these banners — that's the
 * intentional trade-off. Such pages are rare (auth, special split
 * surfaces) and can include `<LayoutBanners />` manually if needed.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { DemoBanner } from "@/components/admin/DemoBanner";
import { UnverifiedEmailBanner } from "@/components/auth/UnverifiedEmailBanner";
import { AutoPipetteFirstRunNotice } from "@/components/assist/AutoPipetteFirstRunNotice";

export async function LayoutBanners() {
  const session = await getSession();
  if (!session?.user) return null;

  const actingAs = (session.user as { actingAs?: string }).actingAs;
  const userId = (session.user as { id?: string }).id;
  const userRow = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          accountKind: true,
          demoExpiresAt: true,
          email: true,
          emailVerified: true,
        },
      })
    : null;

  // Show the "verify your email" banner only for real accounts —
  // demo / sandbox accounts deliberately bypass email verification.
  const showUnverifiedBanner =
    !!userRow &&
    !userRow.emailVerified &&
    (userRow.accountKind === "real" || userRow.accountKind == null);

  const hasBanner =
    Boolean(actingAs) ||
    userRow?.accountKind === "demo" ||
    (showUnverifiedBanner && !!userRow?.email);

  // `mb-6` only when at least one banner renders, so we don't add
  // dead space below the hero on the (vast majority of) page loads
  // where no banners apply.
  return (
    <div className={hasBanner ? "mb-6 space-y-3" : ""}>
      {actingAs && <ImpersonationBanner actingAs={actingAs} />}
      {userRow?.accountKind === "demo" && (
        <DemoBanner
          kind="demo"
          expiresAt={userRow.demoExpiresAt?.toISOString() ?? null}
        />
      )}
      {showUnverifiedBanner && userRow?.email && (
        <UnverifiedEmailBanner email={userRow.email} />
      )}
      <AutoPipetteFirstRunNotice />
    </div>
  );
}
