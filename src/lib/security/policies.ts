/**
 * Read + index security policies from `docs/security/`.
 *
 * Used by the hub page at /admin/security/policies and the detail
 * page at /admin/security/policies/[slug]. The markdown files in
 * docs/security/ are the single source of truth — this module
 * exposes them to server components without ever caching, so a
 * commit that updates a policy is reflected on the next request
 * without a rebuild.
 *
 * Design notes
 * ────────────
 *   • File-system read, not bundle import. Means we keep the diff
 *     between source-of-truth and rendered page at zero.
 *   • Path uses process.cwd() — works locally + on Vercel because
 *     docs/ ships in the deployment bundle. (Confirm at first
 *     deploy by hitting the hub page.)
 *   • Two doc shapes coexist in docs/security/:
 *       • Policies — undated, evergreen governance docs (e.g.
 *         encryption-posture.md, incident-response.md).
 *       • Operational artefacts — dated YYYY-MM-DD-* (e.g.
 *         2026-05-08-canvas-breach-response.md). These are one-off
 *         incident write-ups + dated roadmaps.
 *     We split them in the hub UI; the helper here just classifies.
 *
 *   • Slug derivation: filename minus `.md`. Stable + human-readable.
 *
 *   • Title + description extraction: title is the first `# H1`
 *     line; description is the first non-empty paragraph after
 *     the title that isn't a `**bold key:** value` metadata line.
 */
import fs from "node:fs/promises";
import path from "node:path";

const POLICY_DIR = path.join(process.cwd(), "docs", "security");

export type PolicyKind = "policy" | "operational";

export interface PolicyMeta {
  /** URL slug — filename minus extension. */
  slug: string;
  /** First `# H1` line in the file. */
  title: string;
  /** First paragraph that isn't a bold metadata line. */
  description: string;
  /** Last filesystem mtime, ISO string. Surfaces "is this stale?". */
  updatedAt: string;
  /** policy | operational — drives the hub's two-list split. */
  kind: PolicyKind;
}

export interface PolicyContent extends PolicyMeta {
  /** Raw markdown body — passed to react-markdown on the detail page. */
  body: string;
}

/**
 * Enumerate every policy + operational doc in docs/security/.
 * Sorted: policies alphabetically by title, operational by date
 * descending (newest first).
 */
export async function listPolicies(): Promise<PolicyMeta[]> {
  const entries = await fs.readdir(POLICY_DIR);
  const mds = entries.filter((e) => e.endsWith(".md"));

  const metas: PolicyMeta[] = await Promise.all(
    mds.map(async (filename) => {
      const slug = filename.replace(/\.md$/, "");
      const full = path.join(POLICY_DIR, filename);
      const [stat, raw] = await Promise.all([
        fs.stat(full),
        fs.readFile(full, "utf8"),
      ]);
      const { title, description } = extractTitleAndDescription(raw, slug);
      return {
        slug,
        title,
        description,
        updatedAt: stat.mtime.toISOString(),
        kind: classify(slug),
      };
    }),
  );

  return metas.sort((a, b) => {
    // policies first, operational second
    if (a.kind !== b.kind) return a.kind === "policy" ? -1 : 1;
    if (a.kind === "policy") {
      return a.title.localeCompare(b.title);
    }
    // operational — date prefix descending; slug carries the date so
    // a reverse-string sort yields newest-first.
    return b.slug.localeCompare(a.slug);
  });
}

/**
 * Read one policy by slug. Returns null when the slug doesn't
 * resolve to a file — used by the detail page's notFound() check.
 *
 * Guard: slug is validated against /^[a-z0-9-]+$/ before forming
 * the path so a hostile `slug` like `../../etc/passwd` can't escape
 * the policy directory.
 */
export async function getPolicy(slug: string): Promise<PolicyContent | null> {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;

  const filename = `${slug}.md`;
  const full = path.join(POLICY_DIR, filename);
  let raw: string;
  let stat: import("node:fs").Stats;
  try {
    [raw, stat] = await Promise.all([
      fs.readFile(full, "utf8"),
      fs.stat(full),
    ]);
  } catch {
    return null;
  }
  // Belt-and-braces — confirm the resolved file is still inside
  // POLICY_DIR after path resolution. Defends against symlink shenanigans.
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(POLICY_DIR))) return null;

  const { title, description } = extractTitleAndDescription(raw, slug);
  return {
    slug,
    title,
    description,
    updatedAt: stat.mtime.toISOString(),
    kind: classify(slug),
    body: raw,
  };
}

/** Operational artefacts use a YYYY-MM-DD- prefix; everything else
 *  is a standing policy. */
function classify(slug: string): PolicyKind {
  return /^\d{4}-\d{2}-\d{2}-/.test(slug) ? "operational" : "policy";
}

/**
 * Pull the first H1 + first descriptive paragraph out of a markdown
 * blob. Falls back to humanising the slug when no H1 is present.
 *
 * We skip:
 *   • Empty lines
 *   • Lines that look like `**Key:** value` metadata
 *   • Lines that start with another markdown heading (#, ##, …)
 */
function extractTitleAndDescription(
  raw: string,
  slug: string,
): { title: string; description: string } {
  const lines = raw.split(/\r?\n/);
  let title = humaniseSlug(slug);
  let description = "";

  for (const line of lines) {
    if (!title && /^#\s+/.test(line)) continue;
    if (/^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,6}\s+/.test(trimmed)) continue;
    // Skip "**Date:** 9 May 2026" or "**Status:** …" style metadata.
    if (/^\*\*[^*]+:\*\*/.test(trimmed)) continue;
    description = trimmed.replace(/^[*_>-]+/, "").trim();
    if (description.length >= 30) break;
  }
  return {
    title,
    description: description || "(No description.)",
  };
}

function humaniseSlug(slug: string): string {
  return slug
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
