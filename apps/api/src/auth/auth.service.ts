import { randomBytes, createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { prisma, type User } from '@geld-flow/db';
import type { UpdateProfileInput } from '@geld-flow/shared';

const BCRYPT_ROUNDS = 12;

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/auth';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const USERNAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

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

  // ------------------------------------------------------------- Email

  /** Lets the login form ask before it asks: does this email already have an account? */
  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  /**
   * Email + password, like any other site. An email with no account yet
   * doubles as signup — no separate sign-up step — but an *existing*
   * account with no password set (e.g. Google-only so far) can't be
   * logged into this way; it needs a password set first, either by the
   * user going through Google once, or by an admin.
   */
  async loginOrSignUp(email: string, password: string): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const localPart = email.split('@')[0] ?? 'user';
      return prisma.user.create({
        data: {
          email,
          name: localPart,
          username: await generateUniqueUsername(localPart),
          passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        },
      });
    }

    if (!existing.passwordHash) {
      throw new UnauthorizedException(
        'This account has no password set yet. Sign in with Google, or ask an admin to set one.',
      );
    }

    const valid = await bcrypt.compare(password, existing.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect password.');
    }

    return existing;
  }

  /** Admin-only: sets (or replaces) a user's password without ever needing to know the old one. */
  async adminSetPassword(userId: string, newPassword: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    });
  }

  // ------------------------------------------------------------- Google

  /**
   * Links a Google identity to an existing account (matched by email) or
   * creates a new one. Lets someone who first signed up with plain email
   * login later sign in with Google using the same email, and vice versa.
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
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const isChangingUsername =
      input.username !== undefined && input.username !== current.username;

    if (isChangingUsername) {
      if (current.usernameChangedAt) {
        const nextAllowedAt = new Date(
          current.usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS,
        );
        if (nextAllowedAt > new Date()) {
          const daysLeft = Math.ceil(
            (nextAllowedAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          );
          throw new BadRequestException(
            `You can change your username again in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          );
        }
      }

      const taken = await prisma.user.findUnique({
        where: { username: input.username },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException('That username is already taken.');
      }
    }

    if (input.email !== undefined && input.email !== current.email) {
      const taken = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException(
          'That email is already in use by another account.',
        );
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(isChangingUsername ? { usernameChangedAt: new Date() } : {}),
        ...(input.avatarUrl !== undefined
          ? { avatarUrl: input.avatarUrl }
          : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phoneNumber !== undefined
          ? { phoneNumber: input.phoneNumber }
          : {}),
        ...(input.defaultCurrency !== undefined
          ? { defaultCurrency: input.defaultCurrency }
          : {}),
      },
    });
  }

  /** Self-service password change — requires the current password, unlike AdminService's reset. */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account has no password set yet. Sign in with Google, or ask an admin to set one.',
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Your current password is incorrect.');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    });
  }

  /**
   * Deletes the caller's own account. A fully solo account (no ledger
   * anywhere has another real member) is genuinely removed, cascading
   * through its own ledgers. Otherwise the row is redacted in place —
   * synthetic email, no password, first name only — so every ledger it's
   * shared with keeps its balances and history intact for everyone else.
   * Either way, every session is killed immediately.
   */
  async deleteOwnAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const memberships = await prisma.ledgerMember.findMany({
      where: { userId },
      select: {
        ledgerId: true,
        ledger: {
          select: {
            members: {
              select: {
                userId: true,
                user: { select: { isShadow: true, deletedAt: true } },
              },
            },
          },
        },
      },
    });

    const hasSharedLedger = memberships.some((m) =>
      m.ledger.members.some(
        (member) =>
          member.userId !== userId &&
          !member.user.isShadow &&
          !member.user.deletedAt,
      ),
    );

    if (hasSharedLedger) {
      const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            email: `deleted-${randomBytes(12).toString('hex')}@deleted.geldflow.internal`,
            username: await generateUniqueUsername(
              `deleted${randomBytes(4).toString('hex')}`,
            ),
            name: firstName,
            avatarUrl: null,
            phoneNumber: null,
            passwordHash: null,
            deletedAt: new Date(),
          },
        }),
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.authIdentity.deleteMany({ where: { userId } }),
      ]);
      return;
    }

    // No shared history anywhere — safe to remove everything for real.
    const soloLedgerIds = memberships.map((m) => m.ledgerId);
    await prisma.$transaction(async (tx) => {
      for (const ledgerId of soloLedgerIds) {
        const ledger = await tx.ledger.findUniqueOrThrow({
          where: { id: ledgerId },
          select: {
            members: {
              select: {
                userId: true,
                user: { select: { isShadow: true, addedByUserId: true } },
              },
            },
          },
        });
        await tx.ledger.delete({ where: { id: ledgerId } });

        const orphanedShadowIds = ledger.members
          .filter((m) => m.user.isShadow && m.user.addedByUserId === userId)
          .map((m) => m.userId);
        if (orphanedShadowIds.length > 0) {
          await tx.user.deleteMany({
            where: { id: { in: orphanedShadowIds } },
          });
        }
      }
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
