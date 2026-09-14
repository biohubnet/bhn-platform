/**
 * /admin/v3-account-pages — the V3 account-page design mockups, framed
 * inside the dashboard so they open from the sidebar without leaving
 * the app.
 *
 * The pages themselves are static files under
 * `public/design-archive/v3-account-pages/` (also listed on
 * /admin/design-archive). They are simulations: nothing submits,
 * signs anyone up, or sends email.
 *
 * Admin-only review tooling, so English-only.
 */
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const HUB_URL = "/design-archive/v3-account-pages/index.html";

export default async function V3AccountPagesPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <PageHeader
        title="V3 account pages"
        description="Design-review mockups for registration, forgot password, and the reset-password confirmation. Every state is simulated with synthetic data — nothing submits or sends email. Pick a state from the hub, or open the gallery to compare desktop and mobile side by side."
        actions={(
          <a
            href={HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-fg bg-card ring-1 ring-inset ring-line hover:bg-elevated transition-colors"
          >
            Open full screen
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      />

      {/* Same framing as the EQUIP recipient tracker: the mockups paint
          their own dark ground, so the frame only needs a border and a
          height that leaves the page header in view. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-elevated shadow-elevated">
        <iframe
          src={HUB_URL}
          title="V3 account pages — design review"
          className="block w-full"
          style={{ height: "calc(100dvh - 240px)", minHeight: 640, border: 0 }}
        />
      </div>
    </div>
  );
}
