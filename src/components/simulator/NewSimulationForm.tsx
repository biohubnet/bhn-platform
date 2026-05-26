"use client";

/**
 * Simulation REQUEST form.
 *
 * As of 2026-05-26 the simulator no longer generates AI sims for users
 * synchronously. Instead the user submits a SimulationRequest, an
 * admin reviews + generates from /admin/simulator-requests, and the
 * sim shows up on /simulator under "Requested" once it's ready.
 *
 * The form keeps the same single-input pattern (URL or pasted JD) so
 * the muscle memory is identical. On success it doesn't redirect — it
 * shows a confirmation card pointing back to the dashboard.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";

function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes("\n")) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) return true;
  return false;
}

type SubmitResult = {
  duplicate: boolean;
  status: string;
  simulationId?: string | null;
  message?: string;
};

export function NewSimulationForm() {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const detectedAsUrl = looksLikeUrl(input);
  const tooShortForJd =
    !detectedAsUrl && input.trim().length > 0 && input.trim().length < 300;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const payload: { url?: string; text?: string } = detectedAsUrl
        ? { url: input.trim() }
        : { text: input.trim() };

      const res = await fetch("/api/simulator/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                "An admin will review the JD and publish the simulation to your dashboard. You'll see it appear under \"Requested\" on the Role-play page."}
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
            Job posting URL{" "}
            <span className="font-normal text-muted">or pasted JD</span>
          </label>
          <textarea
            id="jd-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              "https://jobs.example.com/posting/12345\n\n" +
              "— or paste the full job description text here (about 300+ characters)"
            }
            disabled={submitting}
            required
            rows={5}
            className="w-full resize-y rounded-md border border-line bg-card-solid px-3 py-2.5 text-sm font-mono min-h-[120px] placeholder:text-muted/60 placeholder:font-sans focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-muted">
            We build each simulation by hand or with AI assistance after
            review, so the result fits the posting and the company. Most
            requests are published within 24 hours of submission. You can
            paste the JD text directly if the URL is auth-walled (LinkedIn /
            Workday).
          </p>
          {input.trim().length > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              Detected as:{" "}
              <span className="font-semibold text-fg">
                {detectedAsUrl ? "URL" : "pasted JD"}
              </span>
              {tooShortForJd && (
                <span className="ml-2 text-amber-700">
                  · {input.trim().length} chars — JDs typically need ≥300
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
