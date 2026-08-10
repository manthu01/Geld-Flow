import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import type {
  CreateChecklistItemInput,
  EditChecklistItemInput,
} from '@geld-flow/shared';
import { LedgerAccessService } from '../common/ledger-access.service';
import { BadgesService } from '../badges/badges.service';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly access: LedgerAccessService,
    private readonly badges: BadgesService,
  ) {}

  async list(ledgerId: string, userId: string) {
    await this.access.assertMember(ledgerId, userId);
    return prisma.checklistItem.findMany({
      where: { ledgerId },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    ledgerId: string,
    userId: string,
    input: CreateChecklistItemInput,
  ) {
    await this.access.assertMember(ledgerId, userId);

    const ledger = await prisma.ledger.findUnique({
      where: { id: ledgerId },
      select: { type: true },
    });
    if (!ledger) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.type !== 'group_event') {
      throw new BadRequestException(
        'Checklists are only available on event-mode group ledgers.',
      );
    }
    if (input.assignedToId) {
      await this.access.assertMember(ledgerId, input.assignedToId);
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.checklistItem.create({
        data: {
          ledgerId,
          title: input.title,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          createdById: userId,
        },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      await tx.activityEvent.create({
        data: {
          ledgerId,
          actorId: userId,
          type: 'checklist_item_added',
          payload: { checklistItemId: item.id, title: item.title },
        },
      });

      return item;
    });
  }

  private async findItem(itemId: string) {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Checklist item not found.');
    }
    return item;
  }

  async edit(itemId: string, userId: string, input: EditChecklistItemInput) {
    const item = await this.findItem(itemId);
    await this.access.assertMember(item.ledgerId, userId);
    if (input.assignedToId) {
      await this.access.assertMember(item.ledgerId, input.assignedToId);
    }

    const wasDone = item.isDone;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.checklistItem.update({
        where: { id: itemId },
        data: {
          title: input.title,
          isDone: input.isDone,
          assignedToId: input.assignedToId,
          dueDate:
            input.dueDate === undefined
              ? undefined
              : input.dueDate === null
                ? null
                : new Date(input.dueDate),
        },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      if (input.isDone && !wasDone) {
        await tx.activityEvent.create({
          data: {
            ledgerId: item.ledgerId,
            actorId: userId,
            type: 'checklist_item_completed',
            payload: { checklistItemId: itemId, title: result.title },
          },
        });

        const completedCount = await tx.activityEvent.count({
          where: { actorId: userId, type: 'checklist_item_completed' },
        });
        if (completedCount === 5) {
          await this.badges.award(tx, userId, 'checklist-champion');
        }
      }

      return result;
    });

    return updated;
  }

  async remove(itemId: string, userId: string) {
    const item = await this.findItem(itemId);
    await this.access.assertMember(item.ledgerId, userId);
    await prisma.checklistItem.delete({ where: { id: itemId } });
    return { id: itemId };
  }
}
