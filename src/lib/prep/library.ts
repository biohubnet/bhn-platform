/**
 * Interview-question library.
 *
 * Curated set of common questions a BHN trainee should expect.
 * Categorised by intent (about-you / behavioural / role-specific /
 * situational / closing). Each question carries:
 *
 *   • A short framework hint — STAR / SAR / direct / etc.
 *   • A "what they're really asking" decoder.
 *   • Fill-in-the-blank scaffolding the user can drop their own
 *     specifics into. Designed to coach, not to write for them.
 *
 * The library is intentionally hardcoded (not DB-backed) so it
 * versions with the code review trail. Adding a question = a PR.
 * When the question set grows beyond ~40, revisit storage.
 */

export interface InterviewQuestion {
  id: string;
  text: string;
  category: "about-you" | "behavioural" | "role-specific" | "situational" | "closing";
  /** Tags used to surface role-specific questions for a posting. */
  tags: string[];
  /** Recommended framework. */
  framework: "STAR" | "SAR" | "direct" | "personal";
  /** "What they're really asking" — the decoder line under the question. */
  decoder: string;
  /** Suggested word count for the answer. */
  targetWords: number;
  /** Fill-in-the-blank scaffolding. Each `___` is a slot the trainee
   *  fills in; the UI renders them as inline inputs. */
  scaffold: string;
  /** Common pitfalls to warn the user about. */
  pitfalls: string[];
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // ── About-you ─────────────────────────────────────────────────
  {
    id: "tell-me-about-yourself",
    text: "Tell me about yourself.",
    category: "about-you",
    tags: ["any"],
    framework: "personal",
    decoder:
      "They want a 90-second narrative arc — where you started, what you do now, and why you're sitting in this interview specifically. Not your life story.",
    targetWords: 120,
    scaffold:
      "I'm currently ___ at ___, where I focus on ___. Before that, I ___. " +
      "What drew me to ___ was ___, and I'm interviewing for this role because " +
      "I want to ___.",
    pitfalls: [
      "Going chronological from kindergarten.",
      "Reading your resume aloud.",
      "Forgetting to tie the answer to why you want THIS role.",
    ],
  },
  {
    id: "why-this-role",
    text: "Why this role / why this company?",
    category: "about-you",
    tags: ["any"],
    framework: "direct",
    decoder:
      "They want to know you researched them + can articulate a specific, falsifiable reason — not a generic 'mission alignment'.",
    targetWords: 90,
    scaffold:
      "I came across [Company] when ___. The thing that grabbed me was ___. " +
      "In this role specifically, the part I'd want to take on first is ___, " +
      "because in my [course / project / past role] I learned ___.",
    pitfalls: [
      "Saying 'because I love your mission' without naming the mission.",
      "Making it about you instead of them.",
    ],
  },
  {
    id: "why-bhn-training",
    text: "What did you learn from your BHN training that applies here?",
    category: "about-you",
    tags: ["any"],
    framework: "direct",
    decoder:
      "They want concrete skill claims with concrete evidence. 'I took the CL3 tour' isn't useful — 'I now understand biosafety design choices and could explain why a CL3 lab uses negative pressure' is.",
    targetWords: 80,
    scaffold:
      "BHN's [pathway / workshop] gave me hands-on practice with ___. " +
      "Where it shows up in your role is ___ — specifically, I'd ___.",
    pitfalls: [
      "Listing pathways without naming the actual skill.",
      "Citing a session you attended but can't explain.",
    ],
  },
  // ── Behavioural ───────────────────────────────────────────────
  {
    id: "describe-conflict",
    text: "Tell me about a time you had a conflict with a teammate or supervisor.",
    category: "behavioural",
    tags: ["any"],
    framework: "STAR",
    decoder:
      "They want to see emotional regulation + a structured approach to disagreement, NOT a story where the other person was clearly wrong.",
    targetWords: 150,
    scaffold:
      "(Situation) I was ___ with ___. The disagreement was about ___. " +
      "(Task) My responsibility was to ___. (Action) I ___, and then I ___. " +
      "(Result) ___. Looking back, I learned ___.",
    pitfalls: [
      "Painting the other person as the villain.",
      "Picking a conflict that ended badly.",
      "Skipping the 'what I learned' close.",
    ],
  },
  {
    id: "describe-failure",
    text: "Tell me about a failure or mistake you made.",
    category: "behavioural",
    tags: ["any"],
    framework: "STAR",
    decoder:
      "They want a real failure that you handled like an adult. NOT a humble-brag failure ('I work too hard') and NOT something that paints you as careless.",
    targetWords: 140,
    scaffold:
      "(Situation) When I was ___, I ___. (Task) I was expected to ___. " +
      "(Action) The mistake was ___. I [caught it / it was flagged] by ___. " +
      "(Result) I responded by ___, and the outcome was ___. Since then, I always ___.",
    pitfalls: [
      "Humble-brag failures ('I'm too detail-oriented').",
      "Failures that pin blame on others.",
      "Skipping what changed in your habits afterward.",
    ],
  },
  {
    id: "lead-without-authority",
    text: "Tell me about a time you led without formal authority.",
    category: "behavioural",
    tags: ["leadership", "any"],
    framework: "STAR",
    decoder:
      "Common for any role. They want to see influence, not org-chart power.",
    targetWords: 140,
    scaffold:
      "(Situation) I was working on ___ with ___. (Task) Although I wasn't the [PI / manager], the team needed ___. " +
      "(Action) I proposed ___ and persuaded the group by ___. (Result) ___, and the team ___ afterward.",
    pitfalls: [
      "Picking an example where you actually WERE in charge.",
      "Skipping how you persuaded the group.",
    ],
  },
  {
    id: "describe-strength",
    text: "What's your greatest strength and how does it show up in your work?",
    category: "behavioural",
    tags: ["any"],
    framework: "SAR",
    decoder:
      "They want a strength + receipts. Adjectives alone don't count.",
    targetWords: 80,
    scaffold:
      "One thing I do well is ___. (Situation) For example, when I was ___, " +
      "(Action) I ___. (Result) The outcome was ___. " +
      "I'd put it to work in this role by ___.",
    pitfalls: [
      "Listing 3 strengths instead of going deep on 1.",
      "Picking a strength irrelevant to the role.",
    ],
  },
  // ── Role-specific ────────────────────────────────────────────
  {
    id: "walk-through-experiment",
    text: "Walk me through a recent experiment / project end-to-end.",
    category: "role-specific",
    tags: ["lab", "research", "bench"],
    framework: "direct",
    decoder:
      "Bench-research interviewers test your ability to explain your work crisply — hypothesis, method, result, next step. They're not looking for the Cell paper version.",
    targetWords: 200,
    scaffold:
      "The question I was investigating: ___. My hypothesis: ___. " +
      "Method I picked: ___ — I chose it because ___. " +
      "The key result: ___. What surprised me: ___. " +
      "My next step would be ___, because ___.",
    pitfalls: [
      "Method overload — leave room for the question and the result.",
      "Skipping what surprised you (best signal of real thinking).",
    ],
  },
  {
    id: "ambiguous-data",
    text: "How do you handle ambiguous or contradictory data?",
    category: "role-specific",
    tags: ["lab", "research", "data"],
    framework: "SAR",
    decoder:
      "They want methodical, not stuck. Show a real example of pausing to triangulate before defending a hypothesis.",
    targetWords: 130,
    scaffold:
      "(Situation) I had ___ data that didn't agree with ___. (Action) " +
      "Before assuming a problem, I checked ___, ___, and ___. The most " +
      "useful check was ___, because ___. (Result) Once I understood ___, " +
      "I ___ and the disagreement either resolved or ___.",
    pitfalls: [
      "Defending the hypothesis instead of testing it.",
      "Skipping the specific checks you ran.",
    ],
  },
  {
    id: "biomanufacturing-scale",
    text: "What do you understand about scaling a bioprocess from bench to production?",
    category: "role-specific",
    tags: ["biomanufacturing", "bioprocess", "GMP"],
    framework: "direct",
    decoder:
      "Tests whether you grasp the difference between research-scale and process-scale concerns — kLa, shear, sterility, batch-record discipline.",
    targetWords: 150,
    scaffold:
      "The non-obvious bits going from bench to scale are ___, ___, and ___. " +
      "In my training I worked with ___, where ___ became real for me. " +
      "What I'd want to learn here is ___.",
    pitfalls: [
      "Trying to sound smarter than you are — admit knowledge gaps directly.",
      "Listing concepts without showing where you've touched them.",
    ],
  },
  // ── Situational ──────────────────────────────────────────────
  {
    id: "tight-deadline",
    text: "You're given a project with a tight deadline you don't think is achievable. What do you do?",
    category: "situational",
    tags: ["any"],
    framework: "direct",
    decoder:
      "They want to see that you'll raise concerns AND offer options — not just complain or silently miss the deadline.",
    targetWords: 100,
    scaffold:
      "First, I'd write down ___ to make sure I'm not panicking on the wrong inputs. " +
      "Then I'd go to ___ with three options: ___, ___, ___. " +
      "I'd recommend ___ because ___.",
    pitfalls: [
      "Just saying 'work harder' — that's the wrong answer.",
      "Going to the manager with the problem and no proposed options.",
    ],
  },
  {
    id: "no-instructions",
    text: "How do you handle being given a vague assignment with no clear instructions?",
    category: "situational",
    tags: ["any"],
    framework: "direct",
    decoder:
      "Common in early-career roles. They want to see proactive scoping, not paralysis.",
    targetWords: 110,
    scaffold:
      "I'd start by ___ to understand the desired outcome. " +
      "Within 24 hours I'd come back to ___ with my interpretation: ___, " +
      "milestones I'd hit at ___, and ___. " +
      "If I were blocked I'd flag it by ___ rather than ___.",
    pitfalls: [
      "Waiting passively for clarification.",
      "Going off and building the wrong thing for two weeks.",
    ],
  },
  // ── Closing ──────────────────────────────────────────────────
  {
    id: "questions-for-us",
    text: "Do you have any questions for us?",
    category: "closing",
    tags: ["any"],
    framework: "direct",
    decoder:
      "Always have 3 questions ready, in priority order. 'No questions' reads as disinterest.",
    targetWords: 60,
    scaffold:
      "What does success look like in this role at the 3-month mark? · " +
      "What's the most interesting problem the team is wrestling with right now? · " +
      "What would you have asked at this stage of your career if you could?",
    pitfalls: [
      "Asking only about logistics (vacation, parking).",
      "Asking a question already answered earlier in the conversation.",
    ],
  },
];

