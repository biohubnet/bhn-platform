"use client";

/**
 * Admin manager for showcase groups, rendered on /admin/showcase above
 * the submissions grid. Create a named group → it gets a public, no-login
 * submission link at /showcase/<slug>. Copy the link, open/close
 * submissions, edit the copy, or delete.
 */
import { useState } from "react";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

type Group = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string | null;
  intro: string | null;
  active: boolean;
  submissionCount: number;
};

export function ShowcaseGroupsManager({
  initialGroups,
}: {
  initialGroups: Group[];
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", eyebrow: "", intro: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const publicUrl = (slug: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/showcase/${slug}`;

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/showcase/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        group?: Group;
        error?: string;
      };
      if (!res.ok || !data.group) {
        throw new Error(data.error ?? "Couldn't create the group.");
      }
      setGroups((g) => [data.group as Group, ...g]);
      setForm({ name: "", eyebrow: "", intro: "" });
      setCreating(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patchGroup(id: string, patch: Partial<Group>) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    await fetch(`/api/admin/showcase/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  async function deleteGroup(id: string, slug: string, count: number) {
    if (
      !confirm(
        `Delete the "${slug}" showcase group?${count > 0 ? ` It has ${count} submission(s) — those rows stay in the dashboard, but its public link stops accepting new entries.` : ""}`,
      )
    ) {
      return;
    }
    setGroups((gs) => gs.filter((g) => g.id !== id));
    await fetch(`/api/admin/showcase/groups/${id}`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line/70 bg-card-solid">
      <header className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-3.5">
        <div>
          <h2 className="text-[13.5px] font-semibold text-fg">Showcase groups</h2>
          <p className="text-[12px] text-fg-subtle">
            Each group gets its own public, no-login submission link.
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-700"
        >
          {creating ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {creating ? "Cancel" : "New group"}
        </button>
      </header>

      {creating && (
        <form
          onSubmit={createGroup}
          className="space-y-2.5 border-b border-line/60 bg-raised/15 px-5 py-4"
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Showcase title — e.g. Graduate Showcase"
            maxLength={160}
            className="w-full rounded-md border border-line bg-card-solid px-3 py-2 text-[13.5px] text-fg outline-none focus:border-brand-400"
          />
          <input
            value={form.eyebrow}
            onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
            placeholder="Eyebrow / category — e.g. Learning Pathway · Clinical Research 2026"
            maxLength={160}
            className="w-full rounded-md border border-line bg-card-solid px-3 py-2 text-[13px] text-fg outline-none focus:border-brand-400"
          />
          <textarea
            value={form.intro}
            onChange={(e) => setForm({ ...form, intro: e.target.value })}
            placeholder="Intro blurb shown under the title"
            rows={2}
            maxLength={600}
            className="w-full resize-y rounded-md border border-line bg-card-solid px-3 py-2 text-[13px] text-fg outline-none focus:border-brand-400"
          />
          {error && <p className="text-[12.5px] text-rose-600">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-fg-subtle">
              A URL slug is generated from the title; the public link appears
              below once created.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Create group
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-fg-subtle">
          No showcase groups yet — create one to get a public submission link.
        </p>
      ) : (
        <ul className="divide-y divide-line/50">
          {groups.map((g) => (
            <li key={g.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-fg">
                      {g.name}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                        g.active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-line/50 text-fg-subtle",
                      ].join(" ")}
                    >
                      {g.active ? "Open" : "Closed"}
                    </span>
                    <span className="text-[11.5px] text-fg-subtle">
                      {g.submissionCount} submission
                      {g.submissionCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="truncate text-[11.5px] text-brand-700">
                      /showcase/{g.slug}
                    </code>
                    <a
                      href={publicUrl(g.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg-subtle transition hover:text-brand-700"
                      title="Open public page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => copyLink(g.slug)}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-[11.5px] font-medium text-fg transition hover:border-brand-400 hover:text-brand-700"
                  >
                    {copied === g.slug ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => patchGroup(g.id, { active: !g.active })}
                    className="rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-[11.5px] font-medium text-fg transition hover:border-brand-400"
                    title={g.active ? "Close submissions" : "Reopen submissions"}
                  >
                    {g.active ? "Close" : "Open"}
                  </button>
                  <button
                    onClick={() => setEditing(editing === g.id ? null : g.id)}
                    className="rounded-md border border-line bg-card-solid p-1.5 text-fg-muted transition hover:text-fg"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteGroup(g.id, g.slug, g.submissionCount)}
                    className="rounded-md border border-line bg-card-solid p-1.5 text-fg-muted transition hover:border-rose-300 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editing === g.id && (
                <EditGroup
                  group={g}
                  onSave={(patch) => {
                    patchGroup(g.id, patch);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditGroup({
  group,
  onSave,
  onCancel,
}: {
  group: Group;
  onSave: (p: Partial<Group>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [eyebrow, setEyebrow] = useState(group.eyebrow ?? "");
  const [intro, setIntro] = useState(group.intro ?? "");
  return (
    <div className="mt-3 space-y-2 rounded-md border border-line/70 bg-raised/15 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={160}
        className="w-full rounded-md border border-line bg-card-solid px-3 py-1.5 text-[13px] text-fg outline-none focus:border-brand-400"
      />
      <input
        value={eyebrow}
        onChange={(e) => setEyebrow(e.target.value)}
        maxLength={160}
        placeholder="Eyebrow / category"
        className="w-full rounded-md border border-line bg-card-solid px-3 py-1.5 text-[12.5px] text-fg outline-none focus:border-brand-400"
      />
      <textarea
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        rows={2}
        maxLength={600}
        placeholder="Intro blurb"
        className="w-full resize-y rounded-md border border-line bg-card-solid px-3 py-1.5 text-[12.5px] text-fg outline-none focus:border-brand-400"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-fg transition hover:border-line-strong"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              name: name.trim() || group.name,
              eyebrow: eyebrow.trim() || null,
              intro: intro.trim() || null,
            })
          }
          className="rounded-md bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
