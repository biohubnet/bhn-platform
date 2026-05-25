"use client";

/**
 * StoryBuilder — inline "draft a new STAR story from scratch" panel.
 *
 * Lives at the top of /profile/stories. Collapsed by default to a slim
 * call-to-action; once expanded, the trainee sees a two-column workspace:
 *
 *   LEFT  — the title + four STAR textareas
 *   RIGHT — a live-feedback coaching column (per-field word counts +
 *           traffic-light dots, top tips, total words, readiness chip)
 *           AND a "Browse examples" accordion with 4 worked stories
 *           the trainee can preview and copy into the form as a
 *           starting point.
 *
 * Feedback engine: re-uses validateStarStructure() — the same pure
 * client function the prep flow uses — so every keystroke updates the
 * coaching column without an API round-trip. No AI required.
 *
 * Examples engine: pulls from src/lib/prep/exampleStories.ts. Each
 * example is a fully-worked READY-tier story; "Use as starting point"
 * copies all five fields into the form (with a confirm if there's
 * unsaved text already).
 *
 * Save path: POST /api/prep/star with the four STAR fields + title +
 * tags. On success the page is refreshed via router.refresh() so the
 * new story appears in the list below.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle, X, CheckCircle2, AlertCircle, Hourglass, Sparkles,
  Lightbulb, Loader2, Save, BookMarked, ChevronDown, ArrowDownToLine,
} from "lucide-react";
import { validateStarStructure } from "@/lib/prep/star";
import { EXAMPLE_STORIES, type ExampleStory } from "@/lib/prep/exampleStories";
import { cn } from "@/lib/utils";

interface FormState {
  title:     string;
  situation: string;
  task:      string;
  action:    string;
  result:    string;
  tagsRaw:   string;
}

const EMPTY_FORM: FormState = {
  title: "", situation: "", task: "", action: "", result: "", tagsRaw: "",
};

function hasAnyContent(f: FormState): boolean {
  return (
    f.title.trim().length > 0 ||
    f.situation.trim().length > 0 ||
    f.task.trim().length > 0 ||
    f.action.trim().length > 0 ||
    f.result.trim().length > 0
  );
}

const FIELD_TARGETS: Record<"situation" | "task" | "action" | "result", { min: number; max: number; hint: string }> = {
  situation: { min: 30, max: 80,  hint: "Set the scene — where, when, what was happening." },
  task:      { min: 15, max: 50,  hint: "Your specific responsibility in that situation." },
  action:    { min: 60, max: 150, hint: "What YOU (not the team) did. Use 'I'. This is the meat of the story." },
  result:    { min: 25, max: 80,  hint: "What changed. Add at least one number — %, count, time, yield." },
};

export function StoryBuilder() {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [error, setError]       = useState<string | null>(null);
  const [saving, startSaving]   = useTransition();
  const [activeExample, setActiveExample] = useState<string | null>(null);
  /** When the trainee clicks "Use as starting point" and there's
   *  already typed content, we don't reach for window.confirm (project
   *  rule — see CLAUDE.md). Instead we stage the example here and the
   *  examples panel renders an inline "Replace your draft? · Keep mine"
   *  two-step confirm. */
  const [pendingOverwrite, setPendingOverwrite] = useState<ExampleStory | null>(null);

  const feedback = validateStarStructure({
    situation: form.situation,
    task:      form.task,
    action:    form.action,
    result:    form.result,
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyExample(ex: ExampleStory) {
    setForm({
      title:     ex.title,
      situation: ex.situation,
      task:      ex.task,
      action:    ex.action,
      result:    ex.result,
      tagsRaw:   ex.tags.join(", "),
    });
    setActiveExample(null);
    setPendingOverwrite(null);
  }

  function useExampleAsStart(ex: ExampleStory) {
    if (hasAnyContent(form)) {
      setPendingOverwrite(ex);
      return;
    }
    applyExample(ex);
  }

  function resetAndClose() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(false);
  }

  async function handleSave() {
    setError(null);
    const title     = form.title.trim();
    const situation = form.situation.trim();
    const task      = form.task.trim();
    const action    = form.action.trim();
    const result    = form.result.trim();
    if (!title)     { setError("Add a short title — one phrase that names the moment."); return; }
    if (!situation || !task || !action || !result) {
      setError("All four STAR fields need at least a sentence before you save.");
      return;
    }
    const tags = form.tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    startSaving(async () => {
      const res = await fetch("/api/prep/star", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, situation, task, action, result, tags }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(j?.error ?? "Could not save the story. Try again.");
        return;
      }
      setForm(EMPTY_FORM);
      setOpen(false);
      router.refresh();
    });
  }

  // ── Collapsed state — slim CTA ──────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group w-full flex items-center justify-between gap-4",
          "rounded-2xl ring-1 ring-inset ring-brand-200 hover:ring-brand-400",
          "bg-gradient-to-br from-brand-50 to-card hover:from-brand-100",
          "px-5 py-4 text-left transition-all",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200 group-hover:scale-105 transition-transform">
            <PlusCircle size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">Draft a new STAR story</p>
            <p className="text-xs text-muted mt-0.5">
              Live coaching feedback as you type · 4 worked examples to start from
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700 shrink-0">
          Start
        </span>
      </button>
    );
  }

  // ── Expanded builder ────────────────────────────────────────────
  return (
    <div className="rounded-2xl ring-1 ring-inset ring-brand-200 bg-card overflow-hidden">
      {/* Builder header */}
      <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 bg-gradient-to-r from-brand-50 to-card border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-brand-100 text-brand-700 ring-1 ring-inset ring-brand-200">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg">Story Builder</p>
            <p className="text-[11px] text-muted mt-0.5">
              Type and watch the coaching panel update. Click an example to start from a polished draft.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetAndClose}
          aria-label="Close story builder"
          className="shrink-0 p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          <X size={16} />
        </button>
      </header>

      {/* Workspace — 2 columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* LEFT — form */}
        <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-line space-y-4">
          <BuilderInput
            label="Title"
            placeholder="One phrase that names the moment — e.g. 'The bioreactor that crashed at 2 a.m.'"
            value={form.title}
            onChange={(v) => setField("title", v)}
            maxLength={120}
          />

          <BuilderTextarea
            label="Situation"
            hint={FIELD_TARGETS.situation.hint}
            words={feedback.perField.situation.words}
            target={FIELD_TARGETS.situation}
            nudge={feedback.perField.situation.nudge}
            value={form.situation}
            onChange={(v) => setField("situation", v)}
            rows={3}
          />
          <BuilderTextarea
            label="Task"
            hint={FIELD_TARGETS.task.hint}
            words={feedback.perField.task.words}
            target={FIELD_TARGETS.task}
            nudge={feedback.perField.task.nudge}
            value={form.task}
            onChange={(v) => setField("task", v)}
            rows={2}
          />
          <BuilderTextarea
            label="Action"
            hint={FIELD_TARGETS.action.hint}
            words={feedback.perField.action.words}
            target={FIELD_TARGETS.action}
            nudge={feedback.perField.action.nudge}
            value={form.action}
            onChange={(v) => setField("action", v)}
            rows={6}
          />
          <BuilderTextarea
            label="Result"
            hint={FIELD_TARGETS.result.hint}
            words={feedback.perField.result.words}
            target={FIELD_TARGETS.result}
            nudge={feedback.perField.result.nudge}
            value={form.result}
            onChange={(v) => setField("result", v)}
            rows={3}
          />

          <BuilderInput
            label="Tags (comma-separated, optional)"
            placeholder="e.g. wet lab, troubleshooting, leadership"
            value={form.tagsRaw}
            onChange={(v) => setField("tagsRaw", v)}
            maxLength={200}
          />

          {error && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={resetAndClose}
              className="text-sm px-4 py-2 rounded-xl bg-elevated border border-line hover:bg-line text-fg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save to Story Bank
            </button>
          </div>
        </div>

        {/* RIGHT — live coaching + examples */}
        <aside className="p-5 sm:p-6 bg-elevated/40 space-y-5">
          <ReadinessPanel feedback={feedback} />
          <ExamplesPanel
            activeExampleId={activeExample}
            pendingOverwriteId={pendingOverwrite?.id ?? null}
            onToggle={(id) => setActiveExample(activeExample === id ? null : id)}
            onUseAsStart={useExampleAsStart}
            onConfirmOverwrite={applyExample}
            onCancelOverwrite={() => setPendingOverwrite(null)}
          />
        </aside>
      </div>
    </div>
  );
}

