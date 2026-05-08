"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Sparkles, Building2, Loader2, ArrowRight, CheckCircle2,
} from "lucide-react";

interface Props {
  token: string;
  email: string;
  companyName: string | null;
  companyWebsite: string | null;
  expiresAt: string;
}

type Stage = "idle" | "spawning" | "signing-in" | "redirecting" | "error";

export function DemoClaimForm({ token, email, companyName }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [err, setErr] = useState<string | null>(null);

  async function claimAndSignIn() {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    setErr(null);
    setStage("spawning");
    try {
      // 1. Spawn the populated demo workspace
      const r = await fetch(`/api/auth/claim-demo/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Couldn't start the demo");
        setStage("error");
        return;
      }

      // 2. Auto sign-in with the just-minted credentials
      setStage("signing-in");
      const result = await signIn("credentials", {
        email: j.credentials.email,
        password: j.credentials.password,
        redirect: false,
        remember: "false",
      });
      if (!result?.ok) {
        setErr(result?.error ?? "Sign-in failed — try opening the login page directly.");
        setStage("error");
        return;
      }

      // 3. Drop them straight into the populated employer dashboard
      setStage("redirecting");
      router.push("/employer");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message ?? "Something went wrong");
      setStage("error");
    }
  }

  // Active progress card while we're spinning up + signing in
  if (stage === "spawning" || stage === "signing-in" || stage === "redirecting") {
    const lines: { label: string; done: boolean }[] = [
      { label: "Provisioning your workspace",  done: stage !== "spawning" },
      { label: "Signing you in",                done: stage === "redirecting" },
      { label: "Loading your dashboard",        done: false },
    ];
    return (
      <div className="bg-card border border-line rounded-2xl p-6 shadow-lg text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-fg">Spinning up your demo…</h2>
        <p className="text-sm text-muted mt-1">This takes about 5 seconds — sit tight.</p>
        <ul className="mt-5 text-left text-sm text-fg space-y-2 max-w-xs mx-auto">
          {lines.map((l, i) => (
            <li key={i} className="flex items-center gap-2.5">
              {l.done ? (
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              ) : (
                <Loader2 size={14} className="text-brand-600 animate-spin shrink-0" />
              )}
              <span className={l.done ? "text-muted line-through" : "text-fg"}>{l.label}</span>
            </li>
          ))}
        </ul>
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
        Tell us your name and we&apos;ll spin up the workspace and sign you straight in. Takes about 5 seconds.
      </p>

      <label className="block mb-4">
        <span className="block text-xs font-medium text-muted mb-1.5">Your name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") claimAndSignIn(); }}
          required
          autoFocus
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
        onClick={claimAndSignIn}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white hover:bg-brand-700 font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        <Sparkles size={14} /> Start the demo <ArrowRight size={14} />
      </button>

      <p className="text-[11px] text-subtle mt-3 text-center">
        We&apos;ll create a temporary workspace just for you. No email confirmation needed.
      </p>
    </div>
  );
}
