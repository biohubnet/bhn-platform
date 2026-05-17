-- Two optional company-profile fields surfaced on /employer beside
-- the About-quote: main business line + stock ticker (for public
-- companies). Both can be auto-filled by the website-scrape AI run.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "companyMainBusiness" TEXT,
  ADD COLUMN IF NOT EXISTS "companyTicker"       TEXT;
