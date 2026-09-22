"use client";

/**
 * Editor for the dashboard's "What's on" band: list by kind, add, edit,
 * publish / unpublish, delete. Every save sends the whole card and the
 * server re-validates it with PromoInput.
 *
 * Admin-only tooling, so English-only.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PROMO_KINDS, PROMO_KIND_LABELS, PROMOS_PER_KIND, type PromoKind } from "@/lib/dashboard-promos";

export interface AdminPromo {
  id: string;
  kind: string;
  title: string;
  summary: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  showUntil: string | null;
  status: "draft" | "published";
  displayOrder: number;
  /** Where it stands on the home page right now. */
  state: "showing" | "queued" | "ended" | "draft";
}

/** The form's copy of a card. Order is the raw field text while typing
 *  ("-" alone is not a number yet); payload() turns it into one. */
type Draft = Omit<AdminPromo, "id" | "state" | "displayOrder"> & { displayOrder: string };

const toDraft = (p: AdminPromo): Draft => ({
  kind: p.kind, title: p.title, summary: p.summary, startDate: p.startDate, endDate: p.endDate,
  location: p.location, ctaLabel: p.ctaLabel, ctaHref: p.ctaHref, showUntil: p.showUntil,
  status: p.status, displayOrder: String(p.displayOrder),
});

const STATE_BADGE: Record<AdminPromo["state"], { label: string; tone: "success" | "brand" | "warning" | "neutral" }> = {
  showing: { label: "Showing", tone: "success" },
  queued: { label: "Queued", tone: "brand" },
  ended: { label: "Ended", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
};

const STATE_HELP: Record<AdminPromo["state"], string> = {
  showing: "On the home page now.",
  queued: `Published, but ${PROMOS_PER_KIND} cards of this kind with lower order numbers are showing.`,
  ended: "Published, but its last day or “show until” day has passed.",
  draft: "Not shown until you publish it.",
};

const blank = (kind: PromoKind): Draft => ({
  kind, title: "", summary: "", startDate: null, endDate: null, location: null,
  ctaLabel: null, ctaHref: null, showUntil: null, status: "published", displayOrder: "0",
});

function payload(d: Draft) {
  const t = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    ...d,
    title: d.title.trim(),
    summary: d.summary.trim(),
    startDate: t(d.startDate),
    endDate: t(d.endDate),
    location: t(d.location),
    ctaLabel: t(d.ctaLabel),
    ctaHref: t(d.ctaHref),
    showUntil: t(d.showUntil),
    displayOrder: Number.parseInt(d.displayOrder, 10) || 0,
  };
}

