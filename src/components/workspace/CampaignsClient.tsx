"use client";

/**
 * Campaigns list + create. Cards link into the per-campaign roster; the
 * create form picks a name, a target (a list, or everyone) and an email
 * template, then drops you into the new campaign.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, Loader2, Users, BookUser, ArrowRight, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface CampaignCard {
  id: string;
  name: string;
  status: string;
  listId: string | null;
  listName: string | null;
  templateLabel: string;
  reached: number;
  total: number;
  createdByName: string;
  createdAt: string;
}

interface ListOpt { id: string; name: string; count: number }
interface TemplateOpt { id: string; label: string; when: string }

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-elevated text-subtle",
  active: "bg-brand-50 text-brand-700",
  done: "bg-emerald-50 text-emerald-700",
};

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
};

export function CampaignsClient({
  campaigns,
  lists,
  peopleCount,
  templates,
}: {
  campaigns: CampaignCard[];
  lists: ListOpt[];
  peopleCount: number;
  templates: TemplateOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [listId, setListId] = useState("");           // "" = everyone
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const chosenTemplate = templates.find((t) => t.id === templateId);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || !templateId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, templateId, listId: listId || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; campaign?: { id: string }; error?: string };
      if (res.ok && j.campaign) {
        router.push(`/admin/workspace/outreach/campaigns/${j.campaign.id}`);
        return;
      }
      setError(j.error ?? "Couldn't create the campaign.");
    } catch {
      setError("Couldn't create the campaign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {campaigns.length === 0
            ? "No campaigns yet — create one to start a tracked outreach push."
            : `${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}.`}
        </p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
          >
            <Plus size={14} /> New campaign
          </button>
        )}
      </div>

      {/* Create form */}
      {open && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-fg">New campaign</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-fg"><X size={16} /></button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-subtle">Campaign name</span>
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VentureLift round — June push"
              className="w-full rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-subtle">Target audience</span>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">Everyone in the directory ({peopleCount})</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.count})</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-subtle">Email template</span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-md border border-line bg-card-solid px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          {chosenTemplate && (
            <p className="rounded-md bg-elevated/50 px-3 py-2 text-[12px] text-muted">{chosenTemplate.when}</p>
          )}

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={create}
              disabled={busy || !name.trim() || !templateId}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create campaign
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-line bg-card-solid px-4 py-2 text-xs font-semibold text-fg hover:bg-elevated">Cancel</button>
          </div>
        </Card>
      )}

      {/* Cards */}
      {campaigns.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const pct = c.total > 0 ? Math.round((Math.min(c.reached, c.total) / c.total) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/admin/workspace/outreach/campaigns/${c.id}`}
                className="group block"
              >
                <Card hover className="h-full space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight text-fg">{c.name}</h3>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_STYLES[c.status] ?? STATUS_STYLES.draft)}>
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      {c.listName ? <BookUser size={12} /> : <Users size={12} />}
                      {c.listName ?? "Everyone"}
                    </span>
                    <span className="inline-flex items-center gap-1"><Megaphone size={12} /> {c.templateLabel}</span>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-subtle">
                      <span>{c.reached} of {c.total} reached</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-[11px] text-subtle">
                    <span>by {c.createdByName} · {fmtDate(c.createdAt)}</span>
                    <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
