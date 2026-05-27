-- User.preferredName — how the user wants to be addressed in greetings
-- ("Welcome back, X."). Independent from `name` (legal/full name) so
-- users can be greeted by first name, first + middle, Dr./Mr./Mrs./
-- Prof. + last, or any custom string without changing how their name
-- appears in records, certificates, or emails. Null until set;
-- greeting falls back to `name` in that case.

ALTER TABLE "User" ADD COLUMN "preferredName" TEXT;
