"use client";

/**
 * Logs one employer view of a trainee's profile, for the "profile views"
 * figure on the trainee's dashboard. A POST from an effect, and only
 * once the tab is actually visible — never a write during a server
 * render (prefetches and background tabs would inflate the count).
 * The server keeps at most one row per viewer, trainee and day, and
 * ignores anyone who isn't an employer.
 */
import { useEffect } from "react";

export function RecordProfileView({ userId, surface }: { userId: string; surface: "talent_pool" | "applicant" | "resume" }) {
  useEffect(() => {
    let sent = false;
    const send = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      void fetch("/api/profile-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, surface }),
        keepalive: true,
      }).catch(() => undefined);
    };
    send();
    document.addEventListener("visibilitychange", send);
    return () => document.removeEventListener("visibilitychange", send);
  }, [userId, surface]);
  return null;
}
