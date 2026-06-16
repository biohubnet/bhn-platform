/**
 * Outreach email templates — ready-to-use copy for reaching partner orgs to
 * cross-promote BHN programs. The team picks a template, it's personalised
 * with the contact (name / org) and the sender, and they copy/send it and log
 * the reach-out.
 *
 * Copy lives as defaults (OUTREACH_TEMPLATE_DEFAULTS, designed by a panel of
 * hiring/partnership perspectives); admin edits persist in PlatformSetting
 * "outreachEmailTemplateOverrides" and win field-by-field. Bodies are plain
 * text with {{placeholders}} and \n line breaks — same string renders the
 * preview, the clipboard copy, and the mailto.
 */
import { prisma } from "@/lib/prisma";

export interface OutreachTemplate {
  id: string;
  label: string;
  when: string;   // when to use it
  subject: string;
  body: string;
}

/** Placeholders the team can use, shown in the editor. */
export const OUTREACH_PLACEHOLDERS: { token: string; desc: string }[] = [
  { token: "{{firstName}}", desc: "Contact's first name" },
  { token: "{{contactName}}", desc: "Contact's full name" },
  { token: "{{org}}", desc: "Their organisation" },
  { token: "{{senderName}}", desc: "Your name (signed in)" },
  { token: "{{senderTitle}}", desc: "Your title / team" },
  { token: "{{programName}}", desc: "Program you're promoting (e.g. EQUIP VentureLift)" },
  { token: "{{eventName}}", desc: "Event name" },
  { token: "{{eventDate}}", desc: "Event date" },
  { token: "{{deadline}}", desc: "Application / RSVP deadline" },
  { token: "{{link}}", desc: "Link to the program / event / sign-up" },
];

export interface OutreachTemplateVars {
  firstName?: string;
  contactName?: string;
  org?: string;
  senderName?: string;
  senderTitle?: string;
  programName?: string;
  eventName?: string;
  eventDate?: string;
  deadline?: string;
  link?: string;
}

/** Substitute {{placeholders}}; unknown/empty tokens collapse to "". */
export function resolveOutreachTemplate(tpl: OutreachTemplate, vars: OutreachTemplateVars): { subject: string; body: string } {
  const map: Record<string, string> = {
    firstName: vars.firstName ?? "",
    contactName: vars.contactName ?? "",
    org: vars.org ?? "",
    senderName: vars.senderName ?? "",
    senderTitle: vars.senderTitle ?? "",
    programName: vars.programName ?? "",
    eventName: vars.eventName ?? "",
    eventDate: vars.eventDate ?? "",
    deadline: vars.deadline ?? "",
    link: vars.link ?? "",
  };
  const sub = (s: string) => s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => map[k] ?? "");
  return { subject: sub(tpl.subject), body: sub(tpl.body) };
}

