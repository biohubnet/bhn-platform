"use client";
import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { CompanyProfileEditor } from "@/components/employer/CompanyProfileEditor";

interface Profile {
  employerCompany: string | null;
  companyWebsite: string | null;
  companyLogo: string | null;
  companyIndustry: string | null;
  companySize: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyFounded: string | null;
}

/**
 * Client accordion wrapper around CompanyProfileEditor.
 *
 * Why: the redesigned /employer/profile page leads with display
 * surfaces (cover banner, identity card, stats, postings preview) —
 * the form sits at the bottom and shouldn't dominate the page when
 * the profile is already in good shape. Default-open when the profile
 * is sparse (fewer than 4 fields filled in) so day-one employers see
 * the form immediately; default-closed once they've filled it in, so
 * the polished surfaces above carry the page.
 */
export function ProfileEditorAccordion({
  initial,
  defaultOpen,
}: {
  initial: Partial<Profile>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl border border-line bg-card surface-shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-6 py-5 hover:bg-elevated transition-colors"
      >
        <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <Pencil size={16} />
        </span>
        <span className="text-left flex-1 min-w-0">
          <span className="block text-base font-bold text-fg leading-tight">
            Edit profile details
          </span>
          <span className="block text-xs text-muted mt-0.5 leading-snug">
            Logo, website, industry, HQ, size, founded, description. AI auto-fill
            from your website is available inside.
          </span>
        </span>
        <ChevronDown
          size={18}
          className={
            "text-muted shrink-0 transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {/* grid-template-rows trick for smooth collapse without measuring
          inner content. Editor mounts unconditionally so its local state
          (typed-but-not-saved values) survives close/reopen. */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-6 pb-6 pt-2 border-t border-line">
            <CompanyProfileEditor initial={initial} />
          </div>
        </div>
      </div>
    </section>
  );
}
