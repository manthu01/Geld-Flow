-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'expense_deletion_requested';
ALTER TYPE "ActivityEventType" ADD VALUE 'expense_deletion_approved';
ALTER TYPE "ActivityEventType" ADD VALUE 'expense_deletion_rejected';

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('active', 'deletion_requested', 'cancelled');

-- CreateEnum
CREATE TYPE "ExpenseActionType" AS ENUM ('delete');

-- CreateEnum
CREATE TYPE "ExpenseActionRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "expense_action_requests" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "action_type" "ExpenseActionType" NOT NULL,
    "status" "ExpenseActionRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "expense_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_action_approvals" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_action_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_action_approvals_request_id_user_id_key" ON "expense_action_approvals"("request_id", "user_id");

-- AddForeignKey
ALTER TABLE "expense_action_requests" ADD CONSTRAINT "expense_action_requests_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_requests" ADD CONSTRAINT "expense_action_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_approvals" ADD CONSTRAINT "expense_action_approvals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "expense_action_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_approvals" ADD CONSTRAINT "expense_action_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
