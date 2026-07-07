/**
 * Workspace → Marketing → 26 Symposium Comms Plan. A dedicated tab that
 * opens the 2026 Annual Symposium & Training Week communications plan
 * straight into the HtmlScriptEditor (editable Gantt + full plan, share
 * links, version history) — no need to drill through Video Production.
 *
 * The plan is seeded lazily (idempotent) so this page always resolves,
 * even on a fresh database.
 */
import { redirect, notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/ui/PageHero";
import { HtmlScriptEditor } from "@/components/workspace/HtmlScriptEditor";
import { SharePanel } from "@/components/workspace/SharePanel";
import { ensureSymposiumCommsProject } from "@/lib/scripts/seed";

export const dynamic = "force-dynamic";

const SYMPOSIUM_PROJECT_TITLE = "2026 Annual Symposium & Training Week";
const SYMPOSIUM_SCRIPT_TITLE = "2026 Symposium — Communications Plan";

export default async function SymposiumCommsPlanPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const meId = (session.user as { id?: string }).id ?? null;
  // Always present (no manual seed step) — same pattern as the Molly guide.
  await ensureSymposiumCommsProject(meId);

  const script = await prisma.script.findFirst({
    where: {
      title: SYMPOSIUM_SCRIPT_TITLE,
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
        eyebrow={<><CalendarClock size={11} /> Workspace · Marketing</>}
        title="26 Symposium Comms Plan"
        description="The full communications & marketing playbook for the 2026 Annual Symposium and Training Week — editable Gantt timeline, pre/during/post promotion, sponsorship, sample report, and task breakdown. Edit any cell, drag sections, and share a link for collaborative editing."
        actions={<SharePanel scriptId={script.id} initialLinks={shareLinks} />}
      />
      <HtmlScriptEditor
        scriptId={script.id}
        initialHtml={rc?.html ?? ""}
        css={rc?.css ?? ""}
        meId={meId ?? "anon"}
        meName={meName}
        // This plan is edited on the page + on the Gantt chart itself, so the
        // structural Sections/Tables tabs aren't needed — keep Comments + History.
        showStructureTabs={false}
      />
    </div>
  );
}
