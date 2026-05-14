/**
 * Reusable "Why this match?" explanation panel.
 *
 * Renders a single FitResult honestly — score + band + confidence
 * up top, then expandable evidence blocks beneath (matched skills,
 * semantic bridges, pathway boosts, gaps, caveats). Designed to be
 * dropped into both:
 *
 *   • /profile/matches — alongside each ranked posting card
 *   • /internships/[id] — under the posting body for trainees only
 *
 * Design principles (drawn from docs/ux/charter.md outcome 3 +
 * docs/ux/decisions/0004-ai-matching-explainability.md):
 *
 *   1. NEVER show a bare number. Always pair with a band ("Strong
 *      fit", "Possible fit", "Weak fit") + a confidence indicator.
 *   2. Receipts before recommendation. Subscores + concrete skills
 *      come before any "apply now" CTA.
 *   3. Caveats are first-class. We render them as their own bordered
 *      block in amber, never burying them in a tooltip.
 *   4. The "what's missing" gap is paired with action — a link to
 *      the user's skills page so they can add a skill or find a
 *      course that teaches it.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, CheckCircle2, AlertCircle, ChevronDown, GraduationCap,
  Link2, Target, Info,
} from "lucide-react";
import type { FitResult } from "@/lib/matching/fit";

interface Props {
  fit: FitResult;
  /** Render mode:
   *    "card"    — full explanation, expandable; for /profile/matches.
   *    "panel"   — always-expanded; for posting detail page. */
  variant?: "card" | "panel";
  /** Override the default heading. */
  heading?: string;
}

