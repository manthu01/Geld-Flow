import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReputationService } from './reputation.service';

@Controller('reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.reputation.getScore(user.id);
  }

  // Declared before ':userId' — Nest matches routes in order, and a
  // literal segment has to win over the param route or "batch" would be
  // parsed as a userId.
  @Get('batch')
  batch(@Query('userIds') userIds: string) {
    const ids = (userIds ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.reputation.getScores(ids);
  }

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.reputation.getScore(userId);
  }
}
