"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Settings2, Check } from "lucide-react";
import { useConsent } from "./ConsentProvider";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Bottom-of-page consent banner. Appears once until the user picks one
 * of the three actions: Accept all, Necessary only, or Save preferences
 * (after toggling categories). Hidden once a decision has been made.
 */
export function CookieBanner() {
  const t = useT();
  const { consent, hasDecided, setConsent } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);

  if (hasDecided) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 max-w-3xl mx-auto animate-slide-up-in">
      <div className="bg-card-solid border border-line rounded-[var(--radius-xl)] shadow-2xl shadow-brand-900/15 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-fg">{t("consent.title")}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              {t("consent.body")}{" "}
              <Link href="/privacy" className="text-brand-600 underline-offset-2 hover:underline">
                {t("consent.privacyPolicy")}
              </Link>{" · "}
              <Link href="/terms" className="text-brand-600 underline-offset-2 hover:underline">
                {t("consent.termsOfService")}
              </Link>
            </p>

            {expanded && (
              <div className="mt-4 space-y-2">
                <CategoryRow
                  label={t("consent.necessary")}
                  hint={t("consent.necessaryHelp")}
                  checked
                  disabled
                />
                <CategoryRow
                  label={t("consent.analytics")}
                  hint={t("consent.analyticsHelp")}
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <CategoryRow
                  label={t("consent.marketing")}
                  hint={t("consent.marketingHelp")}
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {!expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-sm font-medium text-muted hover:text-fg px-3 py-2 inline-flex items-center gap-1.5"
                >
                  <Settings2 size={13} /> Customize
                </button>
              )}
              <button
                onClick={() => setConsent({ analytics: false, marketing: false })}
                className="text-sm font-medium text-muted hover:text-fg px-4 py-2 rounded-full border border-line hover:border-line-strong transition-colors"
              >
                {t("consent.necessaryOnly")}
              </button>
              {expanded && (
                <button
                  onClick={() => setConsent({ analytics, marketing })}
                  className="text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-full inline-flex items-center gap-1.5"
                >
                  <Check size={13} /> {t("consent.savePrefs")}
                </button>
              )}
              <button
                onClick={() => setConsent({ analytics: true, marketing: true })}
                className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full shadow-sm shadow-brand-600/25 transition-colors"
              >
                {t("consent.acceptAll")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  label, hint, checked, disabled, onChange,
}: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className={cn(
      "flex items-start gap-3 p-3 rounded-xl border border-line",
      disabled ? "bg-elevated/50 cursor-not-allowed" : "hover:border-line-strong cursor-pointer"
    )}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 accent-brand-600"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
    </label>
  );
}
