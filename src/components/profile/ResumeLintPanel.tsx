"use client";

/**
 * ResumeLintPanel — the "grammar + style" pass at the bottom of the
 * resume editor.
 *
 * Treats the resume like code: linting catches things a busy mentor
 * would catch on a first read — typos, weak verbs, passive voice,
 * vague filler, missing quantification on experience bullets, tense
 * inconsistency, repetition, first-person openers, etc.
 *
 * UI shape:
 *   • Idle  — hero blurb + "Run grammar + style check" button.
 *   • Busy  — spinner + small "Reading every section…" line.
 *   • Done  — issues grouped by severity (errors → warns → info),
 *             each rendered as a small card with category chip,
 *             severity badge, message, the excerpt that triggered
 *             it, and an "Apply fix" button when a suggestion is
 *             present. "Dismiss" removes the issue from the list
 *             without changing the resume.
 *   • Clean — celebratory empty state if the AI returns no issues.
 *
 * Apply-fix is local: it calls `applyFix(issue)` which walks the
 * content tree by node id and updates the right field via the
 * `setContent` setter passed in from the parent. The parent's
 * auto-save then persists the change on the usual debounce.
 */
import { useState } from "react";
import {
  Sparkles, Loader2, Check, AlertCircle, AlertTriangle, Info,
  Wand2, ChevronRight,
} from "lucide-react";
import type { ResumeContent } from "@/lib/resume/types";
import type { LintIssue, LintSeverity, LintCategory } from "@/lib/resume/lint";
import { LINT_CATEGORY_META } from "@/lib/resume/lint";
import { cn } from "@/lib/utils";

interface Props {
  /** Current resume content. Sent on each lint run. */
  content: ResumeContent;
  /** Content mutator. Lint panel calls this to apply suggestions. */
  setContent: (updater: (c: ResumeContent) => ResumeContent) => void;
}

// Severity → visual treatment. Errors get a red chip, warns amber,
// info neutral. Category badges stay neutral so the severity reads
// as the primary signal.
const SEV_STYLES: Record<LintSeverity, { chip: string; ring: string; icon: React.ElementType; label: string }> = {
  error: { chip: "bg-rose-100 text-rose-900 ring-rose-300",       ring: "ring-rose-200/70", icon: AlertCircle,   label: "Error" },
  warn:  { chip: "bg-amber-100 text-amber-900 ring-amber-300",    ring: "ring-amber-200/70", icon: AlertTriangle, label: "Warn"  },
  info:  { chip: "bg-sky-100 text-sky-900 ring-sky-300",          ring: "ring-sky-200/60",  icon: Info,          label: "Info"  },
};

