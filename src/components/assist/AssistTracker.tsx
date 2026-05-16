"use client";
/**
 * Client-side telemetry SDK for the AI behaviour-assist pipeline.
 *
 * Mount-once component (dropped into the dashboard layout) that:
 *   • Captures clicks, dwell, errors, form interactions, rage /
 *     dead clicks, idle transitions.
 *   • Batches events and POSTs them every ~15 seconds, or on
 *     visibilitychange (so we don't lose the last batch when the
 *     user tabs away).
 *   • Never captures keystrokes, field values, coordinates, or raw
 *     HTML — only intent-level signals.
 *
 * The endpoint (`/api/assist/events`) silently drops everything for
 * unauthenticated or unconsented users, so this component is safe
 * to mount platform-wide without a per-user gate.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { AssistEventInput } from "@/lib/assist/types";

const FLUSH_INTERVAL_MS = 15_000;
const RAGE_CLICK_WINDOW_MS = 1_000;
const RAGE_CLICK_THRESHOLD = 3;
const IDLE_THRESHOLD_MS = 60_000;
const SESSION_KEY = "bhn-assist-session";

function mintSessionId(): string {
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) return cached;
  } catch { /* */ }
  const id =
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try { sessionStorage.setItem(SESSION_KEY, id); } catch { /* */ }
  return id;
}

/** Best-effort target label from a click event. Walks up looking
 *  for the most specific human-readable label: aria-label,
 *  data-label, button text, or the closest `<button>`/`<a>` text.
 *  Capped at ~80 chars. Never returns coordinates or raw HTML. */
function describeTarget(el: EventTarget | null): string | null {
  if (!(el instanceof Element)) return null;
  let cur: Element | null = el;
  for (let i = 0; cur && i < 6; i++, cur = cur.parentElement) {
    const aria = cur.getAttribute?.("aria-label");
    if (aria) return aria.slice(0, 80);
    const dataLabel = cur.getAttribute?.("data-label");
    if (dataLabel) return dataLabel.slice(0, 80);
    const tag = cur.tagName?.toLowerCase();
    if (tag === "button" || tag === "a") {
      const text = (cur.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 0) {
        const role = tag === "a" ? "link" : "button";
        return `${text.slice(0, 60)} ${role}`;
      }
    }
  }
  return null;
}

/** Was this click on something "interactive"? Used to flag dead
 *  clicks — the user expected a response, didn't get one. */
function isInteractive(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  let cur: Element | null = el;
  for (let i = 0; cur && i < 6; i++, cur = cur.parentElement) {
    const tag = cur.tagName?.toLowerCase();
    if (tag === "button" || tag === "a" || tag === "input" || tag === "select" || tag === "textarea" || tag === "summary") {
      return true;
    }
    if (cur.getAttribute?.("role") === "button" || cur.getAttribute?.("role") === "link") return true;
    if (cur.hasAttribute?.("onclick")) return true;
  }
  return false;
}

interface ClickEntry {
  ts: number;
  target: string | null;
}

