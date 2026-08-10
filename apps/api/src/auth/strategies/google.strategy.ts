import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import { AuthService, type GoogleProfileInput } from '../auth.service';

/**
 * Always registered — passport-google-oauth20 throws in its constructor
 * if clientID/clientSecret are missing, and Nest instantiates every
 * module provider at boot, so an unconditional real strategy would crash
 * the whole API whenever Google isn't configured yet. Falling back to
 * placeholder credentials keeps the app booting; GoogleConfiguredGuard is
 * what actually blocks the routes until real credentials are set.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'unconfigured',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'unconfigured',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        `http://localhost:${config.get<string>('PORT') ?? '4000'}/auth/google/callback`,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google account has no email on it.'));
    }

    const input: GoogleProfileInput = {
      providerUserId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value,
    };

    const user = await this.authService.findOrCreateGoogleUser(input);
    done(null, user);
  }
}
