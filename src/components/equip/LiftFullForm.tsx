"use client";
/**
 * VentureLift FULL application (Stage 2) — mirrors the EQUIP
 * VentureLift Grant Application Form (Oct 2025 PDF) section by
 * section.
 *
 * Only unlocked after a pre_screen_approved decision on the
 * Stage-1 pre-screening form (LiftForm.tsx). The applicant has 6
 * months to complete the project, so the timeline section caps
 * deliverable rows at six. Three signers are required (Primary
 * Applicant, Founder/Co-Founder if different, PI).
 *
 * Reviewer eligibility gate: Appendix 3 (IP supporting docs) is
 * required at submit — enforced server-side by the /submit route
 * and surfaced here as a visible check.
 *
 * No AI writing assistance is offered — the official PDF
 * disclaimer disqualifies AI-generated content.
 */
import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Check, AlertCircle, Send, AlertTriangle, FlaskConical, Eraser,
  Plus, Trash2, FileText, Briefcase, Rocket, Target, Globe2, Calendar,
  TrendingUp, BookOpen, DollarSign, FileSignature,
} from "lucide-react";
import {
  NO_AI_DISCLAIMER,
  type VentureLiftFullData,
  type VentureLiftBudgetLine,
  type VentureLiftPartnerContribution,
  type VentureLiftTimelineRow,
  type VentureLiftTeamMember,
  type EquipDocument,
  type ApplicantRole,
} from "@/lib/equip/types";
import { LiftDocumentTray, STAGE_2_KINDS } from "./LiftDocumentTray";

interface Props {
  applicationId: string;
  initial: VentureLiftFullData;
  initialDocuments: EquipDocument[];
  profile: {
    name: string;
    email: string;
    organization: string | null;
    jobTitle: string | null;
  };
  /** Admin-only sample-fill + clear strip. */
  isAdmin?: boolean;
}

/** Generate a stable id for nested array items (budget lines etc.).
 *  Using crypto.randomUUID() when available, falling back to a
 *  timestamp-based id for older browsers. */
function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BUDGET_CATEGORIES: Array<{ id: VentureLiftBudgetLine["category"]; label: string }> = [
  { id: "services",            label: "Services" },
  { id: "consulting",          label: "Consulting" },
  { id: "materials_supplies",  label: "Materials & Supplies" },
  { id: "other",               label: "Other Expenditure" },
];

const APPLICANT_ROLE_OPTIONS: Array<{ id: ApplicantRole; label: string }> = [
  { id: "master_student",     label: "Graduate Student (Master's)" },
  { id: "phd_student",        label: "Graduate Student (PhD)" },
  { id: "postdoc",            label: "Postdoctoral Fellow" },
  { id: "research_associate", label: "Research Associate" },
];

/** Admin sample-fill body — passes the full Stage-2 validation
 *  including all required prompts, budget lines summing to $25K,
 *  and three signatures. */
