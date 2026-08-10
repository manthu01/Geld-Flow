import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.reputation.getScore(userId);
  }
}
