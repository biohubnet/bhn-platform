"use client";

/**
 * Showcase wrapper for the LaunchSwitch component on
 * /admin/design-system. Lives in a client component because the
 * design-system page is a server component, and passing the
 * `onFire` arrow function directly from a server component into a
 * client component throws ("Functions cannot be passed directly to
 * Client Components"). Keeping the demo callbacks in a "use client"
 * file sidesteps that entirely.
 */

import { LaunchSwitch } from "@/components/ui/LaunchSwitch";

export function LaunchSwitchDemo({ label = "DELETE" }: { label?: string }) {
  return (
    <LaunchSwitch
      label={label}
      ariaLabel={`${label} — demo, no-op`}
      onFire={() => { /* demo — intentionally empty */ }}
    />
  );
}

export function LaunchSwitchMediumDemo() {
  return (
    <LaunchSwitch
      size="md"
      label="DELETE"
      ariaLabel="DELETE — medium demo"
      onFire={() => { /* demo */ }}
    />
  );
}
