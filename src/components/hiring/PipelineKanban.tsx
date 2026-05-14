"use client";
/**
 * Kanban view client component for /employer/postings/[id]/pipeline.
 *
 * Drag-and-drop between columns moves the application to the first
 * stage in the destination column. Drops are validated server-side
 * by the transition service; if the destination is illegal, the
 * card snaps back + an inline error banner appears.
 *
 * State strategy: optimistic update on drop, with router.refresh()
 * after the API call to reconcile against the server's source of
 * truth. Failures revert the local move.
 *
 * No external DnD library — we use the native HTML5 drag API to
 * keep the dependency surface lean. Tested on Chrome + Safari.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, AlertCircle, ArrowRight, Briefcase } from "lucide-react";

interface AppCard {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantOrg: string | null;
  status: string;
  stageLabel: string;
  stageEnteredAt: string;
  rating: number | null;
  offerStatus: string | null;
}

interface Column {
  id: string;
  label: string;
  stages: string[];
  apps: AppCard[];
}

interface Props {
  postingId: string;
  columns: Column[];
}

export function PipelineKanban({ postingId, columns: initialColumns }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_busy, startTransition] = useTransition();

  function findApp(id: string): { app: AppCard; colId: string } | null {
    for (const col of columns) {
      const app = col.apps.find((a) => a.id === id);
      if (app) return { app, colId: col.id };
    }
    return null;
  }

  async function moveTo(applicationId: string, destColId: string) {
    const found = findApp(applicationId);
    if (!found) return;
    if (found.colId === destColId) return;

    // Optimistic: snap the card into the destination column.
    const destCol = columns.find((c) => c.id === destColId)!;
    const newStage = destCol.stages[0];

    const prev = columns;
    setColumns((cols) =>
      cols.map((c) => {
        if (c.id === found.colId) {
          return { ...c, apps: c.apps.filter((a) => a.id !== applicationId) };
        }
        if (c.id === destColId) {
          return {
            ...c,
            apps: [
              { ...found.app, status: newStage, stageLabel: prettyStage(newStage) },
              ...c.apps,
            ],
          };
        }
        return c;
      }),
    );
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/employer/applications/${applicationId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toStage: newStage }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          // Revert the optimistic move.
          setColumns(prev);
          setError(data.error ?? "Move failed");
          return;
        }
        router.refresh();
      } catch (e) {
        setColumns(prev);
        setError((e as Error).message);
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-sm text-rose-900 inline-flex items-start gap-2">
          <AlertCircle size={14} className="text-rose-700 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-6 gap-3 min-w-[1100px]">
          {columns.map((col) => (
            <ColumnView
              key={col.id}
              postingId={postingId}
              col={col}
              onDragStart={(id) => setDraggedId(id)}
              onDrop={(id) => moveTo(id, col.id)}
              isDragTarget={draggedId !== null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColumnView({
  postingId,
  col,
  onDragStart,
  onDrop,
  isDragTarget,
}: {
  postingId: string;
  col: Column;
  onDragStart: (id: string) => void;
  onDrop: (id: string) => void;
  isDragTarget: boolean;
}) {
  const [over, setOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDrop(id);
  }

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border bg-card p-3 transition-colors ${
        over
          ? "border-brand-400 bg-brand-50"
          : isDragTarget
            ? "border-brand-200 border-dashed"
            : "border-line"
      }`}
    >
      <header className="flex items-center justify-between mb-3 px-1">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
          {col.label}
        </p>
        <p className="text-xs font-mono tabular-nums text-muted">{col.apps.length}</p>
      </header>
      <ul className="space-y-2">
        {col.apps.length === 0 ? (
          <li className="text-[11px] text-subtle italic py-3 text-center">empty</li>
        ) : (
          col.apps.map((a) => (
            <li
              key={a.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", a.id);
                onDragStart(a.id);
              }}
              className="rounded-xl border border-line bg-elevated/40 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm"
            >
              <Link
                href={`/employer/postings/${postingId}/applicants/${a.id}`}
                className="block group"
              >
                <p className="text-sm font-bold text-fg leading-tight group-hover:text-brand-700">
                  {a.applicantName}
                </p>
                {a.applicantOrg && (
                  <p className="text-[11px] text-muted truncate mt-0.5">{a.applicantOrg}</p>
                )}
                <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                  <span className="text-[10px] text-subtle font-mono">
                    {timeAgo(new Date(a.stageEnteredAt))}
                  </span>
                  {a.rating && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                      <Star size={9} className="fill-amber-500 text-amber-500" />
                      {a.rating}
                    </span>
                  )}
                  {a.offerStatus && (
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full ring-1 ring-inset ${
                        a.offerStatus === "accepted"
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                          : a.offerStatus === "declined"
                            ? "bg-rose-100 text-rose-800 ring-rose-200"
                            : "bg-violet-100 text-violet-800 ring-violet-200"
                      }`}
                    >
                      <Briefcase size={8} /> {a.offerStatus}
                    </span>
                  )}
                </div>
              </Link>
              <Link
                href={`/employer/postings/${postingId}/applicants/${a.id}`}
                className="mt-2 text-[10px] font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
              >
                Open <ArrowRight size={10} />
              </Link>
            </li>
          ))
        )}
      </ul>
      <p className="text-[10px] text-subtle text-center mt-3 leading-snug">
        {col.stages.map(prettyStage).join(" · ")}
      </p>
    </section>
  );
}

function prettyStage(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}
