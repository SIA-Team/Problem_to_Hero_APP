import React from 'react';
import userApi from '../services/api/userApi';
import {
  mergeLocalInviteUsers,
  normalizeFollowingInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';
import { DEFAULT_MENTION_SEARCH_LIMIT } from '../utils/mentionComposer';

const FOLLOWING_REQUEST = {
  pageNum: 1,
  page: 1,
  pageSize: 20,
  size: 20,
  limit: 20,
};

const FALLBACK_SEARCH_KEYWORDS = ['a', 'e', 'm', '1', '8'];

export default function useRecommendedMentionUsers({
  visible,
  scene = 'composer',
}) {
  const [recommendedMentionUsers, setRecommendedMentionUsers] = React.useState([]);

  React.useEffect(() => {
    if (!visible) {
      setRecommendedMentionUsers([]);
      return undefined;
    }

    let isActive = true;

    const loadRecommendedUsers = async () => {
      try {
        let mergedUsers = [];

        try {
          const response = await userApi.getFollowing(FOLLOWING_REQUEST);
          mergedUsers = mergeLocalInviteUsers(normalizeFollowingInviteUsers(response));
        } catch (followError) {
          console.warn(`Failed to load ${scene} mention following users:`, followError);
        }

        if (mergedUsers.length < 6) {
          const fallbackResults = await Promise.allSettled(
            FALLBACK_SEARCH_KEYWORDS.map(keyword => userApi.searchPublicProfiles(keyword, 10))
          );

          fallbackResults.forEach(result => {
            if (result.status !== 'fulfilled') {
              return;
            }

            mergedUsers = mergeLocalInviteUsers([
              ...mergedUsers,
              ...normalizePublicUserSearchResponse(result.value),
            ]);
          });
        }

        if (isActive) {
          setRecommendedMentionUsers(mergedUsers.slice(0, DEFAULT_MENTION_SEARCH_LIMIT));
        }
      } catch (error) {
        if (isActive) {
          console.warn(`Failed to load ${scene} mention recommended users:`, error);
          setRecommendedMentionUsers([]);
        }
      }
    };

    loadRecommendedUsers();

    return () => {
      isActive = false;
    };
  }, [scene, visible]);

  const resetRecommendedMentionUsers = React.useCallback(() => {
    setRecommendedMentionUsers([]);
  }, []);

  return {
    recommendedMentionUsers,
    resetRecommendedMentionUsers,
  };
}
