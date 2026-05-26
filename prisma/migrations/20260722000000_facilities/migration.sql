-- Facility — Canadian biomanufacturing companies / plants / institutes.
-- Seeded from a curated xlsx + maintained by an optional rescan tool
-- that refetches `url` via Jina Reader + asks the AI to update
-- `description` / `specialization`. See lib/facilities/seed-data.ts
-- for the initial population.

CREATE TABLE "Facility" (
  "id"             TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "url"            TEXT,
  "status"         TEXT,
  "province"       TEXT,
  "city"           TEXT,
  "address"        TEXT,
  "specialization" TEXT,
  "scale"          TEXT,
  "notes"          TEXT,
  "description"    TEXT,
  "lat"            DOUBLE PRECISION NOT NULL,
  "lng"            DOUBLE PRECISION NOT NULL,
  "lastScannedAt"  TIMESTAMP(3),
  "scanError"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Facility_name_key"     ON "Facility"("name");
CREATE INDEX        "Facility_province_idx" ON "Facility"("province");
CREATE INDEX        "Facility_city_idx"     ON "Facility"("city");
