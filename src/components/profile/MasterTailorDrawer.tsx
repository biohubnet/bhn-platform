"use client";

/**
 * MasterTailorDrawer — three-step drawer wiring the AI tailor flow
 * for a tailored resume. Triggered from the MasterResumeBanner's
 * "AI tailor for this role" button.
 *
 * Steps:
 *   1. Input — paste a JD into the textarea OR pick an active
 *              InternshipPosting from the searchable dropdown.
 *              Confirm with "Find my best bullets".
 *   2. Loading — single-shot spinner while the preview endpoint runs
 *              (embed JD → cosine-rank → LLM pick + rewrite).
 *   3. Suggestions — group by section, checkbox per row (default
 *              checked), original/rewritten diff inline, expandable
 *              "Why this bullet" reason. Footer: Accept selection /
 *              Back / Cancel.
 *
 * On accept the apply endpoint runs in one transaction and the parent
 * is asked to refresh (router.refresh()) so the editor shows the
 * newly-inserted bullets.
 *
 * Self-only — the drawer hits self-scoped endpoints; nothing here
 * touches another user's data.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Wand2, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Sparkles, ArrowLeft, Library, FileText,
} from "lucide-react";
import { SECTION_LABEL, type ResumeSectionKind } from "@/lib/resume/types";

interface PostingRow {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  deadline: string | null;
  saved: boolean;
}

interface Suggestion {
  bulletId: string;
  originalBody: string;
  rewrittenBody: string;
  reason: string;
  sectionKind: string;
  anchorTitle: string | null;
  anchorSubtitle: string | null;
  similarity: number;
}

type Step = "input" | "loading" | "review" | "applying";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The id of the tailored resume the user is editing. The drawer
   *  writes its suggestions into this resume on accept. */
  resumeId: string;
  /** How many bullets in the master library — passed through from the
   *  banner so the drawer can show "Searching your 47-bullet library…". */
  libraryBulletCount: number;
}

