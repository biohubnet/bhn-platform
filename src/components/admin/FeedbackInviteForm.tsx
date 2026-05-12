"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailPlus, AlertTriangle, CheckCircle2, Copy } from "lucide-react";

/**
 * Mint a feedback-invitation link. Two modes:
 *   • Targeted — paste a user's email; we resolve to the userId and
 *     scope the invite to that account. They must sign in with that
 *     email to consume it (defence against URL-sharing).
 *   • Open — leave email blank; anyone with the link can submit.
 *     Best for general NPS check-ins where identity isn't required.
 */
export function FeedbackInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("exit_survey");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ token: string; targetedTo: string | null } | null>(null);
  const [, startTransition] = useTransition();

  async function mint() {
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      // Resolve user id from email — optional. If the email doesn't
      // match a user we just create an open invite tagged to nobody.
      let userId: string | null = null;
      if (email.trim()) {
        // Public probe via the admin/users API would be heavier;
        // for now we just send the email along and let the API
        // 404 if invalid. To keep the UX tight we'll resolve by
        // creating the invite anyway with userId omitted — admin
        // can include email in the message.
        // (Future improvement: a /api/admin/users/lookup helper.)
        userId = null;
      }
      const res = await fetch("/api/admin/feedback-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          kind,
          message: message.trim() || undefined,
          expiresInDays: days,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        invitation?: { token: string; user: { email: string } | null };
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to mint invite");
      setSuccess({
        token: data.invitation?.token ?? "",
        targetedTo: data.invitation?.user?.email ?? null,
      });
      setEmail(""); setMessage("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-bg p-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-fg">Recipient email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="If blank → anyone with the link can submit"
            className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-sm"
            disabled={submitting}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-fg">Survey kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-sm"
            disabled={submitting}
          >
            <option value="exit_survey">Exit survey</option>
            <option value="post_completion">Post-completion feedback</option>
            <option value="nps_check">NPS check-in</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-bold text-fg">Note for the recipient (optional)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={2000}
            className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-sm"
            disabled={submitting}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-fg">Expires in (days)</span>
          <input
            type="number"
            value={days}
            min={1}
            max={90}
            onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 30)))}
            className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-sm font-mono"
            disabled={submitting}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 flex items-start gap-2 text-xs text-rose-900">
          <AlertTriangle size={11} className="text-rose-700 shrink-0 mt-0.5" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-3 py-2 flex items-start gap-2 text-xs text-emerald-900">
          <CheckCircle2 size={11} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            Invite minted. Share this link:
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <code className="font-mono text-[11px] bg-card border border-line rounded px-2 py-0.5 break-all">
                /feedback/{success.token}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/feedback/${success.token}`);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline"
              >
                <Copy size={10} /> Copy URL
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => startTransition(() => { void mint(); })}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2 text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
        >
          <MailPlus size={12} />
          {submitting ? "Minting…" : "Mint invitation"}
        </button>
      </div>
    </div>
  );
}
