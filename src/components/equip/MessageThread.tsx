"use client";
/**
 * Two-way comment thread on a submitted EquipApplication.
 * Rendered both on the applicant's post-submit view and the
 * admin review detail page. The endpoint is the same; both sides
 * see the same messages.
 *
 * Polls every 30s when mounted so a reviewer note shows up
 * promptly on the applicant's screen without a manual refresh.
 */
import { useEffect, useState } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null };
}

export function MessageThread({ applicationId, currentUserId }: { applicationId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch(`/api/equip/applications/${applicationId}/messages`, { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { messages: Message[] };
      setMessages(j.messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post() {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/equip/applications/${applicationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (res.ok) {
        setDraft("");
        await load();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4 space-y-3 surface-shadow">
      <header className="flex items-center gap-2">
        <MessageSquare size={14} className="text-brand-600" />
        <h3 className="text-sm font-bold text-fg">Comment thread</h3>
        <span className="text-[10px] text-subtle ml-auto">Auto-refreshes every 30s</span>
      </header>

      {loading ? (
        <p className="text-[11px] text-muted inline-flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Loading messages…
        </p>
      ) : messages.length === 0 ? (
        <p className="text-[11px] text-subtle">No messages yet. Reviewer notes and your replies appear here.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const isMine = m.user.id === currentUserId;
            return (
              <li
                key={m.id}
                className={
                  "rounded-xl p-3 max-w-[85%] " +
                  (isMine
                    ? "ml-auto bg-brand-50/60 ring-1 ring-brand-200"
                    : "bg-elevated/40 ring-1 ring-line")
                }
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">
                  {m.user.name ?? (isMine ? "You" : "Reviewer")} · {new Date(m.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-fg leading-relaxed mt-1 whitespace-pre-wrap">{m.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-line pt-3 flex items-end gap-2">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a reply or note…"
          className="flex-1 bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
        />
        <button
          type="button"
          onClick={post}
          disabled={!draft.trim() || posting}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg"
        >
          {posting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Send
        </button>
      </div>
    </section>
  );
}
