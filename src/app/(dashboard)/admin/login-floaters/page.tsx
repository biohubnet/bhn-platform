/**
 * /admin/login-floaters — manage the floater set that appears in
 * the dark periphery of the /login backdrop.
 *
 * Server shell:
 *   • Auth-gates on admin role (redirect to /dashboard otherwise).
 *   • Reads the current active list from the PlatformSetting row.
 *   • Hands the editable list + a serialised version of the
 *     registry (id, displayName, category) to the client editor.
 *     The actual React components aren't serialisable — the
 *     editor only needs them as a pick-list, so we send metadata
 *     only; rendering happens via the same registry on /login.
 */
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActiveLoginFloaters } from "@/lib/login-floaters/config";
import { FLOATER_LIST, SWIM_CLASSES } from "@/lib/login-floaters/registry";
import { LoginFloatersEditor } from "@/components/admin/login-floaters/LoginFloatersEditor";

export const dynamic = "force-dynamic";

export default async function AdminLoginFloatersPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const floaters = await getActiveLoginFloaters();

  // Strip the registry down to the serialisable metadata the
  // editor needs to render the picker. The React component
  // references stay server-side.
  const registry = FLOATER_LIST.map((f) => ({
    id: f.id,
    displayName: f.displayName,
    category: f.category,
    defaultSize: f.defaultSize,
    defaultColorClass: f.defaultColorClass,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Login-screen floaters"
        description={(
          <>
            Manage the ambient process-glyph animations that sit on the dark periphery
            of the public <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">/login</code> screen.
            Add, remove, replace, and reposition individual floaters; changes apply on the next login-page load
            (no deploy needed). The full code-side library lives in <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">src/components/branding/</code> —
            this admin tool exposes a curated subset.
          </>
        )}
      />
      <LoginFloatersEditor
        initialFloaters={floaters}
        registry={registry}
        swimClasses={[...SWIM_CLASSES]}
      />
    </div>
  );
}
