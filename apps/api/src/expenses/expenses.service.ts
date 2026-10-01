import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Prisma, type Expense } from '@geld-flow/db';
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

type ExpenseWithIncludes = Prisma.ExpenseGetPayload<{
  include: typeof EXPENSE_INCLUDE;
}>;

export interface PendingDeletionView {
  requestId: string;
  requestedBy: { id: string; name: string };
  createdAt: Date;
  requiredApprovers: {
    userId: string;
    name: string;
    responded: boolean;
    approved: boolean | null;
  }[];
}

function toNumber(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value);
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly access: LedgerAccessService,
    private readonly badges: BadgesService,
  ) {}

  /**
   * Attaches each expense's pending deletion request (if any), with the
   * live-derived set of required approvers — everyone with a non-zero
   * share except the requester — so the frontend never has to do that
   * set math itself. Batched: one query regardless of page size.
   */
  private async attachPendingDeletions(
    expenses: ExpenseWithIncludes[],
  ): Promise<
    (ExpenseWithIncludes & { pendingDeletion: PendingDeletionView | null })[]
  > {
    const ids = expenses.map((e) => e.id);
    if (ids.length === 0) return [];

    const requests = await prisma.expenseActionRequest.findMany({
      where: { expenseId: { in: ids }, status: 'pending' },
      include: {
        requestedBy: { select: { id: true, name: true } },
        approvals: { select: { userId: true, approved: true } },
      },
    });
    const requestByExpenseId = new Map(requests.map((r) => [r.expenseId, r]));

    return expenses.map((expense) => {
      const request = requestByExpenseId.get(expense.id);
      if (!request) return { ...expense, pendingDeletion: null };

      const approvalByUser = new Map(
        request.approvals.map((a) => [a.userId, a.approved]),
      );
      const requiredApprovers = expense.shares
        .filter(
          (s) =>
            s.userId !== request.requestedById && toNumber(s.shareAmount) > 0,
        )
        .map((s) => ({
          userId: s.userId,
          name: s.user.name,
          responded: approvalByUser.has(s.userId),
          approved: approvalByUser.get(s.userId) ?? null,
        }));

      return {
        ...expense,
        pendingDeletion: {
          requestId: request.id,
          requestedBy: request.requestedBy,
          createdAt: request.createdAt,
          requiredApprovers,
        },
      };
    });
  }

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

    return { ...expense, pendingDeletion: null };
  }

  async edit(expenseId: string, userId: string, input: EditExpenseInput) {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found.');
    }
    if (existing.status !== 'active') {
      throw new BadRequestException(
        'A deletion request is pending for this expense — resolve it before editing.',
      );
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

    return { ...updated, pendingDeletion: null };
  }

  /**
   * Starts (or, if nobody else has a stake, instantly finishes) a
   * mutual-consent deletion. "Participant" = has a share, paid it, or
   * created it. See /problems/Mutual consent expense deletion.txt and
   * .../Mutual consent expense deletion(Groups).txt.
   */
  async requestDeletion(expenseId: string, userId: string) {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: EXPENSE_INCLUDE,
    });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Expense not found.');
    }
    if (existing.status !== 'active') {
      throw new BadRequestException(
        'A deletion request is already pending for this expense.',
      );
    }
    await this.access.assertMember(existing.ledgerId, userId);

    const isParticipant =
      existing.shares.some((s) => s.userId === userId) ||
      existing.paidByUserId === userId ||
      existing.createdById === userId;
    if (!isParticipant) {
      throw new ForbiddenException(
        'Only someone involved in this expense can request its cancellation.',
      );
    }

    const requiredApproverIds = existing.shares
      .filter((s) => s.userId !== userId && toNumber(s.shareAmount) > 0)
      .map((s) => s.userId);

    if (requiredApproverIds.length === 0) {
      // Nobody else has a stake — nothing to get consent for.
      await prisma.$transaction([
        prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'cancelled', deletedAt: new Date() },
        }),
        prisma.expenseActionRequest.create({
          data: {
            expenseId,
            requestedById: userId,
            actionType: 'delete',
            status: 'approved',
            resolvedAt: new Date(),
          },
        }),
        prisma.activityEvent.create({
          data: {
            ledgerId: existing.ledgerId,
            actorId: userId,
            type: 'expense_deletion_approved',
            payload: { expenseId, description: existing.description },
          },
        }),
      ]);
      return { id: expenseId, status: 'cancelled' as const };
    }

    await prisma.$transaction([
      prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'deletion_requested' },
      }),
      prisma.expenseActionRequest.create({
        data: { expenseId, requestedById: userId, actionType: 'delete' },
      }),
      prisma.activityEvent.create({
        data: {
          ledgerId: existing.ledgerId,
          actorId: userId,
          type: 'expense_deletion_requested',
          payload: { expenseId, description: existing.description },
        },
      }),
    ]);
    return { id: expenseId, status: 'deletion_requested' as const };
  }

  async respondToDeletionRequest(
    requestId: string,
    userId: string,
    approve: boolean,
  ) {
    const request = await prisma.expenseActionRequest.findUnique({
      where: { id: requestId },
      include: { expense: { include: EXPENSE_INCLUDE } },
    });
    if (!request || request.status !== 'pending') {
      throw new NotFoundException('No pending request found.');
    }
    const { expense } = request;
    await this.access.assertMember(expense.ledgerId, userId);

    if (userId === request.requestedById) {
      throw new ForbiddenException('You cannot approve your own request.');
    }
    const share = expense.shares.find((s) => s.userId === userId);
    if (!share || toNumber(share.shareAmount) <= 0) {
      throw new ForbiddenException(
        'Only participants with a share in this expense can respond.',
      );
    }
    const alreadyResponded = await prisma.expenseActionApproval.findUnique({
      where: { requestId_userId: { requestId, userId } },
    });
    if (alreadyResponded) {
      throw new BadRequestException('You already responded to this request.');
    }

    if (!approve) {
      await prisma.$transaction([
        prisma.expenseActionApproval.create({
          data: { requestId, userId, approved: false },
        }),
        prisma.expenseActionRequest.update({
          where: { id: requestId },
          data: { status: 'rejected', resolvedAt: new Date() },
        }),
        prisma.expense.update({
          where: { id: expense.id },
          data: { status: 'active' },
        }),
        prisma.activityEvent.create({
          data: {
            ledgerId: expense.ledgerId,
            actorId: userId,
            type: 'expense_deletion_rejected',
            payload: {
              expenseId: expense.id,
              description: expense.description,
            },
          },
        }),
      ]);
      return { id: expense.id, status: 'active' as const };
    }

    const requiredApproverIds = expense.shares
      .filter(
        (s) =>
          s.userId !== request.requestedById && toNumber(s.shareAmount) > 0,
      )
      .map((s) => s.userId);
    const existingApprovals = await prisma.expenseActionApproval.findMany({
      where: { requestId, approved: true },
      select: { userId: true },
    });
    const approvedSoFar = new Set([
      ...existingApprovals.map((a) => a.userId),
      userId,
    ]);
    const isComplete = requiredApproverIds.every((id) => approvedSoFar.has(id));

    if (!isComplete) {
      await prisma.expenseActionApproval.create({
        data: { requestId, userId, approved: true },
      });
      return { id: expense.id, status: 'deletion_requested' as const };
    }

    await prisma.$transaction([
      prisma.expenseActionApproval.create({
        data: { requestId, userId, approved: true },
      }),
      prisma.expenseActionRequest.update({
        where: { id: requestId },
        data: { status: 'approved', resolvedAt: new Date() },
      }),
      prisma.expense.update({
        where: { id: expense.id },
        data: { status: 'cancelled', deletedAt: new Date() },
      }),
      prisma.activityEvent.create({
        data: {
          ledgerId: expense.ledgerId,
          actorId: userId,
          type: 'expense_deletion_approved',
          payload: { expenseId: expense.id, description: expense.description },
        },
      }),
    ]);
    return { id: expense.id, status: 'cancelled' as const };
  }

  async list(ledgerId: string, userId: string, page: number, pageSize: number) {
    await this.access.assertMember(ledgerId, userId);

    const [rawItems, total] = await Promise.all([
      prisma.expense.findMany({
        where: { ledgerId, deletedAt: null },
        include: EXPENSE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.expense.count({ where: { ledgerId, deletedAt: null } }),
    ]);
    const items = await this.attachPendingDeletions(rawItems);

    return { items, total, page, pageSize };
  }
}
