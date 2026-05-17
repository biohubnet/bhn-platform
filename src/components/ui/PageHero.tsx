import { ReactNode } from "react";
import { DSPageHeader } from "@/components/design-system/DSPageHeader";
import { LayoutBanners } from "@/components/layout/LayoutBanners";

interface Props {
  /** Small label above the title (uppercase, e.g. "Training Programmes"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Legacy mesh-palette name; ignored under the DS-aware implementation. */
  tone?: "brand" | "teal" | "aurora";
  /** Extra content rendered alongside the title (stat tiles etc.). */
  side?: ReactNode;
  /** Optional icon — passes through to DSPageHeader. */
  icon?: ReactNode;
}

/**
 * `PageHero` is now a thin server-component wrapper that forwards to
 * `<DSPageHeader>` — the canonical DS-aware primitive. Every PageHero
 * call site is therefore wired into the design-system pipeline:
 * change the platform default from `/admin/design-system` and every
 * page using PageHero (or its forwarder, PageHeader) re-renders with
 * the new look.
 *
 * Mapping the legacy PageHero API to DSPageHeader:
 *   • eyebrow / title / description / actions / icon — passed through
 *     verbatim.
 *   • side — folded into the actions row (DSPageHeader doesn't carry
 *     a separate side slot; the few callers that passed `side` were
 *     using it for stat counters, which fit the actions row fine).
 *   • tone — dropped. Each DS variant defines its own gradient
 *     vocabulary; per-page tone is no longer meaningful.
 *
 * The earlier inline-cinematic implementation of PageHero (2026-05-17)
 * hardcoded the cinematic look. That meant flipping the platform DS
 * had no effect on PageHero surfaces — they stayed cinematic. The
 * forward-to-DSPageHeader implementation here fixes that: PageHero
 * is fully DS-driven now.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  side,
  icon,
}: Props) {
  // Side content (legacy stat-counter slot) folds into the actions row
  // so it renders alongside any explicit actions buttons.
  const composedActions = side ? (
    <>
      {actions}
      {side}
    </>
  ) : (
    actions
  );

  return (
    <>
      <DSPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon={icon}
        actions={composedActions}
      />
      {/* Platform rule: the hero is the absolute top; any layout
          banners (impersonation, demo expiry, unverified email,
          first-run notices) live IMMEDIATELY AFTER it, never above.
          LayoutBanners is an async server component, rendered as
          a child of this server-component wrapper. */}
      <LayoutBanners />
    </>
  );
}
