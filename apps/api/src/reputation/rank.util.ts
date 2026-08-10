import type { Rank } from '@geld-flow/db';

/**
 * Positive-only: rank is driven entirely by a monotonically increasing
 * counter (confirmed settlements), so it can only ever go up, never
 * down. There is no penalty axis — the system rewards good behavior
 * instead of punishing bad behavior.
 */
const RANK_THRESHOLDS: readonly [
  minConfirmedSettlements: number,
  rank: Rank,
][] = [
  [50, 'V'],
  [25, 'IV'],
  [10, 'III'],
  [3, 'II'],
  [0, 'I'],
];

export function computeRank(confirmedSettlements: number): Rank {
  for (const [threshold, rank] of RANK_THRESHOLDS) {
    if (confirmedSettlements >= threshold) return rank;
  }
  return 'I';
}