// ── Defaults (replaced with the synthesized panel copy) ───────────────────
// Filled from the outreach-email-templates-design workflow.
export const OUTREACH_TEMPLATE_DEFAULTS: OutreachTemplate[] = [
  {
    id: "first-intro",
    label: "First introduction / new partner",
    when: "Cold or first-ever contact with a partner org. Goal is to open a relationship and lead with one concrete, ready-to-forward offer \u2014 not 'let's get acquainted'.",
    subject: "Non-dilutive funding (no equity) for {{org}}'s founders",
    body: "Hi {{firstName}},\n\n{{org}} came up when we mapped Ontario's life-sciences hubs, and your founders look like exactly who our EQUIP grants are built for.\n\nQuick context: BHN runs non-dilutive funding for Canadian biotech founders \u2014 VentureLift offers up to $25k (two-stage, no equity) for seed-stage teams. I thought a few of {{org}}'s companies should know.\n\nNo formal partnership needed. Here's a paste-ready blurb if you'd ever like to drop it into a member update:\n\n\"BHN's EQUIP grants offer up to $25k in non-dilutive funding for seed-stage biotech founders \u2014 no equity. Apply: {{link}}\"\n\nAnd it's a two-way street \u2014 happy to feature {{org}}'s next cohort or event to our founder network too.\n\nWorth a quick chat, or should I just send the current round when it opens?\n\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "promote-program",
    label: "Promote a specific program (grant deadline)",
    when: "An EQUIP round is open with a real deadline and you want the partner to share it with their members. The workhorse template.",
    subject: "Up to $25k non-dilutive for your founders \u2014 closes {{deadline}}",
    body: "Hi {{firstName}},\n\n{{programName}} just opened: up to $25k in non-dilutive funding (no equity) for seed-stage biotech founders, closing {{deadline}}. Figured it'd fit several of {{org}}'s companies.\n\nI've done the writing for you \u2014 here's a paste-ready blurb for your next newsletter or Slack:\n\n\"Founders: {{programName}} is open \u2014 up to $25k non-dilutive (no equity) for seed-stage biotech. Closes {{deadline}}. Apply: {{link}}\"\n\nOne small ask: could you include it in your next member update? A single forward reaches exactly the right people.\n\nHappy to return the favour and amplify {{org}}'s next cohort or event to our network anytime.\n\nThanks {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "experience-talent",
    label: "Promote EXPERIENCE (talent matching) to a hub/hospital",
    when: "Partner's audience is trainees/students/postdocs (university hubs, hospitals like UHN, SickKids) rather than founders. Lead with talent, not grants.",
    subject: "Internship matching for your {{org}} trainees",
    body: "Hi {{firstName}},\n\nA no-cost way to connect {{org}}'s trainees with real biomanufacturing placements: our EXPERIENCE program matches life-sciences students and postdocs with host companies looking for early talent.\n\nIt maps neatly to who you serve, so I thought it might be a genuine pipeline for your members.\n\nHere's a 2-line blurb ready for your trainee channels:\n\n\"BHN's EXPERIENCE program matches life-sciences trainees with biomanufacturing host companies \u2014 placements at no cost to you. Learn more: {{link}}\"\n\nWould you be open to sharing it in your next student update? That's the whole ask.\n\nAnd we're glad to cross-promote {{org}}'s programs or events to our network in return.\n\nThanks {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "event-invite",
    label: "Promote an event / invite + ask to share",
    when: "You're hosting a symposium, webinar, or info session and want the partner to include it in a member digest. Put the date in the subject for instant calendar-fit.",
    subject: "For your members: {{eventName}}, {{eventDate}}",
    body: "Hi {{firstName}},\n\nWe're hosting {{eventName}} on {{eventDate}} \u2014 free, and directly relevant to {{org}}'s members working in biomanufacturing and life sciences.\n\nHere's a calendar-ready blurb + registration link if you'd like to include it in your next member digest:\n\n\"{{eventName}} \u2014 {{eventDate}}, free to attend. A session for biotech founders and trainees on [topic]. Register: {{link}}\"\n\nOne ask: a single line in your next update would help it reach the right people. No formal write-up needed.\n\nAnd the door swings both ways \u2014 we'd gladly share {{org}}'s upcoming events with our network too.\n\nThanks {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "warm-followup",
    label: "Warm follow-up after no reply",
    when: "One polite nudge on a prior share request, only when a deadline is genuinely approaching. Adds one new fact, never guilt. Send once, not repeatedly.",
    subject: "Re: quick share for your network ({{deadline}} nearing)",
    body: "Hi {{firstName}},\n\nQuick nudge, no pressure \u2014 {{programName}} closes {{deadline}}, so flagging in case it's useful for {{org}}'s founders this round.\n\nSame paste-ready blurb below, zero effort on your end:\n\n\"Founders: {{programName}} is open \u2014 up to $25k non-dilutive (no equity) for seed-stage biotech. Closes {{deadline}}. Apply: {{link}}\"\n\nIf the timing doesn't work, totally understand \u2014 I'll keep you posted on future rounds either way.\n\nThanks {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "value-first-reciprocal",
    label: "Value-first / reciprocal (offer to promote them too)",
    when: "Relationship-building touch where you lead by amplifying THEM first, demonstrating reciprocity before making any ask. Strong for warm partners or re-opening a two-way channel.",
    subject: "BHN x {{org}}: let's cross-promote both ways",
    body: "Hi {{firstName}},\n\nLoved seeing {{org}}'s recent work \u2014 we share it with our founder network when it's a fit, and would happily feature your next cohort or event too. Just send a blurb whenever you have one.\n\nIn return, if it's ever useful: BHN runs non-dilutive grants (up to $25k, no equity) and a trainee-matching program your members can tap. I'll only ever send things that genuinely fit who you serve.\n\nWant to set up a simple two-way swap \u2014 we each drop the other's relevant opportunities into our member updates as they come up?\n\nNo call needed unless you'd like one. Just reply and I'll send our current blurb.\n\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "thank-you-keep-warm",
    label: "Thank-you + keep-warm after they helped",
    when: "Send right after a partner shared something. Closes the loop, reinforces reciprocity, and keeps the channel open without a new ask.",
    subject: "Thank you for sharing with {{org}}'s network",
    body: "Hi {{firstName}},\n\nThank you for sharing {{programName}} with {{org}}'s members \u2014 it genuinely helps us reach the founders who need this most, and I really appreciate you spending some of your network's attention on it.\n\nReturning the favour: send me {{org}}'s next event or cohort announcement and I'll get it in front of our founder network. Happy to tag and amplify you when we post.\n\nNo ask here \u2014 just wanted to say thanks and keep the channel warm. I'll flag the next round only if it's a real fit for your members.\n\nThanks again {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "reengage-dormant",
    label: "Re-engage a dormant partner",
    when: "Partner who shared in the past but has gone quiet for a while. Light, warm, references the prior relationship, leads with one fresh and relevant offer.",
    subject: "Been a while \u2014 something for {{org}}'s founders",
    body: "Hi {{firstName}},\n\nIt's been a bit since we last connected \u2014 hope things are going well at {{org}}.\n\nWe've got a fresh round that made me think of your members: {{programName}}, up to $25k non-dilutive (no equity) for seed-stage biotech founders, closing {{deadline}}.\n\nSame zero-effort deal as before \u2014 paste-ready blurb here:\n\n\"Founders: {{programName}} is open \u2014 up to $25k non-dilutive (no equity). Closes {{deadline}}. Apply: {{link}}\"\n\nIf a forward to your newsletter works, that's the whole ask. And I'd still love to amplify {{org}}'s programs to our network whenever you have something to share.\n\nGood to be back in touch,\n{{senderName}}\n{{senderTitle}}, BHN",
  },
  {
    id: "returning-partner",
    label: "Returning partner (thanks for earlier support + new ask)",
    when: "For partners who already know us and have supported BHN before \u2014 no re-introduction needed. Opens by thanking them for their earlier support, then shares the current program/event. The 'returning contact' version for a campaign.",
    subject: "Thanks for supporting BHN \u2014 one more for {{org}}'s founders",
    body: "Hi {{firstName}},\n\nThank you again for supporting BHN's work alongside {{org}} \u2014 your help getting opportunities in front of your members has genuinely mattered, and I appreciate it.\n\nIn that same spirit, here's one more that fits your founders: {{programName}}, up to $25k non-dilutive (no equity) for seed-stage biotech, closing {{deadline}}.\n\nSame zero-effort deal \u2014 a paste-ready blurb you can drop straight into a member update:\n\n\"Founders: {{programName}} is open \u2014 up to $25k non-dilutive (no equity) for seed-stage biotech. Closes {{deadline}}. Apply: {{link}}\"\n\nA single forward is the whole ask. And as always, glad to return the favour and put {{org}}'s next cohort or event in front of our founder network.\n\nThank you {{firstName}},\n{{senderName}}\n{{senderTitle}}, BHN",
  },
];

