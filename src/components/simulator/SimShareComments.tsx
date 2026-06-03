"use client";

/**
 * Public discussion thread for a shared Simulation. Anyone — including
 * logged-out visitors — can post with their name. Rendered below the
 * playable guest player on /share/sim/[token].
 */
import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

type Comment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export function SimShareComments({
  token,
  initialComments,
}: {
  token: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember the commenter's name across posts/visits.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("bhn-sim-comment-name");
    if (saved) setName(saved);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) {
      setError("Add your name and a comment.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/sim/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, body: trimmedBody, website }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        comment?: Comment | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not post your comment.");
      }
      if (data.comment) {
        setComments((prev) => [...prev, data.comment as Comment]);
      }
      setBody("");
      if (typeof window !== "undefined") {
        localStorage.setItem("bhn-sim-comment-name", trimmedName);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-10 max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-fg-subtle" />
        <h2 className="text-[15px] font-semibold text-fg">
          Discussion
          <span className="ml-2 text-[13px] font-normal text-fg-subtle">
            {comments.length}
          </span>
        </h2>
      </div>

      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-fg-subtle">
            No comments yet — be the first to weigh in.
          </li>
        )}
        {comments.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-line/70 bg-card-solid px-4 py-3"
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold text-fg">
                {c.authorName}
              </span>
              <span
                className="text-[11px] tabular-nums text-fg-subtle"
                suppressHydrationWarning
              >
                {formatWhen(c.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.6] text-fg-muted">
              {c.body}
            </p>
          </li>
        ))}
      </ul>

      <form
        onSubmit={submit}
        className="mt-5 rounded-lg border border-line/70 bg-card-solid p-4"
      >
        <div className="mb-2.5">
          <label className="mb-1 block text-[12px] text-fg-subtle">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="e.g. Jordan from the cohort"
            className="w-full rounded-md border border-line bg-raised/30 px-3 py-2 text-[13.5px] text-fg outline-none focus:border-brand-400"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[12px] text-fg-subtle">
            Comment
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What did you think of this simulation?"
            className="w-full resize-y rounded-md border border-line bg-raised/30 px-3 py-2 text-[13.5px] leading-[1.6] text-fg outline-none focus:border-brand-400"
          />
        </div>

        {/* Honeypot — off-screen; bots fill it, humans don't. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          aria-hidden
        />

        {error && <p className="mb-2 text-[12.5px] text-rose-600">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-fg-subtle">
            Posts publicly with your name.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Post comment
          </button>
        </div>
      </form>
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}
