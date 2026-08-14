import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { User } from '@geld-flow/db';
import { createFeedbackSchema, type CreateFeedbackInput } from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createFeedbackSchema)) body: CreateFeedbackInput,
  ) {
    return this.feedback.create(user.id, body);
  }
}
