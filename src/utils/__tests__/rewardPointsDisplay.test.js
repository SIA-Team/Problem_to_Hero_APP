import {
  formatCompactRewardPoints,
  formatRewardPointsBadge,
  resolveRewardPointsFromItem,
} from '../rewardPointsDisplay';

describe('rewardPointsDisplay utils', () => {
  describe('resolveRewardPointsFromItem', () => {
    it('prefers raw bountyAmount so the public badge can show integer points', () => {
      expect(resolveRewardPointsFromItem({ bountyAmount: 5000, reward: 50 })).toBe(5000);
    });

    it('falls back to reward amount when only the major-unit value is available', () => {
      expect(resolveRewardPointsFromItem({ reward: 12.34 })).toBe(1234);
    });
  });

  describe('formatCompactRewardPoints', () => {
    it('keeps small Chinese values readable with grouping', () => {
      expect(formatCompactRewardPoints(5000, { locale: 'zh-CN' })).toBe('5,000');
    });

    it('compresses large Chinese values into wan units', () => {
      expect(formatCompactRewardPoints(12500, { locale: 'zh-CN' })).toBe('1.3万');
    });

    it('compresses English values into K and M suffixes', () => {
      expect(formatCompactRewardPoints(2500, { locale: 'en-US' })).toBe('2.5K');
      expect(formatCompactRewardPoints(1250000, { locale: 'en-US' })).toBe('1.3M');
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
