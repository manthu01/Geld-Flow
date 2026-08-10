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
