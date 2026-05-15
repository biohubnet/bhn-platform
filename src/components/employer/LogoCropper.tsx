"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Wand2, RotateCcw, Move } from "lucide-react";
import {
  type LogoTransform,
  DEFAULT_LOGO_TRANSFORM,
  parseLogoTransform,
  logoTransformCss,
} from "@/lib/employer/logo-transform";
import {
  type LogoShape,
  logoShapeClasses,
} from "@/lib/employer/logo-shape";

/**
 * Inline pan + zoom + auto-fit cropper for the company logo. Lives
 * in the Edit Profile modal underneath the shape picker.
 *
 * Three controls:
 *
 *   1. Auto-fit — loads the image into an off-DOM canvas, scans for
 *      the non-transparent bounding box, computes a transform that
 *      centres the box and scales it to ~88 % of the shape mask.
 *      Works on PNGs / SVGs / WebPs; cross-origin images that block
 *      pixel reads (CORS) silently fall back to "no transform" with
 *      a soft hint.
 *
 *   2. Drag — click and drag inside the preview to pan. The image
 *      is positioned via CSS `transform: translate() scale()` so
 *      panning is purely visual; the underlying URL never changes.
 *
 *   3. Zoom — slider from 0.5× to 3×. Same `scale()` axis as the
 *      drag offset, so the two compose naturally.
 *
 * The cropped result is saved as JSON to `User.companyLogoTransform`
 * via the existing /api/employer/profile PATCH endpoint when the
 * operator clicks Save in the modal — no per-edit network calls.
 */
