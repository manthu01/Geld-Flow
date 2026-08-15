-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT;

-- Backfill existing rows from the email's local part before the column
-- becomes required — lowercased, invalid characters stripped, forced to
-- start with a letter, and de-duplicated with a numeric suffix.
UPDATE "users" u
SET "username" = sub.candidate
FROM (
  SELECT id,
         CASE
           WHEN row_number() OVER (PARTITION BY base ORDER BY created_at) = 1 THEN base
           ELSE base || (row_number() OVER (PARTITION BY base ORDER BY created_at) - 1)::text
         END AS candidate
  FROM (
    SELECT id, created_at,
           CASE WHEN cleaned ~ '^[a-z]' THEN cleaned ELSE 'u' || cleaned END AS base
    FROM (
      SELECT id, created_at,
             COALESCE(
               NULLIF(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
               'user'
             ) AS cleaned
      FROM "users"
    ) t1
  ) t2
) sub
WHERE u.id = sub.id;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
