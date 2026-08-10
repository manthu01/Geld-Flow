import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma, type LedgerMember, type LedgerRole } from '@geld-flow/db';

/**
 * Membership/role checks shared by every ledger-scoped feature (expenses,
 * settlements, activity, invites). Centralized here so "is this user
 * allowed to touch this ledger" is answered the same way everywhere,
 * rather than each module re-deriving it.
 */
@Injectable()
export class LedgerAccessService {
  async getMembership(
    ledgerId: string,
    userId: string,
  ): Promise<LedgerMember | null> {
    return prisma.ledgerMember.findUnique({
      where: { ledgerId_userId: { ledgerId, userId } },
    });
  }

  async assertMember(ledgerId: string, userId: string): Promise<LedgerMember> {
    const membership = await this.getMembership(ledgerId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this ledger.');
    }
    return membership;
  }

  async assertRole(
    ledgerId: string,
    userId: string,
    roles: LedgerRole[],
  ): Promise<LedgerMember> {
    const membership = await this.assertMember(ledgerId, userId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to do this.');
    }
    return membership;
  }
}
