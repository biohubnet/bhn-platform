"use client";
/**
 * DesignSystemShowroom — visual side-by-side preview of every
 * registered design system, rendering the same sample content
 * (DSPageHeader + DSStatGrid + DSSection + list) once per system
 * wrapped in its own <DesignSystemProvider>.
 *
 * Shared between:
 *   • /admin/design-system           — sits between the picker
 *                                      + the tokens reference,
 *                                      so admins picking a DS
 *                                      see what they're picking.
 *   • /admin/design-system/lab       — the Lab page's headline
 *                                      "showroom" pane.
 *
 * Why a single component
 *   Both surfaces need the same render. Drift between them
 *   (different sample copy, different stat values) would make
 *   the comparison invalid. Sharing the SamplePrimitives sub-
 *   component means new DS variants automatically appear on
 *   both pages with consistent content.
 */
import { Sparkles } from "lucide-react";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { DSSection } from "@/components/design-system/DSSection";
import { DSStatGrid, DSStat } from "@/components/design-system/DSStatGrid";
import { DESIGN_SYSTEMS, type DesignSystemId } from "@/lib/design-system/registry";

interface Props {
  /** Optional header copy. Defaults match the in-Lab framing
   *  ("Same content, every design system"). Pass overrides for
   *  the /admin/design-system context. */
  title?: string;
  blurb?: string;
}

export function DesignSystemShowroom({
  title = "Same content, every design system",
  blurb = "The exact same DS-primitive JSX is rendered once per design system below. Use this to spot the differences in layout vocabulary, density, and hero treatment.",
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
      <header className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Showroom</p>
        <h2 className="text-lg font-bold text-fg tracking-tight mt-1">{title}</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">{blurb}</p>
      </header>

      <div className="space-y-8">
        {DESIGN_SYSTEMS.map((ds) => (
          <ShowroomPanel key={ds.id} id={ds.id} name={ds.name} description={ds.description} />
        ))}
      </div>
    </section>
  );
}

function ShowroomPanel({ id, name, description }: { id: DesignSystemId; name: string; description: string }) {
  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle bg-elevated rounded px-2 py-1 inline-flex items-center gap-1.5">
          {name}
          <code className="font-mono text-[9px] text-fg">{id}</code>
        </p>
        <p className="text-[11px] text-muted max-w-prose">{description}</p>
      </header>
      <div className="rounded-2xl ring-1 ring-line bg-background overflow-hidden">
        {/* Wrapping in `dashboard-layout` here is how the Studio
            full-bleed hero math (`100vw - sidebar-inset`) gets a
            sensible inset inside this nested preview. Without
            it, the hero would shoot off the right edge of the
            showroom card. */}
        <div className="max-w-7xl mx-auto px-6 py-8 pt-8 pb-8 dashboard-layout">
          <DesignSystemProvider value={id}>
            <DesignSystemSamplePrimitives />
          </DesignSystemProvider>
        </div>
      </div>
    </div>
  );
}

/** Same sample JSX used in every panel. Kept stable on purpose
 *  so the side-by-side comparison is content-controlled — only
 *  the design system varies. Exported so the Lab page's
 *  composer preview can reuse it. */
export function DesignSystemSamplePrimitives() {
  return (
    <div className="space-y-6">
      <DSPageHeader
        eyebrow="Admin · sample content"
        title="Hi, Sandra at Aurum Bio."
        description={
          <>This is the same page header rendered across every design system. Use the surrounding chrome of each panel to compare vocabulary.</>
        }
        icon={<Sparkles size={20} />}
        aside={
          <DSStatGrid>
            <DSStat label="Active postings" value={4}    help="↑ 2 vs last week" tone="brand"   />
            <DSStat label="Applicants"       value={28}   help="3 new this week" tone="violet"  />
            <DSStat label="New this week"    value={3}    help=""                tone="emerald" />
            <DSStat label="Profile"          value="92%"  help="2 fields left"   tone="amber"   />
          </DSStatGrid>
        }
      />

      <DSSection eyebrow="Latest" title="Recent applicants">
        <ul className="space-y-2">
          {[
            { name: "Maya R.",  role: "Postdoc, formulation",     when: "2 d ago" },
            { name: "Tariq A.", role: "Grad, downstream",         when: "5 d ago" },
            { name: "Jin K.",   role: "Research associate, QA",    when: "1 wk ago" },
          ].map((p) => (
            <li key={p.name} className="rounded-xl bg-elevated/40 border border-line p-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                {p.name.split(" ").map((s) => s[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-fg truncate">{p.name}</p>
                <p className="text-[11px] text-muted truncate">{p.role}</p>
              </div>
              <span className="text-[11px] text-subtle">{p.when}</span>
            </li>
          ))}
        </ul>
      </DSSection>
    </div>
  );
}