const SAMPLE_VL_FULL: VentureLiftFullData = {
  projectTitle: "Cell-free affinity purification platform — commercial validation pilot",
  applicantFullName: "Lin Wei (test)",
  applicantRole: "phd_student",
  applicantInstitution: "University of Toronto",
  applicantDepartment: "Donnelly Centre",
  applicantTitleInCompany: "Co-founder + CTO",
  applicantTimeCommitment: "30%",
  piFullName: "Dr. Avery Park",
  piInstitution: "University of Toronto",
  piDepartment: "Donnelly Centre",
  piTitleInCompany: "Scientific Co-founder",
  piRoleDescription:
    "Provides scientific oversight of the validation pilot and CMC work.\nCo-supervises the trainee co-founder and signs off on technical deliverables.\nHolds the funds on behalf of the company per BHN policy.",
  companyName: "CellFreeBio Inc.",
  companyAddress: "MaRS Discovery District, Toronto ON",
  companyWebsite: "https://example-bio.test",
  companyIncorporationDate: "2025-09-12",
  natureProduct: true,
  natureTechnologyPlatform: true,
  teamMembers: [
    { id: makeId(), name: "Sam Liu", role: "Process engineer", areaOfExpertise: "Downstream processing", institution: "UofT" },
    { id: makeId(), name: "Ravi Patel", role: "Business advisor", areaOfExpertise: "Commercialization", institution: "MaRS" },
  ],
  innovationCompanyOverview: "Sample test data. CellFreeBio commercializes a proprietary cell-free affinity purification platform that reduces downstream processing time by ~40% for small-batch biologics. Our core mission is to lower the cost-per-gram for early-stage CDMOs and academic spinouts struggling with traditional chromatography. Key products include single-use cartridges and a digital workflow companion.",
  innovationProblemAndImpact: "Sample test data. Small-batch biologics manufacturers face a 4-6 week downstream bottleneck that compounds clinical-trial delays. Our platform compresses that window to 7-10 days while maintaining yield, materially accelerating patient access to early-stage therapeutics in oncology and rare disease.",
  innovationIpDescription: "Sample test data. Provisional patent filed Aug 2025 (US 63/XXX,XXX) covering the proprietary affinity tag chemistry. Differentiates from incumbent resin-based workflows by eliminating regeneration cycles. No prior art identified in our freedom-to-operate search; we own all rights via U of T's tech-transfer office.",
  marketOverview: "Sample test data. TAM: $4.2B CAD across North American small-batch biologics CDMOs and academic spinouts. SAM (Canada): $180M. Primary customers: pre-IND/IND-stage therapeutic startups (~120 active in Ontario). Early signals from three discovery interviews indicate willingness to pay ~$50K per pilot project.",
  marketCompetitive: "Sample test data. Incumbents: GE Healthcare (Cytiva), Repligen, Thermo Fisher — all resin-based, slow regeneration cycles. New entrants: synBio platforms like Astrea Bioseparations. Our differentiator is single-use + cell-free, hitting a price/time point neither incumbents nor new entrants address.",
  marketAdvancement: "Sample test data. Aligned with the Canadian Biomanufacturing & Life Sciences Strategy and the Ontario Genomic Medicine Network's priority on domestic CMC capacity. Our solution shortens time-to-clinic for Ontario-based therapeutic startups, addressing a flagged sovereignty-of-supply concern.",
  planActivities: "Sample test data. Three commercialization-enabling activities: (1) Customer Validation — paid pilot at an external Toronto-based CDMO partner, (2) Regulatory Strategy Development — pre-IND consultation with a biomanufacturing-quality regulatory advisor, (3) Opportunity Assessment — market-validation sprint with five identified potential commercial customers.",
  planTimeline: [
    { id: makeId(), activityNumber: "1.1", deliverables: "Pilot protocol finalized + signed with CDMO partner", primaryPlaceOfWork: "MaRS / CDMO", completionDate: "2026-07-15" },
    { id: makeId(), activityNumber: "1.2", deliverables: "Validation run #1 — batch report delivered", primaryPlaceOfWork: "CDMO partner site", completionDate: "2026-09-30" },
    { id: makeId(), activityNumber: "2.1", deliverables: "Pre-IND consult package drafted", primaryPlaceOfWork: "MaRS", completionDate: "2026-08-20" },
    { id: makeId(), activityNumber: "3.1", deliverables: "Customer-discovery summary (5 interviews)", primaryPlaceOfWork: "Toronto", completionDate: "2026-10-30" },
  ],
  planRationale: "Sample test data. We are at the seed stage post-provisional-patent. The next 6 months are the validation window — we need third-party data and a regulatory path before our seed raise. BHN's $25K closes the gap between bench-validated and pilot-validated, which is the inflection point for our series A pitch.",
  commercializationMilestones: "Sample test data. Pilot validation report (technical), pre-IND meeting package (regulatory), three signed pilot LOIs (commercial). Together these unlock our seed raise and position us for a $1M+ pre-seed round Q1 2027.",
  commercializationImpacts: "Sample test data. The validated pilot data + regulatory roadmap + customer LOIs together close the credibility gap on our seed raise. Without them we burn 6-9 months and risk losing the window for our therapeutic-area partners.",
  commercializationEngagement: "Sample test data. Five pilot prospects identified via lab-mate referrals + a MaRS introduction. Engagement format: 30-minute exploratory call → onsite demo → paid pilot agreement. One LOI signed; four in active discussion.",
  impactNextSteps: "Sample test data. So what: validated data → seed raise → 18-month runway to first paying customer. How: BHN $25K bridges validation; seed funds onsite team + first 10 pilots. Where: Ontario-based CDMOs first, then Quebec biotech corridor. With whom: existing pilot partner + CDL Bio cohort.",
  impactIncubatorParticipation: "Sample test data. CDL Bio (Toronto, 2025-2026 cohort) provides mentorship + investor exposure. JLABS @ Toronto provides facility access. BHN funds complement these by directly underwriting validation costs neither incubator covers.",
  budgetLines: [
    { id: makeId(), category: "services",           activityNumber: "1.2", itemDescription: "External CDMO pilot — batch run #1",  justification: "Third-party pilot demonstrating manufacturability for our seed-stage pitch", unitCount: 1,  unitRate: 12000, amount: 12000, serviceProviderName: "CDMO Partner A" },
    { id: makeId(), category: "consulting",         activityNumber: "2.1", itemDescription: "Regulatory pre-IND consult (hours)",   justification: "Strategic regulatory positioning for therapeutic-area path",                  unitCount: 30, unitRate: 250,   amount: 7500,  serviceProviderName: "Regulatory advisor (TBD)" },
    { id: makeId(), category: "materials_supplies", activityNumber: "1.2", itemDescription: "Reagents + consumables for pilot run", justification: "Custom resin + buffers for the validation pilot",                                unitCount: 1,  unitRate: 4000,  amount: 4000,  serviceProviderName: "Sigma / Fisher" },
    { id: makeId(), category: "other",              activityNumber: "3.1", itemDescription: "Customer-discovery travel",             justification: "Five onsite customer-discovery interviews across the Toronto-Montreal corridor", unitCount: 1,  unitRate: 1500,  amount: 1500,  serviceProviderName: "" },
  ],
  partnerContributions: [
    { id: makeId(), partnerName: "MaRS Discovery District", kind: "in_kind", description: "Bench + cleanroom access during pilot", amountOrUnitCount: "3 months" },
  ],
  budgetNotes: "Sample test data. Budget sums to $25,000 CAD — the full VentureLift grant envelope.",
  primarySignatureName: "Lin Wei",
  primarySignatureDate: new Date().toISOString().slice(0, 10),
  founderSignatureName: "Lin Wei",
  founderSignatureDate: new Date().toISOString().slice(0, 10),
  piSignatureName: "Avery Park",
  piSignatureDate: new Date().toISOString().slice(0, 10),
  acknowledged: true,
};

