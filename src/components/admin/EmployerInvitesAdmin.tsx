"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Copy, Check, Trash2, AlertCircle, Mail, Building2,
  Sparkles, ExternalLink, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Invite {
  id: string;
  email: string;
  token: string;
  companyName: string | null;
  companyWebsite: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

/**
 * Admin UI for employer invites — barrier-free magic-link mints.
 *
 *   - Quick invite (zero inputs): one click → server fills sensible
 *     defaults, link auto-copies to clipboard.
 *   - Customise: collapsible form, all fields optional, used to
 *     personalise the email/company name when sending to a real
 *     prospect.
 *   - Each invite shows its full URL inline (read-only input with
 *     select-all on click), plus Copy / Test (open in new tab) /
 *     Revoke buttons. Magic links are reusable until expiry.
 */
export function EmployerInvitesAdmin({ initial }: { initial: Invite[] }) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>(initial);
  const [form, setForm] = useState({
    email: "", companyName: "", companyWebsite: "", expiresInDays: 14,
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );

  function linkFor(token: string) {
    return `${origin}/signup/employer/${token}`;
  }

  async function create(payload?: typeof form) {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/employer-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? form),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; invite?: Invite; error?: string;
      };
      if (!res.ok || !j.invite) {
        setError(j.error ?? "Couldn't create invite.");
        return null;
      }
      setInvites((cur) => [j.invite!, ...cur]);
      setForm({ email: "", companyName: "", companyWebsite: "", expiresInDays: 14 });
      setShowForm(false);
      setJustCreated(j.invite.id);
      router.refresh();
      return j.invite;
    } finally {
      setCreating(false);
    }
  }

  async function quickInvite() {
    const created = await create({ email: "", companyName: "", companyWebsite: "", expiresInDays: 14 });
    if (created) {
      // Auto-copy so the admin can paste anywhere immediately.
      try { await navigator.clipboard.writeText(linkFor(created.token)); } catch {/* */}
      setCopiedId(created.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function copyLink(invite: Invite) {
    try {
      await navigator.clipboard.writeText(linkFor(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      window.prompt("Copy link:", linkFor(invite.token));
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite? The magic link stops working immediately.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/employer-invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? "Couldn't revoke.");
        return;
      }
      setInvites((cur) => cur.filter((i) => i.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Issue invite */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-fg">Issue an invite</h2>
            <p className="text-xs text-muted mt-0.5">Magic-link sign-in — recipient clicks the URL and lands in /employer. No claim form, no password to type.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={quickInvite}
              disabled={creating}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-1.5"
              title="Mint a generic invite — no inputs needed. Auto-copies the link."
            >
              <Sparkles size={12} /> Quick invite (auto-copy)
            </button>
            {!showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 inline-flex items-center gap-1.5"
              >
                <Plus size={12} /> Customise
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-elevated/40 border border-line rounded-xl p-4 space-y-3 animate-fade-in">
            <p className="text-xs text-muted">All fields optional — leave blank for sensible defaults. Use these when sending to a real prospect.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Recipient email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((cur) => ({ ...cur, email: e.target.value }))}
                  placeholder="contact@partner.com (optional)"
                  className={inputClass}
                />
              </Field>
              <Field label="Expires in (days)">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.expiresInDays}
                  onChange={(e) => setForm((cur) => ({ ...cur, expiresInDays: parseInt(e.target.value) || 14 }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Company name">
                <input
                  value={form.companyName}
                  onChange={(e) => setForm((cur) => ({ ...cur, companyName: e.target.value }))}
                  placeholder="Acme Biotherapeutics (optional)"
                  className={inputClass}
                />
              </Field>
              <Field label="Company website">
                <input
                  value={form.companyWebsite}
                  onChange={(e) => setForm((cur) => ({ ...cur, companyWebsite: e.target.value }))}
                  placeholder="acme-bio.com (optional)"
                  className={inputClass}
                />
              </Field>
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="text-xs px-3 py-2 rounded-lg text-muted hover:bg-elevated">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => create()}
                disabled={creating}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Invites list — magic links visible inline so admins can recopy / test anytime */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-2">
          Invites · {invites.length}
        </p>
        {invites.length === 0 ? (
          <div className="bg-card border border-line rounded-xl p-12 text-center text-sm text-muted">
            No invites issued yet. Quick-invite above to spin one up in a click.
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((i) => (
              <InviteCard
                key={i.id}
                invite={i}
                origin={origin}
                copied={copiedId === i.id}
                highlight={justCreated === i.id}
                busy={busyId === i.id}
                onCopy={() => copyLink(i)}
                onRevoke={() => revoke(i.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="bg-card-solid border border-line rounded-lg p-3 text-xs text-muted space-y-1">
        <p className="font-semibold text-fg">A few notes on testing</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Open the <strong>Test</strong> link in an incognito / private window — clicking it normally would replace your admin session with the employer one (same browser shares cookies).</li>
          <li>Magic links are reusable until expiry, so the same partner can return as a bookmark.</li>
          <li>BHN&apos;s outbound email isn&apos;t wired up yet — copy the URL above and send it via Slack / Gmail / your normal channel.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Per-invite card ──────────────────────────────────────────────
function InviteCard({
  invite, origin, copied, highlight, busy, onCopy, onRevoke,
}: {
  invite: Invite;
  origin: string;
  copied: boolean;
  highlight: boolean;
  busy: boolean;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  const [url, setUrl] = useState(origin ? `${origin}/signup/employer/${invite.token}` : "");
  useEffect(() => {
    setUrl(`${window.location.origin}/signup/employer/${invite.token}`);
  }, [invite.token]);

  const used = !!invite.usedAt;
  const expired = !used && new Date(invite.expiresAt) < new Date();
  const expiresIn = Math.max(0, Math.floor((new Date(invite.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000)));
  const dead = expired; // revoked / expired = no actions

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 space-y-3 transition-colors",
        highlight ? "border-brand-300 ring-1 ring-brand-200" : "border-line",
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Building2 size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-fg truncate">{invite.companyName ?? invite.email}</p>
            {used ? (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                claimed
              </span>
            ) : expired ? (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-elevated text-subtle border border-line">
                expired
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                pending
              </span>
            )}
          </div>
          <p className="text-xs text-muted truncate inline-flex items-center gap-1">
            <Mail size={11} /> {invite.email}
          </p>
        </div>
        <p className="text-[11px] text-subtle inline-flex items-center gap-1 shrink-0">
          <Clock size={11} />
          {expired ? "expired" : expiresIn === 0 ? "today" : `${expiresIn}d left`}
        </p>
      </div>

      {!dead && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 font-mono text-xs bg-elevated/40 border border-line rounded-md px-2.5 py-1.5 text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/30 select-all min-w-0"
          />
          <button
            type="button"
            onClick={onCopy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 inline-flex items-center gap-1.5 shrink-0"
            title="Copy magic-link URL"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg inline-flex items-center gap-1.5 shrink-0"
            title="Open the magic link in a new tab — same experience the recipient sees. Tip: use an incognito window so it doesn't replace your admin session."
          >
            <ExternalLink size={12} /> Test
          </a>
          {!used && (
            <button
              type="button"
              onClick={onRevoke}
              disabled={busy}
              className="text-xs text-subtle hover:text-rose-600 disabled:opacity-40 p-1.5 rounded shrink-0"
              title="Revoke"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
