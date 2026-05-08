import { prisma } from "@/lib/prisma";
import { CHANGELOG_ENTRIES } from "./entries";

/**
 * Idempotently insert any changelog entries from CHANGELOG_ENTRIES that
 * aren't already in the DB (matched by title — once an entry has shipped
 * its title becomes its natural key; edit body in place rather than
 * renaming). One findMany at the start, creates only when needed, so a
 * fully-up-to-date deployment incurs a single cheap query.
 *
 * Called from the /changelog page so every push reaches users on next
 * visit without anyone having to run a seed script.
 */
export async function ensureChangelogEntries() {
  try {
    const existing = await prisma.changeLog.findMany({ select: { title: true } });
    const haveTitles = new Set(existing.map((e) => e.title));
    const missing = CHANGELOG_ENTRIES.filter((e) => !haveTitles.has(e.title));
    if (missing.length === 0) return;

    // Stamp every newly-created entry with the current deploy's
    // commit SHA. Lets admins correlate "what shipped" with "in
    // which build" without keeping a separate release log. The same
    // env var powers the build chip in the sidebar; falls back to
    // null on local dev where it isn't set.
    const buildSha = process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0, 12) || null;

    // Insert oldest first so chronological order matches the array.
    for (const e of missing.slice().reverse()) {
      const publishedAt = new Date(Date.now() - e.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.changeLog
        .create({
          data: {
            title: e.title,
            body: e.body,
            kind: e.kind,
            visibleTo: e.visibleTo,
            publishedAt,
            buildSha,
          },
        })
        .catch(() => {
          // Race: another concurrent request inserted the same title.
          // Safe to ignore — the next page load will see it exists.
        });
    }
  } catch {
    // Never let changelog seeding fail the page render.
  }
}
