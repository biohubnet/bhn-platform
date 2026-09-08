/**
 * Topic grouping for the on-demand course catalogue.
 *
 * The catalogue lists 60+ courses across ten topics. As one flat grid
 * it reads as a wall — you have to filter before you can see what is
 * on offer. Grouped under topic headings, the same wall becomes a
 * table of contents you can skim without touching a control, which is
 * why grouping is the default rather than an option.
 *
 * Ordering is the curated one from COURSE_TOPICS, not alphabetical and
 * not by size: that list is the sequence the programme itself teaches
 * in, so "Sector/Technology Overview" leads and the specialised
 * biomanufacturing streams follow. Topics an admin typed by hand that
 * are not on the canonical list sort alphabetically after it (the live
 * data has one, "Biomanufacturing"), and anything with no topic at all
 * lands in a final bucket rather than disappearing.
 *
 * Within a group the incoming order is preserved untouched, so the
 * admin-controlled `displayOrder` from the catalogue query still
 * decides which course sits first.
 */
import { COURSE_TOPICS } from "./filters";

/** Bucket key for courses whose `topic` is null or blank. Not a topic
 *  anyone can type — the leading space keeps it out of collision range
 *  with a real value. */
export const UNGROUPED_KEY = " __ungrouped__";

/** Heading shown for that bucket. Deliberately not "Uncategorised":
 *  the label is read by trainees, and a course being untagged is an
 *  admin's bookkeeping problem, not something to announce to them. */
export const UNGROUPED_LABEL = "More courses";

export interface TopicGroup<T> {
  /** Stable React key — the raw topic string, or UNGROUPED_KEY. */
  key: string;
  /** Heading text. */
  label: string;
  items: T[];
}

const CANONICAL_RANK = new Map<string, number>(
  COURSE_TOPICS.map((topic, i) => [topic, i]),
);

/** Canonical topics keep their curated order; everything else sorts
 *  after them, with the no-topic bucket last. */
function rank(key: string): number {
  if (key === UNGROUPED_KEY) return 2_000;
  return CANONICAL_RANK.get(key) ?? 1_000;
}

export function groupByTopic<T extends { topic: string | null }>(
  items: T[],
): TopicGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.topic?.trim() || UNGROUPED_KEY;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return Array.from(buckets, ([key, groupItems]) => ({
    key,
    label: key === UNGROUPED_KEY ? UNGROUPED_LABEL : key,
    items: groupItems,
  })).sort(
    (a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label),
  );
}
