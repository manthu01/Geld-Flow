import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminService {
  constructor(private readonly authService: AuthService) {}

  async getStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      userCount,
      newUsersLast7Days,
      personalLedgerCount,
      groupLedgerCount,
      expenseAggregate,
      settlementCount,
      confirmedSettlementCount,
    ] = await Promise.all([
      prisma.user.count({ where: { isShadow: false } }),
      prisma.user.count({
        where: { isShadow: false, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.ledger.count({ where: { type: 'personal' } }),
      prisma.ledger.count({
        where: {
          type: { in: ['group_general', 'group_travel', 'group_event'] },
        },
      }),
      prisma.expense.aggregate({
        where: { deletedAt: null },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.settlement.count(),
      prisma.settlement.count({ where: { status: 'confirmed' } }),
    ]);

    return {
      userCount,
      newUsersLast7Days,
      personalLedgerCount,
      groupLedgerCount,
      expenseCount: expenseAggregate._count,
      totalExpenseVolume: expenseAggregate._sum.amount?.toString() ?? '0',
      settlementCount,
      confirmedSettlementCount,
    };
  }

  async listUsers() {
    const users = await prisma.user.findMany({
      where: { isShadow: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    // Never send the hash itself — just whether one's set, so the admin
    // knows a Google-only account can't take a password reset from here
    // without them signing in with Google first.
    return users.map(({ passwordHash, ...rest }) => ({
      ...rest,
      hasPassword: passwordHash !== null,
    }));
  }

  async setUserPassword(userId: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('No such user.');
    }
    await this.authService.adminSetPassword(userId, newPassword);
  }
}
