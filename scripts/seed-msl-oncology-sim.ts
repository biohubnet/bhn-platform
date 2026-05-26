/**
 * Hand-authored simulation seed — Medical Scientific Liaison (Oncology).
 *
 * Why this exists:
 *   The role-play game (/simulator) ordinarily generates a SimulationPayload
 *   by sending the pasted JD to Gemini / Cloudflare Llama. The user asked for
 *   a sim for the MSD MSL-Oncology posting AND was emphatic that no personal
 *   information ("RBC, OPG, any of my personal info") leak into the result.
 *
 *   The simulator's prompt audit is already clean — buildUserPrompt() takes
 *   only the JD text, userId is never injected — but this script eliminates
 *   even the residual risk of an AI model latching onto something unhelpful.
 *   Every word in the payload below is mine. No model touches it. The
 *   companies, people, dynamics, and choices are all generic-pharma-MSL
 *   archetypes; the only branded reference is "MSD" / "Merck", which IS in
 *   the source posting.
 *
 * Mechanism:
 *   The /api/simulator/start endpoint caches Simulations by sha256(
 *   `${promptVersion}::${cleanedJdText}`). If a user pastes the EXACT JD
 *   body below into /simulator/new (Or paste the JD body directly), the
 *   computed hash matches the row we insert here — the endpoint returns a
 *   cache hit, no AI generation runs, and the user plays the hand-authored
 *   sim immediately.
 *
 * Run:
 *   npx tsx scripts/seed-msl-oncology-sim.ts
 *
 *   Idempotent — re-running with no schema/payload change is a no-op.
 *   If you tweak the payload, bump SEED_VERSION below; the script will
 *   overwrite the existing row.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import type { SimulationPayload } from "../src/lib/simulator/types";

const prisma = new PrismaClient();

// ── 1. Canonical JD body ─────────────────────────────────────────
// MUST match what extractJobDescriptionFromText() will produce when
// the user pastes the same text. The hash is computed from this
// exact string (after whitespace normalisation that mirrors the
// extractor). Keep this in sync with the user-pasted text — if the
// user pastes a slightly different copy (different whitespace), the
// hashes diverge and the endpoint falls through to AI generation
// instead of hitting this cache row.

const JD_BODY = `Medical Scientific Liaison - Oncology / Agent(e) de Liaison medical et scientifique, Oncologie
MSD
Toronto, ON

Job description

Medical Scientific Liaison, Oncology

Territory: Western Ontario, Manitoba

Our Medical Affairs team advances patient care by engaging in scientific exchange with external medical experts and industry professionals ensuring the scientific value of our products is realized. We engage and train internal employees to ensure that they thoroughly comprehend the science behind the medicine and review further unmet medical needs to bolster collaboration and further differentiate our portfolio.

The objective of the Medical and Scientific Liaison, by virtue of their training and expertise, is to discuss and provide scientific and therapeutic information to Healthcare Professionals and Researchers viewed by their peers to be authorities in Oncology (Clinical and Scientific Leaders).

The Medical Scientific Liaison's interaction with their audience is governed by guiding principles intended to deliver unbiased and evidence-based information through in-depth scientific exchange in the therapeutic area of Oncology, specifically in melanoma, head and neck, and genitourinary cancers, but not limited to, often leading to knowledge transfer initiatives and research.

Reporting to the Therapeutic Area Head, Oncology - Medical Affairs, the Medical and Scientific Liaison uses exceptionally strong interpersonal skills, especially in the area of one-on-one communication, and a high degree of understanding of oncology and the treatments, to develop and maintain strong scientific working relationships with Clinical Scientific Leaders in oncology with both clinicians and/or basic scientists through the communication of unbiased and evidence based information.

Qualifications: Pharm D, PhD Degree in Science or Health Sciences (preferably in related disease area) or MD is required. Pharmaceutical experience or equivalent preferably involving work with scientific leaders. 2 years experience in the therapeutic area of Oncology. Strong abilities in negotiation, scientific presentations, and facilitation skills. Travel 50%. Located in Greater Toronto Area or Western Ontario.`;

// ── 2. Whitespace normalisation (mirrors extractJobDescriptionFromText) ─
function normaliseJd(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PROMPT_VERSION = "v1";
const SEED_VERSION = "msl-oncology-2026-05-26-v2"; // bump to force overwrite
// v2 (2026-05-26): renamed stat keys leadershipTrust → vpTrust and
//   craft → velocity to match the canonical keys hardcoded in
//   engine.ts WEIGHTS + SimulatorPlayer STAT_ICONS. With the old
//   keys the stat icons silently dropped and the review-score
//   weighting fell back to the 20% default for the two renamed
//   stats, so the live UI looked stripped-down compared to a sim
//   built from a properly-keyed AI generation. Labels kept the
//   IC-role wording ("TA-Head trust", "Scientific craft").

const CONTENT = normaliseJd(JD_BODY);
const JD_SNIPPET = CONTENT.slice(0, 800);
const SOURCE_HASH = crypto
  .createHash("sha256")
  .update(`${PROMPT_VERSION}::${CONTENT}`)
  .digest("hex");

// ── 3. Hand-authored SimulationPayload ────────────────────────────
// The MSL role is an individual contributor; replaced "direct reports"
// with five peer collaborators. Stat keys stay as the runtime expects
// (morale / vpTrust / velocity / crossFunc / capacity) but the
// labels are re-cast: "Peer trust" instead of "Team morale", etc.

const PAYLOAD: SimulationPayload = {
  jobTitle: "Medical Scientific Liaison — Oncology",
  companyName: "MSD",
  location: "Western Ontario / Manitoba (field-based, 50% travel)",

  context:
    "You are the new MSL covering the Western Ontario + Manitoba territory for MSD's oncology franchise — melanoma, head & neck, and genitourinary cancers. Your job is scientific exchange with Clinical & Scientific Leaders, never promotion. Every conversation you have is governed by the company's compliance principles for MSLs. The pressure this quarter is dual: (1) ramp territory coverage so you are a known, trusted voice with the top 30 KOLs by week 12, and (2) protect the firewall between Medical and Commercial — your Therapeutic Area Head's confidence is built primarily on watching how cleanly you handle the inevitable grey-zone moments. Two competitor MSLs are already active in your territory.",

  vpName: "Dr. Helen Marchetti",
  vpRole: "Therapeutic Area Head, Oncology — Medical Affairs",

  stats: [
    {
      key: "morale",
      label: "Peer trust",
      short: "Peers",
      description:
        "Trust from the broader Medical team — fellow MSLs, the field medical excellence lead, and the medical reviewer. Low peer trust means slower internal review turnarounds and worse hand-offs across territories.",
      color: "#10b981",
      initialValue: 55,
    },
    {
      key: "vpTrust",
      label: "TA-Head trust",
      short: "TAHead",
      description:
        "Dr. Marchetti's confidence that you will navigate compliance grey zones without escalation. The single most important stat in an MSL's first quarter.",
      color: "#6366f1",
      initialValue: 50,
    },
    {
      key: "velocity",
      label: "Scientific craft",
      short: "Sci",
      description:
        "Depth and accuracy of your scientific exchange with KOLs. Includes data fluency, ability to engage with unpublished or competing trials, and the perceived quality of your presentations.",
      color: "#0891b2",
      initialValue: 60,
    },
    {
      key: "crossFunc",
      label: "Cross-functional alignment",
      short: "XFunc",
      description:
        "Working relationship with Marketing, Med Comms, HEOR, and Legal/Reg. Strong here means you are looped in early; weak here means you find out about activities in your territory by surprise.",
      color: "#f59e0b",
      initialValue: 50,
    },
    {
      key: "capacity",
      label: "Capacity & energy",
      short: "Cap",
      description:
        "Your sustainable bandwidth across the 50% travel load, evening dinner programs, conference weekends, and the territory's drive radius. Burn this down and quality slips before week 12.",
      color: "#ef4444",
      initialValue: 70,
    },
  ],

  team: [
    {
      id: "helen-marchetti",
      name: "Dr. Helen Marchetti",
      shortName: "Helen",
      role: "Therapeutic Area Head, Oncology — Medical Affairs (your manager)",
      shortRole: "TA Head",
      group: "team",
      tenure: "11 years in pharma medical affairs, 3 in this role",
      oneLiner:
        "Trained as a clinical pharmacologist; her bar is 'would a KOL respect that answer?'. Reads every territory report Sunday night. Gives short feedback in person, longer feedback in writing.",
      daily: ["Reviews flagged interactions", "Slack triage with regional heads"],
      weekly: ["Monday team huddle", "1:1s with each MSL"],
      monthly: ["Pipeline literature review", "Compliance audit spot-checks"],
      quarterly: ["QBR with VP Medical", "MSL performance calibrations"],
      annual: ["Strategy retreat", "Annual KOL strategy refresh"],
    },
    {
      id: "rafe-okafor",
      name: "Rafe Okafor",
      shortName: "Rafe",
      role: "Senior MSL, Eastern Ontario territory (peer)",
      shortRole: "MSL East",
      group: "team",
      tenure: "6 years as an MSL, 2 in oncology",
      oneLiner:
        "Generous mentor, will pick up the phone any time. Strong on melanoma immuno-oncology data. Slightly cynical about cross-functional asks; warn him before you say yes to anything from Marketing.",
      daily: ["KOL outreach", "Slack peer-MSL channel"],
      weekly: ["Joint territory mapping", "Friday literature swap"],
      monthly: ["Joint regional advisory boards"],
      quarterly: ["Quarterly business review"],
      annual: ["ASCO + ESMO co-attendance"],
    },
    {
      id: "priya-natarajan",
      name: "Dr. Priya Natarajan",
      shortName: "Priya",
      role: "MSL, Manitoba & Saskatchewan (peer)",
      shortRole: "MSL Prairie",
      group: "team",
      tenure: "1 year in this role, 4 years as a hospital pharmacist before",
      oneLiner:
        "Most recent hire before you. Excellent on genitourinary cancers, learning melanoma. Asks great questions; if she's confused about a compliance call you should be too.",
      daily: ["Field visits", "EMR-format note-taking"],
      weekly: ["Trio peer-debrief Fridays"],
      monthly: ["Regional dinner programs"],
      quarterly: ["QBR"],
      annual: ["Genitourinary congress (ASCO GU)"],
    },
    {
      id: "marcus-de-villiers",
      name: "Marcus de Villiers",
      shortName: "Marcus",
      role: "Field Medical Excellence Lead (national, peer)",
      shortRole: "FME",
      group: "team",
      tenure: "8 years, was an MSL himself",
      oneLiner:
        "Owns the MSL training curriculum, dashboards, and the SOPs. Loves a clean note in the CRM; hates retroactive logging. If he gives you a template, use it.",
      daily: ["Reviews flagged CRM entries"],
      weekly: ["Excellence office hours"],
      monthly: ["Curriculum updates"],
      quarterly: ["MSL competency reviews"],
      annual: ["Onboarding refresh"],
    },
    {
      id: "anika-shrestha",
      name: "Dr. Anika Shrestha",
      shortName: "Anika",
      role: "Medical Reviewer, Oncology (internal compliance reviewer)",
      shortRole: "Med Rev",
      group: "team",
      tenure: "9 years, half on the reviewer side",
      oneLiner:
        "The gatekeeper for every external scientific deck you'll use. Polite, fast, unbending. If she rejects a slide she will tell you why; resist the urge to argue the rejection — fix and resubmit.",
      daily: ["MLR queue triage"],
      weekly: ["Reviewer rounds"],
      monthly: ["Slide-library audit"],
      quarterly: ["Reviewer calibration"],
      annual: ["Reviewer training week"],
    },
  ],

  partners: [
    {
      id: "samira-okonkwo",
      name: "Samira Okonkwo",
      shortName: "Samira",
      role: "Brand Lead, Oncology — Marketing",
      shortRole: "Brand",
      group: "partner",
      tenure: "5 years on the brand",
      oneLiner:
        "Sharp, pleasant, will absolutely ask you to do things outside the MSL guardrails. The cleanest 'no, but here's what I can do' you can manage will define this relationship.",
      daily: ["Brand performance review"],
      weekly: ["Cross-functional Monday"],
      monthly: ["Field pulse-check"],
      quarterly: ["Brand plan offsite"],
      annual: ["Annual brand plan"],
    },
    {
      id: "jens-petersson",
      name: "Jens Petersson",
      shortName: "Jens",
      role: "Lead, Medical Communications (publications, congresses)",
      shortRole: "Med Comm",
      group: "partner",
      tenure: "12 years, ex-academic",
      oneLiner:
        "Owns the publication plan and congress booth content. A great early ally — knows which KOLs are presenting what before anyone else does.",
      daily: ["Publication pipeline"],
      weekly: ["Congress prep"],
      monthly: ["Reviewer alignment"],
      quarterly: ["Publication scorecard"],
      annual: ["Congress strategy"],
    },
    {
      id: "lin-ouyang",
      name: "Dr. Lin Ouyang",
      shortName: "Lin",
      role: "Health Economics & Outcomes Research (HEOR), Oncology",
      shortRole: "HEOR",
      group: "partner",
      tenure: "7 years on the payer side, 2 here",
      oneLiner:
        "Translates clinical data into payer-grade evidence. Will quietly become your favourite person to bring into a KOL meeting once you've built the relationship.",
      daily: ["RWE database review"],
      weekly: ["Evidence requests"],
      monthly: ["Payer advisory updates"],
      quarterly: ["Outcomes roundtable"],
      annual: ["Real-world evidence plan"],
    },
    {
      id: "diane-mcallister",
      name: "Diane McAllister",
      shortName: "Diane",
      role: "Legal & Regulatory Liaison, Medical Affairs",
      shortRole: "Legal",
      group: "partner",
      tenure: "15 years",
      oneLiner:
        "Reads everything literally. The right person to call BEFORE a tricky interaction, not after. Has saved every MSL in the company at least once.",
      daily: ["Reg request review"],
      weekly: ["Office hours: Wed/Fri"],
      monthly: ["Compliance audit support"],
      quarterly: ["Annual update sweep"],
      annual: ["Code of conduct refresh"],
    },
  ],

  scenarios: [
    {
      id: "wk1-roster",
      week: 1,
      type: "vp_1on1",
      title: "First meeting with Dr. Marchetti — KOL roster review",
      setting:
        "Tuesday, your second day. Helen has blocked 45 minutes to walk through the territory's top-30 KOL roster. The previous MSL left abruptly; the notes are sparse. She slides over the list and asks where you'd start.",
      prompt:
        "Helen asks: 'Walk me through your first-90-day coverage plan. Who do you call this week, and why?'",
      choices: [
        {
          label:
            "Start with the three KOLs who haven't been visited in over 6 months — re-establish the relationship first.",
          outcome:
            "Helen nods slowly. 'That's defensible. But two of those three have moved on to a competitor's compound; you're going to walk in cold and learn that the hard way. I'd have wanted you to ask first.' She makes a note.",
          effects: { vpTrust: -3, velocity: 0, crossFunc: 0, morale: 0, capacity: -2 },
          tag: "Plan looked safe; missed that two KOLs had already shifted.",
        },
        {
          label:
            "Ask Helen to walk you through which 5 KOLs she'd prioritise herself and why — defer your own ranking by a week.",
          outcome:
            "Helen smiles for the first time. 'Good. I'd rather you spend the week reading their last five papers and joint-calling with Rafe than guessing.' She names the five and explains the political subtext on each.",
          effects: { vpTrust: 6, velocity: 3, crossFunc: 0, morale: 2, capacity: 0 },
          tag: "Deferred ranking to the manager; week one became real learning.",
        },
        {
          label:
            "Present a confident ranking based on H-index + recent publication output you mined the night before.",
          outcome:
            "Helen lets you finish. 'H-index is a fine starting point. It's not a coverage plan. Coverage is about who actually moves prescribing in this province, and that isn't always the loudest publisher.' She doesn't reject the plan, but the gap shows.",
          effects: { vpTrust: -1, velocity: 4, crossFunc: 0, morale: 0, capacity: -3 },
          tag: "Bibliometric flex landed flat; energy spent on the wrong signal.",
        },
        {
          label:
            "Propose a hybrid: confirm her top-5 priorities, then join Rafe on his Eastern visits in week 2 to calibrate.",
          outcome:
            "Helen approves. 'That's what I would have proposed if you hadn't. Rafe will text you tomorrow about Thursday.' Small win.",
          effects: { vpTrust: 4, velocity: 2, crossFunc: 2, morale: 4, capacity: -1 },
          tag: "Hybrid plan; bought a calibration week without looking passive.",
        },
      ],
    },
    {
      id: "wk2-territory-plan",
      week: 2,
      type: "planning",
      title: "Territory plan — first written submission",
      setting:
        "Sunday night. Helen wants your written 90-day plan in her inbox before Monday's huddle. You have three KOL conversations under your belt and four hours of free time.",
      prompt:
        "What goes in the plan?",
      choices: [
        {
          label:
            "A polished 12-page deck with bibliometrics, gap analyses, and a colour-coded coverage map.",
          outcome:
            "Helen replies at 11pm: 'Beautiful. Cut to 3 pages by Wednesday. I want the thinking, not the deck.' Capacity dent for not a lot of return.",
          effects: { vpTrust: 0, velocity: 2, crossFunc: 0, morale: 0, capacity: -8 },
          tag: "Over-engineered week-2 deliverable.",
        },
        {
          label:
            "A 2-page brief: top-10 KOL list with one-line rationale each, three compliance grey-zones you anticipate, and one open question for Helen.",
          outcome:
            "Helen replies Monday morning: 'Useful. Your three grey-zones are the right ones. Talk through the open question at the huddle.' A clean win.",
          effects: { vpTrust: 5, velocity: 2, crossFunc: 0, morale: 2, capacity: -2 },
          tag: "Right level of detail; raised one open question without manufacturing certainty.",
        },
        {
          label:
            "Skip the written plan and request a verbal walk-through at the huddle instead.",
          outcome:
            "Helen: 'I asked for it in writing because the team needs a reference point, not because I doubted you could talk through it.' Mild reset.",
          effects: { vpTrust: -4, velocity: 0, crossFunc: -1, morale: 0, capacity: 2 },
          tag: "Treated a written ask as optional.",
        },
      ],
    },
    {
      id: "wk3-offlabel",
      week: 3,
      type: "escalation",
      title: "Unsolicited request for off-label data",
      setting:
        "End of a hospital visit. A senior oncologist asks — unprompted — for the latest data on combining one of your products with a regimen for a tumour type it isn't approved in.",
      prompt:
        "How do you respond in the room?",
      choices: [
        {
          label:
            "Walk her through the most recent ASCO abstract you remember on the combination; promise to follow up with the references.",
          outcome:
            "Helen learns about this within 24 hours from her own KOL channel. 'That's not how we respond to unsolicited off-label requests, even when the data exists. You should know that on day-one.' Compliance event documented.",
          effects: { vpTrust: -10, velocity: -2, crossFunc: 0, morale: -3, capacity: 0 },
          tag: "Engaged off-label data verbally instead of routing the request.",
        },
        {
          label:
            "Confirm the request is unsolicited, log it on the spot, and tell her you will route it through Medical Information Services who will respond with the appropriate evidence package.",
          outcome:
            "She nods — she's seen MSLs handle this both ways and respects the right answer. The MIS response goes out cleanly within 48 hours. Helen flags it in 1:1 as exactly right.",
          effects: { vpTrust: 8, velocity: 1, crossFunc: 1, morale: 2, capacity: -1 },
          tag: "Routed the off-label request correctly; built trust early.",
        },
        {
          label:
            "Decline to discuss and pivot back to on-label topics, then call Diane (Legal) after the visit to confirm you handled it right.",
          outcome:
            "Diane confirms you did fine, but recommends you also log the request as an unsolicited request — without that, MIS can't follow up and the KOL feels stonewalled. Decent recovery.",
          effects: { vpTrust: 2, velocity: 1, crossFunc: 1, morale: 1, capacity: -1 },
          tag: "Defensive but recoverable; learned the logging step.",
        },
      ],
    },
    {
      id: "wk4-iis-idea",
      week: 4,
      type: "cross_func",
      title: "Research idea triage",
      setting:
        "Joint visit with Rafe. A KOL pulls you both aside: he has an investigator-initiated study idea — small, single-centre, retrospective. Could you help him draft the proposal?",
      prompt:
        "How do you handle the ask in the room?",
      choices: [
        {
          label:
            "Tell him you'd love to help and offer to write the first draft of the protocol yourself over the next two weeks.",
          outcome:
            "Rafe coughs. He'll explain on the drive back why MSLs don't author IIS protocols. Helen also picks this up; another flagged event.",
          effects: { vpTrust: -8, morale: -2, velocity: 0, crossFunc: 0, capacity: -5 },
          tag: "Volunteered MSL labour to author a KOL's IIS protocol.",
        },
        {
          label:
            "Note the idea seriously, share the company's IIS submission portal, and offer to flag the proposal internally once it's been submitted.",
          outcome:
            "Clean handoff. The KOL submits within a month; the internal review committee picks it up. Helen sees the entry and notes it positively.",
          effects: { vpTrust: 5, morale: 3, velocity: 2, crossFunc: 3, capacity: -1 },
          tag: "Pointed the KOL at the right channel without taking on protocol authorship.",
        },
        {
          label:
            "Politely decline and change the subject — IIS is HEOR's lane, not yours.",
          outcome:
            "It's not HEOR's lane either, and the KOL leaves the room slightly cooler. Rafe later: 'You don't have to write the protocol; you do have to know what the right next step is.'",
          effects: { vpTrust: -2, morale: -1, velocity: -1, crossFunc: -1, capacity: 0 },
          tag: "Reflexive 'not my job' cost a relationship point.",
        },
        {
          label:
            "Buy time. Tell him you want to think about how to position the idea internally and will follow up Friday.",
          outcome:
            "Friday you come back with the IIS portal link and Jens's name as a publication-side contact. The KOL appreciates the structured response.",
          effects: { vpTrust: 3, morale: 2, velocity: 1, crossFunc: 2, capacity: -2 },
          tag: "Bought time, returned with a proper structured handoff.",
        },
      ],
    },
    {
      id: "wk5-advisory-invitees",
      week: 5,
      type: "team",
      title: "Advisory board invitee list",
      setting:
        "Wednesday team call. The next Western advisory board is six weeks out; the invitee list has 14 names and needs to come down to 8. Two of the names are high-volume prescribers who happen to also be on the brand's speaker bureau. Samira (Marketing) is in the meeting.",
      prompt:
        "Which way do you lean and how do you raise it?",
      choices: [
        {
          label:
            "Push to keep both bureau speakers — they know the data cold and will move the discussion forward.",
          outcome:
            "Helen interjects after the call: 'Bureau status doesn't disqualify them but it does mean we double-check that they're invited for advisory insight, not for compatibility with Marketing's narrative.' Mild ding.",
          effects: { vpTrust: -3, crossFunc: 1, velocity: 0, morale: -1, capacity: 0 },
          tag: "Defended bureau speakers without raising the conflict.",
        },
        {
          label:
            "Name the conflict explicitly in the meeting, propose dropping one of the two bureau speakers, and substitute a community oncologist who hasn't been on a deck.",
          outcome:
            "Samira pushes back briefly; Helen backs your call. The community oncologist later turns out to be the most useful voice in the room.",
          effects: { vpTrust: 6, crossFunc: -1, velocity: 3, morale: 2, capacity: -1 },
          tag: "Surfaced a brand-vs-medical tension cleanly in front of Marketing.",
        },
        {
          label:
            "Stay quiet on the bureau question and let Helen drive that part of the agenda.",
          outcome:
            "Helen raises it herself, looks at you mid-sentence and asks 'You spotted that, right?' You say yes. She marks it as awareness but not yet voice.",
          effects: { vpTrust: 1, crossFunc: 0, velocity: 0, morale: 0, capacity: 0 },
          tag: "Saw the conflict, didn't lead on it.",
        },
      ],
    },
    {
      id: "wk6-marketing-pull",
      week: 6,
      type: "cross_func",
      title: "Marketing wants a slide for a sales meeting",
      setting:
        "Samira pings you Tuesday: a national sales meeting is two weeks out and they want a slide on the latest melanoma overall-survival data. Could you 'just put together a quick deck' you wouldn't have to present — sales would take it from there.",
      prompt:
        "How do you respond?",
      choices: [
        {
          label:
            "Build the deck. It's data you know; saves Samira a week.",
          outcome:
            "Helen finds out via the MLR queue when the deck arrives for review with your name on it. 'You don't author commercial decks. Even when they're factually correct, your name on it changes the regulatory shape of the document.'",
          effects: { vpTrust: -9, crossFunc: 2, velocity: 0, morale: -2, capacity: -6 },
          tag: "Authored a commercial deck off the side of the desk.",
        },
        {
          label:
            "Decline the authorship cleanly. Offer to do a 30-minute MSL training session for the sales team on the same data instead.",
          outcome:
            "Samira accepts the alternative. The training session lands well and the sales team starts looping you in earlier on territory questions.",
          effects: { vpTrust: 6, crossFunc: 3, velocity: 3, morale: 2, capacity: -2 },
          tag: "Rerouted the ask into the MSL training lane; built sales-team trust.",
        },
        {
          label:
            "Say yes but stipulate that Anika (Medical Reviewer) reviews every slide before Samira's team touches it.",
          outcome:
            "Anika says no — the workflow isn't designed for MSL-authored commercial content. The middle path collapses; you end up declining anyway, two days later than you should have.",
          effects: { vpTrust: -2, crossFunc: 0, velocity: 0, morale: -1, capacity: -3 },
          tag: "Tried a workflow that wasn't real; lost two days.",
        },
      ],
    },
    {
      id: "wk7-midq-checkin",
      week: 7,
      type: "vp_1on1",
      title: "Mid-quarter check-in with Helen",
      setting:
        "Six weeks in. Helen has pulled three metrics for the 1:1: number of unique KOLs engaged (you: 17 of a target 25), depth of engagement score (above peer average), and one flagged compliance event from week 3.",
      prompt:
        "How do you frame the conversation?",
      choices: [
        {
          label:
            "Lead with the depth-of-engagement strength; explain coverage gap as a quality choice.",
          outcome:
            "Helen: 'I agree the quality is there. The coverage gap is real though — at 17 by week 6 you'll land at 24 by 12, and the target is 30. What's your plan?'",
          effects: { vpTrust: 1, velocity: 1, crossFunc: 0, morale: 0, capacity: 0 },
          tag: "Reframed coverage gap as quality; got pushed to make it concrete.",
        },
        {
          label:
            "Lead with the coverage gap and your concrete plan to close it (two double-days in Manitoba, a Saskatoon swing, joint visits with Priya).",
          outcome:
            "Helen: 'That's a real plan. Keep me posted weekly on the Manitoba double-days; I want to know if they're working before week 10.'",
          effects: { vpTrust: 6, velocity: 1, crossFunc: 1, morale: 0, capacity: -2 },
          tag: "Owned the metric you were behind on; brought a plan.",
        },
        {
          label:
            "Start with the compliance flag from week 3; ask how she'd like you to handle the next one differently.",
          outcome:
            "Helen appreciates the directness. 'The fact that you raised it first matters. You handled the follow-up correctly — let's spend our time on what's ahead, not what's behind.'",
          effects: { vpTrust: 4, velocity: 0, crossFunc: 0, morale: 1, capacity: 0 },
          tag: "Surfaced the compliance flag yourself; banked direct-communication points.",
        },
      ],
    },
    {
      id: "wk8-conference-budget",
      week: 8,
      type: "team",
      title: "Conference attendance — limited seats",
      setting:
        "A major international melanoma congress is six weeks out. Your budget covers two MSL attendees from your territory. You and Priya both want to go. Rafe's territory has a third interested MSL who's offered to split costs with yours.",
      prompt:
        "Who goes, and how is the decision made?",
      choices: [
        {
          label:
            "Take the slot yourself; you're newer and the learning curve is steeper.",
          outcome:
            "Defensible but Priya is hurt — she lined up two KOL coffee chats at the congress that now collapse. Marcus reads the budget log and asks why you didn't bring Helen in on the call.",
          effects: { vpTrust: -2, morale: -4, velocity: 1, crossFunc: 0, capacity: -1 },
          tag: "Took the slot without consultation.",
        },
        {
          label:
            "Loop Helen and Marcus in. Propose Priya goes (she has the KOL meetings lined up) and you attend the regional satellite instead.",
          outcome:
            "Helen approves. Priya's meetings produce two early KOL relationships in your territory. You attend the satellite virtually and the budget line stays clean.",
          effects: { vpTrust: 5, morale: 5, velocity: 2, crossFunc: 1, capacity: -1 },
          tag: "Routed the decision through the manager and the budget owner.",
        },
        {
          label:
            "Suggest a coin-flip with Priya to keep things peer-fair.",
          outcome:
            "Priya laughs and agrees, then later tells Marcus what happened. Marcus, very polite: 'We don't allocate development budget by chance. Next time, bring it to me.'",
          effects: { vpTrust: 0, morale: 1, velocity: 0, crossFunc: -2, capacity: 0 },
          tag: "Coin-flipped a budget decision; FME noticed.",
        },
      ],
    },
    {
      id: "wk9-sales-training",
      week: 9,
      type: "team",
      title: "Sales team training — the line on data",
      setting:
        "You're running the 30-minute MSL training session you offered Samira in week 6. It's eight sales reps in a hotel conference room. Question from the back: 'If a doc asks me about the head-and-neck data we don't have approval for yet — can I just hand them your business card?'",
      prompt:
        "How do you answer in the room?",
      choices: [
        {
          label:
            "Yes — that's exactly what the MSL function is for, that's the right hand-off.",
          outcome:
            "Technically right and the answer Helen would give. The room understands the routing.",
          effects: { vpTrust: 3, velocity: 2, crossFunc: 3, morale: 2, capacity: -1 },
          tag: "Drew the line correctly in front of sales: route, don't bridge.",
        },
        {
          label:
            "Yes, but only if the doc asks unprompted — and you'll need to document the request like any other off-label query.",
          outcome:
            "The 'only if unprompted' caveat is the key detail every senior MSL adds. Helen later: 'I would have wanted exactly that nuance.'",
          effects: { vpTrust: 6, velocity: 4, crossFunc: 3, morale: 2, capacity: -1 },
          tag: "Drew the line with the unprompted-request nuance.",
        },
        {
          label:
            "Sidestep — say the routing is good but you'd rather Helen confirm the workflow and circle back.",
          outcome:
            "Helen's reaction is mild: 'You know this answer — you should be willing to give it. If you don't trust yourself on the easy ones, the reps won't trust you on the hard ones.'",
          effects: { vpTrust: -2, velocity: -1, crossFunc: -1, morale: -1, capacity: 0 },
          tag: "Punted the easy compliance question.",
        },
      ],
    },
    {
      id: "wk10-iis-followup",
      week: 10,
      type: "escalation",
      title: "IIS follow-up — the proposal landed",
      setting:
        "The KOL from week 4 submitted his IIS proposal through the portal. The review committee is asking you, as territory MSL, for a 1-page memo on the strategic fit of the study.",
      prompt:
        "What goes in the memo?",
      choices: [
        {
          label:
            "Write a strong endorsement — the KOL is a high-value relationship and a yes will cement it.",
          outcome:
            "Helen reads the memo and pulls you in. 'I want your honest read, not your political read. If the study isn't strong, that's the answer.'",
          effects: { vpTrust: -3, velocity: -1, crossFunc: 0, morale: -1, capacity: -1 },
          tag: "Wrote a politically-flavoured endorsement memo.",
        },
        {
          label:
            "Write an honest assessment: methodology is mid, scientific question is real, sample size is the constraint. Recommend the committee engage the KOL on a power-calculation revision.",
          outcome:
            "The committee approves the revision route. The KOL receives detailed methodological feedback he later thanks you for. Helen notes the memo specifically at QBR.",
          effects: { vpTrust: 7, velocity: 4, crossFunc: 2, morale: 1, capacity: -2 },
          tag: "Wrote an honest, useful methodological memo.",
        },
        {
          label:
            "Decline to write the memo — argue that the relationship makes you the wrong author.",
          outcome:
            "Anika gently corrects: the conflict isn't ownership, it's intent. The committee wanted your read precisely because you know the KOL. You end up writing it three days late.",
          effects: { vpTrust: -2, velocity: 0, crossFunc: -1, morale: 0, capacity: -2 },
          tag: "Confused conflict-of-interest with reasonable proximity.",
        },
      ],
    },
    {
      id: "wk11-competitor-kol",
      week: 11,
      type: "escalation",
      title: "The difficult KOL who keeps citing competitor data",
      setting:
        "Third coffee with a major Manitoba KOL. He keeps redirecting every discussion to a recent competitor's phase-III result. You don't have a head-to-head, only indirect comparisons.",
      prompt:
        "How do you handle the conversation?",
      choices: [
        {
          label:
            "Acknowledge the competitor data accurately, walk him through your indirect-comparison evidence, and offer to bring Lin (HEOR) to a follow-up to discuss real-world evidence in his patient population.",
          outcome:
            "Exactly the play. The KOL responds well to HEOR involvement; the follow-up cements the relationship.",
          effects: { vpTrust: 6, velocity: 5, crossFunc: 3, morale: 2, capacity: -2 },
          tag: "Engaged competitor data honestly and pulled in HEOR to deepen the discussion.",
        },
        {
          label:
            "Push back on the competitor result — point out a sub-group analysis you remember that complicates their headline number.",
          outcome:
            "He's heard the sub-group critique. He raises it himself sometimes. The pushback reads as defensive and you don't get a third coffee.",
          effects: { vpTrust: -2, velocity: -2, crossFunc: 0, morale: -2, capacity: -1 },
          tag: "Defensive competitor-data pushback closed the door.",
        },
        {
          label:
            "Stay neutral, listen, and bring back the conversation to your data's strongest sub-population.",
          outcome:
            "Safe but unmemorable. He'll see another MSL next month. The relationship plateaus.",
          effects: { vpTrust: 0, velocity: 0, crossFunc: 0, morale: 0, capacity: 0 },
          tag: "Neutral pivot; relationship neither built nor damaged.",
        },
      ],
    },
    {
      id: "wk12-qbr",
      week: 12,
      type: "vp_1on1",
      title: "QBR — performance review with Helen",
      setting:
        "Friday afternoon. The quarter ends. Helen has open in front of her your week-1 plan, the week-7 mid-quarter notes, the compliance log, and the coverage dashboard.",
      prompt:
        "She opens with: 'Tell me the one thing you'd do differently if you ran this quarter again.'",
      choices: [
        {
          label:
            "Name the week-3 off-label handling moment — would have logged the request more carefully even on the recoverable path.",
          outcome:
            "Helen nods. 'That's a senior answer. The fact that you'd add the logging step on the recoverable path means you've internalised the system. Strong meets.'",
          effects: { vpTrust: 5, velocity: 2, crossFunc: 1, morale: 1, capacity: 0 },
          tag: "QBR opener showed honest self-assessment of a compliance grey-zone.",
        },
        {
          label:
            "Name the week-2 written plan length — you would have started with 2 pages, not 12.",
          outcome:
            "Helen smiles. 'Style point. The substantive things you'd change are bigger.' She nudges you to go deeper.",
          effects: { vpTrust: 1, velocity: 0, crossFunc: 0, morale: 0, capacity: 0 },
          tag: "QBR opener picked a small thing.",
        },
        {
          label:
            "Name a coverage-gap miss — the Saskatoon swing you should have made in week 6 instead of week 9.",
          outcome:
            "Helen: 'Good. Specific, operational, you can change it. That's the kind of self-reflection that compounds across quarters.'",
          effects: { vpTrust: 4, velocity: 1, crossFunc: 1, morale: 1, capacity: 0 },
          tag: "QBR opener picked a concrete operational miss.",
        },
      ],
    },
  ],

  reviewThresholds: {
    exceeds: 78,
    strongMeets: 68,
    meets: 56,
    below: 42,
  },

  briefing: {
    hiddenDynamics:
      "The unwritten metric in this role is not territory coverage — it's how cleanly you handle the compliance grey zones in front of Helen. She tolerates a slow ramp; she does not tolerate surprises. The most important relationship in the first 90 days is Anika (Medical Reviewer), not the loudest KOL in your territory.",
    failureModes: [
      "Engaging off-label data verbally in the room when the right move is to route the request through Medical Information.",
      "Authoring or co-authoring commercial deliverables to help a struggling Marketing partner; even factually correct content carries regulatory weight when an MSL is the author.",
      "Confusing 'high H-index' with 'high influence' — bibliometric KOLs are a starting point, not a coverage plan.",
      "Treating IIS proposals as protocols to ghostwrite for KOLs rather than as portal submissions to route.",
      "Letting peer-fairness instincts (coin-flips, equal-budget splits) substitute for routing budget calls through the manager.",
    ],
    unwrittenRules: [
      "Helen reads territory reports Sunday night. Submitting a written plan late on a Friday means it's getting read alone, with no buffer.",
      "Diane (Legal) is the right phone call BEFORE a tricky interaction, not after. Every MSL who lasts builds that habit in the first quarter.",
      "Anika rejects fast and explains why. Resist the urge to argue rejections; fix and resubmit.",
      "The MSL channel on Slack is for routing questions, not philosophical debates. Routing-only keeps Rafe and Priya useful.",
      "Sunday-night unanswered Helen messages are read Monday at the huddle. Reply by Sunday 9pm or leave it for the morning.",
    ],
    interviewQuestions: [
      "What's the most common reason MSLs leave this team within 18 months?",
      "How does the TA Head learn that an MSL is struggling — through the dashboard, through peer feedback, or through HCP feedback?",
      "Who in the cross-functional matrix is most likely to ask me to do something the MSL function shouldn't, and how does the company support an MSL who says no?",
      "What does a strong-meets quarter look like quantitatively — number of unique KOLs, depth-of-engagement score, IIS hand-offs?",
      "How does the MSL function in this team work with HEOR on emerging real-world evidence?",
      "What's the team's posture on competitor data — do MSLs engage with it openly or stay on-message?",
      "How is travel discretion managed — am I planning my own week or fitting into a coverage matrix the FME owns?",
    ],
  },
};

// ── 4. Upsert ─────────────────────────────────────────────────────
async function main() {
  console.log(`[seed-msl-oncology-sim] sourceHash = ${SOURCE_HASH}`);

  const existing = await prisma.simulation.findUnique({
    where: { sourceHash: SOURCE_HASH },
    select: { id: true, modelUsed: true, promptVersion: true },
  });

  if (existing) {
    if (existing.modelUsed === SEED_VERSION) {
      console.log(`Already seeded with version ${SEED_VERSION} — nothing to do.`);
      return;
    }
    console.log(`Overwriting existing simulation ${existing.id} (was ${existing.modelUsed}).`);
    await prisma.simulation.update({
      where: { id: existing.id },
      data: {
        jobTitle: PAYLOAD.jobTitle,
        companyName: PAYLOAD.companyName,
        location: PAYLOAD.location,
        jdSnippet: JD_SNIPPET,
        payload: PAYLOAD as unknown as object,
        modelUsed: SEED_VERSION,
        promptVersion: PROMPT_VERSION,
      },
    });
    console.log(`Updated simulation ${existing.id}.`);
    return;
  }

  const created = await prisma.simulation.create({
    data: {
      sourceHash: SOURCE_HASH,
      // No sourceUrl: we want the resulting sim to be paste-discoverable
      // even if the original ZipRecruiter URL is later removed.
      sourceUrl: null,
      jdSnippet: JD_SNIPPET,
      jobTitle: PAYLOAD.jobTitle,
      companyName: PAYLOAD.companyName,
      location: PAYLOAD.location,
      payload: PAYLOAD as unknown as object,
      modelUsed: SEED_VERSION,
      generationMs: 0,
      promptVersion: PROMPT_VERSION,
      // createdById left null intentionally — this is a global hand-
      // authored sim, not user-specific.
      createdById: null,
    },
  });
  console.log(`Created simulation ${created.id}.`);
  console.log("");
  console.log("Next: open /simulator/new, click 'Or paste the JD body directly',");
  console.log("and paste the JD text exactly as it appears in the JD_BODY constant");
  console.log("at the top of this script. The /api/simulator/start endpoint will");
  console.log("compute the same hash, find this row, skip AI generation, and");
  console.log("create your SimulationAttempt against the hand-authored payload.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
