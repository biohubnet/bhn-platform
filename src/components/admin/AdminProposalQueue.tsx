"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, Eye, Hammer, Truck, Gift, XCircle, AlertCircle, ChevronDown,
} from "lucide-react";
import {
  PROPOSAL_STATUS_META,
  PROPOSAL_LIMITS,
  type ThemeProposalStatus,
} from "@/lib/themes/constants";
import { cn } from "@/lib/utils";

interface ProposalRow {
  id: string;
  title: string;
  description: string;
  inspiration: string | null;
  status: ThemeProposalStatus;
  reviewerNote: string | null;
  reviewedAt: string | null;
  shippedThemeId: string | null;
  bountyIssued: boolean;
  bountyRewardId: string | null;
  createdAt: string;
  proposer: { id: string; name: string | null; email: string };
  reviewer: { id: string; name: string | null; email: string } | null;
}

type ActionKind = "review" | "build" | "ship" | "ship_with_bounty" | "decline";

/**
 * Admin queue with inline action forms per proposal.
 *
 * UX
 *   • One-click actions (review, build) fire immediately.
 *   • Forms (ship, ship_with_bounty, decline) expand inline beneath
 *     the proposal so the admin can fill required fields without
 *     navigating away.
 *   • Action set depends on the current status. Terminal states
 *     (shipped, declined) show only metadata, no buttons.
 *   • router.refresh() after every successful action so the queue
 *     reflects the new state without a full reload.
 */
export function AdminProposalQueue({ proposals }: { proposals: ProposalRow[] }) {
  return (
    <ul className="space-y-3">
      {proposals.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}
    </ul>
  );
}

