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
import { getActiveLoginFloaters, getLoginFloaterFx } from "@/lib/login-floaters/config";
import { SWIM_CLASSES } from "@/lib/login-floaters/registry";
import { LoginFloatersEditor } from "@/components/admin/login-floaters/LoginFloatersEditor";
import { FloaterAquarium } from "@/components/admin/login-floaters/FloaterAquarium";

export const dynamic = "force-dynamic";

export default async function AdminLoginFloatersPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const [floaters, fx] = await Promise.all([
    getActiveLoginFloaters(),
    getLoginFloaterFx(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Login-screen floaters"
        description={(
          <>
            Manage the ambient process-glyph animations that sit on the dark periphery
            of the public <code className="font-mono text-fg bg-elevated px-1.5 py-0.5 rounded">/login</code> screen.
            The gallery below is the picker — click any card to seat that floater on /login (each card is the
            real React component at thumbnail scale, so what you see is what lands on the login backdrop). The
            row editor underneath lets you fine-tune position, size, colour, and drift variant for whatever is
            currently seated. Changes apply on the next login-page load (no deploy needed).
          </>
        )}
      />
      <LoginFloatersEditor
        initialFloaters={floaters}
        initialFx={fx}
        swimClasses={[...SWIM_CLASSES]}
      />

      {/* Floater Aquarium — a self-sustaining tank of process glyphs.
          Sits at the bottom of the page; click to enter screensaver
          mode (full-viewport, cursor flee, click bursts, slow
          day/night cycle on the backdrop). Each swimmer lives 30-90 s
          then fades out and is replaced — population stays at target
          forever. */}
      <section className="pt-2">
        <FloaterAquarium />
      </section>
    </div>
  );
}
