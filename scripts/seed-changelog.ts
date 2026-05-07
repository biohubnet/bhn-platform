/* Seed historical changelog entries. Run once: npx tsx scripts/seed-changelog.ts */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ALL = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
const STAFF = ["instructor", "admin", "superadmin"];
const ADMINS = ["admin", "superadmin"];

const entries = [
  {
    title: "Six new theme designs to choose from",
    body: "The Theme picker now ships nine looks: Modern (minimalist red), Scientific (cool sky-blue), Hi-Tech (neon cyan on near-black), Pink (rose), Lab (sterile white + emerald), and Lab Mouse (warm cream + mouse pink), in addition to Daylight, Nightfall, and Aurora. Each theme reshapes corner radii too, so the platform's silhouette changes with the palette.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Event registration forms now live on Pathways",
    body: "The OBIO Entrepreneurship Bootcamp registration is the first one — you'll see it as a teal card on the Pathways page. Submit once and we keep your last response on file. Admins can edit the form fields in place (add, remove, reorder) and export every submission as a CSV.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Change log is here",
    body: "Track what's new in the platform from one place. Trainees see it as What's new; staff see full release notes. Every entry's audience is configurable per-role.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Multi-select batch actions on the Users page",
    body: "Admins can now select multiple users at once and run a single action across all of them: activate / deactivate, change role, adjust BHN credits, or add to a group. Every batch is logged in the audit trail.",
    kind: "feature",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Trainee role renamed",
    body: "The default learner role is now Trainee. All existing accounts with the old name were migrated automatically. No action needed.",
    kind: "improvement",
    visibleTo: STAFF,
    daysAgo: 0,
  },
  {
    title: "Ten elegant interface themes",
    body: "Pick from Daylight, Slate, Ocean, Forest, Sunset, Rose, Lavender, Twilight, Midnight, or Espresso. Your choice persists across sessions and respects your OS preference on first visit. Find the picker at the bottom of the sidebar.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 1,
  },
  {
    title: "Remember me on sign-in",
    body: "A new checkbox on the login page keeps you signed in for 30 days on this device. Uncheck it on shared computers and your session ends after a day.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 1,
  },
  {
    title: "BioHubNet newsletter opt-in at registration",
    body: "New accounts are invited to subscribe to the BioHubNet newsletter at sign-up. Unsubscribing happens via the link at the bottom of any newsletter email.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 1,
  },
  {
    title: "New brand mark and logo",
    body: "A graduation cap with a tassel on a brand-blue tile — appears across the app, the login screen, and the favicon.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 2,
  },
  {
    title: "Instructor role",
    body: "A new role between Trainee and Admin that can author courses, upload SCORM packages, and manage modules and assessments — but cannot manage users, settings, or audit logs.",
    kind: "feature",
    visibleTo: STAFF,
    daysAgo: 2,
  },
  {
    title: "Edit course information after creation",
    body: "Course detail pages now have an Edit button for instructors and admins. Update title, description, passing score, credit cost, duration, and more without leaving the page.",
    kind: "feature",
    visibleTo: STAFF,
    daysAgo: 3,
  },
  {
    title: "Training Pathways",
    body: "Bundle courses into a curated learning journey. When learners complete every required course, the platform automatically issues a pathway-level certificate. Find pathways in the sidebar.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 3,
  },
  {
    title: "Public marketing home page",
    body: "Visit the root URL while signed out to see the new landing page with live platform stats, feature highlights, and a pathway-focused callout.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 4,
  },
  {
    title: "5,000 BHN credits to start",
    body: "Every new account is provisioned with 5,000 BHN credits, enough to enroll in the most popular courses right away.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 4,
  },
  {
    title: "SCORM packages now stored in object storage",
    body: "SCORM zip uploads are extracted in /tmp and streamed to Cloudflare R2 with zero egress cost. Existing courses keep working, with content served through a same-origin proxy so the SCORM runtime still talks to the LMS API.",
    kind: "improvement",
    visibleTo: STAFF,
    daysAgo: 5,
  },
  {
    title: "Production database upgraded to Postgres",
    body: "Migrated from local SQLite to managed Neon Postgres for reliability, concurrency, and proper backups. Session pooling configured for serverless function compatibility.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 5,
  },
  {
    title: "Welcome to BHN Training",
    body: "The first public release of the BHN Training Platform — courses, modules, assessments, certification, BHN credits, and a foundation to grow on.",
    kind: "note",
    visibleTo: ALL,
    daysAgo: 6,
  },
];

async function main() {
  // Idempotent: skip-by-title so re-running after appending new entries
  // only inserts the new ones. Existing entries can be edited via the
  // admin UI without conflict.
  for (const e of [...entries].reverse()) { // create oldest first so most recent ends up most recent
    const exists = await prisma.changeLog.findFirst({
      where: { title: e.title },
      select: { id: true },
    });
    if (exists) {
      console.log(`= ${e.title} (exists, skipped)`);
      continue;
    }
    const publishedAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.changeLog.create({
      data: {
        title: e.title,
        body: e.body,
        kind: e.kind,
        visibleTo: e.visibleTo,
        publishedAt,
      },
    });
    console.log(`+ ${e.title}`);
  }
}

main().then(() => prisma.$disconnect()).catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
