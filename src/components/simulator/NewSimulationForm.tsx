"use client";

/**
 * Simulation REQUEST form.
 *
 * Text-only as of 2026-05-26. The URL-extraction path was removed:
 *   1. Posting links expire — pasting a Workday / ZipRecruiter URL
 *      that 404s six months later means the request becomes
 *      unactionable.
 *   2. Auth-walls (LinkedIn, Workday) often bounce Jina Reader
 *      anyway, leaving the trainee to paste the JD body manually as
 *      a fallback. Better to make the fallback the only path.
 *   3. Less surface area to maintain.
 *
 * One textarea. The trainee copies whatever fits the spirit of "the
 * job description" — preamble, qualifications, benefits — we don't
 * try to clean it up beforehand. The admin reads it as posted.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";

type SubmitResult = {
  duplicate: boolean;
  status: string;
  simulationId?: string | null;
  message?: string;
};

/** Lower-bound below which we tell the trainee they've pasted a fragment.
 *  Matches MIN_CONTENT_CHARS on the server. */
const MIN_PASTE_CHARS = 300;

export function NewSimulationForm() {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const charCount = input.trim().length;
  const tooShort = charCount > 0 && charCount < MIN_PASTE_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/simulator/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        duplicate?: boolean;
        requestId?: string;
        status?: string;
        simulationId?: string | null;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.requestId) {
        throw new Error(
          data.error ?? `Couldn't submit (HTTP ${res.status}).`,
        );
      }
      setResult({
        duplicate: !!data.duplicate,
        status: data.status ?? "pending",
        simulationId: data.simulationId ?? null,
        message: data.message,
      });
      setInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-base font-semibold text-fg">
              {result.duplicate
                ? "You already have a request for this posting"
                : "Request submitted"}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {result.message ??
                "Our team will review the JD and publish your simulation to your dashboard. You'll see it under \"Requested\" on the Role-play page; once it's ready it slides up into \"In progress\"."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/simulator"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Back to role-play <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-sm font-medium text-muted hover:text-fg"
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="jd-input"
            className="mb-2 block text-sm font-medium text-fg"
          >
            Paste the job description
          </label>
          <p className="mb-3 text-[12.5px] text-muted leading-relaxed">
            Copy whatever the posting page shows — title, company, full body,
            qualifications, even the benefits boilerplate. We&apos;ll handle
            the cleanup. <strong className="font-semibold text-fg">No links
            please</strong> — postings expire and a dead URL means we can&apos;t
            build your sim.
          </p>
          <textarea
            id="jd-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              "Paste the full job description here.\n\n" +
              "Include the role title, the company, the responsibilities, the qualifications — whatever the posting shows. The more context, the richer the simulation."
            }
            disabled={submitting}
            required
            rows={14}
            className="w-full resize-y rounded-md border border-line bg-card-solid px-3 py-2.5 text-sm font-mono min-h-[240px] placeholder:text-muted/60 placeholder:font-sans focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          {input.trim().length > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              <span className={tooShort ? "text-amber-700 font-semibold" : "text-fg font-semibold"}>
                {charCount.toLocaleString()}
              </span>{" "}
              characters
              {tooShort && (
                <span className="ml-2 text-amber-700">
                  · paste more of the posting — JDs typically need ≥{MIN_PASTE_CHARS} characters to generate a worthwhile quarter
                </span>
              )}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <p className="font-semibold">Couldn&apos;t submit your request</p>
            <p className="mt-0.5 leading-snug">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit request
              </>
            )}
          </button>
          <span className="text-xs text-muted">
            Typical turnaround: 24 hours
          </span>
        </div>
      </form>
    </Card>
  );
}
