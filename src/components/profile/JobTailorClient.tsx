"use client";
/**
 * Job Tailor workspace. Drives the pipeline end to end:
 *   ingest (URL/JD) → ATS + eligibility + gap → draft → QA + fit → export.
 * Grounded only in the master library; never submits.
 */
import { useState } from "react";
import {
  Sparkles, Loader2, Link2, ClipboardPaste, AlertTriangle, CheckCircle2,
  XCircle, Download, FileText, ShieldQuestion, RotateCcw, Lightbulb,
} from "lucide-react";
import type { ResumeContent } from "@/lib/resume/types";

/* ── response shapes ─────────────────────────────────────────────── */
interface Gate { kind: string; text: string; blocking: boolean }
interface Parse {
  title: string; company: string; location?: string | null; comp?: string | null;
  mustHaves: string[]; niceToHaves: string[]; responsibilities: string[]; eligibilityGates: Gate[];
}
interface Job { jobId: string; ats: string; parse: Parse }

interface GapItem { requirement: string; kind: "must" | "nice"; status: "have" | "partial" | "gap"; rationale: string; closeWith?: string | null }
interface Gap { items: GapItem[]; reachCall: "strong" | "stretch" | "skip"; reachRationale: string; unsupportedClaims: string[] }
interface Fit { overall: "strong" | "partial" | "gap"; haves: number; partials: number; gaps: number; total: number; reachCall: string; reachRationale: string; residuals: string[]; flags: string[] }
interface QaCheck { id: string; label: string; pass: boolean; detail?: string }
interface Qa { pass: boolean; checks: QaCheck[] }
interface AtsOutput { id: string; label: string; kind: string; fmt: string }
interface Plan { ats: string; label: string; note: string; outputs: AtsOutput[] }
interface RunResult { runId: string; status: string; content: ResumeContent; cover: string; gap: Gap; fit: Fit; qa: Qa; plan: Plan }

const ATS_LABEL: Record<string, string> = {
  workday: "Workday", greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", successfactors: "SuccessFactors", other: "Standard",
};

