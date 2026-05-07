"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TARGETS: { id: string; label: string; description: string }[] = [
  { id: "trainee",    label: "Trainee",    description: "Default learner experience" },
  { id: "evaluating", label: "Evaluating", description: "Trial-tier learner" },
  { id: "instructor", label: "Instructor", description: "Course author tools" },
  { id: "admin",      label: "Admin",      description: "Full admin minus superadmin" },
];

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm transition-colors",
          actingAs
            ? "bg-brand-50 text-brand-700 hover:bg-brand-100"
            : "hover:bg-elevated text-muted hover:text-fg"
        )}
        aria-label="Switch viewing role"
      >
        <Eye size={16} />
        <span className="flex-1 text-left">
          <span className="block leading-tight">View as</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-subtle">
            {actingAs ? actingAs : "superadmin"}
          </span>
        </span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 border border-line-strong rounded-2xl shadow-2xl shadow-black/20 p-2 z-30 min-w-[240px] animate-fade-in"
          style={{ background: "var(--popover-bg)" }}
        >
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
