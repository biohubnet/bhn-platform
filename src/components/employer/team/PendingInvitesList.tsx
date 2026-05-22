"use client";

/**
 * PendingInvitesList — shows non-expired pending invites with a
 * Revoke button. Manager+ only (enforced by the parent page).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Clock, Trash2, Loader2, ShieldCheck, Shield, Users, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

type Role = "owner" | "manager" | "generalist" | "viewer";

interface Invite {
  id:        string;
  email:     string;
  role:      string;
  title:     string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
  invitedBy: { name: string | null } | null;
}

interface Props {
  companyId: string;
  invites:   Invite[];
  canManage: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────

const ROLE_META: Record<Role, { label: string; icon: React.ElementType }> = {
  owner:      { label: "Owner",      icon: ShieldCheck },
  manager:    { label: "Manager",    icon: Shield      },
  generalist: { label: "Generalist", icon: Users       },
  viewer:     { label: "Viewer",     icon: Eye         },
};

function daysUntil(iso: string | Date): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days}d`;
}

// ── InviteRow ─────────────────────────────────────────────────────

function InviteRow({
  invite,
  companyId,
  onRevoked,
}: {
  invite:    Invite;
  companyId: string;
  onRevoked: () => void;
}) {
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [revoking, setRevoking] = useState(false);

  async function revoke() {
    const ok = await confirmDialog({
      title:        `Revoke invite for ${invite.email}?`,
      description:  "The invite link will stop working. You can re-invite them later.",
      confirmLabel: "Revoke invite",
      tone:         "warning",
    });
    if (!ok) return;
    setRevoking(true);
    await fetch(`/api/employer/companies/${companyId}/invites/${invite.id}`, {
      method: "DELETE",
    });
    setRevoking(false);
    onRevoked();
  }

  const role = invite.role as Role;
  const meta = ROLE_META[role] ?? ROLE_META.viewer;
  const RoleIcon = meta.icon;
  const inviter = invite.invitedBy?.name ?? "Someone";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 group hover:bg-elevated/50 rounded-xl transition-colors",
      revoking && "opacity-40 pointer-events-none",
    )}>
      {confirmNode}

      {/* Mail icon */}
      <div className="w-9 h-9 shrink-0 rounded-full bg-raised flex items-center justify-center text-muted">
        <Mail size={15} />
      </div>

      {/* Email + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate">{invite.email}</p>
        <p className="text-xs text-muted">
          Invited by {inviter}
          {invite.title && <span className="text-subtle"> · {invite.title}</span>}
        </p>
      </div>

      {/* Role chip */}
      <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-xs font-medium bg-raised text-muted px-2 py-0.5 rounded-full ring-1 ring-inset ring-line">
        <RoleIcon size={10} />
        {meta.label}
      </span>

      {/* Expiry */}
      <div className="hidden sm:flex shrink-0 items-center gap-1 text-xs text-subtle">
        <Clock size={11} />
        {daysUntil(invite.expiresAt)}
      </div>

      {/* Revoke */}
      <button
        type="button"
        onClick={revoke}
        disabled={revoking}
        className="shrink-0 p-1.5 rounded-lg text-subtle hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
        aria-label={`Revoke invite for ${invite.email}`}
        title="Revoke invite"
      >
        {revoking
          ? <Loader2 size={14} className="animate-spin" />
          : <Trash2 size={14} />
        }
      </button>
    </div>
  );
}

// ── PendingInvitesList (export) ───────────────────────────────────

export function PendingInvitesList({ companyId, invites, canManage }: Props) {
  const router = useRouter();

  if (invites.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-muted" />
          <h2 className="text-sm font-semibold text-fg">
            Pending invites
            <span className="ml-1.5 text-xs font-normal text-muted">({invites.length})</span>
          </h2>
        </div>
        <p className="text-xs text-subtle">Awaiting acceptance · 7-day link</p>
      </div>

      <div className="divide-y divide-line/50 px-1 py-1">
        {invites.map(inv => (
          <InviteRow
            key={inv.id}
            invite={inv}
            companyId={companyId}
            onRevoked={() => router.refresh()}
          />
        ))}
      </div>
    </Card>
  );
}
