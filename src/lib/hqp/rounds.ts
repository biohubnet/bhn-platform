/**
 * Feedback-round helpers.
 */

export interface FeedbackTopic {
  id: string;
  /** Short label shown above the question — eg. "Platform UX". */
  label: string;
  /** Full prompt — what the round is asking about. */
  question: string;
  /** Display order; lower first. */
  order: number;
}

/** Validate that the topics blob coming in is well-formed. */
export function parseTopics(raw: unknown): FeedbackTopic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t, i) => ({
      id: typeof t.id === "string" && t.id ? t.id : `topic_${i}`,
      label: typeof t.label === "string" ? t.label.slice(0, 200) : "",
      question: typeof t.question === "string" ? t.question.slice(0, 2000) : "",
      order: typeof t.order === "number" ? t.order : i,
    }))
    .sort((a, b) => a.order - b.order);
}

/** Default starter topics — mirrors the feedback template
 *  BHN currently uses. Admins can edit per round. */
export const DEFAULT_TOPICS: FeedbackTopic[] = [
  { id: "experience_review", label: "EXPERIENCE · application review", question: "Do you have any feedback on the EXPERIENCE internship application review process?", order: 0 },
  { id: "experience_matching", label: "EXPERIENCE · matching", question: "Have you had an interview from EXPERIENCE? If so, share your experience and feedback.", order: 1 },
  { id: "experience_ke", label: "EXPERIENCE · Knowledge Exchange", question: "Do you have any feedback on how to improve the KE program?", order: 2 },
  { id: "platform_ux", label: "Platform UX", question: "Do you have any feedback on how we can improve the BHN platform's user experience?", order: 3 },
  { id: "engage_on_demand", label: "ENGAGE · on-demand courses", question: "Have you taken any on-demand courses? Feedback on whether they were useful?", order: 4 },
  { id: "engage_format", label: "ENGAGE · course format", question: "For future instructor-led courses, do you prefer a 2-3 day bootcamp or 2-3 h per week over a few weeks?", order: 5 },
  { id: "networking", label: "Networking", question: "Have you participated in a 1:1 call on the platform? Anything BHN can do to improve the experience?", order: 6 },
  { id: "other", label: "Other support areas", question: "Any other areas where BHN can provide support?", order: 7 },
];
