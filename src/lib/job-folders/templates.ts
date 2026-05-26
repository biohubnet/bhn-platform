/**
 * Folder templates — pre-baked starter content for common role
 * archetypes. Picking one creates a folder with the JD textarea
 * empty (the trainee still pastes their target posting), but the
 * Interview prep tab pre-populated with the archetype's likely
 * questions, things to research, and questions to ask the
 * interviewer. Saves the cold-start.
 *
 * Add new archetypes by appending entries here. No DB schema.
 */

export interface FolderTemplate {
  id: string;
  /** Display name on the picker. */
  title: string;
  /** One-sentence description shown under the title. */
  description: string;
  /** Emoji that fronts the picker card. Single character, no
   *  background — keeps the picker readable on every theme. */
  glyph: string;
  /** Default folder title when this template is picked. The user
   *  can rename right away. */
  defaultFolderTitle: string;
  /** Starter content for the interview-prep tab (markdown). The JD
   *  + cover-letter tabs start empty — those are tailored per
   *  posting. */
  interviewPrep: string;
}

export const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    id: "engineering",
    title: "Engineering",
    description: "Software, data, ML, devops — coding interview + system design + behavioural.",
    glyph: "⚙️",
    defaultFolderTitle: "Software engineering role",
    interviewPrep: `## Likely questions

- **Walk me through your favourite project.** Pick one you can talk about for 5+ minutes without getting bored. Lead with the technical decision you'd make differently now.
- **Coding round: "design a data structure for X."** Practice on whatever's relevant to the JD's tech stack.
- **System design (mid+):** scaling a service from 1K to 1M users; pick a domain close to the company's product.
- **Behavioural — disagreement story.** Choose one where you were the more junior person but still right; how you brought the senior along matters.
- **Tradeoffs question.** "When did you ship something you knew wasn't quite right?"

## Questions to ASK them

- What's a problem your team is wrestling with right now that wasn't in the JD?
- How do you decide what gets prioritised — engineer-driven, PM-driven, customer-escalation-driven?
- What does on-call look like? When did it last get bad and what changed?
- How does code review work — every PR, only risky ones, async, paired?
- What's the path for an engineer who wants to stay technical vs. one who wants to manage?

## Gotchas + research

- Their tech stack: pull from job posting + recent engineering blog posts. Don't fake familiarity.
- Their open-source presence — give a specific repo a star and mention it.
- Recent news about reliability incidents or product launches — read the postmortems if public.
`,
  },
  {
    id: "product",
    title: "Product management",
    description: "Strategy, prioritisation, exec stakeholder management — case + behavioural heavy.",
    glyph: "🧭",
    defaultFolderTitle: "Product management role",
    interviewPrep: `## Likely questions

- **Product sense.** "Design [a feature] for [the company's product]." Always start with the user, never with the solution.
- **Estimation.** "How big is the market for X?" — show structured reasoning, not the right answer.
- **Prioritisation conflict.** Behavioural with a real tradeoff: engineering wanted A, sales wanted B, you picked C.
- **Failed launch.** Specific feature you owned that didn't land. What did you do in the four weeks after?
- **Stakeholder management.** Cross-functional partner who was actively blocking you; how you re-aligned them.

## Questions to ASK them

- Walk me through the last big product call — what was the debate, who weighed in?
- How do you measure success of a feature past the launch metric?
- What's the relationship between Product and Engineering — co-equal, PM-driven, engineering-led?
- How does this team decide what's on the roadmap two quarters out?
- What's the PM mistake you'd warn your past self about at this company?

## Gotchas + research

- Their north-star metric — guess from the marketing site, ask in the interview.
- The product's most controversial feature (Reddit, App Store reviews, Twitter).
- Recent A/B tests they've blogged about.
- Their most senior PM departures — LinkedIn search.
`,
  },
  {
    id: "biotech",
    title: "Biotech / wet lab",
    description: "Cell culture, GMP, regulatory — depth in technique + compliance fluency.",
    glyph: "🧬",
    defaultFolderTitle: "Wet-lab role",
    interviewPrep: `## Likely questions

- **Technique depth.** Pick the technique from the JD they care most about and prepare 3 levels of detail: layperson, peer-scientist, expert.
- **Contamination story.** Time you caused or caught a contamination event. Root cause, response, what changed in the SOP.
- **GMP awareness (industry).** Difference between cGMP, GLP, and GCP. When does each apply?
- **Failed experiment.** What was your hypothesis, what did the data actually show, what did you change?
- **Team-of-one moment.** Time you ran a study without supervision — how did you decide when to escalate?

## Questions to ASK them

- What does the work pipeline look like — discovery, process dev, manufacturing, QC?
- Who reviews my batch records, and what's their turnaround on flagged ones?
- How does this team handle deviations — owned by the scientist who hit it, or kicked to QA?
- What's the path from associate to senior scientist on this team?
- What's the regulatory submission you're closest to right now?

## Gotchas + research

- Their pipeline assets — clinicaltrials.gov + recent press releases.
- Their CMO / CDMO partners if any (manufacturing pages).
- Their last regulatory inspection outcome if public.
- The senior scientist's recent publications (PubMed by their last name).
`,
  },
  {
    id: "sales",
    title: "Sales / business development",
    description: "Pipeline, quota, deal mechanics — behavioural + role-play heavy.",
    glyph: "📈",
    defaultFolderTitle: "Sales / BD role",
    interviewPrep: `## Likely questions

- **Walk me through your last deal.** Discovery → close. The specific blockers and how you moved past each.
- **Lost deal post-mortem.** Pick one where you genuinely lost (not "we got beat on price"). What was the real reason?
- **Role-play.** They'll ask you to sell them their own product. Don't memorise — research and listen.
- **Pipeline math.** What's your conversion rate at each stage? What's your average deal size? Have the numbers ready.
- **Forecast hygiene.** How do you decide commit vs. best-case vs. pipeline?

## Questions to ASK them

- What's the most common reason your team loses deals?
- What does the comp plan look like — base / OTE / accelerators / SPIFs?
- Who's the team's top closer and what do they do differently?
- How are leads sourced — inbound, outbound, mix?
- What's the longest sales cycle on the team? What kept it stuck?

## Gotchas + research

- Their pricing page — even if it says "contact us", figure out the price band from G2 / Reddit.
- Their top 3 competitors (G2, Gartner Magic Quadrant).
- Recent earnings calls if public — what did the CEO call out about sales execution?
- Customer reviews — focus on what customers say about the sales process specifically.
`,
  },
  {
    id: "consulting",
    title: "Consulting",
    description: "Case + behavioural — structure under pressure, calibrated curiosity.",
    glyph: "💼",
    defaultFolderTitle: "Consulting role",
    interviewPrep: `## Likely questions

- **Case (market-sizing).** "How many golf balls fit in a 747?" Practice structuring out loud, not landing on a number.
- **Case (profitability).** "Our client's margins dropped. Why?" Issue tree first, hypothesis-driven analysis second.
- **Behavioural — leading without authority.** Time you got a peer team to change course without a manager intervening.
- **Behavioural — ambiguity.** Project with no brief that became something specific because of how you shaped it.
- **Why consulting?** Have a non-generic answer. "I want to learn fast across industries" is everyone's answer.

## Questions to ASK them

- What's a project on the floor right now that you wish you were staffed on?
- How does staffing actually work — preferences, partners, geography?
- What's the path for someone who wants to specialise vs. stay generalist?
- How does this office's culture differ from [other major office] of this firm?
- What's the unsexy part of the job your friends outside consulting don't realise?

## Gotchas + research

- The firm's recent thought leadership pieces — pick one and have a take.
- The interviewer's LinkedIn — pick one project they led and ask about it.
- The firm's current strategic pivot (if they have one) — usually visible in the careers site.
- Salary band by level + bonus structure (Wall Street Oasis, Reddit r/consulting).
`,
  },
];
