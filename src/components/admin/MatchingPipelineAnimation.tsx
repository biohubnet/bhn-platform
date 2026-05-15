"use client";
/**
 * Wrapper that lets the admin pick which visualisation they want for
 * the AI matching engine. Five distinct designs, all driven by the
 * same MatchingConfig:
 *
 *   1. Mixing desk     — VU-meter bars per subscore + master meter
 *   2. Bioprocess lab  — burettes dripping into a beaker (BHN-themed)
 *   3. Orbital system  — planets orbiting a central score star
 *   4. Data stream     — particle rivers flowing into an output node
 *   5. Constellation   — star clusters connecting to a Polaris
 *
 * Pick persists in localStorage so the admin's choice is remembered
 * across visits. The container wrapper adds a little outer margin
 * (px-1.5 sm:px-2) so the inner panel doesn't kiss the surrounding
 * full-bleed edge the way the previous neural-net version did.
 */
import { useEffect, useState } from "react";
import { Sliders, FlaskConical, Orbit, Waves, Stars } from "lucide-react";
import type { MatchingConfig } from "@/lib/matching/config";
import { MixingDesk }    from "@/components/admin/animations/MixingDesk";
import { BioprocessLab } from "@/components/admin/animations/BioprocessLab";
import { Orbital }       from "@/components/admin/animations/Orbital";
import { DataStream }    from "@/components/admin/animations/DataStream";
import { Constellation } from "@/components/admin/animations/Constellation";
import { cn } from "@/lib/utils";

interface Props { config: MatchingConfig }

type VariantId = "mixer" | "lab" | "orbit" | "stream" | "stars";

interface VariantDef {
  id: VariantId;
  label: string;
  hint: string;
  icon: React.ElementType;
  Component: React.ComponentType<{ config: MatchingConfig }>;
}

const VARIANTS: VariantDef[] = [
  { id: "mixer",  label: "Mixing desk",    hint: "VU meters",     icon: Sliders,        Component: MixingDesk    },
  { id: "lab",    label: "Bioprocess lab", hint: "drops + beaker", icon: FlaskConical,  Component: BioprocessLab },
  { id: "orbit",  label: "Orbital",        hint: "planets",       icon: Orbit,          Component: Orbital       },
  { id: "stream", label: "Data stream",    hint: "particle river", icon: Waves,         Component: DataStream    },
  { id: "stars",  label: "Constellation",  hint: "star clusters", icon: Stars,          Component: Constellation },
];

const STORAGE_KEY = "bhn-matching-anim-variant";
const DEFAULT_VARIANT: VariantId = "lab";

export function MatchingPipelineAnimation({ config }: Props) {
  const [variantId, setVariantId] = useState<VariantId>(DEFAULT_VARIANT);

  // Restore previous pick on mount. Cookie-flavoured: silent fallback
  // when localStorage is unavailable (Safari private mode, etc.).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as VariantId | null;
      if (saved && VARIANTS.some((v) => v.id === saved)) {
        setVariantId(saved);
      }
    } catch {}
  }, []);

  function pick(id: VariantId) {
    setVariantId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  const Variant = VARIANTS.find((v) => v.id === variantId)?.Component ?? MixingDesk;

  return (
    <div className="px-1.5 sm:px-2">
      {/* Variant picker — chips above the active panel */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-slate-500 font-mono mr-1">
          design
        </span>
        {VARIANTS.map((v) => {
          const Icon = v.icon;
          const active = v.id === variantId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v.id)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md ring-1 ring-inset transition-colors",
                active
                  ? "bg-cyan-500/15 text-cyan-200 ring-cyan-400/40"
                  : "bg-slate-900/50 text-slate-400 ring-slate-700/40 hover:text-slate-200",
              )}
            >
              <Icon size={11} />
              {v.label}
              <span className="text-[9px] font-normal text-slate-500">{v.hint}</span>
            </button>
          );
        })}
      </div>

      <Variant config={config} />
    </div>
  );
}
