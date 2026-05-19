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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/login-floaters")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j?.floaters)) {
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

        return (
          <DraggableGlyph
            key={`${f.id}-${idx}`}
            className={`absolute hidden lg:block ${colorClass}`}
            style={{ ...sideStyle, top: `${f.position.verticalPct}%` }}
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
