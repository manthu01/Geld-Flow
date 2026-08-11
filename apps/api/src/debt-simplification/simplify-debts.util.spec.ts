import { simplifyDebts } from './simplify-debts.util';

// Reconstructs, per user, the net balance implied by a transfer set — a
// toUserId was owed the amount (positive), a fromUserId owed it
// (negative) — so this should reproduce the original netBalance inputs.
function sumByUser(
  transfers: { fromUserId: string; toUserId: string; amount: number }[],
) {
  const net = new Map<string, number>();
  for (const t of transfers) {
    net.set(t.toUserId, (net.get(t.toUserId) ?? 0) + t.amount);
    net.set(t.fromUserId, (net.get(t.fromUserId) ?? 0) - t.amount);
  }
  return net;
}

describe('simplifyDebts', () => {
  it('returns nothing when everyone is already settled', () => {
    const result = simplifyDebts([
      { userId: 'a', netBalance: 0 },
      { userId: 'b', netBalance: 0 },
    ]);
    expect(result).toEqual([]);
  });

  it('produces a single transfer for a simple two-person imbalance', () => {
    const result = simplifyDebts([
      { userId: 'a', netBalance: 50 },
      { userId: 'b', netBalance: -50 },
    ]);
    expect(result).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 50 }]);
  });

  it('never produces more than n-1 transfers for n participants', () => {
    const balances = [
      { userId: 'a', netBalance: 300 },
      { userId: 'b', netBalance: -100 },
      { userId: 'c', netBalance: -100 },
      { userId: 'd', netBalance: -100 },
    ];
    const result = simplifyDebts(balances);
    expect(result.length).toBeLessThanOrEqual(balances.length - 1);
  });

  it('settles every debtor against the sole creditor when one person is owed by everyone', () => {
    const result = simplifyDebts([
      { userId: 'alice', netBalance: 300 },
      { userId: 'bob', netBalance: -100 },
      { userId: 'carol', netBalance: -100 },
      { userId: 'dave', netBalance: -100 },
    ]);
    expect(result).toHaveLength(3);
    expect(result.every((t) => t.toUserId === 'alice')).toBe(true);
    expect(result.every((t) => t.amount === 100)).toBe(true);
  });

  it('produces a transfer set whose net effect matches the original balances exactly', () => {
    const balances = [
      { userId: 'a', netBalance: 120.5 },
      { userId: 'b', netBalance: -40.25 },
      { userId: 'c', netBalance: -80.25 },
    ];
    const result = simplifyDebts(balances);
    const net = sumByUser(result);
    for (const b of balances) {
      expect(net.get(b.userId) ?? 0).toBeCloseTo(b.netBalance, 2);
    }
  });

  it('ignores members who are already at zero', () => {
    const result = simplifyDebts([
      { userId: 'a', netBalance: 10 },
      { userId: 'b', netBalance: -10 },
      { userId: 'c', netBalance: 0 },
    ]);
    expect(
      result.every((t) => t.fromUserId !== 'c' && t.toUserId !== 'c'),
    ).toBe(true);
  });
});