export function MasterTailorDrawer({ open, onClose, resumeId, libraryBulletCount }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<"paste" | "posting">("paste");
  const [jdText, setJdText] = useState("");
  const [postingId, setPostingId] = useState<string | null>(null);
  const [postingFilter, setPostingFilter] = useState("");
  const [postings, setPostings] = useState<PostingRow[] | null>(null);
  const [postingsLoading, setPostingsLoading] = useState(false);

  const [jdLabel, setJdLabel] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState<Map<string, string>>(new Map());
  const [openReasons, setOpenReasons] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Reset to step 1 every time the drawer reopens — drafts are
  // ephemeral, never persisted across opens.
  useEffect(() => {
    if (!open) return;
    setStep("input");
    setError(null);
    setJdText("");
    setPostingId(null);
    setPostingFilter("");
    setSuggestions([]);
    setSelected(new Set());
    setEdited(new Map());
    setOpenReasons(new Set());
  }, [open]);

  // Lazy-load postings when the user switches to the picker tab.
  useEffect(() => {
    if (!open) return;
    if (mode !== "posting") return;
    if (postings !== null) return;
    setPostingsLoading(true);
    fetch("/api/profile/resume/master/ai-tailor", { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; postings?: PostingRow[]; error?: string };
        if (!r.ok || !j.ok) throw new Error(j.error ?? "Couldn't load postings.");
        setPostings(j.postings ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setPostingsLoading(false));
  }, [open, mode, postings]);

  // Escape closes (only when not in the middle of applying).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step !== "applying" && step !== "loading") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  const canSubmit = mode === "paste"
    ? jdText.trim().length >= 40
    : !!postingId;

  const filteredPostings = useMemo(() => {
    if (!postings) return [];
    const q = postingFilter.trim().toLowerCase();
    if (!q) return postings;
    return postings.filter((p) =>
      p.title.toLowerCase().includes(q)
      || p.companyName.toLowerCase().includes(q)
      || (p.location ?? "").toLowerCase().includes(q),
    );
  }, [postings, postingFilter]);

  const runPreview = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setStep("loading");
    try {
      const r = await fetch("/api/profile/resume/master/ai-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          ...(mode === "paste"
            ? { jobDescription: jdText.trim() }
            : { postingId }),
          maxBullets: 12,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean; error?: string;
        suggestions?: Suggestion[]; jdLabel?: string;
      };
      if (!r.ok || !j.ok || !Array.isArray(j.suggestions)) {
        setError(j.error ?? "AI tailor failed. Try again.");
        setStep("input");
        return;
      }
      setSuggestions(j.suggestions);
      setJdLabel(j.jdLabel ?? "");
      const allIds = new Set<string>(j.suggestions.map((s) => s.bulletId));
      setSelected(allIds);
      setEdited(new Map());
      setOpenReasons(new Set());
      setStep("review");
    } catch (e) {
      setError((e as Error).message ?? "Network error.");
      setStep("input");
    }
  }, [canSubmit, mode, jdText, postingId, resumeId]);

  const runApply = useCallback(async () => {
    if (selected.size === 0) return;
    setError(null);
    setStep("applying");
    try {
      const payload = suggestions
        .filter((s) => selected.has(s.bulletId))
        .map((s) => ({
          bulletId: s.bulletId,
          body: (edited.get(s.bulletId) ?? s.rewrittenBody).trim(),
          sectionKind: s.sectionKind,
          anchorTitle: s.anchorTitle ?? undefined,
          anchorSubtitle: s.anchorSubtitle ?? undefined,
        }));
      const r = await fetch("/api/profile/resume/master/ai-tailor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, suggestions: payload }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; inserted?: number };
      if (!r.ok || !j.ok) {
        setError(j.error ?? "Couldn't apply suggestions.");
        setStep("review");
        return;
      }
      // Close + refresh so the editor picks up the new bullets.
      onClose();
      router.refresh();
    } catch (e) {
      setError((e as Error).message ?? "Network error.");
      setStep("review");
    }
  }, [selected, suggestions, edited, resumeId, onClose, router]);

  // Group suggestions by section for the review step. Stable order:
  // experience → projects → skills → … (defined by SECTION_LABEL keys).
  const grouped = useMemo(() => {
    const order: ResumeSectionKind[] = [
      "experience", "projects", "skills", "education",
      "certifications", "publications", "awards", "volunteering",
      "summary", "other",
    ];
    const map = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const arr = map.get(s.sectionKind) ?? [];
      arr.push(s);
      map.set(s.sectionKind, arr);
    }
    return order
      .filter((k) => map.has(k))
      .map((k) => ({ kind: k, items: map.get(k)! }));
  }, [suggestions]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map((s) => s.bulletId)));
  }
  function toggleReason(id: string) {
    setOpenReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function updateEdited(id: string, body: string) {
    setEdited((prev) => {
      const next = new Map(prev);
      next.set(id, body);
      return next;
    });
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => { if (step !== "applying" && step !== "loading") onClose(); }}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-[640px] bg-card-solid border-l border-line shadow-2xl flex flex-col"
        role="dialog"
        aria-label="AI tailor for this role"
      >
        <header className="px-4 py-3 border-b border-line flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <span className="inline-flex w-8 h-8 rounded-md bg-brand-100 text-brand-700 items-center justify-center shrink-0">
              <Wand2 size={14} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-fg leading-tight">AI tailor for this role</h2>
              <p className="text-[11px] text-fg-muted leading-tight mt-0.5">
                {step === "input"
                  ? "Pick the role, AI finds the best bullets from your master."
                  : step === "loading"
                  ? `Reading the JD + searching your ${libraryBulletCount}-bullet library…`
                  : step === "applying"
                  ? "Inserting bullets into your resume…"
                  : jdLabel || "Review the picks"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === "applying" || step === "loading"}
            className="p-1.5 rounded-md text-fg-muted hover:bg-elevated disabled:opacity-50"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        {error && (
          <div className="mx-3 mt-3 px-3 py-2 text-[12px] text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-md inline-flex items-start gap-1.5">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* ── Step 1: input ───────────────────────────────────────── */}
        {step === "input" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex items-center gap-1 p-1 bg-elevated rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  mode === "paste"
                    ? "bg-card-solid text-fg ring-1 ring-inset ring-line shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <FileText size={12} /> Paste a JD
              </button>
              <button
                type="button"
                onClick={() => setMode("posting")}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  mode === "posting"
                    ? "bg-card-solid text-fg ring-1 ring-inset ring-line shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <Library size={12} /> Pick a posting
              </button>
            </div>

            {mode === "paste" ? (
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] font-semibold text-fg-subtle block">
                  Job description
                </label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={10}
                  placeholder={`Paste the full posting here — title, requirements, responsibilities. The AI will look for the bullets in your master that best match.`}
                  className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-[13px] leading-snug focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y min-h-[200px]"
                />
                <p className="text-[11px] text-fg-muted">
                  {jdText.trim().length < 40
                    ? `Paste at least a paragraph (${40 - jdText.trim().length} more characters).`
                    : `${jdText.trim().length} characters — ready to go.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.18em] font-semibold text-fg-subtle block">
                  Active postings
                </label>
                <input
                  type="text"
                  value={postingFilter}
                  onChange={(e) => setPostingFilter(e.target.value)}
                  placeholder="Filter by title, company, location…"
                  className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
                {postingsLoading && (
                  <div className="text-[12px] text-fg-muted inline-flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" /> Loading postings…
                  </div>
                )}
                {!postingsLoading && filteredPostings.length === 0 && (
                  <p className="text-[12px] text-fg-muted px-3 py-4 text-center bg-elevated/40 rounded-lg">
                    No active postings to pick from{postingFilter ? " matching that filter" : ""}.
                    {!postingFilter && " Paste a JD instead."}
                  </p>
                )}
                <ul className="space-y-1 max-h-[280px] overflow-y-auto">
                  {filteredPostings.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setPostingId(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg ring-1 ring-inset transition-colors ${
                          postingId === p.id
                            ? "bg-brand-50 ring-brand-300 text-fg"
                            : "bg-card-solid ring-line hover:bg-elevated"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-fg leading-tight truncate">
                              {p.title}
                            </p>
                            <p className="text-[11px] text-fg-muted leading-tight mt-0.5 truncate">
                              {p.companyName}{p.location ? ` · ${p.location}` : ""}
                            </p>
                          </div>
                          {p.saved && (
                            <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                              Saved
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
              <p className="text-[11px] text-fg-muted">
                <Sparkles size={10} className="inline -mt-0.5 mr-1" />
                Library: {libraryBulletCount} bullet{libraryBulletCount === 1 ? "" : "s"}.
              </p>
              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 size={13} /> Find my best bullets
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: loading ─────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center gap-3">
            <Loader2 size={28} className="text-brand-600 animate-spin" />
            <p className="text-[13px] font-semibold text-fg">Reading the JD + searching your library…</p>
            <p className="text-[11.5px] text-fg-muted max-w-[360px]">
              Embedding the role, ranking your {libraryBulletCount} bullet{libraryBulletCount === 1 ? "" : "s"} by similarity, then letting the LLM pick the strongest ≤12 and light-rewrite to match vocabulary.
            </p>
          </div>
        )}

        {/* ── Step 3: review ──────────────────────────────────────── */}
        {(step === "review" || step === "applying") && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-10 text-[12.5px] text-fg-muted">
                The AI returned no picks. Try a different JD or add more bullets to your master.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] text-fg-muted">
                    {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} · {selected.size} selected
                  </p>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {selected.size === suggestions.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="space-y-5">
                  {grouped.map((group) => (
                    <section key={group.kind}>
                      <h3 className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-fg-subtle mb-2 flex items-center gap-2">
                        <span>{SECTION_LABEL[group.kind as ResumeSectionKind] ?? group.kind}</span>
                        <span className="text-fg-muted normal-case tracking-normal">· {group.items.length}</span>
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((s) => {
                          const checked = selected.has(s.bulletId);
                          const editedText = edited.get(s.bulletId) ?? s.rewrittenBody;
                          const isChanged = s.originalBody.replace(/\s+/g, " ") !== s.rewrittenBody.replace(/\s+/g, " ");
                          const reasonOpen = openReasons.has(s.bulletId);
                          return (
                            <li
                              key={s.bulletId}
                              className={`rounded-lg ring-1 ring-inset p-3 transition-colors ${
                                checked
                                  ? "bg-card-solid ring-brand-200"
                                  : "bg-elevated/30 ring-line opacity-70"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelected(s.bulletId)}
                                  className="mt-1 w-4 h-4 accent-brand-600 cursor-pointer"
                                  aria-label={`Toggle bullet ${s.bulletId}`}
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                  {(s.anchorTitle || s.anchorSubtitle) && (
                                    <p className="text-[10.5px] uppercase tracking-[0.15em] font-bold text-fg-subtle">
                                      {[s.anchorTitle, s.anchorSubtitle].filter(Boolean).join(" · ")}
                                    </p>
                                  )}
                                  {isChanged ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <div className="rounded-md bg-elevated/40 border border-line p-2">
                                        <p className="text-[9.5px] uppercase tracking-[0.18em] font-semibold text-fg-subtle mb-1">From master</p>
                                        <p className="text-[12.5px] text-fg-muted leading-snug">{s.originalBody}</p>
                                      </div>
                                      <div className="rounded-md bg-card-solid border border-brand-200 p-2">
                                        <p className="text-[9.5px] uppercase tracking-[0.18em] font-semibold text-brand-700 mb-1">AI rewrite (editable)</p>
                                        <textarea
                                          value={editedText}
                                          onChange={(e) => updateEdited(s.bulletId, e.target.value)}
                                          rows={3}
                                          disabled={!checked || step === "applying"}
                                          className="w-full bg-card-solid border border-line rounded px-1.5 py-1 text-[12.5px] leading-snug focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 resize-y disabled:opacity-60"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-md bg-card-solid border border-line p-2">
                                      <p className="text-[9.5px] uppercase tracking-[0.18em] font-semibold text-fg-subtle mb-1">From master · no rewrite needed</p>
                                      <p className="text-[12.5px] text-fg leading-snug">{s.originalBody}</p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleReason(s.bulletId)}
                                    className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
                                  >
                                    {reasonOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    Why this bullet?
                                  </button>
                                  {reasonOpen && (
                                    <p className="text-[11.5px] text-fg leading-snug bg-brand-50/50 border border-brand-100 px-2 py-1.5 rounded">
                                      {s.reason}
                                      {s.similarity > 0 && (
                                        <span className="text-fg-muted"> · similarity {(s.similarity * 100).toFixed(0)}%</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer ------------------------------------------------- */}
        {(step === "review" || step === "applying") && (
          <footer className="px-4 py-3 border-t border-line flex items-center justify-between gap-2 bg-elevated/40">
            <button
              type="button"
              onClick={() => { if (step !== "applying") setStep("input"); }}
              disabled={step === "applying"}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold text-fg-muted hover:bg-elevated disabled:opacity-50"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={step === "applying"}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold text-fg-muted hover:bg-elevated disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runApply()}
                disabled={selected.size === 0 || step === "applying"}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-brand-600 text-white text-[12px] font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === "applying"
                  ? (<><Loader2 size={12} className="animate-spin" /> Inserting…</>)
                  : (<><CheckCircle2 size={12} /> Accept {selected.size} selected</>)
                }
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
