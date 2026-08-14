import { Injectable } from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import type { CreateFeedbackInput } from '@geld-flow/shared';

@Injectable()
export class FeedbackService {
  async create(userId: string, input: CreateFeedbackInput) {
    const feedback = await prisma.feedback.create({
      data: { userId, message: input.message },
    });
    return { id: feedback.id };
  }
}
