/**
 * Registry of every editable copy string on the platform.
 *
 * Each entry declares a stable `key` (used as the row id in
 * EditableCopy), the code-default text, and metadata that helps
 * `/admin/copy` group + describe the strings for the editor.
 *
 * Adding a new editable string:
 *   1. Append a `CopyEntry` to COPY_REGISTRY below.
 *   2. In the page, replace the hard-coded string with:
 *        <EditableText copyKey="…" defaultText="…" isStaff={isStaff} />
 *      passing the *server-resolved* value as `defaultText`
 *      (i.e. `await getCopy("…", "default")`).
 *   3. The string immediately appears in /admin/copy.
 *
 * Why a registry at all? An admin needs to know what's editable
 * without crawling the codebase, and the editor page wants a complete
 * list including strings whose override row doesn't yet exist. The
 * registry is the closed catalogue; the DB rows are sparse overrides.
 */

export interface CopyEntry {
  /** Stable identifier — never rename, this becomes the DB PK. */
  key: string;
  /** Where the string appears (page-level grouping in /admin/copy). */
  scope: string;
  /** One-line label for the editor. */
  label: string;
  /** Detail line — describes context + a hint about length/tone. */
  description: string;
  /** Code-default rendered when the override row is absent. */
  defaultText: string;
  /** Hint for the editor — does this string typically wrap multiple lines? */
  multiline?: boolean;
}

export const COPY_REGISTRY: CopyEntry[] = [
  // ── /courses ──
  {
    key: "courses.subtitle",
    scope: "Catalog · /courses",
    label: "Catalog page subtitle",
    description: "One-line description shown below the page title on /courses. Sets the framing for the whole catalog.",
    defaultText: "Self-paced modules, SCORM-backed simulations, and instructor-led series — all in one library. Filter by topic, delivery, provider, or run a search.",
    multiline: true,
  },

  // ── /events (signed-out + signed-in marketing chrome) ──
  {
    key: "events.indexHeader.title",
    scope: "Events · /events",
    label: "Events index — headline",
    description: "Top-of-page headline on /events. Short and editorial.",
    defaultText: "Symposium, Training Week & more",
  },
  {
    key: "events.indexHeader.intro",
    scope: "Events · /events",
    label: "Events index — intro paragraph",
    description: "Paragraph below the headline. Two to three sentences explaining what BHN events are.",
    defaultText: "The BioHubNet Annual Symposium + Training Week is the flagship gathering for biomanufacturing trainees, faculty, and industry partners across Canada. Browse upcoming editions below and register from the event page.",
    multiline: true,
  },

  // ── /rewards ──
  {
    key: "rewards.heroTitle",
    scope: "Rewards · /rewards",
    label: "Rewards hero — title",
    description: "Big headline at the top of /rewards. Should sound like a promise.",
    defaultText: "Train hard. Earn the gear.",
  },
  {
    key: "rewards.heroBody",
    scope: "Rewards · /rewards",
    label: "Rewards hero — body",
    description: "Paragraph under the headline. Explains the loyalty mechanic in plain language.",
    defaultText: "Every credit you spend on coursework counts toward milestone rewards. Pickup at Leslie Dan Faculty of Pharmacy, U of T — or request mailing in the claim form.",
    multiline: true,
  },

  // ── /pathways ──
  {
    key: "pathways.subtitle",
    scope: "Pathways · /pathways",
    label: "Pathways page subtitle",
    description: "One-line description on /pathways. Reads as the framing for the whole list.",
    defaultText: "Stack of courses that ladder up to a single certificate, plus open registrations for live programmes. Pick something to build toward.",
    multiline: true,
  },

];

export function getCopyEntry(key: string): CopyEntry | undefined {
  return COPY_REGISTRY.find((e) => e.key === key);
}

export function getCopyEntriesByScope(): Record<string, CopyEntry[]> {
  const out: Record<string, CopyEntry[]> = {};
  for (const e of COPY_REGISTRY) {
    if (!out[e.scope]) out[e.scope] = [];
    out[e.scope].push(e);
  }
  return out;
}
