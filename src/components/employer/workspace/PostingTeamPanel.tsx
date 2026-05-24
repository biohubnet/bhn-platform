"use client";
/**
 * PostingTeamPanel — assign hiring-team roles per posting.
 *
 * Shows company members currently on this posting's hiring team with
 * their roles (recruiter / hiring_manager / interviewer / observer),
 * and lets manager+ users add or remove members. Loaded lazily on
 * first render inside an expanded posting row.
 */
import { useState, useEffect } from "react";
import { Users, Plus, X, Loader2, ShieldCheck, UserCog, Eye, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type TeamRole = "recruiter" | "hiring_manager" | "interviewer" | "observer";

interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  addedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface CompanyMember {
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string };
}

const ROLE_META: Record<TeamRole, { label: string; cls: string; icon: React.ElementType }> = {
  recruiter:       { label: "Recruiter",      cls: "text-brand-700 bg-brand-50 ring-brand-200",    icon: Mic },
  hiring_manager:  { label: "Hiring manager", cls: "text-violet-700 bg-violet-50 ring-violet-200", icon: ShieldCheck },
  interviewer:     { label: "Interviewer",    cls: "text-emerald-700 bg-emerald-50 ring-emerald-200", icon: UserCog },
  observer:        { label: "Observer",       cls: "text-muted bg-elevated ring-line",              icon: Eye },
};

export function PostingTeamPanel({ postingId }: { postingId: string }) {
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string>("");
  const [addingRole, setAddingRole] = useState<TeamRole>("interviewer");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/employer/postings/${postingId}/team`);
      if (!r.ok) throw new Error("Failed to load team");
      const j = await r.json() as { teamMembers: TeamMember[]; companyMembers: CompanyMember[] };
      setTeamMembers(j.teamMembers ?? []);
      setCompanyMembers(j.companyMembers ?? []);
    } catch {
      setError("Couldn't load hiring team.");
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    if (!open) void load();
    setOpen((v) => !v);
  }

  async function addMember() {
    if (!addingUserId) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/employer/postings/${postingId}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addingUserId, role: addingRole }),
      });
      if (!r.ok) {
        const j = await r.json() as { error?: string };
        setError(j.error ?? "Failed to add member.");
        return;
      }
      setAddingUserId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId: string) {
    setRemoving(userId);
    setError(null);
    try {
      const r = await fetch(`/api/employer/postings/${postingId}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!r.ok) {
        const j = await r.json() as { error?: string };
        setError(j.error ?? "Failed to remove.");
        return;
      }
      setConfirmRemove(null);
      await load();
    } finally {
      setRemoving(null);
    }
  }

  // Candidates to add: company members not already on the posting team
  const assignedIds = new Set(teamMembers.map((m) => m.userId));
  const addCandidates = companyMembers.filter((m) => !assignedIds.has(m.userId));

  return (
    <div className="border-t border-line/70 bg-card/60">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center gap-2 px-5 py-3 text-xs font-semibold text-muted hover:text-fg hover:bg-elevated/50 transition-colors text-left"
      >
        <Users size={13} />
        Hiring team
        {teamMembers.length > 0 && (
          <span className="ml-auto text-[10px] text-subtle">
            {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {loading && (
            <p className="text-xs text-muted inline-flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </p>
          )}

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {!loading && teamMembers.length === 0 && (
            <p className="text-xs text-muted italic">
              No hiring team assigned yet. Add teammates below so they receive notifications for this posting.
            </p>
          )}

          {!loading && teamMembers.length > 0 && (
            <ul className="space-y-1.5">
              {teamMembers.map((m) => {
                const meta = ROLE_META[m.role] ?? ROLE_META.observer;
                const Icon = meta.icon;
                return (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset", meta.cls)}>
                      <Icon size={9} /> {meta.label}
                    </span>
                    <span className="text-xs text-fg flex-1 min-w-0 truncate">
                      {m.user.name ?? m.user.email}
                    </span>
                    {confirmRemove === m.userId ? (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-rose-700 font-semibold">Remove?</span>
                        <button
                          type="button"
                          disabled={removing === m.userId}
                          onClick={() => removeMember(m.userId)}
                          className="text-[10px] font-bold text-rose-700 hover:underline disabled:opacity-50"
                        >
                          {removing === m.userId ? <Loader2 size={10} className="animate-spin" /> : "Yes"}
                        </button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="text-[10px] text-muted hover:text-fg">
                          ×
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(m.userId)}
                        className="p-0.5 rounded text-muted hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        aria-label="Remove from hiring team"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!loading && addCandidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={addingUserId}
                onChange={(e) => setAddingUserId(e.target.value)}
                className="flex-1 min-w-0 text-xs bg-card border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-fg"
              >
                <option value="">Add a teammate…</option>
                {addCandidates.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </select>
              <select
                value={addingRole}
                onChange={(e) => setAddingRole(e.target.value as TeamRole)}
                className="text-xs bg-card border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-fg"
              >
                <option value="recruiter">Recruiter</option>
                <option value="hiring_manager">Hiring manager</option>
                <option value="interviewer">Interviewer</option>
                <option value="observer">Observer</option>
              </select>
              <button
                type="button"
                disabled={!addingUserId || saving}
                onClick={addMember}
                className="inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 px-2.5 py-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                Add
              </button>
            </div>
          )}

          {!loading && addCandidates.length === 0 && teamMembers.length > 0 && (
            <p className="text-[10px] text-subtle italic">All company members are already on this posting&apos;s team.</p>
          )}
        </div>
      )}
    </div>
  );
}
