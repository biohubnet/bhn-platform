/**
 * Email-only sign-in: the login page asks for an email and nothing else,
 * and Auth0 is switched off. Owner decision, 2026-10-15: production has no
 * mail provider, so Auth0's reset emails never arrived and people were
 * locked out.
 *
 * Anyone who knows an account's email can enter as that account,
 * superadmins included. Set to false to bring back passwords, MFA and,
 * with its AUTH0_* env set, Auth0 Universal Login.
 *
 * Plain constant, no env: the login page is a client component and reads
 * it too.
 */
export const PASSWORDLESS_SIGN_IN = true;
