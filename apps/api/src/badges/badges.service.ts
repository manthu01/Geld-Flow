import { Injectable, type OnModuleInit } from '@nestjs/common';
import { prisma, type Prisma } from '@geld-flow/db';
import { BADGE_DEFINITIONS, type BadgeKey } from './badge-definitions';

@Injectable()
export class BadgesService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    for (const def of BADGE_DEFINITIONS) {
      await prisma.badge.upsert({
        where: { key: def.key },
        create: def,
        update: {
          name: def.name,
          description: def.description,
          iconRef: def.iconRef,
          criteriaType: def.criteriaType,
          criteriaValue: def.criteriaValue,
        },
      });
    }
  }

  /** Idempotent — safe to call every time the underlying criteria is met, not just the first. */
  async award(
    tx: Prisma.TransactionClient,
    userId: string,
    key: BadgeKey,
  ): Promise<void> {
    const badge = await tx.badge.findUnique({ where: { key } });
    if (!badge) return;

    await tx.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: { userId, badgeId: badge.id },
      update: {},
    });
  }

  async listForUser(userId: string) {
    const [all, earned] = await Promise.all([
      prisma.badge.findMany({ orderBy: { name: 'asc' } }),
      prisma.userBadge.findMany({ where: { userId } }),
    ]);
    const earnedAtByBadgeId = new Map(
      earned.map((e) => [e.badgeId, e.earnedAt]),
    );

    return all.map((badge) => ({
      ...badge,
      earned: earnedAtByBadgeId.has(badge.id),
      earnedAt: earnedAtByBadgeId.get(badge.id) ?? null,
    }));
  }
}
