"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Copy, Check, Trash2, AlertCircle, Mail, Building2,
} from "lucide-react";

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

export function EmployerInvitesAdmin({ initial }: { initial: Invite[] }) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>(initial);
  const [form, setForm] = useState({
    email: "", companyName: "", companyWebsite: "", expiresInDays: 14,
  });
  const [creating, setCreating] = useState(false);
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

  async function create() {
    setError(null);
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/employer-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean; invite?: Invite; error?: string;
      };
      if (!res.ok || !j.invite) {
        setError(j.error ?? "Couldn't create invite.");
        return;
      }
      setInvites((cur) => [j.invite!, ...cur]);
      setForm({ email: "", companyName: "", companyWebsite: "", expiresInDays: 14 });
      setJustCreated(j.invite.id);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function copyLink(invite: Invite) {
    try {
      await navigator.clipboard.writeText(linkFor(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback — show prompt with the link
      window.prompt("Copy link:", linkFor(invite.token));
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this unused invite? The link stops working immediately.")) return;
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
      {/* Create form */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <h2 className="font-semibold text-fg mb-3">Issue a new invite</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Recipient email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((cur) => ({ ...cur, email: e.target.value }))}
              placeholder="contact@partner.com"
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
          <Field label="Company name (optional)">
            <input
              value={form.companyName}
              onChange={(e) => setForm((cur) => ({ ...cur, companyName: e.target.value }))}
              placeholder="Acme Biotherapeutics"
              className={inputClass}
            />
          </Field>
          <Field label="Company website (optional)">
            <input
              value={form.companyWebsite}
              onChange={(e) => setForm((cur) => ({ ...cur, companyWebsite: e.target.value }))}
              placeholder="acme-bio.com"
              className={inputClass}
            />
          </Field>
        </div>
        {error && (
          <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={create}
            disabled={creating || !form.email.trim()}
            className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm shadow-brand-600/25"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create invite
          </button>
        </div>
      </section>

      {/* Invites table */}
      <section className="bg-card border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-semibold text-fg">Issued invites</h2>
          <p className="text-xs text-muted mt-0.5">{invites.length} {invites.length === 1 ? "invite" : "invites"} · most recent first</p>
        </div>
        {invites.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted">No invites issued yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-elevated/60 border-b border-line">
              <tr>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5">Recipient</th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5">Status</th>
                <th className="text-left text-[10px] font-semibold text-muted uppercase tracking-wider px-4 py-2.5">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invites.map((i) => {
                const used = !!i.usedAt;
                const expired = !used && new Date(i.expiresAt) < new Date();
                return (
                  <tr
                    key={i.id}
                    className={`hover:bg-elevated/40 ${justCreated === i.id ? "bg-brand-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg flex items-center gap-1.5"><Mail size={12} className="text-subtle" />{i.email}</div>
                      {i.companyName && (
                        <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5"><Building2 size={11} className="text-subtle" />{i.companyName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {used ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check size={11} /> Claimed {new Date(i.usedAt!).toLocaleDateString()}
                        </span>
                      ) : expired ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-elevated text-muted border border-line">
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Pending · expires {new Date(i.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-subtle">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!used && !expired && (
                          <button
                            type="button"
                            onClick={() => copyLink(i)}
                            className="text-xs px-2.5 py-1 rounded-md border border-line hover:border-brand-300 hover:text-brand-700 transition-colors inline-flex items-center gap-1"
                          >
                            {copiedId === i.id ? <Check size={11} /> : <Copy size={11} />}
                            {copiedId === i.id ? "Copied" : "Copy link"}
                          </button>
                        )}
                        {!used && (
                          <button
                            type="button"
                            onClick={() => revoke(i.id)}
                            disabled={busyId === i.id}
                            className="text-xs text-subtle hover:text-rose-600 disabled:opacity-40 p-1.5 rounded"
                            title="Revoke"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-subtle leading-relaxed">
        Note: BHN's outbound email isn't wired yet. After creating an invite, copy the link from the table and send it to the partner via your normal channel — they'll click through, set a name + password, and land on /employer with Employer HR access.
      </p>
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
