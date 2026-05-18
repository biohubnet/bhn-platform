-- Opportunity deadlines — single polymorphic table that surfaces
-- "deadline-driven" cards on the trainee dashboard's WE ARE
-- DEADLINE-DRIVEN section for content that doesn't have its own
-- dedicated model. Covers Knowledge Exchange rounds, Mobility
-- Award windows, and admin-curated Engage highlights (special
-- workshops, featured pathways).
--
-- `kind`   = source discriminator ("knowledge_exchange",
--            "mobility_award", "engage_highlight", or a future
--            kind — plain TEXT so adding a new one is code-only)
-- `pillar` = dashboard column ("engage" | "experience" | "equip"
--            | "events")
-- `status` = "active" | "closed" | "full" — closed/full items
--            still render with a status pill so trainees see the
--            cycle exists.

CREATE TABLE "OpportunityDeadline" (
  "id"            TEXT PRIMARY KEY,
  "kind"          TEXT NOT NULL,
  "pillar"        TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "blurb"         TEXT,
  "opensAt"       TIMESTAMP(3),
  "deadlineAt"    TIMESTAMP(3),
  "status"        TEXT NOT NULL DEFAULT 'active',
  "ctaUrl"        TEXT,
  "ctaLabel"      TEXT,
  "pillText"      TEXT,
  "displayOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL
);

CREATE INDEX "OpportunityDeadline_pillar_status_displayOrder_idx"
  ON "OpportunityDeadline"("pillar", "status", "displayOrder");
CREATE INDEX "OpportunityDeadline_deadlineAt_idx"
  ON "OpportunityDeadline"("deadlineAt");
CREATE INDEX "OpportunityDeadline_kind_idx"
  ON "OpportunityDeadline"("kind");
