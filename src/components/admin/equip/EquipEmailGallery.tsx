"use client";

/**
 * Read-only gallery of every EQUIP applicant email, for both streams.
 * Toggle VentureConnect / VentureLift; each card shows the trigger, the
 * subject line, and a live preview of the rendered HTML (sandboxed iframe).
 */
import { useState } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreviewItem {
  id: string;
  label: string;
  when: string;
  subject: string;
  html: string;
}
export interface StreamPreview {
  key: "venture_connect" | "venture_lift";
  name: string;
  items: PreviewItem[];
}

export function EquipEmailGallery({ streams }: { streams: StreamPreview[] }) {
  const [active, setActive] = useState(streams[0]?.key ?? "venture_connect");
  const [open, setOpen] = useState<string | null>(streams[0]?.items[0]?.id ?? null);
  const current = streams.find((s) => s.key === active) ?? streams[0];

  return (
    <div className="space-y-4">
      {/* Stream toggle */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-elevated/60 p-1">
        {streams.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setActive(s.key); setOpen(s.items[0]?.id ?? null); }}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-bold transition-colors",
              active === s.key ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
            )}
          >
            {s.name}
            <span className="ml-1.5 rounded-full bg-elevated px-1.5 text-[10px] tabular-nums text-subtle">{s.items.length}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {current.items.map((it) => {
          const isOpen = open === it.id;
          return (
            <li key={it.id} className="overflow-hidden rounded-xl border border-line bg-card-solid">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : it.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-elevated/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Mail size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-fg">{it.label}</span>
                  <span className="block text-[11.5px] text-muted">Sends when: {it.when}</span>
                </span>
                <ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="border-t border-line">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">Subject</span>
                    <span className="text-[13px] font-semibold text-fg">{it.subject}</span>
                  </div>
                  <iframe
                    title={`${it.label} preview`}
                    srcDoc={it.html}
                    sandbox=""
                    className="h-[560px] w-full border-0 bg-[#f1f5f9]"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
