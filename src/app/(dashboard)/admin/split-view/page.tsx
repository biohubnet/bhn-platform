import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { SplitViewClient } from "@/components/admin/SplitViewClient";
import { Columns2 } from "lucide-react";

/**
 * /admin/split-view — admin-only side-by-side preview tool.
 *
 * Replaces the retired sandbox-account feature. Instead of spawning
 * a dummy HR + Trainee pair you had to log into one at a time, you
 * open this page and see two iframes mounted side by side — by
 * default a Trainee surface on the left and the Employer / HR
 * portal on the right. Pick presets to scan the same scenario from
 * both vantage points without leaving your admin seat.
 *
 * Caveat: both iframes load with your current session cookie, so the
 * preview reflects "an admin viewing the trainee surface" rather
 * than "a trainee viewing it." For pixel-accurate role isolation,
 * combine this with View-as (sidebar → role-switcher) before opening
 * the page — every iframe will then render as that role.
 */
export default async function SplitViewPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div>
      <PageHero
        eyebrow={<><Columns2 size={11} /> Admin · Preview</>}
        title="Split view — Trainee + HR side by side"
        description="Two live panes of the platform, both your own session, so you can scan how content lands on each role at once. Pick a preset or type any path in the URL boxes. For role-accurate previews, switch View-as first; the panes will follow."
        tone="brand"
      />
      <SplitViewClient />
    </div>
  );
}
