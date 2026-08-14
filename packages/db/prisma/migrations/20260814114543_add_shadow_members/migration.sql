-- AlterTable
ALTER TABLE "users" ADD COLUMN     "added_by_user_id" TEXT,
ADD COLUMN     "claim_expires_at" TIMESTAMP(3),
ADD COLUMN     "claim_token_hash" TEXT,
ADD COLUMN     "is_shadow" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_claim_token_hash_key" ON "users"("claim_token_hash");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
