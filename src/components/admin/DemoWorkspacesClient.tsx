"use client";
/**
 * Admin UI for demo-workspace mint + active-demos panel.
 */
import { useState } from "react";
import {
  Sparkles, Plus, Copy, CheckCircle2, AlertCircle, Trash2, Clock,
  ExternalLink, Building2, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Invite {
  id: string;
  token: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  expiresAt: string;
  createdAt: string;
}

interface Active {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  expiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Props {
  initialInvites: Invite[];
  initialActive: Active[];
}

export function DemoWorkspacesClient({ initialInvites, initialActive }: Props) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [active, setActive] = useState<Active[]>(initialActive);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", companyName: "", companyWebsite: "", days: 7 });
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copyLink(token: string) {
    const url = `${window.location.origin}/employer/demo/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {/* ignore */});
  }

  async function mint() {
    setErr(null);
    if (!form.email.trim() || !form.companyName.trim()) {
      setErr("Email and company name required."); return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/demo-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "Mint failed"); return; }
      setInvites((cur) => [{
        id: j.invite.id,
        token: j.invite.token,
        email: j.invite.email,
        companyName: j.invite.companyName,
        companyWebsite: form.companyWebsite || null,
        expiresAt: j.invite.expiresAt,
        createdAt: new Date().toISOString(),
      }, ...cur]);
      setForm({ email: "", companyName: "", companyWebsite: "", days: 7 });
      setCreating(false);
      // Auto-copy the new link
      copyLink(j.invite.token);
    } finally { setBusy(false); }
  }

  async function endDemo(employerId: string) {
    if (!confirm("End this demo workspace now? The visitor's data will be deleted.")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/demo-workspaces?employerId=${employerId}`, { method: "DELETE" });
      if (r.ok) setActive((cur) => cur.filter((a) => a.id !== employerId));
    } finally { setBusy(false); }
  }

  async function sweep() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/demo-workspaces", { method: "PATCH" });
      if (r.ok) {
        const j = await r.json();
        if (j.deleted > 0) {
          setActive((cur) => cur.filter((a) => !a.expiresAt || new Date(a.expiresAt) > new Date()));
        }
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* Mint CTA */}
      <section className="bg-card border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-fg">Mint a demo link</h2>
            <p className="text-xs text-muted mt-0.5">Generates a one-shot URL the prospect clicks to spin up their populated workspace.</p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 inline-flex items-center gap-1.5"
            >
              <Plus size={12} /> New demo link
            </button>
          )}
        </div>

        {creating && (
          <div className="bg-elevated/40 border border-line rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Visitor email *">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="jane@partner-company.com"
                />
              </Field>
              <Field label="Company name *">
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className={inputCls}
                  placeholder="Partner Biotech Inc"
                />
              </Field>
              <Field label="Company website">
                <input
                  value={form.companyWebsite}
                  onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                  className={inputCls}
                  placeholder="https://partner-co.com"
                />
              </Field>
              <Field label="Demo lifetime (days)">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: Math.max(1, Math.min(30, Number(e.target.value) || 7)) })}
                  className={inputCls}
                />
              </Field>
            </div>
            {err && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                <AlertCircle size={12} /> {err}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="text-xs px-3 py-2 rounded-lg text-muted hover:bg-elevated">Cancel</button>
              <button onClick={mint} disabled={busy} className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60 inline-flex items-center gap-1.5">
                <Sparkles size={12} /> Mint
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Pending invites — minted but not yet claimed */}
      {invites.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-2">
            Unclaimed demo links · {invites.length}
          </p>
          <div className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="bg-card border border-line rounded-xl p-4 flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <Building2 size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg truncate">{i.companyName ?? i.email}</p>
                  <p className="text-xs text-muted truncate">{i.email}</p>
                </div>
                <p className="text-[11px] text-subtle inline-flex items-center gap-1 shrink-0">
                  <Clock size={11} /> expires {new Date(i.expiresAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => copyLink(i.token)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 inline-flex items-center gap-1.5 shrink-0"
                >
                  {copied === i.token ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied === i.token ? "Copied" : "Copy link"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active demos */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold">
            Active demos · {active.length}
          </p>
          <button onClick={sweep} disabled={busy} className="text-[11px] text-muted hover:text-fg inline-flex items-center gap-1">
            <Trash2 size={11} /> Run cleanup sweeper
          </button>
        </div>
        {active.length === 0 ? (
          <div className="bg-card border border-line rounded-xl p-8 text-center text-sm text-muted">
            No demos in flight. Mint one above when a prospect is ready.
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((a) => {
              const expiresIn = a.expiresAt ? Math.max(0, Math.floor((new Date(a.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000))) : 0;
              return (
                <div key={a.id} className="bg-card border border-line rounded-xl p-4 flex items-center gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg truncate">{a.companyName ?? a.name ?? a.email}</p>
                    <p className="text-xs text-muted truncate">{a.email}</p>
                    {a.lastLoginAt && (
                      <p className="text-[11px] text-subtle mt-0.5">last sign-in {new Date(a.lastLoginAt).toLocaleString()}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-subtle inline-flex items-center gap-1 shrink-0">
                    <Clock size={11} /> {expiresIn > 0 ? `${expiresIn}d left` : "expired"}
                  </p>
                  <button
                    onClick={() => endDemo(a.id)}
                    disabled={busy}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 size={12} /> End demo
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500";
