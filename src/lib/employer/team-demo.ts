/**
 * Shared constants for the team demo seeder.
 * Imported by both the API route and the server page so the
 * "has demo members?" check and the seed/clear logic stay in sync.
 */

export interface DemoMemberSpec {
  email: string;
  name: string;
  title: string;
  role: string;
  joinedDaysAgo: number;
  lastSeenHoursAgo: number | null;
}

export const DEMO_TEAM_MEMBERS: DemoMemberSpec[] = [
  {
    email: "demo.team.manager@bhn.test",
    name: "Taylor Reid",
    title: "HR Manager",
    role: "manager",
    joinedDaysAgo: 14,
    lastSeenHoursAgo: 2,     // shows as "active recently"
  },
  {
    email: "demo.team.generalist@bhn.test",
    name: "Sam Nakamura",
    title: "Talent Coordinator",
    role: "generalist",
    joinedDaysAgo: 7,
    lastSeenHoursAgo: 72,    // 3 days
  },
  {
    email: "demo.team.viewer@bhn.test",
    name: "Blake Torres",
    title: "Dept. Head (Observer)",
    role: "viewer",
    joinedDaysAgo: 2,
    lastSeenHoursAgo: null,  // never logged in yet
  },
];

export const DEMO_TEAM_EMAILS = DEMO_TEAM_MEMBERS.map((m) => m.email);
