"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Package, X } from "lucide-react";

interface Props {
  rewardId: string;
  tierTitle: string;
  items: string[];
  /** Pre-fill from the user's profile so the form isn't a cold blank slate. */
  defaults: {
    recipientName: string;
    country: string;
    phone: string;
  };
}

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

/**
 * The trigger button + the modal that captures shipping details.
 *
 * Modal pattern is consistent with the rest of the app (popover-style
 * inert background on `<dialog>`-equivalent positioning, ring + shadow
 * on the inner card). We don't use the native <dialog> element because
 * its backdrop pseudo can't pick up theme variables — so a fixed
 * overlay div + the popover utility class.
 */
export function MerchClaimDialog({ rewardId, tierTitle, items, defaults }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc to close + focus trap to the modal heading on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus the first interactive element in the modal so keyboard users
    // land where they expect.
    const t = setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const body = Object.fromEntries(data.entries());
    try {
      const res = await fetch(`/api/rewards/merch/${rewardId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not submit claim. Please try again.");
      }
      setOpen(false);
      // Hard-refresh so the page rerenders the card in CLAIMED state.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <Gift size={14} />
        Claim my {tierTitle.toLowerCase()}
      </button>

      {open && (
        <div
          aria-hidden={!open}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop */}
          <div
            onClick={() => !busy && setOpen(false)}
            className="absolute inset-0 bg-backdrop animate-fade-in"
          />

          {/* Card */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`claim-title-${rewardId}`}
            className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto popover p-5 sm:p-6 animate-slide-up-in"
          >
            <button
              type="button"
              onClick={() => !busy && setOpen(false)}
              disabled={busy}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-fg disabled:opacity-40"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              Claim your bundle
            </p>
            <h2 id={`claim-title-${rewardId}`} className="text-xl font-bold text-fg mt-1 tracking-tight">
              {tierTitle}
            </h2>

            {/* Bundle preview — so they can size correctly. */}
            <ul className="mt-3 space-y-1 mb-5">
              {items.map((item) => (
                <li key={item} className="text-xs text-muted flex items-start gap-2">
                  <Package size={11} className="text-subtle shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={submit} className="space-y-3">
              <Field
                label="Recipient name"
                name="recipientName"
                defaultValue={defaults.recipientName}
                required
                autoComplete="name"
                placeholder="Full name on the package"
              />
              <Field
                label="Address line 1"
                name="addressLine1"
                required
                autoComplete="address-line1"
              />
              <Field
                label="Address line 2"
                name="addressLine2"
                autoComplete="address-line2"
                placeholder="Apt, suite, building (optional)"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" name="city" required autoComplete="address-level2" />
                <Field label="State / Province" name="region" required autoComplete="address-level1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postal code" name="postalCode" required autoComplete="postal-code" />
                <Field
                  label="Country"
                  name="country"
                  defaultValue={defaults.country}
                  required
                  autoComplete="country-name"
                />
              </div>
              <Field
                label="Phone (for courier only)"
                name="phone"
                defaultValue={defaults.phone}
                autoComplete="tel"
                type="tel"
              />

              <div>
                <label htmlFor={`shirtSize-${rewardId}`} className="block text-xs font-semibold text-fg mb-1">
                  Apparel size
                </label>
                <select
                  id={`shirtSize-${rewardId}`}
                  name="shirtSize"
                  required
                  defaultValue=""
                  className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/60"
                >
                  <option value="" disabled>Pick a size</option>
                  {SHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`notes-${rewardId}`} className="block text-xs font-semibold text-fg mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id={`notes-${rewardId}`}
                  name="notes"
                  rows={2}
                  maxLength={400}
                  placeholder="Anything our packing team should know — gate code, fitted vs relaxed cut, hold for vacation, etc."
                  className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-elevated hover:text-fg disabled:opacity-40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2"
                >
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? "Submitting…" : "Submit claim"}
                </button>
              </div>

              <p className="text-[11px] text-subtle leading-snug pt-1">
                Once submitted, your address is locked for this claim. Need to
                change it later? Email <span className="font-semibold">support@biohubnet.com</span>{" "}
                with your name + tier.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  name: string;
  label: string;
}

function Field({ label, name, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={`${name}-input`} className="block text-xs font-semibold text-fg mb-1">
        {label}
        {rest.required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      <input
        id={`${name}-input`}
        name={name}
        {...rest}
        className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/60"
      />
    </div>
  );
}
