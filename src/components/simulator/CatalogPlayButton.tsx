"use client";

/**
 * CatalogPlayButton — "Start" / "Replay" affordance on each catalog
 * card on /simulator. POSTs to /api/simulator/play/[simulationId],
 * which creates a fresh SimulationAttempt for the calling user, then
 * redirects to the player.
 *
 * Why a dedicated client component instead of a plain <button> with
 * inline onClick?
 *   • The parent /simulator/page.tsx is a server component (it does
 *     a Prisma read at request time). It can't carry useTransition /
 *     useRouter / event handlers — those have to live in a client
 *     boundary.
 *   • Pulling just the button into a tiny client island keeps the
 *     server-rendered card markup (title, JD snippet, company) on the
 *     server-render path, which is the bulk of the bytes.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Play } from "lucide-react";

interface Props {
  simulationId: string;
  /** "Start" for first-time, "Replay" if the user already finished an
   *  attempt for this sim. The endpoint behaviour is identical — the
   *  label only carries the framing. */
  label: string;
}

export function CatalogPlayButton({ simulationId, label }: Props) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function play() {
    setError(null);
    startBusy(async () => {
      const res = await fetch(`/api/simulator/play/${simulationId}`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as {
        attemptId?: string;
        error?: string;
      };
      if (!res.ok || !j.attemptId) {
        setError(j.error ?? `Couldn't start (HTTP ${res.status}).`);
        return;
      }
      router.push(`/simulator/${j.attemptId}`);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={play}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {label}
        <ArrowRight className="h-3 w-3" />
      </button>
      {error && (
        <p className="text-[11px] text-rose-700 leading-snug">{error}</p>
      )}
    </div>
  );
}
