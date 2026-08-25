/**
 * Trainee-restricted view.
 *
 * Trainees see a deliberately minimal platform: Events, and the EQUIP
 * funding surfaces they need in order to apply. Everything else —
 * courses, pathways, certificates, experience, credits, the product
 * tour, the first-login mini-game — is hidden. Staff are unaffected.
 *
 * One predicate + one allowlist, imported by every surface that needs
 * them, so the definition cannot drift between the sidebar, the
 * dashboard and the tour mounts.
 *
 * `evaluating` is included alongside `trainee`: it is the same learner
 * tier (ROLE_RANK 0) used for accounts under review, and every other
 * learner gate in the codebase treats the two together.
 *
 * NOTE these take the EFFECTIVE role — the acted-as value when an admin
 * previews via the role switcher — so "act as trainee" genuinely
 * reproduces what a trainee sees rather than leaving the admin on the
 * full sidebar.
 */
const TRAINEE_ROLES = new Set(["trainee", "evaluating"]);

export function isTraineeOnlyView(role: string | null | undefined): boolean {
  return typeof role === "string" && TRAINEE_ROLES.has(role);
}

/**
 * Visibility is decided per SECTION, not per href.
 *
 * An earlier version kept a TRAINEE_ALLOWED_PREFIXES allowlist and
 * filtered individual nav items against it. That does not survive
 * contact with EXPERIENCE, whose entries are scattered across
 * /experience, /profile/*, /forms/*, /internships, /simulator,
 * /mock-interview and /career-paths — enumerating those prefixes would
 * be a second, silently-drifting copy of the nav arrays.
 *
 * So the sidebar gates whole SectionGroups on `traineeOnly` instead,
 * and per-item visibility stays where it already lived: the feature
 * registry (`defaultEnabled`) plus each user's own toggles.
 */
