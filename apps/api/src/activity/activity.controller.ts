import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LedgerAccessService } from '../common/ledger-access.service';

@Controller('ledgers/:ledgerId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly access: LedgerAccessService) {}

  @Get()
  async list(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    await this.access.assertMember(ledgerId, user.id);

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 30));

    const [items, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where: { ledgerId },
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.activityEvent.count({ where: { ledgerId } }),
    ]);

    return { items, total, page: pageNum, pageSize: size };
  }
}

const DEFAULT_FEED_PAGE_SIZE = 20;

/**
 * The Activity page's global feed — every event across every ledger the
 * caller is in, merged by recency. One query does the cross-ledger merge
 * (ledgerId IN (...)) and the pagination together, so the database only
 * ever returns the one page actually requested — see
 * /problems/pagination.txt and /problems/latency.txt.
 */
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityFeedController {
  @Get('feed')
  async feed(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(
      50,
      Math.max(1, Number(pageSize) || DEFAULT_FEED_PAGE_SIZE),
    );

    const memberships = await prisma.ledgerMember.findMany({
      where: { userId: user.id },
      select: { ledgerId: true },
    });
    const ledgerIds = memberships.map((m) => m.ledgerId);
    if (ledgerIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: pageNum,
        pageSize: size,
        hasMore: false,
      };
    }

    const [events, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where: { ledgerId: { in: ledgerIds } },
        include: {
          actor: { select: { id: true, name: true, avatarUrl: true } },
          ledger: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.activityEvent.count({ where: { ledgerId: { in: ledgerIds } } }),
    ]);

    return {
      items: events.map(({ ledger, ...event }) => ({ event, ledger })),
      total,
      page: pageNum,
      pageSize: size,
      hasMore: pageNum * size < total,
    };
  }
}