export function ResumeLintPanel({ content, setContent }: Props) {
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [ran, setRan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runLint() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/profile/resume/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; issues?: LintIssue[]; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error ?? "Lint check failed. Try again.");
      } else {
        setIssues(j.issues ?? []);
      }
      setRan(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function dismiss(id: string) {
    setIssues((cur) => cur.filter((i) => i.id !== id));
  }

  function applyFix(issue: LintIssue) {
    if (!issue.suggestion) return;
    const next = applyIssueSuggestion(content, issue, issue.suggestion);
    if (next) setContent(() => next);
    // Remove the applied issue so the list shrinks as the user
    // works through them.
    dismiss(issue.id);
  }

  // Sort: errors first, then warns, then info.
  const sorted = [...issues].sort((a, b) => sevWeight(a.severity) - sevWeight(b.severity));

  return (
    <section className="bg-card-solid border border-line rounded-2xl p-5">
      <header className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.28em] font-bold text-fg-muted">Grammar &amp; style check</h2>
          <p className="text-[12px] text-fg-muted mt-1.5 leading-snug max-w-xl">
            Lints your resume the way a code linter lints code — flags weak verbs, passive voice,
            vague filler, missing quantification, tense inconsistency, typos, and the other things a
            sharp mentor would catch on a first read. AI-powered; nothing is changed unless you click
            <strong> Apply fix</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={runLint}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors shrink-0",
            busy
              ? "bg-elevated text-fg-muted cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-700",
          )}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {busy ? "Reading every section…" : ran ? "Re-run check" : "Run grammar + style check"}
        </button>
      </header>

      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-md px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {ran && !busy && issues.length === 0 && !error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200">
          <Check size={16} className="text-emerald-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-900">No issues found</p>
            <p className="text-[12px] text-emerald-800/85 mt-0.5 leading-snug">
              Nothing to flag on this pass. Re-run after big edits — a fresh pair of eyes still helps.
            </p>
          </div>
        </div>
      )}

      {!ran && !busy && !error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-elevated/40 ring-1 ring-inset ring-line">
          <Wand2 size={16} className="text-brand-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-fg">Click <em>Run grammar + style check</em> when you&apos;re ready</p>
            <p className="text-[12px] text-fg-muted mt-0.5 leading-snug">
              The AI reads every section, item, and bullet — including your header summary — and returns a list of issues with one-line explanations. Findings are categorised (spelling / grammar / weak verb / passive / vague / tense / missing metric / repetition / first-person / wordiness / style) and ranked errors → warnings → info.
            </p>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((issue) => (
            <LintIssueCard
              key={issue.id}
              issue={issue}
              onDismiss={() => dismiss(issue.id)}
              onApply={() => applyFix(issue)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function LintIssueCard({
  issue, onDismiss, onApply,
}: { issue: LintIssue; onDismiss: () => void; onApply: () => void }) {
  const sev = SEV_STYLES[issue.severity];
  const meta = LINT_CATEGORY_META[issue.category];
  const Icon = sev.icon;
  return (
    <li
      className={cn(
        "rounded-xl border border-line bg-card p-3.5 ring-1 ring-inset",
        sev.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md", sev.chip)} title={sev.label}>
          <Icon size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.14em] font-bold text-fg-muted bg-elevated"
              title={meta.blurb}
            >
              {meta.label}
            </span>
            <AnchorLabel issue={issue} />
          </div>
          <p className="text-[13px] text-fg leading-snug">{issue.message}</p>
          {issue.excerpt && (
            <p className="text-[12px] text-fg-muted mt-1.5 leading-snug italic break-words">
              &ldquo;{issue.excerpt}&rdquo;
            </p>
          )}
          {issue.suggestion && (
            <div className="mt-2 px-3 py-2 rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-200">
              <div className="flex items-start gap-2">
                <ChevronRight size={12} className="text-emerald-700 mt-1 shrink-0" />
                <p className="text-[12.5px] text-emerald-900 leading-snug break-words">{issue.suggestion}</p>
              </div>
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-1.5">
            {issue.suggestion && (
              <button
                type="button"
                onClick={onApply}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                <Check size={11} /> Apply fix
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold text-fg-muted ring-1 ring-line hover:bg-elevated"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Tiny anchor label — tells the user which node the issue points to.
 *  Bullet / item / section ids aren't human-readable, so we just say
 *  what TYPE of node it's anchored to. The visual emphasis is on the
 *  message + excerpt, not the anchor. */
function AnchorLabel({ issue }: { issue: LintIssue }) {
  let label = "";
  if (issue.anchorBulletId)        label = "On a bullet";
  else if (issue.anchorItemId)     label = "On an item";
  else if (issue.anchorSectionId)  label = "Section heading";
  else if (issue.anchorHeaderField) {
    label = `Header · ${issue.anchorHeaderField}`;
  }
  if (!label) return null;
  return (
    <span className="text-[10px] font-mono uppercase tracking-[0.12em] font-semibold text-fg-subtle">
      {label}
    </span>
  );
}

function sevWeight(s: LintSeverity): number {
  return s === "error" ? 0 : s === "warn" ? 1 : 2;
}

/** Walk the content tree and apply the suggested fix to the node
 *  identified by the issue's anchor. Returns a new ResumeContent
 *  or null if the anchor didn't match any node (stale issue). */
function applyIssueSuggestion(
  content: ResumeContent,
  issue: LintIssue,
  suggestion: string,
): ResumeContent | null {
  // Header field — overwrite the named subfield.
  if (issue.anchorHeaderField) {
    return {
      ...content,
      header: { ...(content.header ?? {}), [issue.anchorHeaderField]: suggestion },
    };
  }

  const sections = content.sections.map((s) => {
    if (issue.anchorSectionId && s.id === issue.anchorSectionId) {
      // Section anchor → overwrite the printed title.
      return { ...s, title: suggestion };
    }
    if (!issue.anchorItemId && !issue.anchorBulletId) return s;
    return {
      ...s,
      items: s.items.map((it) => {
        if (issue.anchorItemId && it.id === issue.anchorItemId) {
          // Item anchor → overwrite the description paragraph.
          return { ...it, description: suggestion };
        }
        if (!issue.anchorBulletId) return it;
        return {
          ...it,
          bullets: it.bullets.map((b) =>
            b.id === issue.anchorBulletId ? { ...b, body: suggestion } : b,
          ),
        };
      }),
    };
  });
  return { ...content, sections };
}
