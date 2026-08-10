import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, type Expense } from '@geld-flow/db';
import type { CreateExpenseInput, EditExpenseInput } from '@geld-flow/shared';
import { LedgerAccessService } from '../common/ledger-access.service';
import { BadgesService } from '../badges/badges.service';
import { computeShares } from './split.util';

const EXPENSE_INCLUDE = {
  paidBy: { select: { id: true, name: true, avatarUrl: true } },
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  shares: {
    select: {
      userId: true,
      shareAmount: true,
      sharePercentage: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
} as const;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly access: LedgerAccessService,
    private readonly badges: BadgesService,
  ) {}

  private async assertParticipantsAreMembers(
    ledgerId: string,
    userIds: string[],
  ) {
    const unique = [...new Set(userIds)];
    const members = await prisma.ledgerMember.findMany({
      where: { ledgerId, userId: { in: unique } },
      select: { userId: true },
    });
    if (members.length !== unique.length) {
      throw new BadRequestException(
        'Every payer and split participant must be a member of this ledger.',
      );
    }
  }

  private async assertCanModify(expense: Expense, userId: string) {
    const membership = await this.access.assertMember(expense.ledgerId, userId);
    const canModify =
      expense.createdById === userId ||
      membership.role === 'owner' ||
      membership.role === 'admin';
    if (!canModify) {
      throw new ForbiddenException(
        'Only the person who added this expense, or a ledger admin, can change it.',
      );
    }
    return membership;
  }

  async create(userId: string, input: CreateExpenseInput) {
    await this.access.assertMember(input.ledgerId, userId);
    await this.assertParticipantsAreMembers(input.ledgerId, [
      input.paidByUserId,
      ...input.shares.map((s) => s.userId),
    ]);

    const computed = computeShares(input.amount, input.splitType, input.shares);

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          ledgerId: input.ledgerId,
          description: input.description,
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          paidByUserId: input.paidByUserId,
          splitType: input.splitType,
          category: input.category,
          createdById: userId,
          shares: {
            createMany: {
              data: computed.map((c) => ({
                userId: c.userId,
                shareAmount: c.shareAmount,
                sharePercentage: c.sharePercentage,
              })),
            },
          },
        },
        include: EXPENSE_INCLUDE,
      });

      await tx.activityEvent.create({
        data: {
          ledgerId: input.ledgerId,
          actorId: userId,
          type: 'expense_added',
          payload: {
            expenseId: created.id,
            description: created.description,
            amount: input.amount,
          },
        },
      });

      const totalCreated = await tx.expense.count({
        where: { createdById: userId },
      });
      if (totalCreated === 1) {
        await this.badges.award(tx, userId, 'first-steps');
      }

      return created;
    });

    return expense;
  }

  async edit(expenseId: string, userId: string, input: EditExpenseInput) {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found.');
    }
    await this.assertCanModify(existing, userId);

    const paidByUserId = input.paidByUserId ?? existing.paidByUserId;

    await this.assertParticipantsAreMembers(existing.ledgerId, [
      paidByUserId,
      ...input.shares.map((s) => s.userId),
    ]);

    const computed = computeShares(input.amount, input.splitType, input.shares);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseShare.deleteMany({ where: { expenseId } });
      const result = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: input.description,
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          paidByUserId,
          splitType: input.splitType,
          category: input.category,
          shares: {
            createMany: {
              data: computed.map((c) => ({
                userId: c.userId,
                shareAmount: c.shareAmount,
                sharePercentage: c.sharePercentage,
              })),
            },
          },
        },
        include: EXPENSE_INCLUDE,
      });

      await tx.activityEvent.create({
        data: {
          ledgerId: existing.ledgerId,
          actorId: userId,
          type: 'expense_edited',
          payload: {
            expenseId,
            description: result.description,
            amount: input.amount,
          },
        },
      });

      return result;
    });

    return updated;
  }

  async softDelete(expenseId: string, userId: string) {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found.');
    }
    await this.assertCanModify(existing, userId);

    await prisma.$transaction([
      prisma.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      }),
      prisma.activityEvent.create({
        data: {
          ledgerId: existing.ledgerId,
          actorId: userId,
          type: 'expense_deleted',
          payload: { expenseId, description: existing.description },
        },
      }),
    ]);

    return { id: expenseId };
  }

  async list(ledgerId: string, userId: string, page: number, pageSize: number) {
    await this.access.assertMember(ledgerId, userId);

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where: { ledgerId, deletedAt: null },
        include: EXPENSE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.expense.count({ where: { ledgerId, deletedAt: null } }),
    ]);

    return { items, total, page, pageSize };
  }
}
