import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BalancesService } from './balances.service';

@Controller('ledgers/:ledgerId/balances')
@UseGuards(JwtAuthGuard)
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get()
  get(@CurrentUser() user: User, @Param('ledgerId') ledgerId: string) {
    return this.balances.getBalances(ledgerId, user.id);
  }
}
