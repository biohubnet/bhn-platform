"use client";
import { useState } from "react";
import { CheckCircle2, AlertCircle, Sparkles, Copy, ArrowRight, Building2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  token: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  expiresAt: string;
}

interface Credentials {
  email: string;
  password: string;
}

export function DemoClaimForm({ token, email, companyName, expiresAt }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [counts, setCounts] = useState<{ postings: number; applicants: number; interviews: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"email" | "pw" | null>(null);

  function copy(field: "email" | "pw", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {/* ignore */});
  }

  async function claim() {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/auth/claim-demo/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Couldn't start the demo");
        return;
      }
      setCreds(j.credentials);
      setCounts(j.counts);
    } finally { setBusy(false); }
  }

  if (creds && counts) {
    return (
      <div className="bg-card border border-line rounded-2xl p-6 shadow-lg">
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 size={22} />
          </div>
          <h2 className="text-xl font-bold text-fg">Your demo is ready</h2>
          <p className="text-sm text-muted mt-1">
            We provisioned <strong className="text-fg">{counts.postings} postings</strong>, <strong className="text-fg">{counts.applicants} applicants</strong>, and <strong className="text-fg">{counts.interviews} scheduled interviews</strong> for you to click around in.
          </p>
        </div>

        <div className="bg-elevated/50 border border-line rounded-lg p-4 mb-3 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs">Email</span>
            <span className="font-mono text-fg flex-1 truncate text-right">{creds.email}</span>
            <button onClick={() => copy("email", creds.email)} className="text-muted hover:text-brand-700">
              {copied === "email" ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs">Password</span>
            <span className="font-mono text-fg flex-1 truncate text-right">{creds.password}</span>
            <button onClick={() => copy("pw", creds.password)} className="text-muted hover:text-brand-700">
              {copied === "pw" ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-subtle mb-4">
          Save these somewhere — they expire on {new Date(expiresAt).toLocaleDateString()}. The data resets when the trial ends.
        </p>

        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Sign in to the demo <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-2xl p-6 shadow-lg">
      <div className="flex items-center gap-2 text-xs text-muted mb-3">
        <Building2 size={13} />
        <span>For: <strong className="text-fg">{companyName ?? email}</strong></span>
      </div>
      <h2 className="text-xl font-bold text-fg mb-1">Start your demo</h2>
      <p className="text-sm text-muted mb-5">
        Tell us your name and we&apos;ll spin up the workspace. Takes about 5 seconds.
      </p>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-muted mb-1.5">Your name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-card-solid border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          placeholder="Jane Smith"
        />
      </label>

      {err && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3 inline-flex items-center gap-1.5">
          <AlertCircle size={12} /> {err}
        </div>
      )}

      <button
        onClick={claim}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy ? "Spinning up your workspace…" : "Start the demo"}
      </button>
    </div>
  );
}
