"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Sparkles, Loader2, AlertCircle, X, Save, ChevronDown, Globe, CheckCircle2,
  Upload, Image as ImageIcon,
} from "lucide-react";
import { normalizeLogoShape, logoShapeClasses } from "@/lib/employer/logo-shape";
import {
  parseLogoTransform,
  isIdentityTransform,
  logoTransformCss,
  type LogoTransform,
} from "@/lib/employer/logo-transform";
import { LogoCropper } from "@/components/employer/LogoCropper";

interface Profile {
  employerCompany: string | null;
  companyWebsite: string | null;
  companyLogo: string | null;
  /** Mask shape applied to the logo wherever it renders. One of:
   *  "" | "natural" | "circle" | "rounded" | "square". null === ""
   *  === natural fallback. */
  companyLogoShape: string | null;
  /** Pan + zoom transform applied INSIDE the shape mask. JSON
   *  `{ offsetX, offsetY, scale }`. null = default identity. */
  companyLogoTransform: unknown;
  companyIndustry: string | null;
  companySize: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyFounded: string | null;
}

export type LogoShape = "natural" | "circle" | "rounded" | "square";
const LOGO_SHAPES: { key: LogoShape; label: string }[] = [
  { key: "natural", label: "Natural" },
  { key: "circle",  label: "Circle" },
  { key: "rounded", label: "Rounded" },
  { key: "square",  label: "Square" },
];

const COMPANY_SIZES = [
  "", "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
] as const;

/**
 * Trigger + modal for editing the company profile.
 *
 * The /employer home page leads with display surfaces (cover banner,
 * identity card, stats, postings preview). The edit form used to live
 * at the bottom of the page in an accordion; that pushed the polished
 * surfaces below the fold once it was open.
 *
 * Now: a small pencil button sits at the top of the page next to the
 * "Live" status tag. Clicking it opens this modal which leads with
 * the URL auto-fill — that's the path 95% of employers should take
 * (paste site → AI extracts industry / HQ / size / founded / logo /
 * description in one round trip). Manual field editing is still
 * available below a disclosure for power-tweaks.
 */
