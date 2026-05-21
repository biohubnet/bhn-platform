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
      {/* Centered column — page header at the top so the eyebrow +
          title + description set the context, then the alien-neural
          pipeline diagram, then the explainer. Compact (~280 px
          tall, max-w-[700px] centered) so it reads as a small lit
          organism under the hero, not its own banner. */}
      <div className="max-w-5xl mx-auto space-y-6">
        {pageHeader}
        <MatchingPipelineAnimation config={cfg} />
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
