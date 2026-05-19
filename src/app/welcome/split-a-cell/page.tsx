/**
 * /welcome/split-a-cell — gamified first-login ritual.
 *
 * Server-component guard:
 *   • Unauthenticated → /login
 *   • Already completed AND not an admin-replay → /dashboard
 *   • Admin with `?replay=1` → play freely (client component
 *     skips the completion POST so the flag stays untouched)
 *   • Everyone else (the actual target audience: trainees on
 *     their first login) → render the client game
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CellSplitGame } from "@/components/onboarding/CellSplitGame";

export default async function SplitACellWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "trainee";
  const isAdmin = role === "admin" || role === "superadmin";

  const sp = await searchParams;
  const isReplay = sp.replay === "1";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasSplitCell: true, name: true },
  });

  // Already completed + not admin replay → straight to dashboard.
  // (Admin replay always plays, regardless of the flag.)
  if (user?.hasSplitCell && !(isAdmin && isReplay)) {
    redirect("/dashboard");
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <CellSplitGame
      firstName={firstName}
      // When replay-as-admin, don't fire the "mark complete" POST —
      // the flag stays untouched so admins can replay over and over.
      replayMode={isReplay && isAdmin}
    />
  );
}
