import { Injectable } from '@nestjs/common';
import { prisma, type Prisma, type UserScore } from '@geld-flow/db';
import { computeRank } from './rank.util';

export type ScoreView =
  | UserScore
  | {
      userId: string;
      currentRank: 'I';
      rollingAvgSettleHours: null;
      confirmedSettlements: 0;
      updatedAt: null;
    };

@Injectable()
export class ReputationService {
  /** Everyone starts at the same zero-state until their first confirmed settlement creates a row. */
  async getScore(userId: string): Promise<ScoreView> {
    const score = await prisma.userScore.findUnique({ where: { userId } });
    return (
      score ?? {
        userId,
        currentRank: 'I',
        rollingAvgSettleHours: null,
        confirmedSettlements: 0,
        updatedAt: null,
      }
    );
  }

  /**
   * One query for every member of a ledger, instead of the ledger page
   * firing one /reputation/:userId request per member — that was an
   * extra full network round-trip per person on top of everything else
   * the page already waits on.
   */
  async getScores(userIds: string[]): Promise<Record<string, ScoreView>> {
    const rows = await prisma.userScore.findMany({
      where: { userId: { in: userIds } },
    });
    const byUserId = new Map(rows.map((row) => [row.userId, row]));

    const result: Record<string, ScoreView> = {};
    for (const userId of userIds) {
      result[userId] = byUserId.get(userId) ?? {
        userId,
        currentRank: 'I',
        rollingAvgSettleHours: null,
        confirmedSettlements: 0,
        updatedAt: null,
      };
    }
    return result;
  }

  /**
   * Called from inside a settlement's own confirm transaction so a score
   * update never happens without the settlement that earned it actually
   * landing. `hours` is measured from when the payer recorded the
   * settlement to when the recipient confirmed it — a proxy for how
   * promptly a claimed payment gets corroborated, not a literal
   * debt-age metric (balances are net, not per-expense, so there's no
   * single "debt incurred" timestamp to measure against).
   */
  async recordConfirmedSettlement(
    tx: Prisma.TransactionClient,
    userId: string,
    timing: { createdAt: Date; confirmedAt: Date },
  ): Promise<{
    confirmedSettlements: number;
    currentRank: ReturnType<typeof computeRank>;
    hours: number;
  }> {
    const hours =
      (timing.confirmedAt.getTime() - timing.createdAt.getTime()) /
      (1000 * 60 * 60);

    const existing = await tx.userScore.findUnique({ where: { userId } });
    const confirmedSettlements = (existing?.confirmedSettlements ?? 0) + 1;
    const rollingAvgSettleHours =
      existing?.rollingAvgSettleHours != null
        ? existing.rollingAvgSettleHours +
          (hours - existing.rollingAvgSettleHours) / confirmedSettlements
        : hours;
    const currentRank = computeRank(confirmedSettlements);

    await tx.userScore.upsert({
      where: { userId },
      create: {
        userId,
        confirmedSettlements,
        rollingAvgSettleHours,
        currentRank,
      },
      update: { confirmedSettlements, rollingAvgSettleHours, currentRank },
    });

    return { confirmedSettlements, currentRank, hours };
  }
}
