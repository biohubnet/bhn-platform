"use client";

/** Review-queue list for flagged AI answers — resolve / escalate each. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, Gauge, Check, AlertTriangle, Bot } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface ReviewRow {
  id: string;
  kind: string;
  answerExcerpt: string | null;
  userRating: number | null;
  confidence: number | null;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string;
}

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

export function AiReviewQueue({ initial }: { initial: ReviewRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, reviewStatus: string) {
    setBusy(id);
    await fetch(`/api/ai/review/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    }).catch(() => {});
    setBusy(null);
    if (reviewStatus === "resolved") setRows((r) => r.filter((x) => x.id !== id));
    else setRows((r) => r.map((x) => (x.id === id ? { ...x, reviewStatus } : x)));
    router.refresh();
  }

  if (rows.length === 0) {
    return <Card className="p-10 text-center text-sm text-muted">Nothing in the review queue — no flagged AI answers right now.</Card>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">{rows.length} flagged {rows.length === 1 ? "answer" : "answers"}.</p>
      {rows.map((r) => (
        <Card key={r.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 font-mono text-subtle"><Bot size={10} /> {r.kind}</span>
            {r.userRating != null && r.userRating < 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700"><ThumbsDown size={10} /> thumbs-down</span>
            )}
            {r.confidence != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800"><Gauge size={10} /> confidence {Math.round(r.confidence * 100)}%</span>
            )}
            {r.reviewStatus === "escalated" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"><AlertTriangle size={10} /> escalated</span>
            )}
            <span className="ml-auto text-subtle">{fmt(r.createdAt)}</span>
          </div>

          {r.answerExcerpt ? (
            <pre className="whitespace-pre-wrap rounded-lg border border-line bg-elevated/30 p-3 font-sans text-[12.5px] leading-relaxed text-ink-2">{r.answerExcerpt}</pre>
          ) : (
            <p className="text-[12px] italic text-subtle">No answer text stored for this entry.</p>
          )}
          {r.reviewNote && <p className="text-[12px] text-muted">Note: {r.reviewNote}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => act(r.id, "resolved")}
              disabled={busy === r.id}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check size={13} /> Resolve
            </button>
            <button
              type="button"
              onClick={() => act(r.id, "escalated")}
              disabled={busy === r.id || r.reviewStatus === "escalated"}
              className={cn("inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated disabled:opacity-50")}
            >
              <AlertTriangle size={13} /> Escalate
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
