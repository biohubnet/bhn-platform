"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";

const STATUS_MESSAGES = [
  "Reading the job description…",
  "Identifying the role and competitive context…",
  "Casting your team and cross-functional partners…",
  "Writing your first week…",
  "Mapping out the 12-week arc…",
  "Almost ready — finalising the QBR…",
];

export function NewSimulationForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    // Rotate status messages every 3.5s so the trainee can see progress.
    const interval = setInterval(() => {
      setStatusIdx((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 3500);

    try {
      const res = await fetch("/api/simulator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        attemptId?: string;
        error?: string;
      };
      if (!res.ok || !data.attemptId) {
        throw new Error(data.error ?? "Generation failed.");
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
            htmlFor="jd-url"
            className="mb-2 block text-sm font-medium text-fg"
          >
            Job posting URL
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="jd-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://jobs.example.com/posting/12345"
              disabled={submitting}
              required
              className="w-full rounded-md border border-line bg-card-solid pl-9 pr-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Works with LinkedIn, Indeed, company careers pages, even Google
            Docs with a JD pasted in. The same URL is cached across trainees —
            once generated, anyone replays it instantly.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting || !url.trim()}
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
