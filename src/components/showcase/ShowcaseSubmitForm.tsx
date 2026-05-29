"use client";

/**
 * ShowcaseSubmitForm — public form on /showcase/<programSlug>.
 *
 * State machine:
 *   idle      → user filling in fields
 *   submitting→ FormData POST in flight to /api/showcase/submit
 *   success   → submission confirmed, show thank-you panel
 *   error     → server returned an error, message rendered below
 *
 * The photo preview uses a local object URL so the user can see
 * what they're uploading before they hit submit. We revoke the URL
 * on unmount to avoid leaking blob URLs.
 */

import { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle2, Loader2, AlertCircle, Upload } from "lucide-react";

interface Props {
  programSlug: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function ShowcaseSubmitForm({ programSlug }: Props) {
  const [name, setName] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local preview URL — revoke on cleanup.
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      return;
    }
    // Local client-side gate — mirrors the server's MAX_PHOTO_BYTES.
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`Photo must be under 5 MB. Yours is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      e.target.value = "";
      return;
    }
    setErrorMsg(null);
    setPhotoFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !linkedin.trim() || !photoFile) {
      setErrorMsg("Fill in all three fields — name, LinkedIn, and headshot.");
      return;
    }

    const fd = new FormData();
    fd.set("programSlug", programSlug);
    fd.set("name", name.trim());
    fd.set("linkedin", linkedin.trim());
    fd.set("photo", photoFile);

    setStatus("submitting");
    try {
      const res = await fetch("/api/showcase/submit", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setStatus("error");
        setErrorMsg(j.error ?? `Submission failed (HTTP ${res.status}).`);
        return;
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error — try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <CheckCircle2 className="h-12 w-12 mb-3" style={{ color: "#67b094" }} />
        <h3 className="text-[18px] font-semibold text-fg">Submitted — thank you.</h3>
        <p className="mt-2 text-[13px] text-fg-muted max-w-sm">
          We&apos;ll review your entry and you&apos;ll see yourself on the showcase shortly. If anything looks off, the team will reach out.
        </p>
        <button
          type="button"
          onClick={() => {
            setName("");
            setLinkedin("");
            setPhotoFile(null);
            setStatus("idle");
          }}
          className="mt-5 text-[12px] font-semibold underline"
          style={{ color: "#0e7da3" }}
        >
          Submit another
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
          Your name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          autoComplete="name"
          placeholder="e.g. Priya Iyer"
          disabled={submitting}
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
        />
      </div>

      {/* LinkedIn */}
      <div>
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
          LinkedIn handle
        </label>
        <input
          type="text"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          required
          maxLength={200}
          placeholder="e.g. priya-iyer-1234 or linkedin.com/in/priya-iyer-1234"
          disabled={submitting}
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
        />
        <p className="mt-1 text-[11px] text-fg-subtle">
          Just the slug works — we&apos;ll fill in the rest.
        </p>
      </div>

      {/* Photo */}
      <div>
        <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-1">
          Headshot
        </label>
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div
            className="shrink-0 w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center"
            style={{
              borderColor: photoPreview ? "#67b094" : "var(--line)",
              backgroundColor: photoPreview ? "transparent" : "var(--elevated)",
            }}
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Headshot preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="h-7 w-7 text-fg-subtle" />
            )}
          </div>

          {/* Upload button + helper */}
          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              disabled={submitting}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-white text-[12px] font-semibold text-fg hover:bg-elevated disabled:opacity-50"
            >
              <Upload size={12} />
              {photoFile ? "Choose a different photo" : "Choose photo"}
            </button>
            {photoFile && (
              <p className="mt-1 text-[11px] text-fg-subtle truncate">
                {photoFile.name} — {(photoFile.size / 1024).toFixed(0)} KB
              </p>
            )}
            <p className="mt-1 text-[11px] text-fg-subtle leading-relaxed">
              JPEG, PNG, or WebP. Under 5 MB. Square photos work best.
            </p>
          </div>
        </div>
      </div>

      {/* Error.
          text-[#881337] (rose-900 literal), NOT the `text-rose-900`
          utility: globals.css redefines `.text-rose-900` per dark theme
          to a LIGHT shade (hitech #fca5a5, dryice #fecdd3, …) for
          contrast on dark cards. Those rules match via the <html>
          [data-theme] ancestor, so the page-level `data-theme="light"`
          pin can't neutralise them — light-rose text would land on this
          light bg-rose-50 box. An arbitrary-value class has no per-theme
          override, so the error stays dark-on-light for every visitor. */}
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-200 px-3 py-2 text-[12px] text-[#881337]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-[14px] font-semibold disabled:opacity-50"
          style={{
            background: "linear-gradient(90deg, #2a6d7a 0%, #0e7da3 100%)",
          }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? "Submitting…" : "Submit my entry"}
        </button>
      </div>
    </form>
  );
}
