/**
 * /admin/design-system/lab — showroom + visual composer.
 *
 * Showroom: same DS primitives rendered in every registered
 *           design system top-to-bottom.
 * Composer: tweak Studio tokens with a live preview; export
 *           the result as JSON for now (persistence as a custom
 *           preset is a follow-up commit).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { DesignSystemLab } from "@/components/admin/DesignSystemLab";

export const dynamic = "force-dynamic";

export default async function DesignSystemLabPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link href="/admin/design-system" className="text-xs text-muted hover:text-fg inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Design system
      </Link>

      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Admin · design &amp; research</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg mt-1 tracking-tight inline-flex items-center gap-2">
          <FlaskConical size={22} className="text-brand-600" />
          Design-system Lab
        </h1>
        <p className="text-sm text-muted mt-2 max-w-3xl leading-relaxed">
          See every registered design system rendering the same content. Tweak Studio tokens with a live preview.
          The platform-wide switcher lives on the previous page — this surface is for comparing and experimenting,
          not for committing the change.
        </p>
      </header>

      <DesignSystemLab />
    </div>
  );
}
