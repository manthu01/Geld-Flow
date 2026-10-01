import { Injectable } from '@nestjs/common';
import { prisma } from '@geld-flow/db';

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

export interface FriendLedgerBreakdown {
  ledgerId: string;
  ledgerName: string | null;
  ledgerType: string;
  currency: string;
  balance: number;
}

export interface FriendRelationship {
  friend: {
    id: string;
    name: string;
    avatarUrl: string | null;
    isShadow: boolean;
  };
  breakdown: FriendLedgerBreakdown[];
}

/**
 * The Friends page's "overall relationship balance" — see
 * /problems/personal.txt. Deliberately built on the raw expense ledger,
 * not on any group's debt-simplification output: simplification picks
 * the fewest transfers for the *whole* group and may route money through
 * a third person, which would misrepresent what you specifically owe
 * one friend. This instead derives each pairwise number directly from
 * who paid and who shared each expense — the "Original Ledger" layer,
 * per the two-layer rule in /problems/group expense reduction.txt.
 */
@Injectable()
export class FriendsService {
  async getRelationships(userId: string): Promise<FriendRelationship[]> {
    const memberships = await prisma.ledgerMember.findMany({
      where: { userId },
      select: { ledgerId: true },
    });
    const ledgerIds = memberships.map((m) => m.ledgerId);
    if (ledgerIds.length === 0) return [];

    const [ledgers, allMembers, expenses, settlements] = await Promise.all([
      prisma.ledger.findMany({
        where: { id: { in: ledgerIds } },
        select: { id: true, name: true, type: true, baseCurrency: true },
      }),
      prisma.ledgerMember.findMany({
        where: { ledgerId: { in: ledgerIds } },
        select: {
          ledgerId: true,
          userId: true,
          user: {
            select: { id: true, name: true, avatarUrl: true, isShadow: true },
          },
        },
      }),
      prisma.expense.findMany({
        where: { ledgerId: { in: ledgerIds }, deletedAt: null },
        select: {
          ledgerId: true,
          paidByUserId: true,
          shares: { select: { userId: true, shareAmount: true } },
        },
      }),
      prisma.settlement.findMany({
        where: { ledgerId: { in: ledgerIds }, status: 'confirmed' },
        select: {
          ledgerId: true,
          fromUserId: true,
          toUserId: true,
          amount: true,
        },
      }),
    ]);

    const ledgerById = new Map(ledgers.map((l) => [l.id, l]));

    // pairwise.get(ledgerId)?.get(otherUserId) = "otherUser owes me" within
    // that one ledger (negative means I owe them). Only ledgers/edges that
    // actually involve `userId` are ever populated.
    const pairwise = new Map<string, Map<string, number>>();
    const bump = (ledgerId: string, otherUserId: string, delta: number) => {
      if (otherUserId === userId) return;
      let perLedger = pairwise.get(ledgerId);
      if (!perLedger) {
        perLedger = new Map();
        pairwise.set(ledgerId, perLedger);
      }
      perLedger.set(otherUserId, (perLedger.get(otherUserId) ?? 0) + delta);
    };

    for (const expense of expenses) {
      if (expense.paidByUserId === userId) {
        for (const share of expense.shares) {
          if (share.userId === userId) continue;
          bump(expense.ledgerId, share.userId, toNumber(share.shareAmount));
        }
      } else {
        const mine = expense.shares.find((s) => s.userId === userId);
        if (mine) {
          bump(
            expense.ledgerId,
            expense.paidByUserId,
            -toNumber(mine.shareAmount),
          );
        }
      }
    }
    for (const s of settlements) {
      const amount = toNumber(s.amount);
      if (s.fromUserId === userId) {
        bump(s.ledgerId, s.toUserId, amount);
      } else if (s.toUserId === userId) {
        bump(s.ledgerId, s.fromUserId, -amount);
      }
    }

    // Every other real/shadow member sharing at least one ledger with this
    // user counts as a "friend", even at a settled (zero) balance — same
    // convention as the Groups page, which shows settled groups too.
    const friendsById = new Map<
      string,
      { id: string; name: string; avatarUrl: string | null; isShadow: boolean }
    >();
    for (const m of allMembers) {
      if (m.userId === userId) continue;
      friendsById.set(m.userId, m.user);
    }

    // No `overallBalance` here: ledgers can be in different currencies
    // (rare, but possible from before INR became the default), and naively
    // adding mismatched currencies together would be meaningless. Summing
    // the breakdown into one number is a display concern — the web client
    // does it after converting each line with the same fixed-rate table
    // the Account page's currency preference already uses.
    const results: FriendRelationship[] = [];
    for (const friend of friendsById.values()) {
      const breakdown: FriendLedgerBreakdown[] = [];
      for (const [ledgerId, perLedger] of pairwise.entries()) {
        const amount = perLedger.get(friend.id);
        if (amount === undefined) continue;
        const ledger = ledgerById.get(ledgerId);
        if (!ledger) continue;
        breakdown.push({
          ledgerId,
          ledgerName: ledger.name,
          ledgerType: ledger.type,
          currency: ledger.baseCurrency,
          balance: Math.round(amount * 100) / 100,
        });
      }
      results.push({ friend, breakdown });
    }

    return results.sort((a, b) => a.friend.name.localeCompare(b.friend.name));
  }
}
