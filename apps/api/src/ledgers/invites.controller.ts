import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LedgersService } from './ledgers.service';

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(private readonly ledgers: LedgersService) {}

  @Post(':token/redeem')
  redeem(@CurrentUser() user: User, @Param('token') token: string) {
    return this.ledgers.redeemInvite(token, user.id);
  }
}
