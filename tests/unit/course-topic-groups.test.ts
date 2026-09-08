import { test, expect } from "@playwright/test";
import {
  groupByTopic, UNGROUPED_KEY, UNGROUPED_LABEL,
} from "../../src/lib/courses/group";
import { COURSE_TOPICS } from "../../src/lib/courses/filters";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * groupByTopic decides the reading order of the on-demand catalogue —
 * the first thing a trainee sees on /courses. The two properties worth
 * pinning are that the curated topic order survives (it is not
 * alphabetical, and a sort that quietly became alphabetical would look
 * plausible), and that nothing falls out of the list: a course with a
 * blank or hand-typed topic must still appear somewhere.
 */

interface Row { id: string; topic: string | null }
const row = (id: string, topic: string | null): Row => ({ id, topic });

test("groups courses under their own topic", () => {
  const groups = groupByTopic([
    row("a", "Clinical Trials"),
    row("b", "Career Insights"),
    row("c", "Clinical Trials"),
  ]);
  expect(groups.map((g) => g.label)).toEqual(["Career Insights", "Clinical Trials"]);
  expect(groups[1].items.map((r) => r.id)).toEqual(["a", "c"]);
});

test("follows the curated COURSE_TOPICS order, not alphabetical", () => {
  // Reversed input; the canonical list leads with Sector/Technology
  // Overview and ends with the biomanufacturing streams.
  const groups = groupByTopic([...COURSE_TOPICS].reverse().map((t, i) => row(`c${i}`, t)));
  expect(groups.map((g) => g.label)).toEqual([...COURSE_TOPICS]);
  // Guard against the sort collapsing to alphabetical, which would put
  // "Biomanufacturing - General" first rather than the overview.
  expect(groups[0].label).toBe("Sector/Technology Overview");
});

test("sorts an off-list topic after every canonical one", () => {
  // The live data has exactly this case: a hand-typed "Biomanufacturing"
  // alongside the canonical "Biomanufacturing - General".
  const groups = groupByTopic([
    row("x", "Biomanufacturing"),
    row("y", "Career Insights"),
  ]);
  expect(groups.map((g) => g.label)).toEqual(["Career Insights", "Biomanufacturing"]);
});

test("off-list topics sort alphabetically among themselves", () => {
  const groups = groupByTopic([
    row("x", "Zebrafish Handling"),
    row("y", "Aseptic Robotics"),
  ]);
  expect(groups.map((g) => g.label)).toEqual(["Aseptic Robotics", "Zebrafish Handling"]);
});

test("courses with no topic land in a final bucket rather than vanishing", () => {
  const groups = groupByTopic([
    row("x", null),
    row("y", "   "),
    row("z", "Career Insights"),
  ]);
  expect(groups.map((g) => g.label)).toEqual(["Career Insights", UNGROUPED_LABEL]);
  expect(groups[1].key).toBe(UNGROUPED_KEY);
  expect(groups[1].items.map((r) => r.id)).toEqual(["x", "y"]);
});

test("keeps every course exactly once", () => {
  const rows = [
    row("a", "Clinical Trials"), row("b", null), row("c", "Made up"),
    row("d", "Career Insights"), row("e", "Clinical Trials"),
  ];
  const seen = groupByTopic(rows).flatMap((g) => g.items.map((r) => r.id));
  expect(seen.sort()).toEqual(["a", "b", "c", "d", "e"]);
});

test("preserves the incoming displayOrder inside a group", () => {
  const groups = groupByTopic([
    row("third", "Clinical Trials"),
    row("first", "Clinical Trials"),
    row("second", "Clinical Trials"),
  ]);
  expect(groups[0].items.map((r) => r.id)).toEqual(["third", "first", "second"]);
});

test("an empty catalogue produces no groups", () => {
  expect(groupByTopic([])).toEqual([]);
});

test("the catalogue no longer offers a trainee-facing Specials filter", () => {
  // The toggle was removed on purpose; `isSpecial` stays on the model
  // for admins. This guards the removal from being re-added by a revert
  // of the filter panel.
  const src = readFileSync(
    join(__dirname, "../../src/components/lms/CourseFilters.tsx"),
    "utf8",
  );
  // Matched on code, not prose: the file header still explains why the
  // toggle went, and that sentence naturally contains its old label.
  expect(src).not.toContain("toggleSpecial");
  expect(src).not.toContain("selected.special");
  expect(src).not.toContain("Special programs &amp;");
});
