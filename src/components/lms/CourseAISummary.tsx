"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, RefreshCw, Pencil, Save, X, Wand2, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  courseId: string;
  initialSummary: string | null;
  canManage: boolean;
}

type Mode = "view" | "edit" | "refine";

/**
 * AI-generated course summary with three management modes for staff:
 *
 *   • view    — read-only paragraph + Regenerate / Edit / Refine chips
 *   • edit    — direct textarea, save persists verbatim (no AI call)
 *   • refine  — short prompt input ("make it shorter", "more
 *               technical"); AI rewrites the existing summary
 *               applying the instruction
 *
 * Trainees only see view mode.
 */
export function CourseAISummary({ courseId, initialSummary, canManage }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Edit mode
  const [draft, setDraft] = useState(initialSummary ?? "");
  // Refine mode
  const [refinePrompt, setRefinePrompt] = useState("");

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  async function generate() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/summary`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Generation failed"); return; }
      setSummary(j.aiSummary);
      setDraft(j.aiSummary ?? "");
      flashSaved();
      router.refresh();
    } finally { setBusy(false); }
  }

  async function refine() {
    if (!refinePrompt.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refinePrompt: refinePrompt.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Refine failed"); return; }
      setSummary(j.aiSummary);
      setDraft(j.aiSummary ?? "");
      setRefinePrompt("");
      setMode("view");
      flashSaved();
      router.refresh();
    } finally { setBusy(false); }
  }

  async function saveManual() {
    const next = draft.trim();
    if (!next) { setError("Summary can't be empty."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiSummary: next }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Save failed"); return; }
      setSummary(j.aiSummary);
      setMode("view");
      flashSaved();
      router.refresh();
    } finally { setBusy(false); }
  }

  function cancel() {
    setDraft(summary ?? "");
    setRefinePrompt("");
    setMode("view");
    setError(null);
  }

  if (!summary && !canManage) return null;

  return (
    <div className="bg-card rounded-2xl border border-line p-5">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-sm">
          <Sparkles size={14} />
        </div>
        <h3 className="font-semibold text-fg">AI summary</h3>
        {savedFlash && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 inline-flex items-center gap-1">
            <CheckCircle2 size={10} /> saved
          </span>
        )}
        {canManage && summary && mode === "view" && (
          <div className="ml-auto flex items-center gap-1.5">
            <Button onClick={() => { setDraft(summary); setMode("edit"); }} size="sm" variant="ghost">
              <Pencil size={11} /> Edit
            </Button>
            <Button onClick={() => setMode("refine")} size="sm" variant="ghost">
              <Wand2 size={11} /> Refine
            </Button>
            <Button onClick={generate} loading={busy} size="sm" variant="ghost">
              <RefreshCw size={11} /> Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* View mode */}
      {mode === "view" && summary && (
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{summary}</p>
      )}

      {/* Empty state — staff only */}
      {!summary && canManage && mode === "view" && (
        <div className="text-center py-6">
          <p className="text-sm text-subtle mb-3">No summary yet. Generate one for learners.</p>
          <Button onClick={generate} loading={busy} variant="primary">
            <Sparkles size={14} /> Generate summary
          </Button>
        </div>
      )}

      {/* Edit mode — manual text edit */}
      {mode === "edit" && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full bg-card-solid text-fg border border-line rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="Write the summary directly…"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button onClick={cancel} size="sm" variant="ghost"><X size={11} /> Cancel</Button>
            <Button onClick={saveManual} loading={busy} size="sm" variant="primary">
              <Save size={11} /> Save
            </Button>
          </div>
        </div>
      )}

      {/* Refine mode — type an instruction, AI rewrites */}
      {mode === "refine" && (
        <div className="space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            Tell the AI how to refine the existing summary. Examples:{" "}
            <button
              onClick={() => setRefinePrompt("Make it shorter — 2 paragraphs only.")}
              className="text-brand-600 hover:underline"
            >shorter</button>
            {" · "}
            <button
              onClick={() => setRefinePrompt("Make it more technical for an experienced bench scientist audience.")}
              className="text-brand-600 hover:underline"
            >more technical</button>
            {" · "}
            <button
              onClick={() => setRefinePrompt("Lead with what the learner will be able to DO after the course.")}
              className="text-brand-600 hover:underline"
            >outcome-led</button>
          </p>
          <div className="bg-elevated/40 border border-line rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-subtle font-semibold mb-1.5">Current summary</p>
            <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{summary}</p>
          </div>
          <textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            rows={2}
            className="w-full bg-card-solid text-fg border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="e.g. Drop the third paragraph; sharpen the assessment description."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) refine();
            }}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] text-subtle">⌘/Ctrl + Enter to refine</p>
            <div className="flex gap-2">
              <Button onClick={cancel} size="sm" variant="ghost"><X size={11} /> Cancel</Button>
              <Button
                onClick={refine}
                loading={busy}
                size="sm"
                variant="primary"
                disabled={!refinePrompt.trim()}
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                Refine
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-3 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
