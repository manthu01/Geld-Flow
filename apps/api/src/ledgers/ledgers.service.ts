import { randomBytes, createHash } from 'node:crypto';
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

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

const MEMBER_SELECT = {
  userId: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
} as const;

@Injectable()
export class LedgersService {
  constructor(private readonly access: LedgerAccessService) {}

  async createGroup(userId: string, input: CreateLedgerInput): Promise<Ledger> {
    if (input.type === 'personal') {
      throw new BadRequestException(
        'Personal ledgers are looked up via /ledgers/personal, not created directly.',
      );
    }

    return prisma.ledger.create({
      data: {
        type: input.type,
        name: input.name,
        baseCurrency: input.baseCurrency.toUpperCase(),
        createdById: userId,
        members: { create: { userId, role: 'owner' } },
      },
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
  ): Promise<Ledger> {
    const peer = await prisma.user.findUnique({
      where: { email: input.peerEmail },
    });
    if (!peer) {
      throw new NotFoundException(
        'No Geld Flow account found for that email yet — ask them to sign up first.',
      );
    }
    if (peer.id === userId) {
      throw new BadRequestException(
        'You cannot open a personal ledger with yourself.',
      );
    }

    const [a, b] = [userId, peer.id].sort();

    const existing = await prisma.ledger.findFirst({
      where: { type: 'personal', personalUserAId: a, personalUserBId: b },
    });
    if (existing) {
      return existing;
    }

    return prisma.ledger.create({
      data: {
        type: 'personal',
        baseCurrency: input.baseCurrency.toUpperCase(),
        createdById: userId,
        personalUserAId: a,
        personalUserBId: b,
        members: {
          create: [
            { userId, role: 'owner' },
            { userId: peer.id, role: 'member' },
          ],
        },
      },
    });
  }
}
