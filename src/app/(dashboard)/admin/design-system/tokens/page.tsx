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
 * Seven groups: corners, spacing, type, ink and surfaces, brand, depth
 * and motion. Colour is included because the editor now shows a live
 * contrast ratio against whatever each colour is read on — the guardrail
 * that makes it safe to hand a colour picker to someone who is not
 * looking for the failure.
 *
 * Only tokens something actually reads are exposed. globals.css also
 * declares --surface-shadow, --heading-weight and four others across
 * eleven themes that nothing consumes; a dial that changes nothing is
 * worse than no dial, so they are left out until they are wired up or
 * deleted.
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

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg">Design controls</h1>
      <p className="mt-2 leading-relaxed text-fg-muted">
        Every value the platform&rsquo;s look is built from, in one place. Changes preview live —
        the panels, buttons and navigation around you are already using them — and apply to
        everyone once saved.
      </p>

      <div className="mt-5 flex gap-3 rounded-lg border border-line bg-elevated p-3.5">
        <Info size={16} className="mt-0.5 shrink-0 text-fg-muted" />
        <div className="text-[13px] leading-relaxed text-fg-muted">
          <p>
            <b className="text-fg">These sit on top of the active theme.</b> Anything you leave
            alone keeps whatever the current theme sets, so each of the seventeen themes keeps its
            own character. The arrow beside a control hands it back.
          </p>
          <p className="mt-2">
            <b className="text-fg">Colours show their contrast ratio</b> against the surface they
            are normally read on, and turn red below the level they need. Text needs 4.5:1. The
            hairlines have no minimum &mdash; they are dividers, not text &mdash; so their number is
            shown for reference only.
          </p>
          <p className="mt-2">
            Sizes are ladders: each step is larger than the one before. Most of the platform sits on
            the middle steps, so those move the most.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DesignTokenEditor initial={overrides} />
      </div>
    </div>
  );
}
