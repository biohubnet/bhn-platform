"use client";

/**
 * EquipRecipientsSimple — the simplified, public-facing EQUIP recipient list
 * (Recipients tab on /admin/equip/tracker). Company · recipient · track, plus
 * the VentureLift project name. No LinkedIn/status/posts history.
 *
 * This is the exact data served at /api/public/equip/recipients for the
 * BioHubNet website (built by ChatGPT Codex). Two copy buttons make the Codex
 * hand-off one click: the raw JSON, and a ready-to-paste Codex prompt.
 */
import { useEffect, useState } from "react";
import { Copy, Check, Rss, Building2 } from "lucide-react";

interface PublicRecipient {
  company: string;
  recipient: string;
  institution: string;
  track: "VC" | "VL" | "Both";
  project?: string;
}

const TRACK_META: Record<PublicRecipient["track"], { label: string; cls: string }> = {
  VC: { label: "VentureConnect", cls: "bg-sky-50 text-sky-800 ring-sky-200" },
  VL: { label: "VentureLift", cls: "bg-violet-50 text-violet-800 ring-violet-200" },
  Both: { label: "VC · VL", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

export function EquipRecipientsSimple({
  recipients,
  updated,
  feedPath,
}: {
  recipients: PublicRecipient[];
  updated: string;
  feedPath: string;
}) {
  const [feedUrl, setFeedUrl] = useState(feedPath);
  const [copied, setCopied] = useState<"json" | "prompt" | "url" | null>(null);

  useEffect(() => {
    setFeedUrl(window.location.origin + feedPath);
  }, [feedPath]);

  const payload = JSON.stringify({ updated, recipients }, null, 2);
  const hasVL = recipients.some((r) => r.track === "VL" || r.track === "Both");

  const codexPrompt =
    `Build a stylized "EQUIP funding recipients" section for the BioHubNet website.\n\n` +
    `Fetch this JSON (server-side, at build or request time):\n  GET ${feedUrl}\n\n` +
    `Shape:\n{ "updated": "YYYY-MM-DD", "recipients": [ { "company": string, "recipient": string, ` +
    `"institution": string, "track": "VC" | "VL" | "Both", "project"?: string } ] }\n\n` +
    `Render each recipient with company name (prominent), recipient name + institution, and a ` +
    `track badge (VentureConnect / VentureLift / Both). For VentureLift recipients, also show the ` +
    `project name. Show the "updated" date somewhere subtle. Do not invent fields.`;

  async function copy(text: string, which: "json" | "prompt" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="space-y-4">
      {/* Codex feed toolbar */}
      <div className="rounded-2xl border border-line bg-card-solid p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-fg">
              <Rss size={13} className="text-brand-600" /> Website feed (for Codex)
            </h3>
            <p className="mt-0.5 text-[12px] text-fg-subtle">
              {recipients.length} recipients · updated {updated}. BioHubNet&apos;s site fetches this
              live; use the buttons to hand the data (or a prompt) to Codex.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => copy(payload, "json")}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-brand-700"
              title="Copy the exact JSON the public feed returns"
            >
              {copied === "json" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "json" ? "Copied JSON" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={() => copy(codexPrompt, "prompt")}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-card-solid px-2.5 py-1.5 text-[11.5px] font-semibold text-fg transition hover:border-brand-400 hover:text-brand-700"
              title="Copy a ready-to-paste prompt for Codex that fetches the feed and renders the list"
            >
              {copied === "prompt" ? <Check size={12} /> : <Copy size={12} />}
              {copied === "prompt" ? "Copied prompt" : "Copy Codex prompt"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => copy(feedUrl, "url")}
          title="Copy the public feed URL"
          className="flex w-full items-center gap-2 overflow-hidden rounded-md border border-line bg-elevated px-2.5 py-1.5 text-left transition hover:border-brand-300"
        >
          {copied === "url" ? <Check size={12} className="shrink-0 text-emerald-600" /> : <Copy size={12} className="shrink-0 text-fg-subtle" />}
          <code className="truncate text-[11.5px] text-brand-700">{feedUrl}</code>
        </button>
      </div>

      {/* Recipient table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card-solid">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line/70 bg-elevated/50 text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                <th className="px-4 py-2.5 font-semibold">Company</th>
                <th className="px-4 py-2.5 font-semibold">Recipient</th>
                <th className="px-4 py-2.5 font-semibold">Track</th>
                {hasVL && <th className="px-4 py-2.5 font-semibold">Project (VentureLift)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {recipients.map((r, i) => {
                const meta = TRACK_META[r.track];
                const isVL = r.track === "VL" || r.track === "Both";
                return (
                  <tr key={`${r.company}-${i}`} className="hover:bg-elevated/40">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                        <Building2 size={12} className="shrink-0 text-fg-subtle" />
                        {r.company}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-fg">
                      {r.recipient}
                      {r.institution && (
                        <span className="text-fg-subtle"> — {r.institution}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={"inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset " + meta.cls}>
                        {meta.label}
                      </span>
                    </td>
                    {hasVL && (
                      <td className="px-4 py-2.5">
                        {isVL ? (
                          r.project ? (
                            <span className="text-fg">{r.project}</span>
                          ) : (
                            <span className="text-[11.5px] italic text-fg-subtle" title="Add the project name in src/lib/equip/recipients.ts">
                              — add project
                            </span>
                          )
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
