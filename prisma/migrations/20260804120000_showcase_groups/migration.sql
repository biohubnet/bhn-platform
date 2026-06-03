-- Showcase groups: named, slug-addressed graduate showcases. Each group
-- has its own public no-login submission link at /showcase/<slug>.

CREATE TABLE "ShowcaseGroup" (
    "id"          TEXT         NOT NULL,
    "slug"        TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "eyebrow"     TEXT,
    "intro"       TEXT,
    "active"      BOOLEAN      NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowcaseGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShowcaseGroup_slug_key" ON "ShowcaseGroup" ("slug");
CREATE INDEX "ShowcaseGroup_createdAt_idx" ON "ShowcaseGroup" ("createdAt");

-- Seed the existing Regulatory Affairs program so it appears in the admin
-- group manager (and its submissions count). Its public page stays the
-- hand-built static route /showcase/regulatory-affairs (static segments
-- win over the [slug] route), so this row is purely for management.
INSERT INTO "ShowcaseGroup" ("id", "slug", "name", "eyebrow", "intro", "active", "createdAt", "updatedAt")
VALUES (
    'seed_showcase_regaffairs',
    'regulatory-affairs',
    'Graduate Showcase',
    'Learning Pathway · Regulatory Affairs',
    'Done the pathway? Drop your name, LinkedIn handle, and a headshot, and we''ll feature you alongside the other graduates. No login needed.',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
