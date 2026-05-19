"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

const STATUS_MESSAGES = [
  "Reading the job description…",
  "Identifying the role and competitive context…",
  "Casting your team and cross-functional partners…",
  "Writing your first week…",
  "Mapping out the 12-week arc…",
  "Almost ready — finalising the QBR…",
];

/** Decide whether the input looks like a URL (single-line, http or
 *  bare-domain shape) or a pasted JD body. Mirrors the same logic the
 *  server runs to pick the extraction path, so the client placeholder
 *  / hint stays in sync. */
function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.includes("\n")) return false; // multi-line → JD body
  if (/^https?:\/\//i.test(trimmed)) return true;
  // Bare-domain shape (e.g. jobs.example.com/posting/123)
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) return true;
  return false;
}

export function NewSimulationForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const detectedAsUrl = looksLikeUrl(input);
  const tooShortForJd = !detectedAsUrl && input.trim().length > 0 && input.trim().length < 300;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    // Rotate status messages every 3.5s so the trainee can see progress.
    const interval = setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 3500);

    try {
      // Branch the payload on input shape — single-line URL goes to the
      // Jina-Reader extractor on the server; multi-line / long-form
      // text bypasses the network fetch and gets hashed directly.
      const payload: { url?: string; text?: string } = detectedAsUrl
        ? { url: input.trim() }
        : { text: input.trim() };

      const res = await fetch("/api/simulator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Surface the real reason on failure. The previous fallback
      // ("Generation failed.") swallowed the actual error from the
      // server, so users couldn't tell whether the URL was the
      // problem, the AI was, or the auth wall on the site was.
      const data = (await res.json().catch(() => ({}))) as {
        attemptId?: string;
        error?: string;
      };
      if (!res.ok || !data.attemptId) {
        const reason =
          data.error ??
          `Generation failed (HTTP ${res.status} — server didn't return a JSON error).`;
        throw new Error(reason);
      }
      router.push(`/simulator/${data.attemptId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    } finally {
      clearInterval(interval);
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="jd-input"
            className="mb-2 block text-sm font-medium text-fg"
          >
            Job posting URL <span className="text-muted font-normal">or pasted JD</span>
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
            className="w-full rounded-md border border-line bg-card-solid px-3 py-2.5 text-sm font-mono placeholder:text-muted/60 placeholder:font-sans focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60 resize-y min-h-[120px]"
          />
          <p className="mt-2 text-xs text-muted">
            Works with LinkedIn, Indeed, company careers pages, even Google
            Docs with a JD pasted in. Paste the JD body directly when the
            URL is auth-walled (LinkedIn / Workday) or the page doesn't read
            cleanly. The same content is cached across trainees — once
            generated, anyone replays it instantly.
          </p>
          {/* Live hint — which mode we've detected, helps users self-correct
              when they paste something weird. */}
          {input.trim().length > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              Detected as:{" "}
              <span className="font-semibold text-fg">
                {detectedAsUrl ? "URL" : "pasted JD"}
              </span>
              {tooShortForJd && (
                <span className="ml-2 text-amber-700">
                  · {input.trim().length} chars — JDs typically need ≥300 to generate
                </span>
              )}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
            <p className="font-semibold">Couldn&apos;t generate the simulation</p>
            <p className="mt-0.5 leading-snug">{error}</p>
            <p className="mt-2 text-xs opacity-80">
              Common causes: an Indeed / LinkedIn URL that requires login,
              a search-results URL (not a specific posting), or a JD body
              shorter than 300 characters. Try pasting the JD text directly.
            </p>
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
                {STATUS_MESSAGES[statusIdx]}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate my simulation
              </>
            )}
          </button>
          <span className="text-xs text-muted">
            Typical generation: 15–25s for a fresh job
          </span>
        </div>
      </form>
    </Card>
  );
}
