"use client";

/**
 * Outreach board v2 — central contact DIRECTORY + lists.
 *
 *   • One OutreachPerson per human. SHARED columns (org/name/title/email…)
 *     live on the person: edit them in any tab and every list updates.
 *   • Lists hold memberships: per-list columns (Notes…), ordering, and
 *     "added by" attribution. A person can sit on several lists.
 *   • The Directory tab shows everyone, which lists they're on, lets you put
 *     them on lists, or delete them outright.
 *   • E-mail is the identity key: saving an e-mail that belongs to another
 *     person offers a merge instead of creating a duplicate.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, Pencil, Check, X,
  Columns3, UserRound, ArrowLeft, ArrowRight, Link2, BookUser, ListPlus, UserMinus,
  MessagesSquare, MailPlus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { OutreachSharePanel } from "./OutreachSharePanel";
import { OutreachTemplatesModal, type ResolvedTemplate, type PlaceholderDoc } from "./OutreachTemplatesModal";
import { TouchLogModal } from "./TouchLogModal";
import { OutreachCell } from "./OutreachCell";

interface ColumnDef { key: string; label: string }
interface ShareLinkInfo { id: string; token: string; label: string | null; createdAt: string }
interface ListRow {
  membershipId: string;
  personId: string;
  personValues: Record<string, string>;
  values: Record<string, string>;
  addedByName: string;
  createdAt: string;
  otherLists: string[];
  touchCount: number;
  lastTouchAt: string | null;
}
interface ListData { id: string; name: string; description: string; columns: ColumnDef[]; rows: ListRow[]; shareLinks: ShareLinkInfo[] }
interface DirPerson {
  id: string;
  values: Record<string, string>;
  addedByName: string;
  createdAt: string;
  lists: { listId: string; name: string }[];
  touchCount: number;
  lastTouchAt: string | null;
}
export interface OutreachData { personColumns: ColumnDef[]; lists: ListData[]; directory: DirPerson[] }

const DIR_TAB = "__directory";

function slugKey(label: string, taken: Set<string>): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30) || "col";
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
};
const fmtShort = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return ""; }
};

export function OutreachBoard({
  data,
  emailTemplates,
  templatePlaceholders,
  senderName,
}: {
  data: OutreachData;
  emailTemplates: ResolvedTemplate[];
  templatePlaceholders: PlaceholderDoc[];
  senderName: string;
}) {
  const router = useRouter();
  const [board, setBoard] = useState<OutreachData>(data);
  const [activeId, setActiveId] = useState<string>(data.lists[0]?.id ?? DIR_TAB);
  const [busy, setBusy] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  const [draftCols, setDraftCols] = useState<ColumnDef[]>([]);
  const [newColLabel, setNewColLabel] = useState("");
  // Reach-out history modal target.
  const [touchFor, setTouchFor] = useState<{ personId: string; name: string; listId: string | null } | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    setBoard(data);
    setActiveId((cur) =>
      cur === DIR_TAB || data.lists.some((l) => l.id === cur) ? cur : data.lists[0]?.id ?? DIR_TAB,
    );
  }, [data]);

  const isDir = activeId === DIR_TAB;
  const active = useMemo(() => board.lists.find((l) => l.id === activeId) ?? null, [board, activeId]);

  async function api(path: string, init: RequestInit): Promise<Response | null> {
    setBusy(true);
    try {
      return await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }

  // ── Person (shared) edits — sync locally across every tab ──
  function applyPersonValues(personId: string, values: Record<string, string>) {
    setBoard((cur) => ({
      ...cur,
      directory: cur.directory.map((p) => (p.id === personId ? { ...p, values } : p)),
      lists: cur.lists.map((l) => ({
        ...l,
        rows: l.rows.map((r) => (r.personId === personId ? { ...r, personValues: values } : r)),
      })),
    }));
  }
  async function savePersonCell(personId: string, current: Record<string, string>, key: string, value: string) {
    if ((current[key] ?? "") === value) return;
    const values = { ...current, [key]: value };
    applyPersonValues(personId, values);
    const res = await api(`/api/workspace/outreach/people/${personId}`, { method: "PATCH", body: JSON.stringify({ values }) });
    if (res && res.status === 409) {
      const j = (await res.json().catch(() => ({}))) as { conflict?: { id: string; name: string; org: string; lists: string[] } };
      const c = j.conflict;
      if (c && confirm(
        `${value} already belongs to ${c.name || "another contact"}${c.org ? ` (${c.org})` : ""}` +
        `${c.lists.length ? ` — on ${c.lists.join(", ")}` : ""}.\n\nMerge this row into that contact? ` +
        "Their details are kept; this row's list memberships move over.",
      )) {
        await api(`/api/workspace/outreach/people/merge`, { method: "POST", body: JSON.stringify({ keepId: c.id, dropId: personId }) });
      }
      router.refresh();
    }
  }

  // ── Membership (per-list) edits ──
  async function saveMembershipCell(row: ListRow, key: string, value: string) {
    if ((row.values[key] ?? "") === value) return;
    const values = { ...row.values, [key]: value };
    setBoard((cur) => ({
      ...cur,
      lists: cur.lists.map((l) =>
        l.id !== activeId ? l : { ...l, rows: l.rows.map((r) => (r.membershipId === row.membershipId ? { ...r, values } : r)) },
      ),
    }));
    await api(`/api/workspace/outreach/memberships/${row.membershipId}`, { method: "PATCH", body: JSON.stringify({ values }) });
  }
  async function moveRow(membershipId: string, dir: -1 | 1) {
    if (!active) return;
    const idx = active.rows.findIndex((r) => r.membershipId === membershipId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= active.rows.length) return;
    setBoard((cur) => ({
      ...cur,
      lists: cur.lists.map((l) => {
        if (l.id !== active.id) return l;
        const rows = [...l.rows];
        [rows[idx], rows[j]] = [rows[j], rows[idx]];
        return { ...l, rows };
      }),
    }));
    await api(`/api/workspace/outreach/memberships/${membershipId}`, { method: "PATCH", body: JSON.stringify({ move: dir }) });
  }
  async function addToList(personId: string, listId: string) {
    await api(`/api/workspace/outreach/lists/${listId}/memberships`, { method: "POST", body: JSON.stringify({ personId }) });
    router.refresh();
  }
  async function removeFromList(row: ListRow) {
    const who = row.personValues["name"] || row.personValues["org"] || "this contact";
    if (!confirm(`Remove ${who} from this list? They stay in the directory${row.otherLists.length ? ` and on ${row.otherLists.join(", ")}` : ""}.`)) return;
    setBoard((cur) => ({
      ...cur,
      lists: cur.lists.map((l) => (l.id !== activeId ? l : { ...l, rows: l.rows.filter((r) => r.membershipId !== row.membershipId) })),
    }));
    await api(`/api/workspace/outreach/memberships/${row.membershipId}`, { method: "DELETE" });
    router.refresh();
  }
  async function deletePerson(p: DirPerson) {
    const who = p.values["name"] || p.values["org"] || "this contact";
    if (!confirm(`Delete ${who} from the directory${p.lists.length ? ` and from ${p.lists.map((x) => x.name).join(", ")}` : ""}? This can't be undone.`)) return;
    setBoard((cur) => ({ ...cur, directory: cur.directory.filter((x) => x.id !== p.id) }));
    await api(`/api/workspace/outreach/people/${p.id}`, { method: "DELETE" });
    router.refresh();
  }
  async function addContact() {
    if (isDir) {
      await api(`/api/workspace/outreach/people`, { method: "POST", body: JSON.stringify({}) });
    } else if (active) {
      await api(`/api/workspace/outreach/lists/${active.id}/memberships`, { method: "POST", body: JSON.stringify({}) });
    }
    router.refresh();
  }

  // ── Lists ──
  async function createList() {
    const name = newListName.trim();
    if (!name) return;
    setNewListName("");
    setNewListOpen(false);
    await api(`/api/workspace/outreach/lists`, { method: "POST", body: JSON.stringify({ name }) });
    router.refresh();
  }
  async function renameList() {
    if (!active) return;
    const name = renameVal.trim();
    setRenaming(false);
    if (!name || name === active.name) return;
    setBoard((cur) => ({ ...cur, lists: cur.lists.map((l) => (l.id === active.id ? { ...l, name } : l)) }));
    await api(`/api/workspace/outreach/lists/${active.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    router.refresh();
  }
  async function deleteList() {
    if (!active) return;
    if (!confirm(`Delete "${active.name}"? Contacts stay in the directory; only this list (and its notes) goes away.`)) return;
    setActiveId(DIR_TAB);
    setBoard((cur) => ({ ...cur, lists: cur.lists.filter((l) => l.id !== active.id) }));
    await api(`/api/workspace/outreach/lists/${active.id}`, { method: "DELETE" });
    router.refresh();
  }

  // ── Columns (person columns on Directory tab; list columns on list tabs) ──
  function openCols() {
    setDraftCols((isDir ? board.personColumns : active?.columns ?? []).map((c) => ({ ...c })));
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
    if (draftCols.length === 0) return;
    setColsOpen(false);
    if (isDir) {
      setBoard((cur) => ({ ...cur, personColumns: draftCols }));
      await api(`/api/workspace/outreach/person-columns`, { method: "PATCH", body: JSON.stringify({ columns: draftCols }) });
    } else if (active) {
      setBoard((cur) => ({ ...cur, lists: cur.lists.map((l) => (l.id === active.id ? { ...l, columns: draftCols } : l)) }));
      await api(`/api/workspace/outreach/lists/${active.id}`, { method: "PATCH", body: JSON.stringify({ columns: draftCols }) });
    }
    router.refresh();
  }

  const miniBtn = "inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30";

  /** Small inline "add to list" picker (lists the person isn't on yet). */
  const AddToListSelect = ({ personId, exclude }: { personId: string; exclude: string[] }) => {
    const options = board.lists.filter((l) => !exclude.includes(l.id));
    if (options.length === 0) return null;
    return (
      <span className="relative inline-flex" title="Add to a list">
        <ListPlus size={13} className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-muted" />
        <select
          value=""
          onChange={(e) => e.target.value && addToList(personId, e.target.value)}
          className="h-6 w-7 cursor-pointer appearance-none rounded bg-transparent pl-6 text-[11px] text-transparent hover:bg-elevated focus:outline-none"
        >
          <option value="" disabled hidden />
          {options.map((l) => (
            <option key={l.id} value={l.id} className="text-fg">{l.name}</option>
          ))}
        </select>
      </span>
    );
  };

  /** Reach-out history chip — count + last contact date; opens the log. */
  const TouchChip = ({ count, last, onClick }: { count: number; last: string | null; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      title={count > 0 ? `${count} reach-out${count === 1 ? "" : "s"} — open history` : "No reach-outs yet — log the first"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
        count > 0 ? "bg-brand-50 text-brand-700 hover:bg-brand-100" : "bg-elevated text-subtle hover:text-fg",
      )}
    >
      <MessagesSquare size={10} />
      {count > 0 && last ? `${count} · ${fmtShort(last)}` : "Log"}
    </button>
  );

  const tab = (id: string, label: string, count: number, icon?: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => { setActiveId(id); setColsOpen(false); setRenaming(false); }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        activeId === id ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
      )}
    >
      {icon} {label}
      <span className="rounded-full bg-elevated px-1.5 text-[10px] tabular-nums text-subtle">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-elevated/60 p-1">
          {tab(DIR_TAB, "Directory", board.directory.length, <BookUser size={12} />)}
          {board.lists.map((l) => tab(l.id, l.name, l.rows.length))}
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
            <button type="button" onClick={() => setNewListOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:text-brand-900">
              <Plus size={12} /> New list
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated"
          >
            <MailPlus size={13} /> Email templates
          </button>
          {!isDir && active && (
            <OutreachSharePanel listId={active.id} listName={active.name} initialLinks={active.shareLinks} />
          )}
          {!isDir && active && (
            renaming ? (
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
              <button type="button" onClick={() => { setRenameVal(active.name); setRenaming(true); }} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-fg hover:bg-elevated">
                <Pencil size={12} /> Rename
              </button>
            )
          )}
          <button
            type="button"
            onClick={openCols}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-elevated",
              colsOpen ? "border-brand-200 bg-brand-50 text-brand-700" : "bg-card-solid text-fg",
            )}
          >
            <Columns3 size={12} /> Edit columns
          </button>
          {!isDir && active && (
            <button type="button" onClick={deleteList} title="Delete list" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-solid px-3 py-1.5 text-xs font-semibold text-muted hover:bg-elevated hover:text-rose-700">
              <Trash2 size={12} />
            </button>
          )}
          <button type="button" onClick={addContact} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add contact
          </button>
        </div>
      </div>

      {!colsOpen && (
        <p className="text-[12px] text-muted">
          {isDir
            ? "Everyone across all lists. Shared details edit here once and update every list."
            : active?.description}
        </p>
      )}

      {/* Column editor */}
      {colsOpen && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-fg">
              {isDir ? "Shared columns — every list shows these" : `List columns — ${active?.name ?? ""}`}
            </p>
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
                <button type="button" title="Move left (earlier)" disabled={i === 0} onClick={() => moveCol(i, -1)} className={miniBtn}><ArrowLeft size={13} /></button>
                <button type="button" title="Move right (later)" disabled={i === draftCols.length - 1} onClick={() => moveCol(i, 1)} className={miniBtn}><ArrowRight size={13} /></button>
                <button
                  type="button"
                  title="Remove column"
                  onClick={() => { if (confirm(`Remove the "${c.label}" column? Its data stays saved and comes back if you re-add a column with the same name.`)) setDraftCols((cur) => cur.filter((_, xi) => xi !== i)); }}
                  className={cn(miniBtn, "hover:text-rose-700")}
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

      {/* ── DIRECTORY TABLE ── */}
      {isDir ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-elevated/40">
                {board.personColumns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
                    <span className="inline-flex items-center gap-1"><Link2 size={9} className="text-brand-600" /> {c.label}</span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">On lists</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Reach-outs</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Added by</th>
                <th className="w-24 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {board.directory.map((p) => (
                <tr key={p.id} className="group hover:bg-elevated/30">
                  {board.personColumns.map((c) => (
                    <td key={c.key} className="min-w-[9rem] px-1.5 py-1 align-top">
                      <OutreachCell
                        key={`${p.id}-${c.key}-${p.values[c.key] ?? ""}`}
                        defaultValue={p.values[c.key] ?? ""}
                        onSave={(v) => savePersonCell(p.id, p.values, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 align-middle">
                    <span className="flex flex-wrap items-center gap-1">
                      {p.lists.map((l) => (
                        <span key={l.listId} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{l.name}</span>
                      ))}
                      {p.lists.length === 0 && <span className="text-[11px] text-subtle">—</span>}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle">
                    <TouchChip
                      count={p.touchCount}
                      last={p.lastTouchAt}
                      onClick={() => setTouchFor({ personId: p.id, name: p.values["name"] || p.values["org"] || "Contact", listId: null })}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" title={`Added ${fmtDate(p.createdAt)}`}>
                      <UserRound size={11} className="shrink-0" /> {p.addedByName}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <AddToListSelect personId={p.id} exclude={p.lists.map((l) => l.listId)} />
                      <button type="button" title="Delete from directory (all lists)" onClick={() => deletePerson(p)} className={cn(miniBtn, "hover:text-rose-700")}><Trash2 size={12} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {board.directory.length === 0 && (
                <tr><td colSpan={board.personColumns.length + 4} className="px-4 py-10 text-center text-sm text-muted">Nobody in the directory yet — hit <strong>Add contact</strong>.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : active ? (
        /* ── LIST TABLE: shared person columns + this list's columns ── */
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-elevated/40">
                {board.personColumns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
                    <span className="inline-flex items-center gap-1" title="Shared — editing updates this person in every list">
                      <Link2 size={9} className="text-brand-600" /> {c.label}
                    </span>
                  </th>
                ))}
                {active.columns.map((c) => (
                  <th key={c.key} className="border-l border-line/70 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle first-of-type:border-l">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Reach-outs</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Added by</th>
                <th className="w-32 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {active.rows.map((row, i) => (
                <tr key={row.membershipId} className="group hover:bg-elevated/30">
                  {board.personColumns.map((c) => (
                    <td key={c.key} className="min-w-[9rem] px-1.5 py-1 align-top">
                      <OutreachCell
                        key={`${row.personId}-${c.key}-${row.personValues[c.key] ?? ""}`}
                        defaultValue={row.personValues[c.key] ?? ""}
                        onSave={(v) => savePersonCell(row.personId, row.personValues, c.key, v)}
                      />
                    </td>
                  ))}
                  {active.columns.map((c) => (
                    <td key={c.key} className="min-w-[9rem] border-l border-line/70 px-1.5 py-1 align-top first-of-type:border-l">
                      <OutreachCell
                        key={`${row.membershipId}-${c.key}-${row.values[c.key] ?? ""}`}
                        defaultValue={row.values[c.key] ?? ""}
                        onSave={(v) => saveMembershipCell(row, c.key, v)}
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 align-middle">
                    <TouchChip
                      count={row.touchCount}
                      last={row.lastTouchAt}
                      onClick={() => setTouchFor({ personId: row.personId, name: row.personValues["name"] || row.personValues["org"] || "Contact", listId: active.id })}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <span className="block">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" title={`Added ${fmtDate(row.createdAt)}`}>
                        <UserRound size={11} className="shrink-0" /> {row.addedByName}
                      </span>
                      {row.otherLists.length > 0 && (
                        <span className="mt-0.5 block text-[10px] text-brand-700">also in {row.otherLists.join(", ")}</span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <button type="button" title="Move up" disabled={i === 0} onClick={() => moveRow(row.membershipId, -1)} className={miniBtn}><ChevronUp size={13} /></button>
                      <button type="button" title="Move down" disabled={i === active.rows.length - 1} onClick={() => moveRow(row.membershipId, 1)} className={miniBtn}><ChevronDown size={13} /></button>
                      <AddToListSelect personId={row.personId} exclude={[active.id, ...board.lists.filter((l) => l.rows.some((r) => r.personId === row.personId)).map((l) => l.id)]} />
                      <button type="button" title="Remove from this list (stays in directory)" onClick={() => removeFromList(row)} className={cn(miniBtn, "hover:text-rose-700")}><UserMinus size={12} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {active.rows.length === 0 && (
                <tr>
                  <td colSpan={board.personColumns.length + active.columns.length + 3} className="px-4 py-10 text-center text-sm text-muted">
                    No contacts on this list yet — <strong>Add contact</strong> creates a new person, or use the Directory tab to add an existing one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : null}

      <p className="text-[11px] text-muted">
        <Link2 size={9} className="mr-1 inline text-brand-600" />
        marked columns are shared across all lists — edit once, updates everywhere. Cells save when you click away.
        Hover a row for actions; “Added by” is recorded automatically. The Reach-outs chip opens a
        contact&apos;s history — when, what, and who initiated each touch.
      </p>

      {touchFor && (
        <TouchLogModal
          personId={touchFor.personId}
          personName={touchFor.name}
          listId={touchFor.listId}
          onClose={() => setTouchFor(null)}
        />
      )}

      {templatesOpen && (
        <OutreachTemplatesModal
          templates={emailTemplates}
          placeholders={templatePlaceholders}
          contacts={board.directory.map((p) => ({
            id: p.id,
            name: p.values["name"] ?? "",
            org: p.values["org"] ?? "",
            email: p.values["email"] ?? "",
          }))}
          senderName={senderName}
          canEdit
          onClose={() => setTemplatesOpen(false)}
        />
      )}
    </div>
  );
}
