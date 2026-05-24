"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, Building2, FilePlus, Users2, CheckCircle2, Minus } from "lucide-react";

const STORAGE_KEY = "bhn-employer-onboarding-dismissed";
const STEP_KEY = "bhn-employer-onboarding-step";

interface Props {
  show: boolean;
}

const STEPS = [
  {
    eyebrow: "Step 1 of 4",
    title: "Set up your company profile",
    body: "Add your logo, company name, and a short about section. The AI can fill most of it in from your website URL in seconds.",
    cta: "Set up profile",
    href: "/employer",
    hash: "profile",
    skipLabel: null,
  },
  {
    eyebrow: "Step 2 of 4",
    title: "Post your first role",
    body: "Create a job posting — paste a job description and the AI fills in title, location, compensation, and required skills automatically.",
    cta: "Go to My Postings",
    href: "/employer/postings",
    hash: null,
    skipLabel: "Skip for now",
  },
  {
    eyebrow: "Step 3 of 4",
    title: "Bring your team in",
    body: "Share this workspace with a colleague. Assign them a role (Manager, Generalist, or Viewer) so you can review candidates together.",
    cta: "Invite teammates",
    href: "/employer/team",
    hash: null,
    skipLabel: "Skip for now",
  },
  {
    eyebrow: "Complete ✓",
    title: "You're ready to hire",
    body: "Your workspace is set up. Candidates from BHN's talent pool will start matching against your postings as they come in.",
    cta: "Explore the workspace",
    href: null,
    hash: null,
    skipLabel: null,
  },
];

export function OnboardingWizard({ show }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden, update on mount
  const [minimized, setMinimized] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const d = localStorage.getItem(STORAGE_KEY) === "true";
    const s = parseInt(localStorage.getItem(STEP_KEY) ?? "0", 10);
    setDismissed(d);
    setStep(Number.isNaN(s) ? 0 : Math.min(s, STEPS.length - 1));
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  function advance(target?: number) {
    const next = target ?? step + 1;
    if (next >= STEPS.length) {
      dismiss();
      return;
    }
    setStep(next);
    localStorage.setItem(STEP_KEY, String(next));
  }

  if (!mounted || !show || dismissed) return null;

  const current = STEPS[step];

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-brand-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-brand-700 transition-colors"
      >
        <Building2 size={14} />
        Setup guide · Step {step + 1} of {STEPS.length}
        <ChevronDown size={13} className="opacity-80" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 rounded-2xl border border-line bg-card shadow-2xl overflow-hidden">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-0">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < step
                ? "bg-brand-600 flex-1"
                : i === step
                  ? "bg-brand-600 flex-[2]"
                  : "bg-line flex-1"
            }`}
          />
        ))}
      </div>

      <div className="px-5 pt-4 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-700">
              {current.eyebrow}
            </p>
            <h3 className="text-base font-bold text-fg mt-0.5 leading-tight">{current.title}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="p-1 rounded-lg hover:bg-elevated text-muted hover:text-fg"
              aria-label="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded-lg hover:bg-elevated text-muted hover:text-fg"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed">{current.body}</p>

        <div className="flex flex-col gap-2 pt-1">
          {current.href ? (
            <a
              href={current.href}
              onClick={() => advance()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-brand-700 shadow-md shadow-brand-600/25 transition-colors"
            >
              {step === 0 && <Building2 size={13} />}
              {step === 1 && <FilePlus size={13} />}
              {step === 2 && <Users2 size={13} />}
              {current.cta}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => advance()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 transition-colors"
            >
              <CheckCircle2 size={13} /> {current.cta}
            </button>
          )}
          {current.skipLabel && (
            <button
              type="button"
              onClick={() => advance()}
              className="text-xs text-muted hover:text-fg text-center"
            >
              {current.skipLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