/**
 * Pick the 6–8 most relevant questions for a posting based on its
 * key skills. Returns a stable order: 1–2 about-you questions, 2–3
 * behavioural, 1–2 role-specific (matched to posting skills if
 * possible), 1 situational, 1 closing.
 *
 * The intent: give the trainee a runway of starter questions
 * tailored to where they're interviewing. They can practice all
 * of them, or pick the 3 they're shakiest on.
 */
export function recommendQuestionsForPosting(postingKeySkills: string[]): InterviewQuestion[] {
  const tagSet = new Set(postingKeySkills.map((k) => k.toLowerCase()));

  const aboutYou = INTERVIEW_QUESTIONS.filter((q) => q.category === "about-you").slice(0, 2);
  const behavioural = INTERVIEW_QUESTIONS.filter((q) => q.category === "behavioural").slice(0, 3);
  const situational = INTERVIEW_QUESTIONS.filter((q) => q.category === "situational").slice(0, 1);
  const closing = INTERVIEW_QUESTIONS.filter((q) => q.category === "closing").slice(0, 1);

  // Role-specific: prefer questions whose tags intersect with the
  // posting's key skills. Fall back to the first 2 role-specific
  // questions if there's no tag overlap.
  const roleSpecific = INTERVIEW_QUESTIONS.filter((q) => q.category === "role-specific");
  const matched = roleSpecific.filter((q) =>
    q.tags.some((t) => tagSet.has(t.toLowerCase())),
  );
  const roleSpecificPicked = (matched.length > 0 ? matched : roleSpecific).slice(0, 2);

  return [...aboutYou, ...behavioural, ...roleSpecificPicked, ...situational, ...closing];
}
