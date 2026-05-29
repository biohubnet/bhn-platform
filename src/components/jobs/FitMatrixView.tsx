/**
 * FitMatrixView — presentational renderer for an AI fit-rating matrix
 * (see rateFitMatrix in lib/job-folders/ai.ts). Shows the overall
 * score + verdict, a count strip, the requirement-by-requirement
 * matrix (rating · evidence · how to close), and the next move.
 *
 * Pure/presentational — no hooks, no fetch — so it's reused by the
 * JobFolder editor panel and the internship detail page alike. Types
 * are imported type-only, so nothing from the AI/server module leaks
 * into the client bundle.
 */
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { FitMatrix, FitMatrixRow, FitRowRating } from "@/lib/job-folders/ai";

const RATING_META: Record<
  FitRowRating,
  { label: string; icon: typeof CheckCircle2; chip: string; dot: string }
> = {
  strong: {
    label: "Strong",
    icon: CheckCircle2,
    chip: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "text-emerald-600",
  },
  partial: {
    label: "Partial",
    icon: MinusCircle,
    chip: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "text-amber-600",
  },
  gap: {
    label: "Gap",
    icon: XCircle,
    chip: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "text-rose-600",
  },
};

export function FitMatrixView({ matrix }: { matrix: FitMatrix }) {
  const scoreColor =
    matrix.score >= 75 ? "text-emerald-900" : matrix.score >= 55 ? "text-amber-900" : "text-rose-900";
  const counts = { strong: 0, partial: 0, gap: 0 };
  for (const r of matrix.rows) counts[r.rating]++;

  return (
    <div>
      {/* Headline: score + verdict + rating counts */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex flex-col items-center sm:min-w-[92px]">
          <div className={`text-[40px] font-bold tabular-nums leading-none ${scoreColor}`}>
            {matrix.score}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-fg-subtle mt-1">
            / 100 fit
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-fg">{matrix.verdict}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(["strong", "partial", "gap"] as FitRowRating[]).map((r) =>
              counts[r] > 0 ? (
                <span
                  key={r}
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${RATING_META[r].chip}`}
                >
                  {counts[r]} {RATING_META[r].label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      {/* The matrix */}
      <ul className="mt-3 rounded-lg ring-1 ring-inset ring-line overflow-hidden divide-y divide-line">
        {matrix.rows.map((row, i) => (
          <FitRow key={i} row={row} />
        ))}
      </ul>

      {/* Next move */}
      {matrix.nextMove && (
        <div className="mt-3 rounded-md bg-brand-50 ring-1 ring-inset ring-brand-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-brand-800 mb-0.5">
            Highest-leverage next move
          </p>
          <p className="text-[12.5px] text-fg leading-snug">{matrix.nextMove}</p>
        </div>
      )}
    </div>
  );
}

function FitRow({ row }: { row: FitMatrixRow }) {
  const meta = RATING_META[row.rating];
  const Icon = meta.icon;
  return (
    <li className="bg-card px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <Icon size={15} className={`mt-[3px] shrink-0 ${meta.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[12.5px] font-semibold text-fg leading-snug">{row.requirement}</p>
            <span
              className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ring-inset ${meta.chip}`}
            >
              {meta.label}
            </span>
          </div>
          {row.evidence && (
            <p className="text-[12px] text-fg-muted mt-0.5 leading-snug">{row.evidence}</p>
          )}
          {row.tip && row.rating !== "strong" && (
            <p className="text-[11.5px] text-fg-subtle mt-1 leading-snug">
              <span className="font-semibold">Close it:</span> {row.tip}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