// ─── Coaching panel ────────────────────────────────────────────────

function ReadinessPanel({
  feedback,
}: {
  feedback: ReturnType<typeof validateStarStructure>;
}) {
  const chip = {
    ready:        { cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", Icon: CheckCircle2, label: "Ready"      },
    almost:       { cls: "bg-amber-100   text-amber-800   ring-amber-200",   Icon: Hourglass,    label: "Almost"     },
    "needs-work": { cls: "bg-rose-100    text-rose-800    ring-rose-200",    Icon: AlertCircle,  label: "Needs work" },
  }[feedback.readiness];

  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle mb-2">
        Coaching
      </p>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full ring-1 ring-inset",
            chip.cls,
          )}
        >
          <chip.Icon size={11} /> {chip.label}
        </span>
        <span className="text-[11px] text-muted">
          <span className="font-bold text-fg tabular-nums">{feedback.totalWords}</span> words
        </span>
      </div>

      {/* Per-field traffic-light dots */}
      <ul className="space-y-1.5 mb-3">
        {(["situation", "task", "action", "result"] as const).map((key) => {
          const meta   = feedback.perField[key];
          const target = FIELD_TARGETS[key];
          const tone =
            meta.words === 0                                 ? "empty"  :
            meta.words < target.min || meta.words > target.max ? "off"    :
                                                                 "ok";
          const dotClass =
            tone === "ok"    ? "bg-emerald-400" :
            tone === "off"   ? "bg-amber-400"   :
                               "bg-line";
          return (
            <li key={key} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-2 text-fg">
                <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
                <span className="capitalize">{key}</span>
              </span>
              <span className="text-muted tabular-nums">
                {meta.words}/<span className="text-subtle">{target.min}–{target.max}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Quantitative + first-person sentinels */}
      <div className="grid grid-cols-2 gap-2 text-[10.5px] mb-3">
        <Sentinel label="Has a number" ok={feedback.hasQuantifiedResult} />
        <Sentinel label="Uses 'I'"      ok={feedback.usesFirstPerson} />
      </div>

      {/* Top tips */}
      {feedback.tips.length > 0 ? (
        <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-3 text-[11px] leading-relaxed text-amber-900">
          <p className="font-bold mb-1 inline-flex items-center gap-1.5">
            <Lightbulb size={11} /> Top tips
          </p>
          <ul className="space-y-0.5">
            {feedback.tips.map((t, i) => <li key={i}>· {t}</li>)}
          </ul>
        </div>
      ) : feedback.totalWords > 0 ? (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 p-3 text-[11px] leading-relaxed text-emerald-900">
          <p className="inline-flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={11} /> All checks pass — save when you're happy.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted italic leading-relaxed">
          Coaching feedback shows up here as you type. The four panels below your fields update word-by-word.
        </p>
      )}
    </section>
  );
}

function Sentinel({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg ring-1 ring-inset",
        ok
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-card text-muted ring-line",
      )}
    >
      <span className="font-semibold">{label}</span>
      {ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} className="text-amber-500" />}
    </span>
  );
}

