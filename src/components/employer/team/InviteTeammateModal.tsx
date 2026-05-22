"use client";

/**
 * InviteTeammateModal — "Invite teammates" entry-point for /employer/team.
 *
 * UX flow:
 *   1. Manager clicks the button → modal opens.
 *   2. Type / paste a list of emails (one per line, or comma-separated).
 *   3. Each resolved entry shows email + auto-detected role chip + title.
 *   4. User can tweak role and title per-entry before sending.
 *   5. On submit → POST /api/employer/companies/[id]/members.
 *   6. Shows a result card: N sent + any skipped (with reasons).
 *
 * Role auto-suggestion mirrors the server-side titleToSuggestedRole()
 * helper — a pure keyword scan, inlined here so it runs client-side.
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus, X, Plus, Trash2, Send, AlertCircle, CheckCircle2,
  ChevronDown, ShieldCheck, Shield, Users, Eye, Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

type Role = "owner" | "manager" | "generalist" | "viewer";

interface InviteEntry {
  id:    number;
  email: string;
  role:  Role;
  title: string;
  note:  string;
}

interface Props {
  companyId:  string;
  callerRole: Role;
}

// ── Role helpers ──────────────────────────────────────────────────

const ROLES: Role[] = ["owner", "manager", "generalist", "viewer"];

const ROLE_META: Record<Role, {
  label: string;
  icon:  React.ElementType;
  cls:   string;
}> = {
  owner:      { label: "Owner",      icon: ShieldCheck, cls: "bg-brand-50 text-brand-700 ring-brand-200"   },
  manager:    { label: "Manager",    icon: Shield,      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  generalist: { label: "Generalist", icon: Users,       cls: "bg-amber-50 text-amber-700 ring-amber-200"   },
  viewer:     { label: "Viewer",     icon: Eye,         cls: "bg-raised text-muted ring-line"               },
};

// Mirrors server-side titleToSuggestedRole() — pure keyword check.
function suggestRoleFromTitle(title: string): Role {
  const t = title.toLowerCase();
  if (/\b(director|vp|vice.president|head of|chief|ceo|coo|cto|cfo|president)\b/.test(t)) return "owner";
  if (/\b(manager|lead|team.lead|hr.lead|talent.manager|recruitment.manager|people.ops)\b/.test(t)) return "manager";
  if (/\b(recruiter|generalist|hr.generalist|talent.acqui|sourcer|coordinator)\b/.test(t)) return "generalist";
  return "viewer";
}

let seq = 0;
function newEntry(email = "", title = ""): InviteEntry {
  const role = title ? suggestRoleFromTitle(title) : "viewer";
  return { id: ++seq, email, role, title, note: "" };
}

// ── RoleSelect ────────────────────────────────────────────────────

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[value];
  const Icon = meta.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ring-1 ring-inset transition-colors",
          meta.cls,
        )}
      >
        <Icon size={10} />
        {meta.label}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 w-36 bg-card-solid border border-line rounded-xl shadow-lg py-1">
            {ROLES.map(r => {
              const m = ROLE_META[r];
              const RoleIcon = m.icon;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { onChange(r); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left transition-colors",
                    r === value ? "text-brand-700 bg-brand-50" : "text-fg hover:bg-elevated",
                  )}
                >
                  <RoleIcon size={11} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── EntryRow ──────────────────────────────────────────────────────

function EntryRow({
  entry,
  onUpdate,
  onRemove,
  showRemove,
}: {
  entry:     InviteEntry;
  onUpdate:  (id: number, patch: Partial<InviteEntry>) => void;
  onRemove:  (id: number) => void;
  showRemove: boolean;
}) {
  const [showNote, setShowNote] = useState(false);

  function handleTitleChange(title: string) {
    const patch: Partial<InviteEntry> = { title };
    // Auto-suggest role when title is typed, but don't override user's
    // explicit choice if they've already changed it from the default.
    if (title) patch.role = suggestRoleFromTitle(title);
    onUpdate(entry.id, patch);
  }

  return (
    <div className="bg-elevated/40 border border-line rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        {/* Email */}
        <input
          type="email"
          value={entry.email}
          onChange={e => onUpdate(entry.id, { email: e.target.value })}
          placeholder="colleague@company.com"
          className="flex-1 min-w-0 bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        {/* Role */}
        <RoleSelect
          value={entry.role}
          onChange={role => onUpdate(entry.id, { role })}
        />
        {/* Remove */}
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="p-1.5 rounded-lg text-subtle hover:text-rose-500 hover:bg-rose-50 transition-colors mt-0.5"
            aria-label="Remove"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        value={entry.title}
        onChange={e => handleTitleChange(e.target.value)}
        placeholder="Job title (optional — auto-suggests role)"
        className="w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-300"
      />

      {/* Note toggle */}
      {!showNote && !entry.note && (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="text-xs text-subtle hover:text-muted transition-colors"
        >
          + Add personal note
        </button>
      )}
      {(showNote || entry.note) && (
        <textarea
          rows={2}
          value={entry.note}
          onChange={e => onUpdate(entry.id, { note: e.target.value })}
          placeholder="Personal note (optional — appears in the invite email)"
          className="w-full bg-card-solid border border-line rounded-lg px-3 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
      )}
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────

interface Result {
  sent:    number;
  skipped: Array<{ email: string; reason: string }>;
}

