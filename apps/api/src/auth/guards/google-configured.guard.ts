import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Runs before AuthGuard('google') and blocks the route with a clear error
 * until real Google OAuth credentials are set — rather than letting the
 * request fall through to Google with a bogus client_id.
 */
@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server yet. Use magic-link sign-in instead.',
      );
    }
    return true;
  }
}
