"use client";

/**
 * ScriptStudio — the editor surface for one script, and the P1 decision point.
 * Shows BOTH editors so the user can pick: a "Sections" tab (structured
 * markdown blocks), a "Rich text" tab (TipTap WYSIWYG), and a "Compare" tab
 * that renders both side-by-side. Saving from either editor sets the script's
 * `format` to that editor and records a revision (live edit + history).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutList, Type, Columns2, Save, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { SectionsEditor, type EditorSection } from "./SectionsEditor";
import { RichTextEditor, type RichDoc } from "./RichTextEditor";
import { cn } from "@/lib/utils";

type Mode = "sections" | "richtext" | "compare";

interface Props {
  scriptId: string;
  initialFormat: "sections" | "richtext";
  initialSections: EditorSection[];
  initialRich: RichDoc | null;
}

/** Build a TipTap doc from sections so the rich editor opens on the same content. */
function sectionsToDoc(sections: EditorSection[]): RichDoc {
  const content: Record<string, unknown>[] = [];
  for (const s of sections) {
    if (s.heading.trim()) {
      content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: s.heading }] });
    }
    for (const para of s.body.split(/\n{2,}/)) {
      const t = para.trim();
      if (t) content.push({ type: "paragraph", content: [{ type: "text", text: t }] });
    }
  }
  if (!content.length) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

export function ScriptStudio({ scriptId, initialFormat, initialSections, initialRich }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialFormat === "richtext" ? "richtext" : "sections");
  const [sections, setSections] = useState<EditorSection[]>(
    initialSections.length ? initialSections : [{ heading: "", body: "" }],
  );
  const [rich, setRich] = useState<RichDoc>(initialRich ?? sectionsToDoc(initialSections));
  const [saving, setSaving] = useState<null | "sections" | "richtext">(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(format: "sections" | "richtext") {
    setSaving(format);
    setError(null);
    setSavedMsg(null);
    try {
      const payload =
        format === "sections"
          ? { format, sections: sections.map((s, i) => ({ heading: s.heading, body: s.body, order: i })), summary: "Edited sections" }
          : { format, richContent: rich, summary: "Edited rich text" };
      const res = await fetch(`/api/workspace/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Save failed.");
        return;
      }
      setSavedMsg(`Saved as ${format === "sections" ? "Sections" : "Rich text"} — this script now uses that editor.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const SaveBtn = ({ format, label }: { format: "sections" | "richtext"; label: string }) => (
    <button
      type="button"
      onClick={() => save(format)}
      disabled={saving !== null}
      className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {saving === format ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {label}
    </button>
  );

  const tab = (m: Mode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        mode === m ? "bg-card-solid text-fg shadow-card-rest" : "text-muted hover:text-fg",
      )}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Decision banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-brand-700" />
        <p className="text-[12.5px] leading-relaxed text-fg">
          <span className="font-semibold">Pick your editor.</span> Try both on the real content below — the structured{" "}
          <span className="font-medium">Sections</span> editor and the <span className="font-medium">Rich text</span> editor.
          Hit Save under whichever you prefer; that becomes this script&apos;s editor. You can change it later.
        </p>
      </div>

      {/* Mode switch + feedback */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-elevated/60 p-1">
          {tab("sections", <LayoutList size={13} />, "Sections")}
          {tab("richtext", <Type size={13} />, "Rich text")}
          {tab("compare", <Columns2 size={13} />, "Compare")}
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={12} /> {savedMsg}
            </span>
          )}
          {error && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-700">
              <AlertCircle size={12} /> {error}
            </span>
          )}
        </div>
      </div>

      {/* Editors */}
      {mode === "sections" && (
        <div className="space-y-3">
          <SectionsEditor sections={sections} onChange={setSections} disabled={saving !== null} />
          <div className="flex justify-end"><SaveBtn format="sections" label="Save (Sections)" /></div>
        </div>
      )}

      {mode === "richtext" && (
        <div className="space-y-3">
          <RichTextEditor initial={rich} onChange={setRich} disabled={saving !== null} />
          <div className="flex justify-end"><SaveBtn format="richtext" label="Save (Rich text)" /></div>
        </div>
      )}

      {mode === "compare" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Option A · Sections</p>
              <SaveBtn format="sections" label="Use this" />
            </div>
            <SectionsEditor sections={sections} onChange={setSections} disabled={saving !== null} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Option B · Rich text</p>
              <SaveBtn format="richtext" label="Use this" />
            </div>
            <RichTextEditor initial={rich} onChange={setRich} disabled={saving !== null} />
          </div>
        </div>
      )}
    </div>
  );
}
