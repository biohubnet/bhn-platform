"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ThumbsDown, Loader2, AlertCircle, X } from "lucide-react";
import { THEMES, type ThemeId } from "@/components/ui/ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Theme voting panel — pick one favourite + one least-favourite.
 *
 * UX choices
 *   • Two-button-per-card layout: each theme card carries a Heart
 *     and a ThumbsDown button. Solid icon when selected. Single
 *     click toggles, so re-clicking the active button clears the
 *     vote (matches the DELETE endpoint).
 *   • Optimistic state. On API failure the local state reverts and
 *     an error banner surfaces.
 *   • Conflict resolution lives on the server (deleteMany on the
 *     opposite sentiment with the same themeId, in the upsert
 *     transaction). Client mirrors that: setting favourite on a
 *     theme you previously disliked silently clears the dislike.
 */

// Mirror of SWATCH in ThemePicker.tsx. Kept duplicated rather than
// extracted because the picker's Swatch component is private to
// that file. If a third surface needs swatches, hoist to a shared
// module then.
const SWATCH: Record<ThemeId, [string, string, string]> = {
  light:      ["#ffffff", "#3b6cef", "#0b1b3b"],
  dark:       ["#0f1d3d", "#5e8ff7", "#eaf0fb"],
  scientific: ["#ffffff", "#0ea5e9", "#1e293b"],
  rosalind:   ["#fbf6ec", "#485940", "#a8625a"],
  mist:       ["#e8edf3", "#3e5775", "#c8d2dd"],
  hitech:     ["#06121f", "#00d4ff", "#e3f7ff"],
  sakura:     ["#fffaf9", "#d04c61", "#3a1f24"],
  coldbrew:   ["#18100a", "#d49a6e", "#f5e8d0"],
  icecream:   ["#fff8f3", "#c5234a", "#b8e0d2"],
  dryice:     ["#0d1a23", "#8fc8dc", "#e0eef5"],
  retro8bit:  ["#1a0d2e", "#ff4dff", "#00ffff"],
  salty:      ["#fbfdfd", "#2e4750", "#8aa3ad"],
  chilli:     ["#240e0a", "#ff6b3d", "#ffeacf"],
};

function Swatch({ id, size = 36 }: { id: ThemeId; size?: number }) {
  const [card, accent, fg] = SWATCH[id];
  return (
    <span
      className="relative inline-block overflow-hidden border border-line shadow-sm rounded-lg shrink-0"
      style={{ width: size, height: size, background: card }}
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: "45%", background: accent }}
      />
      <span
        className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full"
        style={{ background: fg }}
      />
    </span>
  );
}

interface Props {
  initialFavorite: string | null;
  initialLeastFavorite: string | null;
}