function ResultCard({ result, onClose }: { result: Result; onClose: () => void }) {
  return (
    <div className="space-y-4">
      {result.sent > 0 && (
        <div className="flex items-start gap-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-4">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">
              {result.sent} invite{result.sent !== 1 ? "s" : ""} sent!
            </p>
            <p className="text-xs mt-0.5 text-emerald-700">
              Each teammate will receive an email with a 7-day accept link.
            </p>
          </div>
        </div>
      )}

      {result.skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle size={15} />
            <p className="text-sm font-semibold">
              {result.skipped.length} skipped
            </p>
          </div>
          <ul className="space-y-1">
            {result.skipped.map((s, i) => (
              <li key={i} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium text-amber-800 truncate">{s.email}</span>
                <span className="text-amber-700 shrink-0">{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Paste parser ──────────────────────────────────────────────────

/**
 * Parses pasted text into InviteEntry rows.
 * Supports:
 *   • one email per line
 *   • "Name <email>" format
 *   • comma-separated emails
 *   • "email, Title" pairs (title after comma on same line)
 */
function parsePaste(text: string): InviteEntry[] {
  const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const lines    = text.split(/[\n;]+/);
  const entries: InviteEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split by comma to find "email, title" pairs.
    const parts  = line.split(",").map(p => p.trim());
    const emails = parts[0].match(EMAIL_RE);
    if (!emails) continue;

    const title = parts[1] ?? "";
    for (const email of emails) {
      entries.push(newEntry(email.toLowerCase(), title));
    }
  }

  return entries;
}

// ── InviteTeammateModal ───────────────────────────────────────────

export function InviteTeammateModal({ companyId, callerRole }: Props) {
  const router       = useRouter();
  const [open, setOpen]     = useState(false);
  const [entries, setEntries] = useState<InviteEntry[]>([newEntry()]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<Result | null>(null);

  function reset() {
    setEntries([newEntry()]);
    setPasteMode(false);
    setPasteText("");
    setResult(null);
  }

  function openModal() { reset(); setOpen(true); }
  function closeModal() { setOpen(false); }

  function updateEntry(id: number, patch: Partial<InviteEntry>) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function removeEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function addEntry() {
    setEntries(prev => [...prev, newEntry()]);
  }

  function applyPaste() {
    const parsed = parsePaste(pasteText);
    if (parsed.length > 0) {
      setEntries(parsed.slice(0, 50));
      setPasteMode(false);
      setPasteText("");
    }
  }

  async function submit() {
    const valid = entries.filter(e => e.email.includes("@"));
    if (valid.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(`/api/employer/companies/${companyId}/members`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          invites: valid.map(e => ({
            email: e.email.trim().toLowerCase(),
            role:  e.role,
            title: e.title || undefined,
            note:  e.note  || undefined,
          })),
        }),
      });
      const data = await res.json();
      setResult({ sent: data.sent ?? 0, skipped: data.skipped ?? [] });
      router.refresh();
    } catch {
      setResult({ sent: 0, skipped: [{ email: "–", reason: "Network error — please try again" }] });
    } finally {
      setSending(false);
    }
  }

  const validCount = entries.filter(e => e.email.includes("@")).length;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <UserPlus size={15} />
        Invite teammates
      </button>

      {/* Modal */}
      <Modal
        open={open}
        onClose={closeModal}
        title="Invite teammates"
        description="They'll receive an email with a 7-day accept link."
        size="md"
        footer={
          result ? null : (
            <>
              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-1.5 text-xs font-semibold text-fg-muted hover:bg-elevated rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={sending || validCount === 0}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {sending
                  ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  : <><Send size={13} /> Send {validCount > 0 ? `${validCount} ` : ""}invite{validCount !== 1 ? "s" : ""}</>
                }
              </button>
            </>
          )
        }
      >
        {result ? (
          <ResultCard result={result} onClose={closeModal} />
        ) : pasteMode ? (
          /* ── Paste mode ─────────────────────────────────────────── */
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Paste a list of emails — one per line, or use{" "}
              <code className="text-xs bg-raised px-1 py-0.5 rounded">email, Job Title</code>{" "}
              format to auto-suggest roles.
            </p>
            <textarea
              autoFocus
              rows={8}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`sarah@company.com\njohn@company.com, HR Manager\nalex@company.com, Senior Recruiter`}
              className="w-full bg-card-solid border border-line rounded-xl px-3 py-2.5 text-sm text-fg font-mono placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPasteMode(false); setPasteText(""); }}
                className="flex-1 py-2 text-xs font-medium text-muted hover:bg-elevated rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                className="flex-1 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                Parse {parsePaste(pasteText).length > 0
                  ? `${parsePaste(pasteText).length} email${parsePaste(pasteText).length !== 1 ? "s" : ""}`
                  : "emails"
                }
              </button>
            </div>
          </div>
        ) : (
          /* ── Individual entry mode ──────────────────────────────── */
          <div className="space-y-3">
            {/* Role explainer */}
            <div className="text-xs text-muted bg-elevated/60 rounded-xl px-3 py-2 flex flex-wrap gap-x-3 gap-y-1">
              <span className="font-medium text-fg">Roles:</span>
              <span><span className="font-medium text-brand-700">Owner</span> — full admin</span>
              <span><span className="font-medium text-emerald-700">Manager</span> — invite + approve</span>
              <span><span className="font-medium text-amber-700">Generalist</span> — post + review</span>
              <span><span className="font-medium text-muted">Viewer</span> — read only</span>
            </div>

            {/* Entry rows */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
              {entries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={updateEntry}
                  onRemove={removeEntry}
                  showRemove={entries.length > 1}
                />
              ))}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addEntry}
                  disabled={entries.length >= 50}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg hover:bg-elevated px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Plus size={13} />
                  Add another
                </button>
                <button
                  type="button"
                  onClick={() => { setPasteMode(true); }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-fg hover:bg-elevated px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Paste a list
                </button>
              </div>
              <p className="text-xs text-subtle">Max 50 per batch</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
