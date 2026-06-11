/**
 * EQUIP application emails — the full lifecycle, for both streams
 * (VentureConnect + VentureLift).
 *
 * Each builder returns { subject, html, text }. HTML uses an email-safe,
 * table-based, inline-styled shell (no external CSS — clients strip it).
 * Stream-aware copy is derived from STREAM_META so VC ($5k, single-stage,
 * up to 3 apps) and VL ($25k, two-stage) read correctly from one template.
 *
 * Wiring:
 *   • submission confirmation  → /api/equip/applications/[id]/submit
 *   • every decision email     → /api/admin/equip/applications/[id] (PATCH),
 *     via buildEquipStatusEmail(targetStatus, ctx)
 * Reviewers can preview every template at /admin/equip/email-templates.
 *
 * All sends are best-effort behind mailConfigured(); a mail failure never
 * blocks the underlying status change.
 */
import { STREAM_META, type EquipStream, type EquipStatus, type ApplicationStage } from "@/lib/equip/types";

export interface Built {
  subject: string;
  html: string;
  text: string;
}

/** Everything any EQUIP template might need. Builders read what they use. */
export interface EquipEmailCtx {
  applicantName?: string | null;
  stream: EquipStream;
  /** VL submission stage — distinguishes pre-screen vs full-app confirmation. */
  stage?: ApplicationStage;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  reviewerNote?: string | null;
  disbursementNote?: string | null;
  /** Human label for a deadline / milestone date, pre-formatted by the caller. */
  deadlineLabel?: string | null;
  milestoneTitle?: string | null;
  dueLabel?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function baseUrl(): string {
  const fromEnv =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3001";
  return fromEnv.replace(/\/$/, "");
}

const trackerUrl = () => `${baseUrl()}/equip/my-applications`;

const BRAND = "#0e7490"; // teal-blue, on the BHN teal–blue–green family
const BRAND_DARK = "#0b5566";
const INK = "#0f172a";
const MUTE = "#64748b";
const LINE = "#e2e8f0";
const BG = "#f1f5f9";

const firstName = (name?: string | null) => {
  const n = (name ?? "").trim();
  if (!n) return "there";
  return n.split(/\s+/)[0];
};

function formatCad(n?: number | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return `$${Math.round(n).toLocaleString("en-CA")} CAD`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A note from the reviewer, rendered as a quoted callout (HTML). */
function noteBlockHtml(note?: string | null): string {
  const n = (note ?? "").trim();
  if (!n) return "";
  return `
    <tr><td style="padding:4px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr><td style="border-left:3px solid ${BRAND};background:${BG};padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;color:${INK};">
          <span style="display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${MUTE};margin-bottom:4px;">Note from the review committee</span>
          ${esc(n).replace(/\n/g, "<br>")}
        </td></tr>
      </table>
    </td></tr>`;
}

/** Email-safe shell. Renders a branded card with optional CTA + footnote. */
function shell(opts: {
  preheader: string;
  heading: string;
  paras: string[]; // each a paragraph of (already-escaped or trusted) HTML
  extraHtml?: string; // e.g. note callout rows (full <tr>…</tr> markup)
  cta?: { label: string; url: string };
  footnote?: string;
}): string {
  const { preheader, heading, paras, extraHtml = "", cta, footnote } = opts;
  const paraHtml = paras
    .map(
      (p) =>
        `<tr><td style="padding:0 0 14px;font-size:15px;line-height:1.65;color:${INK};">${p}</td></tr>`,
    )
    .join("");
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 0 4px;">
         <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
           <tr><td style="border-radius:10px;background:${BRAND};">
             <a href="${cta.url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(cta.label)}</a>
           </td></tr>
         </table>
       </td></tr>`
    : "";
  const footnoteHtml = footnote
    ? `<tr><td style="padding:14px 0 0;font-size:12.5px;line-height:1.6;color:${MUTE};">${footnote}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${BG};">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-collapse:collapse;">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border-collapse:collapse;">
      <!-- Header -->
      <tr><td style="padding:0 0 16px;">
        <span style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${BRAND_DARK};">BioHubNet</span>
        <span style="font-size:13px;font-weight:600;letter-spacing:.06em;color:${MUTE};"> &nbsp;·&nbsp; EQUIP</span>
      </td></tr>
      <!-- Card -->
      <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:0 0 16px;font-size:21px;font-weight:800;line-height:1.3;color:${INK};">${esc(heading)}</td></tr>
          ${paraHtml}
          ${extraHtml}
          ${ctaHtml}
          ${footnoteHtml}
        </table>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:${MUTE};">
        You're receiving this because you have an EQUIP application with BioHubNet.
        Questions? Reply to this email or write to
        <a href="mailto:info@biohubnet.ca" style="color:${BRAND_DARK};text-decoration:none;">info@biohubnet.ca</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Plain-text counterpart — keeps deliverability high and covers text-only clients. */
function textVersion(opts: {
  heading: string;
  lines: string[];
  note?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): string {
  const { heading, lines, note, ctaLabel, ctaUrl, footnote } = opts;
  const parts = [heading, "", ...lines];
  if (note && note.trim()) {
    parts.push("", "Note from the review committee:", note.trim());
  }
  if (ctaLabel && ctaUrl) parts.push("", `${ctaLabel}: ${ctaUrl}`);
  if (footnote) parts.push("", footnote);
  parts.push(
    "",
    "—",
    "BioHubNet · EQUIP",
    "Questions? info@biohubnet.ca",
  );
  return parts.join("\n");
}

const meta = (stream: EquipStream) => STREAM_META[stream];

// ── Templates ────────────────────────────────────────────────────────────

/** 1. Submission received (confirmation). VL stage-aware. */
export function equipSubmissionReceived(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const isVlPreScreen = ctx.stream === "venture_lift" && ctx.stage !== "full_app";
  const isVlFull = ctx.stream === "venture_lift" && ctx.stage === "full_app";
  const what = isVlPreScreen
    ? `${m.name} Stage 1 (pre-screening) application`
    : isVlFull
      ? `${m.name} Stage 2 (full) application`
      : `${m.name} application`;
  const next = isVlPreScreen
    ? "Our committee will review your pre-screening submission. If it passes, you'll get an email unlocking the full Stage-2 application."
    : ctx.stream === "venture_lift"
      ? "Your full application now goes to the review committee for evaluation against the six VentureLift criteria."
      : "Your application now goes to the review committee. VentureConnect runs on a monthly cycle, so you'll hear back after the current window closes.";
  const amount = formatCad(ctx.requestedAmount);
  const subject = `We've received your ${m.name} application`;
  const paras = [
    `Hi ${esc(firstName(ctx.applicantName))},`,
    `Thanks — we've received your <strong>${esc(what)}</strong>${amount ? ` requesting <strong>${esc(amount)}</strong>` : ""}. It's now in the queue.`,
    esc(next),
    `You can track its status any time from your applications dashboard.`,
  ];
  return {
    subject,
    html: shell({
      preheader: `Your ${m.name} application is in the queue.`,
      heading: "Application received",
      paras,
      cta: { label: "Track my application", url: trackerUrl() },
      footnote: "No action is needed right now — we'll email you at each step.",
    }),
    text: textVersion({
      heading: "Application received",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `Thanks — we've received your ${what}${amount ? ` requesting ${amount}` : ""}. It's now in the queue.`,
        next,
        "Track its status any time from your applications dashboard.",
      ],
      ctaLabel: "Track my application",
      ctaUrl: trackerUrl(),
      footnote: "No action is needed right now — we'll email you at each step.",
    }),
  };
}

/** 2. Under review (reviewer claimed it). */
export function equipUnderReview(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  return {
    subject: `Your ${m.name} application is under review`,
    html: shell({
      preheader: `A reviewer has started evaluating your ${m.name} application.`,
      heading: "Your application is under review",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Good news — a member of the EQUIP review committee has started evaluating your <strong>${esc(m.name)}</strong> application.`,
        `There's nothing you need to do. We'll email you as soon as a decision is made.`,
      ],
      cta: { label: "View status", url: trackerUrl() },
    }),
    text: textVersion({
      heading: "Your application is under review",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `A member of the EQUIP review committee has started evaluating your ${m.name} application.`,
        "There's nothing you need to do — we'll email you as soon as a decision is made.",
      ],
      ctaLabel: "View status",
      ctaUrl: trackerUrl(),
    }),
  };
}

/** 3. VL pre-screen passed → Stage 2 unlocked. */
export function equipPreScreenPassed(ctx: EquipEmailCtx): Built {
  return {
    subject: "Your VentureLift pre-screening passed — Stage 2 is open",
    html: shell({
      preheader: "You've passed pre-screening. The full VentureLift application is now open.",
      heading: "You're through to Stage 2",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Congratulations — your <strong>VentureLift</strong> pre-screening passed. The full Stage-2 application is now unlocked.`,
        `Stage 2 covers Innovation, Market Potential, Project Plan, and Commercialization Potential &amp; Impact, and asks for your CV and IP supporting documents (a filed provisional patent is the minimum). Funding is up to <strong>$25,000 CAD</strong>.`,
      ],
      extraHtml: noteBlockHtml(ctx.reviewerNote),
      cta: { label: "Open my Stage-2 application", url: trackerUrl() },
      footnote: "Tip: prepare Appendix 3 (IP documents) early — it's the hard eligibility gate for approval.",
    }),
    text: textVersion({
      heading: "You're through to Stage 2",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        "Congratulations — your VentureLift pre-screening passed. The full Stage-2 application is now unlocked.",
        "Stage 2 covers Innovation, Market Potential, Project Plan, and Commercialization Potential & Impact, and asks for your CV and IP supporting documents. Funding is up to $25,000 CAD.",
      ],
      note: ctx.reviewerNote,
      ctaLabel: "Open my Stage-2 application",
      ctaUrl: trackerUrl(),
      footnote: "Tip: prepare Appendix 3 (IP documents) early — it's the hard eligibility gate for approval.",
    }),
  };
}

/** 4. VL pre-screen not selected. */
export function equipPreScreenNotSelected(ctx: EquipEmailCtx): Built {
  return {
    subject: "Update on your VentureLift pre-screening",
    html: shell({
      preheader: "A decision on your VentureLift pre-screening.",
      heading: "Update on your pre-screening",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Thank you for your interest in <strong>VentureLift</strong>. After review, your pre-screening application wasn't selected to advance to Stage 2 this cycle.`,
        `This isn't a reflection of your venture's potential — pre-screening is competitive and tightly scoped to the program's eligibility criteria. You're welcome to apply again in a future cycle.`,
      ],
      extraHtml: noteBlockHtml(ctx.reviewerNote),
      cta: { label: "Explore EQUIP streams", url: `${baseUrl()}/equip` },
    }),
    text: textVersion({
      heading: "Update on your pre-screening",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        "Thank you for your interest in VentureLift. After review, your pre-screening application wasn't selected to advance to Stage 2 this cycle.",
        "This isn't a reflection of your venture's potential — you're welcome to apply again in a future cycle.",
      ],
      note: ctx.reviewerNote,
      ctaLabel: "Explore EQUIP streams",
      ctaUrl: `${baseUrl()}/equip`,
    }),
  };
}

