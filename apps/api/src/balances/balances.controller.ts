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

/** Powers the Groups page's All/You-owe/Owed-to-you filter — not nested under one ledger. */
@Controller('balances')
@UseGuards(JwtAuthGuard)
export class MyBalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get('mine')
  getMine(@CurrentUser() user: User) {
    return this.balances.getMyGroupBalances(user.id);
  }
}
