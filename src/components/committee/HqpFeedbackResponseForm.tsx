"use client";
/**
 * Member-facing feedback form. One textarea per topic, with
 * 800ms auto-save mirroring the rest of the platform's forms.
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, Send, MessageSquare } from "lucide-react";
import type { FeedbackTopic } from "@/lib/hqp/rounds";

interface Props {
  roundId: string;
  topics: FeedbackTopic[];
  initialAnswers: Record<string, string>;
  alreadySubmitted: boolean;
  closed: boolean;
}

export function HqpFeedbackResponseForm({ roundId, topics, initialAnswers, alreadySubmitted, closed }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const readOnly = alreadySubmitted || closed;

  useEffect(() => {
    if (readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(answers, "save"), 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, readOnly]);

  async function save(payload: Record<string, string>, action: "save" | "submit") {
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/committee/hqp/rounds/${roundId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Save failed.");
        setSaveState("error");
        return false;
      }
      setSaveState("saved");
      setLastSavedAt(new Date());
      return true;
    } catch (e) {
      setError((e as Error).message);
      setSaveState("error");
      return false;
    }
  }

  function submit() {
    startTransition(async () => {
      const ok = await save(answers, "submit");
      if (ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700 inline-flex items-center gap-1.5">
          <MessageSquare size={11} /> Feedback round
        </p>
        {!readOnly && <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />}
        {alreadySubmitted && <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Submitted</span>}
        {closed && !alreadySubmitted && <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Round closed</span>}
      </header>

      {topics.length === 0 && (
        <p className="text-sm text-subtle italic">This round has no topics yet — that's an admin authoring bug, please flag it.</p>
      )}

      {topics.map((t) => (
        <section key={t.id} className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-violet-700">{t.label}</p>
          <p className="text-sm text-fg leading-snug">{t.question}</p>
          {readOnly ? (
            <div className="bg-elevated/40 rounded-lg p-3 text-sm text-fg whitespace-pre-wrap min-h-[3em]">
              {(answers[t.id] ?? "").trim() || <span className="text-subtle italic">No response.</span>}
            </div>
          ) : (
            <textarea
              rows={4}
              value={answers[t.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: e.target.value }))}
              placeholder="Your thoughts — be specific, the program team reads every word."
              className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
            />
          )}
        </section>
      ))}

      {!readOnly && topics.length > 0 && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 flex items-center gap-3 justify-between flex-wrap">
          <div className="text-xs text-violet-900 space-y-0.5">
            <p className="font-bold text-sm">Done?</p>
            <p className="opacity-80">Submit when your answers are final. Drafts auto-save until then.</p>
          </div>
          <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl">
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Submit feedback
          </button>
        </section>
      )}

      {error && (
        <p className="text-[11px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

function SaveIndicator({ state, lastSavedAt }: { state: string; lastSavedAt: Date | null }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-[10px] text-subtle"><Loader2 size={11} className="animate-spin" /> Saving…</span>;
  if (state === "saved" && lastSavedAt) return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><Check size={11} /> Saved {Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000))} s ago</span>;
  if (state === "error") return <span className="inline-flex items-center gap-1 text-[10px] text-rose-700"><AlertCircle size={11} /> Save failed</span>;
  return <span className="text-[10px] text-subtle">Auto-save on</span>;
}
