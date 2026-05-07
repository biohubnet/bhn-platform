"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export function ClaimEmployerForm({
  token, email, companyName,
}: {
  token: string;
  email: string;
  companyName: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || password.length < 8) {
      setError("Enter your name and a password at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/claim-invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Couldn't create the account.");
        return;
      }
      // Auto sign-in via NextAuth credentials provider, then redirect
      // straight into the portal.
      const signInRes = await signIn("credentials", {
        email,
        password,
        remember: "true",
        redirect: false,
      });
      if (signInRes?.error) {
        // Account exists but sign-in failed for some reason — bounce to login.
        router.push("/login");
        return;
      }
      router.push("/employer");
    } finally {
      setBusy(false);
    }
  }

  const cls =
    "w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
        <input value={email} disabled className={`${cls} opacity-60`} />
      </div>
      {companyName && (
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Company</label>
          <input value={companyName} disabled className={`${cls} opacity-60`} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          className={cls}
          placeholder="Sam Eldridge"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">Choose a password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          className={cls}
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-md shadow-brand-600/25 text-sm flex items-center justify-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        {busy ? "Setting up…" : "Create my employer account"}
      </button>
    </form>
  );
}
