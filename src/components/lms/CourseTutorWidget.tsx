"use client";
import { useState } from "react";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Summarize the main concepts in plain language.",
  "What should I focus on if I have 20 minutes?",
  "Give me three sample exam questions on this material.",
];

export function CourseTutorWidget({ courseId }: { courseId: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    setError(null);
    setTurns((t) => [...t, { role: "user", content: q.trim() }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Couldn't answer");
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: j.answer ?? "" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-line overflow-hidden">
      <div className="px-5 py-3 border-b border-line flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-sm">
          <Sparkles size={13} />
        </div>
        <h3 className="font-semibold text-fg">Ask about this course</h3>
        <span className="text-xs text-subtle ml-auto">Grounded in the course content</span>
      </div>

      <div className="p-5 space-y-3 max-h-[420px] overflow-y-auto bg-elevated/40">
        {turns.length === 0 ? (
          <div>
            <p className="text-sm text-subtle text-center mb-4">
              Ask anything — concepts, study tips, or quick clarifications.
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={busy}
                  className="w-full text-left text-sm text-fg bg-card border border-line rounded-lg px-3 py-2 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={cn("flex gap-2", t.role === "user" ? "justify-end" : "justify-start")}>
              {t.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Bot size={13} />
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line max-w-[85%]",
                t.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-card border border-line text-fg rounded-bl-sm"
              )}>
                {t.content}
              </div>
              {t.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-elevated text-muted flex items-center justify-center shrink-0">
                  <UserIcon size={13} />
                </div>
              )}
            </div>
          ))
        )}
        {busy && <p className="text-xs text-subtle">Thinking…</p>}
        {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
      </div>

      <div className="p-3 border-t border-line bg-card">
        <div className="flex items-end gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ask(input)}
            placeholder="Type your question…"
            disabled={busy}
            className="flex-1 bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
