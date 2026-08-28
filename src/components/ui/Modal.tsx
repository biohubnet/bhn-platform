"use client";
import { ReactNode, useEffect, useId, useRef, useState, PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /**
   * Accessible name when there is no `title`, or when `title` is a node
   * whose flattened text does not describe the dialog. Ignored when
   * `title` is present — the rendered heading is the better name because
   * it cannot drift out of sync with what the user sees.
   */
  ariaLabel?: string;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Show a corner grip and let the user drag-resize the dialog. Drag-to-move via the header is always on. */
  resizable?: boolean;
  children: ReactNode;
}

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const MIN_W = 360;
const MIN_H = 280;

/**
 * Floating dialog. The shell is centered by default; once the user drags
 * the header it switches to free positioning, and once they grab the
 * corner grip it locks an explicit size. Body scrolls internally so a
 * resized dialog clips overflow at its borders, not the viewport.
 */
export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  footer,
  size = "md",
  resizable = false,
  children,
}: ModalProps) {
  // Translate offset (drag) and explicit dimensions (resize). null = use
  // natural centering / max-width respectively.
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Portal mount gate — `document` is undefined during SSR, so we
  // delay the createPortal call until after hydration to avoid
  // mismatches. Portalling the modal to <body> is what guarantees
  // the dialog escapes every parent stacking context: a page hero
  // that sets `z-index: 1` on its direct children (or any other
  // ancestor with z-index / transform / filter / contain) used to
  // trap the modal in a sub-stack where its `z-50` was still being
  // painted under a `position: absolute` sibling like the hero's
  // curve-down decoration. Body-portalling sidesteps the whole
  // class of problem.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dialogRef = useRef<HTMLDivElement>(null);
  // Stable per-instance id so aria-labelledby can point at this modal's
  // own heading even when several modals are mounted at once.
  const titleId = useId();
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  // ESC + body-scroll lock + reset when reopened.
  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 });
      setDims(null);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function clampOffset(x: number, y: number) {
    const el = dialogRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    // Keep at least 60px of header in view so the user can always grab it.
    const margin = 60;
    const minX = -rect.left + margin - rect.width;
    const maxX = window.innerWidth - rect.left - margin;
    const minY = -rect.top + 8;
    const maxY = window.innerHeight - rect.top - margin;
    return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
  }

  function onHeaderPointerDown(e: RPointerEvent<HTMLDivElement>) {
    // Don't start drag from interactive elements inside the header (close button).
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onHeaderPointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
  }
  function onHeaderPointerUp(e: RPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragStart.current = null;
  }

  function onResizePointerDown(e: RPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = dialogRef.current?.getBoundingClientRect();
    resizeStart.current = {
      mx: e.clientX,
      my: e.clientY,
      w: rect?.width ?? MIN_W,
      h: rect?.height ?? MIN_H,
    };
    setDims({ w: rect?.width ?? MIN_W, h: rect?.height ?? MIN_H });
  }
  function onResizePointerMove(e: RPointerEvent<HTMLDivElement>) {
    if (!resizeStart.current) return;
    const dw = e.clientX - resizeStart.current.mx;
    const dh = e.clientY - resizeStart.current.my;
    const w = Math.max(MIN_W, Math.min(window.innerWidth - 32, resizeStart.current.w + dw));
    const h = Math.max(MIN_H, Math.min(window.innerHeight - 32, resizeStart.current.h + dh));
    setDims({ w, h });
  }
  function onResizePointerUp(e: RPointerEvent<HTMLDivElement>) {
    if (!resizeStart.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    resizeStart.current = null;
  }

  if (!open || !mounted) return null;

  const dialogStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    width: dims?.w,
    height: dims?.h,
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 animate-fade-in">
      <div
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        // role="dialog" with no accessible name is a serious WCAG
        // failure (axe: aria-dialog-name) — a screen reader announces
        // only "dialog" and the user has no idea what opened. This
        // component had neither aria-label nor aria-labelledby, so
        // EVERY modal in the app was unnamed. Point at the rendered
        // <h2> when there is a title (it stays in sync by construction)
        // and fall back to the explicit prop when there is not.
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        style={dialogStyle}
        className={cn(
          "relative w-full bg-card-solid rounded-[var(--radius-xl)] shadow-2xl border border-line",
          "flex flex-col my-auto animate-slide-up-in",
          // When user hasn't resized yet, fall back to size cap and viewport-bounded height.
          !dims && sizeClass[size],
          !dims && "max-h-[calc(100vh-4rem)]"
        )}
      >
        {(title || description) && (
          <div
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            onPointerCancel={onHeaderPointerUp}
            className="px-6 pt-5 pb-4 border-b border-line shrink-0 select-none cursor-move touch-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {title && <h2 id={titleId} className="text-lg font-semibold text-fg">{title}</h2>}
                {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1 rounded-lg text-subtle hover:bg-raised hover:text-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-elevated/60 border-t border-line shrink-0 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
        {resizable && (
          <div
            role="presentation"
            aria-label="Resize"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
            className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize touch-none opacity-50 hover:opacity-100 transition-opacity"
            style={{
              background:
                "linear-gradient(135deg, transparent 0 50%, var(--fg-subtle) 50% 60%, transparent 60% 70%, var(--fg-subtle) 70% 80%, transparent 80%)",
              borderBottomRightRadius: "var(--radius-xl)",
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
