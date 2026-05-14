/**
 * Shape of the JSON state stored on PrepSession.state.
 *
 * The schema column is loosely-typed JSONB so we can evolve the
 * structure without a migration. This file is the canonical type
 * the service + API + UI all read against. When you add a field,
 * add it here AND bump the version sentinel below — the UI uses it
 * to migrate older blobs forward without breaking.
 */

export const PREP_STATE_VERSION = 1;

export interface PrepStateCompare {
  /** ISO timestamp the analysis last ran. */
  analyzedAt: string | null;
  /** Free-text snapshot of the resume the analysis ran against — so
   *  we can detect drift if the trainee later edits their resume. */
  resumeSnapshot: string;
  /** Keywords pulled from the JD (lowercased, deduped). */
  jdKeywords: string[];
  /** Per-keyword classification. */
  matches: Array<{
    keyword: string;
    status: "present" | "weak" | "missing";
    /** Quote from the resume that triggered the present/weak verdict. */
    evidence?: string;
    /** Coaching nudge for missing / weak ones. */
    suggestion?: string;
  }>;
  /** Aggregate score 0–100 — how well the resume currently lines up. */
  alignmentScore: number;
}

export interface PrepStateGaps {
  /** Resume-bullet-writing tasks. */
  bullets: Array<{
    id: string;
    keyword: string;
    /** What we want them to demonstrate. */
    prompt: string;
    /** Trainee's draft. */
    draft: string;
    /** Status: open / drafted / added-to-resume. */
    status: "open" | "drafted" | "done";
  }>;
  /** Skill-gap action items linked to courses + pathways. */
  skillActions: Array<{
    skillId: string;
    skillName: string;
    /** Suggested pathways / courses that teach this skill. */
    suggested: Array<{ kind: "course" | "pathway"; id: string; title: string }>;
    /** Trainee marks done when they enroll or self-assign. */
    status: "open" | "enrolled" | "skipped";
  }>;
}

export interface PrepStateInterview {
  /** Per-question draft + framework picked. */
  answers: Array<{
    questionId: string;
    /** Selected framework — STAR / SAR / direct / etc. (free text for now). */
    framework: string;
    /** Trainee's notes / draft. */
    draft: string;
    /** Word count target the UI nudges them toward (60–120 typical). */
    targetWords: number;
    /** Last edited time so the UI can show staleness. */
    updatedAt: string;
  }>;
  /** Story-IDs the trainee mapped to specific questions (a polished
   *  STAR story doubles as an interview answer). */
  storyMappings: Record<string /* questionId */, string /* storyId */>;
}

export interface PrepStateStar {
  /** Per-skill STAR scaffolds being drafted in-session. Distinct from
   *  the StarStory model — once the user clicks "Save to bank" the
   *  draft flips into a StarStory row and is removed from here. */
  drafts: Array<{
    /** Local-only id while the story is in draft. */
    draftId: string;
    /** Optional skill the user is writing this story for. */
    skillId?: string;
    /** Free-text title. */
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    /** Mirror of StarStory's structure feedback. */
    feedback?: StarFeedback;
  }>;
}

export interface PrepSessionState {
  version: number;
  compare?: PrepStateCompare;
  gaps?: PrepStateGaps;
  interview?: PrepStateInterview;
  star?: PrepStateStar;
}

/**
 * Heuristic feedback on a STAR story's structure.
 *
 * Computed client-side from word counts + simple regex patterns
 * over each field — no AI required. The "polish with AI" button
 * is a separate path; this is the always-on coaching layer.
 */
export interface StarFeedback {
  /** Total words across all four fields. */
  totalWords: number;
  /** Per-field word count + a "you might want N more words" nudge. */
  perField: {
    situation: { words: number; nudge?: string };
    task: { words: number; nudge?: string };
    action: { words: number; nudge?: string };
    result: { words: number; nudge?: string };
  };
  /** Hits that suggest a quantified outcome (numbers, "%", "reduced X by Y"). */
  hasQuantifiedResult: boolean;
  /** Hits that suggest the trainee, not their team, took the action. */
  usesFirstPerson: boolean;
  /** Overall "ready to use" judgement — green / amber / red. */
  readiness: "ready" | "almost" | "needs-work";
  /** Top 1–3 specific improvements to make. */
  tips: string[];
}

/** Empty state factory for a new PrepSession.state blob. */
export function emptyState(): PrepSessionState {
  return { version: PREP_STATE_VERSION };
}
