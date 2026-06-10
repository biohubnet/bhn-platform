"use client";

/**
 * Public collaborative view of ONE shared outreach list (/outreach/<token>).
 * Guests (named via the join form) can add contacts, edit cells, and reorder;
 * deleting contacts / changing columns stays with the BHN team. Shared
 * person fields note that they update the central directory.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronUp, ChevronDown, Loader2, UserRound, Link2 } from "lucide-react";

interface ColumnDef { key: string; label: string }
export interface SharedRow {
  membershipId: string;
  personId: string;
  personValues: Record<string, string>;
  values: Record<string, string>;
  addedByName: string;
  createdAt: string;
}

export function SharedOutreachList({
  token,
  personColumns,
  columns,
  rows: initialRows,
  canEdit,
}: {
  token: string;
  personColumns: ColumnDef[];
  columns: ColumnDef[];
  rows: SharedRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SharedRow[]>(initialRows);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setRows(initialRows), [initialRows]);

  const base = `/api/outreach/shared/${token}`;

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

  async function savePersonCell(row: SharedRow, key: string, value: string) {
    if ((row.personValues[key] ?? "") === value) return;
    const values = { ...row.personValues, [key]: value };
    setRows((cur) => cur.map((r) => (r.personId === row.personId ? { ...r, personValues: values } : r)));
    const res = await api(`${base}/people/${row.personId}`, { method: "PATCH", body: JSON.stringify({ values }) });
    if (res && !res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setNotice(j.error ?? "Couldn't save that change.");
      router.refresh();
    }
  }
  async function saveMembershipCell(row: SharedRow, key: string, value: string) {
    if ((row.values[key] ?? "") === value) return;
    const values = { ...row.values, [key]: value };
    setRows((cur) => cur.map((r) => (r.membershipId === row.membershipId ? { ...r, values } : r)));
    await api(`${base}/memberships/${row.membershipId}`, { method: "PATCH", body: JSON.stringify({ values }) });
  }
  async function moveRow(membershipId: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.membershipId === membershipId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= rows.length) return;
    setRows((cur) => {
      const next = [...cur];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    await api(`${base}/memberships/${membershipId}`, { method: "PATCH", body: JSON.stringify({ move: dir }) });
  }
  async function addContact() {
    await api(`${base}/memberships`, { method: "POST", body: JSON.stringify({}) });
    router.refresh();
  }

  const cellInput =
    "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1.5 text-[12.5px] text-fg placeholder:text-subtle focus:border-brand-300 focus:bg-card-solid focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:opacity-70";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted">
          {canEdit
            ? "Click a cell to edit — changes save when you click away. New contacts are credited to you."
            : "This link is view-only."}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={addContact}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add contact
          </button>
        )}
      </div>
      {notice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">{notice}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-card-solid">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-elevated/40">
              {personColumns.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
                  <span className="inline-flex items-center gap-1" title="Shared with the BHN directory">
                    <Link2 size={9} className="text-brand-600" /> {c.label}
                  </span>
                </th>
              ))}
              {columns.map((c) => (
                <th key={c.key} className="border-l border-line/70 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Added by</th>
              {canEdit && <th className="w-16 px-2 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={row.membershipId} className="group hover:bg-elevated/30">
                {personColumns.map((c) => (
                  <td key={c.key} className="px-1.5 py-1 align-top">
                    <input
                      key={`${row.personId}-${c.key}-${row.personValues[c.key] ?? ""}`}
                      defaultValue={row.personValues[c.key] ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => savePersonCell(row, c.key, e.target.value.trim())}
                      placeholder="—"
                      className={cellInput}
                    />
                  </td>
                ))}
                {columns.map((c) => (
                  <td key={c.key} className="border-l border-line/70 px-1.5 py-1 align-top">
                    <input
                      key={`${row.membershipId}-${c.key}-${row.values[c.key] ?? ""}`}
                      defaultValue={row.values[c.key] ?? ""}
                      disabled={!canEdit}
                      onBlur={(e) => saveMembershipCell(row, c.key, e.target.value.trim())}
                      placeholder="—"
                      className={cellInput}
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2.5 align-middle">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                    <UserRound size={11} className="shrink-0" /> {row.addedByName}
                  </span>
                </td>
                {canEdit && (
                  <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      <button type="button" title="Move up" disabled={i === 0} onClick={() => moveRow(row.membershipId, -1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button type="button" title="Move down" disabled={i === rows.length - 1} onClick={() => moveRow(row.membershipId, 1)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"><ChevronDown size={13} /></button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={personColumns.length + columns.length + 2} className="px-4 py-10 text-center text-sm text-muted">
                  No contacts yet{canEdit ? " — hit Add contact to start the list." : "."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
