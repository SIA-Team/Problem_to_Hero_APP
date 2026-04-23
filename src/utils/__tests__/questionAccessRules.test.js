import {
  getQuestionAdoptRate,
  getQuestionPayViewAmount,
  isQuestionSolvedByAdoptRate,
  normalizeQuestionAdoptRate,
  shouldRequirePaidQuestionAccess,
} from '../questionAccessRules';

describe('questionAccessRules', () => {
  it('normalizes adopt rate from backend fields without falling back to fake values', () => {
    expect(normalizeQuestionAdoptRate(undefined)).toBe(0);
    expect(normalizeQuestionAdoptRate(null)).toBe(0);
    expect(normalizeQuestionAdoptRate('0')).toBe(0);
    expect(normalizeQuestionAdoptRate('49.6')).toBe(50);
    expect(getQuestionAdoptRate({ adoptRate: 32 })).toBe(32);
    expect(getQuestionAdoptRate({ solvedPercent: '18' })).toBe(18);
  });

  it('treats adopt rate >= 50 as solved', () => {
    expect(isQuestionSolvedByAdoptRate({ adoptRate: 49 })).toBe(false);
    expect(isQuestionSolvedByAdoptRate({ adoptRate: 50 })).toBe(true);
    expect(isQuestionSolvedByAdoptRate({ solvedPercent: 88 })).toBe(true);
  });

  it('requires paid access only for solved questions with a payViewAmount', () => {
    expect(shouldRequirePaidQuestionAccess({ adoptRate: 49, payViewAmount: 100 })).toBe(false);
    expect(shouldRequirePaidQuestionAccess({ adoptRate: 50, payViewAmount: 0 })).toBe(false);
    expect(shouldRequirePaidQuestionAccess({ adoptRate: 50, payViewAmount: 1 })).toBe(true);
  });
});
