import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, type Ledger } from '@geld-flow/db';
import type {
  CreateInviteInput,
  CreateLedgerInput,
  GetOrCreatePersonalLedgerInput,
} from '@geld-flow/shared';
import { LedgerAccessService } from '../common/ledger-access.service';
import { BadgesService } from '../badges/badges.service';

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// Shadow (unclaimed) member support: an admin can add someone to a
// personal ledger who has no Geld Flow account yet. That creates a real
// User row (isShadow: true) with a synthetic email so every expense,
// share, and settlement can reference it exactly like a real member.
// The claim link lets that person later attach their own account — see
// redeemClaim for how ownership of those rows transfers.
const SHADOW_EMAIL_DOMAIN = 'members.geldflow.internal';
const CLAIM_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const MEMBER_SELECT = {
  userId: true,
  role: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isShadow: true,
    },
  },
} as const;

@Injectable()
export class LedgersService {
  constructor(
    private readonly access: LedgerAccessService,
    private readonly badges: BadgesService,
  ) {}

  async createGroup(userId: string, input: CreateLedgerInput): Promise<Ledger> {
    if (input.type === 'personal') {
      throw new BadRequestException(
        'Personal ledgers are looked up via /ledgers/personal, not created directly.',
      );
    }

    return prisma.$transaction(async (tx) => {
      const ledger = await tx.ledger.create({
        data: {
          type: input.type,
          name: input.name,
          baseCurrency: input.baseCurrency.toUpperCase(),
          createdById: userId,
          members: { create: { userId, role: 'owner' } },
        },
      });

      const groupCount = await tx.ledger.count({
        where: { createdById: userId, type: { not: 'personal' } },
      });
      if (groupCount === 1) {
        await this.badges.award(tx, userId, 'group-founder');
      }

      return ledger;
    });
  }

  async listMine(userId: string) {
    const memberships = await prisma.ledgerMember.findMany({
      where: { userId },
      include: {
        ledger: {
          include: {
            _count: { select: { members: true } },
            members: { select: MEMBER_SELECT },
          },
        },
      },
      orderBy: { ledger: { createdAt: 'desc' } },
    });

    // Split at the API boundary, not just in the UI — group and personal
    // balances must never be presented (or mistakenly summed) together.
    const groups = memberships
      .filter((m) => m.ledger.type !== 'personal')
      .map((m) => ({ ...m.ledger, myRole: m.role }));
    const personal = memberships
      .filter((m) => m.ledger.type === 'personal')
      .map((m) => ({ ...m.ledger, myRole: m.role }));

    return { groups, personal };
  }

  async getDetail(ledgerId: string, userId: string) {
    const membership = await this.access.assertMember(ledgerId, userId);
    const ledger = await prisma.ledger.findUnique({
      where: { id: ledgerId },
      include: { members: { select: MEMBER_SELECT } },
    });
    if (!ledger) {
      throw new NotFoundException('Ledger not found.');
    }
    return { ...ledger, myRole: membership.role };
  }

  async createInvite(
    ledgerId: string,
    userId: string,
    input: CreateInviteInput,
    apiBaseUrl: string,
  ) {
    await this.access.assertRole(ledgerId, userId, ['owner', 'admin']);

    const rawToken = randomBytes(24).toString('hex');
    await prisma.invite.create({
      data: {
        ledgerId,
        tokenHash: hashToken(rawToken),
        createdById: userId,
        maxUses: input.maxUses,
        expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
      },
    });

    return { inviteUrl: `${apiBaseUrl}/invites/${rawToken}/redeem` };
  }

  async redeemInvite(rawToken: string, userId: string) {
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (
      !invite ||
      invite.revokedAt ||
      invite.expiresAt < new Date() ||
      invite.useCount >= invite.maxUses
    ) {
      throw new BadRequestException(
        'This invite link is invalid or has expired.',
      );
    }

    const existing = await this.access.getMembership(invite.ledgerId, userId);
    if (existing) {
      return { ledgerId: invite.ledgerId, alreadyMember: true };
    }

    await prisma.$transaction([
      prisma.ledgerMember.create({
        data: { ledgerId: invite.ledgerId, userId, role: 'member' },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      }),
      prisma.activityEvent.create({
        data: {
          ledgerId: invite.ledgerId,
          actorId: userId,
          type: 'member_joined',
          payload: { userId },
        },
      }),
    ]);

    return { ledgerId: invite.ledgerId, alreadyMember: false };
  }

  async getOrCreatePersonalLedger(
    userId: string,
    input: GetOrCreatePersonalLedgerInput,
    webBaseUrl: string,
  ): Promise<{ ledger: Ledger; claimUrl?: string }> {
    if (input.peerEmail) {
      const peer = await prisma.user.findUnique({
        where: { email: input.peerEmail },
      });
      if (!peer) {
        throw new NotFoundException(
          'No Geld Flow account found for that email yet — add them by name instead, or ask them to sign up first.',
        );
      }
      if (peer.id === userId) {
        throw new BadRequestException(
          'You cannot open a personal ledger with yourself.',
        );
      }
      const ledger = await this.openPersonalLedger(
        userId,
        peer.id,
        input.baseCurrency,
      );
      return { ledger };
    }

    // peerName path: this person has no account (or the admin doesn't
    // know their email) — create a shadow member plus a claim link.
    const rawToken = randomBytes(24).toString('hex');
    const shadow = await prisma.user.create({
      data: {
        email: `shadow-${randomUUID()}@${SHADOW_EMAIL_DOMAIN}`,
        name: input.peerName!.trim(),
        isShadow: true,
        addedByUserId: userId,
        claimTokenHash: hashToken(rawToken),
        claimExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
      },
    });
    const ledger = await this.openPersonalLedger(
      userId,
      shadow.id,
      input.baseCurrency,
    );
    return { ledger, claimUrl: `${webBaseUrl}/claim/${rawToken}` };
  }

