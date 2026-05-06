import {
  formatCompactRewardPoints,
  formatRewardPointsBadge,
  formatRewardPointsValue,
  resolveRewardPointsFromItem,
} from '../rewardPointsDisplay';

describe('rewardPointsDisplay utils', () => {
  describe('resolveRewardPointsFromItem', () => {
    it('converts bountyAmount cents into 1:1 dollar points', () => {
      expect(resolveRewardPointsFromItem({ bountyAmount: 5000, reward: 50 })).toBe(50);
    });

    it('falls back to reward amount as major-unit points', () => {
      expect(resolveRewardPointsFromItem({ reward: 12.34 })).toBe(12);
    });
  });

  describe('formatCompactRewardPoints', () => {
    it('keeps small Chinese values readable with grouping', () => {
      expect(formatCompactRewardPoints(5000, { locale: 'zh-CN' })).toBe('5,000');
      expect(formatCompactRewardPoints(12.5, { locale: 'zh-CN' })).toBe('12.5');
    });

    it('compresses large Chinese values into wan units', () => {
      expect(formatCompactRewardPoints(12500, { locale: 'zh-CN' })).toBe('1.3万');
    });

    it('compresses English values into K and M suffixes', () => {
      expect(formatCompactRewardPoints(2500, { locale: 'en-US' })).toBe('2.5K');
      expect(formatCompactRewardPoints(1250000, { locale: 'en-US' })).toBe('1.3M');
    });
  });

  describe('formatRewardPointsValue', () => {
    it('keeps smaller values uncompressed by default', () => {
      expect(formatRewardPointsValue(20, { locale: 'zh-CN' })).toBe('20积分');
      expect(formatRewardPointsValue(12.5, { locale: 'zh-CN' })).toBe('12.5积分');
      expect(formatRewardPointsValue(20, { locale: 'en-US' })).toBe('20 pts');
      expect(formatRewardPointsValue(12.5, { locale: 'en-US' })).toBe('12.5 pts');
    });

    it('compresses large values by default', () => {
      expect(formatRewardPointsValue(12500, { locale: 'zh-CN' })).toBe('1.3万积分');
      expect(formatRewardPointsValue(2500, { locale: 'en-US' })).toBe('2.5K pts');
    });

    it('can opt out of abbreviation when exact display is needed', () => {
      expect(formatRewardPointsValue(12500, { locale: 'zh-CN', abbreviated: false })).toBe('12,500积分');
      expect(formatRewardPointsValue(2500, { locale: 'en-US', abbreviated: false })).toBe('2,500 pts');
    });
  });

  describe('formatRewardPointsBadge', () => {
    it('builds a human-readable badge label for Chinese', () => {
      expect(formatRewardPointsBadge(12500, { locale: 'zh-CN' })).toBe('悬赏 1.3万积分');
    });

    it('builds a compact badge label for English', () => {
      expect(formatRewardPointsBadge(2500, { locale: 'en-US' })).toBe('Reward 2.5K pts');
    });
  });
});
