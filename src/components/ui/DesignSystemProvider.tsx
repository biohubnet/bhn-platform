"use client";
/**
 * Client-side context exposing the active design system to every
 * DS primitive (`useDesignSystem()`).
 *
 * The active id is set by an admin from /admin/design-system and
 * stored in the PlatformSetting table — same value applies to
 * every user on the platform. The root layout reads it
 * server-side and passes it into <Providers initialDesignSystem={…}>,
 * which feeds it here as the `value` prop. No localStorage, no
 * client-side preference, no per-user toggle.
 *
 * Components that need to branch on the active id continue to use
 * `useDesignSystem()`; the API is unchanged from the per-user
 * version, only the source of truth moved.
 */
import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_DESIGN_SYSTEM,
  type DesignSystemId,
} from "@/lib/design-system/registry";

interface DesignSystemContextValue {
  designSystem: DesignSystemId;
}

const DesignSystemContext = createContext<DesignSystemContextValue>({
  designSystem: DEFAULT_DESIGN_SYSTEM,
});

export function DesignSystemProvider({
  value,
  children,
}: {
  value: DesignSystemId;
  children: ReactNode;
}) {
  return (
    <DesignSystemContext.Provider value={{ designSystem: value }}>
      {children}
    </DesignSystemContext.Provider>
  );
}

export function useDesignSystem() {
  return useContext(DesignSystemContext);
}
