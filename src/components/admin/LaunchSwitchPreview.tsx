"use client";

/**
 * Showcase wrappers for both LaunchSwitch variants on
 * /admin/design-system. Lives in a client component because the
 * design-system page is a server component, and passing the
 * `onFire` arrow function directly from a server component into a
 * client component throws ("Functions cannot be passed directly to
 * Client Components"). Keeping the demo callbacks in a "use client"
 * file sidesteps that entirely.
 *
 * Two destructive-control designs ship side-by-side:
 *  • `LaunchSwitch`         — the current canonical control. Clear
 *                             glass cover over a pulsing red DELETE
 *                             button, 10-second cooling-off countdown.
 *  • `LaunchSwitchClassic`  — the original military "rocket-launch"
 *                             control. Hazard-striped cover over a
 *                             red FIRE button, 5-second countdown.
 *                             Kept around because the industrial
 *                             language fits some surfaces better than
 *                             the softer glass variant.
 */

import { LaunchSwitch } from "@/components/ui/LaunchSwitch";
import { LaunchSwitchClassic } from "@/components/ui/LaunchSwitchClassic";
import { LaunchSwitchFacet } from "@/components/ui/LaunchSwitchFacet";

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

export function LaunchSwitchClassicDemo({ label = "DELETE" }: { label?: string }) {
  return (
    <LaunchSwitchClassic
      label={label}
      ariaLabel={`${label} — classic, demo, no-op`}
      onFire={() => { /* demo */ }}
    />
  );
}

export function LaunchSwitchClassicMediumDemo() {
  return (
    <LaunchSwitchClassic
      size="md"
      label="DELETE"
      ariaLabel="DELETE — classic medium demo"
      onFire={() => { /* demo */ }}
    />
  );
}

export function LaunchSwitchFacetDemo({ label = "DELETE" }: { label?: string }) {
  return (
    <LaunchSwitchFacet
      label={label}
      ariaLabel={`${label} — facet, demo, no-op`}
      onFire={() => { /* demo */ }}
    />
  );
}

export function LaunchSwitchFacetMediumDemo() {
  return (
    <LaunchSwitchFacet
      size="md"
      label="DELETE"
      ariaLabel="DELETE — facet medium demo"
      onFire={() => { /* demo */ }}
    />
  );
}
