import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { prisma } from '@geld-flow/db';

@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unreachable.');
    }
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
