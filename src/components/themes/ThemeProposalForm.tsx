"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { PROPOSAL_LIMITS } from "@/lib/themes/constants";
import { cn } from "@/lib/utils";

/**
 * Theme proposal submission form.
 *
 * Validates client-side against the same length limits the server
 * enforces (PROPOSAL_LIMITS in src/lib/themes/constants.ts). Live
 * char counters give the user immediate feedback. On success, the
 * form clears and the page refreshes so the new proposal shows up
 * in "Your proposals" without a full reload.
 */
export function ThemeProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inspiration, setInspiration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const titleLen = title.trim().length;
  const descLen = description.trim().length;
  const inspLen = inspiration.trim().length;

  const titleValid =
    titleLen >= PROPOSAL_LIMITS.title.min && titleLen <= PROPOSAL_LIMITS.title.max;
  const descValid =
    descLen >= PROPOSAL_LIMITS.description.min &&
    descLen <= PROPOSAL_LIMITS.description.max;
  const inspValid = inspLen <= PROPOSAL_LIMITS.inspiration.max;
  const canSubmit = titleValid && descValid && inspValid && !busy;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/themes/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          inspiration: inspiration.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Submission failed");
      }
      setTitle("");
      setDescription("");
      setInspiration("");
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 surface-shadow">
      <header className="mb-4">
        <h2 className="text-base font-bold text-fg tracking-tight inline-flex items-center gap-2">
          <Sparkles size={14} className="text-brand-600" />
          Got a theme idea?
        </h2>
        <p className="text-xs text-muted mt-1 leading-snug">
          Pitch a new theme. An admin reviews every proposal. If your idea
          ships, you earn a Theme Designer Bundle — pickup at the BHN office
          (or mailing on request).
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Title"
          counterValue={titleLen}
          counterMin={PROPOSAL_LIMITS.title.min}
          counterMax={PROPOSAL_LIMITS.title.max}
          valid={titleLen === 0 || titleValid}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Citrus Grove, Lab Bench, Aurora"
            maxLength={PROPOSAL_LIMITS.title.max + 5}
            className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/60"
            disabled={busy}
          />
        </Field>

        <Field
          label="Describe the mood / palette / use case"
          counterValue={descLen}
          counterMin={PROPOSAL_LIMITS.description.min}
          counterMax={PROPOSAL_LIMITS.description.max}
          valid={descLen === 0 || descValid}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does the theme look like? What's the vibe? When would you use it? Markdown OK."
            rows={5}
            maxLength={PROPOSAL_LIMITS.description.max + 50}
            className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/60 resize-y"
            disabled={busy}
          />
        </Field>

        <Field
          label="Inspiration (optional)"
          counterValue={inspLen}
          counterMin={0}
          counterMax={PROPOSAL_LIMITS.inspiration.max}
          valid={inspValid}
        >
          <input
            type="text"
            value={inspiration}
            onChange={(e) => setInspiration(e.target.value)}
            placeholder="Paste a hex palette, a reference link, or a one-line mood tag"
            maxLength={PROPOSAL_LIMITS.inspiration.max + 5}
            className="w-full px-3 py-2 rounded-lg bg-card border border-line text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/60"
            disabled={busy}
          />
        </Field>

        {error && (
          <div className="inline-flex items-start gap-2 text-xs text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 rounded-lg px-3 py-2">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="inline-flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={11} className="mt-0.5 shrink-0" />
            Submitted. An admin will review and reply on this page.
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {busy ? "Submitting…" : "Submit proposal"}
          </button>
          <span className="text-[11px] text-subtle">
            We typically review within a week.
          </span>
        </div>
      </form>
    </section>
  );
}

function Field({
  label, counterValue, counterMin, counterMax, valid, children,
}: {
  label: string;
  counterValue: number;
  counterMin: number;
  counterMax: number;
  valid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-semibold text-fg">{label}</label>
        <span
          className={cn(
            "text-[10px] font-mono tabular-nums",
            !valid ? "text-rose-700" : "text-subtle",
          )}
        >
          {counterValue}/{counterMax}
          {counterMin > 0 && counterValue < counterMin && (
            <span className="ml-1 text-rose-700">(min {counterMin})</span>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
