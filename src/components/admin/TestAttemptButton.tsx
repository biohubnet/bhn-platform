"use client";

/**
 * TestAttemptButton — spins up a fresh SimulationAttempt for the
 * calling admin against the given Simulation and redirects to the
 * player. Used after a payload edit (to verify the change feels
 * right) and on the request detail page (to review a colleague's
 * sim).
 *
 * `variant` controls the visual emphasis — "primary" for the
 * editor's main CTA after a save lands, "secondary" for context
 * places where it's a complementary action.
 *
 * `disabled` is set by the caller when there are unsaved edits in
 * an editor — launching a test attempt against the OLD published
 * payload while the editor shows the NEW one would confuse the
 * admin. Tooltip via the title attribute explains the gate.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

interface Props {
  simulationId: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  disabledHint?: string;
  /** Override default label, e.g. "Try this sim yourself". */
  label?: string;
}

export function TestAttemptButton({
  simulationId,
  variant = "primary",
  disabled = false,
  disabledHint,
  label = "Launch test attempt",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (disabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/simulations/${simulationId}/test-attempt`,
        { method: "POST" },
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        attemptId?: string;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.attemptId) {
        setError(j.error ?? `Couldn't start a test attempt (HTTP ${res.status}).`);
        setBusy(false);
        return;
      }
      router.push(`/simulator/${j.attemptId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const baseClass =
    "inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const variantClass =
    variant === "primary"
      ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
      : "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={go}
        disabled={disabled || busy}
        title={disabled && disabledHint ? disabledHint : undefined}
        className={`${baseClass} ${variantClass}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
        {busy ? "Launching…" : label}
      </button>
      {disabled && disabledHint && !busy && (
        <span className="text-[10.5px] text-amber-700">{disabledHint}</span>
      )}
      {error && (
        <span className="text-[10.5px] text-rose-700">{error}</span>
      )}
    </div>
  );
}