export function FitExplain({ fit, variant = "card", heading }: Props) {
  const [open, setOpen] = useState(variant === "panel");

  const bandStyles: Record<FitResult["band"], { label: string; chip: string; bar: string }> = {
    high: {
      label: "Strong fit",
      chip: "bg-emerald-100 text-emerald-800 ring-emerald-200",
      bar: "bg-emerald-500",
    },
    medium: {
      label: "Possible fit",
      chip: "bg-amber-100 text-amber-800 ring-amber-200",
      bar: "bg-amber-500",
    },
    low: {
      label: "Weak fit",
      chip: "bg-slate-100 text-slate-700 ring-slate-200",
      bar: "bg-slate-400",
    },
  };
  const bs = bandStyles[fit.band];

  const confidencePct = Math.round(fit.confidence * 100);
  const confidenceCopy =
    fit.confidence >= 0.85
      ? "High confidence"
      : fit.confidence >= 0.6
        ? "Medium confidence"
        : fit.confidence >= 0.3
          ? "Low confidence"
          : "Very low confidence — see caveats";

  const safeScore = Number.isFinite(fit.score) ? fit.score : 0;

  return (
    <section
      className={
        variant === "panel"
          ? "rounded-2xl border border-line bg-card p-5 surface-shadow"
          : "rounded-xl border border-line bg-card p-4"
      }
      aria-label="Match explanation"
    >
      {/* ── Top row: score + band + confidence ────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <ScoreRing score={safeScore} band={fit.band} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">
              {heading ?? "Match explanation"}
            </p>
            <p className="text-base font-bold text-fg mt-0.5 inline-flex items-center gap-2 flex-wrap">
              <span>{bs.label}</span>
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full ring-1 ring-inset ${bs.chip}`}>
                {safeScore} / 100
              </span>
            </p>
            <p className="text-[11px] text-muted mt-1 inline-flex items-center gap-1">
              <Info size={11} className="text-subtle" />
              {confidenceCopy} ({confidencePct}%)
            </p>
          </div>
        </div>

        {variant === "card" && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            aria-expanded={open}
          >
            {open ? "Hide details" : "Why this score?"}
            <ChevronDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        )}
      </header>

      {/* ── Expandable body ───────────────────────────────────── */}
      {open && (
        <div className="mt-5 space-y-4">
          {/* Subscore bars */}
          <div className="space-y-2">
            <Subscore
              label="Direct skill overlap"
              hint="Skills you already have that the posting requires."
              score={fit.subscores.directOverlap.score}
              max={fit.subscores.directOverlap.max}
              tone={bs.bar}
            />
            <Subscore
              label="Semantic similarity"
              hint="Your adjacent skills that are close to what's needed."
              score={fit.subscores.semanticSimilarity.score}
              max={fit.subscores.semanticSimilarity.max}
              tone={bs.bar}
            />
            <Subscore
              label="Pathway alignment"
              hint="Completed pathways relevant to this role."
              score={fit.subscores.pathwayAlignment.score}
              max={fit.subscores.pathwayAlignment.max}
              tone={bs.bar}
            />
          </div>

          {/* Matched skills */}
          {fit.matched.length > 0 && (
            <Block
              icon={CheckCircle2}
              tone="emerald"
              title={`What's working (${fit.matched.length} skill${fit.matched.length === 1 ? "" : "s"} you have)`}
            >
              <ul className="flex flex-wrap gap-1.5">
                {fit.matched.map((m) => (
                  <li
                    key={m.skillId}
                    className={`text-[11px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ring-1 ring-inset ${
                      m.required
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                        : "bg-elevated text-fg ring-line"
                    }`}
                    title={m.required ? "Required skill on this posting" : "Nice-to-have"}
                  >
                    {m.name}
                    {m.required && " *"}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-subtle mt-1.5">
                * required by the posting.
              </p>
            </Block>
          )}

          {/* Semantic bridges */}
          {fit.semanticBridges.length > 0 && (
            <Block
              icon={Link2}
              tone="brand"
              title={`Adjacent skills that count (${fit.semanticBridges.length})`}
            >
              <ul className="space-y-1.5 text-xs">
                {fit.semanticBridges.map((b) => (
                  <li key={b.postingSkill.id} className="flex items-center gap-2">
                    <span className="font-semibold text-fg">{b.nearestUserSkill.name}</span>
                    <span className="text-subtle">→</span>
                    <span className="text-muted">{b.postingSkill.name}</span>
                    <span className="ml-auto text-[10px] font-mono tabular-nums text-subtle">
                      {Math.round(b.cosine * 100)}% close
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-subtle mt-1.5 leading-snug">
                These are skills you have that are semantically close to what's
                listed — not an exact tag match, but related enough to count.
              </p>
            </Block>
          )}

          {/* Pathway boosts */}
          {fit.pathwaysCounting.length > 0 && (
            <Block
              icon={GraduationCap}
              tone="brand"
              title={`Pathway${fit.pathwaysCounting.length === 1 ? "" : "s"} that boosted you`}
            >
              <ul className="space-y-1 text-xs">
                {fit.pathwaysCounting.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/pathways/${p.id}`}
                      className="font-semibold text-fg hover:text-brand-700 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <span className="text-[10px] font-mono tabular-nums text-subtle">
                      {Math.round(p.cosine * 100)}% aligned
                    </span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Gaps */}
          {fit.missingRequired.length > 0 && (
            <Block
              icon={Target}
              tone="amber"
              title={`Gaps (${fit.missingRequired.length} required skill${fit.missingRequired.length === 1 ? "" : "s"} not on file)`}
            >
              <ul className="flex flex-wrap gap-1.5 mb-2">
                {fit.missingRequired.map((m) => (
                  <li
                    key={m.skillId}
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ring-1 ring-inset bg-amber-50 text-amber-800 ring-amber-200"
                  >
                    {m.name}
                  </li>
                ))}
              </ul>
              <Link
                href="/profile/skills"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                <Sparkles size={11} /> Add these to your skills, or browse pathways that teach them
              </Link>
            </Block>
          )}

          {/* Caveats — always shown if any */}
          {fit.caveats.length > 0 && (
            <Block icon={AlertCircle} tone="amber" title="Limits we want you to know about">
              <ul className="space-y-1.5 text-xs leading-snug">
                {fit.caveats.map((c, i) => (
                  <li key={i} className="text-amber-900">
                    {c}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Footer — methodology + timestamp */}
          <p className="text-[10px] text-subtle leading-snug pt-1 border-t border-line">
            Score = direct skill overlap (50%) + semantic similarity (30%) +
            pathway alignment (20%). Computed at{" "}
            {new Date(fit.computedAt).toLocaleString("en-CA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            . See{" "}
            <Link
              href="https://github.com/sesamemua/bhn-training-platform/blob/main/docs/ux/decisions/0004-ai-matching-explainability.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:underline"
            >
              ADR-0004
            </Link>{" "}
            for why we built it this way.
          </p>
        </div>
      )}
    </section>
  );
}

/* ─── atoms ──────────────────────────────────────────────────── */

function ScoreRing({
  score,
  band,
}: {
  score: number;
  band: FitResult["band"];
}) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color =
    band === "high" ? "#10b981" : band === "medium" ? "#f59e0b" : "#94a3b8";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#e2e8f0"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="#0f172a"
        fontFamily="ui-monospace, SF Mono, monospace"
      >
        {score}
      </text>
    </svg>
  );
}

function Subscore({
  label,
  hint,
  score,
  max,
  tone,
}: {
  label: string;
  hint: string;
  score: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-fg">{label}</span>
        <span className="font-mono tabular-nums text-muted text-[11px]">
          {score} / {max}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-elevated overflow-hidden">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-subtle mt-0.5 leading-snug">{hint}</p>
    </div>
  );
}

function Block({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: React.ElementType;
  tone: "emerald" | "amber" | "brand";
  title: string;
  children: React.ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 ring-emerald-200",
    amber: "bg-amber-50 ring-amber-200",
    brand: "bg-brand-50 ring-brand-200",
  };
  const iconCol: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    brand: "text-brand-700",
  };
  return (
    <div className={`rounded-xl ring-1 ring-inset p-3 ${styles[tone]}`}>
      <p className={`text-xs font-bold mb-1.5 inline-flex items-center gap-1.5 ${iconCol[tone]}`}>
        <Icon size={12} />
        {title}
      </p>
      {children}
    </div>
  );
}
