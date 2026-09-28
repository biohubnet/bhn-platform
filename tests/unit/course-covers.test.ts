import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COURSE_COVER_CODES, DEFAULT_COURSE_COVER, getCourseCoverSources } from "../../src/lib/courses/cover";

test("preserves a configured thumbnail before bundled fallback artwork", () => {
  expect(getCourseCoverSources({ thumbnail: "https://example.org/custom.webp", code: "PW-BIO-01" }))
    .toEqual(["https://example.org/custom.webp", "/course-covers/pw-bio-01.webp", DEFAULT_COURSE_COVER]);
});

test("missing and whitespace-only thumbnails resolve by normalized code", () => {
  for (const thumbnail of [null, undefined, "", "   "]) {
    expect(getCourseCoverSources({ thumbnail, code: " pw-bio-01 " })[0])
      .toBe("/course-covers/pw-bio-01.webp");
  }
});

test("unknown or missing course codes always have a generic graphic", () => {
  for (const code of [null, undefined, "", "NEW-COURSE", "../../private"]) {
    expect(getCourseCoverSources({ code })).toEqual([DEFAULT_COURSE_COVER]);
  }
});

test("fallback candidates are unique and terminate at the bundled generic image", () => {
  expect(getCourseCoverSources({ code: "PW-MA-01", thumbnail: "/course-covers/pw-ma-01.webp" }))
    .toEqual(["/course-covers/pw-ma-01.webp", DEFAULT_COURSE_COVER]);
  expect(getCourseCoverSources({ thumbnail: DEFAULT_COURSE_COVER }))
    .toEqual([DEFAULT_COURSE_COVER]);
  const sources = getCourseCoverSources({ code: "PW-QA-01", thumbnail: "/broken.webp" });
  const failed = new Set<string>();
  for (const expected of sources) {
    expect(sources.find((src) => !failed.has(src))).toBe(expected);
    failed.add(expected);
  }
  expect(sources.find((src) => !failed.has(src))).toBeUndefined();
});

test("all 62 known course covers and the default exist as WebP files", () => {
  expect(COURSE_COVER_CODES).toHaveLength(62);
  expect(new Set(COURSE_COVER_CODES).size).toBe(62);
  for (const code of COURSE_COVER_CODES) {
    const source = getCourseCoverSources({ code })[0];
    expect(existsSync(join(__dirname, "../../public", source))).toBe(true);
    const bytes = readFileSync(join(__dirname, "../../public", source));
    expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
  }
  expect(existsSync(join(__dirname, "../../public", DEFAULT_COURSE_COVER))).toBe(true);
});

test("image display never replaces the raw thumbnail given to editing controls", () => {
  const detail = readFileSync(join(__dirname, "../../src/app/(dashboard)/courses/[id]/page.tsx"), "utf8");
  expect(detail).toContain("currentUrl={course.thumbnail}");
  expect(detail).toContain("thumbnail: course.thumbnail");
  for (const file of [
    "src/components/lms/CourseCard.tsx",
    "src/app/(dashboard)/courses/[id]/page.tsx",
    "src/components/dashboards/InstructorDashboard.tsx",
  ]) {
    expect(readFileSync(join(__dirname, "../..", file), "utf8")).toContain("<CourseCover");
  }
});
