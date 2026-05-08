-- Track which deploy a changelog entry first shipped on. Stamped at
-- create time from process.env.NEXT_PUBLIC_COMMIT_SHA so admins can
-- correlate "what shipped" with "in which build". Visible only to
-- admins / superadmins on the changelog page.
ALTER TABLE "ChangeLog" ADD COLUMN "buildSha" TEXT;
