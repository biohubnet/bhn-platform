"use client";

/**
 * First-visit gate on a shared script link: ask the visitor's name (no
 * account), then refresh into the collaborative editor. The join API sets an
 * httpOnly per-script cookie so they're recognised on return.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, PenLine } from "lucide-react";

export function JoinScriptForm({ token, scriptTitle }: { token: string; scriptTitle: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    const n = name.trim();
    if (n.length < 2) { setError("Please enter your name."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scripts/shared/${token}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Couldn't join — try again.");
        return;
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-2xl border border-line bg-card-solid p-6 shadow-elevated">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <PenLine size={17} />
      </span>
      <h1 className="mt-3 text-lg font-bold text-fg">You&apos;ve been invited to edit</h1>
      <p className="mt-1 text-sm text-muted">
        <span className="font-semibold text-fg">{scriptTitle}</span> — a collaborative video script.
        No account needed; just tell us who you are so your edits carry your name.
      </p>
      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-subtle">Your name</span>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="e.g. Molly Shoichet"
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-line bg-card-solid px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </label>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <button
        type="button"
        onClick={join}
        disabled={busy || name.trim().length < 2}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <>Open the script <ArrowRight size={15} /></>}
      </button>
    </div>
  );
}