export function ThemeVotePanel({ initialFavorite, initialLeastFavorite }: Props) {
  const router = useRouter();
  const [fav, setFav] = useState<string | null>(initialFavorite);
  const [least, setLeast] = useState<string | null>(initialLeastFavorite);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setVote(themeId: ThemeId, sentiment: "favorite" | "least_favorite") {
    const key = `${sentiment}:${themeId}`;
    setBusyKey(key);
    setError(null);

    // Optimistic update — also mirror the server's "opposite-sentiment
    // on same theme gets cleared" rule client-side.
    const prevFav = fav;
    const prevLeast = least;
    if (sentiment === "favorite") {
      setFav(themeId);
      if (least === themeId) setLeast(null);
    } else {
      setLeast(themeId);
      if (fav === themeId) setFav(null);
    }

    try {
      const res = await fetch("/api/themes/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId, sentiment }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Vote failed");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setFav(prevFav);
      setLeast(prevLeast);
    } finally {
      setBusyKey(null);
    }
  }

  async function clearVote(sentiment: "favorite" | "least_favorite") {
    const key = `clear:${sentiment}`;
    setBusyKey(key);
    setError(null);

    const prevFav = fav;
    const prevLeast = least;
    if (sentiment === "favorite") setFav(null);
    else setLeast(null);

    try {
      const res = await fetch(`/api/themes/vote?sentiment=${sentiment}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Clear failed");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setFav(prevFav);
      setLeast(prevLeast);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
        <h2 className="text-base font-bold text-fg tracking-tight">Your votes</h2>
        <p className="text-xs text-muted">
          One favourite, one least-favourite. Click an active button to clear it.
        </p>
      </header>

      {/* Current selection summary */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <CurrentVoteCard
          label="Favourite"
          themeId={fav}
          icon={Heart}
          accentClass="text-rose-600"
          onClear={() => clearVote("favorite")}
          busy={busyKey === "clear:favorite"}
        />
        <CurrentVoteCard
          label="Least favourite"
          themeId={least}
          icon={ThumbsDown}
          accentClass="text-amber-700"
          onClear={() => clearVote("least_favorite")}
          busy={busyKey === "clear:least_favorite"}
        />
      </div>

      {error && (
        <div className="mb-4 inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Grid of all 13 themes */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const isFav = fav === t.id;
          const isLeast = least === t.id;
          const favBusy = busyKey === `favorite:${t.id}`;
          const leastBusy = busyKey === `least_favorite:${t.id}`;
          return (
            <li
              key={t.id}
              className={cn(
                "rounded-xl border bg-elevated p-3 flex flex-col gap-3",
                isFav
                  ? "border-rose-300 ring-1 ring-rose-200"
                  : isLeast
                  ? "border-amber-300 ring-1 ring-amber-200"
                  : "border-line",
              )}
            >
              <div className="flex items-start gap-3">
                <Swatch id={t.id} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg tracking-tight leading-tight">{t.name}</p>
                  <p className="text-[11px] text-muted leading-snug line-clamp-2 mt-0.5">{t.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => (isFav ? clearVote("favorite") : setVote(t.id, "favorite"))}
                  disabled={busyKey !== null}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50",
                    isFav
                      ? "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300 hover:bg-rose-200"
                      : "bg-card text-muted ring-1 ring-inset ring-line hover:bg-card hover:text-rose-700",
                  )}
                  aria-pressed={isFav}
                >
                  {favBusy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Heart size={12} fill={isFav ? "currentColor" : "none"} />
                  )}
                  {isFav ? "Favourite" : "Favour"}
                </button>
                <button
                  type="button"
                  onClick={() => (isLeast ? clearVote("least_favorite") : setVote(t.id, "least_favorite"))}
                  disabled={busyKey !== null}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50",
                    isLeast
                      ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 hover:bg-amber-200"
                      : "bg-card text-muted ring-1 ring-inset ring-line hover:bg-card hover:text-amber-800",
                  )}
                  aria-pressed={isLeast}
                >
                  {leastBusy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ThumbsDown size={12} fill={isLeast ? "currentColor" : "none"} />
                  )}
                  {isLeast ? "Least fav" : "Dislike"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CurrentVoteCard({
  label,
  themeId,
  icon: Icon,
  accentClass,
  onClear,
  busy,
}: {
  label: string;
  themeId: string | null;
  icon: React.ElementType;
  accentClass: string;
  onClear: () => void;
  busy: boolean;
}) {
  const theme = themeId
    ? THEMES.find((t) => t.id === themeId)
    : undefined;
  return (
    <div className="rounded-xl border border-line bg-elevated p-3 flex items-center gap-3">
      <Icon size={16} className={cn("shrink-0", accentClass)} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
        <p className="text-sm font-semibold text-fg truncate">
          {theme ? theme.name : <span className="text-subtle italic">Not picked yet</span>}
        </p>
      </div>
      {theme && (
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="p-1 rounded text-muted hover:bg-card hover:text-fg disabled:opacity-40"
          title="Clear"
          aria-label="Clear vote"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
        </button>
      )}
    </div>
  );
}
