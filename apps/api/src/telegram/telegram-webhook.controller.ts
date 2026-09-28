import { Body, Controller, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TelegramService, type TelegramUpdate } from './telegram.service';

/**
 * Called by Telegram itself, not by our frontend — no JWT guard. The bot
 * token in the path is the only gate; TelegramService checks it matches
 * before touching anything.
 */
@Controller('telegram/webhook')
export class TelegramWebhookController {
  constructor(private readonly telegram: TelegramService) {}

  @Post(':token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async handleWebhook(
    @Param('token') token: string,
    @Body() update: TelegramUpdate,
  ) {
    await this.telegram.handleWebhookUpdate(token, update);
    return { ok: true };
  }
}
