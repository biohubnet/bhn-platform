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

export const ALL = ["trainee", "evaluating", "employer", "instructor", "admin", "superadmin"];
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
    title: "System status page for superadmins — DB, AI, and security at a glance",
    body: "New /admin/system-status (superadmin-only) gives a one-page read-out of the platform's health. Top card rolls up an overall traffic-light verdict — Database (live ping with millisecond latency), AI provider (failure rate over the last 7 days), Superadmin redundancy (warns if there's only one), and the action queue size. Below it: vitals row (active users, AI calls in 24h, DB ping, build commit), a database row-count grid for the major tables, an AI-usage breakdown by feature for the last 30 days with calls / failures / failure-% / avg latency, and six security signals — privileged accounts, pending role-change requests, idle 90+ days, employer invites, deactivated accounts, sessions. Footer streams the latest role-related audit entries, recent logins (24h), and the audit-log feed. Read-only — no actions, no caching.",
    kind: "feature",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Changelog page got a dashboard + timeline view",
    body: "Open /changelog and you'll see a stat panel up top — total entries, this-month / last-30-day counts, days since the last update, by-kind breakdown chips, and a 12-month sparkbar showing release cadence. Below it, entries now flow as a vertical timeline with month sub-headings and a rail of coloured dots, so it's easy to scan how busy a given period was at a glance.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Sidebar group titles now describe the programmes underneath",
    body: "Hover (or focus) the ENGAGE / EXPERIENCE labels in the sidebar — a small popover slides out to the right with BioHubNet's official one-line description and the named programmes inside each track. ENGAGE: industry-led training, workshops, and mentorship — Medical Affairs Learning Pathway (MSL Accelerator with Agilis Health) and Entrepreneurship Learning Pathway. EXPERIENCE: bridging theory and practice — Knowledge Exchange Round 4 (1/4/6-month placements), Talent Application, and Internship Opportunities.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Per-role dashboards — instructors and admins now land on a tailored view",
    body: "/dashboard now branches four ways: trainees keep the existing learner view; instructors see their own courses, recent enrolments, and assessment attempts; admins / superadmins land on a platform-overview with action queues (credit apps, role-change requests, pending pathway enrolments) plus live counters and the latest audit-log entries; employers continue to get the HR portal view shipped earlier. Superadmins also get an extra system-health row (AI calls in the last 7 days) and a quick-links panel for settings, LTI, and course filters.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Employer dashboard tailored to HR — postings, applicants, profile",
    body: "When an Employer HR signs in, /dashboard now lands on a portal-shaped overview instead of the learner view. Hero greets them by name + company with stats for active postings, applicants, new this week, and a profile-completeness percentage. A nudge card prompts them to finish the profile if it's sparse, four quick-action tiles cover post / browse / edit / apply, and the lower half lists the latest five applicants and the latest five of their own postings inline. The learner dashboard is unchanged for trainees / instructors / admins.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Employer self-signup via invite link + AI-filled company profile",
    body: "Admins can now invite an industry partner from /admin/employer-invites — paste an email, optionally a company name and website, and we generate a one-time link with a configurable expiry. The recipient clicks through, sets a name + password, and lands on /employer with the Employer HR role auto-assigned. The new /employer/profile page lets them paste their website and one-click 'Auto-fill' — the AI fetches the homepage, extracts industry / HQ / size / founding year / a short description, and pulls the favicon as a starter logo. Existing values aren't overwritten, so re-running just fills in blanks.",
    kind: "feature",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Test data: dummy employer + trainee + posting + application",
    body: "Run scripts/seed-test-employer-flow.ts to drop in a ready-to-test pair: an Employer HR (test.employer@biohubnet.test / test1234) at Acme Biotherapeutics with one active internship posting, and a Trainee (test.trainee@biohubnet.test / test1234) who has already submitted the talent application. Idempotent — re-running won't duplicate. Pass --cleanup to delete the test rows when you're done. Three ways to verify the flow: sign in as the employer, view-as Employer HR from the superadmin avatar menu, or sign in as the trainee.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Catalog admin tools — quick-edit, bulk filter assignment, and DB-driven option lists",
    body: "Three connected admin upgrades on the course catalog. (1) Each card now has a pencil for admins — opens a small dialog to set topic / delivery / provider / Special-program in one place; saves via PATCH and stays on page. (2) Each card also has a checkbox; selecting one or more reveals a sticky toolbar at the bottom of the screen with 'Apply filters to N' — the dialog has a 'Don't change' option per field so you only touch what you mean to. (3) New /admin/course-filters page lets admins add, rename, hide, or delete the option lists themselves; the catalog filter rail reads from the DB now, so additions show up everywhere immediately. Existing courses keep their assigned values even when you hide an option from the picker.",
    kind: "feature",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Employer HR role exposed in admin role-pickers + view-as menu",
    body: "Admins can now pick \"Employer HR\" in the Users page role dropdown (single-row select and the batch role action both list it), and the superadmin View-as menu can preview the platform as an employer. Set a user's role to Employer HR and they're routed to /employer on next login — full portal with Postings, Applicants, and the ATS scaffold.",
    kind: "improvement",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Course catalog filters — by topic, delivery, special programs, and provider",
    body: "A filter rail now sits next to the catalog. Pick from nine topics (Sector/Tech, Career Insights, Regulatory Affairs, Industry Fundamentals, Quality, Biomanufacturing USP/DSP, etc.), four delivery types (Asynchronous, Online Synchronous, In-Person, Blended), the Special Programs (Instructor-led, limited seats) flag, and any of nine providers (Talent Accelerator, BioTalent Canada, CASTL, Seneca, CRAFT, Agilis Health, U of T, INSPIRE, CANTRAIN). Filters are URL-driven so they survive a refresh and are shareable.",
    kind: "feature",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "Sidebar groups now sit in lettered boxes",
    body: "ENGAGE and EXPERIENCE (and Administration for admins) are wrapped in bordered boxes with the group title sitting at the top opening — the fieldset / legend pattern. Visually clearer at a glance which feature lives in which track.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
  {
    title: "New 'Employer HR' user type — portal scaffold for industry partners",
    body: "Added an Employer HR role for industry partners who post internships and review applicants. They land in a dedicated /employer portal with overview tiles, their own postings list, and a read-only roster of talent applications (with one-click links to resume, 1-min video, and email). A per-account toggle (allowPlatformContent, default off) decides whether they can also browse Engage / Experience content. The full ATS workflow — Save / Shortlist / Interview status, candidate notes, side-by-side comparison, Calendly-style interview booking — is the next iteration.",
    kind: "feature",
    visibleTo: ADMINS,
    daysAgo: 0,
  },
  {
    title: "Pathway cards: full-width horizontal layout, more breathing room",
    body: "Learning Pathways now lists each pathway and event registration in a single full-width column rather than a 3-up grid. Each card uses a horizontal layout — the gradient hero panel sits on the left, with title, eyebrow, three lines of description, course count, learner count, and a 'Pathway certificate' chip on the right. ~20% more vertical space per card so the description actually breathes.",
    kind: "improvement",
    visibleTo: ALL,
    daysAgo: 0,
  },
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
