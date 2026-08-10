import { randomBytes, createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { prisma, type User } from '@geld-flow/db';

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface GoogleProfileInput {
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------- Magic link

  /** Creates a single-use magic-link token and returns the URL to email. */
  async createMagicLink(email: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    await prisma.magicLinkToken.create({
      data: {
        email,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      },
    });

    const apiBaseUrl =
      this.config.get<string>('API_BASE_URL') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '4000'}`;
    return `${apiBaseUrl}/auth/magic-link/verify?token=${rawToken}`;
  }

  /**
   * Redeems a magic-link token: marks it used (single-use, even if the
   * request fails downstream) and finds or creates the matching user.
   * Returns null for an invalid, expired, or already-used token.
   */
  async redeemMagicLink(rawToken: string): Promise<User | null> {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return null;
    }

    await prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return prisma.user.upsert({
      where: { email: record.email },
      update: {},
      create: { email: record.email, name: record.email.split('@')[0] },
    });
  }

  // ------------------------------------------------------------- Google

  /**
   * Links a Google identity to an existing account (matched by email) or
   * creates a new one. Lets someone who first signed up via magic-link
   * later sign in with Google using the same email, and vice versa.
   */
  async findOrCreateGoogleUser(input: GoogleProfileInput): Promise<User> {
    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: input.providerUserId,
        },
      },
      include: { user: true },
    });
    if (existingIdentity) {
      return existingIdentity.user;
    }

    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {},
      create: {
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
      },
    });

    await prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: 'google',
        providerUserId: input.providerUserId,
      },
    });

    return user;
  }

  // --------------------------------------------------------- Token pair

  async issueTokens(
    userId: string,
    email: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: refreshTokenExpiresAt,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
    };
  }

  /**
   * Rotates a refresh token. The claim is a single atomic UPDATE guarded
   * by `revokedAt: null` — under concurrent calls with the same cookie
   * (e.g. React Strict Mode double-firing a mount effect), the database
   * guarantees only one of them can flip revokedAt from null, so exactly
   * one caller wins the rotation and the other gets a clean 401 instead
   * of both racing to issue their own "new" token pair.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    userAgent?: string,
  ): Promise<{ user: User; tokens: IssuedTokens }> {
    const tokenHash = hashToken(rawRefreshToken);

    const { count } = await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const record = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash },
      include: { user: true },
    });

    const tokens = await this.issueTokens(
      record.user.id,
      record.user.email,
      userAgent,
    );
    return { user: record.user, tokens };
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
