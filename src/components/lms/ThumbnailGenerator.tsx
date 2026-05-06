"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageIcon, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";

interface Props {
  /** API endpoint to POST to. Server returns { url, prompt }. */
  endpoint: string;
  /** Current thumbnail URL, if any. */
  currentUrl: string | null;
  /** Compact button when sitting in a corner; full when prominent. */
  compact?: boolean;
}

/**
 * AI-generates a thumbnail by POSTing to `endpoint`. Server is responsible
 * for building the prompt, calling the model, uploading to R2, and saving
 * the URL on the course/pathway. UI just renders the modal + previews.
 */
export function ThumbnailGenerator({ endpoint, currentUrl, compact }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: customPrompt.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Generation failed");
        return;
      }
      setPreviewUrl(j.url);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={compact ? "outline" : "secondary"}
        size={compact ? "sm" : "md"}
      >
        <Sparkles size={13} />
        {currentUrl ? "Regenerate thumbnail" : "AI thumbnail"}
      </Button>

      <Modal
        open={open}
        onClose={close}
        size="md"
        title="Generate AI thumbnail"
        description="A clean, abstract image generated from this card's title and description. Free-tier Cloudflare Workers AI runs the model in seconds."
        footer={
          <>
            <Button variant="ghost" onClick={close}>{previewUrl ? "Done" : "Cancel"}</Button>
            <Button onClick={generate} loading={busy}>
              {previewUrl ? <RefreshCw size={13} /> : <Sparkles size={13} />}
              {previewUrl ? "Regenerate" : "Generate"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="aspect-[16/9] w-full bg-elevated rounded-2xl overflow-hidden flex items-center justify-center relative">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Generated thumbnail"
                fill
                sizes="(max-width: 600px) 100vw, 600px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="text-center text-subtle">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No thumbnail yet — click Generate.</p>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 bg-card-solid/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted">Generating…</p>
              </div>
            )}
          </div>

          <Field
            label="Custom prompt"
            hint="Leave empty to auto-derive from the title and description. Avoid asking for text."
          >
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. minimal abstract microscope view, soft blue gradient, no text"
            />
          </Field>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
