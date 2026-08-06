"use client";
/**
 * Resume-tailor flow orchestrator.
 *
 * Lifecycle (from a fresh state):
 *   0. EMPTY        → "Parse this posting" big CTA. One click runs
 *                     the AI requirement parse.
 *   1. PARSED       → requirements list visible, no rounds yet.
 *                     "Run first assessment" CTA.
 *   2. ASSESSED     → latest round has assessments + verdict. Gap
 *                     prompts surface per-row. User fills responses.
 *   3. ROUND-DONE   → user clicked "Score this round" → assesses
 *                     again + new verdict. Loop until verdict="yes"
 *                     or the user calls it.
 *
 * One round at a time. Prior round responses ARE remembered server-
 * side (the API stitches them in), so the user only types into the
 * gaps that are still partial/missing this round.
 *
 * Persistence
 *   Every text edit fires a debounced PATCH so an in-progress round
 *   survives a tab close. The "Score this round" button is the only
 *   path that triggers the LLM and a new round.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Sparkles, Wand2, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, ArrowRight, MessageSquare, ListChecks, ChevronRight,
  HelpCircle, FileText, Save, Lightbulb} from "lucide-react";
import Link from "next/link";
import type {
  TailorState, Assessment, Round, Classification, Verdict,
} from "@/lib/tailor/types";

interface Props {
  postingId: string;
  postingTitle: string;
  companyName: string;
  applicantHasMaterials: boolean;
  initialState: TailorState;
}

export function TailorClient({
  postingId, postingTitle, companyName, applicantHasMaterials, initialState,
}: Props) {
  const [state, setState] = useState<TailorState>(initialState);
  const [working, setWorking] = useState<"parse" | "assess" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-requirement draft responses for the IN-PROGRESS round —
  // committed to the server when "Score this round" is clicked.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Latest round drives the gap UI; null when we haven't run an
  // assessment yet.
  const latestRound: Round | null = state.rounds.length > 0
    ? state.rounds[state.rounds.length - 1]
    : null;

  // Which requirements still need attention from the user. Take the
  // remainingWeaknesses from the latest verdict if present, otherwise
  // fall back to anything classified partial/missing.
  const focusReqIds = useMemo(() => {
    if (!latestRound) return new Set<string>();
    if (latestRound.verdict?.remainingWeaknesses?.length) {
      return new Set(latestRound.verdict.remainingWeaknesses);
    }
    return new Set(latestRound.assessments.filter((a) => a.classification !== "met").map((a) => a.requirementId));
  }, [latestRound]);

  const gapsAddressedThisRound = useMemo(() => {
    let n = 0;
    for (const id of focusReqIds) {
      if (drafts[id]?.trim()) n++;
    }
    return n;
  }, [drafts, focusReqIds]);

  // Debounced server save so an in-progress draft survives a tab close.
  // We only save when there's a latest round to layer responses onto;
  // before the first assessment there's nothing to persist.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!latestRound) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      // Mirror the drafts into the most-recent round's responses
      // field for server-side persistence (won't trigger a re-run).
      const mergedRound: Round = {
        ...latestRound,
        responses: { ...latestRound.responses, ...drafts },
      };
      const nextState: TailorState = {
        ...state,
        rounds: [...state.rounds.slice(0, -1), mergedRound],
      };
      fetch(`/api/internships/${postingId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", state: nextState }),
      }).catch(() => undefined);
    }, 1200);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  async function runParse() {
    setWorking("parse");
    setError(null);
    try {
      const r = await fetch(`/api/internships/${postingId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't parse the JD.");
        return;
      }
      setState(j.state as TailorState);
      setDrafts({});
    } finally {
      setWorking(null);
    }
  }

  async function runAssess() {
    setWorking("assess");
    setError(null);
    try {
      // Only POST responses for gaps the user actually addressed.
      const responses: Record<string, string> = {};
      for (const [k, v] of Object.entries(drafts)) {
        if (v && v.trim()) responses[k] = v.trim();
      }
      const r = await fetch(`/api/internships/${postingId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assess", responses }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't run the assessment.");
        return;
      }
      setState(j.state as TailorState);
      // Clear drafts — the next round prompts fresh fields. The
      // server has merged the responses into the round history.
      setDrafts({});
    } finally {
      setWorking(null);
    }
  }

  // ── Pre-flight banner — no materials at all ────────────────
  if (!applicantHasMaterials && state.requirements.length === 0) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900 inline-flex items-center gap-2">
          <AlertTriangle size={16} /> Build your application materials first
        </h2>
        <p className="text-sm text-amber-900/85 mt-2 max-w-2xl leading-relaxed">
          The tailor compares your resume + elevator pitch + bio against the JD.
          You don&apos;t have any of those on file yet. Take five minutes to fill
          in <Link href="/profile/application" className="underline font-semibold">Application Builder</Link> and come back — the tailor will have something to work with.
        </p>
        <Link
          href="/profile/application"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700"
        >
          Open Application Builder <ArrowRight size={13} />
        </Link>
      </section>
    );
  }

  // ── State 0: empty, no parse yet ───────────────────────────
  if (state.requirements.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-card surface-shadow p-6">
        <h2 className="text-base font-bold text-fg inline-flex items-center gap-2">
          <Wand2 size={15} className="text-brand-600" /> Ready when you are
        </h2>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          We&apos;ll start by parsing the {companyName} posting into a list of
          discrete requirements. After that, we score your current materials
          against each one, then walk you through closing the gaps.
        </p>
        <button
          type="button"
          onClick={runParse}
          disabled={working !== null}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-60 shadow-md shadow-brand-600/25"
        >
          {working === "parse" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Parse the job description
        </button>
        {error && <p className="text-xs text-rose-700 mt-3">{error}</p>}
      </section>
    );
  }

  // ── State 1+: requirements parsed, may or may not have a round ─
  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-sm text-rose-900 inline-flex items-start gap-2">
          <XCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Round history — collapsed view of every prior round so the
          user can see they're making progress. */}
      {state.rounds.length > 1 && (
        <RoundHistory rounds={state.rounds.slice(0, -1)} />
      )}

      {/* Requirements + assessments */}
      <section className="rounded-2xl border border-line bg-card overflow-hidden">
        <header className="px-5 pt-4 pb-3 border-b border-line/70 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-fg inline-flex items-center gap-2">
              <ListChecks size={15} className="text-brand-600" />
              JD requirements
              <span className="text-[11px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
                {state.requirements.length}
              </span>
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              {latestRound
                ? `Round ${latestRound.num} assessments below. Fill in the open gaps and re-score.`
                : "Run the first assessment to score your current materials against each row."}
            </p>
          </div>
          <button
            type="button"
            onClick={runParse}
            disabled={working !== null}
            title="Re-parse the JD — useful if the posting was updated."
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
          >
            <RefreshCw size={11} /> Re-parse
          </button>
        </header>

        <ul className="divide-y divide-line/70">
          {state.requirements.map((r) => {
            const a = latestRound?.assessments.find((x) => x.requirementId === r.id) ?? null;
            const draft = drafts[r.id] ?? "";
            const stillFocus = focusReqIds.has(r.id);
            return (
              <li key={r.id} className={`px-5 py-4 border-l-4 ${ROW_TONE[a?.classification ?? "none"]}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-elevated text-subtle text-[10px] font-bold tabular-nums flex items-center justify-center font-mono">
                    {r.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-fg leading-snug">{r.text}</p>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
                        r.importance === "required"
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                      }`}>
                        {r.importance === "required" ? "Required" : "Nice-to-have"}
                      </span>
                    </div>

                    {a && <AssessmentChip a={a} />}

                    {a && a.evidence && (
                      <p className="text-[11px] text-muted mt-1.5 leading-snug">
                        <span className="font-semibold text-fg">Evidence: </span>
                        {a.evidence}
                      </p>
                    )}
                    {a && a.reasoning && (
                      <p className="text-[11px] text-subtle mt-1 leading-snug italic">
                        {a.reasoning}
                      </p>
                    )}

                    {/* User input — only when this round flags this
                        row as still needing attention. */}
                    {a && stillFocus && a.question && (
                      <div className="mt-3 rounded-lg bg-brand-50/40 ring-1 ring-inset ring-brand-200 p-3">
                        <p className="text-xs font-semibold text-brand-900 inline-flex items-start gap-1.5">
                          <HelpCircle size={12} className="mt-0.5 shrink-0" />
                          {a.question}
                        </p>
                        {/* Worked example — models the shape of a strong
                            answer so the user isn't facing a blank box.
                            Placeholders only; the facts are theirs. */}
                        {a.exampleSentence && (
                          <div className="mt-2 rounded-lg bg-card/70 ring-1 ring-inset ring-brand-200/70 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 inline-flex items-center gap-1">
                              <Lightbulb size={10} /> Example answer
                            </p>
                            <p className="text-xs text-muted mt-1 leading-relaxed italic">
                              {a.exampleSentence}
                            </p>
                            {!draft && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDrafts((cur) => ({ ...cur, [r.id]: a.exampleSentence ?? "" }))
                                }
                                className="mt-1.5 text-[11px] font-semibold text-brand-700 hover:text-brand-900 underline underline-offset-2"
                              >
                                Start from this
                              </button>
                            )}
                          </div>
                        )}
                        <textarea
                          value={draft}
                          onChange={(e) => setDrafts((cur) => ({ ...cur, [r.id]: e.target.value }))}
                          rows={3}
                          placeholder="Type a specific example. 2-4 sentences is usually enough."
                          className="mt-2 w-full text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-y"
                        />
                        <p className="text-[10px] text-subtle mt-1 inline-flex items-center gap-1">
                          <Save size={9} /> Auto-saves while you type. Hit &quot;Score this round&quot; below to re-assess.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer CTA — first assessment, or re-score */}
        <div className="border-t border-line/70 px-5 py-4 flex flex-wrap items-center gap-3">
          {latestRound ? (
            <>
              <button
                type="button"
                onClick={runAssess}
                disabled={working !== null}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-60 shadow-md shadow-brand-600/25"
              >
                {working === "assess" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Score round {latestRound.num + 1}
              </button>
              <p className="text-xs text-muted">
                {gapsAddressedThisRound} of {focusReqIds.size} gap{focusReqIds.size === 1 ? "" : "s"} addressed in this round.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={runAssess}
              disabled={working !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-60 shadow-md shadow-brand-600/25"
            >
              {working === "assess" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Run the first assessment
            </button>
          )}
        </div>
      </section>

      {/* Hiring-manager verdict — appears AFTER each round */}
      {latestRound?.verdict && (
        <HiringManagerVerdict
          round={latestRound}
          postingTitle={postingTitle}
          companyName={companyName}
        />
      )}

      {/* Cross-link to the existing prep coach when the user is done */}
      {latestRound?.verdict?.decision === "yes" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="text-sm font-bold text-emerald-900 inline-flex items-center gap-2">
            <CheckCircle2 size={14} /> You&apos;re ready to apply
          </h3>
          <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed max-w-2xl">
            The hiring manager would interview this candidate. Open the posting
            and submit your application — your tailored evidence above can be
            pasted into the cover letter on the apply form, or worked into your
            resume. The bullets you wrote in each gap response are reusable.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/internships/${postingId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              Open posting <ArrowRight size={13} />
            </Link>
            <Link
              href={`/internships/${postingId}/prepare`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-card text-emerald-900 ring-1 ring-inset ring-emerald-200 text-sm font-bold hover:bg-elevated"
            >
              <FileText size={12} /> Interview prep coach
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

/** Row background + left rail per classification. Colour is a second
 *  channel only — every row still carries the AssessmentChip (icon +
 *  label), so the state is never conveyed by colour alone. */
const ROW_TONE: Record<Classification | "none", string> = {
  met:     "border-emerald-400 bg-emerald-50/40",
  partial: "border-amber-400   bg-amber-50/40",
  missing: "border-rose-400    bg-rose-50/40",
  none:    "border-transparent",
};

function AssessmentChip({ a }: { a: Assessment }) {
  const tone: Record<Classification, { label: string; cls: string; icon: React.ElementType }> = {
    met:     { label: "Met",     cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: CheckCircle2 },
    partial: { label: "Partial", cls: "bg-amber-50   text-amber-800   ring-amber-200",   icon: AlertTriangle },
    missing: { label: "Missing", cls: "bg-rose-50    text-rose-700    ring-rose-200",    icon: XCircle },
  };
  const t = tone[a.classification];
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ring-inset ${t.cls}`}>
      <Icon size={10} /> {t.label}
    </span>
  );
}

function HiringManagerVerdict({
  round, postingTitle, companyName,
}: {
  round: Round;
  postingTitle: string;
  companyName: string;
}) {
  if (!round.verdict) return null;
  const v: Verdict = round.verdict.decision;
  const tone: Record<Verdict, { headline: string; cls: string; icon: React.ElementType }> = {
    yes:   { headline: "Yes — interview this candidate", cls: "bg-emerald-50 text-emerald-900 ring-emerald-200", icon: CheckCircle2 },
    maybe: { headline: "Maybe — on the edge",            cls: "bg-amber-50   text-amber-900   ring-amber-200",   icon: AlertTriangle },
    no:    { headline: "Not yet — too thin",             cls: "bg-rose-50    text-rose-900    ring-rose-200",    icon: XCircle },
  };
  const t = tone[v];
  const Icon = t.icon;
  return (
    <section className={`rounded-2xl ring-1 ring-inset ${t.cls} p-5`}>
      <p className="text-[10px] uppercase tracking-[0.22em] font-bold opacity-70 inline-flex items-center gap-1.5">
        <MessageSquare size={11} /> Hiring-manager verdict · round {round.num}
      </p>
      <h3 className="text-base font-bold mt-1 inline-flex items-center gap-2">
        <Icon size={16} /> {t.headline}
      </h3>
      <p className="text-sm mt-2 leading-relaxed max-w-2xl">
        {round.verdict.reasoning || `(No reasoning returned. Try re-scoring.)`}
      </p>
      {round.verdict.remainingWeaknesses.length > 0 && (
        <p className="text-xs mt-3 opacity-80 inline-flex items-center gap-1">
          Still flagged:{" "}
          <span className="font-mono">{round.verdict.remainingWeaknesses.join(", ")}</span>
        </p>
      )}
      <p className="text-[11px] mt-3 opacity-70 italic">
        Reviewing the {postingTitle} role at {companyName}.
      </p>
    </section>
  );
}

function RoundHistory({ rounds }: { rounds: Round[] }) {
  return (
    <details className="rounded-2xl border border-line/70 bg-elevated/30">
      <summary className="cursor-pointer px-5 py-3 text-xs text-muted hover:text-fg select-none inline-flex items-center gap-2 list-none">
        <ChevronRight size={12} className="transition-transform [details[open]_&]:rotate-90" />
        <span className="font-semibold">{rounds.length} prior round{rounds.length === 1 ? "" : "s"}</span>
        <span className="text-subtle">— click to expand</span>
      </summary>
      <ul className="divide-y divide-line/70 px-5 pb-3 text-xs">
        {rounds.map((r) => (
          <li key={r.num} className="py-2 flex items-center gap-2">
            <span className="font-mono text-subtle">R{r.num}</span>
            <VerdictPill v={r.verdict?.decision ?? "maybe"} />
            <span className="text-muted truncate">
              {r.verdict?.reasoning ?? "(no verdict recorded)"}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function VerdictPill({ v }: { v: Verdict }) {
  const c =
    v === "yes"   ? "bg-emerald-100 text-emerald-800 ring-emerald-200" :
    v === "maybe" ? "bg-amber-100   text-amber-800   ring-amber-200" :
                    "bg-rose-100    text-rose-700    ring-rose-200";
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ring-inset ${c}`}>
      {v}
    </span>
  );
}
