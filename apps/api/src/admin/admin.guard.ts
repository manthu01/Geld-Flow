import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@geld-flow/db';

/**
 * Runs after JwtAuthGuard, so req.user is already the authenticated
 * User row. A hidden button in the sidebar is a UI convenience, not
 * security — this is the actual access boundary, and it's a single
 * hardcoded admin email from config rather than a role on the user
 * table, since there's exactly one admin (the person running the app).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (!adminEmail) {
      throw new ServiceUnavailableException('Admin panel is not configured.');
    }

    const request = context.switchToHttp().getRequest<{ user: User }>();
    if (request.user?.email !== adminEmail) {
      throw new ForbiddenException('Not authorized.');
    }
    return true;
  }
}
