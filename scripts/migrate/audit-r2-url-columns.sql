-- Find every column in the database that stores a Cloudflare R2 URL.
--
-- Run against the LIVE database before a bucket/account migration to (a) prove
-- you know every place file URLs live, and (b) if you ever take the "rewrite
-- URLs" path (instead of R2_LEGACY_PUBLIC_URLS), know exactly which columns to
-- UPDATE. Read-only — it only SELECTs.
--
--   psql "$DATABASE_URL" -f scripts/migrate/audit-r2-url-columns.sql
--
-- Adjust the pattern below if your R2_PUBLIC_URL uses a custom domain — add it
-- as another ILIKE branch.

DO $$
DECLARE
  r        RECORD;
  n        BIGINT;
  pattern  TEXT := '%r2.dev/%';        -- default R2 dev host
  pattern2 TEXT := '%r2.cloudflarestorage.com/%';
  -- pattern3 TEXT := '%files.biohubnet.ca/%';  -- uncomment + edit if custom domain
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS r2_url_columns (
    table_name TEXT, column_name TEXT, hits BIGINT
  ) ON COMMIT DROP;

  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I ILIKE $1 OR %I ILIKE $2',
      r.table_schema, r.table_name, r.column_name, r.column_name
    ) INTO n USING pattern, pattern2;

    IF n > 0 THEN
      INSERT INTO r2_url_columns VALUES (r.table_name, r.column_name, n);
    END IF;
  END LOOP;

  RAISE NOTICE 'Columns containing R2 URLs:';
  FOR r IN SELECT * FROM r2_url_columns ORDER BY hits DESC LOOP
    RAISE NOTICE '  %.% — % row(s)', r.table_name, r.column_name, r.hits;
  END LOOP;
END $$;
