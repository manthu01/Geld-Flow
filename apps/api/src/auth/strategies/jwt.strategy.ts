import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { prisma } from '@geld-flow/db';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-only-change-me',
    });
  }

  async validate(payload: AccessTokenPayload) {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // deletedAt: an old still-valid access token from before the account
    // was deleted shouldn't keep working for the rest of its ~15min TTL.
    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
