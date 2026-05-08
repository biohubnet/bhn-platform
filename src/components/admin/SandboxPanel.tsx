"use client";
/**
 * Per-admin sandbox management.
 *
 *   - Each admin spawns ONE pair: a sandbox employer + a sandbox trainee
 *     (deterministic emails, idempotent on re-spawn).
 *   - Lists the current admin's pair plus *other* admins' sandboxes so
 *     they can see who's testing what.
 *   - Reset wipes the pair and re-seeds; Delete removes them entirely.
 *   - Per-account "Copy credentials" + "Sign in (incognito)" hint —
 *     opening a new window with the sandbox account is the simplest path
 *     to a parallel session.
 */
import { useEffect, useState } from "react";
import {
  Beaker, RotateCw, Trash2, Plus, Copy, CheckCircle2, AlertCircle,
  User, Building2, ExternalLink, Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SandboxAcct {
  id: string;
  email: string;
  name: string | null;
  role: string;
  lastLoginAt: string | null;
  createdByAdminId: string | null;
  createdByAdmin: { id: string; name: string | null; email: string } | null;
}

interface SeedResult {
  ownerAdminId: string;
  employer: { id: string; email: string };
  trainee:  { id: string; email: string };
  posting:  { id: string };
  submissionCreated: boolean;
  password: string;
}

interface Props {
  meId: string;
}

export function SandboxPanel({ meId }: Props) {
  const [buckets, setBuckets] = useState<SandboxAcct[][]>([]);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<SeedResult | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/sandboxes", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        setBuckets(j.buckets ?? []);
      }
    } catch {/* ignore */}
  }
  useEffect(() => { load(); }, []);

  async function call(method: "POST" | "PATCH" | "DELETE") {
    setBusy(true); setMessage(null);
    try {
      const r = await fetch("/api/admin/sandboxes", { method });
      const j = await r.json();
      if (!r.ok) {
        setMessage({ tone: "err", text: j.error ?? "Failed" });
        return;
      }
      if (method === "POST") setMessage({ tone: "ok", text: "Sandbox spawned. Credentials below." });
      if (method === "PATCH") setMessage({ tone: "ok", text: "Sandbox reset — fresh data ready." });
      if (method === "DELETE") {
        setMessage({ tone: "ok", text: `Sandbox removed (${j.removed} accounts).` });
        setCredentials(null);
      }
      if (j.sandbox) setCredentials(j.sandbox);
      await load();
    } finally { setBusy(false); }
  }

  // Find the admin's own sandbox bucket
  const myBucket = buckets.find((b) => b[0]?.createdByAdminId === meId);
  const otherBuckets = buckets.filter((b) => b[0]?.createdByAdminId !== meId && b[0]?.createdByAdminId);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Beaker size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-fg leading-snug">
            Each admin gets their own pair of sandbox accounts — one Employer HR + one Trainee — so multiple admins can test in parallel without stomping on each other. Spawn yours below; re-spawning is safe.
          </p>
        </div>
      </div>

      {/* My sandbox */}
      <section className="bg-elevated/30 border border-line rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"><Beaker size={13} /></span>
            <p className="font-semibold text-fg">Your sandbox</p>
          </div>
          <div className="flex items-center gap-1.5">
            {!myBucket ? (
              <button
                onClick={() => call("POST")}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <Plus size={12} /> Spawn my sandbox
              </button>
            ) : (
              <>
                <button
                  onClick={() => call("PATCH")}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1.5"
                >
                  <RotateCw size={12} className={busy ? "animate-spin" : ""} /> Reset
                </button>
                <button
                  onClick={() => { if (confirm("Delete your sandbox? You can spawn another anytime.")) call("DELETE"); }}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 inline-flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {!myBucket && (
          <p className="text-xs text-muted">
            You don&apos;t have a sandbox yet. Spawning takes a second; it creates an Employer HR + Trainee pair, a starter posting, and a talent-application submission tying them together.
          </p>
        )}

        {myBucket && (
          <div className="space-y-2">
            {myBucket.map((acct) => (
              <SandboxAccount key={acct.id} acct={acct} password={credentials?.password ?? null} />
            ))}
          </div>
        )}
      </section>

      {message && (
        <div className={cn(
          "text-xs px-3 py-2 rounded-lg border flex items-start gap-2",
          message.tone === "ok"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-rose-50 border-rose-200 text-rose-700",
        )}>
          {message.tone === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Other admins' sandboxes */}
      {otherBuckets.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.22em] text-subtle font-semibold mb-2 inline-flex items-center gap-1.5">
            <Users2 size={10} /> Other admins&apos; sandboxes
          </p>
          <div className="space-y-2">
            {otherBuckets.map((bucket, i) => (
              <details key={i} className="border border-line rounded-lg overflow-hidden">
                <summary className="cursor-pointer px-3 py-2 hover:bg-elevated/50 flex items-center gap-2 text-sm">
                  <User size={13} className="text-subtle" />
                  <span className="text-fg font-medium">{bucket[0].createdByAdmin?.name ?? bucket[0].createdByAdmin?.email}</span>
                  <span className="text-xs text-muted">· {bucket.length} account{bucket.length === 1 ? "" : "s"}</span>
                </summary>
                <div className="p-3 space-y-1.5 bg-elevated/20">
                  {bucket.map((a) => (
                    <p key={a.id} className="text-xs text-muted flex items-center gap-2">
                      {a.role === "employer" ? <Building2 size={11} /> : <User size={11} />}
                      <span className="font-mono text-fg">{a.email}</span>
                      <span className="text-subtle">{a.role}</span>
                      {a.lastLoginAt && <span className="text-subtle ml-auto text-[10px]">· last sign-in {new Date(a.lastLoginAt).toLocaleDateString()}</span>}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="bg-card-solid border border-line rounded-lg p-3 text-xs text-muted">
        <p className="font-semibold text-fg mb-1">Tip — fastest way to test</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>Spawn your sandbox above.</li>
          <li>Open an incognito / private window.</li>
          <li>Sign in with the sandbox employer or trainee email + password (shown after spawning).</li>
          <li>Click around — you&apos;re fully isolated from other admins.</li>
        </ol>
      </div>
    </div>
  );
}

function SandboxAccount({ acct, password }: { acct: SandboxAcct; password: string | null }) {
  const [copied, setCopied] = useState<"email" | "pw" | null>(null);

  function copy(field: "email" | "pw", value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {/* ignore */});
  }

  return (
    <div className="bg-card-solid border border-line rounded-lg px-3 py-2.5 flex items-center gap-3">
      <div className={cn(
        "w-9 h-9 rounded-md flex items-center justify-center shrink-0",
        acct.role === "employer" ? "bg-brand-50 text-brand-600" : "bg-emerald-50 text-emerald-600",
      )}>
        {acct.role === "employer" ? <Building2 size={14} /> : <User size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fg text-sm leading-tight">
          {acct.role === "employer" ? "Sandbox Employer HR" : "Sandbox Trainee"}
        </p>
        <p className="text-xs text-muted font-mono truncate">{acct.email}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => copy("email", acct.email)}
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted hover:bg-elevated hover:text-fg"
          title="Copy email"
        >
          {copied === "email" ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Copy size={11} />}
          email
        </button>
        {password && (
          <button
            onClick={() => copy("pw", password)}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted hover:bg-elevated hover:text-fg"
            title="Copy password"
          >
            {copied === "pw" ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Copy size={11} />}
            password
          </button>
        )}
        <a
          href="/login"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 font-medium"
          title="Open sign-in in a new tab — paste the credentials"
        >
          <ExternalLink size={11} /> open login
        </a>
      </div>
    </div>
  );
}
