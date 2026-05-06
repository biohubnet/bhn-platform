"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, GripVertical, X, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";

interface CourseOption {
  id: string;
  title: string;
  category: string | null;
}

interface PathwayShape {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  courseIds: string[];
}

interface Props {
  mode: "create" | "edit";
  pathway?: PathwayShape;
  courses: CourseOption[];
}

export function PathwayManageButton({ mode, pathway, courses }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(pathway?.title ?? "");
  const [description, setDescription] = useState(pathway?.description ?? "");
  const [category, setCategory] = useState(pathway?.category ?? "");
  const [status, setStatus] = useState(pathway?.status ?? "draft");
  const [selectedIds, setSelectedIds] = useState<string[]>(pathway?.courseIds ?? []);
  const [filter, setFilter] = useState("");

  function move(idx: number, delta: number) {
    setSelectedIds((cur) => {
      const next = [...cur];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return cur;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function toggle(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  async function submit() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        status,
        courseIds: selectedIds,
      };
      const url = mode === "create" ? "/api/pathways" : `/api/pathways/${pathway!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Save failed");
        return;
      }
      const data = await res.json();
      setOpen(false);
      if (mode === "create") {
        router.push(`/pathways/${data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!pathway) return;
    if (!confirm("Delete this pathway? Existing certificates remain but no new ones will issue.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pathways/${pathway.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Delete failed");
        return;
      }
      router.push("/pathways");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = courses.filter(
    (c) => filter === "" || c.title.toLowerCase().includes(filter.toLowerCase())
  );
  const ordered = selectedIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean) as CourseOption[];

  return (
    <>
      {mode === "create" ? (
        <Button onClick={() => setOpen(true)} variant="primary">
          <Plus size={14} /> New pathway
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="secondary" className="bg-white/15 text-white border-white/20 hover:bg-white/25">
          <Pencil size={14} /> Edit
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={mode === "create" ? "Create training pathway" : "Edit training pathway"}
        description="Pick the courses, set the order, and learners get one certificate when they complete every required course."
        footer={
          <>
            {mode === "edit" && (
              <Button variant="danger" onClick={remove} loading={deleting} className="mr-auto">
                <Trash2 size={14} /> Delete
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={loading}>
              {mode === "create" ? "Create pathway" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: metadata */}
          <div className="space-y-4">
            <Field label="Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aseptic Operator Certification" />
            </Field>
            <Field label="Description" hint="Shown on the pathway detail page.">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What learners will master by completing this pathway." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cleanroom" />
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
            </div>

            {/* Selected order list */}
            <Field label={`Course order · ${ordered.length} selected`}>
              {ordered.length === 0 ? (
                <div className="text-xs text-subtle px-3 py-4 bg-elevated rounded-lg border border-line text-center">
                  No courses selected yet — pick from the list →
                </div>
              ) : (
                <ol className="space-y-1.5">
                  {ordered.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-2 bg-elevated hover:bg-raised rounded-lg px-2 py-1.5 text-sm group">
                      <GripVertical size={14} className="text-slate-300" />
                      <span className="text-xs text-subtle font-mono w-5 text-center">{i + 1}</span>
                      <span className="flex-1 truncate text-slate-800">{c.title}</span>
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-subtle hover:text-muted disabled:opacity-30 px-1 text-xs"
                        aria-label="Move up"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === ordered.length - 1}
                        className="text-subtle hover:text-muted disabled:opacity-30 px-1 text-xs"
                        aria-label="Move down"
                      >↓</button>
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className="text-subtle hover:text-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Field>
          </div>

          {/* Right: course picker */}
          <div className="space-y-2 md:border-l md:pl-6 md:border-line">
            <Field label="Add courses" hint={`${courses.length} courses in catalog`}>
              <Input
                placeholder="Filter…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </Field>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-line divide-y divide-line bg-card">
              {filtered.length === 0 && (
                <div className="text-xs text-subtle p-4 text-center">No courses match.</div>
              )}
              {filtered.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={
                      "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-elevated " +
                      (checked ? "bg-brand-50/50" : "")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                      className="accent-brand-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{c.title}</p>
                      {c.category && <p className="text-xs text-subtle">{c.category}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
