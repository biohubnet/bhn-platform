"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Combined Seed + Clear admin tray.
 *
 * Wraps the two complementary endpoints into one row:
 *   • POST /api/admin/demo-seed       — creates a small batch of
 *     plausible demo rows on demo/sandbox accounts
 *   • POST /api/admin/clear-test-data — removes every row in this
 *     entity scope that belongs to a demo/sandbox account
 *
 * The pair is logically airtight: the seed only ever attaches new
 * rows to demo/sandbox accountKinds, and the clear endpoint targets
 * exactly those accountKinds. So whatever this tray inserts, this
 * tray can take back out — never more, never less.
 *
 * Replaces a per-page bespoke component for each entity. Drop the
 * tray into any admin page that has a Clear button today, point
 * `entity` (+ optional `scope`) at the right rows, and the page
 * gets a matching Seed button for free.
 */
export type DemoSeedEntity =
  | "internship_posting"
  | "form_submission"
  | "credit_application"
  | "pool_exit_feedback"
  // Self-scoped — these write rows on the calling admin's own user
  // row, so they show up immediately on the admin's view of pages
  // like Application Tracker / My Skills / Interviews / Stories /
  // Buddies / Matches.
  | "user_application_status"
  | "user_skill"
  | "user_interview"
  | "user_star_story"
  | "user_buddy_pair"
  | "user_matches";

interface Props {
  entity: DemoSeedEntity;
  scope?: { formSlug?: string };
  /** Override the eye-line label, e.g. "demo postings", "demo submissions". */
  noun?: string;
  /** Override the confirm-dialog body for Clear if the default doesn't fit. */
  clearHelp?: string;
}

const DEFAULT_NOUNS: Record<DemoSeedEntity, string> = {
  internship_posting:       "demo postings",
  form_submission:          "demo submissions",
  credit_application:       "demo applications",
  pool_exit_feedback:       "demo feedback",
  user_application_status:  "demo application rows",
  user_skill:               "demo skills",
  user_interview:           "demo interviews",
  user_star_story:          "demo STAR stories",
  user_buddy_pair:          "demo buddy pairs",
  user_matches:             "matches scenario",
};

export function DemoSeedAndClearTray({ entity, scope, noun, clearHelp }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const nounLabel = noun ?? DEFAULT_NOUNS[entity];

  function showFlash(msg: string) {
    setFlash(msg);
    setError(null);
    setTimeout(() => setFlash(null), 5000);
  }

  async function seed() {
    setBusy("seed");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/demo-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, scope }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: number;
        // `note` surfaces non-fatal diagnostics from the server (e.g.
        // "Couldn't bootstrap a demo employer …"). We show it instead
        // of a bare "Seeded 0" so the admin knows why.
        note?: string;
      };
      if (!res.ok) {
        setError(j.error ?? "Couldn't seed.");
        return;
      }
      const created = j.created ?? 0;
      if (created === 0 && j.note) {
        setError(j.note);
      } else {
        showFlash(
          j.note
            ? `Seeded ${created} ${nounLabel} (${j.note}).`
            : `Seeded ${created} ${nounLabel}.`,
        );
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    // No confirm prompt — Clear-demo only ever touches rows attached
    // to demo accounts, the action is reversible with a Seed press,
    // and the platform-wide convention (set when phantom clears lost
    // their prompts) is that demo-data buttons fire on first click.
    setBusy("clear");
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/clear-test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, scope }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string; deleted?: number; byKind?: Record<string, number>;
      };
      if (!res.ok) {
        setError(j.error ?? "Couldn't clear.");
        return;
      }
      const parts = Object.entries(j.byKind ?? {}).map(([k, n]) => `${n} ${k}`).join(", ");
      showFlash(
        j.deleted === 0
          ? "Nothing to clear."
          : `Cleared ${j.deleted}${parts ? ` (${parts})` : ""}.`,
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-glow rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-900">
        Admin · Demo data
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => { void seed(); })}
        disabled={busy !== null}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300 hover:bg-amber-200 font-semibold disabled:opacity-50 transition-colors"
      >
        <Sparkles size={11} />
        {busy === "seed" ? "Seeding…" : `Seed ${nounLabel}`}
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => { void clear(); })}
        disabled={busy !== null}
        title={clearHelp ?? `Delete every ${nounLabel} from demo accounts. The accounts themselves stay.`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 font-semibold disabled:opacity-50 transition-colors"
      >
        <Trash2 size={11} />
        {busy === "clear" ? "Clearing…" : "Clear demo"}
      </button>
      {flash && (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-md px-2 py-1 font-semibold">
          <CheckCircle2 size={11} /> {flash}
        </span>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-md px-2 py-1 font-semibold">
          <AlertTriangle size={11} /> {error}
        </span>
      )}
      <span className="ml-auto text-[10px] text-amber-800/80">
        Seed creates rows on demo accounts so Clear can find them.
      </span>
    </div>
  );
}
