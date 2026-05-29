/**
 * Shared constants for the team demo seeder.
 *
 * Imported by both the API route and the server page. The seeder is
 * ADDITIVE: each "Add demo team" click creates a fresh batch of three
 * distinct demo members (unique emails per batch), so repeated clicks
 * keep growing the roster — matching the postings seeder's behaviour.
 * Clearing removes ALL demo-account members from the company (detected
 * by accountKind, not a fixed email list), so it catches every batch.
 */

/** One role archetype seeded per batch — three per "Add demo team". */
export interface DemoMemberArchetype {
  title: string;
  role: string;
  joinedDaysAgo: number;
  lastSeenHoursAgo: number | null;
}

export const DEMO_TEAM_ARCHETYPES: DemoMemberArchetype[] = [
  { title: "HR Manager",            role: "manager",    joinedDaysAgo: 14, lastSeenHoursAgo: 2    }, // "active recently"
  { title: "Talent Coordinator",    role: "generalist", joinedDaysAgo: 7,  lastSeenHoursAgo: 72   }, // 3 days
  { title: "Dept. Head (Observer)", role: "viewer",     joinedDaysAgo: 2,  lastSeenHoursAgo: null }, // never logged in
];

/** Realistic name pool — cycled by sequence so repeated seeding adds
 *  fresh-looking people rather than three identical clones. */
export const DEMO_TEAM_NAMES = [
  "Taylor Reid", "Sam Nakamura", "Blake Torres", "Priya Anand",
  "Jordan Webb", "Maya Okafor", "Devon Clarke", "Lena Petrov",
  "Marcus Hale", "Aisha Rahman", "Chris Donovan", "Nina Costa",
];

/** All demo-team users share this email prefix so the orphan-user
 *  cleanup in the clear path can find them even across batches. */
export const DEMO_TEAM_EMAIL_PREFIX = "demo.team.";
