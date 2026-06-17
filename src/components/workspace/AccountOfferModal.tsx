"use client";

/**
 * P4: After 3 edits on a shared script, anonymous collaborators see a
 * dismissible offer to create a BHN account. Re-offered every 3 more edits
 * unless dismissed for this session (sessionStorage) or already converted.
 *
 * Props:
 *   scriptId    — used to identify the collaborator server-side.
 *   scriptUrl   — full public URL of the current page (emailed on success).
 *   onDismiss   — called when user closes without converting.
 *   onConverted — called on success (collab now has a real account).
 */
import { useState } from "react";
import { X, UserPlus, Check } from "lucide-react";

interface Props {
  scriptId: string;
  scriptUrl: string;
  onDismiss: () => void;
  onConverted: () => void;
}

export function AccountOfferModal({ scriptId, scriptUrl, onDismiss, onConverted }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/scripts/collaborator/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, scriptId, scriptUrl }),
    }).catch(() => null);

    setBusy(false);
    if (!res) { setError("Network error — please try again."); return; }
    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) { setError(data.error ?? "Something went wrong."); return; }
    setDone(true);
    setTimeout(() => onConverted(), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-card-solid p-6 shadow-elevated">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-elevated hover:text-fg"
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={22} />
            </span>
            <p className="font-bold text-fg">Account created!</p>
            <p className="text-sm text-muted">Check your inbox — we sent a link back to this script.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <UserPlus size={16} />
              </span>
              <div>
                <p className="font-bold text-fg">Save your work to an account</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  Create a free BHN account to keep editing from anywhere — we'll email you a link back to this script.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subtle">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-elevated/40 px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-subtle">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-line bg-elevated/40 px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="8+ characters"
                />
              </div>

              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">{error}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? "Creating…" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-fg"
                >
                  Later
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
