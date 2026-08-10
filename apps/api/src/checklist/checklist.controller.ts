import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@geld-flow/db';
import {
  createChecklistItemSchema,
  editChecklistItemSchema,
  type CreateChecklistItemInput,
  type EditChecklistItemInput,
} from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ChecklistService } from './checklist.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}

  @Get('ledgers/:ledgerId/checklist')
  list(@CurrentUser() user: User, @Param('ledgerId') ledgerId: string) {
    return this.checklist.list(ledgerId, user.id);
  }

  @Post('ledgers/:ledgerId/checklist')
  create(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
    @Body(new ZodValidationPipe(createChecklistItemSchema))
    body: CreateChecklistItemInput,
  ) {
    return this.checklist.create(ledgerId, user.id, body);
  }

  @Patch('checklist/:id')
  edit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editChecklistItemSchema))
    body: EditChecklistItemInput,
  ) {
    return this.checklist.edit(id, user.id, body);
  }

  @Delete('checklist/:id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.checklist.remove(id, user.id);
  }
}