function ProposalCard({ proposal }: { proposal: ProposalRow }) {
  const router = useRouter();
  const meta = PROPOSAL_STATUS_META[proposal.status];

  // Inline form state — when the admin clicks an action button that
  // needs more info, that form expands. null = no form open.
  const [openForm, setOpenForm] = useState<"ship" | "ship_with_bounty" | "decline" | null>(null);

  const [shippedThemeId, setShippedThemeId] = useState(proposal.shippedThemeId ?? "");
  const [note, setNote] = useState(proposal.reviewerNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fire(action: ActionKind, body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/theme-proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Action failed");
      }
      setOpenForm(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isTerminal = proposal.status === "shipped" || proposal.status === "declined";

  return (
    <li
      className="rounded-2xl border border-line bg-card p-5 surface-shadow"
      style={{ borderLeft: `4px solid ${ragColor(meta.rag)}` }}
    >
      {/* Header — proposer + status */}
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h3 className="text-base font-bold text-fg tracking-tight">{proposal.title}</h3>
        <StatusChip rag={meta.rag} label={meta.label} />
        <span className="text-xs text-subtle">
          by <span className="font-semibold text-fg">{proposal.proposer.name ?? proposal.proposer.email}</span>
          {" · "}
          <span className="font-mono text-[11px]">{proposal.proposer.email}</span>
        </span>
        <span className="text-[11px] text-subtle">
          submitted {new Date(proposal.createdAt).toLocaleDateString()}
        </span>
      </header>

      {/* Body */}
      <p className="text-sm text-fg leading-snug whitespace-pre-line mb-2">{proposal.description}</p>
      {proposal.inspiration && (
        <p className="text-xs text-muted leading-snug mb-2">
          <span className="font-semibold text-fg">Inspiration:</span> {proposal.inspiration}
        </p>
      )}

      {/* Reviewer note + ship metadata */}
      {(proposal.reviewerNote || proposal.shippedThemeId || proposal.bountyIssued) && (
        <div className="mt-2 rounded-lg bg-elevated border border-line p-3 text-xs space-y-1.5">
          {proposal.reviewerNote && (
            <div>
              <p className="font-semibold text-fg">Reviewer note</p>
              <p className="text-muted leading-snug whitespace-pre-line mt-0.5">{proposal.reviewerNote}</p>
            </div>
          )}
          {proposal.shippedThemeId && (
            <p className="text-emerald-700 font-semibold inline-flex items-center gap-1">
              <CheckCircle2 size={11} />
              Shipped as theme &quot;{proposal.shippedThemeId}&quot;
            </p>
          )}
          {proposal.bountyIssued && (
            <p className="text-violet-700 font-semibold inline-flex items-center gap-1">
              <Gift size={11} />
              Tier-3 MerchReward bounty issued
              {proposal.bountyRewardId && (
                <span className="text-subtle font-mono ml-1">({proposal.bountyRewardId.slice(0, 8)}…)</span>
              )}
            </p>
          )}
          {proposal.reviewer && proposal.reviewedAt && (
            <p className="text-subtle">
              Reviewed by {proposal.reviewer.name ?? proposal.reviewer.email} on {new Date(proposal.reviewedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="mt-3 flex flex-wrap gap-2">
          {proposal.status === "submitted" && (
            <ActionBtn icon={Eye} label="Mark in review" onClick={() => fire("review")} busy={busy} />
          )}
          {(proposal.status === "submitted" || proposal.status === "under_review") && (
            <ActionBtn icon={Hammer} label="Will build" onClick={() => fire("build")} busy={busy} />
          )}
          <ActionBtn
            icon={Truck}
            label="Ship"
            tone="brand"
            onClick={() => { setOpenForm(openForm === "ship" ? null : "ship"); setError(null); }}
            active={openForm === "ship"}
            busy={busy}
          />
          <ActionBtn
            icon={Gift}
            label="Ship + issue bounty"
            tone="violet"
            onClick={() => { setOpenForm(openForm === "ship_with_bounty" ? null : "ship_with_bounty"); setError(null); }}
            active={openForm === "ship_with_bounty"}
            busy={busy}
          />
          <ActionBtn
            icon={XCircle}
            label="Decline"
            tone="rose"
            onClick={() => { setOpenForm(openForm === "decline" ? null : "decline"); setError(null); }}
            active={openForm === "decline"}
            busy={busy}
          />
        </div>
      )}

      {/* Inline form for actions requiring input */}
      {openForm === "ship" || openForm === "ship_with_bounty" ? (
        <ShipForm
          variant={openForm}
          shippedThemeId={shippedThemeId}
          setShippedThemeId={setShippedThemeId}
          note={note}
          setNote={setNote}
          busy={busy}
          onCancel={() => setOpenForm(null)}
          onConfirm={() => {
            if (!shippedThemeId.trim()) {
              setError("shippedThemeId is required");
              return;
            }
            fire(openForm, {
              shippedThemeId: shippedThemeId.trim(),
              reviewerNote: note.trim() || undefined,
            });
          }}
        />
      ) : null}

      {openForm === "decline" && (
        <DeclineForm
          note={note}
          setNote={setNote}
          busy={busy}
          onCancel={() => setOpenForm(null)}
          onConfirm={() => {
            if (!note.trim()) {
              setError("reviewerNote is required to decline");
              return;
            }
            fire("decline", { reviewerNote: note.trim() });
          }}
        />
      )}

      {error && (
        <p className="mt-3 inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </li>
  );
}

/* ─── Atoms ─────────────────────────────────────────────────────── */

function ActionBtn({
  icon: Icon, label, onClick, busy, tone = "neutral", active = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  busy: boolean;
  tone?: "neutral" | "brand" | "violet" | "rose";
  active?: boolean;
}) {
  const styles: Record<typeof tone, string> = {
    neutral: "bg-card text-fg ring-1 ring-inset ring-line hover:bg-elevated",
    brand:   "bg-brand-600 text-white hover:bg-brand-700",
    violet:  "bg-violet-600 text-white hover:bg-violet-700",
    rose:    "bg-card text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50",
        styles[tone],
        active && "ring-2 ring-offset-1 ring-offset-card",
      )}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
      {label}
      <ChevronDown
        size={11}
        className={cn(
          "transition-transform opacity-60",
          active ? "rotate-180" : "rotate-0",
          tone === "neutral" ? "hidden" : "block",
        )}
      />
    </button>
  );
}

function StatusChip({
  rag, label,
}: {
  rag: "grey" | "amber" | "sky" | "green" | "rose";
  label: string;
}) {
  const tints: Record<typeof rag, string> = {
    grey:  "bg-elevated text-subtle ring-line",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    sky:   "bg-sky-100 text-sky-800 ring-sky-200",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    rose:  "bg-rose-100 text-rose-800 ring-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${tints[rag]}`}
    >
      {label}
    </span>
  );
}

function ragColor(rag: "grey" | "amber" | "sky" | "green" | "rose"): string {
  switch (rag) {
    case "grey":  return "rgba(120,120,120,0.45)";
    case "amber": return "var(--color-amber-400, #f59e0b)";
    case "sky":   return "var(--color-sky-500, #0ea5e9)";
    case "green": return "var(--color-emerald-500, #10b981)";
    case "rose":  return "var(--color-rose-500, #f43f5e)";
  }
}

/* ─── Inline forms ──────────────────────────────────────────────── */

function ShipForm({
  variant, shippedThemeId, setShippedThemeId, note, setNote, busy, onCancel, onConfirm,
}: {
  variant: "ship" | "ship_with_bounty";
  shippedThemeId: string;
  setShippedThemeId: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isBounty = variant === "ship_with_bounty";
  return (
    <div
      className={cn(
        "mt-3 rounded-xl border p-4 space-y-3",
        isBounty
          ? "border-violet-300 bg-violet-50"
          : "border-brand-300 bg-brand-50",
      )}
    >
      <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", isBounty ? "text-violet-900" : "text-brand-900")}>
        {isBounty ? "Ship + issue Theme Designer Bundle" : "Ship — mark as live"}
      </p>
      <div>
        <label className="block text-xs font-semibold text-fg mb-1">
          Theme ID this proposal shipped as
        </label>
        <input
          type="text"
          value={shippedThemeId}
          onChange={(e) => setShippedThemeId(e.target.value)}
          placeholder="e.g. citrus-grove, lab-bench"
          maxLength={60}
          className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60"
          disabled={busy}
        />
        <p className="text-[11px] text-muted mt-1">
          The themeId you registered in <code className="font-mono">VALID_THEME_IDS</code> +{" "}
          <code className="font-mono">THEMES</code>. Don't ship before the code lands on main.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-fg mb-1">
          Note to the proposer (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={PROPOSAL_LIMITS.reviewerNote.max}
          placeholder="Thank them, link to the live theme, etc."
          className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y"
          disabled={busy}
        />
      </div>
      {isBounty && (
        <p className="text-[11px] text-violet-900 leading-snug">
          Issues a tier-3 MerchReward bundle for this proposer. Idempotent — if
          they already received one from a previous shipped proposal, the new
          row just links to the existing bundle (no duplicate).
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-fg hover:bg-card transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !shippedThemeId.trim()}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-colors",
            isBounty ? "bg-violet-600 hover:bg-violet-700" : "bg-brand-600 hover:bg-brand-700",
          )}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : isBounty ? <Gift size={11} /> : <Truck size={11} />}
          {busy ? "Saving…" : isBounty ? "Confirm ship + bounty" : "Confirm ship"}
        </button>
      </div>
    </div>
  );
}

function DeclineForm({
  note, setNote, busy, onCancel, onConfirm,
}: {
  note: string;
  setNote: (v: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-900">
        Decline this proposal
      </p>
      <div>
        <label className="block text-xs font-semibold text-fg mb-1">
          Reason — required. Goes back to the proposer.
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={PROPOSAL_LIMITS.reviewerNote.max}
          placeholder="Be specific. They want to know why."
          className="w-full px-3 py-2 rounded-lg bg-card border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/60 resize-y"
          disabled={busy}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-fg hover:bg-card transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !note.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
          {busy ? "Saving…" : "Confirm decline"}
        </button>
      </div>
    </div>
  );
}
