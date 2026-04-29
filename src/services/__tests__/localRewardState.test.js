jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  createEmptyLocalRewardState,
  mergeQuestionWithLocalRewardState,
  normalizeLocalRewardStateEntry,
} from '../localRewardState';

describe('localRewardState helpers', () => {
  it('normalizes invalid local reward state safely', () => {
    expect(normalizeLocalRewardStateEntry(null)).toEqual(createEmptyLocalRewardState());
  });

  it('merges local added amount and unique contributor count into question detail', () => {
    const mergedQuestion = mergeQuestionWithLocalRewardState(
      {
        bountyAmount: 100,
        reward: 1,
        rewardContributorCount: 2,
        rewardContributorUserIds: ['u-1', 'u-2'],
        __baseBountyAmount: 100,
        __baseRewardContributorCount: 2,
        __baseRewardContributorUserIds: ['u-1', 'u-2'],
      },
      {
        totalAddedAmount: 0.75,
        contributors: [
          { id: 'c-1', userId: 'u-3', name: 'Alice', amount: 0.5, time: '刚刚' },
          { id: 'c-2', userId: 'u-2', name: 'Bob', amount: 0.25, time: '刚刚' },
        ],
      }
    );

    expect(mergedQuestion.bountyAmount).toBe(175);
    expect(mergedQuestion.reward).toBe(1.75);
    expect(mergedQuestion.rewardContributorCount).toBe(3);
    expect(mergedQuestion.rewardContributorUserIds).toEqual(['u-1', 'u-2', 'u-3']);
  });

  it('uses base reward fields to avoid repeated additive merges', () => {
    const baseQuestion = {
      bountyAmount: 100,
      reward: 1,
      rewardContributorCount: 1,
      rewardContributorUserIds: ['u-1'],
      __baseBountyAmount: 100,
      __baseRewardContributorCount: 1,
      __baseRewardContributorUserIds: ['u-1'],
    };
    const localRewardState = {
      totalAddedAmount: 0.5,
      contributors: [{ id: 'c-1', userId: 'u-2', name: 'Alice', amount: 0.5, time: '刚刚' }],
    };

    const firstMerge = mergeQuestionWithLocalRewardState(baseQuestion, localRewardState);
    const secondMerge = mergeQuestionWithLocalRewardState(firstMerge, localRewardState);

    expect(firstMerge.bountyAmount).toBe(150);
    expect(secondMerge.bountyAmount).toBe(150);
    expect(secondMerge.rewardContributorCount).toBe(2);
  });
});
