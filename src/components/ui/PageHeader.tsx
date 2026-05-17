import { ReactNode } from "react";
import { PageHero } from "./PageHero";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * Legacy small in-page header. As of 2026-05-17 this is a thin
 * forward to `PageHero` so the ~25 surfaces still calling it inherit
 * the Cinematic full-bleed hero everyone else uses, without each
 * call site having to swap its import.
 *
 * Why keep the alias instead of deleting it?
 *   • The 25 call sites span profile / buddy / committee / admin
 *     surfaces. A blanket import-swap is invasive and the only
 *     thing that actually differs between the two APIs is that
 *     `PageHero` accepts an optional `eyebrow` — every other prop
 *     (title / description / actions) is identical.
 *   • Pages that want to add an eyebrow / icon / aside can switch
 *     their import to `PageHero` (or `DSPageHeader` for DS-aware
 *     surfaces) one at a time without a coordinated migration.
 *
 * Net effect: every page that used to render a small `<h1>` band
 * now renders the full Cinematic hero, identical to what /pathways
 * etc. produce.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return <PageHero title={title} description={description} actions={actions} />;
}
