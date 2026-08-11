import { BadRequestException } from '@nestjs/common';
import { computeShares } from './split.util';

describe('computeShares', () => {
  describe('equal', () => {
    it('splits evenly when the total divides cleanly', () => {
      const result = computeShares(100, 'equal', [
        { userId: 'a' },
        { userId: 'b' },
      ]);
      expect(result).toEqual([
        { userId: 'a', shareAmount: 50, sharePercentage: null },
        { userId: 'b', shareAmount: 50, sharePercentage: null },
      ]);
    });

    it('distributes the remainder cent-by-cent instead of losing it to rounding', () => {
      // $100.00 / 3 = $33.33...; the shares must still sum to exactly 100.
      const result = computeShares(100, 'equal', [
        { userId: 'a' },
        { userId: 'b' },
        { userId: 'c' },
      ]);
      const total = result.reduce((sum, s) => sum + s.shareAmount, 0);
      expect(total).toBeCloseTo(100, 2);
      expect(result.map((s) => s.shareAmount)).toEqual([33.34, 33.33, 33.33]);
    });

    it('gives the whole amount to a single participant', () => {
      const result = computeShares(42.5, 'equal', [{ userId: 'solo' }]);
      expect(result).toEqual([
        { userId: 'solo', shareAmount: 42.5, sharePercentage: null },
      ]);
    });
  });

  describe('exact', () => {
    it('uses the provided amounts as-is when they sum to the total', () => {
      const result = computeShares(100, 'exact', [
        { userId: 'a', amount: 60 },
        { userId: 'b', amount: 40 },
      ]);
      expect(result).toEqual([
        { userId: 'a', shareAmount: 60, sharePercentage: null },
        { userId: 'b', shareAmount: 40, sharePercentage: null },
      ]);
    });

    it('rejects shares that do not add up to the total', () => {
      expect(() =>
        computeShares(100, 'exact', [
          { userId: 'a', amount: 60 },
          { userId: 'b', amount: 30 },
        ]),
      ).toThrow(BadRequestException);
    });

    it('tolerates a single cent of float rounding slop', () => {
      const result = computeShares(10, 'exact', [
        { userId: 'a', amount: 3.33 },
        { userId: 'b', amount: 3.33 },
        { userId: 'c', amount: 3.34 },
      ]);
      expect(result.reduce((sum, s) => sum + s.shareAmount, 0)).toBeCloseTo(
        10,
        2,
      );
    });
  });

  describe('percentage', () => {
    it('splits by percentage and the last share absorbs any rounding remainder', () => {
      // 33.33% + 33.33% + 33.34% of $10.01 must still total exactly $10.01.
      const result = computeShares(10.01, 'percentage', [
        { userId: 'a', percentage: 33.33 },
        { userId: 'b', percentage: 33.33 },
        { userId: 'c', percentage: 33.34 },
      ]);
      const total = result.reduce((sum, s) => sum + s.shareAmount, 0);
      expect(total).toBeCloseTo(10.01, 2);
    });

    it('rejects percentages that do not sum to 100', () => {
      expect(() =>
        computeShares(100, 'percentage', [
          { userId: 'a', percentage: 50 },
          { userId: 'b', percentage: 40 },
        ]),
      ).toThrow(BadRequestException);
    });

    it('records the stated percentage alongside the computed amount', () => {
      const result = computeShares(100, 'percentage', [
        { userId: 'a', percentage: 25 },
        { userId: 'b', percentage: 75 },
      ]);
      expect(result).toEqual([
        { userId: 'a', shareAmount: 25, sharePercentage: 25 },
        { userId: 'b', shareAmount: 75, sharePercentage: 75 },
      ]);
    });
  });
});
