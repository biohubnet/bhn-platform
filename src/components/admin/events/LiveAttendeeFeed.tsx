"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, UserPlus, CheckCircle2, Pause, Play } from "lucide-react";

/**
 * Live attendee feed — polls /api/admin/events/[slug]/live every
 * POLL_INTERVAL_MS (5 s by default) and shows:
 *   • Live counts (total / confirmed / pending / waitlist / checked-in)
 *     with a subtle pulse when any number changes
 *   • Recent activity feed: new registrations + new check-ins, with
 *     timestamps relative to "now"
 *
 * Auto-refreshes the parent's registrations table via router.refresh
 * when something new comes in, so the full table stays in sync
 * without a hard reload.
 *
 * Pausable — click the Pause button to stop polling. Useful when an
 * admin wants to take a screenshot or scroll through the existing
 * table without auto-refresh jitter.
 */

const POLL_INTERVAL_MS = 5_000;

interface LiveResponse {
  now: string;
  counts: {
    total: number;
    confirmed: number;
    pending: number;
    waitlist: number;
    checkedIn: number;
  };
  newRegistrations: Array<{
    id: string;
    registrationStatus: string;
    waitlistPosition: number | null;
    attendeeType: string;
    createdAt: string;
    displayName: string | null;
    email: string | null;
  }>;
  newCheckIns: Array<{
    id: string;
    checkedInAt: string | null;
    displayName: string | null;
  }>;
}

export function LiveAttendeeFeed({
  slug,
  initialCounts,
}: {
  slug: string;
  initialCounts: LiveResponse["counts"];
}) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [paused, setPaused] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<string>(() => new Date().toISOString());
  const [feed, setFeed] = useState<
    Array<{ kind: "registration" | "check-in"; id: string; name: string; meta: string; ts: string }>
  >([]);
  const [pulse, setPulse] = useState<Set<keyof LiveResponse["counts"]>>(new Set());

  // Stash the previous counts so we can flash specific tiles on change.
  const prevCountsRef = useRef(initialCounts);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(
          `/api/admin/events/${slug}/live?since=${encodeURIComponent(lastPolledAt)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as LiveResponse;
        if (cancelled) return;

        // Diff counts to drive the pulse.
        const changed = new Set<keyof LiveResponse["counts"]>();
        (Object.keys(json.counts) as (keyof LiveResponse["counts"])[]).forEach((k) => {
          if (json.counts[k] !== prevCountsRef.current[k]) changed.add(k);
        });
        if (changed.size > 0) {
          setPulse(changed);
          setTimeout(() => setPulse(new Set()), 900);
        }

        prevCountsRef.current = json.counts;
        setCounts(json.counts);
        setLastPolledAt(json.now);

        // Prepend new events to the feed.
        const newItems: typeof feed = [];
        for (const r of json.newRegistrations) {
          const meta = r.registrationStatus === "waitlist"
            ? `waitlist #${r.waitlistPosition ?? "?"}`
            : r.registrationStatus;
          newItems.push({
            kind: "registration",
            id: `reg-${r.id}`,
            name: r.displayName ?? r.email ?? "Someone",
            meta,
            ts: r.createdAt,
          });
        }
        for (const c of json.newCheckIns) {
          newItems.push({
            kind: "check-in",
            id: `ci-${c.id}`,
            name: c.displayName ?? "Attendee",
            meta: "checked in",
            ts: c.checkedInAt ?? json.now,
          });
        }
        if (newItems.length > 0) {
          setFeed((prev) => [...newItems, ...prev].slice(0, 30));
          // Refresh the parent's registrations table so it stays
          // in sync without a hard reload.
          router.refresh();
        }
      } catch {
        // Swallow — transient errors are expected on every flaky
        // network. The next tick retries.
      } finally {
        if (!cancelled && !paused) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    }

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // lastPolledAt updates every tick — including it would tick
    // forever; instead the effect re-runs only on pause/slug change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, slug]);

  return (
    <div className="rounded-2xl border border-line bg-card p-4 surface-shadow space-y-4">
      <header className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle inline-flex items-center gap-2">
          <span className="relative inline-flex w-2 h-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${paused ? "bg-fg-subtle" : "bg-emerald-500"}`}
            />
            {!paused && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 animate-ping opacity-60" />
            )}
          </span>
          Live · polls every {POLL_INTERVAL_MS / 1000}s
        </p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"
        >
          {paused ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
        </button>
      </header>

      {/* Counts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <CountTile label="Total" value={counts.total} pulsing={pulse.has("total")} />
        <CountTile label="Confirmed" value={counts.confirmed} pulsing={pulse.has("confirmed")} tone="emerald" />
        <CountTile label="Pending" value={counts.pending} pulsing={pulse.has("pending")} tone="amber" />
        <CountTile label="Waitlist" value={counts.waitlist} pulsing={pulse.has("waitlist")} tone="violet" />
        <CountTile label="Checked in" value={counts.checkedIn} pulsing={pulse.has("checkedIn")} tone="emerald" />
      </div>

      {/* Activity feed */}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-fg-subtle mb-2">Recent activity</p>
        {feed.length === 0 ? (
          <p className="text-xs text-muted italic">Waiting for activity…</p>
        ) : (
          <ul className="space-y-1.5 max-h-64 overflow-y-auto">
            {feed.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-300"
              >
                {item.kind === "registration" ? (
                  <UserPlus size={12} className="text-brand-700 shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                )}
                <span className="font-semibold text-fg truncate flex-1 min-w-0">{item.name}</span>
                <span className="text-fg-subtle whitespace-nowrap">{item.meta}</span>
                <span className="text-fg-subtle whitespace-nowrap font-mono tabular-nums text-[10px]">
                  {relativeTime(item.ts)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CountTile({
  label, value, pulsing, tone = "neutral",
}: {
  label: string;
  value: number;
  pulsing: boolean;
  tone?: "neutral" | "emerald" | "amber" | "violet";
}) {
  const tint =
    tone === "emerald" ? "border-emerald-200 bg-emerald-50/40" :
    tone === "amber"   ? "border-amber-200 bg-amber-50/40"   :
    tone === "violet"  ? "border-violet-200 bg-violet-50/40" :
    "border-line bg-background";
  return (
    <div
      className={`rounded-xl border ${tint} p-3 transition-all ${pulsing ? "scale-[1.03] ring-2 ring-brand-300" : ""}`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle">{label}</p>
      <p className="text-2xl font-bold text-fg tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}
