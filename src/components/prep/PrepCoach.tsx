"use client";
/**
 * Four-step prep coach client component.
 *
 * Steps:
 *   1. compare    — JD ↔ resume keyword analysis
 *   2. gaps       — actions to close what's missing
 *   3. interview  — common-question drafts
 *   4. star       — STAR story-builder with scaffolding
 *
 * Each step has its own self-contained view. They share the
 * prep-session state via `state` (PrepSessionState) and persist
 * to the backend through `saveState()`. We auto-save after each
 * meaningful edit + on step transitions so the trainee can close
 * the tab and come back without losing work.
 *
 * Concurrency: every save is a full state-blob PATCH. We avoid
 * partial merges because the state shape includes nested arrays
 * (matches, bullets, drafts) where index-based diffs would race.
 */
import { useState, useTransition, useEffect, useMemo } from "react";
import {
  Loader2, Sparkles, CheckCircle2, AlertCircle, Hourglass, ArrowRight,
  RefreshCw, Save, X, Plus, BookOpen, Check, Lightbulb, Target,
} from "lucide-react";
import { validateStarStructure } from "@/lib/prep/star";
import type {
  PrepSessionState, PrepStateCompare, PrepStateGaps,
  PrepStateInterview, PrepStateStar, StarFeedback,
} from "@/lib/prep/types";
import { emptyState } from "@/lib/prep/types";
import type { InterviewQuestion } from "@/lib/prep/library";

interface Props {
  postingId: string;
  postingTitle: string;
  postingKeySkills: string[];
  postingSkills: Array<{ id: string; name: string; required: boolean }>;
  initialPrep: {
    id: string;
    currentStep: number;
    state: PrepSessionState;
  };
  resume: { url: string | null; synthText: string };
  questions: InterviewQuestion[];
  existingStories: Array<{ id: string; title: string; skillIds: string[] }>;
}

const STEP_TITLES = [
  { id: 1, key: "compare",   label: "1 · Compare",   sub: "Resume vs JD" },
  { id: 2, key: "gaps",      label: "2 · Close gaps", sub: "Bullets + courses" },
  { id: 3, key: "interview", label: "3 · Interview", sub: "Question drafts" },
  { id: 4, key: "star",      label: "4 · STAR",      sub: "Story builder" },
] as const;