/** 5. Approved (with amount). Both streams. */
export function equipApproved(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const amount = formatCad(ctx.approvedAmount ?? ctx.requestedAmount);
  return {
    subject: `Your ${m.name} application has been approved`,
    html: shell({
      preheader: `Approved${amount ? ` for ${amount}` : ""}. Funding disbursement comes next.`,
      heading: "Your application is approved 🎉",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Congratulations — your <strong>${esc(m.name)}</strong> application has been <strong>approved</strong>${amount ? ` for <strong>${esc(amount)}</strong>` : ""}.`,
        `Next, our team prepares the funding disbursement. You'll get a separate email once funds are released, along with the milestones tied to your grant.`,
      ],
      extraHtml: noteBlockHtml(ctx.reviewerNote),
      cta: { label: "View my approval", url: trackerUrl() },
    }),
    text: textVersion({
      heading: "Your application is approved",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `Congratulations — your ${m.name} application has been approved${amount ? ` for ${amount}` : ""}.`,
        "Next, our team prepares the funding disbursement. You'll get a separate email once funds are released, along with your grant milestones.",
      ],
      note: ctx.reviewerNote,
      ctaLabel: "View my approval",
      ctaUrl: trackerUrl(),
    }),
  };
}

/** 6. Not selected (rejected). Both streams. */
export function equipNotSelected(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const again =
    ctx.stream === "venture_connect"
      ? "VentureConnect runs monthly, and a company may submit up to three separate applications — you're welcome to apply again for a future event."
      : "You're welcome to apply again in a future VentureLift cycle.";
  return {
    subject: `Update on your ${m.name} application`,
    html: shell({
      preheader: `A decision on your ${m.name} application.`,
      heading: "Update on your application",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Thank you for applying to <strong>${esc(m.name)}</strong>. After careful review, your application wasn't selected for funding this round.`,
        `Decisions are competitive and weighed against the program's criteria and available budget. ${esc(again)}`,
      ],
      extraHtml: noteBlockHtml(ctx.reviewerNote),
      cta: { label: "Explore EQUIP streams", url: `${baseUrl()}/equip` },
    }),
    text: textVersion({
      heading: "Update on your application",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `Thank you for applying to ${m.name}. After careful review, your application wasn't selected for funding this round.`,
        `Decisions are competitive and weighed against the program's criteria and available budget. ${again}`,
      ],
      note: ctx.reviewerNote,
      ctaLabel: "Explore EQUIP streams",
      ctaUrl: `${baseUrl()}/equip`,
    }),
  };
}

