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
 * Nav destinations a trainee may still reach.
 *
 * EQUIP is here because trainee-entrepreneurs are exactly who the
 * VentureConnect / VentureLift grants are for — hiding the nav would
 * leave the application portal built but unreachable. Matched by href
 * prefix, so /equip/apply/new and /equip/my-applications resolve
 * without listing every child route.
 */
export const TRAINEE_ALLOWED_PREFIXES = ["/events", "/equip"] as const;

export function isTraineeAllowedHref(href: string): boolean {
  return TRAINEE_ALLOWED_PREFIXES.some(
    (p) => href === p || href.startsWith(p + "/"),
  );
}
