"use client";
/**
 * Client island for /profile/security. Renders three blocks:
 *
 *   1. Account status — email verified Y/N + last password change.
 *   2. MFA toggle — enable flow (POST setup → render QR → verify
 *      6-digit code) or disable flow (re-enter password).
 *   3. (placeholder for future controls — sessions, passkeys, etc.)
 *
 * The MFA secret arrives base32 encoded in the response and is
 * shown alongside the QR for users whose authenticator can't scan.
 * We never log the secret to the console.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck, ShieldOff, Check, AlertCircle, Mail, KeyRound, Loader2,
} from "lucide-react";

interface Props {
  email: string;
  mfaEnabledAt: string | null;
  passwordUpdatedAt: string | null;
  emailVerifiedAt: string | null;
}

export function SecuritySettingsClient({
  email, mfaEnabledAt, passwordUpdatedAt, emailVerifiedAt,
}: Props) {
  const router = useRouter();
  const [enabledAt, setEnabledAt] = useState<string | null>(mfaEnabledAt);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-fg inline-flex items-center gap-2">
          <KeyRound size={14} /> Account
        </h2>
        <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
          <Pair label="Email" value={email} />
          <Pair
            label="Email verified"
            icon={emailVerifiedAt ? <Check size={11} className="text-emerald-600" /> : <AlertCircle size={11} className="text-amber-600" />}
            value={emailVerifiedAt ? new Date(emailVerifiedAt).toLocaleDateString() : "Not yet — check your inbox"}
          />
          <Pair
            label="Password last changed"
            value={passwordUpdatedAt ? new Date(passwordUpdatedAt).toLocaleDateString() : "Unknown"}
          />
          <Pair
            label="MFA"
            icon={enabledAt
              ? <ShieldCheck size={11} className="text-emerald-600" />
              : <ShieldOff size={11} className="text-amber-600" />}
            value={enabledAt ? `Enabled ${new Date(enabledAt).toLocaleDateString()}` : "Off"}
          />
        </dl>
      </Card>

      {enabledAt
        ? <DisableMfa onDisabled={() => { setEnabledAt(null); router.refresh(); }} />
        : <EnableMfa onEnabled={(at) => { setEnabledAt(at); router.refresh(); }} />}
    </div>
  );
}

function Pair({
  label, value, icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="text-sm text-fg mt-0.5 inline-flex items-center gap-1.5">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function EnableMfa({ onEnabled }: { onEnabled: (at: string) => void }) {
  type Stage = "intro" | "scan" | "verify";
  const [stage, setStage] = useState<Stage>("intro");
  const [secret, setSecret] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Setup failed.");
      setSecret(j.secret);
      setQrSvg(j.qrSvg);
      setStage("scan");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Code didn't match.");
      onEnabled(j.enabledAt);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-fg inline-flex items-center gap-2">
        <ShieldCheck size={14} /> Add multi-factor authentication
      </h2>
      <p className="text-xs text-muted mt-1.5">
        Use Google Authenticator, 1Password, Authy, or any RFC 6238 authenticator app.
        Each sign-in will require a 6-digit code from your app in addition to your password.
      </p>

      {stage === "intro" && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={start} loading={busy} variant="primary">
            Start enrolment
          </Button>
          {err && <span className="text-xs text-rose-600">{err}</span>}
        </div>
      )}

      {stage === "scan" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            <strong>1.</strong> Scan this QR with your authenticator app, or paste the secret manually.
          </p>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-card-solid border border-line">
            <div className="shrink-0 w-[200px] h-[200px]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-subtle">Manual key</p>
              <code className="block mt-1 text-xs font-mono break-all bg-elevated px-2 py-1.5 rounded select-all">
                {secret}
              </code>
            </div>
          </div>
          <Button onClick={() => setStage("verify")} variant="primary">
            I&apos;ve added it — continue
          </Button>
        </div>
      )}

      {stage === "verify" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            <strong>2.</strong> Enter the 6-digit code your authenticator is showing right now.
          </p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123 456"
            className="w-32 text-center text-lg font-mono tracking-[0.3em] bg-card-solid border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <div className="flex items-center gap-3">
            <Button onClick={verify} loading={busy} variant="primary" disabled={code.replace(/\D/g, "").length !== 6}>
              Confirm
            </Button>
            <button type="button" onClick={() => setStage("scan")} className="text-xs text-muted hover:text-fg">
              Back
            </button>
            {err && <span className="text-xs text-rose-600">{err}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}

function DisableMfa({ onDisabled }: { onDisabled: () => void }) {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function disable() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Couldn't disable MFA.");
      onDisabled();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-fg inline-flex items-center gap-2">
        <ShieldOff size={14} /> Multi-factor authentication is on
      </h2>
      <p className="text-xs text-muted mt-1.5">
        Re-enter your password to turn it off. We&apos;ll generate a fresh secret if you re-enable later.
      </p>
      {!show ? (
        <Button onClick={() => setShow(true)} variant="ghost" className="mt-3">
          Disable MFA
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <div className="flex items-center gap-3">
            <Button onClick={disable} loading={busy} variant="primary" disabled={!password}>
              Confirm disable
            </Button>
            <button type="button" onClick={() => setShow(false)} className="text-xs text-muted hover:text-fg">
              Cancel
            </button>
            {err && <span className="text-xs text-rose-600">{err}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