/** 7. Funded (disbursed; milestones begin). Both streams. */
export function equipFunded(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const amount = formatCad(ctx.approvedAmount);
  return {
    subject: `Your ${m.name} grant has been funded`,
    html: shell({
      preheader: `Your ${m.name} funds are on the way${amount ? ` (${amount})` : ""}.`,
      heading: "Your grant is funded",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Your <strong>${esc(m.name)}</strong> grant${amount ? ` of <strong>${esc(amount)}</strong>` : ""} has been <strong>funded</strong>. 🎉`,
        `Your grant milestones are now live on your dashboard — please keep them up to date as you progress. Reporting on outcomes is part of the program and helps us support the next cohort.`,
      ],
      extraHtml: noteBlockHtml(ctx.disbursementNote),
      cta: { label: "View my milestones", url: trackerUrl() },
    }),
    text: textVersion({
      heading: "Your grant is funded",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `Your ${m.name} grant${amount ? ` of ${amount}` : ""} has been funded.`,
        "Your grant milestones are now live on your dashboard — please keep them up to date as you progress.",
      ],
      note: ctx.disbursementNote,
      ctaLabel: "View my milestones",
      ctaUrl: trackerUrl(),
    }),
  };
}

/** 8. Deadline reminder (library/cron-ready). */
export function equipDeadlineReminder(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const when = ctx.deadlineLabel ?? "soon";
  return {
    subject: `Reminder: ${m.name} deadline is ${when}`,
    html: shell({
      preheader: `The ${m.name} funding window closes ${when}.`,
      heading: `${m.name} deadline approaching`,
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `A quick reminder that the current <strong>${esc(m.name)}</strong> funding window closes <strong>${esc(when)}</strong>.`,
        `If you've started an application, now's the time to finish and submit it — applications must be submitted before the window closes to be considered this cycle.`,
      ],
      cta: { label: "Finish my application", url: trackerUrl() },
    }),
    text: textVersion({
      heading: `${m.name} deadline approaching`,
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `A reminder that the current ${m.name} funding window closes ${when}.`,
        "If you've started an application, finish and submit it before the window closes to be considered this cycle.",
      ],
      ctaLabel: "Finish my application",
      ctaUrl: trackerUrl(),
    }),
  };
}

/** 9. Milestone reminder (library; for funded grants). */
export function equipMilestoneReminder(ctx: EquipEmailCtx): Built {
  const m = meta(ctx.stream);
  const title = ctx.milestoneTitle ?? "a grant milestone";
  const due = ctx.dueLabel ?? "soon";
  return {
    subject: `Milestone due ${due}: ${title}`,
    html: shell({
      preheader: `Your ${m.name} grant milestone "${title}" is due ${due}.`,
      heading: "A grant milestone is coming up",
      paras: [
        `Hi ${esc(firstName(ctx.applicantName))},`,
        `Your <strong>${esc(m.name)}</strong> grant milestone — <strong>${esc(title)}</strong> — is due <strong>${esc(due)}</strong>.`,
        `Please update its status on your dashboard. Keeping milestones current is part of the funding agreement and helps us report program outcomes.`,
      ],
      cta: { label: "Update my milestones", url: trackerUrl() },
    }),
    text: textVersion({
      heading: "A grant milestone is coming up",
      lines: [
        `Hi ${firstName(ctx.applicantName)},`,
        `Your ${m.name} grant milestone — ${title} — is due ${due}.`,
        "Please update its status on your dashboard.",
      ],
      ctaLabel: "Update my milestones",
      ctaUrl: trackerUrl(),
    }),
  };
}

// ── Decision-status dispatcher (used by the admin PATCH route) ─────────────

/** Map a decision target status to the right applicant email. Returns null
 *  for statuses that shouldn't notify (e.g. nothing matched). */
export function buildEquipStatusEmail(target: EquipStatus, ctx: EquipEmailCtx): Built | null {
  switch (target) {
    case "under_review":        return equipUnderReview(ctx);
    case "pre_screen_approved": return equipPreScreenPassed(ctx);
    case "pre_screen_rejected": return equipPreScreenNotSelected(ctx);
    case "approved":            return equipApproved(ctx);
    case "rejected":            return equipNotSelected(ctx);
    case "funded":              return equipFunded(ctx);
    default:                    return null;
  }
}

// ── Catalogue (for the admin preview gallery) ──────────────────────────────

export interface EquipEmailTemplateInfo {
  id: string;
  label: string;
  when: string;
  /** Which streams this email is sent for. */
  appliesTo: "both" | EquipStream;
  build: (ctx: EquipEmailCtx) => Built;
}

export const EQUIP_EMAIL_TEMPLATES: EquipEmailTemplateInfo[] = [
  { id: "submission",        label: "Submission received",          when: "Applicant submits an application",                     appliesTo: "both",          build: equipSubmissionReceived },
  { id: "under_review",      label: "Under review",                 when: "A reviewer claims the application",                    appliesTo: "both",          build: equipUnderReview },
  { id: "pre_screen_passed", label: "Pre-screen passed (Stage 2)",  when: "VL pre-screening passes → Stage 2 unlocks",            appliesTo: "venture_lift",  build: equipPreScreenPassed },
  { id: "pre_screen_no",     label: "Pre-screen not selected",      when: "VL pre-screening isn't selected to advance",          appliesTo: "venture_lift",  build: equipPreScreenNotSelected },
  { id: "approved",          label: "Approved",                     when: "Application is approved for funding",                  appliesTo: "both",          build: equipApproved },
  { id: "not_selected",      label: "Not selected",                 when: "Application isn't selected for funding",               appliesTo: "both",          build: equipNotSelected },
  { id: "funded",            label: "Funded",                       when: "Funds are disbursed; milestones begin",               appliesTo: "both",          build: equipFunded },
  { id: "deadline",          label: "Deadline reminder",            when: "Funding window is closing soon",                      appliesTo: "both",          build: equipDeadlineReminder },
  { id: "milestone",         label: "Milestone reminder",           when: "A funded grant's milestone is due soon",              appliesTo: "both",          build: equipMilestoneReminder },
];

/** Realistic sample context for previewing a stream's templates. */
export function sampleEquipCtx(stream: EquipStream): EquipEmailCtx {
  return stream === "venture_connect"
    ? {
        applicantName: "Dr. Maya Chen",
        stream,
        requestedAmount: 4200,
        approvedAmount: 4200,
        reviewerNote: "Strong fit for the BIO International Convention — approved for airfare, registration, and two nights' accommodation.",
        deadlineLabel: "this Friday, June 27",
        milestoneTitle: "Submit post-event outcomes report",
        dueLabel: "in 2 weeks",
      }
    : {
        applicantName: "Dr. Maya Chen",
        stream,
        stage: "full_app",
        requestedAmount: 25000,
        approvedAmount: 22000,
        reviewerNote: "Compelling commercialization roadmap and a filed provisional patent. Budget trimmed to focus on the prototype milestone.",
        disbursementNote: "First tranche of $11,000 released; remainder on milestone 2 completion.",
        deadlineLabel: "June 30 (end of Q2 cycle)",
        milestoneTitle: "Complete functional prototype",
        dueLabel: "September 30",
      };
}
