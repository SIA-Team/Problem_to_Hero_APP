import {
  centsToAmount,
  formatAmount,
  formatAmountValue,
  parseRewardAmountToCents,
  sanitizeAmountInput,
} from '../rewardAmount';

describe('rewardAmount utils', () => {
  describe('sanitizeAmountInput', () => {
    it('keeps only one decimal point and two decimal places', () => {
      expect(sanitizeAmountInput('0.019')).toBe('0.01');
      expect(sanitizeAmountInput('12.3.45')).toBe('12.34');
      expect(sanitizeAmountInput('.5')).toBe('0.5');
    });
  });

  describe('parseRewardAmountToCents', () => {
    it('accepts valid cent-based reward amounts', () => {
      expect(parseRewardAmountToCents('0.01')).toBe(1);
      expect(parseRewardAmountToCents('1')).toBe(100);
      expect(parseRewardAmountToCents('10.2')).toBe(1020);
    });

    it('rejects empty, zero, negative, and over-precision values', () => {
      expect(parseRewardAmountToCents('')).toBeNull();
      expect(parseRewardAmountToCents('0')).toBeNull();
      expect(parseRewardAmountToCents('0.00')).toBeNull();
      expect(parseRewardAmountToCents('-1')).toBeNull();
      expect(parseRewardAmountToCents('0.001')).toBeNull();
    });

    it('supports optional zero amounts when configured', () => {
      expect(
        parseRewardAmountToCents('', {
          required: false,
          allowZero: true,
        })
      ).toBe(0);
      expect(
        parseRewardAmountToCents('0', {
          required: false,
          allowZero: true,
        })
      ).toBe(0);
    });
  });

  describe('formatAmount', () => {
    it('formats integers without trailing decimals', () => {
      expect(formatAmount(1)).toBe('$1');
      expect(formatAmount(10)).toBe('$10');
    });

    it('formats decimals with up to two places and trims trailing zeros', () => {
      expect(formatAmount(0.01)).toBe('$0.01');
      expect(formatAmount(1.5)).toBe('$1.5');
      expect(formatAmount(10.2)).toBe('$10.2');
      expect(formatAmount('10.00')).toBe('$10');
    });
  });

  describe('formatAmountValue and centsToAmount', () => {
    it('converts cents to display-ready reward amounts', () => {
      expect(centsToAmount(1)).toBe(0.01);
      expect(centsToAmount(150)).toBe(1.5);
      expect(formatAmountValue(centsToAmount(1020))).toBe('10.2');
    });
  });
});
