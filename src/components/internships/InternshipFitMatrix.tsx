"use client";
/**
 * InternshipFitMatrix — on-demand AI fit-rating matrix on the
 * internship detail page. Distinct from the algorithmic FitExplain
 * panel above: this is a requirement-by-requirement read of the
 * trainee's resume against THIS posting's JD, with evidence and how to
 * close each gap. Computed only when the trainee asks (one AI call),
 * so it adds no cost to a normal page view.
 */
import { useState } from "react";
import Link from "next/link";
import { Gauge, Sparkles, Loader2 } from "lucide-react";
import { FitMatrixView } from "@/components/jobs/FitMatrixView";
import type { FitMatrix } from "@/lib/job-folders/ai";

export function InternshipFitMatrix({ postingId }: { postingId: string }) {
  const [loading, setLoading] = useState(false);
  const [matrix, setMatrix] = useState<FitMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noResume, setNoResume] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setNoResume(false);
    try {
      const res = await fetch(`/api/internships/${postingId}/rate-fit`, { method: "POST" });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        matrix?: FitMatrix;
        error?: string;
      } | null;
      if (!res.ok || !j?.ok || !j.matrix) {
        if (res.status === 400) setNoResume(true);
        setError(j?.error ?? `Couldn't build the matrix (HTTP ${res.status}).`);
        return;
      }
      setMatrix(j.matrix);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl ring-1 ring-inset ring-line bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold inline-flex items-center gap-2 text-fg">
            <Gauge size={14} /> Fit-rating matrix
          </p>
          <p className="text-[11.5px] text-fg-muted mt-0.5">
            An honest AI read of your most recent resume against each key requirement here — with evidence and how to close every gap.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {matrix ? "Re-rate" : "Build matrix"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[12px] text-rose-700">
          {error}
          {noResume && (
            <>
              {" "}
              <Link href="/profile/resumes" className="font-semibold underline hover:text-rose-800">
                Build one
              </Link>
              .
            </>
          )}
        </p>
      )}
      {!matrix && !error && !loading && (
        <p className="mt-2 text-[11.5px] text-fg-subtle">
          Build it to see, requirement by requirement, where you&apos;re strong, partial, or have a gap — before you apply.
        </p>
      )}
      {matrix && (
        <div className="mt-3">
          <FitMatrixView matrix={matrix} />
        </div>
      )}
    </div>
  );
}