export function EditProfileTrigger({
  initial,
  variant = "icon",
}: {
  initial: Partial<Profile>;
  /** "icon"   — small icon-only pencil button (top-corner pairing).
   *  "button" — labelled "Edit profile" button (empty-state hero CTA). */
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full bg-card text-fg ring-1 ring-inset ring-line hover:bg-elevated hover:ring-brand-300 hover:text-brand-700 transition-colors"
          aria-label="Edit company profile"
        >
          <Pencil size={11} /> Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/25 transition-colors"
        >
          <Sparkles size={14} /> Set up your profile with one URL
        </button>
      )}

      {open && (
        <EditProfileModal
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditProfileModal({
  initial,
  onClose,
}: {
  initial: Partial<Profile>;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  // ─── Form state ─────────────────────────────────────────────
  const [values, setValues] = useState<Profile>({
    employerCompany:      initial.employerCompany    ?? "",
    companyWebsite:       initial.companyWebsite     ?? "",
    companyLogo:          initial.companyLogo        ?? "",
    companyLogoShape:     initial.companyLogoShape   ?? "",
    companyLogoTransform: initial.companyLogoTransform ?? null,
    companyIndustry:      initial.companyIndustry    ?? "",
    companySize:          initial.companySize        ?? "",
    companyLocation:      initial.companyLocation    ?? "",
    companyDescription:   initial.companyDescription ?? "",
    companyFounded:       initial.companyFounded     ?? "",
  });
  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setValues((cur) => ({ ...cur, [k]: v }));
    setSaved(false);
  }

  const [autoFilling, setAutoFilling] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ─── Logo state ─────────────────────────────────────────────
  // Three flows live on the same field, in priority order from the
  // operator's perspective:
  //   1. Search the company website for legit candidates (primary)
  //   2. Pick a different candidate from the search results / search
  //      again if none feel right
  //   3. Upload a file (last resort)
  // We never auto-pick a result from search — the operator has to
  // explicitly click a candidate to set it as the current logo. That
  // keeps "what you see" === "what gets saved".
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSearching, setLogoSearching] = useState(false);
  const [logoCandidates, setLogoCandidates] = useState<
    { url: string; source: string; score: number }[]
  >([]);
  const [logoSearchMsg, setLogoSearchMsg] = useState<string | null>(null);
  // Search attempt counter — each "Search again" click increments
  // this and the endpoint widens the crawl (homepage → /about → /press
  // → /contact → /media …) so subsequent searches actually find
  // different candidates instead of returning the same homepage
  // signals every time.
  const [logoSearchAttempt, setLogoSearchAttempt] = useState(0);

  // Cache-bust the preview so the new image renders immediately after
  // upload (the new URL is short-lived in the browser cache otherwise).
  const [logoBust, setLogoBust] = useState(0);
  const logoPreviewSrc = values.companyLogo
    ? `${values.companyLogo}${values.companyLogo.includes("?") ? "&" : "?"}t=${logoBust}`
    : "";

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setLogoError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/employer/profile/logo", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !j.url) {
        setLogoError(j.error ?? "Upload failed.");
        return;
      }
      // The endpoint persisted companyLogo already; reflect that in
      // local form state and cache-bust the preview. Reset the
      // crop transform because a fresh upload starts from scratch.
      setValues((cur) => ({
        ...cur,
        companyLogo: j.url ?? cur.companyLogo,
        companyLogoTransform: null,
      }));
      setLogoBust(Date.now());
      setSaved(false);
    } finally {
      setLogoUploading(false);
    }
  }

  async function searchLogos() {
    if (!values.companyWebsite?.trim()) {
      setLogoSearchMsg("Add your company website first.");
      return;
    }
    setLogoSearching(true);
    setLogoSearchMsg(null);
    setLogoError(null);
    // Bump the attempt counter so each re-search widens the crawl.
    const nextAttempt = logoSearchAttempt + (logoCandidates.length > 0 ? 1 : 0);
    setLogoSearchAttempt(nextAttempt);
    try {
      const res = await fetch("/api/employer/profile/logo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: values.companyWebsite,
          attempt: nextAttempt,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        best?: string | null;
        candidates?: { url: string; source: string; score: number }[];
        favicon?: string;
        pagesScanned?: string[];
        error?: string;
      };
      if (!res.ok) {
        setLogoSearchMsg(j.error ?? "Search failed.");
        return;
      }
      const list = j.candidates ?? [];
      setLogoCandidates(list);
      if (list.length === 0) {
        setLogoSearchMsg(
          "Couldn't find a logo on the homepage. Try again, paste a URL into the override field below, or upload a file.",
        );
      } else {
        setLogoSearchMsg(null);
        // Pre-pick the best one (top score) but only if the user
        // doesn't already have a logo set — never silently overwrite
        // a result they previously chose.
        if (!values.companyLogo && j.best) {
          setValues((cur) => ({ ...cur, companyLogo: j.best ?? cur.companyLogo }));
          setLogoBust(Date.now());
          setSaved(false);
        }
      }
    } finally {
      setLogoSearching(false);
    }
  }

  function pickCandidate(url: string) {
    // Different image → existing crop transform (tuned for the old
    // image's bbox) no longer makes sense. Reset to identity; the
    // operator can re-run Auto-fit on the new logo.
    setValues((cur) => ({
      ...cur,
      companyLogo: url,
      companyLogoTransform: null,
    }));
    setLogoBust(Date.now());
    setSaved(false);
    setLogoError(null);
  }

  function clearLogo() {
    setValues((cur) => ({
      ...cur,
      companyLogo: "",
      companyLogoTransform: null,
    }));
    setLogoError(null);
    setSaved(false);
  }

  // ─── Escape / click-outside to close ────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stopBackdrop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // ─── Auto-fill ──────────────────────────────────────────────
  async function autoFill() {
    if (!values.companyWebsite?.trim()) {
      setAutoError("Add your company website first.");
      return;
    }
    setAutoFilling(true);
    setAutoError(null);
    setAutoFilled(false);
    try {
      const res = await fetch("/api/employer/profile/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: values.companyWebsite }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        profile?: Partial<Profile> & { companyName?: string };
        error?: string;
      };
      if (!res.ok || !j.profile) {
        setAutoError(j.error ?? "Couldn't fetch.");
        return;
      }
      // Two modes:
      //   • First Auto-fill (autoFilled === false): merge with what
      //     the operator already typed. Empty fields only — never
      //     overwrite their work.
      //   • Re-fetch (autoFilled === true): the operator has already
      //     seen the AI result once and clicked again. They want a
      //     clean refresh — overwrite every field the AI returned a
      //     value for, leaving only fields the AI couldn't answer
      //     untouched. Their previous edits get replaced, which is
      //     the whole point of "Re-fetch".
      const isReFetch = autoFilled;
      setValues((cur) => {
        const pick = (
          existing: string | null | undefined,
          fresh: string | null | undefined,
        ): string => {
          const e = (existing ?? "").trim();
          const f = (fresh ?? "").trim();
          // Re-fetch: AI value wins (existing only if AI was empty).
          // First fill: existing wins (AI only fills blank slots).
          return isReFetch ? f || e : e || f;
        };
        return {
          ...cur,
          employerCompany:    pick(cur.employerCompany,    j.profile!.companyName),
          companyLogo:        pick(cur.companyLogo,        j.profile!.companyLogo),
          companyIndustry:    pick(cur.companyIndustry,    j.profile!.companyIndustry),
          companySize:        pick(cur.companySize,        j.profile!.companySize),
          companyLocation:    pick(cur.companyLocation,    j.profile!.companyLocation),
          companyDescription: pick(cur.companyDescription, j.profile!.companyDescription),
          companyFounded:     pick(cur.companyFounded,     j.profile!.companyFounded),
          companyWebsite:     j.profile!.companyWebsite || cur.companyWebsite,
        };
      });
      setAutoFilled(true);
      // Surface the manual section after auto-fill so the operator
      // can immediately scan the result and tweak anything wrong.
      setManualOpen(true);
      // Re-fetch invalidates the previously-chosen logo candidates —
      // the website might have changed; clear the grid and re-search.
      if (isReFetch) {
        setLogoCandidates([]);
        setLogoSearchAttempt(0);
      }
    } finally {
      setAutoFilling(false);
    }
  }

  // ─── Save ───────────────────────────────────────────────────
  // After PATCH succeeds we hard-reload the page rather than rely on
  // Next.js soft refresh. router.refresh() worked in dev but landed
  // some users on a "page can't be loaded" overlay on Vercel when
  // the RSC payload fetch raced the modal-close timeout. A full
  // reload is bulletproof and the perceived UX is only a couple
  // hundred ms slower.
  async function save({ closeOnSuccess }: { closeOnSuccess: boolean }) {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/employer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSaveError(j.error ?? "Save failed.");
        return;
      }
      setSaved(true);
      if (closeOnSuccess) {
        // Brief green-state flash, then hard reload — modal disappears
        // as part of the reload.
        setTimeout(() => {
          window.location.reload();
        }, 400);
      } else {
        // Inline save (no close) — still want surfaces to reflect.
        router.refresh();
      }
    } catch (err) {
      setSaveError((err as Error).message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // Fully opaque card-solid bg so inputs don't show the page behind
  // the modal — pairs with the outer dialog using bg-card-solid too.
  const inputCls =
    "w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop p-4 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div
        ref={dialogRef}
        onClick={stopBackdrop}
        className="bg-card-solid rounded-3xl border border-line w-full max-w-2xl my-8 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 sm:px-8 pt-6 pb-4 border-b border-line">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              Company profile
            </p>
            <h2 id="edit-profile-title" className="text-xl sm:text-2xl font-bold text-fg tracking-tight mt-0.5">
              Edit your company profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-fg hover:bg-elevated rounded-lg p-1.5 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── HERO: URL auto-fill ─────────────────────────────── */}
        {/* The whole point of the modal — make the URL-auto-fill
            path obvious and one click. Field is full-width with a
            big brand button. Helper copy explains exactly what
            fields the AI will fill in. */}
        <section className="relative px-6 sm:px-8 py-6 overflow-hidden">
          {/* Subtle aurora wash behind the field for moment-of-glow */}
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.6), rgba(59,130,246,0) 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-12 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(closest-side, rgba(244,114,182,0.55), rgba(244,114,182,0) 70%)",
            }}
          />

          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-brand-700 mb-2 inline-flex items-center gap-1.5">
              <Sparkles size={11} /> Fastest path
            </p>
            <h3 className="text-base sm:text-lg font-bold text-fg leading-tight">
              Drop in your URL — we&apos;ll fill the rest.
            </h3>
            <p className="text-xs text-muted mt-1 leading-snug">
              AI fetches your homepage and extracts your <strong className="text-fg">industry, HQ, size, founding year, logo, and a short description</strong> in one round trip. Anything you&apos;ve already typed stays untouched.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  value={values.companyWebsite ?? ""}
                  onChange={(e) => set("companyWebsite", e.target.value)}
                  placeholder="acme-bio.com"
                  className={`${inputCls} pl-9 text-base py-2.5`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !autoFilling && values.companyWebsite?.trim()) {
                      autoFill();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={autoFill}
                disabled={autoFilling || !values.companyWebsite?.trim()}
                className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/25 shrink-0"
              >
                {autoFilling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {autoFilled ? "Re-fetch" : autoFilling ? "Fetching…" : "Auto-fill"}
              </button>
            </div>

            {autoError && (
              <div className="mt-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {autoError}
              </div>
            )}
            {autoFilled && !autoError && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2 flex items-start gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                Pre-filled what we found. Review below and save — anything wrong is one tweak away.
              </div>
            )}
          </div>
        </section>

        {/* ── Manual disclosure ───────────────────────────────── */}
        <section className="border-t border-line">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
            className="w-full flex items-center justify-between gap-3 px-6 sm:px-8 py-3 hover:bg-elevated transition-colors"
          >
            <span className="text-sm font-semibold text-fg inline-flex items-center gap-2">
              <Pencil size={13} className="text-muted" />
              Tweak any field manually
            </span>
            <span className="text-[11px] text-subtle">
              {manualOpen ? "Hide" : "Show"} all fields
              <ChevronDown
                size={14}
                className={
                  "inline-block ml-1.5 transition-transform " +
                  (manualOpen ? "rotate-180" : "")
                }
              />
            </span>
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: manualOpen ? "1fr" : "0fr" }}
            aria-hidden={!manualOpen}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="px-6 sm:px-8 pb-5 pt-1 space-y-4">
                <Field label="Company name" required>
                  <input
                    value={values.employerCompany ?? ""}
                    onChange={(e) => set("employerCompany", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Industry">
                    <input
                      value={values.companyIndustry ?? ""}
                      onChange={(e) => set("companyIndustry", e.target.value)}
                      placeholder="Cell & gene therapy"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Company size">
                    <select
                      value={values.companySize ?? ""}
                      onChange={(e) => set("companySize", e.target.value)}
                      className={inputCls}
                    >
                      {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
                    </select>
                  </Field>
                  <Field label="HQ location">
                    <input
                      value={values.companyLocation ?? ""}
                      onChange={(e) => set("companyLocation", e.target.value)}
                      placeholder="Toronto, ON"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Founded">
                    <input
                      value={values.companyFounded ?? ""}
                      onChange={(e) => set("companyFounded", e.target.value)}
                      placeholder="2018"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Short description">
                  <textarea
                    value={values.companyDescription ?? ""}
                    onChange={(e) => set("companyDescription", e.target.value)}
                    rows={3}
                    placeholder="2-4 sentences. What you make, who it's for, what stage you're at."
                    className={`${inputCls} resize-y`}
                  />
                </Field>
                <Field label="Logo">
                  {/* Flow:
                      1. Current logo preview (with × to clear)
                      2. Find / re-search candidates from the website
                      3. Candidate grid — operator picks one
                      4. Upload file (last resort, behind a disclosure)
                      The order matters: searching is first because the
                      AI is much better at finding a real logo than the
                      operator is at finding a file. Upload is the
                      escape hatch when search comes up dry. */}

                  {/* Shape resolved once for this render — drives the
                      live-preview mask in the picker and the candidate
                      grid below, plus tells the renderer downstream
                      how to mask the logo on the live profile. */}
                  {/* ── 1. Current logo preview ─────────────────── */}
                  <div className="flex items-start gap-3">
                    {(() => {
                      const shape = normalizeLogoShape(values.companyLogoShape);
                      const { containerMask, imageFit } = logoShapeClasses(shape);
                      const xform = parseLogoTransform(values.companyLogoTransform);
                      const xformStyle = isIdentityTransform(xform)
                        ? undefined
                        : { transform: logoTransformCss(xform), transformOrigin: "center center" as const };
                      return (
                        <div
                          className={
                            "relative w-20 h-20 bg-elevated border border-line flex items-center justify-center overflow-hidden shrink-0 group/preview " +
                            containerMask
                          }
                        >
                          {values.companyLogo ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                key={logoPreviewSrc}
                                src={logoPreviewSrc}
                                alt=""
                                className={
                                  "w-full h-full p-1.5 " + imageFit
                                }
                                style={xformStyle}
                                onError={(e) => {
                                  // Hide the broken image so the glyph
                                  // fallback below takes over.
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <ImageIcon
                                size={24}
                                className="absolute inset-0 m-auto text-subtle pointer-events-none -z-0"
                              />
                              {/* Remove (X) — top-right of the tile.
                                  Only shows on hover so it doesn't
                                  compete with the preview at rest. */}
                              <button
                                type="button"
                                onClick={clearLogo}
                                aria-label="Remove current logo"
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white shadow-md flex items-center justify-center opacity-0 group-hover/preview:opacity-100 focus:opacity-100 transition-opacity"
                              >
                                <X size={11} />
                              </button>
                            </>
                          ) : (
                            <ImageIcon size={24} className="text-subtle" />
                          )}
                        </div>
                      );
                    })()}

                    {/* ── 2. Primary action: search the website ──── */}
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={searchLogos}
                        disabled={logoSearching || !values.companyWebsite?.trim()}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm shadow-brand-600/25 transition-colors"
                      >
                        {logoSearching
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Sparkles size={12} />}
                        {logoSearching
                          ? "Searching…"
                          : logoCandidates.length > 0
                            ? "Search again"
                            : values.companyLogo
                              ? "Find a different logo"
                              : "Find logo from website"}
                      </button>
                      <p className="text-[10px] text-subtle mt-1.5 leading-snug">
                        Scans your homepage for{" "}
                        <span className="font-semibold text-fg">og:logo</span>, the Apple
                        touch icon, schema.org metadata, header images
                        tagged as logos, etc. Pick from the results
                        below — or upload a file at the bottom.
                      </p>
                    </div>
                  </div>

                  {logoSearchMsg && (
                    <p
                      className={
                        "mt-2 text-[11px] inline-flex items-start gap-1.5 " +
                        (logoSearchMsg.toLowerCase().includes("couldn't") ||
                         logoSearchMsg.toLowerCase().includes("fail") ||
                         logoSearchMsg.toLowerCase().includes("first")
                          ? "text-rose-700"
                          : "text-emerald-700")
                      }
                    >
                      <AlertCircle size={11} className="mt-px shrink-0" />
                      <span>{logoSearchMsg}</span>
                    </p>
                  )}

                  {/* ── 3. Candidate grid ────────────────────────── */}
                  {logoCandidates.length > 0 && (
                    <div className="mt-3 rounded-xl border border-line bg-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-2 inline-flex items-center gap-1.5">
                        <Sparkles size={10} className="text-brand-600" />
                        AI found {logoCandidates.length} candidate{logoCandidates.length === 1 ? "" : "s"} · click to pick
                      </p>
                      <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {logoCandidates.map((c, i) => {
                          const isPicked = values.companyLogo === c.url;
                          const isBest = i === 0;
                          return (
                            <li key={c.url}>
                              <button
                                type="button"
                                onClick={() => pickCandidate(c.url)}
                                title={`${c.source} · score ${Math.round(c.score)}`}
                                className={
                                  "group/cand relative block w-full aspect-square rounded-lg bg-card-solid border-2 overflow-hidden transition-all " +
                                  (isPicked
                                    ? "border-brand-600 ring-2 ring-brand-500/30"
                                    : "border-line hover:border-brand-300")
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={c.url}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-contain p-1.5"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                {/* Best-pick badge */}
                                {isBest && (
                                  <span className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded bg-brand-600 text-white shadow-sm">
                                    Best
                                  </span>
                                )}
                                {/* Picked check */}
                                {isPicked && (
                                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm">
                                    <CheckCircle2 size={10} />
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="text-[10px] text-subtle mt-2 leading-snug">
                        Not happy with these? Click <em>Search again</em> above, paste a URL into the override field below, or upload a file.
                      </p>
                    </div>
                  )}

                  {/* ── Shape picker ─────────────────────────────
                      Tucked between the candidate grid and the manual-
                      override disclosure. Only matters once the user
                      has a logo set, so we gate on that — fresh forms
                      stay uncluttered. */}
                  {values.companyLogo && (
                    <div className="mt-3 rounded-xl border border-line bg-elevated/40 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-2">
                        Logo shape
                      </p>
                      <div className="flex flex-wrap items-stretch gap-2">
                        {LOGO_SHAPES.map((s) => {
                          const isPicked =
                            normalizeLogoShape(values.companyLogoShape) === s.key;
                          const { containerMask, imageFit } = logoShapeClasses(s.key);
                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() => set("companyLogoShape", s.key)}
                              className={
                                "group/shape relative flex flex-col items-center gap-1.5 p-2 rounded-lg ring-1 ring-inset transition-colors " +
                                (isPicked
                                  ? "bg-brand-50 ring-brand-500 text-brand-800"
                                  : "bg-card-solid ring-line hover:ring-brand-300 text-muted hover:text-fg")
                              }
                              aria-pressed={isPicked}
                            >
                              {/* Mini live preview in the chosen shape */}
                              <span
                                className={
                                  "w-9 h-9 bg-elevated border border-line overflow-hidden flex items-center justify-center " +
                                  containerMask
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={logoPreviewSrc}
                                  alt=""
                                  className={"w-full h-full " + imageFit}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider">
                                {s.label}
                              </span>
                              {isPicked && (
                                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm">
                                  <CheckCircle2 size={9} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-subtle mt-2 leading-snug">
                        How the logo is masked on your /employer page
                        and on every internship posting. <em>Natural</em>{" "}
                        keeps the original image contained in a circle disc;
                        the other three crop it.
                      </p>
                    </div>
                  )}

                  {/* ── Cropper: pan / zoom / auto-fit ────────────
                      Lives between the shape picker and the manual-
                      override disclosure. Only renders when a logo
                      is set — the cropper has nothing to crop
                      otherwise. */}
                  {values.companyLogo && (
                    <div className="mt-3">
                      <LogoCropper
                        src={values.companyLogo}
                        shape={normalizeLogoShape(values.companyLogoShape)}
                        value={parseLogoTransform(values.companyLogoTransform)}
                        onChange={(next) => {
                          setValues((cur) => ({
                            ...cur,
                            companyLogoTransform: next,
                          }));
                          setSaved(false);
                        }}
                      />
                    </div>
                  )}

                  {/* ── 4. Last-resort: URL paste + file upload ─── */}
                  <details className="mt-3 rounded-lg border border-line bg-card-solid">
                    <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-muted hover:text-fg inline-flex items-center gap-1.5 select-none w-full">
                      <Upload size={11} />
                      Manual override (paste URL or upload file)
                      <ChevronDown size={11} className="ml-auto transition-transform [details[open]_&]:rotate-180" />
                    </summary>
                    <div className="px-3 pb-3 space-y-2 border-t border-line pt-3">
                      <input
                        type="url"
                        value={values.companyLogo ?? ""}
                        onChange={(e) => set("companyLogo", e.target.value)}
                        placeholder="https://your-site.com/logo.svg"
                        className={`${inputCls} text-xs py-1.5`}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0];
                          if (f) uploadLogo(f);
                          e.currentTarget.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-card-solid hover:bg-elevated border border-line text-fg text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {logoUploading
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Upload size={12} />}
                        {logoUploading ? "Uploading…" : "Upload PNG / JPG / SVG (up to 2 MB)"}
                      </button>
                    </div>
                  </details>

                  {logoError && (
                    <p className="mt-2 text-[11px] text-rose-700 inline-flex items-center gap-1.5">
                      <AlertCircle size={11} /> {logoError}
                    </p>
                  )}
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer: save / cancel ─────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-line bg-elevated/40">
          <div className="min-w-0">
            {saveError && (
              <p className="text-xs text-rose-700 inline-flex items-center gap-1.5">
                <AlertCircle size={12} /> {saveError}
              </p>
            )}
            {saved && !saveError && (
              <p className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Saved.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted hover:text-fg hover:bg-elevated px-3 py-2 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save({ closeOnSuccess: true })}
              disabled={saving}
              className="text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-brand-600/25"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] font-bold text-subtle mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-0.5 normal-case">*</span>}
      </span>
      {children}
    </label>
  );
}
