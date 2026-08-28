"use client";
/**
 * Which identity provider is live, made available to client components.
 *
 * Why a context rather than a NEXT_PUBLIC_ env var: `isAuth0Enabled()`
 * already answers this on the server by checking five secret variables,
 * and a NEXT_PUBLIC mirror would be a second source of truth that can
 * silently disagree with the first. A disagreement here means the sign-
 * out button posts to a provider that is not handling the session —
 * i.e. the user appears to sign out and does not. So the flag is
 * computed once, server-side, and passed down like any other prop.
 *
 * Sign-IN does not need this. The proxy redirects /login and /register
 * to Universal Login when Auth0 is on, which happens before any React
 * renders and so avoids a flash of the credentials form. Sign-OUT does
 * need it, because it is a click handler on an already-rendered page.
 */
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

const AuthProviderContext = createContext<{ auth0Enabled: boolean }>({
  auth0Enabled: false,
});

export function AuthProviderFlag({
  auth0Enabled,
  children,
}: {
  auth0Enabled: boolean;
  children: ReactNode;
}) {
  return (
    <AuthProviderContext.Provider value={{ auth0Enabled }}>
      {children}
    </AuthProviderContext.Provider>
  );
}

/** True when Auth0 Universal Login is the live provider. */
export function useAuth0Enabled(): boolean {
  return useContext(AuthProviderContext).auth0Enabled;
}

/**
 * Provider-agnostic sign-out.
 *
 * Auth0 owns its own logout route (mounted by the proxy, not by a route
 * file), and it must be reached by a real navigation so the SDK can
 * clear its session cookie and bounce through the tenant's logout
 * endpoint. NextAuth's client `signOut()` does its own CSRF dance and
 * cannot log a user out of Auth0. Calling the wrong one leaves the
 * session intact while the UI claims otherwise — the failure mode this
 * exists to prevent.
 *
 * `callbackUrl` is honoured on the NextAuth path. On the Auth0 path the
 * post-logout destination is whatever the tenant's Allowed Logout URLs
 * permit, so it is deliberately not forwarded — an unregistered URL
 * makes Auth0 reject the logout outright.
 */
export function useSignOut(): (callbackUrl?: string) => void | Promise<void> {
  const auth0Enabled = useAuth0Enabled();
  return useCallback(
    (callbackUrl = "/") => {
      if (auth0Enabled) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- must be a full document navigation, not a client-side route change. /auth/logout is served by the proxy (not a Next page) and answers with a redirect OUT to the Auth0 tenant's logout endpoint; router.push() cannot follow a cross-origin redirect, so the session would survive while the UI claimed otherwise.
        window.location.href = "/auth/logout";
        return;
      }
      return nextAuthSignOut({ callbackUrl });
    },
    [auth0Enabled],
  );
}