export function LiftFullForm({ applicationId, initial, initialDocuments, profile, isAdmin }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<VentureLiftFullData>(() => ({
    // Pre-fill from profile when the corresponding form field is
    // empty. The applicant can edit anything.
    applicantFullName: initial.applicantFullName ?? profile.name,
    applicantInstitution: initial.applicantInstitution ?? profile.organization ?? undefined,
    applicantTitleInCompany: initial.applicantTitleInCompany ?? profile.jobTitle ?? undefined,
    ...initial,
  }));
  const [documents, setDocuments] = useState<EquipDocument[]>(initialDocuments);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitDetails, setSubmitDetails] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save — every keystroke schedules an 800ms
  // timer; subsequent keystrokes reset it. Matches the pattern
  // already in LiftForm/ConnectForm.
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(form);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function saveDraft(next: VentureLiftFullData) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/equip/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch {
      setSaveState("error");
    }
  }

  function set<K extends keyof VentureLiftFullData>(key: K, value: VentureLiftFullData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitError(null);
    setSubmitDetails(null);
    startTransition(async () => {
      try {
        // Flush any pending save first.
        await saveDraft(form);
        const res = await fetch(`/api/equip/applications/${applicationId}/submit`, {
          method: "POST",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSubmitError(j.error ?? "Submission failed.");
          if (Array.isArray(j.details)) setSubmitDetails(j.details);
          return;
        }
        router.push("/equip/my-applications");
      } catch (e) {
        setSubmitError((e as Error).message);
      }
    });
  }

  // Counts for the appendix bar.
  const cvCount      = documents.filter((d) => d.kind === "cv").length;
  const letterCount  = documents.filter((d) => d.kind === "support_letter").length;
  const ipDocCount   = documents.filter((d) => d.kind === "ip_doc").length;
  const hasIpAppendix = ipDocCount > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-700">
          VentureLift · Stage 2 · Full application
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          Tell us about your venture
        </h1>
        <p className="text-sm text-muted max-w-3xl">
          You passed the pre-screen — now the full picture. The form auto-saves every 800 ms; close the tab anytime and pick back up. Three signers are required at the end (you, your founder/co-founder if different, your PI).
        </p>
        <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
      </header>

      <AiBanner />

      {isAdmin && (
        <AdminToolStrip
          onFill={() => setForm({ ...SAMPLE_VL_FULL })}
          onClear={() => setForm({})}
        />
      )}

      {/* ─── PART 1 PROJECT TEAM ─── */}
      <Section icon={<Briefcase size={14} />} eyebrow="Part 1" title="Project team">
        <Field label="Project title *">
          <input
            type="text"
            value={form.projectTitle ?? ""}
            onChange={(e) => set("projectTitle", e.target.value)}
            placeholder="Short title for your project / venture"
            className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <SubHeading>1.1 Primary Applicant</SubHeading>
        <Grid2>
          <Field label="Full name *"><Input value={form.applicantFullName ?? ""} onChange={(v) => set("applicantFullName", v)} /></Field>
          <Field label="Current role *">
            <select
              value={form.applicantRole ?? ""}
              onChange={(e) => set("applicantRole", (e.target.value || undefined) as ApplicantRole)}
              className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Pick one</option>
              {APPLICANT_ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Institution / Affiliation *"><Input value={form.applicantInstitution ?? ""} onChange={(v) => set("applicantInstitution", v)} /></Field>
          <Field label="Department / Program"><Input value={form.applicantDepartment ?? ""} onChange={(v) => set("applicantDepartment", v)} /></Field>
          <Field label="Title / Position in the Company *"><Input value={form.applicantTitleInCompany ?? ""} onChange={(v) => set("applicantTitleInCompany", v)} /></Field>
          <Field label="Time commitment to the company (% or FTE) *"><Input value={form.applicantTimeCommitment ?? ""} placeholder="20% / 0.4 FTE" onChange={(v) => set("applicantTimeCommitment", v)} /></Field>
        </Grid2>

        <SubHeading>1.2 Principal Investigator (PI)</SubHeading>
        <Grid2>
          <Field label="Full name *"><Input value={form.piFullName ?? ""} onChange={(v) => set("piFullName", v)} /></Field>
          <Field label="Institution / Affiliation *"><Input value={form.piInstitution ?? ""} onChange={(v) => set("piInstitution", v)} /></Field>
          <Field label="Department / Program"><Input value={form.piDepartment ?? ""} onChange={(v) => set("piDepartment", v)} /></Field>
          <Field label="Title / Position in the Company"><Input value={form.piTitleInCompany ?? ""} onChange={(v) => set("piTitleInCompany", v)} /></Field>
        </Grid2>
        <Field label="Brief description of PI's role *">
          <textarea
            rows={4}
            value={form.piRoleDescription ?? ""}
            onChange={(e) => set("piRoleDescription", e.target.value)}
            placeholder="How will the PI support the applicant and contribute to the project? (a few sentences)"
            className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <SubHeading>1.3 Company information</SubHeading>
        <Grid2>
          <Field label="Company name *"><Input value={form.companyName ?? ""} onChange={(v) => set("companyName", v)} /></Field>
          <Field label="Address"><Input value={form.companyAddress ?? ""} onChange={(v) => set("companyAddress", v)} /></Field>
          <Field label="Website"><Input value={form.companyWebsite ?? ""} onChange={(v) => set("companyWebsite", v)} /></Field>
          <Field label="Date of incorporation (if available)"><Input value={form.companyIncorporationDate ?? ""} type="date" onChange={(v) => set("companyIncorporationDate", v)} /></Field>
        </Grid2>
        <Field label="Nature of IP / start-up being developed *">
          <div className="flex flex-wrap gap-3">
            <Checkbox checked={!!form.natureProduct}              onChange={(v) => set("natureProduct",              v)}>Product</Checkbox>
            <Checkbox checked={!!form.natureService}              onChange={(v) => set("natureService",              v)}>Service</Checkbox>
            <Checkbox checked={!!form.natureTechnologyPlatform}   onChange={(v) => set("natureTechnologyPlatform",   v)}>Technology / Platform</Checkbox>
          </div>
        </Field>

        <SubHeading>1.4 Other team members</SubHeading>
        <TeamMembersTable
          rows={form.teamMembers ?? []}
          onChange={(rows) => set("teamMembers", rows)}
        />
      </Section>

      {/* ─── PART 2 INNOVATION & PROJECT OVERVIEW ─── */}
      <Section icon={<Rocket size={14} />} eyebrow="Part 2" title="Innovation & project overview">
        <SubHeading>2.1 Innovation and Technical Merit</SubHeading>
        <Field label="2.1.1 Brief overview of your company *">
          <Textarea value={form.innovationCompanyOverview ?? ""} onChange={(v) => set("innovationCompanyOverview", v)} placeholder="Core mission and key products or technologies." />
        </Field>
        <Field label="2.1.2 Problem / need + impact on human health *">
          <Textarea value={form.innovationProblemAndImpact ?? ""} onChange={(v) => set("innovationProblemAndImpact", v)} placeholder="What problem does the technology address and what's the potential impact?" />
        </Field>
        <Field label="2.1.3 IP description, barriers, and proof of ownership *">
          <Textarea value={form.innovationIpDescription ?? ""} onChange={(v) => set("innovationIpDescription", v)} placeholder="Scope + uniqueness, potential barriers, proof of protection (attach Appendix 3 below)." />
        </Field>

        <SubHeading>2.2 Market Potential and Industry Relevance</SubHeading>
        <Field label="2.2.1 Target market and potential customers *">
          <Textarea value={form.marketOverview ?? ""} onChange={(v) => set("marketOverview", v)} />
        </Field>
        <Field label="2.2.2 Competitive landscape *">
          <Textarea value={form.marketCompetitive ?? ""} onChange={(v) => set("marketCompetitive", v)} />
        </Field>
        <Field label="2.2.3 Advancement over alternatives + Canadian industry alignment *">
          <Textarea value={form.marketAdvancement ?? ""} onChange={(v) => set("marketAdvancement", v)} />
        </Field>

        <SubHeading>2.3 Project Plan</SubHeading>
        <Field label="2.3.1 Commercialization-enabling activities *">
          <Textarea value={form.planActivities ?? ""} onChange={(v) => set("planActivities", v)} placeholder="Which Support Area(s) does this funding cover? (Business strategy, product development, regulatory, operations.)" />
        </Field>
        <SubHeading>2.3.2 Expected timeline & deliverables (≤6 months)</SubHeading>
        <TimelineTable rows={form.planTimeline ?? []} onChange={(rows) => set("planTimeline", rows)} />
        <Field label="2.3.3 Rationale for timing and focus *">
          <Textarea value={form.planRationale ?? ""} onChange={(v) => set("planRationale", v)} placeholder="Why are these activities critical at this stage of your company's development?" />
        </Field>

        <SubHeading>2.4 Commercialization Potential and Expected Outcomes</SubHeading>
        <Field label="2.4.1 Business / commercialization milestones *">
          <Textarea value={form.commercializationMilestones ?? ""} onChange={(v) => set("commercializationMilestones", v)} />
        </Field>
        <Field label="2.4.2 Anticipated impacts *">
          <Textarea value={form.commercializationImpacts ?? ""} onChange={(v) => set("commercializationImpacts", v)} />
        </Field>
        <Field label="2.4.3 Customer / user engagement mechanisms *">
          <Textarea value={form.commercializationEngagement ?? ""} onChange={(v) => set("commercializationEngagement", v)} />
        </Field>

        <SubHeading>2.5 Impact and Follow-on Potential</SubHeading>
        <Field label="2.5.1 Next steps (so what, how, where, with whom) *">
          <Textarea value={form.impactNextSteps ?? ""} onChange={(v) => set("impactNextSteps", v)} placeholder="Strategy for attracting follow-on support — future funding, strategic partnerships, investor interest." />
        </Field>
        <Field label="2.5.2 Prior incubator / accelerator participation">
          <Textarea value={form.impactIncubatorParticipation ?? ""} onChange={(v) => set("impactIncubatorParticipation", v)} placeholder="How will BHN funds complement what you already accessed?" />
        </Field>
      </Section>

      {/* ─── PART 3 BUDGET ─── */}
      <Section icon={<DollarSign size={14} />} eyebrow="Part 3" title="Budget and use of funds">
        <p className="text-xs text-muted -mt-1">
          Cap is <strong>$25,000 CAD</strong>. Group line items by Expense Category. Reference Activity # in your timeline above.
        </p>
        <BudgetTable rows={form.budgetLines ?? []} onChange={(rows) => set("budgetLines", rows)} />
        <SubHeading>Partner contributions (cash / in-kind)</SubHeading>
        <PartnerContributionsTable rows={form.partnerContributions ?? []} onChange={(rows) => set("partnerContributions", rows)} />
        <Field label="Notes (optional)">
          <Textarea value={form.budgetNotes ?? ""} onChange={(v) => set("budgetNotes", v)} placeholder="Anything you want the reviewer to know about the budget breakdown." />
        </Field>
      </Section>

      {/* ─── PART 4 APPENDICES ─── */}
      <Section icon={<BookOpen size={14} />} eyebrow="Part 4" title="Supporting documents (appendices)">
        <p className="text-xs text-muted -mt-1 mb-3">
          Drag-and-drop into each tray. CVs and IP supporting documents are <strong>required at submit</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <AppendixSummaryChip
            label="Appendix 1 — CVs"
            help="Primary applicant + PI in one PDF, max 2 pages each."
            count={cvCount}
            required
            satisfied={cvCount > 0}
          />
          <AppendixSummaryChip
            label="Appendix 2 — Support letters"
            help="Up to 3 letters. Cannot come from service providers."
            count={letterCount}
            required={false}
            satisfied={true}
            max={3}
          />
          <AppendixSummaryChip
            label="Appendix 3 — IP documents"
            help="Provisional patent, application receipt, license agreement, etc."
            count={ipDocCount}
            required
            satisfied={hasIpAppendix}
          />
        </div>
        <LiftDocumentTray
          applicationId={applicationId}
          documents={documents}
          onChange={setDocuments}
          kinds={STAGE_2_KINDS}
          title="Appendices"
          blurb="Drag-and-drop into the right tray. The exact mapping to Appendix 1 / 2 / 3 is preserved when admins download the application."
        />
      </Section>

      {/* ─── PART 5 SIGNATURES ─── */}
      <Section icon={<FileSignature size={14} />} eyebrow="Part 5" title="Signatures">
        <p className="text-xs text-muted -mt-1">
          All three signers must complete this block. The PI holds the funds; their institution audits the expenditure.
        </p>
        <SignatureBlock
          label="Primary Applicant"
          name={form.primarySignatureName ?? ""}
          date={form.primarySignatureDate ?? ""}
          onName={(v) => set("primarySignatureName", v)}
          onDate={(v) => set("primarySignatureDate", v)}
        />
        <SignatureBlock
          label="Founder / Co-Founder (if different from Primary Applicant)"
          name={form.founderSignatureName ?? ""}
          date={form.founderSignatureDate ?? ""}
          onName={(v) => set("founderSignatureName", v)}
          onDate={(v) => set("founderSignatureDate", v)}
        />
        <SignatureBlock
          label="Principal Investigator (PI)"
          name={form.piSignatureName ?? ""}
          date={form.piSignatureDate ?? ""}
          onName={(v) => set("piSignatureName", v)}
          onDate={(v) => set("piSignatureDate", v)}
        />
        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.acknowledged}
            onChange={(e) => set("acknowledged", e.target.checked)}
            className="mt-1"
          />
          <span className="text-xs text-muted">
            All signers acknowledge that the information provided in this application is accurate and that the requested funds will be used for the purposes outlined above.
          </span>
        </label>
      </Section>

      {/* Submit */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-xs text-emerald-900 space-y-0.5">
          <p className="font-bold text-sm">Ready to submit?</p>
          <p className="opacity-80">Once submitted you can't edit, but you can still message the reviewer.</p>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit full application
        </button>
      </section>

      {submitError && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-rose-900 font-bold text-sm inline-flex items-center gap-2">
            <AlertTriangle size={14} /> {submitError}
          </p>
          {submitDetails && submitDetails.length > 0 && (
            <ul className="text-xs text-rose-800 mt-2 space-y-0.5 list-disc list-inside">
              {submitDetails.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Layout primitives ────────────────────────────────────────────

function Section({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 surface-shadow space-y-3">
      <header className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">{icon}</span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-subtle">{eyebrow}</p>
          <h2 className="text-base font-bold text-fg">{title}</h2>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-wider font-bold text-fg mt-3">{children}</p>;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider font-bold text-subtle">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      rows={4}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-card-solid border border-line rounded-lg px-3 py-2 text-sm"
    />
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

function SaveIndicator({ state, lastSavedAt }: { state: string; lastSavedAt: Date | null }) {
  if (state === "saving") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-subtle"><Loader2 size={11} className="animate-spin" /> Saving…</span>;
  }
  if (state === "saved" && lastSavedAt) {
    return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><Check size={11} /> Saved {Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000))} s ago</span>;
  }
  if (state === "error") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-rose-700"><AlertCircle size={11} /> Save failed — retry</span>;
  }
  return <span className="text-[10px] text-subtle">Auto-save on</span>;
}

function AiBanner() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2">
      <AlertTriangle size={14} className="text-amber-700 mt-0.5 shrink-0" />
      <p className="text-[11px] text-amber-900 leading-snug">{NO_AI_DISCLAIMER}</p>
    </section>
  );
}

function AdminToolStrip({ onFill, onClear }: { onFill: () => void; onClear: () => void }) {
  return (
    <section className="rounded-2xl border border-violet-300 bg-violet-50/60 p-3 flex items-center gap-3 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider font-bold text-violet-900">Admin testing</span>
      <button type="button" onClick={onFill} className="inline-flex items-center gap-1 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg">
        <FlaskConical size={11} /> Fill sample
      </button>
      <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs bg-card border border-line text-fg px-3 py-1.5 rounded-lg hover:bg-elevated">
        <Eraser size={11} /> Clear
      </button>
      <span className="text-[10px] text-violet-900">Only visible to admins / superadmins.</span>
    </section>
  );
}

function AppendixSummaryChip({ label, help, count, required, satisfied, max }: { label: string; help: string; count: number; required: boolean; satisfied: boolean; max?: number }) {
  const tone =
    !satisfied && required ? "border-rose-300 bg-rose-50/60"
    : count > 0            ? "border-emerald-300 bg-emerald-50/60"
                            : "border-line bg-card-solid";
  return (
    <div className={"rounded-xl border p-3 " + tone}>
      <p className="text-[11px] font-bold text-fg">{label}{required && <span className="text-rose-700"> *</span>}</p>
      <p className="text-[10px] text-muted mt-0.5">{help}</p>
      <p className="text-[10px] font-mono mt-1">
        {count} file{count === 1 ? "" : "s"} attached{max ? ` (max ${max})` : ""}
      </p>
    </div>
  );
}

function SignatureBlock({ label, name, date, onName, onDate }: { label: string; name: string; date: string; onName: (v: string) => void; onDate: (v: string) => void }) {
  return (
    <div className="rounded-xl bg-elevated/40 border border-line p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-subtle">{label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <Field label="Print name">
          <Input value={name} onChange={onName} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={onDate} />
        </Field>
      </div>
    </div>
  );
}

// ─── Team members table ──────────────────────────────────────────

function TeamMembersTable({ rows, onChange }: { rows: VentureLiftTeamMember[]; onChange: (rows: VentureLiftTeamMember[]) => void }) {
  function add() { onChange([...rows, { id: makeId() }]); }
  function remove(id: string) { onChange(rows.filter((r) => r.id !== id)); }
  function patch(id: string, key: keyof VentureLiftTeamMember, value: string) {
    onChange(rows.map((r) => r.id === id ? { ...r, [key]: value } : r));
  }
  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-subtle italic">No team members added. Click + Add row if there are others.</p>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-elevated/40 text-subtle">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Name</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Role</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Area of expertise</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Institution</th>
                <th className="px-2 py-1.5 w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1"><Input value={r.name ?? ""} onChange={(v) => patch(r.id, "name", v)} /></td>
                  <td className="px-2 py-1"><Input value={r.role ?? ""} onChange={(v) => patch(r.id, "role", v)} /></td>
                  <td className="px-2 py-1"><Input value={r.areaOfExpertise ?? ""} onChange={(v) => patch(r.id, "areaOfExpertise", v)} /></td>
                  <td className="px-2 py-1"><Input value={r.institution ?? ""} onChange={(v) => patch(r.id, "institution", v)} /></td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => remove(r.id)} className="text-rose-700 hover:text-rose-900">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900">
        <Plus size={11} /> Add team member
      </button>
    </div>
  );
}

// ─── Timeline table ──────────────────────────────────────────────

function TimelineTable({ rows, onChange }: { rows: VentureLiftTimelineRow[]; onChange: (rows: VentureLiftTimelineRow[]) => void }) {
  function add() { onChange([...rows, { id: makeId() }]); }
  function remove(id: string) { onChange(rows.filter((r) => r.id !== id)); }
  function patch(id: string, key: keyof VentureLiftTimelineRow, value: string) {
    onChange(rows.map((r) => r.id === id ? { ...r, [key]: value } : r));
  }
  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-subtle italic">Add at least one row for each major deliverable.</p>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-elevated/40 text-subtle">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Activity #</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Deliverables</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Primary place of work</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Completion date</th>
                <th className="px-2 py-1.5 w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1 w-20"><Input value={r.activityNumber ?? ""} onChange={(v) => patch(r.id, "activityNumber", v)} /></td>
                  <td className="px-2 py-1"><Input value={r.deliverables ?? ""} onChange={(v) => patch(r.id, "deliverables", v)} /></td>
                  <td className="px-2 py-1"><Input value={r.primaryPlaceOfWork ?? ""} onChange={(v) => patch(r.id, "primaryPlaceOfWork", v)} /></td>
                  <td className="px-2 py-1 w-36"><Input type="date" value={r.completionDate ?? ""} onChange={(v) => patch(r.id, "completionDate", v)} /></td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => remove(r.id)} className="text-rose-700 hover:text-rose-900">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900">
        <Plus size={11} /> Add timeline row
      </button>
    </div>
  );
}

