"use client";
/**
 * Admin newsletter-export workflow:
 *   1. Page lands on the "New" tab — only users who opted in and
 *      haven't been copied to the clipboard yet.
 *   2. Admin tweaks selection (default: all rows checked), picks a
 *      copy format (one per line / comma-separated / CSV w/ name),
 *      clicks Copy. Browser clipboard receives the formatted list.
 *   3. Admin clicks "Mark these as exported" — server stamps
 *      newsletterExportedAt on each row so they drop off the New tab.
 *   4. The All tab is provided as a sanity / re-export view.
 *
 * Copy and the mark-as-exported steps are intentionally separate so
 * the admin can copy → paste into Mailchimp → confirm there → only
 * then mark as exported on our side. If they accidentally hit Mark,
 * the All tab still has the addresses and a per-row reset is offered.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Copy, CheckCircle2, RotateCw, Square, CheckSquare, Layers, AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  email: string;
  name: string | null;
  organization: string | null;
  jobTitle: string | null;
  country: string | null;
  createdAt: string;
  newsletterSubscribedAt: string | null;
  newsletterExportedAt: string | null;
  /** Last-known Mailchimp-side state. Null = never pushed (legacy
   *  rows before the Mailchimp integration, or rows where the user
   *  declined the newsletter on signup). */
  mailchimpStatus: string | null;
  mailchimpSyncedAt: string | null;
}

interface Payload {
  scope: "new" | "all";
  rows: Row[];
  counts: { new: number; all: number };
  lastExportedAt: string | null;
}

type CopyFormat = "lines" | "csv-name" | "comma";

const COPY_FORMATS: { id: CopyFormat; label: string; hint: string }[] = [
  { id: "lines",    label: "One email per line", hint: "Best for Mailchimp / generic ESP paste-import" },
  { id: "csv-name", label: "CSV (email, name)",  hint: "Two-column CSV — email plus best-effort full name" },
  { id: "comma",    label: "Comma-separated",     hint: "Single line of email1, email2, …" },
];

