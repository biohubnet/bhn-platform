/**
 * Shared constants for the team demo seeder.
 *
 * Imported by both the API route and the server page. The seeder is
 * ADDITIVE: each "Add demo team" click adds the next DEMO_TEAM_BATCH_SIZE
 * people from an ORDERED pool, so repeated clicks keep growing the roster
 * with genuinely distinct teammates — matching the postings seeder's
 * "adds a fresh batch each time" behaviour. Clearing removes ALL
 * demo-account members from the company (detected by accountKind, not a
 * fixed email list), so it catches every batch.
 *
 * Why a pool of distinct people (not three repeated archetypes):
 * the old seeder stamped the SAME three titles (HR Manager / Talent
 * Coordinator / Dept. Head) on every batch, so seeding three times gave
 * three identical "HR Managers" in a perfectly even 1:1:1 role split —
 * nothing like a real talent org. Now each batch draws the next entries
 * from DEMO_TEAM_POOL by sequence (offset = how many demo members already
 * exist), so every person has a distinct name AND title, and titles don't
 * repeat until the pool is exhausted (after which it wraps — fine for a
 * demo). The pool is ORDERED so click 1 lands a believable starter team
 * (a director, a recruiter, an observing hiring manager) and the roster
 * grows realistically: across the full 12 it's 3 managers / 6 generalists
 * / 3 viewers, which also populates all four role chips (owner = the
 * seeder themselves). joinedDaysAgo descends down the pool so the
 * first-added people read as longer-tenured; lastSeenHoursAgo varies
 * (some recently active, some quiet, a couple who never logged in) so the
 * roster looks organically grown rather than seeded in identical waves.
 */

/** One seeded teammate: a fixed name↔title↔role triple plus tenure
 *  signals. Drawn from DEMO_TEAM_POOL in order. */
export interface DemoTeamPerson {
  name: string;
  title: string;
  role: "manager" | "generalist" | "viewer";
  joinedDaysAgo: number;
  lastSeenHoursAgo: number | null;
}

/** How many people each "Add demo team" click adds. The pool length is a
 *  multiple of this (12 / 3 = 4 clicks for a full team) so batches align
 *  cleanly to pool boundaries and wrap predictably. */
export const DEMO_TEAM_BATCH_SIZE = 3;

/**
 * Ordered pool of distinct demo teammates. Drawn sequentially:
 * person at index `(existingDemoCount + i) % length`. Life-sciences-
 * flavoured titles to match BHN. Role mix across the full pool:
 * managers ×3, generalists ×6, viewers ×3.
 */
export const DEMO_TEAM_POOL: DemoTeamPerson[] = [
  // ── Click 1 — a believable starter team ───────────────────────────
  { name: "Taylor Reid",   title: "Director of Talent",                  role: "manager",    joinedDaysAgo: 540, lastSeenHoursAgo: 3    },
  { name: "Sam Nakamura",  title: "Senior Recruiter",                    role: "generalist", joinedDaysAgo: 320, lastSeenHoursAgo: 8    },
  { name: "Blake Torres",  title: "Hiring Manager, Regulatory Affairs",  role: "viewer",     joinedDaysAgo: 210, lastSeenHoursAgo: 30   },
  // ── Click 2 ───────────────────────────────────────────────────────
  { name: "Priya Anand",   title: "Technical Recruiter",                 role: "generalist", joinedDaysAgo: 180, lastSeenHoursAgo: 5    },
  { name: "Jordan Webb",   title: "Talent Coordinator",                  role: "generalist", joinedDaysAgo: 150, lastSeenHoursAgo: 26   },
  { name: "Maya Okafor",   title: "Recruiting Manager",                  role: "manager",    joinedDaysAgo: 130, lastSeenHoursAgo: 12   },
  // ── Click 3 ───────────────────────────────────────────────────────
  { name: "Devon Clarke",  title: "Sourcing Specialist",                 role: "generalist", joinedDaysAgo: 96,  lastSeenHoursAgo: 48   },
  { name: "Lena Petrov",   title: "Hiring Manager, Quality",             role: "viewer",     joinedDaysAgo: 74,  lastSeenHoursAgo: null },
  { name: "Marcus Hale",   title: "University Recruiter",                role: "generalist", joinedDaysAgo: 60,  lastSeenHoursAgo: 19   },
  // ── Click 4 — completes the org ───────────────────────────────────
  { name: "Aisha Rahman",  title: "People Ops Partner",                  role: "generalist", joinedDaysAgo: 42,  lastSeenHoursAgo: 70   },
  { name: "Chris Donovan", title: "VP, People",                          role: "manager",    joinedDaysAgo: 30,  lastSeenHoursAgo: 1    },
  { name: "Nina Costa",    title: "Dept. Head, Clinical Ops (Observer)", role: "viewer",     joinedDaysAgo: 12,  lastSeenHoursAgo: null },
];

/** All demo-team users share this email prefix so the orphan-user
 *  cleanup in the clear path can find them even across batches. */
export const DEMO_TEAM_EMAIL_PREFIX = "demo.team.";
