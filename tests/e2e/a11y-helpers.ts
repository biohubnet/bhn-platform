/**
 * Shared accessibility-scan helper for the WCAG 2.2 AA gate.
 *
 * Why a helper instead of inlining AxeBuilder in every spec: every scan
 * needs the same tag set, the same "wait for the page to settle" guard
 * (several routes poll or animate on mount), and the same readable
 * failure formatting — raw axe-core JSON is unusable in a CI log.
 */
import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** WCAG 2.2 Level AA — the standard this role scans against, plus the
 *  best-practice ruleset (catches issues like missing landmarks that
 *  aren't a numbered success criterion but are real usability defects). */
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

export type AuditedPage = { path: string; label: string };

function formatViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .slice(0, 3)
        .map((n) => `    - ${n.target.join(" ")}\n      ${n.failureSummary?.replace(/\n/g, " ")}`)
        .join("\n");
      return `[${v.impact}] ${v.id} — ${v.help} (${v.helpUrl})\n${nodes}`;
    })
    .join("\n\n");
}

/**
 * Navigate to `path`, run the full WCAG 2.2 AA ruleset, and fail the test
 * with a readable diff if any violation is found — at ANY impact level.
 * The audited page set here is deliberately small (a curated route per
 * flow type), so holding it to zero across all impacts is the honest
 * bar; a wider crawl would need the critical/serious-only gate instead.
 */
export async function auditPage(page: Page, path: string, testInfo?: TestInfo) {
  await page.goto(path);
  // Several dashboard routes poll (AI status, live counts) or animate
  // in on mount; give the DOM a moment to settle before scanning so we
  // don't flag a transient loading-skeleton state.
  // networkidle with NO timeout was the bug: it inherits the 60s test
  // budget, and the routes this helper exists for are exactly the ones
  // that never go idle — the comment above says so. /admin and
  // /employer/profile poll, so every audit of them consumed the full
  // 60s and failed as a test timeout rather than an accessibility
  // finding. Cap it: settle if the page can, move on if it cannot.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(300);

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  // Attach machine-readable violations (id/impact/selector) regardless of
  // pass/fail, so `playwright test --reporter=json` gives a script something
  // structured to aggregate across every page in one pass, instead of
  // string-parsing the pretty-printed expect() diff per failure.
  if (testInfo) {
    const compact = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target.join(" "),
        html: n.html,
        data: [...(n.any ?? []), ...(n.all ?? [])].map((c) => c.data),
      })),
    }));
    await testInfo.attach("axe-violations", {
      body: JSON.stringify({ path, violations: compact }, null, 2),
      contentType: "application/json",
    });
  }
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}
