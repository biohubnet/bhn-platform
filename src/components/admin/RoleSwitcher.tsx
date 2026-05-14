"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TARGETS: { id: string; label: string; description: string }[] = [
  { id: "trainee",    label: "Trainee",     description: "Default learner experience" },
  { id: "evaluating", label: "Evaluating",  description: "Trial-tier learner" },
  { id: "employer",   label: "Employer HR", description: "Industry partner posting jobs" },
  { id: "instructor", label: "Instructor",  description: "Course author tools" },
  { id: "admin",      label: "Admin",       description: "Full admin minus superadmin" },
];

// Inline quick-toggle icons (T / HR) used to sit beside the main "View
// as" dropdown for one-tap Trainee / Employer-HR switches. Removed
// 2026-05-14 to declutter the sidebar footer. The same two switches
// remain available via:
//   • the dropdown (every role is one click in)
//   • the `x` / `xx` keyboard shortcuts (ADR-0003 in docs/ux/decisions/)
// so this is a UI simplification, not a capability removal.

interface Props {
  actingAs?: string | null;
}

export function RoleSwitcher({ actingAs }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function pick(id: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/act-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: id }),
      });
      setOpen(false);
      // Hard-refresh so every server-rendered nav, badge, gate re-runs.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await fetch("/api/admin/act-as", { method: "DELETE" });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  // Currently-active role label — drives the compact pill below.
  // Truncated to 8 chars so even long role names ("instructor") stay
  // inside the sidebar's 220-px-ish width without ellipsising the
  // chevron off the right edge.
  const activeLabel = actingAs ?? "superadmin";

  return (
    <div ref={ref} className="relative">
      {/* Single 28-px-tall row that fits the sidebar even at its
          narrowest. One pill: eye-icon · current-role · chevron —
          opens the full dropdown with all 5 target roles + a "stop
          viewing-as" affordance. The inline quick-toggle icons that
          used to sit beside this pill (Trainee + Employer HR) were
          removed 2026-05-14 to declutter; the same switches remain
          one click away in the dropdown, and one keypress away via
          the `x` / `xx` shortcuts (ADR-0003). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className={cn(
          "flex items-center gap-1.5 min-w-0 w-full px-2 py-1 rounded-lg text-[11px] transition-colors disabled:opacity-50",
          actingAs
            ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
            : "hover:bg-elevated text-muted hover:text-fg"
        )}
        aria-label="Switch viewing role"
        title={`View as ${activeLabel}`}
      >
        <Eye size={12} className="shrink-0" />
        <span className="flex-1 min-w-0 text-left font-semibold uppercase tracking-[0.1em] leading-none truncate">
          {activeLabel}
        </span>
        <ChevronDown size={10} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 popover p-2 z-30 min-w-[240px] animate-fade-in">
          {actingAs && (
            <div className="mb-2 pb-2 border-b border-line px-1">
              <button
                type="button"
                onClick={stop}
                disabled={busy}
                className="w-full text-xs font-medium px-2.5 py-2 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-40 transition-colors"
              >
                Stop viewing-as · Restore superadmin
              </button>
            </div>
          )}
          <p className="px-2 py-1.5 text-[10px] font-semibold text-subtle uppercase tracking-[0.18em]">
            Preview as another role
          </p>
          <div className="space-y-1">
            {TARGETS.map((t) => {
              const active = actingAs === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.id)}
                  disabled={busy}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all",
                    active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-elevated"
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className={cn(
                      "block text-[13px] font-medium leading-tight",
                      active ? "text-brand-700" : "text-fg"
                    )}>
                      {t.label}
                    </span>
                    <span className="block text-[10px] text-subtle leading-tight">
                      {t.description}
                    </span>
                  </span>
                  {active && <Check size={12} className="text-brand-600" />}
                </button>
              );
            })}
          </div>

          <p className="px-2 pt-2 text-[10px] text-subtle leading-snug">
            Sessions auto-revert after 1 hour. Every switch is logged.
          </p>
        </div>
      )}
    </div>
  );
}