export function AssistTracker() {
  const pathname = usePathname();
  const sessionId = useRef<string>("");
  const queue = useRef<AssistEventInput[]>([]);
  const recentClicks = useRef<ClickEntry[]>([]);
  const lastFlushAt = useRef<number>(0);
  const lastSurfaceAt = useRef<number>(0);
  const lastSurface = useRef<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdle = useRef<boolean>(false);

  // ── session + flushing plumbing ───────────────────────────
  function push(event: Omit<AssistEventInput, "sessionId"> & { sessionId?: string }) {
    queue.current.push({
      sessionId: sessionId.current,
      clientTs: Date.now(),
      ...event,
    });
  }

  async function flush() {
    if (queue.current.length === 0) return;
    const events = queue.current.splice(0, queue.current.length);
    lastFlushAt.current = Date.now();
    try {
      await fetch("/api/assist/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch {
      // Network failed — drop. Telemetry must never error toward
      // the page itself.
    }
  }

  function flushBeacon() {
    if (queue.current.length === 0) return;
    const events = queue.current.splice(0, queue.current.length);
    try {
      const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon("/api/assist/events", blob);
      }
    } catch { /* */ }
  }

  // ── mount: set up handlers ─────────────────────────────────
  useEffect(() => {
    sessionId.current = mintSessionId();
    lastSurfaceAt.current = Date.now();

    const flushInterval = setInterval(flush, FLUSH_INTERVAL_MS);

    function bumpIdle() {
      if (isIdle.current) {
        push({ kind: "idle.end" });
        isIdle.current = false;
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        push({ kind: "idle.start" });
        isIdle.current = true;
      }, IDLE_THRESHOLD_MS);
    }

    function onClick(e: MouseEvent) {
      bumpIdle();
      const target = describeTarget(e.target);
      const interactive = isInteractive(e.target);

      push({
        kind: interactive ? "click" : "dead_click",
        surface: lastSurface.current ?? pathname,
        target: target ?? undefined,
      });

      // Rage-click detection: ≥3 clicks on the same describable
      // target inside a 1-second window.
      const now = Date.now();
      recentClicks.current = recentClicks.current.filter(
        (c) => now - c.ts < RAGE_CLICK_WINDOW_MS,
      );
      recentClicks.current.push({ ts: now, target });
      const sameTarget = recentClicks.current.filter((c) => c.target === target);
      if (sameTarget.length >= RAGE_CLICK_THRESHOLD) {
        push({
          kind: "rage_click",
          surface: lastSurface.current ?? pathname,
          target: target ?? undefined,
          payload: { count: sameTarget.length },
        });
        recentClicks.current = []; // reset so we don't refire on the same burst
      }
    }

    function onFocusIn(e: FocusEvent) {
      const el = e.target as Element | null;
      if (!el) return;
      const tag = el.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        push({
          kind: "form.focus",
          surface: lastSurface.current ?? pathname,
          target: describeTarget(el) ?? `<${tag}>`,
        });
      }
    }

    function onFocusOut(e: FocusEvent) {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (!el) return;
      const tag = el.tagName?.toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      // If the field has content we mark it complete; if it's
      // empty after focus + blur, we mark it abandoned. Length is
      // a stand-in for "did the user actually do something here" —
      // we never log the value itself.
      const hasContent = (el.value ?? "").length > 0;
      push({
        kind: hasContent ? "form.field_complete" : "form.abandon",
        surface: lastSurface.current ?? pathname,
        target: describeTarget(el) ?? `<${tag}>`,
      });
    }

    function onSubmit(e: Event) {
      const form = e.target as Element | null;
      push({
        kind: "form.submit_attempt",
        surface: lastSurface.current ?? pathname,
        target: form?.getAttribute("aria-label") ?? "form",
      });
    }

    function onError(e: ErrorEvent) {
      push({
        kind: "error.client",
        surface: lastSurface.current ?? pathname,
        target: "window.error",
        payload: { msg: (e.message ?? "").slice(0, 200) },
      });
    }

    function onUnhandledRejection(e: PromiseRejectionEvent) {
      push({
        kind: "error.client",
        surface: lastSurface.current ?? pathname,
        target: "unhandledrejection",
        payload: { msg: String(e.reason ?? "").slice(0, 200) },
      });
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // Emit dwell + flush via beacon (survives page unload).
        if (lastSurface.current) {
          push({
            kind: "dwell",
            surface: lastSurface.current,
            payload: { ms: Date.now() - lastSurfaceAt.current },
          });
        }
        flushBeacon();
      } else {
        bumpIdle();
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    document.addEventListener("visibilitychange", onVisibility);
    ["mousemove", "keydown", "scroll", "touchstart"].forEach((evt) => {
      document.addEventListener(evt, bumpIdle, { passive: true });
    });

    bumpIdle();

    return () => {
      clearInterval(flushInterval);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("visibilitychange", onVisibility);
      ["mousemove", "keydown", "scroll", "touchstart"].forEach((evt) => {
        document.removeEventListener(evt, bumpIdle);
      });
      flushBeacon();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pathname change → surface.view + dwell on previous ───
  useEffect(() => {
    const now = Date.now();
    if (lastSurface.current && lastSurface.current !== pathname) {
      queue.current.push({
        sessionId: sessionId.current,
        clientTs: now,
        kind: "dwell",
        surface: lastSurface.current,
        payload: { ms: now - lastSurfaceAt.current },
      });
    }
    lastSurface.current = pathname;
    lastSurfaceAt.current = now;
    queue.current.push({
      sessionId: sessionId.current,
      clientTs: now,
      kind: "surface.view",
      surface: pathname,
    });
  }, [pathname]);

  return null;
}
