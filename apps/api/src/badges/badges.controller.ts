import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BadgesService } from './badges.service';

@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return this.badges.listForUser(user.id);
  }

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.badges.listForUser(userId);
  }
}
