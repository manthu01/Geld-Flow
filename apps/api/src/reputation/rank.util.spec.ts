import { computeRank } from './rank.util';

describe('computeRank', () => {
  it.each([
    [0, 'I'],
    [2, 'I'],
    [3, 'II'],
    [9, 'II'],
    [10, 'III'],
    [24, 'III'],
    [25, 'IV'],
    [49, 'IV'],
    [50, 'V'],
    [1000, 'V'],
  ] as const)('maps %i confirmed settlements to rank %s', (count, expected) => {
    expect(computeRank(count)).toBe(expected);
  });

  it('never decreases for a growing count (monotonic ladder)', () => {
    let previousRankIndex = -1;
    const order = ['I', 'II', 'III', 'IV', 'V'];
    for (let count = 0; count <= 60; count++) {
      const rankIndex = order.indexOf(computeRank(count));
      expect(rankIndex).toBeGreaterThanOrEqual(previousRankIndex);
      previousRankIndex = rankIndex;
    }
  });
});
