import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@geld-flow/db';
import {
  createInviteSchema,
  createLedgerSchema,
  getOrCreatePersonalLedgerSchema,
  type CreateInviteInput,
  type CreateLedgerInput,
  type GetOrCreatePersonalLedgerInput,
} from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LedgersService } from './ledgers.service';

@Controller('ledgers')
@UseGuards(JwtAuthGuard)
export class LedgersController {
  constructor(
    private readonly ledgers: LedgersService,
    private readonly config: ConfigService,
  ) {}

  private get apiBaseUrl(): string {
    return (
      this.config.get<string>('API_BASE_URL') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '4000'}`
    );
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createLedgerSchema)) body: CreateLedgerInput,
  ) {
    return this.ledgers.createGroup(user.id, body);
  }

  @Post('personal')
  getOrCreatePersonal(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(getOrCreatePersonalLedgerSchema))
    body: GetOrCreatePersonalLedgerInput,
  ) {
    return this.ledgers.getOrCreatePersonalLedger(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: User) {
    return this.ledgers.listMine(user.id);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ledgers.getDetail(id, user.id);
  }

  @Post(':id/invites')
  createInvite(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createInviteSchema)) body: CreateInviteInput,
  ) {
    return this.ledgers.createInvite(id, user.id, body, this.apiBaseUrl);
  }
}