export function NewsletterExportClient() {
  const [scope, setScope] = useState<"new" | "all">("new");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<CopyFormat>("lines");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [marked, setMarked] = useState(0);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function load(s: "new" | "all" = scope) {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/newsletter?scope=${s}`, { cache: "no-store" });
      const j = (await r.json()) as Payload;
      setData(j);
      // Default-select all visible rows on the New tab; nothing on All tab.
      if (s === "new") setSelected(new Set(j.rows.map((row) => row.id)));
      else setSelected(new Set());
    } catch {
      setMessage({ tone: "err", text: "Failed to load — check the network tab." });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load("new"); /* eslint-disable-next-line */ }, []);

  function switchScope(next: "new" | "all") {
    if (next === scope) return;
    setScope(next);
    load(next);
  }

  function toggle(id: string) {
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (!data) return;
    setSelected((cur) => {
      if (cur.size === data.rows.length) return new Set();
      return new Set(data.rows.map((r) => r.id));
    });
  }

  const selectedRows = useMemo(
    () => data ? data.rows.filter((r) => selected.has(r.id)) : [],
    [data, selected],
  );

  function formatForClipboard(rows: Row[], fmt: CopyFormat): string {
    const emails = rows.map((r) => r.email.trim()).filter(Boolean);
    if (fmt === "comma") return emails.join(", ");
    if (fmt === "csv-name") {
      const lines = ["email,name"];
      for (const r of rows) {
        const safeName = (r.name ?? "").replace(/"/g, '""');
        lines.push(`${r.email},"${safeName}"`);
      }
      return lines.join("\n");
    }
    return emails.join("\n");
  }

  async function copyToClipboard() {
    if (selectedRows.length === 0) return;
    const text = formatForClipboard(selectedRows, format);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setMessage({ tone: "ok", text: `Copied ${selectedRows.length} address${selectedRows.length === 1 ? "" : "es"} as ${COPY_FORMATS.find((f) => f.id === format)?.label}.` });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage({ tone: "err", text: "Clipboard write failed — copy from the textarea below instead." });
    }
  }

  async function markAsExported() {
    if (selectedRows.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedRows.map((row) => row.id) }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage({ tone: "err", text: j.error ?? "Failed to mark as exported" });
        return;
      }
      setMarked(j.marked);
      setMessage({ tone: "ok", text: `Marked ${j.marked} as exported. They won't appear here next time.` });
      // Refresh — on the New tab they'll disappear; on All tab the
      // exportedAt column will populate.
      await load(scope);
    } finally {
      setBusy(false);
    }
  }

  async function resetExported(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/newsletter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: ids }),
      });
      const j = await r.json();
      if (r.ok) {
        setMessage({ tone: "ok", text: `Re-armed ${j.reset} for export.` });
        await load(scope);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <section className="bg-card border border-line rounded-2xl p-8 text-center">
        <p className="text-sm text-muted">Loading…</p>
      </section>
    );
  }
  if (!data) return null;

  const allSelected = selected.size === data.rows.length && data.rows.length > 0;
  const previewText = formatForClipboard(selectedRows.slice(0, 50), format);

  return (
    <section className="bg-card border border-line rounded-2xl">
      {/* Tabs */}
      <div className="border-b border-line px-5 pt-4 pb-0 flex items-end gap-1">
        <Tab active={scope === "new"} onClick={() => switchScope("new")}>
          New to export <span className="ml-1.5 text-[10px] tabular-nums opacity-80">{data.counts.new}</span>
        </Tab>
        <Tab active={scope === "all"} onClick={() => switchScope("all")}>
          All subscribed <span className="ml-1.5 text-[10px] tabular-nums opacity-80">{data.counts.all}</span>
        </Tab>
        {data.lastExportedAt && (
          <p className="ml-auto text-[11px] text-subtle pb-2">
            Last export: {new Date(data.lastExportedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-line">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
          disabled={data.rows.length === 0}
        >
          {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
          {allSelected ? "Unselect all" : "Select all"}
        </button>
        <span className="text-xs text-subtle">·</span>
        <p className="text-xs text-muted">
          <span className="font-semibold tabular-nums">{selected.size}</span> of {data.rows.length} selected
        </p>

        {/* Format picker */}
        <div className="ml-auto flex items-center gap-2">
          <label className="relative">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as CopyFormat)}
              className="appearance-none text-xs bg-card-solid border border-line rounded-lg px-3 py-1.5 pr-7 text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {COPY_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          </label>

          <button
            type="button"
            onClick={copyToClipboard}
            disabled={selectedRows.length === 0}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              copied
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-brand-600 text-white border-brand-700 hover:bg-brand-700 disabled:bg-elevated disabled:text-subtle disabled:border-line disabled:cursor-not-allowed",
            )}
          >
            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : `Copy ${selectedRows.length || ""}`}
          </button>

          {scope === "new" && (
            <button
              type="button"
              onClick={markAsExported}
              disabled={selectedRows.length === 0 || busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Stamp newsletterExportedAt — they drop off the New tab next visit."
            >
              <Layers size={13} /> Mark as exported
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={cn(
            "mx-5 mt-3 px-3 py-2 rounded-lg border flex items-start gap-2 text-xs",
            message.tone === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700",
          )}
        >
          {message.tone === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Table */}
      {data.rows.length === 0 ? (
        <div className="px-8 py-12 text-center">
          <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-fg">
            {scope === "new" ? "All caught up — no new sign-ups to export." : "No subscribers yet."}
          </p>
          {scope === "new" && marked > 0 && (
            <p className="text-xs text-muted mt-1">Just marked {marked} as exported.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-subtle bg-elevated/40">
              <tr>
                <th className="text-left py-2 px-5 w-8"></th>
                <th className="text-left py-2 px-2">Email</th>
                <th className="text-left py-2 px-2">Name</th>
                <th className="text-left py-2 px-2">Org · role</th>
                <th className="text-left py-2 px-2">Signed up</th>
                <th className="text-left py-2 px-2">Mailchimp</th>
                {scope === "all" && <th className="text-left py-2 px-2">Last exported</th>}
                <th className="text-right py-2 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((r) => {
                const isSelected = selected.has(r.id);
                return (
                  <tr key={r.id} className={cn("transition-colors", isSelected ? "bg-brand-50/50" : "hover:bg-elevated/40")}>
                    <td className="py-2 px-5">
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="text-muted hover:text-brand-700"
                        aria-label={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? <CheckSquare size={15} className="text-brand-600" /> : <Square size={15} />}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-fg">{r.email}</td>
                    <td className="py-2 px-2 text-fg">{r.name ?? <span className="text-subtle">—</span>}</td>
                    <td className="py-2 px-2 text-muted text-xs">
                      {[r.organization, r.jobTitle].filter(Boolean).join(" · ") || <span className="text-subtle">—</span>}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted">
                      {r.newsletterSubscribedAt
                        ? new Date(r.newsletterSubscribedAt).toLocaleDateString()
                        : new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2 text-xs">
                      <MailchimpStatusPill
                        status={r.mailchimpStatus}
                        syncedAt={r.mailchimpSyncedAt}
                      />
                    </td>
                    {scope === "all" && (
                      <td className="py-2 px-2 text-xs">
                        {r.newsletterExportedAt ? (
                          <span className="text-subtle">
                            {new Date(r.newsletterExportedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">never</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 px-5 text-right">
                      {r.newsletterExportedAt && (
                        <button
                          type="button"
                          onClick={() => resetExported([r.id])}
                          disabled={busy}
                          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-brand-700 transition-colors"
                          title="Re-arm this row for the New tab"
                        >
                          <RotateCw size={11} /> Re-arm
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Read-only preview of what will be copied — handy if clipboard
          access is blocked, the admin can manually select-all here. */}
      {selectedRows.length > 0 && (
        <details className="px-5 py-3 border-t border-line group">
          <summary className="cursor-pointer text-xs text-muted hover:text-fg select-none">
            Preview clipboard payload {selectedRows.length > 50 && <span className="text-subtle">(first 50)</span>}
          </summary>
          <textarea
            readOnly
            value={previewText}
            rows={6}
            className="mt-2 w-full font-mono text-xs bg-card-solid border border-line rounded-lg px-3 py-2 text-fg focus:outline-none"
          />
        </details>
      )}
    </section>
  );
}

function Tab({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px",
        active
          ? "text-brand-700 border-brand-600"
          : "text-muted border-transparent hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/** Small chip rendering the Mailchimp-side state. The values come
 *  from `User.mailchimpStatus`. We deliberately render "never pushed"
 *  for null so an admin doesn't confuse "no Mailchimp record" with
 *  "actively unsubscribed". */
function MailchimpStatusPill({
  status,
  syncedAt,
}: {
  status: string | null;
  syncedAt: string | null;
}) {
  const meta: { label: string; cls: string } = (() => {
    switch (status) {
      case "pending":
        return { label: "Pending DOI", cls: "bg-amber-100 text-amber-800 ring-amber-200" };
      case "subscribed":
        return { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
      case "unsubscribed":
        return { label: "Unsubscribed", cls: "bg-slate-100 text-slate-700 ring-slate-200" };
      case "cleaned":
        return { label: "Cleaned", cls: "bg-rose-100 text-rose-800 ring-rose-200" };
      case "error":
        return { label: "Push failed", cls: "bg-rose-100 text-rose-800 ring-rose-200" };
      default:
        return { label: "Never pushed", cls: "bg-elevated text-subtle ring-line" };
    }
  })();
  const title = syncedAt
    ? `Last reconciled: ${new Date(syncedAt).toLocaleString()}`
    : "No Mailchimp activity recorded";
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full ring-1 ring-inset",
        meta.cls,
      )}
      title={title}
    >
      {meta.label}
    </span>
  );
}
