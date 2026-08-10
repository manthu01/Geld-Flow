export interface SimplifiedTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * Reduces a group's net balances to a minimal-ish set of transfers that
 * settle everyone, via the standard greedy largest-creditor/
 * largest-debtor match. Finding the true minimum is NP-hard in general;
 * greedy is what every Splitwise-like app actually ships, and it's
 * provably at most n-1 transfers for n participants. Pure and
 * DB-free by design — kept extractable in case this ever needs to move
 * out of the request path (e.g. a background recompute job).
 */
export function simplifyDebts(
  balances: { userId: string; netBalance: number }[],
): SimplifiedTransfer[] {
  const CENTS = 100;
  const creditors: { userId: string; cents: number }[] = [];
  const debtors: { userId: string; cents: number }[] = [];

  for (const b of balances) {
    const cents = Math.round(b.netBalance * CENTS);
    if (cents > 0) creditors.push({ userId: b.userId, cents });
    else if (cents < 0) debtors.push({ userId: b.userId, cents: -cents });
  }

  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers: SimplifiedTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amountCents = Math.min(debtor.cents, creditor.cents);

    transfers.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: amountCents / CENTS,
    });

    debtor.cents -= amountCents;
    creditor.cents -= amountCents;
    if (debtor.cents === 0) i++;
    if (creditor.cents === 0) j++;
  }

  return transfers;
}
