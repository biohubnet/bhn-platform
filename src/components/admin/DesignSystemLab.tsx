"use client";
/**
 * Design-system Lab — admin-only.
 *
 * Two panes stacked vertically:
 *   1. **Showroom** — same DS primitives rendered in every
 *      registered design system, stacked top-to-bottom. Admins
 *      see at a glance how Classic / Cinematic / Studio each
 *      handle the same content.
 *   2. **Composer** — Studio-specific token tweaker. Lets admins
 *      tweak the hero base + mesh stops + foreground colour with
 *      live preview, then export the result as a JSON blob to
 *      hand to a future "save as preset" feature.
 *
 * Why no persistence yet
 *   Persisting tweaks as a new platform-default design system is
 *   a multi-table change (preset rows, CSS-variable injection at
 *   the layout, picker plumbing). The MVP gives admins the
 *   creative loop — see → tweak → export — and we'll add the
 *   save path in a follow-up commit.
 */
import { useState } from "react";
import { Copy, Download, RotateCcw } from "lucide-react";
import { DesignSystemProvider } from "@/components/ui/DesignSystemProvider";
import { DesignSystemShowroom, DesignSystemSamplePrimitives } from "@/components/admin/DesignSystemShowroom";

/** Default Studio token values — mirrors what the daylight-theme
 *  `--hero-*` CSS variables resolve to. The composer starts from
 *  here. */
const STUDIO_DEFAULTS = {
  heroBg:     "#0d3a51",
  heroFg:     "#ffffff",
  heroMesh1:  "#0891b2",
  heroMesh2:  "#2dd4bf",
  heroMesh3:  "#1d4ed8",
  heroMesh4:  "#0e7490",
  /** Stat-tile background alpha 0-1. */
  tileAlpha:  0.10,
};

type StudioTokens = typeof STUDIO_DEFAULTS;

function tokenStyleVars(tokens: StudioTokens): React.CSSProperties {
  // We inject the same CSS variables the .hero-mesh-brand rule
  // reads, scoped to the preview wrapper. The DS primitives
  // already read these so no other plumbing is needed.
  return {
    ["--hero-bg"     as string]: tokens.heroBg,
    ["--hero-fg"     as string]: tokens.heroFg,
    ["--hero-mesh-1" as string]: tokens.heroMesh1,
    ["--hero-mesh-2" as string]: tokens.heroMesh2,
    ["--hero-mesh-3" as string]: tokens.heroMesh3,
    ["--hero-mesh-4" as string]: tokens.heroMesh4,
  };
}

export function DesignSystemLab() {
  return (
    <div className="space-y-8">
      <DesignSystemShowroom />
      <Composer />
    </div>
  );
}

function Composer() {
  const [tokens, setTokens] = useState<StudioTokens>(STUDIO_DEFAULTS);
  const [copied, setCopied] = useState(false);

  function reset() { setTokens(STUDIO_DEFAULTS); }
  function patch<K extends keyof StudioTokens>(key: K, value: StudioTokens[K]) {
    setTokens((t) => ({ ...t, [key]: value }));
  }
  function exportJson() {
    const out = JSON.stringify({ basedOn: "studio", tokens }, null, 2);
    navigator.clipboard.writeText(out).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  function downloadJson() {
    const out = JSON.stringify({ basedOn: "studio", tokens }, null, 2);
    const blob = new Blob([out], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio-preset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6 surface-shadow">
      <header className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Visual composer</p>
        <h2 className="text-lg font-bold text-fg tracking-tight mt-1">Tweak Studio tokens, see it live</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">
          Pick colours for the hero base + mesh stops + foreground. The preview below updates instantly. Export to JSON when
          you&apos;re happy; a follow-up commit will add &quot;save as preset&quot; that registers a custom design system platform-wide.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Control panel */}
        <div className="space-y-3">
          <ColorRow label="Hero base bg"   value={tokens.heroBg}    onChange={(v) => patch("heroBg", v)} />
          <ColorRow label="Hero foreground" value={tokens.heroFg}    onChange={(v) => patch("heroFg", v)} />
          <ColorRow label="Mesh stop 1"     value={tokens.heroMesh1} onChange={(v) => patch("heroMesh1", v)} />
          <ColorRow label="Mesh stop 2"     value={tokens.heroMesh2} onChange={(v) => patch("heroMesh2", v)} />
          <ColorRow label="Mesh stop 3"     value={tokens.heroMesh3} onChange={(v) => patch("heroMesh3", v)} />
          <ColorRow label="Mesh stop 4"     value={tokens.heroMesh4} onChange={(v) => patch("heroMesh4", v)} />
          <div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">Stat-tile alpha</span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={tokens.tileAlpha}
                onChange={(e) => patch("tileAlpha", Number(e.target.value))}
                className="mt-1 w-full"
              />
              <span className="text-[10px] font-mono text-subtle">{tokens.tileAlpha.toFixed(2)}</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line mt-3">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
              <RotateCcw size={11} /> Reset
            </button>
            <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              <Copy size={11} /> {copied ? "Copied!" : "Copy JSON"}
            </button>
            <button type="button" onClick={downloadJson} className="inline-flex items-center gap-1.5 border border-line text-fg hover:bg-elevated text-xs font-bold px-3 py-1.5 rounded-lg">
              <Download size={11} /> Download
            </button>
          </div>
        </div>

        {/* Live preview — same SamplePrimitives, but the wrapper
            injects custom CSS variables so the Studio hero picks up
            the composer's values. */}
        <div
          className="rounded-2xl ring-1 ring-line bg-background overflow-hidden"
          style={{
            ...tokenStyleVars(tokens),
            // Custom alpha override for tile bg — read by an inline
            // style override on the DSStat children via the [data-tile-alpha]
            // attribute (set below).
          } as React.CSSProperties}
          data-tile-alpha={tokens.tileAlpha}
        >
          <div className="max-w-7xl mx-auto px-6 py-8 dashboard-layout">
            <DesignSystemProvider value="studio">
              <DesignSystemSamplePrimitives />
            </DesignSystemProvider>
          </div>
        </div>
      </div>
    </section>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-line cursor-pointer shrink-0"
      />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-subtle block">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-card-solid border border-line rounded-lg px-2 py-1 text-xs font-mono mt-0.5"
        />
      </div>
    </label>
  );
}
