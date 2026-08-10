import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DebtSimplificationService } from './debt-simplification.service';

@Controller('ledgers/:ledgerId/debt-simplification')
@UseGuards(JwtAuthGuard)
export class DebtSimplificationController {
  constructor(private readonly service: DebtSimplificationService) {}

  @Get()
  get(@CurrentUser() user: User, @Param('ledgerId') ledgerId: string) {
    return this.service.getSuggestions(ledgerId, user.id);
  }
}
