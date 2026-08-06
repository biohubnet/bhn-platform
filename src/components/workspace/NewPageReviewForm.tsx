"use client";
/** Opens a review on a URL. Admin-only; rendered above the review tabs. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { normalizeReviewUrl } from "@/lib/page-review/access";

export function NewPageReviewForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      let normalizedUrl: string;
      try {
        normalizedUrl = normalizeReviewUrl(url);
        setUrl(normalizedUrl);
      } catch {
        setError("Enter a valid website address.");
        return;
      }
      const r = await fetch("/api/workspace/page-review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) { setError(j?.error ?? "Couldn't open that review."); return; }
      setUrl("");
      router.push(`/admin/workspace/website-review?r=${j.id}`);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex gap-2 flex-wrap items-start">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => {
            if (!url.trim()) return;
            try { setUrl(normalizeReviewUrl(url)); } catch { /* Validate on submit. */ }
          }}
          placeholder="biohubnet.ca/engage/regulatory-affairs/"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 min-w-[240px] text-sm bg-card border border-line rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          onClick={create} disabled={busy || !url.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Start review
        </button>
      </div>
      {error && <p className="text-xs text-rose-700 mt-2">{error}</p>}
    </section>
  );
}
