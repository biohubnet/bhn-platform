"use client";
/**
 * Compact dropdown for switching design systems. Sits beside the
 * ThemePicker in the sidebar footer.
 *
 * Two interaction modes (mirroring ThemePicker):
 *   • Hover an option → preview without persisting
 *   • Click an option  → commit to localStorage
 *   • Mouse leaves the menu before clicking → snaps back to saved
 *
 * Keep this presentational. All state lives in
 * DesignSystemProvider; we just read + write.
 */
import { useEffect, useRef, useState } from "react";
import { Layers, Check, ChevronDown } from "lucide-react";
import { useDesignSystem } from "./DesignSystemProvider";
import {
  DESIGN_SYSTEMS,
  DESIGN_SYSTEM_CATEGORIES,
  findDesignSystem,
  type DesignSystemId,
  type DesignSystemCategory,
} from "@/lib/design-system/registry";

export function DesignSystemPicker({ compact = false }: { compact?: boolean }) {
  const { designSystem, setDesignSystem, isPreviewing, savedDesignSystem } = useDesignSystem();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        // If we were previewing, snap back to saved on dismiss.
        if (isPreviewing && savedDesignSystem) {
          setDesignSystem(savedDesignSystem, { persist: false });
        }
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isPreviewing, savedDesignSystem, setDesignSystem]);

  // Group entries by category for section headers.
  const grouped = DESIGN_SYSTEMS.reduce<Record<string, typeof DESIGN_SYSTEMS[number][]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  const active = findDesignSystem(designSystem);

  function preview(id: DesignSystemId) {
    if (id !== designSystem) setDesignSystem(id, { persist: false });
  }

  function commit(id: DesignSystemId) {
    setDesignSystem(id, { persist: true });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-2 text-xs font-semibold text-fg/80 hover:text-fg hover:bg-elevated rounded-lg transition-colors " +
          (compact ? "px-2 py-1" : "px-3 py-1.5")
        }
        title="Switch design system"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Layers size={12} className="text-brand-600" />
        {!compact && <span>{active?.name ?? "Classic"}</span>}
        {compact && <span className="sr-only">{active?.name ?? "Classic"}</span>}
        <ChevronDown size={11} className={"transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full mb-2 left-0 w-72 rounded-2xl border border-line bg-card-solid shadow-xl shadow-slate-900/20 p-2 z-50"
          onMouseLeave={() => {
            // Snap back to saved on mouse-leave while previewing.
            if (isPreviewing && savedDesignSystem) {
              setDesignSystem(savedDesignSystem, { persist: false });
            }
          }}
        >
          <div className="px-2 py-1.5 border-b border-line mb-1">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              Design system
            </p>
            <p className="text-[11px] text-muted mt-0.5 leading-snug">
              Layout vocabulary. Independent of color theme.
            </p>
          </div>

          {(Object.keys(DESIGN_SYSTEM_CATEGORIES) as DesignSystemCategory[]).map((cat) => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat} className="space-y-0.5">
                <p className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-subtle font-bold">
                  {DESIGN_SYSTEM_CATEGORIES[cat].label}
                </p>
                {items.map((d) => {
                  const isActive = d.id === designSystem;
                  const isSaved = d.id === savedDesignSystem;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onMouseEnter={() => preview(d.id)}
                      onClick={() => commit(d.id)}
                      className={
                        "w-full text-left rounded-lg px-2 py-2 transition-colors flex items-start gap-2 " +
                        (isActive ? "bg-elevated" : "hover:bg-elevated/60")
                      }
                      role="menuitem"
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-line"
                        style={d.id === "cinematic" ? {
                          backgroundImage:
                            "linear-gradient(135deg, var(--brand-200), var(--brand-500) 60%, var(--brand-700))",
                        } : {
                          backgroundColor: "var(--card)",
                        }}
                      >
                        {isSaved && <Check size={11} className={d.id === "cinematic" ? "text-white" : "text-fg"} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-fg">{d.name}</span>
                        <span className="block text-[10px] text-muted leading-snug mt-0.5">
                          {d.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {isPreviewing && (
            <div className="border-t border-line mt-2 pt-2 px-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted">Previewing — click to keep.</p>
              {savedDesignSystem && (
                <button
                  type="button"
                  onClick={() => setDesignSystem(savedDesignSystem, { persist: false })}
                  className="text-[10px] font-bold text-muted hover:text-fg"
                >
                  Revert
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
