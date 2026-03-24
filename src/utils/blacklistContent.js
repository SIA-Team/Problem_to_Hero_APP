import { clearTabCache } from './dataLoader';

const QUESTION_TABS_TO_INVALIDATE = ['recommend', 'hot', 'follow'];

export const invalidateBlacklistRelatedCaches = async () => {
  await Promise.allSettled(
    QUESTION_TABS_TO_INVALIDATE.map((tabType) => clearTabCache(tabType))
  );
};
