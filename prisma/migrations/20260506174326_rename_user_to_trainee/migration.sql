-- Rename existing 'user' role values to 'trainee'
UPDATE "User" SET "role" = 'trainee' WHERE "role" = 'user';

-- Update default for new rows
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'trainee';
