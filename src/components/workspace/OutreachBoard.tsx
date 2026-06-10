"use client";

/**
 * Outreach board — contact lists for cross-promoting BHN programs.
 *   • Tabs: one per list (e.g. Cross-promotion Partners, EXPERIENCE Program);
 *     create / rename / delete lists.
 *   • Table: one row per contact. Cells edit in place (saved on blur). Rows
 *     can be reordered (↑/↓), moved to another list, or removed. Every row
 *     shows who added it and when.
 *   • Columns are editable: add / rename / remove / reorder via the
 *     "Edit columns" panel (saved per list).
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, Pencil, Check, X,
  Columns3, ArrowLeftRight, UserRound, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ColumnDef { key: string; label: string }
interface ContactRow {
  id: string;
  values: Record<string, string>;
  addedByName: string;
  createdAt: string;
}
export interface OutreachListData {
  id: string;
  name: string;
  description: string;
  columns: ColumnDef[];
  contacts: ContactRow[];
}

function slugKey(label: string, taken: Set<string>): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30) || "col";
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function OutreachBoard({ initialLists }: { initialLists: OutreachListData[] }) {
  const router = useRouter();
  const [lists, setLists] = useState<OutreachListData[]>(initialLists);
  const [activeId, setActiveId] = useState<string | null>(initialLists[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  // List management
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  // Column editor
  const [colsOpen, setColsOpen] = useState(false);
  const [draftCols, setDraftCols] = useState<ColumnDef[]>([]);
  const [newColLabel, setNewColLabel] = useState("");

  // Re-sync from the server after router.refresh().
  useEffect(() => {
    setLists(initialLists);
    setActiveId((cur) => (cur && initialLists.some((l) => l.id === cur) ? cur : initialLists[0]?.id ?? null));
  }, [initialLists]);

  const active = useMemo(() => lists.find((l) => l.id === activeId) ?? null, [lists, activeId]);

  async function api(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
      return res.ok;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }

  // ── Lists ──
  async function createList() {
    const name = newListName.trim();
    if (!name) return;
    setNewListName("");
    setNewListOpen(false);
    await api("/api/workspace/outreach/lists", { method: "POST", body: JSON.stringify({ name }) });
    router.refresh();
  }
  async function renameList() {
    if (!active) return;
    const name = renameVal.trim();
    setRenaming(false);
    if (!name || name === active.name) return;
    setLists((cur) => cur.map((l) => (l.id === active.id ? { ...l, name } : l)));
    await api(`/api/workspace/outreach/lists/${active.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    router.refresh();
  }
  async function deleteList() {
    if (!active) return;
    if (!confirm(`Delete "${active.name}" and its ${active.contacts.length} contacts? This can't be undone.`)) return;
    setLists((cur) => cur.filter((l) => l.id !== active.id));
    setActiveId(lists.find((l) => l.id !== active.id)?.id ?? null);
    await api(`/api/workspace/outreach/lists/${active.id}`, { method: "DELETE" });
    router.refresh();
  }

  // ── Contacts ──
  async function addContact() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/workspace/outreach/lists/${active.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: {} }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; contact?: ContactRow };
      if (res.ok && j.ok && j.contact) {
        const c = j.contact;
        setLists((cur) => cur.map((l) => (l.id === active.id ? { ...l, contacts: [...l.contacts, c] } : l)));
      }
    } finally {
      setBusy(false);
    }
    router.refresh();
  }
  async function saveCell(contact: ContactRow, key: string, value: string) {
    if ((contact.values[key] ?? "") === value) return;
    const values = { ...contact.values, [key]: value };
    setLists((cur) =>
      cur.map((l) =>
        l.id !== activeId ? l : { ...l, contacts: l.contacts.map((c) => (c.id === contact.id ? { ...c, values } : c)) },
      ),
    );
    await api(`/api/workspace/outreach/contacts/${contact.id}`, { method: "PATCH", body: JSON.stringify({ values }) });
  }
  async function moveContact(contactId: string, dir: -1 | 1) {
    if (!active) return;
    const idx = active.contacts.findIndex((c) => c.id === contactId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= active.contacts.length) return;
    setLists((cur) =>
      cur.map((l) => {
        if (l.id !== active.id) return l;
        const next = [...l.contacts];
        [next[idx], next[j]] = [next[j], next[idx]];
        return { ...l, contacts: next };
      }),
    );
    await api(`/api/workspace/outreach/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify({ move: dir }) });
  }
  async function moveToList(contactId: string, targetListId: string) {
    if (!active || targetListId === active.id) return;
    const contact = active.contacts.find((c) => c.id === contactId);
    if (!contact) return;
    setLists((cur) =>
      cur.map((l) => {
        if (l.id === active.id) return { ...l, contacts: l.contacts.filter((c) => c.id !== contactId) };
        if (l.id === targetListId) return { ...l, contacts: [...l.contacts, contact] };
        return l;
      }),
    );
    await api(`/api/workspace/outreach/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify({ listId: targetListId }) });
    router.refresh();
  }
  async function removeContact(contact: ContactRow) {
    const who = contact.values["name"] || contact.values["org"] || "this contact";
    if (!confirm(`Remove ${who}?`)) return;
    setLists((cur) =>
      cur.map((l) => (l.id !== activeId ? l : { ...l, contacts: l.contacts.filter((c) => c.id !== contact.id) })),
    );
    await api(`/api/workspace/outreach/contacts/${contact.id}`, { method: "DELETE" });
  }

  // ── Columns ──
  function openCols() {
    if (!active) return;
    setDraftCols(active.columns.map((c) => ({ ...c })));
    setNewColLabel("");
    setColsOpen(true);
  }
  function moveCol(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draftCols.length) return;
    setDraftCols((cur) => {
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function addCol() {
    const label = newColLabel.trim();
    if (!label) return;
    setDraftCols((cur) => [...cur, { key: slugKey(label, new Set(cur.map((c) => c.key))), label }]);
    setNewColLabel("");
  }
  async function saveCols() {
    if (!active || draftCols.length === 0) return;
    setLists((cur) => cur.map((l) => (l.id === active.id ? { ...l, columns: draftCols } : l)));
    setColsOpen(false);
    await api(`/api/workspace/outreach/lists/${active.id}`, { method: "PATCH", body: JSON.stringify({ columns: draftCols }) });
    router.refresh();
  }

  const tabBtn = (l: OutreachListData) => (
    <button
      key={l.id}
      type="button"
      onClick={() => { setActiveId(l.id); setColsOpen(false); setRenaming(false); }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        activeId === l.id ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
      )}
    >
      {l.name}
      <span className="rounded-full bg-elevated px-1.5 text-[10px] tabular-nums text-subtle">{l.contacts.length}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Tabs + list management */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-elevated/60 p-1">
          {lists.map(tabBtn)}
          {newListOpen ? (
            <span className="inline-flex items-center gap-1 pl-1">
              <input
                value={newListName}
                autoFocus
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createList(); if (e.key === "Escape") setNewListOpen(false); }}
                placeholder="List name"
                className="w-36 rounded-md border border-line bg-card-solid px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button type="button" onClick={createList} className="text-emerald-700 hover:text-emerald-900"><Check size={14} /></button>
              <button type="button" onClick={() => setNewListOpen(false)} className="text-muted hover:text-fg"><X size={14} /></button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setNewListOpen(true)}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:text-brand-900"
            >
              <Plus size={12} /> New list
            </button>
          )}
        </div>

        {active && (
          <div className="flex items-center gap-2">
            {renaming ? (
              <span className="inline-flex items-center gap-1">
                <input
                  value={renameVal}
                  autoFocus
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") renameList(); if (e.key === "Escape") setRenaming(false); }}
                  className="w-48 rounded-md border border-line bg-card-solid px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button type="button" onClick={renameList} className="text-emerald-700 hover:text-emerald-900"><Check size={14} /></button>
                <button type="button" onClick={() => setRenaming(false)} className="text-muted hover:text-fg"><X size={14} /></button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => { setRenameVal(active.name); setRenaming(true); }}
                title="Rename list"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
              >
                <Pencil size={12} /> Rename
              </button>
            )}
            <button
              type="button"
              onClick={openCols}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-elevated",
                colsOpen ? "bg-brand-50 text-brand-700 border-brand-200" : "bg-card-solid text-fg",
              )}
            >
              <Columns3 size={12} /> Edit columns
            </button>
            <button
              type="button"
              onClick={deleteList}
              title="Delete list"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-muted hover:bg-elevated hover:text-rose-700"
            >
              <Trash2 size={12} />
            </button>
            <button
              type="button"
              onClick={addContact}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add contact
            </button>
          </div>
        )}
      </div>

      {active?.description && !colsOpen && (
        <p className="text-[12px] text-muted">{active.description}</p>
      )}

      {/* Column editor */}
      {colsOpen && active && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">Columns — {active.name}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setColsOpen(false)} className="rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated">Cancel</button>
              <button type="button" onClick={saveCols} disabled={draftCols.length === 0} className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">Save columns</button>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {draftCols.map((c, i) => (
              <li key={c.key} className="flex items-center gap-2">
                <input
                  value={c.label}
                  onChange={(e) => setDraftCols((cur) => cur.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                  className="w-64 rounded-md border border-line bg-card-solid px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button type="button" title="Move left (earlier)" disabled={i === 0} onClick={() => moveCol(i, -1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ArrowLeft size={13} /></button>
                <button type="button" title="Move right (later)" disabled={i === draftCols.length - 1} onClick={() => moveCol(i, 1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ArrowRight size={13} /></button>
                <button
                  type="button"
                  title="Remove column"
                  onClick={() => { if (confirm(`Remove the "${c.label}" column? Its data stays saved and comes back if you re-add a column with the same name.`)) setDraftCols((cur) => cur.filter((_, xi) => xi !== i)); }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-rose-700"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCol()}
              placeholder="New column name…"
              className="w-64 rounded-md border border-line bg-card-solid px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button type="button" onClick={addCol} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"><Plus size={12} /> Add column</button>
          </div>
        </Card>
      )}

      {/* Table */}
      {active ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-elevated/40">
                {active.columns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">{c.label}</th>
                ))}
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Added by</th>
                <th className="w-32 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {active.contacts.map((contact, i) => (
                <tr key={contact.id} className="group hover:bg-elevated/30">
                  {active.columns.map((c) => (
                    <td key={c.key} className="px-1.5 py-1 align-top">
                      <input
                        key={`${contact.id}-${c.key}-${contact.values[c.key] ?? ""}`}
                        defaultValue={contact.values[c.key] ?? ""}
                        onBlur={(e) => saveCell(contact, c.key, e.target.value.trim())}
                        placeholder="—"
                        className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1.5 text-[12.5px] text-fg placeholder:text-subtle focus:border-brand-300 focus:bg-card-solid focus:outline-none focus:ring-1 focus:ring-brand-300"
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" title={`Added ${fmtDate(contact.createdAt)}`}>
                      <UserRound size={11} className="shrink-0" /> {contact.addedByName}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button type="button" title="Move up" disabled={i === 0} onClick={() => moveContact(contact.id, -1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button type="button" title="Move down" disabled={i === active.contacts.length - 1} onClick={() => moveContact(contact.id, 1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ChevronDown size={13} /></button>
                      {lists.length > 1 && (
                        <span className="relative inline-flex" title="Move to another list">
                          <ArrowLeftRight size={13} className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-muted" />
                          <select
                            value=""
                            onChange={(e) => e.target.value && moveToList(contact.id, e.target.value)}
                            className="h-6 w-7 cursor-pointer appearance-none rounded bg-transparent pl-6 text-[11px] text-transparent hover:bg-elevated focus:outline-none"
                          >
                            <option value="" disabled hidden />
                            {lists.filter((l) => l.id !== active.id).map((l) => (
                              <option key={l.id} value={l.id} className="text-fg">{l.name}</option>
                            ))}
                          </select>
                        </span>
                      )}
                      <button type="button" title="Remove contact" onClick={() => removeContact(contact)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-rose-700"><Trash2 size={12} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {active.contacts.length === 0 && (
                <tr>
                  <td colSpan={active.columns.length + 2} className="px-4 py-10 text-center text-sm text-muted">
                    No contacts in this list yet — hit <strong>Add contact</strong> to start it.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="px-5 py-10 text-center text-sm text-muted">No lists yet — create one above.</Card>
      )}

      <p className="text-[11px] text-muted">
        Cells save when you click away. Hover a row for reorder / move-to-list / remove. “Added by” is recorded automatically for new contacts.
      </p>
    </div>
  );
}
