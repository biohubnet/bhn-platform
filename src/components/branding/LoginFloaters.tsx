"use client";

/**
 * Data-driven floater renderer for the /login backdrop.
 *
 * Fetches the active list from /api/login-floaters on mount and
 * renders each one via the FLOATER_REGISTRY component map. Position
 * (side + verticalPct), size, colour class, and lab-swim drift
 * variant are pulled per-instance from the config; everything else
 * (DraggableGlyph wrapping, pointer-events-none layering, hidden
 * lg:block visibility) is constant.
 *
 * Replaces the hardcoded floater JSX block that used to live in
 * src/app/(auth)/login/page.tsx. Admins now drive this set from
 * /admin/login-floaters.
 */

import { useEffect, useState } from "react";
import { DraggableGlyph } from "@/components/branding/DraggableGlyph";
import { FLOATER_REGISTRY } from "@/lib/login-floaters/registry";
import type { FloaterInstance } from "@/lib/login-floaters/types";

export function LoginFloaters() {
  const [floaters, setFloaters] = useState<FloaterInstance[] | null>(null);
  const [appearMs, setAppearMs] = useState(6000);
  // Flips true a frame after the floaters mount so the opacity transition
  // (the staggered entrance) actually plays instead of snapping on.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/login-floaters")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (typeof j?.appearMs === "number") setAppearMs(j.appearMs);
        if (Array.isArray(j?.floaters)) {
          setFloaters(j.floaters as FloaterInstance[]);
        }
      })
      .catch(() => {
        // Silent failure — floaters are ambient decoration; not
        // rendering them is better than crashing the login page.
        if (!cancelled) setFloaters([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!floaters || floaters.length === 0) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [floaters]);

  if (!floaters) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {floaters.map((f, idx) => {
        const def = FLOATER_REGISTRY[f.id];
        if (!def) return null;
        const Comp = def.Component;

        // Side-edge offset is a constant indent so the floater
        // doesn't sit flush against the page edge. Vertical
        // position comes per-instance from the config.
        const sideStyle: React.CSSProperties =
          f.position.side === "left" ? { left: "2%" } : { right: "3%" };

        const colorClass = f.colorClass ?? def.defaultColorClass;
        const swim = f.swimClass ?? "lab-swim-slow";
        const size = f.size ?? def.defaultSize;

        // Staggered entrance: spread each floater's fade-in across the
        // admin-set `appearMs` window so they appear progressively, not all
        // at once. Applied to DraggableGlyph's outer wrapper (un-animated —
        // swim/spin live on inner layers) so it never fights the drift.
        const entranceDelay =
          floaters.length > 1 ? (idx / (floaters.length - 1)) * appearMs : 0;

        return (
          <DraggableGlyph
            key={`${f.id}-${idx}`}
            className={`absolute hidden lg:block ${colorClass}`}
            style={{
              ...sideStyle,
              top: `${f.position.verticalPct}%`,
              opacity: shown ? 1 : 0,
              transition: "opacity 1100ms ease-out",
              transitionDelay: `${Math.round(entranceDelay)}ms`,
            }}
            swimClass={swim}
            pokeRadius={150}
          >
            <Comp size={size} />
          </DraggableGlyph>
        );
      })}
    </div>
  );
}
