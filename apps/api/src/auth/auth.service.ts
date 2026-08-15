import { randomBytes, createHash } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { prisma, type User } from '@geld-flow/db';
import type { UpdateProfileInput } from '@geld-flow/shared';

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

/**
 * Derives a unique username from an email's local part on first signup.
 * Only runs once per account (existing users keep whatever they've
 * chosen) — collisions get a numeric suffix rather than failing signup.
 */
export async function generateUniqueUsername(
  localPart: string,
): Promise<string> {
  const cleaned =
    localPart
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 16) || 'user';
  const root = /^[a-z]/.test(cleaned) ? cleaned : `u${cleaned}`;
  const base = root.length >= 3 ? root : root.padEnd(3, '0');

  let candidate = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    const suffixStr = String(suffix);
    candidate = `${base.slice(0, 20 - suffixStr.length)}${suffixStr}`;
  }
  return candidate;
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

    const existing = await prisma.user.findUnique({
      where: { email: record.email },
    });
    if (existing) return existing;

    const localPart = record.email.split('@')[0] ?? 'user';
    return prisma.user.create({
      data: {
        email: record.email,
        name: localPart,
        username: await generateUniqueUsername(localPart),
      },
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

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
          username: await generateUniqueUsername(
            input.email.split('@')[0] ?? 'user',
          ),
        },
      }));

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

  // ------------------------------------------------------------- Profile

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<User> {
    if (input.username) {
      const taken = await prisma.user.findUnique({
        where: { username: input.username },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException('That username is already taken.');
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.avatarUrl !== undefined
          ? { avatarUrl: input.avatarUrl }
          : {}),
      },
    });
  }
}
