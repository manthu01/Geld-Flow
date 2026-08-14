import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LedgersService } from './ledgers.service';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly ledgers: LedgersService) {}

  // Public: a not-yet-signed-up person needs to see who's inviting them
  // before they have an account to authenticate with.
  @Get(':token')
  getInfo(@Param('token') token: string) {
    return this.ledgers.getClaimInfo(token);
  }

  @Post(':token/redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: User, @Param('token') token: string) {
    return this.ledgers.redeemClaim(token, user.id);
  }
}
