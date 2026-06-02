/**
 * /admin/simulator-requests/new — create a simulation directly, with no
 * user request behind it. (Static segment, so it takes precedence over
 * the sibling [id] detail route.) Auth-gates on admin, then renders the
 * client create form which POSTs to /api/admin/simulations.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Theater } from "lucide-react";
import { getSession, ROLE_RANK } from "@/lib/auth";
import { PageHero } from "@/components/ui/PageHero";
import { CreateSimulationForm } from "@/components/admin/CreateSimulationForm";

export const dynamic = "force-dynamic";

export default async function NewSimulationPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/admin/simulator-requests/new");
  const role = (session.user as { role?: string }).role ?? "trainee";
  if (ROLE_RANK[role] < ROLE_RANK.admin) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={
          <>
            <Theater size={11} /> Admin · Simulator
          </>
        }
        title="New simulation"
        description="Build a role-play simulation directly from a job description — no user request needed. Generate it with AI, or paste a hand-authored payload. The moment it's created it joins the trainee Career Simulator catalog, and anyone can launch their own attempt; a later request for the same posting reuses it automatically."
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6">
        <Link
          href="/admin/simulator-requests"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={13} /> Back to requests
        </Link>
        <CreateSimulationForm />
      </div>
    </div>
  );
}
