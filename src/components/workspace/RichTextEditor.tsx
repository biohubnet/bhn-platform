"use client";

/**
 * Rich-text WYSIWYG editor (Option B), TipTap + StarterKit. Emits a TipTap
 * JSON document on every change; the parent (ScriptStudio) owns the doc + the
 * Save action. `immediatelyRender: false` keeps SSR/hydration clean in Next.
 */
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Undo2, Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RichDoc = Record<string, unknown>;

const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({
  initial,
  onChange,
  disabled,
}: {
  initial: RichDoc | null;
  onChange: (doc: RichDoc) => void;
  disabled?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initial ?? EMPTY_DOC,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDoc),
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] px-4 py-3 text-sm leading-relaxed text-fg focus:outline-none " +
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 " +
          "[&_p]:my-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 " +
          "[&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-muted",
      },
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return <div className="rounded-xl border border-line bg-card-solid px-4 py-3 text-sm text-muted">Loading editor…</div>;

  const Btn = ({ on, active, title, children }: { on: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-elevated disabled:opacity-40",
        active && "bg-brand-50 text-brand-700",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-line bg-card-solid">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
        <Btn on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={14} /></Btn>
        <span className="mx-1 h-4 w-px bg-line" />
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading"><Heading2 size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Sub-heading"><Heading3 size={14} /></Btn>
        <span className="mx-1 h-4 w-px bg-line" />
        <Btn on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={14} /></Btn>
        <Btn on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote"><Quote size={14} /></Btn>
        <span className="mx-1 h-4 w-px bg-line" />
        <Btn on={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 size={14} /></Btn>
        <Btn on={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 size={14} /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
