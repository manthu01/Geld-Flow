-- AlterTable
ALTER TABLE "ledgers" ADD COLUMN     "personal_user_a_id" TEXT,
ADD COLUMN     "personal_user_b_id" TEXT;

-- Caps personal ledgers at one per unordered user pair. Partial (WHERE
-- clause) unique indexes can't be expressed in the Prisma schema DSL, so
-- this is hand-added raw SQL rather than something `prisma migrate dev`
-- would regenerate on its own.
CREATE UNIQUE INDEX "ledgers_personal_pair_key"
  ON "ledgers" ("personal_user_a_id", "personal_user_b_id")
  WHERE "type" = 'personal';
