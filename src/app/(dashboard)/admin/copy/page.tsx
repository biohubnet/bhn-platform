import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COPY_REGISTRY, getCopyEntriesByScope, type CopyEntry } from "@/lib/copy-registry";
import { CopyEditorTable } from "@/components/admin/CopyEditorTable";
import { FileText } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

/**
 * /admin/copy — single page that lists every editable string on the
 * platform, grouped by page (Catalog, Events, Rewards, etc.), with
 * an inline edit affordance per row.
 *
 * The registry (src/lib/copy-registry.ts) is the closed catalogue of
 * keys; this page joins it against the EditableCopy table so admins
 * can see which strings have been overridden and which are still
 * showing their code defaults. Reset reverts a key to the default.
 */
export default async function AdminCopyPage() {
  const session = await requireRole("admin").catch(() => null);
  if (!session) redirect("/dashboard");

  const overrideRows = await prisma.editableCopy.findMany({
    where: { key: { in: COPY_REGISTRY.map((e) => e.key) } },
    select: { key: true, value: true, updatedAt: true },
  });
  const overrides = new Map(overrideRows.map((r) => [r.key, r]));

  // Group entries by scope so the table reads as a tour of the
  // platform — every editable string lives somewhere recognisable.
  const grouped = getCopyEntriesByScope();
  const scopes = Object.keys(grouped);

  // Total / override stats for the hero.
  const total = COPY_REGISTRY.length;
  const overridden = overrideRows.length;

  return (
    <div>
      <PageHero
        eyebrow={<><FileText size={11} /> Editable copy</>}
        title="Edit page text"
        description="Every editable string on the platform, in one place. Change a value and it reflects on the public page immediately. Reset reverts to the in-code default."
        tone="brand"
      />
      <div className="max-w-5xl mx-auto px-2 sm:px-0 space-y-6 -mt-4">
        <div className="rounded-2xl border border-line bg-card surface-shadow p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-xs text-subtle uppercase tracking-[0.18em] font-bold">Catalogue</span>
          <span><strong className="text-fg">{total}</strong> editable string{total === 1 ? "" : "s"}</span>
          <span><strong className="text-fg">{overridden}</strong> overridden</span>
          <span className="text-muted">·</span>
          <span><strong className="text-fg">{total - overridden}</strong> using code default</span>
        </div>

        {scopes.map((scope) => (
          <section key={scope}>
            <h2 className="text-sm font-semibold text-fg mb-3 tracking-tight">{scope}</h2>
            <CopyEditorTable
              entries={grouped[scope] as CopyEntry[]}
              overrides={Object.fromEntries(
                grouped[scope].map((e) => {
                  const o = overrides.get(e.key);
                  return [e.key, o ? { value: o.value, updatedAt: o.updatedAt.toISOString() } : null];
                }),
              )}
            />
          </section>
        ))}

        <p className="text-xs text-subtle">
          Tip: every editable string also has an inline pencil on the live page itself.
          Hover the text where it appears, click the pencil, edit.
        </p>
      </div>
    </div>
  );
}
