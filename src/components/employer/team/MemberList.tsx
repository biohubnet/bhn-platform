"use client";

/**
 * MemberList — interactive roster card for /employer/team.
 *
 * Owner can:   change any member's role (dropdown), remove members.
 * Manager can: change any member's title.
 * Viewer:      read-only list.
 *
 * Optimistic updates: each mutation calls router.refresh() so the
 * server component re-fetches the latest state.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Shield, Users, Eye,
  Trash2, ChevronDown, UserCircle2, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

type Role = "owner" | "manager" | "generalist" | "viewer";

interface Member {
  id:         string;
  role:       string;
  title:      string | null;
  joinedAt:   string | Date;
  lastSeenAt: string | Date | null;
  user: {
    id:    string;
    name:  string | null;
    email: string;
    image: string | null;
  };
}

interface Props {
  companyId:  string;
  members:    Member[];
  callerId:   string;
  callerRole: Role;
  canManage:  boolean;
  isOwner:    boolean;
}

// ── Helpers ───────────────────────────────────────────────────────

function relativeTime(iso: string | Date | null): string {
  if (!iso) return "Never seen";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; tone: "brand" | "success" | "warning" | "neutral" }> = {
  owner:      { label: "Owner",      icon: ShieldCheck, tone: "brand"   },
  manager:    { label: "Manager",    icon: Shield,      tone: "success"  },
  generalist: { label: "Generalist", icon: Users,       tone: "warning"  },
  viewer:     { label: "Viewer",     icon: Eye,         tone: "neutral"  },
};

const ROLES: Role[] = ["owner", "manager", "generalist", "viewer"];

// ── RoleDropdown ──────────────────────────────────────────────────

function RoleDropdown({
  memberId,
  companyId,
  currentRole,
  callerRole,
  onChanged,
}: {
  memberId:    string;
  companyId:   string;
  currentRole: Role;
  callerRole:  Role;
  onChanged:   () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function changeRole(newRole: Role) {
    if (newRole === currentRole) { setOpen(false); return; }
    setLoading(true);
    setOpen(false);
    await fetch(`/api/employer/companies/${companyId}/members/${memberId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role: newRole }),
    });
    setLoading(false);
    onChanged();
  }

  const meta = ROLE_META[currentRole] ?? ROLE_META.viewer;
  const Icon = meta.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
          "ring-1 ring-inset transition-colors cursor-pointer",
          meta.tone === "brand"   && "bg-brand-50 text-brand-700 ring-brand-200 hover:bg-brand-100",
          meta.tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
          meta.tone === "warning" && "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100",
          meta.tone === "neutral" && "bg-raised text-muted ring-line hover:bg-elevated",
        )}
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
        {meta.label}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-40 bg-card-solid border border-line rounded-xl shadow-lg py-1">
          {ROLES.map(role => {
            const m = ROLE_META[role];
            const RoleIcon = m.icon;
            return (
              <button
                key={role}
                type="button"
                onClick={() => changeRole(role)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors text-left",
                  role === currentRole
                    ? "text-brand-700 bg-brand-50"
                    : "text-fg hover:bg-elevated",
                )}
              >
                <RoleIcon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────

function MemberRow({
  member,
  companyId,
  callerId,
  callerRole,
  isOwner,
  onChanged,
}: {
  member:     Member;
  companyId:  string;
  callerId:   string;
  callerRole: Role;
  isOwner:    boolean;
  onChanged:  () => void;
}) {
  const { confirmDialog, node: confirmNode } = useConfirmDialog();
  const [removing, setRemoving] = useState(false);

  const isSelf        = member.user.id === callerId;
  const memberRole    = member.role as Role;
  const isLastOwner   = false; // guarded server-side; also guarded by API

  async function remove() {
    const ok = await confirmDialog({
      title:        `Remove ${member.user.name ?? member.user.email}?`,
      description:  "They will lose access to this workspace immediately.",
      confirmLabel: "Remove member",
      tone:         "destructive",
    });
    if (!ok) return;
    setRemoving(true);
    await fetch(`/api/employer/companies/${companyId}/members/${member.id}`, { method: "DELETE" });
    setRemoving(false);
    onChanged();
  }

  const meta       = ROLE_META[memberRole] ?? ROLE_META.viewer;
  const initials   = (member.user.name ?? member.user.email).slice(0, 2).toUpperCase();
  const displayName = member.user.name ?? member.user.email;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-elevated/50 rounded-xl",
      removing && "opacity-40 pointer-events-none",
    )}>
      {confirmNode}

      {/* Avatar */}
      <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold">
        {member.user.image
          ? <img src={member.user.image} alt="" className="w-full h-full object-cover" />
          : initials
        }
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg truncate leading-tight">
          {displayName}
          {isSelf && (
            <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>
          )}
        </p>
        {member.user.name && (
          <p className="text-xs text-muted truncate">{member.user.email}</p>
        )}
        {member.title && (
          <p className="text-xs text-subtle truncate">{member.title}</p>
        )}
      </div>

      {/* Role chip — owner gets dropdown, others see static chip */}
      <div className="shrink-0">
        {isOwner && !isSelf ? (
          <RoleDropdown
            memberId={member.id}
            companyId={companyId}
            currentRole={memberRole}
            callerRole={callerRole}
            onChanged={onChanged}
          />
        ) : (
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset",
            meta.tone === "brand"   && "bg-brand-50 text-brand-700 ring-brand-200",
            meta.tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
            meta.tone === "warning" && "bg-amber-50 text-amber-700 ring-amber-200",
            meta.tone === "neutral" && "bg-raised text-muted ring-line",
          )}>
            <meta.icon size={10} />
            {meta.label}
          </span>
        )}
      </div>

      {/* Last seen */}
      <div className="hidden sm:block shrink-0 text-right">
        <p className="text-xs text-subtle">{relativeTime(member.lastSeenAt)}</p>
        <p className="text-[10px] text-subtle/60">last seen</p>
      </div>

      {/* Remove button (owner only, not self) */}
      {isOwner && !isSelf && (
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          className="shrink-0 p-1.5 rounded-lg text-subtle hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Remove ${displayName}`}
          title="Remove member"
        >
          {removing
            ? <Loader2 size={14} className="animate-spin" />
            : <Trash2 size={14} />
          }
        </button>
      )}
    </div>
  );
}

// ── MemberList (default export) ───────────────────────────────────

export function MemberList({ companyId, members, callerId, callerRole, canManage, isOwner }: Props) {
  const router = useRouter();

  function refresh() { router.refresh(); }

  if (members.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-line">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-muted" />
          <h2 className="text-sm font-semibold text-fg">
            Team members
            <span className="ml-1.5 text-xs font-normal text-muted">({members.length})</span>
          </h2>
        </div>
      </div>

      <div className="divide-y divide-line/50 px-1 py-1">
        {members.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            companyId={companyId}
            callerId={callerId}
            callerRole={callerRole}
            isOwner={isOwner}
            onChanged={refresh}
          />
        ))}
      </div>
    </Card>
  );
}
