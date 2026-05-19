/**
 * Role-play simulator — payload schema.
 *
 * One AI generation produces a `SimulationPayload` stored as JSON on the
 * Simulation row. Re-used across every trainee who plays the same JD.
 *
 * Everything is keyed by stable string ids so the runtime can index into
 * scenarios / people without juggling array positions.
 */

export type StatDef = {
  key: string;          // 'morale' | 'leadershipTrust' | 'craft' | 'crossFunc' | 'capacity'
  label: string;        // Display name in the dashboard
  short: string;        // 4–6 char abbreviation for the event log
  description: string;  // Tooltip / what this represents
  color: string;        // Hex color for the bar
  initialValue: number; // 0–100 starting value
};

export type Person = {
  id: string;          // stable id, slug-like ('marcus-reid')
  name: string;        // 'Marcus Reid'
  shortName: string;   // 'Marcus' or 'Priya R.' when disambiguation needed
  role: string;        // 'Sr UX Designer'
  shortRole: string;   // 'Sr UX' — for the compact roster strip
  group: "team" | "partner";
  tenure: string;      // '6 yrs at RBC' — short, readable
  oneLiner: string;    // 1–2 sentence characterization (incl personality quirks)
  daily: string[];
  weekly: string[];
  monthly: string[];
  quarterly: string[];
  annual: string[];
};

export type ScenarioType =
  | "vp_1on1"
  | "team"
  | "cross_func"
  | "escalation"
  | "hiring"
  | "planning"
  | "personal";

export type Choice = {
  label: string;        // The option text the player picks
  outcome: string;      // What happens (2–4 sentences with named people)
  effects: Record<string, number>;  // delta per stat key, e.g. {vpTrust: +8, capacity: -3}
  tag?: string;         // One-sentence summary for the end-of-quarter review
};

export type Scenario = {
  id: string;
  week: number;          // 1..12
  type: ScenarioType;
  title: string;
  setting: string;       // Where + when + relevant cast in the room
  prompt: string;        // The specific question / decision point
  choices: Choice[];     // 3–4 options
};

export type ReviewThresholds = {
  exceeds: number;       // e.g. 80
  strongMeets: number;   // 70
  meets: number;         // 58
  below: number;         // 45
};

/**
 * Job-dynamics insight that the JD doesn't tell you. Generated alongside
 * the scenarios so a single AI call produces everything the trainee
 * needs to understand the role beyond surface-level requirements.
 *
 * Surfaced to the player as a "Briefing" panel they can open anytime
 * during the sim and on the review screen.
 *
 * Optional on the type — older simulations generated before the
 * briefing schema landed simply don't have one, and the UI degrades
 * gracefully.
 */
export type Briefing = {
  /// 2–4 sentences on who actually has power, the unwritten metric,
  /// and the most important relationship for the first 90 days.
  hiddenDynamics: string;
  /// 3–5 ways people in this role commonly stumble in their first
  /// quarter. Specific, named patterns ("over-promising on roadmap to
  /// score with the VP"), not platitudes.
  failureModes: string[];
  /// 3–5 things not in the JD that matter — VP communication style,
  /// who blocks launches, which Slack channels matter, etc.
  unwrittenRules: string[];
  /// 5–7 sharp interview questions the player could ask the hiring
  /// manager to get a clearer picture of the role's reality.
  interviewQuestions: string[];
};

export type SimulationPayload = {
  jobTitle: string;
  companyName: string | null;
  location: string | null;
  /// 1-paragraph context the player needs (competitive landscape, regulator,
  /// the "must-do" pressure for the quarter).
  context: string;
  /// VP / direct manager. Pulled out separately because every game references them.
  vpName: string;
  vpRole: string;
  /// 5 stats — exact count enforced by the schema validator.
  stats: StatDef[];
  /// 8–12 direct reports.
  team: Person[];
  /// 3–6 cross-functional partners.
  partners: Person[];
  /// 12–17 scenarios spanning weeks 1–12.
  scenarios: Scenario[];
  reviewThresholds: ReviewThresholds;
  /// Job-dynamics insights — what the JD doesn't tell you. Optional for
  /// backward compatibility; UI hides this section if absent.
  briefing?: Briefing;
};

/// Runtime state of a single trainee playing a Simulation. Mirrors the
/// Prisma SimulationAttempt JSON fields.
export type AttemptStats = Record<string, number>;

export type LogEntry = {
  week: number;
  scenarioId: string;
  scenarioTitle: string;
  choiceLabel: string;
  outcome: string;
  effects: Record<string, number>;
  tag?: string;
};

export type AttemptState = {
  week: number;
  scenarioIndex: number;
  stats: AttemptStats;
  log: LogEntry[];
  finished: boolean;
};

export const PROMPT_VERSION = "v1";
