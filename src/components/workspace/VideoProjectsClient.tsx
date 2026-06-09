"use client";

/**
 * Video Production project list — create / open / delete projects, plus a
 * one-click "Seed BHN Promo" that imports the Molly script and jumps into it.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FileText, Loader2, ArrowRight, Clapperboard } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ProjectRow {
  id: string;
  title: string;
  summary: string;
  status: string;
  scriptCount: number;
  updatedAt: string;
}

export function VideoProjectsClient({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/video-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; project?: { id: string }; error?: string };
      if (!res.ok || !j.ok) { setError(j.error ?? "Couldn't create."); return; }
      setTitle("");
      router.refresh();
      if (j.project) router.push(`/admin/workspace/marketing/video/${j.project.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its scripts? This can't be undone.`)) return;
    setProjects((cur) => cur.filter((p) => p.id !== id));
    await fetch(`/api/workspace/video-projects/${id}?force=true`, { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Create + seed row */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[16rem]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">New project</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="e.g. BHN Recruitment Reel"
              className="mt-1 w-full rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
          <button
            type="button"
            onClick={create}
            disabled={busy || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      </Card>

      {/* Project grid */}
      {projects.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <Clapperboard size={22} className="mx-auto text-muted" />
          <p className="mt-2 text-sm font-medium text-fg">No video projects yet</p>
          <p className="mt-1 text-xs text-muted">Create one above to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/workspace/marketing/video/${p.id}`} className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-fg group-hover:text-brand-700">{p.title}</h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {p.scriptCount} {p.scriptCount === 1 ? "script" : "scripts"} · {p.status}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(p.id, p.title)}
                  title="Delete project"
                  className="shrink-0 text-muted hover:text-rose-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {p.summary && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted">{p.summary}</p>}
              <Link
                href={`/admin/workspace/marketing/video/${p.id}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
              >
                <FileText size={12} /> Open scripts <ArrowRight size={12} />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
