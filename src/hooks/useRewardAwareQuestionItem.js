import { useEffect, useState } from 'react';
import {
  getQuestionLocalRewardState,
  mergeQuestionWithLocalRewardState,
} from '../services/localRewardState';

const normalizeQuestionIdentity = item =>
  String(item?.id ?? item?.questionId ?? '').trim();

export default function useRewardAwareQuestionItem(item) {
  const [mergedItem, setMergedItem] = useState(item);

  useEffect(() => {
    setMergedItem(item);
  }, [item]);

  useEffect(() => {
    let isActive = true;
    const questionId = normalizeQuestionIdentity(item);

    if (!questionId || !item || typeof item !== 'object') {
      return () => {
        isActive = false;
      };
    }

    const hydrateRewardState = async () => {
      const localRewardState = await getQuestionLocalRewardState(questionId);
      if (!isActive) {
        return;
      }

      const hasLocalRewardState =
        Number(localRewardState?.totalAddedAmount || 0) > 0 ||
        (Array.isArray(localRewardState?.contributors) && localRewardState.contributors.length > 0);

      setMergedItem(
        hasLocalRewardState
          ? mergeQuestionWithLocalRewardState(item, localRewardState)
          : item
      );
    };

    hydrateRewardState().catch(error => {
      console.warn('Failed to hydrate question reward state for list item:', error);
      if (isActive) {
        setMergedItem(item);
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    item,
    item?.id,
    item?.questionId,
    item?.bountyAmount,
    item?.reward,
    item?.rewardContributorCount,
    item?.rewardContributorUserIds,
  ]);

  return mergedItem || item;
}
