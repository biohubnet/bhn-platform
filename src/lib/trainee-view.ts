/**
 * Trainee-restricted view.
 *
 * Trainees see a deliberately minimal platform: the Events tab and
 * nothing else. No other nav sections, no first-login mini-game, no
 * product tour. Staff are unaffected and keep the full surface.
 *
 * One predicate, imported by every surface that needs it, so the
 * definition of "trainee" cannot drift between the sidebar, the
 * dashboard redirect and the tour mounts.
 *
 * `evaluating` is included alongside `trainee`: it is the same learner
 * tier (ROLE_RANK 0) used for accounts under review, and every other
 * learner gate in the codebase treats the two together.
 *
 * NOTE this takes the EFFECTIVE role — the acted-as value when an admin
 * is previewing via the role switcher — so "act as trainee" genuinely
 * reproduces what a trainee sees. Passing realRole here would leave the
 * admin looking at the full sidebar and make the preview useless.
 */
const TRAINEE_ROLES = new Set(["trainee", "evaluating"]);

export function isTraineeOnlyView(role: string | null | undefined): boolean {
  return typeof role === "string" && TRAINEE_ROLES.has(role);
}
