import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LedgerAccessService } from '../common/ledger-access.service';
import { TelegramService } from './telegram.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TelegramLinkController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly access: LedgerAccessService,
  ) {}

  @Get('telegram/status')
  status() {
    return {
      configured: this.telegram.isConfigured,
      botUsername: this.telegram.username,
    };
  }

  @Post('ledgers/:ledgerId/telegram-link')
  async createLinkCode(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
  ) {
    if (!this.telegram.isConfigured) {
      throw new BadRequestException(
        'The Telegram bot is not configured on this server.',
      );
    }
    await this.access.assertRole(ledgerId, user.id, ['owner', 'admin']);

    const ledger = await prisma.ledger.findUnique({
      where: { id: ledgerId },
      select: { type: true },
    });
    if (!ledger) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.type === 'personal') {
      throw new BadRequestException(
        'Telegram linking is only available for group ledgers.',
      );
    }

    return this.telegram.generateLinkCode(ledgerId, user.id);
  }
}