export function JobTailorClient() {
  const [tab, setTab] = useState<"url" | "paste">("url");
  const [url, setUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ingest() {
    if (ingesting) return;
    setError(null); setResult(null); setIngesting(true);
    try {
      const r = await fetch("/api/tailoring/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "url" ? { url } : { jdText }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setError(j.error ?? "Couldn't read that job."); return; }
      setJob({ jobId: j.jobId, ats: j.ats, parse: j.parse });
    } catch (e) { setError((e as Error).message); } finally { setIngesting(false); }
  }

  async function tailor() {
    if (!job || running) return;
    setError(null); setRunning(true);
    try {
      const r = await fetch("/api/tailoring/runs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setError(j.error ?? "Tailoring failed."); return; }
      setResult(j as RunResult);
    } catch (e) { setError((e as Error).message); } finally { setRunning(false); }
  }

  function reset() { setJob(null); setResult(null); setError(null); setUrl(""); setJdText(""); }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-[12.5px] px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── Step 1: ingest ───────────────────────────────────────── */}
      {!job && (
        <div className="rounded-2xl border border-line bg-card-solid p-4">
          <div className="flex gap-1.5 mb-3">
            <TabBtn active={tab === "url"} onClick={() => setTab("url")} icon={<Link2 size={13} />}>Job URL</TabBtn>
            <TabBtn active={tab === "paste"} onClick={() => setTab("paste")} icon={<ClipboardPaste size={13} />}>Paste JD</TabBtn>
          </div>
          {tab === "url" ? (
            <input
              value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://boards.greenhouse.io/acme/jobs/123…"
              onKeyDown={(e) => { if (e.key === "Enter") ingest(); }}
              className="w-full text-[13px] px-3 py-2 rounded-lg bg-elevated ring-1 ring-inset ring-line focus:outline-none focus:ring-brand-300"
            />
          ) : (
            <textarea
              value={jdText} onChange={(e) => setJdText(e.target.value)} rows={8} placeholder="Paste the full job description here (at least 300 characters)…"
              className="w-full text-[13px] px-3 py-2 rounded-lg bg-elevated ring-1 ring-inset ring-line focus:outline-none focus:ring-brand-300 resize-y"
            />
          )}
          <button
            onClick={ingest} disabled={ingesting || (tab === "url" ? !url.trim() : jdText.trim().length < 300)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {ingesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {ingesting ? "Reading the posting…" : "Analyze posting"}
          </button>
        </div>
      )}

      {/* ── Step 2: job summary + eligibility ────────────────────── */}
      {job && (
        <div className="rounded-2xl border border-line bg-card-solid p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-fg">{job.parse.title}</h2>
              <p className="text-[12.5px] text-fg-muted">{job.parse.company}{job.parse.location ? ` · ${job.parse.location}` : ""}{job.parse.comp ? ` · ${job.parse.comp}` : ""}</p>
            </div>
            <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-brand-50 text-brand-800 ring-1 ring-brand-200">{ATS_LABEL[job.ats] ?? job.ats}</span>
          </div>

          {/* Eligibility gates first (rule 4). */}
          {job.parse.eligibilityGates.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-amber-900 mb-1.5"><ShieldQuestion size={13} /> Check before you invest</div>
              <ul className="space-y-1">
                {[...job.parse.eligibilityGates].sort((a, b) => Number(b.blocking) - Number(a.blocking)).map((g, i) => (
                  <li key={i} className="text-[12px] text-amber-900 flex items-start gap-1.5">
                    <span className={g.blocking ? "text-rose-600 font-bold" : "text-amber-600"}>{g.blocking ? "●" : "○"}</span>
                    <span><b className="capitalize">{g.kind.replace(/_/g, " ")}:</b> {g.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <ReqList title="Must-haves" items={job.parse.mustHaves} />
            <ReqList title="Nice-to-haves" items={job.parse.niceToHaves} />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={tailor} disabled={running} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {running ? "Tailoring (gap → draft → QA)…" : "Tailor my resume + cover"}
            </button>
            <button onClick={reset} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-fg-muted ring-1 ring-line hover:bg-elevated"><RotateCcw size={12} /> New job</button>
          </div>
        </div>
      )}

      {/* ── Step 3: result ───────────────────────────────────────── */}
      {result && <ResultView result={result} />}
    </div>
  );
}

/* ── result ──────────────────────────────────────────────────────── */
function ResultView({ result }: { result: RunResult }) {
  const [correction, setCorrection] = useState("");
  const [savedRule, setSavedRule] = useState(false);
  const fit = result.fit;
  // Static class strings (Tailwind can't see runtime-interpolated names).
  const TONE = {
    strong: { wrap: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-600" },
    partial: { wrap: "bg-amber-50 border-amber-200", badge: "bg-amber-600" },
    gap: { wrap: "bg-rose-50 border-rose-200", badge: "bg-rose-600" },
  }[fit.overall];

  async function saveCorrection() {
    if (!correction.trim()) return;
    const r = await fetch(`/api/tailoring/runs/${result.runId}/corrections`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleText: correction.trim(), scope: "global", after: correction.trim() }),
    });
    if (r.ok) { setSavedRule(true); setCorrection(""); }
  }

  return (
    <div className="space-y-4">
      {/* Fit scorecard */}
      <div className={`rounded-2xl border p-4 ${TONE.wrap}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-md text-white ${TONE.badge}`}>{fit.overall} fit</span>
            <span className="text-[13px] font-semibold text-fg">{fit.haves}/{fit.total} must-haves met · {fit.partials} partial · {fit.gaps} gap</span>
          </div>
          <span className="text-[11.5px] font-semibold text-fg-muted">Reach call: <b className="capitalize text-fg">{fit.reachCall}</b></span>
        </div>
        <p className="mt-2 text-[12.5px] text-fg-muted leading-snug">{fit.reachRationale}</p>
        {fit.residuals.length > 0 && (
          <div className="mt-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-fg-subtle mb-1">Honest residual gaps</p>
            <ul className="space-y-0.5">{fit.residuals.map((r, i) => <li key={i} className="text-[12px] text-fg-muted">• {r}</li>)}</ul>
          </div>
        )}
        {fit.flags.length > 0 && (
          <div className="mt-2.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5">
            <p className="text-[11px] font-bold text-rose-800 flex items-center gap-1"><AlertTriangle size={11} /> Flagged — not in your master, never fabricated:</p>
            <ul className="mt-0.5">{fit.flags.map((f, i) => <li key={i} className="text-[12px] text-rose-900">• {f}</li>)}</ul>
          </div>
        )}
      </div>

      {/* QA gate */}
      <div className="rounded-2xl border border-line bg-card-solid p-4">
        <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted mb-2">QA gate {result.qa.pass ? "— passed" : "— blocked"}</h3>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {result.qa.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-1.5 text-[12px]">
              {c.pass ? <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" /> : <XCircle size={13} className="text-rose-600 mt-0.5 shrink-0" />}
              <span className="text-fg">{c.label}{c.detail ? <span className="text-fg-subtle"> — {c.detail}</span> : ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Downloads */}
      <div className="rounded-2xl border border-line bg-card-solid p-4">
        <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted">Download for {result.plan.label}</h3>
        <p className="text-[11.5px] text-fg-muted mt-1 mb-2.5 leading-snug">{result.plan.note}</p>
        <div className="flex flex-wrap gap-2">
          {result.plan.outputs.map((o) => (
            <a key={o.id} href={`/api/tailoring/runs/${result.runId}/export?out=${o.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100">
              <Download size={12} /> {o.label}
            </a>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-fg-subtle">You review and submit. This tool never auto-submits.</p>
      </div>

      {/* Previews */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-card-solid p-4">
          <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted mb-2 flex items-center gap-1.5"><FileText size={12} /> Resume</h3>
          <ResumePreview content={result.content} />
        </div>
        <div className="rounded-2xl border border-line bg-card-solid p-4">
          <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted mb-2 flex items-center gap-1.5"><FileText size={12} /> Cover letter</h3>
          <p className="text-[12.5px] text-fg whitespace-pre-wrap leading-relaxed">{result.cover}</p>
        </div>
      </div>

      {/* Gap detail */}
      <details className="rounded-2xl border border-line bg-card-solid p-4">
        <summary className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted cursor-pointer">Requirement-by-requirement gap analysis</summary>
        <div className="mt-3 space-y-1.5">
          {result.gap.items.map((g, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              <span className={`shrink-0 mt-0.5 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${g.status === "have" ? "bg-emerald-100 text-emerald-800" : g.status === "partial" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{g.status}</span>
              <span className="text-fg"><b>{g.requirement}</b> <span className="text-fg-subtle">({g.kind})</span> — {g.rationale}{g.closeWith ? <em className="text-fg-muted"> Close with: {g.closeWith}</em> : ""}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Learning loop */}
      <div className="rounded-2xl border border-line bg-card-solid p-4">
        <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-muted mb-1 flex items-center gap-1.5"><Lightbulb size={12} /> Teach it once</h3>
        <p className="text-[11.5px] text-fg-muted mb-2">A preference you give here is saved as a rule and applied to every future tailoring run — so you only correct it once.</p>
        {savedRule ? (
          <p className="text-[12.5px] text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 size={13} /> Saved — it'll apply next time.</p>
        ) : (
          <div className="flex gap-2">
            <input value={correction} onChange={(e) => setCorrection(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveCorrection(); }}
              placeholder="e.g. Always lead with my finance credentials before tooling."
              className="flex-1 text-[12.5px] px-3 py-2 rounded-lg bg-elevated ring-1 ring-inset ring-line focus:outline-none focus:ring-brand-300" />
            <button onClick={saveCorrection} disabled={!correction.trim()} className="px-3 py-2 rounded-lg text-[12.5px] font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">Save rule</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── small pieces ────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${active ? "bg-brand-600 text-white" : "text-fg-muted ring-1 ring-line hover:bg-elevated"}`}>
      {icon} {children}
    </button>
  );
}

function ReqList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-fg-subtle mb-1">{title}</p>
      {items.length === 0 ? <p className="text-[12px] text-fg-subtle">None extracted.</p> : (
        <ul className="space-y-0.5">{items.slice(0, 8).map((r, i) => <li key={i} className="text-[12px] text-fg-muted">• {r}</li>)}</ul>
      )}
    </div>
  );
}

function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
      {content.header?.name && (
        <div className="border-b border-line pb-2">
          <p className="text-[13px] font-bold text-fg">{content.header.name}</p>
          <p className="text-[11px] text-fg-subtle">{[content.header.email, content.header.phone, content.header.location].filter(Boolean).join("  ·  ")}</p>
          {content.header.summary && <p className="text-[12px] text-fg-muted mt-1">{content.header.summary}</p>}
        </div>
      )}
      {content.sections.map((s) => (
        <div key={s.id}>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-brand-700 mb-1">{s.title || s.kind}</p>
          {s.items.map((it) => (
            <div key={it.id} className="mb-2">
              {(it.title || it.subtitle || it.dateRange) && (
                <p className="text-[12px] font-semibold text-fg">{[it.title, it.subtitle].filter(Boolean).join(", ")}{it.dateRange ? <span className="font-normal text-fg-subtle italic"> · {it.dateRange}</span> : ""}</p>
              )}
              <ul className="mt-0.5 space-y-0.5">{it.bullets.map((b) => <li key={b.id} className="text-[12px] text-fg-muted pl-3 -indent-3">• {b.body}</li>)}</ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
