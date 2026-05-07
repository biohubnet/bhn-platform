"use client";
/**
 * Superadmin convenience: seed or wipe the test employer + trainee +
 * posting + talent-application submission set without shelling into the
 * server. Lives on the System status page.
 */
import { useEffect, useState } from "react";
import { Beaker, Trash2, RotateCw, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface Status {
  employer: boolean;
  trainee: boolean;
  posting: boolean;
  submission: boolean;
  employerEmail: string;
  traineeEmail: string;
  password: string;
}

export function TestDataPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err" | null>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/admin/test-data", { cache: "no-store" });
      if (r.ok) setStatus(await r.json());
    } catch {}
  }

  useEffect(() => { refresh(); }, []);

  async function run(action: "seed" | "cleanup") {
    setBusy(true);
    setMessage(null);
    setTone(null);
    try {
      const r = await fetch("/api/admin/test-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error ?? "Failed");
        setTone("err");
      } else {
        if (action === "seed") {
          if (j.formFound) {
            setMessage(`Seeded — employer, trainee, posting${j.submissionCreated ? ", and submission" : ""} ready.`);
          } else {
            setMessage("Seeded employer, trainee, and posting. Submission skipped — visit /forms/talent-application once to provision the form, then run again.");
          }
        } else {
          setMessage(`Cleanup complete — ${j.removed ?? 0} related row${j.removed === 1 ? "" : "s"} removed.`);
        }
        setTone("ok");
        if (j.status) setStatus(j.status);
      }
    } catch (err) {
      setMessage((err as Error).message ?? "Failed");
      setTone("err");
    } finally {
      setBusy(false);
    }
  }

  const allPresent = !!status && status.employer && status.trainee && status.posting;
  const nonePresent = !!status && !status.employer && !status.trainee && !status.posting && !status.submission;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Beaker size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-fg leading-snug">
            Stand up a self-contained Employer-HR test scenario: a dummy employer, a trainee, an internship posting, and a talent-application submission tying them together.
          </p>
          <p className="text-xs text-muted mt-1">
            Sign in with either account, or use View-as from the avatar menu, to walk the full HR ↔ trainee loop.
          </p>
        </div>
      </div>

      {/* Status grid */}
      {status ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <StatusPill label="Employer" present={status.employer} />
          <StatusPill label="Trainee" present={status.trainee} />
          <StatusPill label="Posting" present={status.posting} />
          <StatusPill label="Submission" present={status.submission} />
        </div>
      ) : (
        <p className="text-xs text-subtle">Loading status…</p>
      )}

      {/* Credentials reminder */}
      {status && (status.employer || status.trainee) && (
        <div className="bg-elevated/40 border border-line rounded-lg px-3 py-2 text-xs">
          <p className="font-semibold text-fg flex items-center gap-1.5 mb-1">
            <Mail size={12} /> Test credentials
          </p>
          <ul className="text-muted space-y-0.5">
            <li><span className="font-mono">{status.employerEmail}</span> · pwd <span className="font-mono">{status.password}</span></li>
            <li><span className="font-mono">{status.traineeEmail}</span> · pwd <span className="font-mono">{status.password}</span></li>
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run("seed")}
          disabled={busy || allPresent}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
            allPresent
              ? "bg-elevated border-line text-subtle cursor-not-allowed"
              : "bg-brand-600 text-white border-brand-700 hover:bg-brand-700",
          )}
        >
          <Beaker size={13} />
          {allPresent ? "Already seeded" : "Seed test data"}
        </button>
        <button
          onClick={() => run("cleanup")}
          disabled={busy || nonePresent}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors",
            nonePresent
              ? "bg-elevated border-line text-subtle cursor-not-allowed"
              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
          )}
        >
          <Trash2 size={13} />
          {nonePresent ? "Nothing to remove" : "Remove test data"}
        </button>
        <button
          onClick={refresh}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          <RotateCw size={12} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={cn(
            "text-xs px-3 py-2 rounded-lg border flex items-start gap-2",
            tone === "err"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700",
          )}
        >
          {tone === "err" ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ label, present }: { label: string; present: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2",
        present
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-elevated/40 border-line text-subtle",
      )}
    >
      <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      {present ? (
        <CheckCircle2 size={12} />
      ) : (
        <span className="text-[10px]">missing</span>
      )}
    </div>
  );
}
