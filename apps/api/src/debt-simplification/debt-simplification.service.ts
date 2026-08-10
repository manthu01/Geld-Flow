import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@geld-flow/db';
import { LedgerAccessService } from '../common/ledger-access.service';
import { BalancesService } from '../balances/balances.service';
import { simplifyDebts, type SimplifiedTransfer } from './simplify-debts.util';

@Injectable()
export class DebtSimplificationService {
  constructor(
    private readonly access: LedgerAccessService,
    private readonly balances: BalancesService,
  ) {}

  async getSuggestions(
    ledgerId: string,
    userId: string,
  ): Promise<SimplifiedTransfer[]> {
    await this.access.assertMember(ledgerId, userId);

    const ledger = await prisma.ledger.findUnique({
      where: { id: ledgerId },
      select: { type: true },
    });
    if (!ledger) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.type === 'personal') {
      throw new BadRequestException(
        'Debt simplification only applies to group ledgers — a personal ledger is already just two people.',
      );
    }

    const balances = await this.balances.getBalances(ledgerId, userId);
    return simplifyDebts(balances);
  }
}
