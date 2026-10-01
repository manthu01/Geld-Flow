import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LedgersService } from './ledgers.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly ledgers: LedgersService) {}

  /** Public preview for the invite-landing page — no auth, never consumes a use. */
  @Get(':token')
  info(@Param('token') token: string) {
    return this.ledgers.getInviteInfo(token);
  }

  @Post(':token/redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: User, @Param('token') token: string) {
    return this.ledgers.redeemInvite(token, user.id);
  }
}
