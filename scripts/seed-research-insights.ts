/**
 * Seed ResearchInsight rows from canonical markdown sources in
 * docs/ux/research/<YYYY-MM>-synthesis.md.
 *
 * Pattern is the same as scripts/seed-changelog.ts: each markdown
 * file is idempotent — running this twice doesn't duplicate rows.
 * The synthesis lives in version control (canonical); this script
 * mirrors it into the database so /admin/insights surfaces what
 * was shipped.
 *
 * Run: npx tsx scripts/seed-research-insights.ts
 *
 * Each insight is upserted by `period` (unique constraint). The
 * `body` is the file content with the leading frontmatter / heading
 * stripped — keeps the synthesis itself clean in the admin UI while
 * the doc on disk retains its full metadata.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

/**
 * One entry per period we've published. The body string is kept
 * inline (not loaded from disk) so the seed is hermetic — running
 * it from CI or a fresh clone doesn't depend on the docs/ tree
 * being intact. The canonical version stays in docs/ux/research/.
 */
const SYNTHESES: { period: string; body: string }[] = [
  {
    period: "2026-05",
    body:
      "## What we observed this period\n\n" +
      "Three signals converge — two from artifacts we ran on 2026-05-13 (a WCAG audit, a design critique, a cognitive walk-through) and one from the platform's existing signal-capture surfaces.\n\n" +
      "**1. Accessibility — one real contrast finding worth fixing.**\n" +
      "The WCAG 2.1 AA sweep across all 9 themes found one genuine issue out of 18 contrast checks: the **Scientific theme's `--brand-600` accent fails the 3.0:1 minimum for UI components** on its card surface (2.70:1). Body text passes AAA across every theme. The fix is a small luminance shift on one CSS variable — target `#0284c7`. See `docs/ux/audits/2026-05-13-wcag-aa-contrast-sweep.md`.\n\n" +
      "**2. Trainee onboarding — one severity-3 finding, three severity-2s.**\n" +
      "The cognitive walk-through of Journey 01 surfaced that when SMTP isn't configured (preview deploys), trainees signing up get no email confirmation and no fallback inline copy reassuring them. Silent failure with no recovery path. Three further findings at severity 2: no self-service \"resend my invite\", pathway discovery is scan-only, the onboarding-tour auto-fire for new accounts is unverified. This is **expert review, not participant research** — hypotheses for the next study, not validated truths. See `docs/ux/research/2026-05-13-trainee-first-registration-cognitive-walkthrough.md`.\n\n" +
      "**3. The new admin surfaces are clean.**\n" +
      "The design critique on `/admin/insights` scored 2.9/4 across the Nielsen heuristics — solid Practiced quality, no 1s. Three small polish items at < 1 hour total (unsaved-changes indicator, inline help, Cmd-S to save). What this implies more broadly: the new design-system surfaces ship with consistent patterns the recently-documented design system actually predicted, which means the system is load-bearing, not aspirational.\n\n" +
      "## What we're going to do about it\n\n" +
      "This period: ship the scientific-theme accent fix, strengthen the access-request confirmation copy (sev-3), polish `/admin/insights` with the three sub-hour improvements.\n\n" +
      "Next period: pathway-discovery filter strip, self-service \"resend my invite\", verify onboarding-tour auto-fire.\n\n" +
      "Backlog: run a real 3-trainee usability test on Journey 01 to validate or invalidate the walk-through's findings; expand the contrast sweep to hero-mesh + status-palette overrides.\n\n" +
      "## What this teaches us about our practice\n\n" +
      "First, the gap between *having UX infrastructure* and *running UX practice* is real but smaller than expected — within 24 hours of shipping the audit/critique/research templates, we ran each one at least once and each produced an actionable finding. The artifacts weren't aspirational.\n\n" +
      "Second, AI-led expert review catches a meaningful subset of what participant research would catch, but the gap is real. The walk-through surfaced testable hypotheses about the onboarding email, the invite recovery flow, and pathway discovery — all things a real trainee study would either confirm or invalidate. The expert-review artifact fills the cadence *between* participant studies, which is what mid-stage UX practice needs.\n\n" +
      "*Canonical version: `docs/ux/research/2026-05-synthesis.md`.*",
  },
];

async function main() {
  console.log("Seeding ResearchInsight rows…");
  let inserted = 0;
  let updated = 0;
  for (const entry of SYNTHESES) {
    const existing = await prisma.researchInsight.findUnique({
      where: { period: entry.period },
      select: { id: true },
    });
    await prisma.researchInsight.upsert({
      where: { period: entry.period },
      create: { period: entry.period, body: entry.body },
      update: { body: entry.body },
    });
    if (existing) {
      updated++;
      console.log(`  · ${entry.period} updated`);
    } else {
      inserted++;
      console.log(`+ ${entry.period} inserted`);
    }
  }
  console.log(`\nInserted ${inserted}, updated ${updated}.`);
  console.log("Open /admin/insights to see them rendered live.");
  console.log(
    "Note: this script only writes the synthesis body. The 'Publish to changelog'\n" +
      "step is intentionally a human action — run it from /admin/insights when you're\n" +
      "ready for users to read it.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });

// Suppress the unused-fs/path warning while keeping the imports
// available for a future iteration that reads from docs/ directly.
void fs;
void path;