export function LogoCropper({
  src,
  shape,
  value,
  onChange,
}: {
  src: string | null | undefined;
  shape: LogoShape;
  /** Current transform (or null for default). */
  value: LogoTransform | null;
  /** Fires on every pan / zoom / auto-fit / reset. */
  onChange: (next: LogoTransform) => void;
}) {
  const transform = value ?? DEFAULT_LOGO_TRANSFORM;
  const { containerMask, imageFit } = logoShapeClasses(shape);

  // ── Drag-to-pan ────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseOffsetX: number;
    baseOffsetY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!src) return;
      // Capture the pointer so dragging keeps tracking even if the
      // cursor leaves the preview while panning.
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        baseOffsetX: transform.offsetX,
        baseOffsetY: transform.offsetY,
      };
    },
    [src, transform.offsetX, transform.offsetY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d?.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      onChange({
        ...transform,
        offsetX: d.baseOffsetX + dx,
        offsetY: d.baseOffsetY + dy,
      });
    },
    [onChange, transform],
  );

  const onPointerUp = useCallback(() => {
    if (dragRef.current) dragRef.current.active = false;
  }, []);

  // ── Auto-fit (canvas bbox) ─────────────────────────────────
  const [autoFitting, setAutoFitting] = useState(false);
  const [autoFitNote, setAutoFitNote] = useState<string | null>(null);

  async function autoFit() {
    if (!src) return;
    setAutoFitting(true);
    setAutoFitNote(null);
    try {
      // Load the image into a freshly-allocated <img>. Crossorigin
      // anonymous so we can read pixel data when the host allows it.
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
      if (!loaded) {
        setAutoFitNote("Couldn't load the image — try again or use the manual drag.");
        return;
      }

      const w = loaded.naturalWidth;
      const h = loaded.naturalHeight;
      if (w === 0 || h === 0) {
        setAutoFitNote("Image dimensions unavailable.");
        return;
      }

      // Downscale for the pixel scan — full-res analysis is wasted
      // here, and reduces CPU time on big PNGs.
      const SCAN_MAX = 256;
      const ratio = Math.min(1, SCAN_MAX / Math.max(w, h));
      const sw = Math.max(1, Math.round(w * ratio));
      const sh = Math.max(1, Math.round(h * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setAutoFitNote("Browser doesn't support canvas — try the manual drag.");
        return;
      }
      ctx.drawImage(loaded, 0, 0, sw, sh);

      let pixels: Uint8ClampedArray;
      try {
        pixels = ctx.getImageData(0, 0, sw, sh).data;
      } catch {
        // CORS-tainted canvas — reading is blocked. Fall back.
        setAutoFitNote(
          "Image is hosted with strict CORS, so Auto-fit can't analyse it. Use the drag handle / zoom slider instead.",
        );
        return;
      }

      // Find the bounding box of non-transparent + non-near-white
      // pixels. (Near-white is a soft signal that "this corner is
      // background" — useful for JPEGs without alpha.)
      let minX = sw, minY = sh, maxX = -1, maxY = -1;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 4;
          const a = pixels[i + 3];
          if (a < 12) continue;
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          // Treat near-white as background only if alpha is fully
          // opaque (JPEG-style; PNG transparent pixels already
          // skipped above).
          if (a > 245 && r > 245 && g > 245 && b > 245) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX < 0 || maxY < 0) {
        setAutoFitNote("Couldn't find any opaque pixels — image may be entirely transparent or pure white.");
        return;
      }

      // Translate the scan-space bbox back to original-image space.
      const bbox = {
        x: minX / ratio,
        y: minY / ratio,
        w: (maxX - minX + 1) / ratio,
        h: (maxY - minY + 1) / ratio,
      };

      // Compute the transform that centres the bbox and scales it
      // to ~88 % of the preview's shorter axis. The preview's
      // `<img>` already uses `object-cover` or `object-contain`
      // depending on the shape; auto-fit assumes contain (we
      // override the fit inside the cropper for predictability).
      // 88% leaves a comfortable margin around the brand mark.
      const PADDING = 0.88;
      const fitScale =
        (1 / Math.max(bbox.w / w, bbox.h / h)) * PADDING;

      // Centre offset: the bbox's centre needs to land at the
      // image's centre. After scaling, the bbox shifts away from
      // centre by `(image_centre - bbox_centre) * scale`. We undo
      // that with an equal-and-opposite translate.
      const cx = w / 2;
      const cy = h / 2;
      const bcx = bbox.x + bbox.w / 2;
      const bcy = bbox.y + bbox.h / 2;
      const offsetX = (cx - bcx) * fitScale;
      const offsetY = (cy - bcy) * fitScale;

      onChange({ offsetX, offsetY, scale: fitScale });
    } finally {
      setAutoFitting(false);
    }
  }

  // ── Reset to default ───────────────────────────────────────
  function reset() {
    setAutoFitNote(null);
    onChange(DEFAULT_LOGO_TRANSFORM);
  }

  // ── Defensive: clamp scale on slider change ────────────────
  function setScale(s: number) {
    const safe = parseLogoTransform({ ...transform, scale: s });
    onChange(safe);
  }

  // Clear the auto-fit note whenever the operator interacts with
  // any control afterwards — keeps the surface from looking stuck
  // in a permanent error state.
  useEffect(() => {
    if (!autoFitNote) return;
    const t = setTimeout(() => setAutoFitNote(null), 6000);
    return () => clearTimeout(t);
  }, [autoFitNote]);

  if (!src) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line bg-elevated/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">
          Crop &amp; centre
        </p>
        <p className="text-[10px] text-subtle tabular-nums">
          {Math.round(transform.scale * 100)}%
        </p>
      </div>

      <div className="flex items-start gap-3">
        {/* Live cropper preview — drag to pan. */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={
            "relative w-32 h-32 bg-elevated border border-line overflow-hidden shrink-0 select-none touch-none " +
            containerMask
          }
          style={{ cursor: dragRef.current?.active ? "grabbing" : "grab" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            className={"absolute inset-0 w-full h-full pointer-events-none " + imageFit}
            style={{
              transform: logoTransformCss(transform),
              transformOrigin: "center center",
            }}
          />
          {/* Subtle drag-hint glyph in the corner; fades away once
              the operator has touched the cropper. */}
          <div className="absolute bottom-1 right-1 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fg/70 text-white pointer-events-none">
            <Move size={9} /> drag
          </div>
        </div>

        {/* Controls column */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle w-12 shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={transform.scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-[10px] font-mono tabular-nums text-fg w-10 text-right">
              {transform.scale.toFixed(2)}×
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={autoFit}
              disabled={autoFitting}
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-brand-600/25 transition-colors"
            >
              {autoFitting
                ? <Loader2 size={11} className="animate-spin" />
                : <Wand2 size={11} />}
              {autoFitting ? "Analysing…" : "Auto-fit"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 bg-card-solid hover:bg-elevated border border-line text-fg text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>

          <p className="text-[10px] text-subtle leading-snug">
            <strong className="text-fg">Auto-fit</strong> scans the
            image for the brand mark and centres it inside the shape.
            If it gets it wrong, drag the preview to nudge or use the
            zoom slider — your manual changes save with the rest.
          </p>

          {autoFitNote && (
            <p className="text-[10px] text-amber-700 leading-snug">
              {autoFitNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
