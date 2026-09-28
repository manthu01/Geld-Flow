import { Module } from '@nestjs/common';
import { TelegramLinkController } from './telegram-link.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramService } from './telegram.service';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [ExpensesModule],
  controllers: [TelegramLinkController, TelegramWebhookController],
  providers: [TelegramService],
})
export class TelegramModule {}
