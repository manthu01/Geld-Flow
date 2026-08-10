import { BadRequestException } from '@nestjs/common';
import type { CreateExpenseInput } from '@geld-flow/shared';

export interface ComputedShare {
  userId: string;
  shareAmount: number;
  sharePercentage: number | null;
}

const CENTS_TOLERANCE = 1; // 1 cent, to absorb float input rounding

/**
 * Turns a split request into concrete per-user amounts, computed once
 * here and stored — never re-derived from splitType on read (see the
 * ExpenseShare model comment). Works in integer cents throughout so the
 * shares always sum to exactly the expense total, with no float drift.
 */
export function computeShares(
  amount: number,
  splitType: CreateExpenseInput['splitType'],
  shares: CreateExpenseInput['shares'],
): ComputedShare[] {
  const totalCents = Math.round(amount * 100);

  if (splitType === 'equal') {
    const n = shares.length;
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    return shares.map((s, i) => ({
      userId: s.userId,
      shareAmount: (base + (i < remainder ? 1 : 0)) / 100,
      sharePercentage: null,
    }));
  }

  if (splitType === 'exact') {
    const shareCents = shares.map((s) => Math.round((s.amount ?? 0) * 100));
    const sum = shareCents.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - totalCents) > CENTS_TOLERANCE) {
      throw new BadRequestException(
        'Exact shares must add up to the expense total.',
      );
    }
    return shares.map((s, i) => ({
      userId: s.userId,
      shareAmount: shareCents[i] / 100,
      sharePercentage: null,
    }));
  }

  // percentage
  const percentages = shares.map((s) => s.percentage ?? 0);
  const percentageSum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(percentageSum - 100) > 0.01) {
    throw new BadRequestException('Percentage shares must add up to 100.');
  }

  let allocated = 0;
  const cents = percentages.map((pct, i) => {
    if (i === shares.length - 1) {
      return totalCents - allocated; // last share absorbs the rounding remainder
    }
    const c = Math.round((totalCents * pct) / 100);
    allocated += c;
    return c;
  });

  return shares.map((s, i) => ({
    userId: s.userId,
    shareAmount: cents[i] / 100,
    sharePercentage: percentages[i],
  }));
}
