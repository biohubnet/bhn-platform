/**
 * The three states a course catalogue card's call-to-action can be in.
 *
 * Driven by `Course.status`, which is a commented String like every other
 * state machine in this schema:
 *
 *   published → enrolment is open. The CTA is the only actionable one.
 *   upcoming  → the course is real and listed, but enrolment has not
 *               opened. Trainees SEE it (that is the point — it lets
 *               people plan around a cohort that has not opened yet);
 *               they cannot join it.
 *   archived  → it ran and is over. Staff-only in the catalogue.
 *   draft     → staff-only everywhere, and never reaches a card.
 *
 * Nothing here needs a server-side guard of its own: POST
 * /api/courses/[id]/enroll already refuses any status that is not
 * "published", so an `upcoming` course cannot be joined even by someone
 * who forges the request. This module only decides what the button says
 * and what colour it is.
 *
 * Why status and not a date: the obvious alternative was an
 * `enrollFromDate` that flips the state automatically. Every course in
 * the catalogue today has a NULL `cohortStartDate` — the date fields on
 * this model are populated for 9 courses out of 62, and only the
 * deadline one. A date-driven rule would therefore be a rule about data
 * nobody maintains. `status` is the field admins already set from the
 * course editor.
 */

/** Which of the three CTA states a card is in. */
export type CourseAvailability = "open" | "upcoming" | "archived";

export function courseAvailability(status: string): CourseAvailability {
  if (status === "archived") return "archived";
  if (status === "upcoming") return "upcoming";
  return "open";
}

/** Catalogue statuses a non-staff visitor is allowed to see.
 *
 *  `archived` used to be in this list, so trainees could read about
 *  courses that had already run. It is staff-only now: a catalogue that
 *  lists things you cannot join, with no way to tell which is which
 *  until you read the button, is a catalogue that wastes the reader's
 *  time. Staff still see every status. */
export const TRAINEE_VISIBLE_STATUSES = ["published", "upcoming"] as const;

export interface AvailabilityPresentation {
  label: string;
  /** Tailwind classes for the CTA bar. Token-driven so all seventeen
   *  themes resolve; never a raw hex. */
  className: string;
  /** False for the two states that are not a call to action, so the
   *  card can drop the arrow and the hover motion. */
  actionable: boolean;
}

export function availabilityPresentation(
  availability: CourseAvailability,
  requiresApproval: boolean,
): AvailabilityPresentation {
  switch (availability) {
    case "archived":
      // Inert. Neutral surface, muted ink — it should read as a label,
      // not as a control someone might try to press.
      return {
        label: "Archived",
        className: "bg-elevated text-muted ring-1 ring-inset ring-line",
        actionable: false,
      };
    case "upcoming":
      // Amber: waiting, not blocked. Distinct from both the brand fill
      // of an open course and the grey of a finished one at a glance.
      return {
        label: "Enrolment opening soon",
        // Hue in the fill and ring, NOT in the label. globals.css
        // redefines --color-amber-100 per theme as a low-alpha tint, so
        // the chip ground is pale on light themes and dark on dark ones;
        // only 10 of the 17 themes override text-amber-800/900, so a
        // literal amber ink would be dark-on-dark on the other 7.
        // text-fg is the token that already tracks that flip — the same
        // reasoning CHIP_CLASSES in CourseCard.tsx spells out.
        className: "bg-amber-100 text-fg ring-1 ring-inset ring-amber-300",
        actionable: false,
      };
    default:
      return {
        label: requiresApproval ? "Request to Enroll" : "Enroll",
        className: "bg-brand-600 text-white group-hover:bg-brand-700",
        actionable: true,
      };
  }
}
