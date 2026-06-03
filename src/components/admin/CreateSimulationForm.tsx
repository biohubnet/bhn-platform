"use client";

/**
 * Admin form to create a role-play Simulation directly — no
 * SimulationRequest required. Paste a JD, hit Generate, and POST to
 * /api/admin/simulations (AI path). Power users can expand "hand-
 * authored payload" to skip the AI and paste known-good JSON instead.
 *
 * On success we don't navigate away automatically — generation can take
 * a couple of minutes, so we show a result card with links to the
 * editor/preview and a "create another" reset.
 */
import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, ChevronDown, Theater, Plus,
  Upload, FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const MIN_CHARS = 300;

export function CreateSimulationForm() {
  const [jdText, setJdText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showPayload, setShowPayload] = useState(false);
  const [payloadText, setPayloadText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    simulationId: string;
    jobTitle: string;
    existed: boolean;
  } | null>(null);

  const jdChars = jdText.trim().length;
  const usePayload = showPayload && payloadText.trim().length > 0;
  // On the payload path the JD is optional — but if one IS typed it still
  // has to clear the 300-char floor (the API hashes it the trainee way).
  // On the AI path the JD is required.
  const canSubmit =
    !busy &&
    (usePayload ? jdChars === 0 || jdChars >= MIN_CHARS : jdChars >= MIN_CHARS);

  async function loadFile(file: File) {
    setError(null);
    if (!/\.json$/i.test(file.name) && file.type && !file.type.includes("json")) {
      setError(`That doesn't look like a .json file (${file.name}).`);
      return;
    }
    try {
      const text = await file.text();
      setPayloadText(text);
      setFileName(file.name);
      setShowPayload(true);
    } catch (err) {
      setError(`Couldn't read that file: ${(err as Error).message}`);
    }
  }
  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the value so re-picking the same file still fires onChange.
    e.target.value = "";
    if (file) void loadFile(file);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }
  function clearFile() {
    setFileName(null);
    setPayloadText("");
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      let payload: unknown;
      if (usePayload) {
        try {
          payload = JSON.parse(payloadText);
        } catch (e) {
          setError(`Hand-authored payload isn't valid JSON: ${(e as Error).message}`);
          setBusy(false);
          return;
        }
      }
      const res = await fetch("/api/admin/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText,
          sourceUrl: sourceUrl.trim() || undefined,
          payload,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        simulationId?: string;
        jobTitle?: string;
        existed?: boolean;
      };
      if (!res.ok || !j.ok || !j.simulationId) {
        setError(j.error ?? "Couldn't create the simulation.");
        return;
      }
      setDone({
        simulationId: j.simulationId,
        jobTitle: j.jobTitle ?? "Simulation",
        existed: !!j.existed,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={18} />
          <p className="font-semibold">
            {done.existed ? "That JD already had a simulation" : "Simulation created"}
          </p>
        </div>
        <p className="text-sm text-muted">
          <span className="font-medium text-fg">{done.jobTitle}</span>{" "}
          {done.existed
            ? "— a matching simulation already existed, so we linked you to it instead of making a duplicate. It's already in the trainee catalog."
            : "is live in the trainee Career Simulator catalog now — anyone can launch their own attempt."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/admin/simulations/${done.simulationId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Theater size={14} /> Open editor / preview
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setJdText("");
              setSourceUrl("");
              setPayloadText("");
              setShowPayload(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <Plus size={14} /> Create another
          </button>
          <Link
            href="/admin/simulator-requests"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Back to requests
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 p-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Job description
        </span>
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          rows={14}
          placeholder="Paste the full posting body — responsibilities, requirements, team context. The richer the JD, the better the simulation."
          className="w-full resize-y rounded-lg border border-line bg-card-solid px-3 py-2 font-mono text-[12.5px] leading-relaxed text-fg placeholder:text-subtle focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <span
          className={
            "mt-1 block text-[11px] " +
            (jdChars > 0 && jdChars < MIN_CHARS ? "text-rose-600" : "text-subtle")
          }
        >
          {jdChars.toLocaleString()} chars
          {usePayload
            ? jdChars > 0 && jdChars < MIN_CHARS
              ? ` · still needs ${MIN_CHARS}+ if you include a JD — or clear it (optional with a payload)`
              : " · optional when you upload or paste a payload"
            : ` · need at least ${MIN_CHARS} — paste the full posting, not a summary`}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Source URL <span className="font-normal normal-case tracking-normal text-subtle">(optional)</span>
        </span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…  — display only; shown on the attempt header"
          className="w-full rounded-lg border border-line bg-card-solid px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </label>

      {/* Hand-author escape hatch — paste known-good JSON to skip the AI. */}
      <div>
        <button
          type="button"
          onClick={() => setShowPayload((s) => !s)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-fg"
          aria-expanded={showPayload}
        >
          <ChevronDown
            size={13}
            className={"transition-transform " + (showPayload ? "" : "-rotate-90")}
          />
          Advanced · upload or paste a hand-authored payload instead of generating
        </button>
        {showPayload && (
          <div className="mt-2 space-y-2">
            {/* Drag-and-drop zone — also click-to-browse + keyboard. */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a .json payload file — drag and drop, or click to browse"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
                dragOver
                  ? "border-brand-400 bg-brand-50/70"
                  : fileName
                    ? "border-emerald-300 bg-emerald-50/40"
                    : "border-line bg-card-solid hover:border-brand-300 hover:bg-elevated/40",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={handleFileInput}
              />
              {fileName ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                    <FileJson size={16} /> {fileName}
                  </span>
                  <span className="text-[11px] text-muted">
                    Drop another file or click to replace ·{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile();
                      }}
                      className="font-medium text-emerald-700 underline-offset-2 hover:underline"
                    >
                      clear
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <Upload size={20} className={dragOver ? "text-brand-600" : "text-muted"} />
                  <span className="text-sm font-medium text-fg">
                    {dragOver ? "Drop the .json file" : "Drag a .json file here, or click to browse"}
                  </span>
                  <span className="text-[11px] text-subtle">…or paste the payload below</span>
                </>
              )}
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => {
                setPayloadText(e.target.value);
                if (fileName) setFileName(null);
              }}
              rows={8}
              placeholder='…or paste the payload JSON:  { "jobTitle": "…", "stats": [...], "people": [...], "weeks": [...] }'
              className="w-full resize-y rounded-lg border border-line bg-card-solid px-3 py-2 font-mono text-[12px] leading-relaxed text-fg placeholder:text-subtle focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="text-[11px] text-subtle">
              The file must be a full simulation payload —{" "}
              <span className="font-mono">stats</span>, <span className="font-mono">team</span>,{" "}
              <span className="font-mono">partners</span>, and{" "}
              <span className="font-mono">scenarios</span> arrays. A whole exported simulation
              (with a <span className="font-mono">payload</span> field) works too — it&apos;s
              unwrapped automatically. The easiest valid starting point is an existing sim&apos;s
              editor (Open editor → copy its JSON). Validated against the same schema as the AI
              path; the job description above is optional here.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[11px] text-subtle">
          {usePayload
            ? "Creates from your payload — no AI call."
            : "Generates with AI — usually 20–90 s, occasionally up to a couple of minutes."}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy
            ? usePayload
              ? "Creating…"
              : "Generating…"
            : usePayload
              ? "Create from payload"
              : "Generate simulation"}
        </button>
      </div>
    </Card>
  );
}
