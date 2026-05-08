-- Bearer-token magic link for sandbox + demo accounts. The token is
-- only ever populated for accountKind != 'real' so a leak doesn't
-- expose real-user accounts. See src/lib/sandbox/seed.ts and
-- src/app/sandbox/[token]/route.ts.
ALTER TABLE "User" ADD COLUMN "magicToken" TEXT;
CREATE UNIQUE INDEX "User_magicToken_key" ON "User"("magicToken");
