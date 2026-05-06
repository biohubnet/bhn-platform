"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Sparkles, Wrench, ArrowUp, MessageSquare, Pencil, Trash2, Eye, EyeOff,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ChangeLogEntry {
  id: string;
  title: string;
  body: string;
  kind: string;
  version: string | null;
  visibleTo: string[];
  publishedAt: string | Date;
}

const KIND_META: Record<string, { label: string; tone: "brand" | "amber" | "success" | "neutral"; icon: React.ElementType }> = {
  feature:     { label: "New",         tone: "brand",   icon: Sparkles },
  improvement: { label: "Improved",    tone: "success", icon: ArrowUp },
  fix:         { label: "Fix",         tone: "amber",   icon: Wrench },
  note:        { label: "Note",        tone: "neutral", icon: MessageSquare },
};

const ALL_ROLES: { id: string; label: string }[] = [
  { id: "trainee",    label: "Trainees" },
  { id: "evaluating", label: "Evaluating" },
  { id: "instructor", label: "Instructors" },
  { id: "admin",      label: "Admins" },
  { id: "superadmin", label: "Superadmins" },
];

interface Props {
  entries: ChangeLogEntry[];
  canManage: boolean;
}

export function ChangeLogClient({ entries, canManage }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ChangeLogEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("feature");
  const [version, setVersion] = useState("");
  const [visibleTo, setVisibleTo] = useState<string[]>(ALL_ROLES.map((r) => r.id));

  function openNew() {
    setEditing(null);
    setTitle(""); setBody(""); setKind("feature"); setVersion("");
    setVisibleTo(ALL_ROLES.map((r) => r.id));
    setCreating(true);
  }
  function openEdit(e: ChangeLogEntry) {
    setEditing(e);
    setTitle(e.title); setBody(e.body); setKind(e.kind); setVersion(e.version ?? "");
    setVisibleTo(e.visibleTo);
    setCreating(true);
  }
  function close() {
    setCreating(false);
    setEditing(null);
  }
  function toggleRole(id: string) {
    setVisibleTo((cur) => (cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id]));
  }

  async function save() {
    if (!title.trim()) {
      alert("Title required");
      return;
    }
    if (visibleTo.length === 0) {
      alert("Pick at least one role to share with — otherwise nobody will see this entry.");
      return;
    }
    setBusy(true);
    try {
      const payload = { title, body, kind, version: version.trim() || null, visibleTo };
      const url = editing ? `/api/changelog/${editing.id}` : "/api/changelog";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Save failed");
        return;
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this changelog entry? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/changelog/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex items-center justify-end">
          <Button onClick={openNew} variant="primary"><Plus size={14} /> New entry</Button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-card rounded-2xl border border-line p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Sparkles size={20} />
          </div>
          <p className="font-medium text-fg">Nothing here yet</p>
          <p className="text-sm text-muted mt-1">Updates will appear as the platform evolves.</p>
        </div>
      ) : (
        <ol className="space-y-5">
          {entries.map((e) => {
            const meta = KIND_META[e.kind] ?? KIND_META.feature;
            const Icon = meta.icon;
            const isEveryone = e.visibleTo.length === ALL_ROLES.length;
            return (
              <li
                key={e.id}
                className="bg-card rounded-2xl border border-line p-5 hover:border-brand-200 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    meta.tone === "brand"   && "bg-brand-50 text-brand-600",
                    meta.tone === "success" && "bg-emerald-50 text-emerald-600",
                    meta.tone === "amber"   && "bg-amber-50 text-amber-600",
                    meta.tone === "neutral" && "bg-elevated text-muted",
                  )}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {e.version && <Badge tone="neutral">v{e.version}</Badge>}
                      <span className="text-xs text-subtle">
                        {new Date(e.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      {canManage && (
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-subtle">
                          {isEveryone ? (
                            <span className="inline-flex items-center gap-1"><Eye size={11} /> everyone</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><EyeOff size={11} /> {e.visibleTo.length} role{e.visibleTo.length === 1 ? "" : "s"}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-fg leading-snug">{e.title}</h3>
                    {e.body && (
                      <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-line">{e.body}</p>
                    )}
                    {canManage && (
                      <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-xs text-muted hover:text-brand-600 inline-flex items-center gap-1"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => remove(e.id)}
                          className="text-xs text-muted hover:text-rose-600 inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                        <span className="text-xs text-subtle ml-2">
                          Visible to: {e.visibleTo.map((r) => r === "trainee" ? "trainees" : r + "s").join(" · ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Modal
        open={creating}
        onClose={close}
        size="lg"
        title={editing ? "Edit changelog entry" : "New changelog entry"}
        description="Pick the kind, write a short title, expand if helpful, and choose who should see it."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={save} loading={busy}>{editing ? "Save changes" : "Publish entry"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kind" className="col-span-1">
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="feature">New feature</option>
                <option value="improvement">Improvement</option>
                <option value="fix">Fix</option>
                <option value="note">Note</option>
              </Select>
            </Field>
            <Field label="Version" hint="Optional, e.g. 0.4.2" className="col-span-2">
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="" />
            </Field>
          </div>
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What changed?" />
          </Field>
          <Field label="Details" hint="Optional. Plain text. Line breaks are kept.">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Expand on what users will notice or care about." />
          </Field>
          <Field label="Visible to" hint="Pick which roles can see this entry. Trainees view this page as 'What's new'.">
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map((r) => {
                const checked = visibleTo.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors",
                      checked ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-card border-line text-muted hover:border-line-strong"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(r.id)}
                      className="accent-brand-600"
                    />
                    {r.label}
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