// ─── Budget table ────────────────────────────────────────────────

function BudgetTable({ rows, onChange }: { rows: VentureLiftBudgetLine[]; onChange: (rows: VentureLiftBudgetLine[]) => void }) {
  const total = useMemo(() => rows.reduce<number>((s, r) => s + (r.amount ?? 0), 0), [rows]);
  const overCap = total > 25_000;

  function add() { onChange([...rows, { id: makeId(), category: "services" }]); }
  function remove(id: string) { onChange(rows.filter((r) => r.id !== id)); }
  function patch(id: string, partial: Partial<VentureLiftBudgetLine>) {
    onChange(rows.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...partial };
      // Auto-compute amount.
      if (partial.unitCount != null || partial.unitRate != null) {
        const uc = next.unitCount ?? 0;
        const ur = next.unitRate ?? 0;
        next.amount = uc * ur;
      }
      return next;
    }));
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-subtle italic">No line items yet. Add one per supported activity (consulting hours, materials, services, etc.).</p>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-elevated/40 text-subtle">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Category</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Activity #</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Item description</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Justification</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Unit #</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Unit rate</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Amount</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Service provider</th>
                <th className="px-2 py-1.5 w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1 w-44">
                    <select
                      value={r.category}
                      onChange={(e) => patch(r.id, { category: e.target.value as VentureLiftBudgetLine["category"] })}
                      className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs"
                    >
                      {BUDGET_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 w-20"><Input value={r.activityNumber ?? ""} onChange={(v) => patch(r.id, { activityNumber: v })} /></td>
                  <td className="px-2 py-1"><Input value={r.itemDescription ?? ""} onChange={(v) => patch(r.id, { itemDescription: v })} /></td>
                  <td className="px-2 py-1"><Input value={r.justification ?? ""} onChange={(v) => patch(r.id, { justification: v })} /></td>
                  <td className="px-2 py-1 w-20">
                    <input type="number" value={r.unitCount ?? ""} onChange={(e) => patch(r.id, { unitCount: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-mono tabular-nums" />
                  </td>
                  <td className="px-2 py-1 w-24">
                    <input type="number" value={r.unitRate ?? ""} onChange={(e) => patch(r.id, { unitRate: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs font-mono tabular-nums" />
                  </td>
                  <td className="px-2 py-1 w-24 font-mono tabular-nums text-fg">${(r.amount ?? 0).toLocaleString()}</td>
                  <td className="px-2 py-1"><Input value={r.serviceProviderName ?? ""} onChange={(v) => patch(r.id, { serviceProviderName: v })} /></td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => remove(r.id)} className="text-rose-700 hover:text-rose-900">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-elevated/30">
                <td colSpan={6} className="px-2 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-subtle">Total</td>
                <td className={"px-2 py-2 font-mono tabular-nums font-bold " + (overCap ? "text-rose-700" : "text-fg")}>${total.toLocaleString()}</td>
                <td colSpan={2} className="px-2 py-2 text-[10px] text-subtle">
                  {overCap ? <span className="text-rose-700 inline-flex items-center gap-1"><AlertCircle size={11} /> Over $25K cap</span> : <>of $25,000 cap</>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900">
        <Plus size={11} /> Add budget line
      </button>
    </div>
  );
}

// ─── Partner contributions table ─────────────────────────────────

function PartnerContributionsTable({ rows, onChange }: { rows: VentureLiftPartnerContribution[]; onChange: (rows: VentureLiftPartnerContribution[]) => void }) {
  function add() { onChange([...rows, { id: makeId(), kind: "cash" }]); }
  function remove(id: string) { onChange(rows.filter((r) => r.id !== id)); }
  function patch(id: string, partial: Partial<VentureLiftPartnerContribution>) {
    onChange(rows.map((r) => r.id === id ? { ...r, ...partial } : r));
  }
  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-subtle italic">Optional. Add any cash or in-kind contributions from partners.</p>
      )}
      {rows.length > 0 && (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-elevated/40 text-subtle">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Partner name</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Cash / In-kind</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Description</th>
                <th className="px-2 py-1.5 text-left font-semibold uppercase tracking-wider">Amount / Units</th>
                <th className="px-2 py-1.5 w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1"><Input value={r.partnerName ?? ""} onChange={(v) => patch(r.id, { partnerName: v })} /></td>
                  <td className="px-2 py-1 w-32">
                    <select
                      value={r.kind ?? "cash"}
                      onChange={(e) => patch(r.id, { kind: e.target.value as "cash" | "in_kind" })}
                      className="w-full bg-card-solid border border-line rounded-lg px-2 py-1.5 text-xs"
                    >
                      <option value="cash">Cash</option>
                      <option value="in_kind">In-kind</option>
                    </select>
                  </td>
                  <td className="px-2 py-1"><Input value={r.description ?? ""} onChange={(v) => patch(r.id, { description: v })} /></td>
                  <td className="px-2 py-1 w-32"><Input value={r.amountOrUnitCount ?? ""} onChange={(v) => patch(r.id, { amountOrUnitCount: v })} /></td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => remove(r.id)} className="text-rose-700 hover:text-rose-900">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900">
        <Plus size={11} /> Add contribution
      </button>
    </div>
  );
}
