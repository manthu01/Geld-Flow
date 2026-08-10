import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@geld-flow/db';
import {
  createExpenseSchema,
  editExpenseSchema,
  type CreateExpenseInput,
  type EditExpenseInput,
} from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ExpensesService } from './expenses.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post('ledgers/:ledgerId/expenses')
  create(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
    @Body(new ZodValidationPipe(createExpenseSchema)) body: CreateExpenseInput,
  ) {
    if (body.ledgerId !== ledgerId) {
      throw new BadRequestException('ledgerId in the body must match the URL.');
    }
    return this.expenses.create(user.id, body);
  }

  @Get('ledgers/:ledgerId/expenses')
  list(
    @CurrentUser() user: User,
    @Param('ledgerId') ledgerId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.expenses.list(
      ledgerId,
      user.id,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(pageSize) || 30)),
    );
  }

  @Patch('expenses/:id')
  edit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editExpenseSchema)) body: EditExpenseInput,
  ) {
    return this.expenses.edit(id, user.id, body);
  }

  @Delete('expenses/:id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expenses.softDelete(id, user.id);
  }
}
