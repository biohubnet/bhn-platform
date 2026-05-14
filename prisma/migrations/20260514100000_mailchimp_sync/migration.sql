-- Mailchimp-sync fields on User.
--
-- Tracks the Mailchimp-side state of each user so we can reconcile
-- DOI confirmations and inbound webhook events (unsubscribe, cleaned)
-- without re-fetching the full audience on every push.

ALTER TABLE "User"
  ADD COLUMN "mailchimpMemberId" TEXT,
  ADD COLUMN "mailchimpStatus"   TEXT,
  ADD COLUMN "mailchimpSyncedAt" TIMESTAMP(3);
