/**
 * Workspace → Marketing → Sponsorship Package. A dedicated tab that opens the
 * symposium sponsorship package straight into the HtmlScriptEditor (editable,
 * share links, version history) — the same treatment as the Comms Plan, so the
 * commercial half of the event lives beside the communications half instead of
 * circulating as a PDF attachment.
 *
 * Seeded lazily (idempotent) so the page always resolves, even on a fresh DB.
 */
import { redirect, notFound } from "next/navigation";
import { Handshake } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { HtmlScriptEditor } from "@/components/workspace/HtmlScriptEditor";
import { SharePanel } from "@/components/workspace/SharePanel";
import { ensureSponsorshipPackageProject } from "@/lib/scripts/seed";

export const dynamic = "force-dynamic";

const SYMPOSIUM_PROJECT_TITLE = "2026 Annual Symposium & Training Week";
const SPONSORSHIP_SCRIPT_TITLE = "Sponsorship Package";

export default async function SponsorshipPackagePage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const meId = (session.user as { id?: string }).id ?? null;
  await ensureSponsorshipPackageProject(meId);

  const script = await prisma.script.findFirst({
    where: {
      title: SPONSORSHIP_SCRIPT_TITLE,
      project: { title: SYMPOSIUM_PROJECT_TITLE },
    },
    include: {
      shareTokens: {
        orderBy: { createdAt: "desc" },
        select: { id: true, token: true, label: true, createdAt: true },
      },
    },
  });
  if (!script) notFound();

  const rc = (script.richContent as { html?: string; css?: string } | null) ?? null;
  const shareLinks = script.shareTokens.map((t) => ({
    id: t.id, token: t.token, label: t.label, createdAt: t.createdAt.toISOString(),
  }));
  const meName = (session.user as { name?: string }).name ?? "You";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={<><Handshake size={11} /> Workspace · Marketing</>}
        title="Sponsorship Package"
        description="The sponsorship offer for the Annual Symposium — why sponsor, event details, tier grid, and how to confirm. Edit it here and share a link with prospective sponsors instead of mailing a PDF."
        actions={<SharePanel scriptId={script.id} initialLinks={shareLinks} />}
      />
      <HtmlScriptEditor
        scriptId={script.id}
        initialHtml={rc?.html ?? ""}
        css={rc?.css ?? ""}
        meId={meId ?? "anon"}
        meName={meName}
        showStructureTabs={false}
      />
    </div>
  );
}