// ── Overrides (PlatformSetting persistence) ───────────────────────────────

const OVERRIDES_KEY = "outreachEmailTemplateOverrides";
type Override = { subject?: string; body?: string };
type OverrideMap = Record<string, Override>;

export async function getOutreachTemplateOverrides(): Promise<OverrideMap> {
  const row = await prisma.platformSetting.findUnique({ where: { key: OVERRIDES_KEY } }).catch(() => null);
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value) as OverrideMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function writeOverrides(map: OverrideMap): Promise<void> {
  const value = JSON.stringify(map);
  await prisma.platformSetting.upsert({
    where: { key: OVERRIDES_KEY },
    update: { value },
    create: { key: OVERRIDES_KEY, value },
  });
}

export function sanitizeTemplateEdit(input: unknown): { subject: string; body: string } | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  const subject = typeof o.subject === "string" ? o.subject.trim().slice(0, 300) : "";
  const body = typeof o.body === "string" ? o.body.trim().slice(0, 6000) : "";
  if (!subject || !body) return null;
  return { subject, body };
}

export async function saveOutreachTemplateOverride(id: string, fields: { subject: string; body: string }): Promise<void> {
  const map = await getOutreachTemplateOverrides();
  map[id] = fields;
  await writeOverrides(map);
}

export async function resetOutreachTemplateOverride(id: string): Promise<void> {
  const map = await getOutreachTemplateOverrides();
  delete map[id];
  await writeOverrides(map);
}

export function isOutreachTemplateId(v: unknown): v is string {
  return typeof v === "string" && OUTREACH_TEMPLATE_DEFAULTS.some((t) => t.id === v);
}

/** Resolve defaults + overrides into the catalogue the UI shows. */
export function resolveTemplates(overrides: OverrideMap): (OutreachTemplate & { isCustomized: boolean })[] {
  return OUTREACH_TEMPLATE_DEFAULTS.map((t) => {
    const ov = overrides[t.id];
    return {
      ...t,
      subject: ov?.subject ?? t.subject,
      body: ov?.body ?? t.body,
      isCustomized: !!ov,
    };
  });
}

export function findTemplate(id: string): OutreachTemplate | undefined {
  return OUTREACH_TEMPLATE_DEFAULTS.find((t) => t.id === id);
}
