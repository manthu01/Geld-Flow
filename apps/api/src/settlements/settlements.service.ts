import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import type { CreateSettlementInput } from '@geld-flow/shared';
import { LedgerAccessService } from '../common/ledger-access.service';

@Injectable()
export class SettlementsService {
  constructor(private readonly access: LedgerAccessService) {}

  async list(ledgerId: string, userId: string) {
    await this.access.assertMember(ledgerId, userId);
    return prisma.settlement.findMany({
      where: { ledgerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async request(
    ledgerId: string,
    userId: string,
    input: CreateSettlementInput,
  ) {
    if (input.toUserId === userId) {
      throw new BadRequestException('You cannot settle up with yourself.');
    }
    await this.access.assertMember(ledgerId, userId);
    await this.access.assertMember(ledgerId, input.toUserId);

    return prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          ledgerId,
          fromUserId: userId,
          toUserId: input.toUserId,
          amount: input.amount,
          currency: input.currency.toUpperCase(),
        },
      });

      await tx.activityEvent.create({
        data: {
          ledgerId,
          actorId: userId,
          type: 'settlement_requested',
          payload: {
            settlementId: settlement.id,
            toUserId: input.toUserId,
            amount: input.amount,
          },
        },
      });

      return settlement;
    });
  }

  private async findPending(settlementId: string) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found.');
    }
    if (settlement.status !== 'pending') {
      throw new BadRequestException(
        'This settlement has already been resolved.',
      );
    }
    return settlement;
  }

  async confirm(settlementId: string, userId: string) {
    const settlement = await this.findPending(settlementId);
    if (settlement.toUserId !== userId) {
      throw new ForbiddenException(
        'Only the person who was owed money can confirm receiving it.',
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.settlement.update({
        where: { id: settlementId },
        data: { status: 'confirmed', confirmedAt: new Date() },
      });

      await tx.activityEvent.create({
        data: {
          ledgerId: settlement.ledgerId,
          actorId: userId,
          type: 'settlement_confirmed',
          payload: { settlementId, amount: Number(settlement.amount) },
        },
      });

      return updated;
    });
  }

  async decline(settlementId: string, userId: string) {
    const settlement = await this.findPending(settlementId);
    if (settlement.toUserId !== userId && settlement.fromUserId !== userId) {
      throw new ForbiddenException(
        'Only the two people in this settlement can decline it.',
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.settlement.update({
        where: { id: settlementId },
        data: { status: 'declined' },
      });

      await tx.activityEvent.create({
        data: {
          ledgerId: settlement.ledgerId,
          actorId: userId,
          type: 'settlement_declined',
          payload: { settlementId, amount: Number(settlement.amount) },
        },
      });

      return updated;
    });
  }
}
