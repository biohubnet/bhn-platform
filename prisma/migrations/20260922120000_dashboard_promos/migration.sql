-- Dashboard promos: the "What's on" band at the top of /dashboard, under
-- the hero. One row per card; kind is a commented String
-- (event | workshop | announcement), status is draft | published — no
-- Prisma enums. Dates are calendar days (DATE), so a card's last day
-- means the same day in every timezone.

CREATE TABLE "DashboardPromo" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "location" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "showUntil" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPromo_pkey" PRIMARY KEY ("id")
);

-- The dashboard reads "published cards, by kind, in display order".
CREATE INDEX "DashboardPromo_status_kind_displayOrder_idx" ON "DashboardPromo"("status", "kind", "displayOrder");

-- Starting content, drafted from the 2026 Symposium & Training Week
-- comms plan. Stable ids + ON CONFLICT so a replay never duplicates, and
-- a card an admin deletes stays deleted (migrations run once).
INSERT INTO "DashboardPromo" ("id", "kind", "title", "summary", "startDate", "endDate", "location", "ctaLabel", "ctaHref", "showUntil", "status", "displayOrder", "createdAt", "updatedAt")
VALUES
    ('seed_promo_training_week', 'event', 'Training Week 2026',
     'Three days of hands-on workshops, bootcamps and industry site tours with BioHubNet''s partners.',
     '2026-10-26', '2026-10-28', 'Toronto and partner sites', 'Register', '/events/2026-training-week', NULL, 'published', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_symposium', 'event', 'Annual Symposium 2026',
     'One day, the whole network in one room: industry panels, speed networking and the pitch competition.',
     '2026-10-29', NULL, 'Chelsea Hotel, Toronto', 'Register', '/events/2026-annual-symposium', NULL, 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_obio_bootcamp', 'workshop', 'OBIO Entrepreneurship Bootcamp',
     'An intensive for trainee-led life-sciences ventures at the pre-seed stage. It opens Training Week.',
     '2026-10-26', NULL, NULL, 'See Training Week', '/events/2026-training-week', NULL, 'published', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_biozone_bioreactor', 'workshop', 'BioZone Bioreactor Workshop',
     'Run a bench-scale bioreactor in BioZone''s lab. Small groups, during Training Week (October 27 to 28).',
     NULL, NULL, 'BioZone, University of Toronto', 'See Training Week', '/events/2026-training-week', '2026-10-28', 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_cdmo_tours', 'workshop', 'OmniaBio and Eurofins CDMO tours',
     'Full-day visits to OmniaBio''s GMP cell-therapy site in Hamilton and Eurofins CDMO Alphora in Mississauga.',
     '2026-10-28', NULL, 'Hamilton and Mississauga', 'See Training Week', '/events/2026-training-week', NULL, 'published', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_register_by', 'announcement', 'Register by October 22',
     'Registration closes around October 22 so we can confirm catering. Trainee tickets are $20.',
     NULL, NULL, NULL, 'Register now', '/events/2026-annual-symposium', '2026-10-22', 'published', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_promo_pathway_badges', 'announcement', 'Every Learning Pathway now has a badge',
     'The six Learning Pathways now show their official BioHubNet badges. Find the one that fits your next step.',
     NULL, NULL, NULL, 'Browse pathways', '/pathways', '2026-10-31', 'published', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
