import { Injectable } from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import { LedgerAccessService } from '../common/ledger-access.service';

export interface MemberBalance {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Positive: this ledger owes them net. Negative: they owe this ledger net. */
  netBalance: number;
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

@Injectable()
export class BalancesService {
  constructor(private readonly access: LedgerAccessService) {}

  /**
   * Net balance per member, computed strictly within this one ledger.
   * Never joins or sums across ledgers — see the ledger-isolation rule
   * in the schema's design notes. Assumes a single currency per ledger
   * (no FX conversion in Phase 1).
   */
  async getBalances(
    ledgerId: string,
    userId: string,
  ): Promise<MemberBalance[]> {
    await this.access.assertMember(ledgerId, userId);

    const [members, credits, debits, settlements] = await Promise.all([
      prisma.ledgerMember.findMany({
        where: { ledgerId },
        select: {
          userId: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      }),
      prisma.expense.groupBy({
        by: ['paidByUserId'],
        where: { ledgerId, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.expenseShare.groupBy({
        by: ['userId'],
        where: { expense: { ledgerId, deletedAt: null } },
        _sum: { shareAmount: true },
      }),
      prisma.settlement.findMany({
        where: { ledgerId, status: 'confirmed' },
        select: { fromUserId: true, toUserId: true, amount: true },
      }),
    ]);

    const net = new Map<string, number>(members.map((m) => [m.userId, 0]));

    for (const c of credits) {
      net.set(
        c.paidByUserId,
        (net.get(c.paidByUserId) ?? 0) + toNumber(c._sum.amount),
      );
    }
    for (const d of debits) {
      net.set(
        d.userId,
        (net.get(d.userId) ?? 0) - toNumber(d._sum.shareAmount),
      );
    }
    for (const s of settlements) {
      const amount = toNumber(s.amount);
      // fromUser paid toUser: fromUser's debt shrinks, toUser's credit shrinks.
      net.set(s.fromUserId, (net.get(s.fromUserId) ?? 0) + amount);
      net.set(s.toUserId, (net.get(s.toUserId) ?? 0) - amount);
    }

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      netBalance: Math.round((net.get(m.userId) ?? 0) * 100) / 100,
    }));
  }

  /**
   * This user's own net balance in every group ledger they're in, for the
   * Groups page's All/You-owe/Owed-to-you filter. The mirror image of
   * getBalances above (one user across many ledgers instead of one
   * ledger across many members) — same 4-query shape, still never sums
   * across ledgers, just keyed by ledgerId instead of userId.
   */
  async getMyGroupBalances(userId: string): Promise<Record<string, number>> {
    const memberships = await prisma.ledgerMember.findMany({
      where: { userId, ledger: { type: { not: 'personal' } } },
      select: { ledgerId: true },
    });
    const ledgerIds = memberships.map((m) => m.ledgerId);
    if (ledgerIds.length === 0) return {};

    const [credits, shares, settlements] = await Promise.all([
      prisma.expense.groupBy({
        by: ['ledgerId'],
        where: {
          paidByUserId: userId,
          deletedAt: null,
          ledgerId: { in: ledgerIds },
        },
        _sum: { amount: true },
      }),
      prisma.expenseShare.findMany({
        where: {
          userId,
          expense: { deletedAt: null, ledgerId: { in: ledgerIds } },
        },
        select: { shareAmount: true, expense: { select: { ledgerId: true } } },
      }),
      prisma.settlement.findMany({
        where: {
          status: 'confirmed',
          ledgerId: { in: ledgerIds },
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        select: {
          ledgerId: true,
          fromUserId: true,
          toUserId: true,
          amount: true,
        },
      }),
    ]);

    const net = new Map<string, number>(ledgerIds.map((id) => [id, 0]));

    for (const c of credits) {
      net.set(c.ledgerId, (net.get(c.ledgerId) ?? 0) + toNumber(c._sum.amount));
    }
    for (const s of shares) {
      const ledgerId = s.expense.ledgerId;
      net.set(ledgerId, (net.get(ledgerId) ?? 0) - toNumber(s.shareAmount));
    }
    for (const s of settlements) {
      const amount = toNumber(s.amount);
      if (s.fromUserId === userId) {
        net.set(s.ledgerId, (net.get(s.ledgerId) ?? 0) + amount);
      }
      if (s.toUserId === userId) {
        net.set(s.ledgerId, (net.get(s.ledgerId) ?? 0) - amount);
      }
    }

    return Object.fromEntries(
      [...net.entries()].map(([id, n]) => [id, Math.round(n * 100) / 100]),
    );
  }
}
