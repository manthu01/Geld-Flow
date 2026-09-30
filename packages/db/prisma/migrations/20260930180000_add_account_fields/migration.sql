-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "default_currency" CHAR(3) NOT NULL DEFAULT 'INR',
ADD COLUMN     "deleted_at" TIMESTAMP(3);
