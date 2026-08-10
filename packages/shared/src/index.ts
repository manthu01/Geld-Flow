import { z } from "zod";

/**
 * Auth. Shared so the login form and the API validate email addresses
 * with the exact same rule.
 */
export const requestMagicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/**
 * Enums mirrored from packages/db/prisma/schema.prisma.
 * Kept here (not imported from @prisma/client) so apps/web never needs
 * the Prisma client in its bundle — only apps/api touches the database.
 */

export const LEDGER_TYPES = [
  "group_general",
  "group_travel",
  "group_event",
  "personal",
] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const LEDGER_ROLES = ["owner", "admin", "member"] as const;
export type LedgerRole = (typeof LEDGER_ROLES)[number];

export const SPLIT_TYPES = ["equal", "percentage", "exact"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export const SETTLEMENT_STATUSES = ["pending", "confirmed", "declined"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const ACTIVITY_EVENT_TYPES = [
  "expense_added",
  "expense_edited",
  "expense_deleted",
  "settlement_requested",
  "settlement_confirmed",
  "settlement_declined",
  "member_joined",
  "member_left",
  "checklist_item_added",
  "checklist_item_completed",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const RANKS = ["I", "II", "III", "IV", "V"] as const;
export type Rank = (typeof RANKS)[number];

/**
 * Shared validation contracts. The web client and the api DTOs both
 * parse against these, so a rule only needs to change in one place.
 */

export const createLedgerSchema = z.object({
  type: z.enum(LEDGER_TYPES),
  name: z.string().min(1).max(80).optional(),
  baseCurrency: z.string().length(3),
});
export type CreateLedgerInput = z.infer<typeof createLedgerSchema>;

const expenseShareInput = z.object({
  userId: z.string().uuid(),
  // Present for split_type "exact" or "percentage"; equal splits omit it
  // and the server derives even shares from the participant list.
  amount: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
});

const expenseObjectSchema = z.object({
  ledgerId: z.string().uuid(),
  description: z.string().min(1).max(140),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paidByUserId: z.string().uuid(),
  splitType: z.enum(SPLIT_TYPES),
  category: z.string().max(40).optional(),
  shares: z.array(expenseShareInput).min(1),
});

function refineSplitShares<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (val: z.infer<typeof expenseObjectSchema>) =>
        val.splitType !== "exact" ||
        val.shares.every((s) => typeof s.amount === "number"),
      { message: "Exact splits require an amount on every share." },
    )
    .refine(
      (val: z.infer<typeof expenseObjectSchema>) =>
        val.splitType !== "percentage" ||
        val.shares.every((s) => typeof s.percentage === "number"),
      { message: "Percentage splits require a percentage on every share." },
    );
}

export const createExpenseSchema = refineSplitShares(expenseObjectSchema);
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const editExpenseSchema = refineSplitShares(
  expenseObjectSchema.partial({ ledgerId: true, paidByUserId: true }),
);
export type EditExpenseInput = z.infer<typeof editExpenseSchema>;
