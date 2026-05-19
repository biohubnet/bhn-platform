-- First-login "split a cell" gamified ritual — completion flag.
-- Trainee + evaluating users with this still false get redirected
-- from /dashboard to /welcome/split-a-cell on first arrival.
-- Admins can replay at any time via /welcome/split-a-cell?replay=1
-- (and the replay path doesn't write the flag).

ALTER TABLE "User"
  ADD COLUMN "hasSplitCell" BOOLEAN NOT NULL DEFAULT false;
