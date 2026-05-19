/**
 * /admin/login-floaters — manage the floater set that appears in
 * the dark periphery of the /login backdrop.
 *
 * Server shell:
 *   • Auth-gates on admin role (redirect to /dashboard otherwise).
 *   • Reads the current active list from the PlatformSetting row.
 *   • Hands the editable list + allowed swim variants to the client
 *     editor. The editor imports FLOATER_REGISTRY directly so it
 *     can render the actual React components in its gallery; the
 *     registry's React refs aren't serialisable across the
 *     server→client boundary, but importing them client-side is
 *     fine since every floater is itself a `"use client"`
 *     component.
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveLoginFloaters } from "@/lib/login-floaters/config";
import { SWIM_CLASSES } from "@/lib/login-floaters/registry";
import { LoginFloatersEditor } from "@/components/admin/login-floaters/LoginFloatersEditor";

export const dynamic = "force-dynamic";

export default async function AdminLoginFloatersPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const floaters = await getActiveLoginFloaters();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Login-screen floaters"
        description={(
          <>
            Manage the ambient process-glyph animations that sit on the dark periphery
            of the public <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">/login</code> screen.
            Add, remove, replace, and reposition individual floaters; changes apply on the next login-page load
            (no deploy needed). Browse the full curated library in the editorial gallery below — each card is the
            real React component at thumbnail scale, so what you see is what lands on the login backdrop.
          </>
        )}
      />
      <LoginFloatersEditor
        initialFloaters={floaters}
        swimClasses={[...SWIM_CLASSES]}
      />
    </div>
  );
}
