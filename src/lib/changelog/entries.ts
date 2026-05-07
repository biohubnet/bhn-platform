// Single source of truth for changelog content. Both the auto-publish
// helper (lib/changelog/registry.ts, called from /changelog) and the
// scripts/seed-changelog.ts CLI read from this list.
//
// Editing rules:
//   • Append new entries at the TOP with daysAgo: 0.
//   • Treat title as the natural key — once an entry has shipped, edit
//     its body in place rather than creating a duplicate.
//   • Pick visibleTo carefully: ALL for everything user-visible, STAFF
//     for instructor+, ADMINS for admin+.

export const ALL = ["trainee", "evaluating", "instructor", "admin", "superadmin"];
export const STAFF = ["instructor", "admin", "superadmin"];
export const ADMINS = ["admin", "superadmin"];

export interface ChangelogEntry {
  title: string;
  body: string;
  kind: "feature" | "fix" | "improvement" | "note";
  visibleTo: string[];
  daysAgo: number;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    title: "Hi-Tech theme is now full TRON",
    body: "Switched the Hi-Tech palette to TRON's signature electric-cyan on inky black. Surfaces glow at the edges, headings sit in uppercase JetBrains Mono with wider tracking, corners are nearly square (0–6px), and the page background now carries a 64px grid pattern — the lightcycle arena floor look. Open the Theme picker to try it.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Internship parser now accepts dropped PDFs, DOCX, images, and text — all on Cloudflare's free AI",
    body: "Drag a PDF, Word document, screenshot, or text file straight onto the paste panel and the AI parses it. PDFs are extracted server-side via unpdf, DOCX via mammoth, and routed through Cloudflare Llama 3.3 70B; images go through Cloudflare's Llama 3.2 Vision model. Everything stays on the free Workers AI tier — no Gemini quota or Google billing involved. The browser-default behaviour of opening dropped files in a new tab is intercepted; the parser handles up to 20 MB.",
    kind: "improvement",
    visibleTo: STAFF,
    daysAgo: 0,
  },
  {
    title: "Internship Opportunities — a job board, AI-assisted",
    body: "EXPERIENCE → Internship Opportunities lists open internships and co-ops from BioHubNet's industry partners. Each posting shows the company, role, location, duration, hours, compensation, deadline, key skills, and full position details, with a one-click link to apply on the company site. Admins create new postings by pasting a job description from any source — email, PDF, web page, doc — and the AI parses it into structured fields they can review and save.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "EXPERIENCE track is open — apply through the Talent Application",
    body: "The new EXPERIENCE section in the sidebar opens with the Talent Application — a structured intake for students and postdocs applying to BioHubNet's industry-placement track. It collects your bio, citizenship and locations, French proficiency, education timeline, supervisor letter (PDF), 650-character pitch, one-minute STAR video, resume (PDF), and a supporting transcript. Resume / video upload directly to BioHubNet's encrypted storage; admins review every submission and export to CSV.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Changelog now auto-publishes — no more manual seeding",
    body: "When we ship an entry, it's now live on the changelog page automatically. Previously the entries lived in a script that had to be re-run against the database; now the /changelog page reads from a registry and idempotently upserts anything new. The audience filter (trainee / staff / admin) still applies per entry.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Hero banner brightened up",
    body: "The hero band on the dashboard, pathways, and catalog now paints a saturated marine mesh — deep cyan, mint-teal, deep blue — instead of inheriting the muted UI brand colours. The rest of the platform stays editorial-quiet; the hero gets to shout.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Sidebar reorganised into ENGAGE and EXPERIENCE",
    body: "Course Catalog, Learning Pathways (renamed from Pathways), My Courses, Gradebook, Certificates, and My Credits now sit under an ENGAGE section. EXPERIENCE opens the industry-placement track via Talent Application.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Palette shifted toward dark blue-teal",
    body: "The brand scale now reads as a refined marine slate-navy — same desaturated weight as before, just hue-shifted toward teal so cards and CTAs feel more editorial than corporate. Hi-Tech keeps its neon character.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Quieter, more refined palette — desaturated slate replaces bright royal blue",
    body: "Daylight, Nightfall, and Scientific now read as editorial rather than consumer-tech. Background goes from cool bright blue to a warm putty / charcoal off-white; text shifts from cool navy to warm graphite; the brand scale is a desaturated steel-slate (about 60% of the previous saturation). Hi-Tech keeps its neon character. CTAs still pass AAA contrast with white text — they just don't shout anymore.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Theme list trimmed to the four that earn their keep",
    body: "Aurora, Modern, Pink, Lab, and Lab Mouse are gone. The picker now shows Daylight, Nightfall, Scientific, and Hi-Tech — each one a distinct design language (typography + surface + radii), not just a colour swap. If you were on a retired theme, you've been bumped back to your OS preference automatically.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Bolder, more organic interface — full-bleed heroes, drifting blobs",
    body: "The dashboard, pathways, and course catalog now open with a bold full-bleed hero band: mesh gradient backgrounds, decorative blobs that drift gently behind the headline, asymmetric organic-cornered cards, and a curved organic edge into the content below. The hero greets you by name in gradient type and shows your stats in tiles with hand-shaped corners. Less generic, more intentional.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Course catalog: AI-generated thumbnails for every course",
    body: "Run scripts/auto-thumbnail-courses.ts to fill in cover art for the entire catalog. Each course gets a one-word focal subject (the strongest word from its title or category) rendered as an editorial brand-blue illustration via Cloudflare SDXL, uploaded to R2, and saved on the Course row. Idempotent — re-running only fills in what's still missing, or pass --force to regenerate.",
    kind: "feature",
    visibleTo: STAFF,
    daysAgo: 0,
  },
  {
    title: "Submissions table fits the screen + URL fields stop fighting you",
    body: "The /admin/forms/[slug] table is now compact (text-xs, tight padding, truncated cells with hover tooltips for the full value) and breaks out of the dashboard's max-width on large screens so it has room. URL fields on registration forms now accept anything you paste — no more 'please match the format' error if you skip the http:// scheme.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Themes are now full design languages — typography, shadows, and silhouette",
    body: "Each theme now defines its own typography (Modern uses Inter, Scientific is set in Charter serif, Hi-Tech in JetBrains Mono with uppercase headings, Pink and Lab Mouse in rounded Quicksand) plus its own surface treatment — Modern is shadowless with hard 1px borders, Hi-Tech glows neon, Pink and Lab Mouse have soft pink halos, Scientific reads as etched paper. Switching themes now changes how the platform feels, not just what colour it is.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
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
    title: "Pathway editor: clearer Edit button, draggable + resizable window",
    body: "The Edit button on a pathway hero is now a solid white pill so it actually stands out against the gradient. Open the editor and you can drag the title bar to move the dialog or grab the bottom-right corner to resize it. The course picker on the right grows with the dialog, so you can see more options at a glance.",
    kind: "improvement",
    visibleTo: STAFF,
    daysAgo: 0,
  },
  {
    title: "Dark-mode contrast pass — readable text, no over-bright cards",
    body: "Rebalanced the dark brand palette so saturated CTAs keep their contrast with white text while subtle blue tints work as active backgrounds. Tailwind's hard-coded state tints (rose-50, amber-100, emerald-50, etc.) are now muted in dark mode so alert banners and cert ribbons stop blasting. Body, muted, and subtle text all clear AA on the dark background.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Translations are near-instant on repeat visits",
    body: "Page translation now caches every result in two layers: a Postgres-backed cache shared across users (one translation per string per language, ever) and a per-tab sessionStorage cache for the current visit. Re-visiting any page in your chosen language is a no-network operation; first-time strings still go through Cloudflare m2m100.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Translate menu: real errors, no more retry loops",
    body: "If translation fails, the menu now shows the actual server response inline instead of a generic alert that wouldn't dismiss. The saved language is also cleared on failure so the next page load doesn't immediately re-trigger the same error.",
    kind: "fix",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Cookie banner no longer flashes on every refresh",
    body: "Decided cookie consent? You shouldn't see the banner again. We were rendering it briefly during the SSR pass before the client picked up your saved preference — that's the half-second flash. The banner now waits for the client to confirm a decision before deciding whether to show.",
    kind: "fix",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "View-as menu refresh",
    body: "Superadmins viewing as another role: the menu trigger and active-role highlight now use brand blue (was amber). The menu pops on a teal surface that's distinct from the rest of the app so it's hard to miss you're impersonating. Stop viewing-as · Restore superadmin moved to the top of the menu and only shows when you're actually impersonating someone.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Build commit SHA in the sidebar (staff)",
    body: "A small mono-font 7-char SHA chip is now docked above the user block in the sidebar. Click-and-drag to copy when filing bug reports — tells us which build you were running.",
    kind: "feature",
    visibleTo: STAFF,
    daysAgo: 0,
  },
  {
    title: "Marketing splash retired — / goes straight where you need to be",
    body: "The 267-line marketing landing page on / is gone. Signed in? You go to /dashboard. Signed out? You go to /login. One less click in a typical session.",
    kind: "improvement",
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