export function DashboardPromosAdmin({ promos }: { promos: AdminPromo[] }) {
  const router = useRouter();
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function send(id: string | null, method: "POST" | "PATCH" | "DELETE", body?: Draft) {
    const res = await fetch(id ? `/api/admin/dashboard-promos/${id}` : "/api/admin/dashboard-promos", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(payload(body)) : undefined,
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? `Something went wrong (${res.status}).`;
  }

  async function save() {
    if (!editing || saving) return;
    setSaving(true);
    setError(null);
    const err = await send(editing.id, editing.id ? "PATCH" : "POST", editing.draft);
    setSaving(false);
    if (err) return setError(err);
    setEditing(null);
    router.refresh();
  }

  async function togglePublish(p: AdminPromo) {
    setRowError(null);
    const err = await send(p.id, "PATCH", { ...toDraft(p), status: p.status === "published" ? "draft" : "published" });
    if (err) return setRowError(`${p.title}: ${err}`);
    router.refresh();
  }

  async function remove(p: AdminPromo) {
    const ok = await confirmDialog({
      title: `Delete “${p.title}”?`,
      description: "It comes off the home page straight away. This can't be undone; unpublish it instead to keep it for later.",
      tone: "destructive",
    });
    if (!ok) return;
    setRowError(null);
    const err = await send(p.id, "DELETE");
    if (err) return setRowError(`${p.title}: ${err}`);
    router.refresh();
  }

  function open(id: string | null, draft: Draft) {
    setError(null);
    setEditing({ id, draft });
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e));

  return (
    <div className="space-y-5">
      {rowError && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {rowError}
        </p>
      )}

      {PROMO_KINDS.map((kind) => {
        const items = promos.filter((p) => p.kind === kind);
        return (
          <section key={kind} className="rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-sm font-bold text-fg">
                {PROMO_KIND_LABELS[kind]} <span className="font-normal text-muted">({items.length})</span>
              </h2>
              <Button size="sm" variant="secondary" onClick={() => open(null, blank(kind))}>
                <Plus size={14} /> Add
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-fg">{p.title}</span>
                        <span title={STATE_HELP[p.state]}>
                          <Badge tone={STATE_BADGE[p.state].tone}>{STATE_BADGE[p.state].label}</Badge>
                        </span>
                        <span className="text-xs text-muted">Order {p.displayOrder}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted line-clamp-2">{p.summary}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        {p.startDate && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} aria-hidden />
                            {p.startDate}{p.endDate && p.endDate !== p.startDate ? ` to ${p.endDate}` : ""}
                          </span>
                        )}
                        {p.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} aria-hidden /> {p.location}
                          </span>
                        )}
                        {p.showUntil && <span>Shows until {p.showUntil}</span>}
                        {p.ctaHref && <span className="truncate">{p.ctaLabel} → {p.ctaHref}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => togglePublish(p)}>
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => open(p.id, toDraft(p))}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit card" : "New card"}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {error && (
              <p role="alert" className="mr-auto text-sm text-rose-700">{error}</p>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </div>
        }
      >
        {editing && (
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); void save(); }}
          >
            <Field label="Kind" required>
              <Select value={editing.draft.kind} onChange={(e) => set("kind", e.target.value)}>
                {PROMO_KINDS.map((k) => <option key={k} value={k}>{PROMO_KIND_LABELS[k].replace(/s$/, "")}</option>)}
              </Select>
            </Field>
            <Field label="Status" required>
              <Select
                value={editing.draft.status}
                onChange={(e) => set("status", e.target.value === "published" ? "published" : "draft")}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
            <Field label="Title" required className="sm:col-span-2">
              <Input value={editing.draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field
              label="Summary"
              required
              hint={`${editing.draft.summary.length}/300. Plain text; the card shows about two lines.`}
              className="sm:col-span-2"
            >
              <Textarea rows={3} value={editing.draft.summary} maxLength={300} onChange={(e) => set("summary", e.target.value)} />
            </Field>
            <Field label="Date" hint="Optional. Leave empty for announcements.">
              <Input type="date" value={editing.draft.startDate ?? ""} onChange={(e) => set("startDate", e.target.value || null)} />
            </Field>
            <Field label="End date" hint="Only for multi-day items.">
              <Input type="date" value={editing.draft.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} />
            </Field>
            <Field label="Location" className="sm:col-span-2">
              <Input value={editing.draft.location ?? ""} maxLength={120} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Button label" hint="Defaults to “Learn more”.">
              <Input value={editing.draft.ctaLabel ?? ""} maxLength={40} onChange={(e) => set("ctaLabel", e.target.value)} />
            </Field>
            <Field label="Link" hint="A page here (/events/…) or an https:// link.">
              <Input
                value={editing.draft.ctaHref ?? ""}
                maxLength={500}
                placeholder="/events/2026-annual-symposium"
                onChange={(e) => set("ctaHref", e.target.value)}
              />
            </Field>
            <Field label="Show until" hint="Optional. Hides the card after this day.">
              <Input type="date" value={editing.draft.showUntil ?? ""} onChange={(e) => set("showUntil", e.target.value || null)} />
            </Field>
            <Field label="Order" hint="Lower shows first within its kind.">
              <Input
                type="number"
                min={-999}
                max={999}
                value={editing.draft.displayOrder}
                onChange={(e) => set("displayOrder", e.target.value)}
              />
            </Field>
            <button type="submit" hidden />
          </form>
        )}
      </Modal>
      {confirmNode}
    </div>
  );
}
