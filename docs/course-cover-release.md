# Course-cover artwork — 2026-09-27

Adds 11 matching WebP illustrations and a generic fallback. Existing configured
thumbnails take priority; missing or failed images fall back to bundled artwork.
Catalogue cards, course-detail banners and instructor thumbnails share this rule.
All 62 known course codes have bundled artwork, including unpublished courses.

This is presentation-only: no course records, authentication, enrolment logic,
schema or migrations are changed. Editing controls still receive the original
database thumbnail. No dependencies were added.

## Checks

- 85 unit tests passed, including six cover-resolution/asset checks.
- TypeScript passed with `--noEmit --incremental false`.
- New and changed component/helper/test files passed ESLint, except the course
  detail page's two pre-existing unescaped-apostrophe errors (also present at base).

## Deployment boundary

The normal build runs database migrations. This release must instead use an
isolated Vercel configuration with `npm ci --ignore-scripts` for installation and
`prisma generate && next build` for the build. Its cron definitions must match
the repository configuration. Unreachable database URLs are supplied only as
build-time variables, not runtime overrides. Stage production before promotion.

The database-backed changelog registry is intentionally unchanged: publishing an
entry there can insert records, which conflicts with the requested no-database
boundary. This file is the release note instead.

Source base: `7b658a89abaa62ba783bd6cd1eb81bc89f0bf66e`.
Previous production deployment: `dpl_A1pB8zFTMf1Jf7PBKoiT81a8HFDB`.

## Topic-color correction — 2026-09-28

Replaces only four WebP assets: PW-BIO-02 and PW-BIO-04 now match the blue
biomanufacturing group; PW-RD-01 matches the magenta-purple USP/DSP group;
PW-MA-01 matches the coral Clinical Trials group. Illustrations, course grouping,
all other artwork and application code remain unchanged. Original masters and
revised PNGs are retained in the separate course-graphics preview directory.

Use the same migration-free deployment procedure above. Rollback target for
this correction: `dpl_DRcMCEborZAZoAVxpCTUQBe7SNuj`.
