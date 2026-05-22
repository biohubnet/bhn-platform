"use client";

/**
 * JoinRequestsPanel — shows pending domain-matched join requests
 * with Approve / Decline actions. Manager+ only.
 *
 * Approve: creates CompanyMember at the suggested role.
 * Decline: marks the request declined (no member created).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, Loader2, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

interface JoinRequest {
  id:            string;
  suggestedRole: string | null;
  note:          string | null;
  createdAt:     string | Date;
  requester: {
    id:    string;
    name:  string | null;
    email: string;
    image: string | null;
  };
}

interface Props {
  companyId: string;
  requests:  JoinRequest[];
}

// ── Helpers ───────────────────────────────────────────────────────

function relativeTime(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60)  return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ROLE_LABEL: Record<string, string> = {
  owner:      "Owner",
  manager:    "Manager",
  generalist: "Generalist",
  viewer:     "Viewer",
};

// ── RequestRow ────────────────────────────────────────────────────

function RequestRow({
  req,
  companyId,
  onDone,
}: {
  req:       JoinRequest;
  companyId: string;
  onDone:    () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [declining, setDeclining] = useState(false);
  const loading = approving || declining;

  async function approve() {
    setApproving(true);
    await fetch(
      `/api/employer/companies/${companyId}/join-requests/${req.id}/approve`,
      { method: "POST" },
    );
    setApproving(false);
    onDone();
  }

  async function decline() {
    setDeclining(true);
    await fetch(
      `/api/employer/companies/${companyId}/join-requests/${req.id}/decline`,
      { method: "POST" },
    );
    setDeclining(false);
    onDone();
  }

  const initials    = (req.requester.name ?? req.requester.email).slice(0, 2).toUpperCase();
  const displayName = req.requester.name ?? req.requester.email;
  const roleLabel   = req.suggestedRole ? (ROLE_LABEL[req.suggestedRole] ?? req.suggestedRole) : "Viewer";

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-elevated/50",
      loading && "opacity-50 pointer-events-none",
    )}>
      {/* Avatar */}
      <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-semibold mt-0.5">
        {req.requester.image
          ? <img src={req.requester.image} alt="" className="w-full h-full object-cover" />
          : initials
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-fg">{displayName}</p>
          <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-amber-200 font-medium">
            Requesting {roleLabel}
          </span>
          <span className="text-xs text-subtle">{relativeTime(req.createdAt)}</span>
        </div>
        <p className="text-xs text-muted mt-0.5">{req.requester.email}</p>
        {req.note && (
          <div className="flex items-start gap-1.5 mt-1.5 text-xs text-muted">
            <MessageSquare size={11} className="shrink-0 mt-0.5 text-subtle" />
            <span className="italic">"{req.note}"</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        <button
          type="button"
          onClick={decline}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-elevated hover:text-fg transition-colors"
        >
          {declining ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Decline
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          {approving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Approve
        </button>
      </div>
    </div>
  );
}

// ── JoinRequestsPanel (export) ────────────────────────────────────

export function JoinRequestsPanel({ companyId, requests }: Props) {
  const router = useRouter();

  if (requests.length === 0) return null;

  return (
    <Card className="overflow-hidden border-amber-200 bg-amber-50/30">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-amber-200/60">
        <div className="flex items-center gap-2">
          <UserPlus size={15} className="text-amber-600" />
          <h2 className="text-sm font-semibold text-fg">
            Join requests
            <span className="ml-1.5 text-xs font-normal text-muted">({requests.length})</span>
          </h2>
        </div>
        <p className="text-xs text-amber-700/70">Domain-matched · Waiting for approval</p>
      </div>

      <div className="divide-y divide-amber-100 px-1 py-1">
        {requests.map(req => (
          <RequestRow
            key={req.id}
            req={req}
            companyId={companyId}
            onDone={() => router.refresh()}
          />
        ))}
      </div>
    </Card>
  );
}
