"use client";

/**
 * Admin preview of the two application cards (ENGAGE training credits,
 * EXPERIENCE Industry Internship) a new trainee sees on their home page.
 * Tap Option (⌥, Alt on Windows) on its own to show or hide it. It always
 * shows the "never applied" state, whatever the admin's own status is.
 *
 * Only a lone tap toggles: holding Option as part of a shortcut
 * (Option+key) never does, so it can't fight other key bindings.
 */

import { useEffect, useState } from "react";
import { ApplicationStrip } from "@/components/dashboards/ApplicationStrip";

export function ApplicationStripPreview({ ttlDays, className }: { ttlDays: number; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let armed = false;
    const down = (e: KeyboardEvent) => {
      armed = e.key === "Alt" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.shiftKey;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Alt" && armed) setOpen((o) => !o);
      armed = false;
    };
    // Option-click (the macOS download gesture) or Option-scroll is not a tap.
    const disarm = () => { armed = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerdown", disarm);
    window.addEventListener("wheel", disarm);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerdown", disarm);
      window.removeEventListener("wheel", disarm);
    };
  }, []);

  if (!open) return null;
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-muted">
        Admin preview: the application cards a trainee sees before applying. Press ⌥ Option to hide.
      </p>
      <ApplicationStrip credit={{ state: "none" }} internship={{ state: "none" }} ttlDays={ttlDays} />
    </div>
  );
}
