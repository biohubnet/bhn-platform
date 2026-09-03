import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDesignTokenOverrides } from "@/lib/settings";
import { DesignTokenEditor } from "@/components/admin/DesignTokenEditor";

/**
 * /admin/design-system/tokens — the design dials, editable without a
 * developer.
 *
 * The sibling page at /admin/design-system documents the system; this
 * one changes it. Values are written to PlatformSetting and injected as
 * a `:root` block in the root layout, so a save takes effect for every
 * user on their next page load. No rebuild and no deploy, which is the
 * whole point when the codebase is maintained by someone else.
 *
 * Corners and spacing only, deliberately. Colour is the token group
 * where an untrained edit can quietly push text below AA on any of
 * seventeen themes, and it should not land here until the editor can
 * check contrast as you drag.
 */
export default async function DesignTokensPage() {
  await requireRole("admin");
  const overrides = await getDesignTokenOverrides();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/design-system"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={14} /> Design system
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg">Design dials</h1>
      <p className="mt-2 text-fg-muted leading-relaxed">
        Adjust how the platform looks without touching code. Changes preview live on this page —
        the panels, buttons and navigation around you are already using them — and apply to
        everyone once saved.
      </p>

      <div className="mt-5 flex gap-3 rounded-lg border border-line bg-elevated p-3.5">
        <Info size={16} className="mt-0.5 shrink-0 text-fg-muted" />
        <div className="text-[13px] leading-relaxed text-fg-muted">
          <p>
            <b className="text-fg">These sit on top of the active theme.</b> A dial you have not
            touched keeps whatever the current theme sets, so each of the seventeen themes keeps its
            own character. <b className="text-fg">Use theme value</b> hands a dial back.
          </p>
          <p className="mt-2">
            Corner sizes are a ladder: extra small through 3XL, each one rounder than the last. Most
            of the platform sits on <b className="text-fg">Large</b> (cards and panels) and{" "}
            <b className="text-fg">Extra large</b> (section boxes and dialogs), so those two move
            the most.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DesignTokenEditor initial={overrides} />
      </div>
    </div>
  );
}