// ─── Examples panel ────────────────────────────────────────────────

function ExamplesPanel({
  activeExampleId,
  pendingOverwriteId,
  onToggle,
  onUseAsStart,
  onConfirmOverwrite,
  onCancelOverwrite,
}: {
  activeExampleId: string | null;
  pendingOverwriteId: string | null;
  onToggle: (id: string) => void;
  onUseAsStart: (ex: ExampleStory) => void;
  onConfirmOverwrite: (ex: ExampleStory) => void;
  onCancelOverwrite: () => void;
}) {
  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle mb-2 inline-flex items-center gap-1.5">
        <BookMarked size={11} /> Worked examples
      </p>
      <p className="text-[11px] text-muted leading-relaxed mb-3">
        Four polished stories across lab, service, data, and project work. Click to read the full S/T/A/R — or copy one as a starting draft and tailor it.
      </p>
      <ul className="space-y-1.5">
        {EXAMPLE_STORIES.map((ex) => {
          const open = activeExampleId === ex.id;
          return (
            <li key={ex.id} className="rounded-xl bg-card ring-1 ring-inset ring-line overflow-hidden">
              <button
                type="button"
                onClick={() => onToggle(ex.id)}
                className="w-full flex items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-elevated/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-fg leading-tight">{ex.title}</p>
                  <p className="text-[10.5px] text-muted mt-0.5 leading-snug">{ex.blurb}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-subtle shrink-0 transition-transform mt-0.5",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <div className="px-3 pb-3 border-t border-line space-y-2.5 text-[11px] leading-relaxed">
                  <div className="flex flex-wrap gap-1 pt-2.5">
                    {ex.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9.5px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <ExampleField label="Situation" text={ex.situation} />
                  <ExampleField label="Task"      text={ex.task} />
                  <ExampleField label="Action"    text={ex.action} />
                  <ExampleField label="Result"    text={ex.result} />
                  {pendingOverwriteId === ex.id ? (
                    <div className="rounded-xl bg-amber-50 ring-1 ring-inset ring-amber-200 p-2.5 text-[11px] leading-relaxed text-amber-900">
                      <p className="font-bold mb-2">Replace your draft with this example?</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onConfirmOverwrite(ex)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition-colors"
                        >
                          Yes, replace
                        </button>
                        <button
                          type="button"
                          onClick={onCancelOverwrite}
                          className="px-2.5 py-1 rounded-lg bg-card text-fg text-[11px] font-semibold ring-1 ring-inset ring-line hover:bg-elevated transition-colors"
                        >
                          Keep mine
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUseAsStart(ex)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[11px] font-bold hover:bg-brand-700 transition-colors"
                    >
                      <ArrowDownToLine size={11} /> Use as starting point
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ExampleField({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-subtle">{label}</p>
      <p className="text-fg/90 mt-0.5">{text}</p>
    </div>
  );
}

// ─── Inputs ────────────────────────────────────────────────────────

function BuilderInput({
  label, placeholder, value, onChange, maxLength,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle block mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
    </div>
  );
}

function BuilderTextarea({
  label, hint, value, onChange, words, target, nudge, rows,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  words: number;
  target: { min: number; max: number };
  nudge?: string;
  rows: number;
}) {
  const tone =
    words === 0                                 ? "empty" :
    words < target.min || words > target.max    ? "off"   :
                                                  "ok";
  const ringByTone =
    tone === "ok"  ? "focus:ring-emerald-500/30 focus:border-emerald-500" :
    tone === "off" ? "focus:ring-amber-500/30   focus:border-amber-500"   :
                     "focus:ring-brand-500/30   focus:border-brand-500";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">
          {label}
        </label>
        <span className="text-[10px] text-muted tabular-nums">
          <span className={cn(
            "font-bold",
            tone === "ok"  && "text-emerald-700",
            tone === "off" && "text-amber-700",
          )}>
            {words}
          </span>{" "}
          / {target.min}–{target.max}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={hint}
        className={cn(
          "w-full bg-card border border-line rounded-lg px-3 py-2 text-sm text-fg resize-y leading-relaxed transition-shadow",
          "focus:outline-none focus:ring-2",
          ringByTone,
        )}
      />
      {nudge && (
        <p className="text-[10px] text-amber-700 mt-1">{nudge}</p>
      )}
    </div>
  );
}
