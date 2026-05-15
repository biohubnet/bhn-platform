"use client";
/**
 * Outer client wrapper for /admin/matching-config.
 *
 * Owns the cfg + savedCfg state so two siblings can read from it:
 *
 *   1. The full-bleed hi-tech pipeline animation at the top of the
 *      page (above the page header) — needs the live cfg so pipe
 *      thickness, pulse density, and the sample score update as the
 *      user drags a slider further down the page.
 *
 *   2. The existing MatchingConfigClient form below, which receives
 *      the same cfg + setters as controlled props.
 *
 * Why a shell and not just MatchingConfigClient on its own
 *   MatchingConfigClient used to render the animation inline. Putting
 *   it at the top of THE PAGE (above the page header) required state
 *   to live somewhere that can render content above the header — a
 *   wrapper that owns state and renders both the animation and the
 *   form children is the cleanest version of that.
 *
 * Server-rendered children
 *   The page header (back link + title + description), the explainer
 *   card, and the recent-edits audit list are all server-rendered
 *   static JSX. They're passed in via slots so the shell can place
 *   them in the right order without re-running their data fetches on
 *   the client.
 */
import { useState, type ReactNode } from "react";
import type { MatchingConfig } from "@/lib/matching/config";
import { MatchingPipelineAnimation } from "@/components/admin/MatchingPipelineAnimation";
import { MatchingConfigClient } from "@/components/admin/MatchingConfigClient";

interface Option { id: string; label: string }

interface Props {
  initial: MatchingConfig;
  defaults: MatchingConfig;
  users: Option[];
  postings: Option[];
  /** Server-rendered page header (back link + title + description). */
  pageHeader: ReactNode;
  /** Server-rendered "How the score is computed" explainer. */
  explainer: ReactNode;
  /** Server-rendered recent-edits list (audit). */
  recentEdits?: ReactNode;
}

export function MatchingConfigShell({
  initial, defaults, users, postings,
  pageHeader, explainer, recentEdits,
}: Props) {
  const [cfg, setCfg] = useState<MatchingConfig>(initial);
  const [savedCfg, setSavedCfg] = useState<MatchingConfig>(initial);

  return (
    <>
      {/* ── Full-bleed hi-tech diagram at the very top of the page.
            The `full-bleed` utility (declared in globals.css) breaks
            out of any max-width parent with `width: 100vw; margin-left:
            calc(50% - 50vw)`. Negative top margin matches the
            dashboard layout's pt-16 so the panel hugs the top of the
            viewport without a strip of bg-page above it. */}
      <section className="full-bleed -mt-16 mb-6">
        <MatchingPipelineAnimation config={cfg} />
      </section>

      {/* ── Centered column for the rest of the page ───────────── */}
      <div className="max-w-5xl mx-auto space-y-6">
        {pageHeader}
        {explainer}
        <MatchingConfigClient
          initial={initial}
          defaults={defaults}
          users={users}
          postings={postings}
          cfg={cfg}
          setCfg={setCfg}
          savedCfg={savedCfg}
          setSavedCfg={setSavedCfg}
        />
        {recentEdits}
      </div>
    </>
  );
}
