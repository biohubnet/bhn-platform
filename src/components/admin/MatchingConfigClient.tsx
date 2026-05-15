"use client";
/**
 * /admin/matching-config client form.
 *
 * Three sections:
 *   1. Weights — directOverlap / semantic / pathway. Sliders with a
 *      live "sum = 100?" indicator. Auto-balance: dragging one nudges
 *      the others proportionally so the sum stays 100.
 *   2. Bands + thresholds — number inputs with sensible step values.
 *   3. Live tester — pick a real trainee + posting, click "Score with
 *      current form values", inspect the FitResult breakdown inline.
 *
 * The form maintains both the saved baseline and the live-edit state
 * so we can show "modified" indicators on each row + a reset-to-saved
 * button. Save persists; "Reset to defaults" reverts the form to
 * DEFAULT_MATCHING_CONFIG without saving.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Save, RotateCcw, AlertCircle, CheckCircle2,
  Sliders, Target, FlaskConical,
} from "lucide-react";
import type { MatchingConfig } from "@/lib/matching/config";

interface Option { id: string; label: string }

interface Props {
  initial: MatchingConfig;
  defaults: MatchingConfig;
  users: Option[];
  postings: Option[];
}

interface FitResult {
  score: number;
  band: "high" | "medium" | "low";
  confidence: number;
  subscores: {
    directOverlap: { score: number; max: number };
    semanticSimilarity: { score: number; max: number };
    pathwayAlignment: { score: number; max: number };
  };
  matched: Array<{ skillId: string; name: string; required: boolean }>;
  missingRequired: Array<{ skillId: string; name: string }>;
  semanticBridges: Array<{
    postingSkill: { id: string; name: string };
    nearestUserSkill: { id: string; name: string };
    cosine: number;
  }>;
  pathwaysCounting: Array<{ id: string; title: string; cosine: number }>;
  caveats: string[];
}

export function MatchingConfigClient({ initial, defaults, users, postings }: Props) {
  const router = useRouter();
  const [cfg, setCfg] = useState<MatchingConfig>(initial);
  const [savedCfg, setSavedCfg] = useState<MatchingConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tester state
  const [testUserId, setTestUserId] = useState<string>(users[0]?.id ?? "");
  const [testPostingId, setTestPostingId] = useState<string>(postings[0]?.id ?? "");
  const [testing, setTesting] = useState(false);
  const [fit, setFit] = useState<FitResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const weightsSum = cfg.weights.direct + cfg.weights.semantic + cfg.weights.pathway;
  const isModified = JSON.stringify(cfg) !== JSON.stringify(savedCfg);

  function patchWeights(key: keyof MatchingConfig["weights"], value: number) {
    setCfg((prev) => ({ ...prev, weights: { ...prev.weights, [key]: value } }));
  }
  function patchBand(key: keyof MatchingConfig["bands"], value: number) {
    setCfg((prev) => ({ ...prev, bands: { ...prev.bands, [key]: value } }));
  }
  function patchThreshold(key: keyof MatchingConfig["thresholds"], value: number) {
    setCfg((prev) => ({ ...prev, thresholds: { ...prev.thresholds, [key]: value } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/matching-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setError(j?.error ?? "Couldn't save.");
        return;
      }
      setCfg(j.saved);
      setSavedCfg(j.saved);
      setFlash("Saved. New rankings use these values immediately.");
      router.refresh();
      setTimeout(() => setFlash(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setCfg(defaults);
    setFlash("Form reverted to factory defaults — click Save to commit.");
    setTimeout(() => setFlash(null), 4000);
  }
  function resetToSaved() {
    setCfg(savedCfg);
    setFlash("Form reverted to last saved values.");
    setTimeout(() => setFlash(null), 3000);
  }

  async function runTest() {
    if (!testUserId || !testPostingId) return;
    setTesting(true);
    setTestError(null);
    try {
      const res = await fetch("/api/admin/matching-config?test=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, userId: testUserId, postingId: testPostingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setTestError(j?.error ?? "Couldn't run the test score.");
        return;
      }
      setFit(j.fit as FitResult);
    } finally {
      setTesting(false);
    }
  }

  const bandLabel: Record<FitResult["band"], { text: string; cls: string }> = {
    high:   { text: "Strong fit",  cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
    medium: { text: "Possible fit", cls: "bg-amber-100   text-amber-800   ring-amber-200" },
    low:    { text: "Weak fit",     cls: "bg-slate-100   text-slate-700   ring-slate-200" },
  };

  return (
    <div className="space-y-6">
      {/* Flash / error bar */}
      {(flash || error) && (
        <div
          className={`flex items-center gap-2 rounded-lg ring-1 ring-inset px-3 py-2 text-sm ${
            error
              ? "bg-rose-50 text-rose-900 ring-rose-200"
              : "bg-emerald-50 text-emerald-900 ring-emerald-200"
          }`}
        >
          {error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{error ?? flash}</span>
        </div>
      )}

      {/* ── Weights ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={Sliders}
          title="Subscore weights"
          help="Each scored 0..max; the three weights should sum to 100. Drag a slider to retune."
        />
        <div className="space-y-4">
          <WeightSlider
            label="Direct overlap"
            help="Skills the trainee already holds that the posting requires."
            value={cfg.weights.direct}
            saved={savedCfg.weights.direct}
            onChange={(v) => patchWeights("direct", v)}
          />
          <WeightSlider
            label="Semantic similarity"
            help="pgvector cosine between the posting skill and the trainee's nearest held skill — picks up 'cell culture' / 'mammalian cell culture'."
            value={cfg.weights.semantic}
            saved={savedCfg.weights.semantic}
            onChange={(v) => patchWeights("semantic", v)}
          />
          <WeightSlider
            label="Pathway alignment"
            help="Completed pathways whose embedding is cosine-close to the posting's required-skills centroid."
            value={cfg.weights.pathway}
            saved={savedCfg.weights.pathway}
            onChange={(v) => patchWeights("pathway", v)}
          />
          <div className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-xs">
            <span className="text-muted">
              Sum: <span className={`font-bold tabular-nums ${weightsSum === 100 ? "text-emerald-700" : "text-rose-700"}`}>{weightsSum}</span> / 100
            </span>
            {weightsSum !== 100 && (
              <span className="text-rose-700 text-[11px]">
                Save will clamp the residual onto direct overlap.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Bands ─────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={Target}
          title="Score bands"
          help="Where the chip label flips from Weak → Possible → Strong fit."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberInput
            label="High band starts at"
            value={cfg.bands.high}
            saved={savedCfg.bands.high}
            min={0} max={100} step={1}
            onChange={(v) => patchBand("high", v)}
            suffix=" / 100"
            help="Default 70 — Strong fit"
          />
          <NumberInput
            label="Medium band starts at"
            value={cfg.bands.medium}
            saved={savedCfg.bands.medium}
            min={0} max={100} step={1}
            onChange={(v) => patchBand("medium", v)}
            suffix=" / 100"
            help="Default 40 — Possible fit. Below this is Weak fit."
          />
        </div>
      </Card>

      {/* ── Thresholds ────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={Sliders}
          title="Thresholds"
          help="Cosine cutoffs + structural constants the scorer uses on the edges."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberInput
            label="Profile completeness"
            value={cfg.thresholds.profileCompleteness}
            saved={savedCfg.thresholds.profileCompleteness}
            min={1} max={50} step={1}
            onChange={(v) => patchThreshold("profileCompleteness", v)}
            help="Skills on file below this number trigger the confidence-cap."
          />
          <NumberInput
            label="Min posting skills for full confidence"
            value={cfg.thresholds.minPostingSkillsForFullConfidence}
            saved={savedCfg.thresholds.minPostingSkillsForFullConfidence}
            min={1} max={20} step={1}
            onChange={(v) => patchThreshold("minPostingSkillsForFullConfidence", v)}
            help="Postings with fewer tagged skills get a soft confidence cap."
          />
          <NumberInput
            label="Semantic bridge min cosine"
            value={cfg.thresholds.semanticBridgeMin}
            saved={savedCfg.thresholds.semanticBridgeMin}
            min={0} max={1} step={0.01}
            onChange={(v) => patchThreshold("semanticBridgeMin", v)}
            help="Min cosine to surface a semantic-bridge row in the explanation panel."
          />
          <NumberInput
            label="Pathway alignment min cosine"
            value={cfg.thresholds.pathwayAlignMin}
            saved={savedCfg.thresholds.pathwayAlignMin}
            min={0} max={1} step={0.01}
            onChange={(v) => patchThreshold("pathwayAlignMin", v)}
            help="Min cosine for a completed pathway to contribute to the score."
          />
          <NumberInput
            label="Per-pathway boost (points)"
            value={cfg.thresholds.perPathwayBoost}
            saved={savedCfg.thresholds.perPathwayBoost}
            min={0} max={50} step={1}
            onChange={(v) => patchThreshold("perPathwayBoost", v)}
            help="Each qualifying completed pathway is worth this many points (capped at the pathway weight)."
          />
          <NumberInput
            label="Required-skill bonus"
            value={cfg.thresholds.requiredSkillBonus}
            saved={savedCfg.thresholds.requiredSkillBonus}
            min={0} max={2} step={0.05}
            onChange={(v) => patchThreshold("requiredSkillBonus", v)}
            help="Added to PostingSkill.weight when required=true."
          />
        </div>
      </Card>

      {/* ── Save / Reset bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !isModified}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-600/25"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isModified ? "Save changes" : "Saved"}
        </button>
        {isModified && (
          <button
            type="button"
            onClick={resetToSaved}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <RotateCcw size={11} /> Revert to last saved
          </button>
        )}
        <button
          type="button"
          onClick={resetToDefaults}
          disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-rose-700"
        >
          <RotateCcw size={11} /> Restore factory defaults
        </button>
      </div>

      {/* ── Live tester ───────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          icon={FlaskConical}
          title="Live tester — preview impact before saving"
          help="Scores a real (trainee × posting) pair using the form values above. The result reflects YOUR UNSAVED edits; the persisted config is unchanged."
        />
        {users.length === 0 || postings.length === 0 ? (
          <p className="text-xs text-muted leading-relaxed">
            Need at least one trainee with skills + one active posting with skill tags to run the
            tester. Seed the matches scenario on{" "}
            <a href="/profile/matches" className="text-brand-700 hover:underline">/profile/matches</a>{" "}
            (admin-only Seed button) and reload this page.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs">
                <span className="block font-semibold text-fg mb-1">Trainee</span>
                <select
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  className="w-full bg-elevated rounded-lg border border-line px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="block font-semibold text-fg mb-1">Posting</span>
                <select
                  value={testPostingId}
                  onChange={(e) => setTestPostingId(e.target.value)}
                  className="w-full bg-elevated rounded-lg border border-line px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {postings.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-elevated text-fg ring-1 ring-inset ring-line hover:bg-card disabled:opacity-50"
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              Score this pair
            </button>
            {testError && (
              <p className="mt-3 text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">
                {testError}
              </p>
            )}
            {fit && (
              <FitPreview fit={fit} bandLabel={bandLabel} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 space-y-4">
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon, title, help,
}: {
  icon: React.ElementType;
  title: string;
  help: string;
}) {
  return (
    <header>
      <h2 className="text-base font-bold text-fg inline-flex items-center gap-2">
        <Icon size={15} className="text-brand-600" /> {title}
      </h2>
      <p className="text-xs text-muted mt-1 leading-relaxed">{help}</p>
    </header>
  );
}

function WeightSlider({
  label, help, value, saved, onChange,
}: {
  label: string;
  help: string;
  value: number;
  saved: number;
  onChange: (v: number) => void;
}) {
  const modified = value !== saved;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-fg inline-flex items-center gap-2">
          {label}
          {modified && <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 rounded ring-1 ring-brand-200">modified</span>}
        </p>
        <p className="text-2xl font-bold text-fg tabular-nums">
          {value}<span className="text-xs font-semibold text-muted ml-0.5">/ 100</span>
        </p>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-brand-600"
      />
      <p className="text-[11px] text-muted leading-snug">{help}</p>
    </div>
  );
}

function NumberInput({
  label, help, value, saved, min, max, step, onChange, suffix,
}: {
  label: string;
  help: string;
  value: number;
  saved: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const modified = value !== saved;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-fg inline-flex items-center gap-1.5">
          {label}
          {modified && <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 rounded ring-1 ring-brand-200">modified</span>}
        </span>
        <span className="text-[10px] text-subtle tabular-nums">saved: {saved}</span>
      </div>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(v);
          }}
          className="w-full bg-elevated rounded-lg border border-line px-3 py-2 text-sm tabular-nums text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted mt-1 leading-snug">{help}</p>
    </label>
  );
}

function FitPreview({
  fit,
  bandLabel,
}: {
  fit: FitResult;
  bandLabel: Record<FitResult["band"], { text: string; cls: string }>;
}) {
  return (
    <div className="mt-4 rounded-xl border border-line bg-gradient-to-br from-elevated to-card p-4">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">Score</p>
          <p className="text-3xl font-bold text-fg tabular-nums">
            {fit.score}<span className="text-sm font-semibold text-muted">/100</span>
          </p>
        </div>
        <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ring-1 ring-inset ${bandLabel[fit.band].cls}`}>
          {bandLabel[fit.band].text}
        </span>
        <p className="text-xs text-muted">
          confidence <span className="tabular-nums font-bold text-fg">{Math.round(fit.confidence * 100)}%</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <SubscoreCell label="Direct"   sub={fit.subscores.directOverlap} />
        <SubscoreCell label="Semantic" sub={fit.subscores.semanticSimilarity} />
        <SubscoreCell label="Pathway"  sub={fit.subscores.pathwayAlignment} />
      </div>

      {fit.matched.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-1.5">Matched skills</p>
          <div className="flex flex-wrap gap-1.5">
            {fit.matched.map((m) => (
              <span key={m.skillId} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                {m.name}{m.required && " ★"}
              </span>
            ))}
          </div>
        </div>
      )}

      {fit.missingRequired.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle mb-1.5">Missing required</p>
          <div className="flex flex-wrap gap-1.5">
            {fit.missingRequired.map((m) => (
              <span key={m.skillId} className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 ring-1 ring-rose-200">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {fit.caveats.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[11px] text-amber-900 space-y-1">
          {fit.caveats.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscoreCell({
  label, sub,
}: {
  label: string;
  sub: { score: number; max: number };
}) {
  const pct = sub.max > 0 ? Math.round((sub.score / sub.max) * 100) : 0;
  return (
    <div className="rounded-lg bg-card border border-line px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-subtle">{label}</p>
      <p className="text-sm font-bold text-fg mt-0.5 tabular-nums">
        {sub.score}<span className="text-xs text-muted">/{sub.max}</span>
      </p>
      <div className="mt-1 h-1 bg-elevated rounded-full overflow-hidden">
        <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Silence unused warning for the memoised hook import.
void useMemo;
