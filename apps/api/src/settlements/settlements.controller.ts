import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import {
  createSettlementSchema,
  type CreateSettlementInput,
} from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SettlementsService } from './settlements.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Get('ledgers/:ledgerId/settlements')
  list(@CurrentUser() user: User, @Param('ledgerId') ledgerId: string) {
    return this.settlements.list(ledgerId, user.id);
  }

  @Post('ledgers/:ledgerId/settlements')
  request(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
    @Body(new ZodValidationPipe(createSettlementSchema))
    body: CreateSettlementInput,
  ) {
    return this.settlements.request(ledgerId, user.id, body);
  }

  @Post('settlements/:id/confirm')
  confirm(@CurrentUser() user: User, @Param('id') id: string) {
    return this.settlements.confirm(id, user.id);
  }

  @Post('settlements/:id/decline')
  decline(@CurrentUser() user: User, @Param('id') id: string) {
    return this.settlements.decline(id, user.id);
  }
}