export function PrepCoach(props: Props) {
  const [step, setStep] = useState<number>(props.initialPrep.currentStep);
  const [state, setState] = useState<PrepSessionState>(
    props.initialPrep.state ?? emptyState(),
  );
  const [savingTransition, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Debounce auto-save: every state change schedules a save, but
  // bursts of typing collapse into one PATCH after ~800 ms.
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => {
      saveState(state, step);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, step]);

  async function saveState(next: PrepSessionState, currentStep: number) {
    startSaving(async () => {
      try {
        const res = await fetch(`/api/prep/${props.postingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: next, currentStep }),
        });
        if (res.ok) {
          const j = (await res.json()) as { prep?: { updatedAt?: string } };
          if (j.prep?.updatedAt) setSavedAt(j.prep.updatedAt);
        }
      } catch {
        /* silent — re-tried on next edit */
      }
    });
  }

  function goToStep(n: number) {
    setStep(n);
    saveState(state, n);
  }

  function patchState<K extends keyof PrepSessionState>(
    key: K,
    value: PrepSessionState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="space-y-5">
      {/* ── Stepper bar ───────────────────────────────────────── */}
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-line bg-card p-2 surface-shadow">
        {STEP_TITLES.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goToStep(s.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all border ${
                  active
                    ? "bg-brand-50 border-brand-300 ring-1 ring-brand-300"
                    : done
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                      : "bg-card border-line text-muted hover:bg-elevated"
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  active ? "text-brand-700" : done ? "text-emerald-700" : "text-subtle"
                }`}>
                  {done ? <CheckCircle2 size={11} className="inline -mt-0.5 mr-0.5" /> : null}
                  {s.label}
                </p>
                <p className={`text-xs font-semibold mt-0.5 ${active ? "text-fg" : ""}`}>{s.sub}</p>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── Save indicator ────────────────────────────────────── */}
      <div className="flex items-center justify-end text-[11px] text-subtle gap-2">
        {savingTransition ? (
          <>
            <Loader2 size={11} className="animate-spin" /> saving…
          </>
        ) : savedAt ? (
          <>
            <Save size={11} /> saved{" "}
            {new Date(savedAt).toLocaleTimeString("en-CA", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </>
        ) : null}
      </div>

      {/* ── Step body ─────────────────────────────────────────── */}
      {step === 1 && (
        <CompareStep
          postingId={props.postingId}
          synthResume={props.resume.synthText}
          resumeUrl={props.resume.url}
          value={state.compare}
          onChange={(c) => patchState("compare", c)}
          onNext={() => goToStep(2)}
        />
      )}
      {step === 2 && (
        <GapsStep
          compare={state.compare}
          postingSkills={props.postingSkills}
          value={state.gaps}
          onChange={(g) => patchState("gaps", g)}
          onPrev={() => goToStep(1)}
          onNext={() => goToStep(3)}
        />
      )}
      {step === 3 && (
        <InterviewStep
          questions={props.questions}
          value={state.interview}
          onChange={(i) => patchState("interview", i)}
          onPrev={() => goToStep(2)}
          onNext={() => goToStep(4)}
        />
      )}
      {step === 4 && (
        <StarStep
          postingId={props.postingId}
          postingTitle={props.postingTitle}
          postingSkills={props.postingSkills}
          existingStories={props.existingStories}
          value={state.star}
          onChange={(s) => patchState("star", s)}
          onPrev={() => goToStep(3)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 1 — Compare (JD ↔ resume keyword analysis)
   ═══════════════════════════════════════════════════════════════ */

function CompareStep({
  postingId,
  synthResume,
  resumeUrl,
  value,
  onChange,
  onNext,
}: {
  postingId: string;
  synthResume: string;
  resumeUrl: string | null;
  value: PrepStateCompare | undefined;
  onChange: (v: PrepStateCompare) => void;
  onNext: () => void;
}) {
  const [resumeText, setResumeText] = useState(value?.resumeSnapshot ?? synthResume);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function runAnalysis() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/prep/${postingId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const j = (await res.json()) as { compare?: PrepStateCompare; error?: string };
      if (!res.ok || !j.compare) throw new Error(j.error ?? "Analysis failed");
      onChange(j.compare);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const present = value?.matches.filter((m) => m.status === "present") ?? [];
  const weak = value?.matches.filter((m) => m.status === "weak") ?? [];
  const missing = value?.matches.filter((m) => m.status === "missing") ?? [];

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-lg font-bold text-fg">Compare your resume to this posting</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          We extract the keywords + qualifications from the job
          description and check which ones your resume already shows
          evidence for. Edit your resume snippet below — what you
          paste here is what we analyse against.
        </p>
        {resumeUrl && (
          <p className="text-xs text-muted mt-2">
            We pre-filled this from your profile. Paste a tailored
            version if you'd like — the analysis runs against whatever
            text is in the box.
          </p>
        )}
      </header>

      <div className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-1.5 block">
          Your resume / pitch snippet
        </label>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          maxLength={8000}
          placeholder="Paste your resume bullets, your elevator pitch, or a tailored version — we analyse against this exact text."
          className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-y leading-relaxed"
        />
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <p className="text-[11px] text-subtle">
            {resumeText.length} / 8000 chars. Paste at least 200 words for a useful signal.
          </p>
          <button
            type="button"
            disabled={busy || resumeText.trim().length < 40}
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-600/25"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {value ? "Re-run analysis" : "Run keyword analysis"}
          </button>
        </div>
        {err && (
          <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2 mt-3">
            {err}
          </p>
        )}
      </div>

      {value && (
        <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
                Alignment
              </p>
              <p className="text-2xl font-bold text-fg font-mono tabular-nums mt-0.5">
                {value.alignmentScore}<span className="text-sm font-normal text-muted"> / 100</span>
              </p>
            </div>
            <p className="text-[11px] text-subtle">
              Analysed{" "}
              {new Date(value.analyzedAt ?? new Date()).toLocaleString("en-CA", {
                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
          </header>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Present" count={present.length} tone="emerald" />
            <Stat label="Weak" count={weak.length} tone="amber" />
            <Stat label="Missing" count={missing.length} tone="rose" />
          </div>

          {[
            { items: present, label: "What's working", tone: "emerald" as const },
            { items: weak, label: "Weakly represented", tone: "amber" as const },
            { items: missing, label: "Missing", tone: "rose" as const },
          ].filter((g) => g.items.length > 0).map((g) => (
            <KeywordGroup key={g.label} title={g.label} items={g.items} tone={g.tone} />
          ))}

          <div className="flex justify-end pt-2 border-t border-line">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700"
            >
              Next: close the gaps <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function Stat({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const styles = {
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-800",
    amber: "bg-amber-50 ring-amber-200 text-amber-800",
    rose: "bg-rose-50 ring-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-xl ring-1 ring-inset p-3 ${styles[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">{label}</p>
      <p className="text-xl font-bold font-mono tabular-nums mt-0.5">{count}</p>
    </div>
  );
}

function KeywordGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: PrepStateCompare["matches"];
  tone: "emerald" | "amber" | "rose";
}) {
  const chip = {
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    rose: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle mb-2">
        {title} ({items.length})
      </p>
      <ul className="space-y-1.5">
        {items.map((m) => (
          <li key={m.keyword} className="rounded-lg border border-line p-3 bg-elevated/40">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${chip[tone]}`}>
                {m.keyword}
              </span>
            </div>
            {m.evidence && (
              <p className="text-xs text-muted mt-1.5 leading-snug italic">
                Evidence: <span className="not-italic text-fg">"{m.evidence}"</span>
              </p>
            )}
            {m.suggestion && (
              <p className="text-xs text-fg mt-1.5 leading-snug">
                <Lightbulb size={11} className="inline -mt-0.5 mr-1 text-amber-600" />
                {m.suggestion}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 2 — Gaps (action checklist)
   ═══════════════════════════════════════════════════════════════ */

function GapsStep({
  compare,
  postingSkills,
  value,
  onChange,
  onPrev,
  onNext,
}: {
  compare: PrepStateCompare | undefined;
  postingSkills: Array<{ id: string; name: string; required: boolean }>;
  value: PrepStateGaps | undefined;
  onChange: (v: PrepStateGaps) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Seed gaps from compare results the first time we land here.
  useEffect(() => {
    if (value) return;
    const bullets =
      compare?.matches
        .filter((m) => m.status === "missing" || m.status === "weak")
        .slice(0, 6)
        .map((m, i) => ({
          id: `b-${i}`,
          keyword: m.keyword,
          prompt: m.suggestion ?? `Show concrete evidence of ${m.keyword}: name the project, the action you took, the measurable result.`,
          draft: "",
          status: "open" as const,
        })) ?? [];
    onChange({
      bullets,
      skillActions: postingSkills
        .filter((s) => s.required)
        .slice(0, 6)
        .map((s) => ({
          skillId: s.id,
          skillName: s.name,
          suggested: [],
          status: "open" as const,
        })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!compare) {
    return (
      <section className="rounded-2xl border border-line bg-card p-6 surface-shadow text-center">
        <AlertCircle size={20} className="text-amber-600 mx-auto" />
        <p className="text-sm font-semibold text-fg mt-2">
          Run Step 1 first
        </p>
        <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-snug">
          The Gaps step builds its checklist from the keyword analysis. Head
          back to Step 1, run the analysis, and the action list will populate.
        </p>
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center gap-2 mt-4 rounded-xl border border-line bg-card px-4 py-2 text-sm font-bold hover:bg-elevated"
        >
          ← Back to Compare
        </button>
      </section>
    );
  }

  function updateBullet(id: string, patch: Partial<PrepStateGaps["bullets"][number]>) {
    if (!value) return;
    onChange({
      ...value,
      bullets: value.bullets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  const bullets = value?.bullets ?? [];

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-lg font-bold text-fg">Close the gaps</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Each item below is a missing or weakly-represented keyword. Draft a
          bullet you'd add to your resume — name the project, the action you
          took, and the measurable result. Once you mark it done, you can
          drop it straight into your CV.
        </p>
      </header>

      <ul className="space-y-3">
        {bullets.map((b) => (
          <li
            key={b.id}
            className={`rounded-2xl border bg-card p-4 surface-shadow ${
              b.status === "done"
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-line"
            }`}
          >
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset bg-brand-50 text-brand-800 ring-brand-200">
                {b.keyword}
              </span>
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${
                b.status === "done"
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                  : b.status === "drafted"
                    ? "bg-amber-100 text-amber-800 ring-amber-200"
                    : "bg-slate-100 text-slate-700 ring-slate-200"
              }`}>
                {b.status}
              </span>
            </div>
            <p className="text-xs text-muted mb-2 leading-snug">{b.prompt}</p>
            <textarea
              value={b.draft}
              onChange={(e) => updateBullet(b.id, { draft: e.target.value, status: e.target.value ? "drafted" : "open" })}
              rows={3}
              placeholder="Write your resume bullet here — start with an action verb, name the result."
              className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-y"
            />
            <div className="flex items-center justify-between mt-2 gap-3">
              <p className="text-[10px] text-subtle">
                {b.draft.trim().split(/\s+/).filter(Boolean).length} words
              </p>
              <button
                type="button"
                onClick={() => updateBullet(b.id, { status: b.status === "done" ? "drafted" : "done" })}
                className={`text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                  b.status === "done"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-card text-fg border border-line hover:bg-elevated"
                }`}
              >
                {b.status === "done" ? <><Check size={12} /> Marked added to CV</> : "Mark added to CV"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="text-xs text-muted hover:text-fg"
        >
          ← Back to Compare
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700"
        >
          Next: interview prep <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 3 — Interview (common questions + drafts)
   ═══════════════════════════════════════════════════════════════ */

function InterviewStep({
  questions,
  value,
  onChange,
  onPrev,
  onNext,
}: {
  questions: InterviewQuestion[];
  value: PrepStateInterview | undefined;
  onChange: (v: PrepStateInterview) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const interviewState = useMemo(
    () => value ?? { answers: [], storyMappings: {} },
    [value],
  );

  function updateAnswer(qid: string, patch: Partial<PrepStateInterview["answers"][number]>) {
    const existingIdx = interviewState.answers.findIndex((a) => a.questionId === qid);
    let answers = interviewState.answers.slice();
    if (existingIdx >= 0) {
      answers[existingIdx] = { ...answers[existingIdx], ...patch, updatedAt: new Date().toISOString() };
    } else {
      const q = questions.find((q) => q.id === qid);
      if (!q) return;
      answers = [
        ...answers,
        {
          questionId: qid,
          framework: q.framework,
          draft: "",
          targetWords: q.targetWords,
          updatedAt: new Date().toISOString(),
          ...patch,
        },
      ];
    }
    onChange({ ...interviewState, answers });
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-lg font-bold text-fg">Interview prep</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Questions tailored to this posting. Each has a decoder ("what
          they're really asking") and fill-in-the-blank scaffolding —
          drop your specifics into the slots, then iterate. You don't
          need to answer all of them; pick the 3 you're shakiest on.
        </p>
      </header>

      <ul className="space-y-3">
        {questions.map((q) => {
          const draft = interviewState.answers.find((a) => a.questionId === q.id)?.draft ?? "";
          return (
            <InterviewQuestionCard
              key={q.id}
              q={q}
              draft={draft}
              onDraftChange={(d) => updateAnswer(q.id, { draft: d })}
            />
          );
        })}
      </ul>

      <div className="flex justify-between gap-3 pt-2">
        <button type="button" onClick={onPrev} className="text-xs text-muted hover:text-fg">
          ← Back to Gaps
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700"
        >
          Next: STAR stories <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

function InterviewQuestionCard({
  q,
  draft,
  onDraftChange,
}: {
  q: InterviewQuestion;
  draft: string;
  onDraftChange: (s: string) => void;
}) {
  const [showScaffold, setShowScaffold] = useState(false);
  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;

  return (
    <li className="rounded-2xl border border-line bg-card p-5 surface-shadow">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1">
            {q.category} · {q.framework}
          </p>
          <h3 className="text-base font-bold text-fg leading-tight">{q.text}</h3>
          <p className="text-xs text-muted mt-1.5 italic">{q.decoder}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">
            Your draft
          </label>
          <button
            type="button"
            onClick={() => setShowScaffold((s) => !s)}
            className="text-[11px] font-semibold text-brand-700 hover:underline"
          >
            {showScaffold ? "Hide" : "Show"} fill-in scaffold
          </button>
        </div>

        {showScaffold && (
          <div className="mb-2 rounded-lg bg-brand-50 ring-1 ring-inset ring-brand-200 p-3 text-xs leading-relaxed text-brand-900">
            <p className="font-semibold text-brand-800 mb-1.5">Use this as a starting frame:</p>
            <p className="font-mono text-[12px] whitespace-pre-line">{q.scaffold}</p>
            <button
              type="button"
              onClick={() => {
                if (!draft) onDraftChange(q.scaffold);
              }}
              disabled={draft.length > 0}
              className="text-[11px] font-semibold text-brand-700 mt-2 hover:underline disabled:opacity-50 disabled:no-underline"
              title={draft ? "Already have content — won't overwrite" : "Drop the scaffold into your draft"}
            >
              <Plus size={10} className="inline -mt-0.5" /> Use this scaffold
            </button>
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={5}
          placeholder="Your answer…"
          className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-y leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1.5 gap-3 text-[11px] text-subtle">
          <span className={wordCount > q.targetWords * 1.5 ? "text-amber-700 font-semibold" : ""}>
            {wordCount} words · target {q.targetWords}
          </span>
          {q.pitfalls.length > 0 && (
            <details className="text-right">
              <summary className="cursor-pointer hover:text-fg">Watch for…</summary>
              <ul className="text-left mt-1.5 space-y-0.5 list-disc pl-4 text-muted">
                {q.pitfalls.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STEP 4 — STAR Story builder
   ═══════════════════════════════════════════════════════════════ */

function StarStep({
  postingId,
  postingTitle,
  postingSkills,
  existingStories,
  value,
  onChange,
  onPrev,
}: {
  postingId: string;
  postingTitle: string;
  postingSkills: Array<{ id: string; name: string; required: boolean }>;
  existingStories: Array<{ id: string; title: string; skillIds: string[] }>;
  value: PrepStateStar | undefined;
  onChange: (v: PrepStateStar) => void;
  onPrev: () => void;
}) {
  const starState = useMemo(() => value ?? { drafts: [] }, [value]);

  function addDraft(skillId?: string, skillName?: string) {
    const draftId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onChange({
      drafts: [
        ...starState.drafts,
        {
          draftId,
          skillId,
          title: skillName ? `A time I used ${skillName}` : "",
          situation: "",
          task: "",
          action: "",
          result: "",
        },
      ],
    });
  }

  function updateDraft(draftId: string, patch: Partial<PrepStateStar["drafts"][number]>) {
    onChange({
      drafts: starState.drafts.map((d) => (d.draftId === draftId ? { ...d, ...patch } : d)),
    });
  }

  function removeDraft(draftId: string) {
    onChange({ drafts: starState.drafts.filter((d) => d.draftId !== draftId) });
  }

  const usedSkillIds = new Set(starState.drafts.map((d) => d.skillId).filter(Boolean));

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-line bg-card p-5 surface-shadow">
        <h2 className="text-lg font-bold text-fg">STAR story builder</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Pick a skill below to start a STAR story — we scaffold the
          four parts (Situation / Task / Action / Result), check your
          structure as you type, and save the polished version to your
          Story Bank so you can reuse it on future postings.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {postingSkills
            .filter((s) => s.required)
            .map((s) => {
              const alreadyHaveStory = existingStories.some((es) => es.skillIds.includes(s.id));
              const draftedHere = usedSkillIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addDraft(s.id, s.name)}
                  disabled={draftedHere}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    draftedHere
                      ? "bg-elevated text-subtle border-line opacity-60 cursor-not-allowed"
                      : alreadyHaveStory
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        : "bg-card text-fg border-line hover:bg-brand-50 hover:border-brand-300"
                  }`}
                  title={alreadyHaveStory ? "You already have a story tagged with this skill — see Story Bank" : "Start a STAR draft for this skill"}
                >
                  {alreadyHaveStory && <BookOpen size={11} />}
                  {!draftedHere && !alreadyHaveStory && <Plus size={11} />}
                  {s.name}
                </button>
              );
            })}
        </div>
      </header>

      {starState.drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center">
          <Target size={20} className="text-brand-600 mx-auto" />
          <p className="text-sm font-semibold text-fg mt-2">Pick a skill above to start</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-snug">
            STAR stories are reusable across postings — once written, a story
            tagged with "cell culture" works for any role that needs it.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {starState.drafts.map((d) => (
            <StarDraftCard
              key={d.draftId}
              draft={d}
              postingId={postingId}
              postingTitle={postingTitle}
              onUpdate={(patch) => updateDraft(d.draftId, patch)}
              onRemove={() => removeDraft(d.draftId)}
            />
          ))}
        </ul>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <button type="button" onClick={onPrev} className="text-xs text-muted hover:text-fg">
          ← Back to Interview
        </button>
        <a
          href="/profile/stories"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-bold hover:bg-elevated"
        >
          Open Story Bank <ArrowRight size={14} />
        </a>
      </div>
    </section>
  );
}

function StarDraftCard({
  draft,
  postingId,
  postingTitle,
  onUpdate,
  onRemove,
}: {
  draft: PrepStateStar["drafts"][number];
  postingId: string;
  postingTitle: string;
  onUpdate: (patch: Partial<PrepStateStar["drafts"][number]>) => void;
  onRemove: () => void;
}) {
  const [polishBusy, setPolishBusy] = useState(false);
  const [polishErr, setPolishErr] = useState<string | null>(null);
  const [revision, setRevision] = useState<{
    situation: string; task: string; action: string; result: string;
  } | null>(null);
  const [savingToBank, setSavingToBank] = useState(false);
  const [saved, setSaved] = useState(false);

  const feedback: StarFeedback = validateStarStructure({
    situation: draft.situation,
    task: draft.task,
    action: draft.action,
    result: draft.result,
  });

  async function polish() {
    setPolishBusy(true);
    setPolishErr(null);
    setRevision(null);
    try {
      const res = await fetch("/api/prep/star/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: draft.situation,
          task: draft.task,
          action: draft.action,
          result: draft.result,
        }),
      });
      const j = (await res.json()) as { revision?: typeof revision; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Polish failed");
      setRevision(j.revision ?? null);
    } catch (e) {
      setPolishErr((e as Error).message);
    } finally {
      setPolishBusy(false);
    }
  }

  async function saveToBank() {
    setSavingToBank(true);
    try {
      const res = await fetch("/api/prep/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title || `Story for ${postingTitle}`,
          situation: draft.situation,
          task: draft.task,
          action: draft.action,
          result: draft.result,
          skillIds: draft.skillId ? [draft.skillId] : [],
          sourcePostingId: postingId,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSavingToBank(false);
    }
  }

  function applyRevision() {
    if (!revision) return;
    onUpdate({
      situation: revision.situation,
      task: revision.task,
      action: revision.action,
      result: revision.result,
    });
    setRevision(null);
  }

  const readinessChip = {
    ready: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    almost: "bg-amber-100 text-amber-800 ring-amber-200",
    "needs-work": "bg-rose-100 text-rose-800 ring-rose-200",
  }[feedback.readiness];

  return (
    <li className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Give the story a short title"
            className="w-full bg-transparent border-0 border-b border-dashed border-line focus:border-brand-500 focus:outline-none text-base font-bold text-fg placeholder:text-subtle py-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${readinessChip}`}>
            {feedback.readiness === "ready" ? <><CheckCircle2 size={10} className="mr-0.5" /> Ready</> :
             feedback.readiness === "almost" ? <><Hourglass size={10} className="mr-0.5" /> Almost</> :
             <><AlertCircle size={10} className="mr-0.5" /> Needs work</>}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md"
            title="Discard this draft"
          >
            <X size={12} />
          </button>
        </div>
      </header>

      <StarField
        label="Situation"
        hint="Where + when. 1–2 sentences setting the scene."
        value={draft.situation}
        onChange={(s) => onUpdate({ situation: s })}
        wc={feedback.perField.situation}
      />
      <StarField
        label="Task"
        hint="What were YOU specifically responsible for? One sentence."
        value={draft.task}
        onChange={(s) => onUpdate({ task: s })}
        wc={feedback.perField.task}
      />
      <StarField
        label="Action"
        hint="What did YOU do? First-person. The bulk of the story lives here."
        value={draft.action}
        onChange={(s) => onUpdate({ action: s })}
        wc={feedback.perField.action}
      />
      <StarField
        label="Result"
        hint="Quantify if you can. A number beats an adjective every time."
        value={draft.result}
        onChange={(s) => onUpdate({ result: s })}
        wc={feedback.perField.result}
      />

      {feedback.tips.length > 0 && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-3 text-xs leading-relaxed">
          <p className="font-bold text-amber-900 mb-1.5 inline-flex items-center gap-1.5">
            <Lightbulb size={11} /> Tips
          </p>
          <ul className="space-y-1 text-amber-900">
            {feedback.tips.map((t, i) => (
              <li key={i}>· {t}</li>
            ))}
          </ul>
        </div>
      )}

      {polishErr && (
        <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          {polishErr}
        </p>
      )}

      {revision && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs space-y-2">
          <p className="font-bold text-brand-800">AI suggestion</p>
          <div className="space-y-1.5 text-fg leading-relaxed">
            <p><strong className="text-brand-700">Situation:</strong> {revision.situation}</p>
            <p><strong className="text-brand-700">Task:</strong> {revision.task}</p>
            <p><strong className="text-brand-700">Action:</strong> {revision.action}</p>
            <p><strong className="text-brand-700">Result:</strong> {revision.result}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={applyRevision}
              className="text-xs font-bold inline-flex items-center gap-1 bg-brand-600 text-white px-3 py-1 rounded-lg hover:bg-brand-700"
            >
              <Check size={11} /> Use this revision
            </button>
            <button
              type="button"
              onClick={() => setRevision(null)}
              className="text-xs font-semibold text-muted hover:text-fg"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-line flex-wrap">
        <button
          type="button"
          disabled={polishBusy || feedback.readiness === "needs-work"}
          onClick={polish}
          title={feedback.readiness === "needs-work" ? "Get the structure to at least 'Almost' before polishing" : "Generate an AI revision"}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-violet-700 disabled:opacity-50"
        >
          {polishBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Polish with AI
        </button>
        <button
          type="button"
          disabled={savingToBank || saved || feedback.readiness === "needs-work"}
          onClick={saveToBank}
          title={feedback.readiness === "needs-work" ? "Get to at least 'Almost' before saving to bank" : "Save this story to your Story Bank for reuse"}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {savingToBank ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
          {saved ? "Saved to Story Bank" : "Save to Story Bank"}
        </button>
        <button
          type="button"
          onClick={() => onUpdate({
            situation: "", task: "", action: "", result: "",
          })}
          className="text-xs text-rose-700 hover:underline ml-auto"
        >
          Clear all fields
        </button>
      </div>
    </li>
  );
}

function StarField({
  label,
  hint,
  value,
  onChange,
  wc,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (s: string) => void;
  wc: { words: number; nudge?: string };
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">
          {label}
        </label>
        <span className={`text-[10px] font-mono ${wc.nudge ? "text-amber-700" : "text-subtle"}`}>
          {wc.words} words
        </span>
      </div>
      <p className="text-[11px] text-muted mb-1.5 leading-snug">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-y leading-relaxed"
      />
      {wc.nudge && (
        <p className="text-[10px] text-amber-700 mt-1">{wc.nudge}</p>
      )}
    </div>
  );
}

/* ─── Reusable atoms ────────────────────────────────────────── */

void RefreshCw;
