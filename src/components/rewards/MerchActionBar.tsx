"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, CheckCircle2, XCircle, MapPin } from "lucide-react";

/**
 * Admin-side action bar on each MerchReward row.
 *
 * State machine, branched by fulfillmentMethod:
 *
 *   PICKUP:
 *     CLAIMED  → "Mark ready for pickup" (no fields needed)
 *     SHIPPED  → "Mark picked up"        (terminal happy state)
 *
 *   SHIP_REQUEST:
 *     CLAIMED  → ShipForm: carrier + tracking number + URL
 *     SHIPPED  → "Mark delivered"
 *
 * Both methods can be Cancelled from CLAIMED or SHIPPED.
 */
export function MerchActionBar({
  id,
  state,
  method,
}: {
  id: string;
  state: "CLAIMED" | "SHIPPED";
  method: "PICKUP" | "SHIP_REQUEST";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/merch/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not update reward.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (showCancel) {
    return (
      <CancelForm
        busy={busy}
        onCancel={() => setShowCancel(false)}
        onSubmit={(reason) => action({ action: "cancel", cancelledReason: reason })}
      />
    );
  }

  return (
    <div className="space-y-2">
      {state === "CLAIMED" && method === "PICKUP" && (
        <button
          type="button"
          onClick={() => action({ action: "ship" })}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
          Mark ready for pickup
        </button>
      )}

      {state === "CLAIMED" && method === "SHIP_REQUEST" && (
        <ShipForm busy={busy} onSubmit={(payload) => action({ action: "ship", ...payload })} />
      )}

      {state === "SHIPPED" && (
        <button
          type="button"
          onClick={() => action({ action: "deliver" })}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {method === "PICKUP" ? "Mark picked up" : "Mark delivered"}
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowCancel(true)}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-40 transition-colors"
      >
        <XCircle size={11} />
        Cancel reward
      </button>

      {error && (
        <p className="text-[11px] text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-2 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

function ShipForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (p: { carrier: string; trackingNumber: string; trackingUrl: string }) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSubmit({
          carrier: String(f.get("carrier") ?? ""),
          trackingNumber: String(f.get("trackingNumber") ?? ""),
          trackingUrl: String(f.get("trackingUrl") ?? ""),
        });
      }}
      className="space-y-1.5"
    >
      <input
        name="carrier"
        list="carriers"
        required
        placeholder="Carrier (Canada Post, UPS, FedEx)"
        className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-line text-xs"
      />
      <datalist id="carriers">
        <option value="Canada Post" />
        <option value="UPS" />
        <option value="FedEx" />
        <option value="DHL" />
        <option value="USPS" />
        <option value="Purolator" />
      </datalist>
      <input
        name="trackingNumber"
        required
        placeholder="Tracking number"
        className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-line text-xs font-mono"
      />
      <input
        name="trackingUrl"
        type="url"
        placeholder="Tracking URL (optional)"
        className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-line text-xs"
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
        Mark shipped
      </button>
    </form>
  );
}

function CancelForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = String(f.get("reason") ?? "").trim();
        if (r) onSubmit(r);
      }}
      className="space-y-1.5"
    >
      <p className="text-[11px] font-semibold text-rose-800">Cancel this reward</p>
      <textarea
        name="reason"
        required
        rows={2}
        maxLength={400}
        placeholder="Why? (e.g. trainee no-show after 60 days, postage out of budget, ineligible)"
        className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-rose-200 text-xs resize-none"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs text-muted hover:bg-elevated"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
          Confirm cancel
        </button>
      </div>
    </form>
  );
}
