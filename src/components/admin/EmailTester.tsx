"use client";

/** Send-a-test-email control for the System status page. Posts to the admin
 *  smoke-test endpoint and surfaces success or the raw transport error. */
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";

export function EmailTester({ defaultTo, configured }: { defaultTo: string; configured: boolean }) {
  const [to, setTo] = useState(defaultTo);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; to?: string; error?: string };
      if (res.ok && j.ok) setResult({ ok: true, msg: `Sent to ${j.to} — check the inbox (and spam folder).` });
      else setResult({ ok: false, msg: j.error ?? "Send failed." });
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {!configured && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          <AlertCircle size={13} /> SMTP not configured — set SMTP_HOST / PORT / USER / PASS / FROM, then redeploy. (You can still send a test to see the exact error.)
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="you@example.com"
          className="min-w-[15rem] flex-1 rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !to.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test
        </button>
      </div>
      {result && (
        <p className={"mt-2 inline-flex items-center gap-1.5 text-xs " + (result.ok ? "text-emerald-700" : "text-rose-700")}>
          {result.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {result.msg}
        </p>
      )}
    </div>
  );
}
