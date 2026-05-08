"use client";
import { useState } from "react";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import Link from "next/link";

export function AccessRequestForm({ kind }: { kind: "employer" | "trainee" }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", website: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"sent" | "exists" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...form }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Couldn't send request"); return;
      }
      setDone(j.alreadyUser ? "exists" : "sent");
    } finally { setBusy(false); }
  }

  if (done === "sent") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={32} />
        <h3 className="font-semibold text-emerald-900 text-lg">Request sent</h3>
        <p className="text-sm text-emerald-800 mt-1.5 max-w-md mx-auto">
          Thanks — we&apos;ll review and reach out within one business day with your invite link.
        </p>
      </div>
    );
  }
  if (done === "exists") {
    return (
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto text-brand-600 mb-3" size={32} />
        <h3 className="font-semibold text-brand-900 text-lg">You already have an account</h3>
        <p className="text-sm text-brand-800 mt-1.5">Sign in to access your portal.</p>
        <Link href="/login" className="inline-flex mt-4 items-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm px-5 py-2.5 rounded-lg">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-card border border-line rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Your name *">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={inputCls}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Work email *">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className={inputCls}
            placeholder="jane@company.com"
          />
        </Field>
        {kind === "employer" && (
          <>
            <Field label="Company">
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className={inputCls}
                placeholder="Acme Biotherapeutics"
              />
            </Field>
            <Field label="Website">
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className={inputCls}
                placeholder="https://acme-bio.com"
              />
            </Field>
          </>
        )}
      </div>
      <Field label={kind === "employer" ? "What roles are you hiring for?" : "Tell us a bit about yourself"}>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
          className={inputCls + " resize-y"}
          placeholder={kind === "employer"
            ? "Bioprocess intern, QC analyst, regulatory affairs co-op…"
            : "Current role / studies, what kind of placement you're looking for…"}
        />
      </Field>
      {err && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
          <AlertCircle size={12} /> {err}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        <Send size={14} />
        {busy ? "Sending…" : "Request access"}
      </button>
      <p className="text-[11px] text-subtle text-center">
        We&apos;ll only use your details to send the invite. See our <Link href="/privacy" className="underline hover:text-fg">privacy notice</Link>.
      </p>
    </form>
  );
}

const inputCls = "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
