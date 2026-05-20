"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare, Square, MinusSquare, X,
  ShieldCheck, ShieldOff, Coins, UserCheck, UsersRound, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { UserRowClient } from "./UserRowClient";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  credits: number;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: { enrollments: number; certificates: number };
}

interface GroupOption {
  id: string;
  name: string;
}

interface Props {
  users: UserRow[];
  groups: GroupOption[];
}

const ROLES = ["trainee", "evaluating", "employer", "industrial_mentor", "instructor", "admin", "superadmin"];

export function UsersTableClient({ users, groups }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState<null | "role" | "credits" | "group">(null);
  const [pendingRole, setPendingRole] = useState("trainee");
  const [pendingAmount, setPendingAmount] = useState("100");
  const [pendingGroup, setPendingGroup] = useState(groups[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, filter]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((u) => selected.has(u.id));
  const someVisibleSelected =
    !allVisibleSelected && visible.some((u) => selected.has(u.id));

  function toggleAll() {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allVisibleSelected) {
        for (const u of visible) next.delete(u.id);
      } else {
        for (const u of visible) next.add(u.id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function batch(
    action: "activate" | "deactivate" | "setRole" | "grantCredits" | "addToGroup",
    payload?: Record<string, unknown>
  ) {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selected), action, payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Batch action failed");
        return;
      }
      setModal(null);
      clearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter by name, email, or role…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-xs text-subtle">
          {visible.length} of {users.length} shown
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </p>
      </div>

      {/* Sticky batch action bar — appears when any user is selected */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-900/20 px-4 py-2.5 animate-fade-in">
          <div className="flex items-center gap-2 mr-2">
            <UsersRound size={16} />
            <span className="text-sm font-semibold">{selected.size}</span>
            <span className="text-xs text-brand-100">selected</span>
          </div>
          <span className="h-5 w-px bg-white/20" />
          <button
            onClick={() => batch("activate")}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck size={13} /> Activate
          </button>
          <button
            onClick={() => batch("deactivate")}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <ShieldOff size={13} /> Deactivate
          </button>
          <button
            onClick={() => setModal("role")}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <UserCheck size={13} /> Change role
          </button>
          <button
            onClick={() => setModal("credits")}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
          >
            <Coins size={13} /> Adjust credits
          </button>
          {groups.length > 0 && (
            <button
              onClick={() => setModal("group")}
              disabled={busy}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
            >
              <UsersRound size={13} /> Add to group
            </button>
          )}
          <span className="ml-auto" />
          {busy && <Loader2 size={14} className="animate-spin" />}
          <button
            onClick={clearSelection}
            className="text-xs px-2 py-1 rounded-lg hover:bg-white/15 transition-colors flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 w-10">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex items-center text-muted hover:text-brand-600 transition-colors"
                    aria-label={allVisibleSelected ? "Deselect all" : "Select all"}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare size={16} className="text-brand-600" />
                    ) : someVisibleSelected ? (
                      <MinusSquare size={16} className="text-brand-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Enrolls</th>
                <th className="px-5 py-3">Certs</th>
                <th className="px-5 py-3">Last Login</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((user) => {
                const isSelected = selected.has(user.id);
                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "hover:bg-elevated/60 transition-colors",
                      !user.isActive && "opacity-50",
                      isSelected && "bg-brand-50/60"
                    )}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleOne(user.id)}
                        className="flex items-center text-muted hover:text-brand-600 transition-colors"
                        aria-label={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-brand-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{user.name ?? "—"}</p>
                      <p className="text-xs text-subtle">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        user.role === "superadmin" ? "bg-rose-100 text-rose-700" :
                        user.role === "admin" ? "bg-brand-100 text-brand-700" :
                        user.role === "instructor" ? "bg-violet-100 text-violet-700" :
                        user.role === "evaluating" ? "bg-amber-100 text-amber-700" :
                        "bg-elevated text-muted"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                      )}>
                        {user.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted font-mono text-xs">
                      {user.credits.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-muted">{user._count.enrollments}</td>
                    <td className="px-5 py-3 text-muted">{user._count.certificates}</td>
                    <td className="px-5 py-3 text-subtle text-xs">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-subtle text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <UserRowClient user={user} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal
        open={modal === "role"}
        onClose={() => setModal(null)}
        size="sm"
        title={`Change role for ${selected.size} user${selected.size === 1 ? "" : "s"}`}
        description="The new role applies to every selected user."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => batch("setRole", { role: pendingRole })} loading={busy}>
              Apply role
            </Button>
          </>
        }
      >
        <Field label="New role">
          <Select value={pendingRole} onChange={(e) => setPendingRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={modal === "credits"}
        onClose={() => setModal(null)}
        size="sm"
        title={`Adjust credits for ${selected.size} user${selected.size === 1 ? "" : "s"}`}
        description="Use a negative number to debit. The change is logged in the credit transaction history."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              onClick={() => batch("grantCredits", { amount: Number(pendingAmount) })}
              loading={busy}
            >
              {Number(pendingAmount) >= 0 ? "Grant" : "Debit"}
            </Button>
          </>
        }
      >
        <Field label="Amount" hint="Positive grants, negative debits.">
          <Input
            type="number"
            value={pendingAmount}
            onChange={(e) => setPendingAmount(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={modal === "group"}
        onClose={() => setModal(null)}
        size="sm"
        title={`Add ${selected.size} user${selected.size === 1 ? "" : "s"} to a group`}
        description="Existing memberships are preserved — duplicates skipped."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              onClick={() => batch("addToGroup", { groupId: pendingGroup })}
              loading={busy}
              disabled={!pendingGroup}
            >
              Add to group
            </Button>
          </>
        }
      >
        <Field label="Group">
          <Select value={pendingGroup} onChange={(e) => setPendingGroup(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