  private async openPersonalLedger(
    userId: string,
    peerId: string,
    baseCurrency: string,
  ): Promise<Ledger> {
    const [a, b] = [userId, peerId].sort();

    const existing = await prisma.ledger.findFirst({
      where: { type: 'personal', personalUserAId: a, personalUserBId: b },
    });
    if (existing) {
      return existing;
    }

    return prisma.$transaction(async (tx) => {
      const ledger = await tx.ledger.create({
        data: {
          type: 'personal',
          baseCurrency: baseCurrency.toUpperCase(),
          createdById: userId,
          personalUserAId: a,
          personalUserBId: b,
          members: {
            create: [
              { userId, role: 'owner' },
              { userId: peerId, role: 'member' },
            ],
          },
        },
      });

      const personalCount = await tx.ledger.count({
        where: { createdById: userId, type: 'personal' },
      });
      if (personalCount === 1) {
        await this.badges.award(tx, userId, 'peacemaker');
      }

      return ledger;
    });
  }

  // ------------------------------------------------------- Claim a shadow

  async getClaimInfo(rawToken: string) {
    const shadow = await this.findValidShadow(rawToken);
    const ledger = await prisma.ledger.findFirst({
      where: {
        type: 'personal',
        OR: [{ personalUserAId: shadow.id }, { personalUserBId: shadow.id }],
      },
      include: { createdBy: { select: { name: true } } },
    });

    return {
      shadowName: shadow.name,
      addedByName: ledger?.createdBy.name ?? null,
      ledgerName: ledger?.name ?? null,
    };
  }

  async redeemClaim(rawToken: string, claimerId: string) {
    const shadow = await this.findValidShadow(rawToken);
    if (shadow.id === claimerId) {
      throw new BadRequestException('You cannot claim your own contact.');
    }

    const ledger = await prisma.ledger.findFirst({
      where: {
        type: 'personal',
        OR: [{ personalUserAId: shadow.id }, { personalUserBId: shadow.id }],
      },
    });
    if (!ledger) {
      throw new NotFoundException(
        'The ledger for this contact no longer exists.',
      );
    }

    const alreadyMember = await this.access.getMembership(ledger.id, claimerId);
    if (alreadyMember) {
      throw new BadRequestException(
        'You are already part of this personal ledger.',
      );
    }

    const otherUserId =
      ledger.personalUserAId === shadow.id
        ? ledger.personalUserBId!
        : ledger.personalUserAId!;
    const [a, b] = [claimerId, otherUserId].sort();

    await prisma.$transaction([
      prisma.ledgerMember.update({
        where: { ledgerId_userId: { ledgerId: ledger.id, userId: shadow.id } },
        data: { userId: claimerId },
      }),
      prisma.ledger.update({
        where: { id: ledger.id },
        data: { personalUserAId: a, personalUserBId: b },
      }),
      prisma.expense.updateMany({
        where: { paidByUserId: shadow.id },
        data: { paidByUserId: claimerId },
      }),
      prisma.expense.updateMany({
        where: { createdById: shadow.id },
        data: { createdById: claimerId },
      }),
      prisma.expenseShare.updateMany({
        where: { userId: shadow.id },
        data: { userId: claimerId },
      }),
      prisma.settlement.updateMany({
        where: { fromUserId: shadow.id },
        data: { fromUserId: claimerId },
      }),
      prisma.settlement.updateMany({
        where: { toUserId: shadow.id },
        data: { toUserId: claimerId },
      }),
      prisma.activityEvent.updateMany({
        where: { actorId: shadow.id },
        data: { actorId: claimerId },
      }),
      prisma.activityEvent.create({
        data: {
          ledgerId: ledger.id,
          actorId: claimerId,
          type: 'member_joined',
          payload: { claimed: true },
        },
      }),
      prisma.user.delete({ where: { id: shadow.id } }),
    ]);

    return { ledgerId: ledger.id };
  }

  private async findValidShadow(rawToken: string) {
    const shadow = await prisma.user.findUnique({
      where: { claimTokenHash: hashToken(rawToken) },
    });
    if (
      !shadow ||
      !shadow.isShadow ||
      !shadow.claimExpiresAt ||
      shadow.claimExpiresAt < new Date()
    ) {
      throw new NotFoundException('This claim link is invalid or has expired.');
    }
    return shadow;
  }

  // ------------------------------------------------------------ Deletion

  /**
   * A ledger can only be deleted once it's still empty — zero expenses
   * and zero settlements recorded. That keeps deletion from ever being
   * used to erase real financial history; once money has moved, the
   * ledger is permanent.
   */
  async deleteLedger(ledgerId: string, userId: string): Promise<void> {
    await this.access.assertMember(ledgerId, userId);

    const [expenseCount, settlementCount] = await Promise.all([
      prisma.expense.count({ where: { ledgerId, deletedAt: null } }),
      prisma.settlement.count({ where: { ledgerId } }),
    ]);
    if (expenseCount > 0 || settlementCount > 0) {
      throw new BadRequestException(
        'This ledger already has activity recorded, so it can no longer be deleted.',
      );
    }

    await prisma.ledger.delete({ where: { id: ledgerId } });
  }
}
