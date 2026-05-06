import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/useTranslation';
import PublicProfileHeader from '../components/PublicProfileHeader';
import ContentTabs from '../components/ContentTabs';
import QuestionListItem from '../components/QuestionListItem';
import AnswerListItem from '../components/AnswerListItem';
import UserContentSearchModal from '../components/UserContentSearchModal';
import PublicProfileHero from '../components/PublicProfileHero';
import userApi from '../services/api/userApi';
import blacklistApi from '../services/api/blacklistApi';
import { addBlockedUser, removeBlockedUser } from '../services/blacklistState';
import { getFollowState, setFollowState } from '../services/followState';
import {
  refreshMyFollowingCount,
} from '../services/myFollowingCountState';
import {
  isPublicProfileAnswersEndpointPendingError,
  loadProfileAnswersPage,
} from '../services/profileAnswers';
import UserCacheService from '../services/UserCacheService';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import { invalidateBlacklistRelatedCaches } from '../utils/blacklistContent';
import { buildExpertiseSummary, getUserExpertisePreferences } from '../utils/expertisePreferences';

import { scaleFont } from '../utils/responsive';
const PROFILE_ANSWER_PAGE_SIZE = 10;
const EMPTY_TAB_PAGES = {
  questions: 1,
  answers: 1,
};

const EMPTY_HAS_MORE = {
  questions: false,
  answers: false,
};

const FALLBACK_LOADED_TABS = new Set(['questions', 'answers']);

const resolveProfilePayload = response => {
  if (!response || typeof response !== 'object') {
    return {};
  }

  if (
    response.data &&
    typeof response.data === 'object' &&
    !Array.isArray(response.data) &&
    response.data.userBaseInfo &&
    typeof response.data.userBaseInfo === 'object'
  ) {
    return response.data.userBaseInfo;
  }

  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response.userBaseInfo && typeof response.userBaseInfo === 'object') {
    return response.userBaseInfo;
  }

  return response;
};

const normalizeVerification = profile => {
  const verifiedValue = profile?.verified;
  const numericVerified = Number(verifiedValue);
  const verified =
    verifiedValue === true ||
    numericVerified === 1 ||
    (Number.isFinite(numericVerified) && numericVerified > 0);

  return {
    verified,
    type: profile?.verificationType || profile?.verifyType || 'personal',
    text: profile?.verificationText || (verified ? '已认证' : ''),
  };
};

const normalizeGender = profile => {
  const rawGender = profile?.gender ?? profile?.sex;

  if (rawGender === 'male' || rawGender === '0' || rawGender === 0) {
    return 'male';
  }

  if (rawGender === 'female' || rawGender === '1' || rawGender === 1) {
    return 'female';
  }

  return null;
};

const summarizeExpertiseNames = names => {
  const normalizedNames = Array.from(
    new Set(
      (Array.isArray(names) ? names : [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
    )
  );

  if (normalizedNames.length === 0) {
    return '';
  }

  if (normalizedNames.length <= 2) {
    return normalizedNames.join(' / ');
  }

  return `${normalizedNames[0]} / ${normalizedNames[1]} 等${normalizedNames.length}项`;
};

const resolveProfileExpertiseSummary = profile => {
  const directSummary = [
    profile?.expertiseSummary,
    profile?.expertise,
    profile?.specialty,
    profile?.speciality,
    profile?.goodAt,
    profile?.skill,
  ].find(value => typeof value === 'string' && value.trim());

  if (directSummary) {
    return String(directSummary).trim();
  }

  const arraySummary = summarizeExpertiseNames([
    ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ...(Array.isArray(profile?.expertiseTags) ? profile.expertiseTags : []),
    ...(Array.isArray(profile?.tagNames) ? profile.tagNames : []),
    ...(Array.isArray(profile?.tags)
      ? profile.tags.map(tag => (typeof tag === 'string' ? tag : tag?.name || tag?.label))
      : []),
  ]);

  if (arraySummary) {
    return arraySummary;
  }

  const normalizedFromPreferences = buildExpertiseSummary({
    level1: Array.isArray(profile?.expertiseLevel1) ? profile.expertiseLevel1 : profile?.level1,
    level2: Array.isArray(profile?.expertiseLevel2) ? profile.expertiseLevel2 : profile?.level2,
  });

  return normalizedFromPreferences === '未设置' ? '' : normalizedFromPreferences;
};

const buildProfileViewModel = (profile, fallbackUserId) => {
  const resolvedUserId = String(profile?.userId ?? profile?.id ?? fallbackUserId ?? '');
  const likeCount = Number(profile?.likeCount ?? 0) || 0;
  const fanCount = Number(profile?.fanCount ?? 0) || 0;
  const followCount = Number(profile?.followCount ?? 0) || 0;
  const answerCount = Number(profile?.answerCount ?? 0) || 0;
  const verification = normalizeVerification(profile);

  return {
    id: resolvedUserId,
    userId: resolvedUserId,
    username:
      profile?.nickName ||
      profile?.nickname ||
      profile?.userName ||
      profile?.authorNickName ||
      profile?.username ||
      '匿名用户',
    avatar: profile?.avatar || profile?.authorAvatar || profile?.userAvatar || null,
    coverImage: profile?.coverImage || profile?.cover || profile?.backgroundImage || null,
    bio: profile?.signature || profile?.bio || '',
    occupation: profile?.profession || profile?.occupation || '',
    location: profile?.location || '',
    expertiseSummary: resolveProfileExpertiseSummary(profile),
    gender: normalizeGender(profile),
    verification,
    statsItems: [
      { key: 'likes', label: '点赞', value: likeCount, pressType: 'likes' },
      { key: 'followers', label: '粉丝', value: fanCount, pressType: 'followers' },
      { key: 'following', label: '关注', value: followCount, pressType: 'following' },
      { key: 'answers', label: '回答', value: answerCount, pressType: 'answers' },
    ],
  };
};

const buildRouteFallbackProfile = routeParams => {
  const fallbackUserId = String(routeParams?.userId ?? routeParams?.id ?? '').trim();
  const fallbackName = String(routeParams?.name ?? routeParams?.username ?? '').trim();
  const fallbackAvatar = String(routeParams?.avatar ?? '').trim();
  const fallbackRole = String(routeParams?.role ?? routeParams?.occupation ?? '').trim();
  const fallbackBio = String(routeParams?.bio ?? '').trim();
  const fallbackLocation = String(routeParams?.location ?? '').trim();
  const fallbackExpertise = String(
    routeParams?.expertiseSummary ?? routeParams?.expertise ?? routeParams?.skill ?? ''
  ).trim();

  if (!fallbackUserId && !fallbackName && !fallbackAvatar) {
    return null;
  }

  const fallbackProfile = buildProfileViewModel(
    {
      userId: fallbackUserId,
      nickName: fallbackName,
      avatar: fallbackAvatar,
      profession: fallbackRole,
      signature: fallbackBio,
      location: fallbackLocation,
      likeCount: 0,
      fanCount: 0,
      followCount: 0,
      answerCount: 0,
    },
    fallbackUserId || 'mock-user'
  );

  return {
    ...fallbackProfile,
    username: fallbackName || fallbackProfile.username,
    avatar: fallbackAvatar || fallbackProfile.avatar,
    occupation: fallbackRole || fallbackProfile.occupation,
    bio: fallbackBio || fallbackProfile.bio,
    location: fallbackLocation || fallbackProfile.location,
    expertiseSummary: fallbackExpertise || fallbackProfile.expertiseSummary,
    statsItems: fallbackProfile.statsItems.map(item => ({
      ...item,
      value: 0,
    })),
  };
};

const resolveBlacklistStatus = (blacklistItems, targetUserId) => {
  const normalizedTargetUserId = String(targetUserId ?? '');

  if (!normalizedTargetUserId || !Array.isArray(blacklistItems)) {
    return false;
  }

  return blacklistItems.some(item => {
    const normalizedBlockedUserId = String(item?.blockedUserId ?? item?.blockedUid ?? item?.userId ?? '');
    return normalizedBlockedUserId === normalizedTargetUserId;
  });
};

const normalizeBlockedUserId = value => {
  const normalizedValue = String(value ?? '').trim();
  return /^\d+$/.test(normalizedValue) ? normalizedValue : '';
};

const normalizeFollowRequestUserId = value => {
  const normalizedValue = String(value ?? '').trim();

  if (!normalizedValue) {
    return '';
  }

  return normalizedValue;
};

const resolveFollowStateValue = value => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'follow', 'followed', 'following'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'unfollow', 'unfollowed', 'none'].includes(normalizedValue)) {
      return false;
    }
  }

  return null;
};

const resolveInitialFollowState = (...sources) => {
  const candidateKeys = [
    'isFollowing',
    'following',
    'isFollowed',
    'followed',
    'hasFollowed',
    'hasFollow',
    'followStatus',
    'relationStatus',
    'relationType',
  ];

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const key of candidateKeys) {
      const resolvedValue = resolveFollowStateValue(source[key]);
      if (resolvedValue !== null) {
        return resolvedValue;
      }
    }

    if (source.data && typeof source.data === 'object') {
      const nestedResolvedValue = resolveInitialFollowState(source.data);
      if (nestedResolvedValue !== null) {
        return nestedResolvedValue;
      }
    }

    if (source.userBaseInfo && typeof source.userBaseInfo === 'object') {
      const nestedResolvedValue = resolveInitialFollowState(source.userBaseInfo);
      if (nestedResolvedValue !== null) {
        return nestedResolvedValue;
      }
    }
  }

  return null;
};

const resolveFollowerCountFromResponse = response => {
  const candidates = [
    response?.data?.followersCount,
    response?.data?.fanCount,
    response?.data?.fansCount,
    response?.data?.followerCount,
    response?.data?.followedCount,
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
};

const updateFollowerStat = (profile, nextFollowState, response) => {
  if (!profile || !Array.isArray(profile.statsItems)) {
    return profile;
  }

  const nextFollowerCountFromResponse = resolveFollowerCountFromResponse(response);
  const currentFollowerCount =
    Number(profile.statsItems.find(item => item.key === 'followers')?.value ?? 0) || 0;
  const nextFollowerCount =
    nextFollowerCountFromResponse !== null
      ? nextFollowerCountFromResponse
      : Math.max(0, currentFollowerCount + (nextFollowState ? 1 : -1));

  return {
    ...profile,
    statsItems: profile.statsItems.map(item =>
      item.key === 'followers'
        ? {
            ...item,
            value: nextFollowerCount,
          }
        : item
    ),
  };
};

const overrideStatsItemValue = (profile, statKey, nextValue) => {
  if (!profile || !Array.isArray(profile.statsItems)) {
    return profile;
  }

  return {
    ...profile,
    statsItems: profile.statsItems.map(item =>
      item.key === statKey
        ? {
            ...item,
            value: nextValue,
          }
        : item
    ),
  };
};

export default function PublicProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeParams = route?.params || {};
  const { userId } = routeParams;
  const routeFallbackProfile = useMemo(() => buildRouteFallbackProfile(routeParams), [routeParams]);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [questionsData, setQuestionsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [tabPages, setTabPages] = useState(EMPTY_TAB_PAGES);
  const [tabHasMore, setTabHasMore] = useState(EMPTY_HAS_MORE);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [isBlacklistSubmitting, setIsBlacklistSubmitting] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isRouteFallbackActive, setIsRouteFallbackActive] = useState(false);
  const [answersEmptyMessage, setAnswersEmptyMessage] = useState('');

  const isOwnProfile = useMemo(
    () => String(currentUserId || '') !== '' && String(currentUserId) === String(userId),
    [currentUserId, userId]
  );

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (isBlacklisted || isRouteFallbackActive) {
      return;
    }

    if (!loadedTabs.has(activeTab)) {
      loadContentData(activeTab, 1);
    }
  }, [activeTab, loadedTabs, isBlacklisted]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [cachedProfile, blacklistItems] = await Promise.all([
        UserCacheService.getUserProfile(),
        blacklistApi.getBlacklist().catch(blacklistError => {
          console.error('Load blacklist status failed:', blacklistError);
          return [];
        }),
      ]);

      const currentProfile =
        cachedProfile || (await UserCacheService.fetchAndCacheUserProfile(true));
      const nextCurrentUserId = currentProfile?.userId ? String(currentProfile.userId) : null;
      const normalizedRouteUserId = String(userId ?? '').trim();
      const nextIsOwnProfile =
        String(nextCurrentUserId || '') !== '' &&
        normalizedRouteUserId !== '' &&
        String(nextCurrentUserId) === normalizedRouteUserId;

      const profileResponse = nextIsOwnProfile || !normalizedRouteUserId
        ? await userApi.getProfile()
        : await userApi.getPublicProfile(normalizedRouteUserId);
      const profilePayload = resolveProfilePayload(profileResponse);
      let nextUserData = buildProfileViewModel(
        profilePayload,
        nextIsOwnProfile ? nextCurrentUserId : normalizedRouteUserId
      );
      const nextIsBlacklisted = nextIsOwnProfile
        ? false
        : resolveBlacklistStatus(blacklistItems, nextUserData.userId || userId);
      let followStatusResponse = null;

      if (!nextIsOwnProfile) {
        followStatusResponse = await userApi
          .getFollowStatus(normalizeFollowRequestUserId(nextUserData.userId || userId))
          .catch(followStatusError => {
            console.error('Load follow status failed:', followStatusError);
            return null;
          });
      }

      const cachedFollowState = nextIsOwnProfile ? false : getFollowState(nextUserData.userId || userId);
      const resolvedFollowStatusFromApi = resolveInitialFollowState(
        followStatusResponse?.data,
        followStatusResponse,
        profileResponse,
        profilePayload
      );

      const nextIsFollowing = nextIsOwnProfile
        ? false
        : (resolvedFollowStatusFromApi ?? cachedFollowState) ?? false;

      if (__DEV__) {
        console.log('[PublicProfile] raw response:', profileResponse);
        console.log('[PublicProfile] follow status response:', followStatusResponse);
        console.log('[PublicProfile] cached follow state:', cachedFollowState);
        console.log('[PublicProfile] resolved payload:', profilePayload);
        console.log('[PublicProfile] mapped fields:', {
          username: nextUserData.username,
          bio: nextUserData.bio,
          occupation: nextUserData.occupation,
          location: nextUserData.location,
          verification: nextUserData.verification,
          statsItems: nextUserData.statsItems,
          isFollowing: nextIsFollowing,
          isBlacklisted: nextIsBlacklisted,
          blacklistTargetUserId: nextUserData.userId || userId,
          blacklistBlockedUserIds: Array.isArray(blacklistItems)
            ? blacklistItems.map(item => String(item?.blockedUserId ?? item?.blockedUid ?? item?.userId ?? ''))
            : [],
        });
      }

      if (!nextUserData.expertiseSummary) {
        try {
          const storedPreferences = await getUserExpertisePreferences(nextUserData.userId);
          const storedSummary = buildExpertiseSummary(storedPreferences);
          if (storedSummary && storedSummary !== '未设置') {
            nextUserData = {
              ...nextUserData,
              expertiseSummary: storedSummary,
            };
          }
        } catch (expertiseError) {
          console.error('Load public profile expertise summary failed:', expertiseError);
        }
      }

      setCurrentUserId(nextCurrentUserId);
      setUserData(nextUserData);
      setIsFollowing(nextIsFollowing);
      setQuestionsData([]);
      setAnswersData([]);
      setAnswersEmptyMessage('');
      setIsTabLoading(false);
      setIsBlacklisted(nextIsBlacklisted);
      setIsRouteFallbackActive(false);
      setLoadedTabs(new Set());
      setTabPages(EMPTY_TAB_PAGES);
      setTabHasMore(EMPTY_HAS_MORE);
    } catch (err) {
      if (routeFallbackProfile) {
        setCurrentUserId(null);
        setUserData(routeFallbackProfile);
        setIsFollowing(false);
        setQuestionsData([]);
        setAnswersData([]);
        setAnswersEmptyMessage('');
        setIsTabLoading(false);
        setIsBlacklisted(false);
        setIsRouteFallbackActive(true);
        setLoadedTabs(new Set(FALLBACK_LOADED_TABS));
        setTabPages(EMPTY_TAB_PAGES);
        setTabHasMore(EMPTY_HAS_MORE);
        setError(null);
        return;
      }
      setError(err?.message || '加载失败');
    } finally {
      setIsLoading(false);
      setIsTabLoading(false);
      setIsLoadingMore(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [userId])
  );

  const handleRetry = () => {
    loadUserData();
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleStatPress = type => {
    if (type === 'followers' && isOwnProfile) {
      navigation.navigate('Fans', {
        isOwnList: true,
        userId: String(currentUserId || userData?.userId || userId || ''),
      });
      return;
    }

    if (type === 'following' && isOwnProfile) {
      navigation.navigate('Follow');
      return;
    }

    // 处理查看其他用户的关注列表
    if (type === 'following' && !isOwnProfile) {
      navigation.navigate('UserFollowing', {
        userId: String(userData?.userId || userId || ''),
        username: userData?.username || '用户',
      });
      return;
    }

    if (type === 'followers' && !isOwnProfile) {
      navigation.navigate('Fans', {
        isOwnList: false,
        userId: String(userData?.userId || userId || ''),
        profileName: userData?.username || '用户',
      });
      return;
    }

    const labelMap = {
      likes: '点赞',
      followers: '粉丝',
      following: '关注',
      answers: '回答',
    };

    showToast(`${labelMap[type] || '统计'}功能开发中`, 'info');
  };

  const handleShare = () => {
    const profileName = userData?.username || '用户';

    Share.share({
      title: profileName,
      message: `${profileName} 的公开主页`,
    }).catch(() => {
      showToast('分享失败，请稍后重试', 'error');
    });
  };

  const confirmAddToBlacklist = blockedUserId => {
    if (isBlacklistSubmitting) {
      return;
    }

    showAppAlert(
      '加入黑名单',
      `确定将 ${userData?.username || '该用户'} 加入黑名单吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBlacklistSubmitting(true);
              const response = await blacklistApi.addToBlacklist(blockedUserId);

              if (response?.code === 200) {
                addBlockedUser(blockedUserId);
                await invalidateBlacklistRelatedCaches();
                setIsBlacklisted(true);
                setQuestionsData([]);
                setAnswersData([]);
                setAnswersEmptyMessage('');
                setLoadedTabs(new Set());
                setTabHasMore(EMPTY_HAS_MORE);
                showToast(response?.msg || '已加入黑名单', 'success');
                return;
              }

              showToast(response?.msg || '加入黑名单失败，请稍后重试', 'error');
            } catch (blacklistError) {
              showToast(blacklistError?.message || '加入黑名单失败，请稍后重试', 'error');
            } finally {
              setIsBlacklistSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const confirmRemoveFromBlacklist = blockedUserId => {
    if (isBlacklistSubmitting) {
      return;
    }

    showAppAlert(
      '移除黑名单',
      `确定将 ${userData?.username || '该用户'} 移出黑名单吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBlacklistSubmitting(true);
              const response = await blacklistApi.removeFromBlacklist(blockedUserId);

              if (response?.code === 200) {
                removeBlockedUser(blockedUserId);
                await invalidateBlacklistRelatedCaches();
                setIsBlacklisted(false);
                showToast(response?.msg || '已移除黑名单', 'success');
                return;
              }

              showToast(response?.msg || '移除黑名单失败，请稍后重试', 'error');
            } catch (blacklistError) {
              showToast(blacklistError?.message || '移除黑名单失败，请稍后重试', 'error');
            } finally {
              setIsBlacklistSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleBlacklist = () => {
    const blockedUserId = normalizeBlockedUserId(userData?.id || userData?.userId || userId);

    if (!blockedUserId) {
      showToast('拉黑失败，用户ID无效', 'error');
      return;
    }

    if (isBlacklisted) {
      showToast('请前往设置中的黑名单列表移除', 'info');
      return;
    }

    confirmAddToBlacklist(blockedUserId);
  };

  const executeFollowAction = React.useCallback(
    async follow => {
      const targetUserId = String(userData?.userId ?? userData?.id ?? userId ?? '').trim();
      const requestUserId = normalizeFollowRequestUserId(targetUserId);

      if (isFollowSubmitting) {
        return;
      }

      if (!requestUserId) {
        showToast('关注失败，用户ID无效', 'error');
        return;
      }

      try {
        setIsFollowSubmitting(true);

        const response = follow
          ? await userApi.followUser(requestUserId)
          : await userApi.unfollowUser(requestUserId);

        if (response?.code !== 200) {
          showToast(
            response?.msg || (follow ? '关注失败，请稍后重试' : '取消关注失败，请稍后重试'),
            'error'
          );
          return;
        }

        const responseFollowState = resolveInitialFollowState(response?.data);
        const resolvedFollowState =
          typeof responseFollowState === 'boolean' ? responseFollowState : follow;

        setIsFollowing(resolvedFollowState);
        setFollowState(targetUserId, resolvedFollowState);
        setUserData(prevUserData => updateFollowerStat(prevUserData, resolvedFollowState, response));
        refreshMyFollowingCount().catch(countError => {
          console.error('Refresh following count after follow action failed:', countError);
        });
        showToast(response?.msg || (resolvedFollowState ? '已关注' : '已取消关注'), 'success');
      } catch (followError) {
        showToast(
          followError?.message || (follow ? '关注失败，请稍后重试' : '取消关注失败，请稍后重试'),
          'error'
        );
      } finally {
        setIsFollowSubmitting(false);
      }
    },
    [isFollowSubmitting, userData, userId]
  );

  const handleFollowPress = React.useCallback(
    async follow => {
      if (!follow) {
        showAppAlert(
          t('profile.unfollowConfirmTitle'),
          t('profile.unfollowConfirmMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.confirm'),
              onPress: () => {
                executeFollowAction(false);
              },
            },
          ]
        );
        return;
      }

      await executeFollowAction(true);
    },
    [executeFollowAction, t]
  );

  const handleMessagePress = React.useCallback(() => {
    const resolvedPeerUserId = String(userData?.userId ?? userData?.id ?? userId ?? '').trim();

    if (__DEV__) {
      console.log('[PublicProfile] navigate to private conversation with:', {
        routeUserId: userId,
        userDataUserId: userData?.userId,
        userDataId: userData?.id,
        resolvedPeerUserId,
      });
    }

    if (!resolvedPeerUserId) {
      showToast('无法发送私信', 'error');
      return;
    }

    navigation.navigate('PrivateConversation', {
      peerUserId: resolvedPeerUserId,
      userId: resolvedPeerUserId,
      id: resolvedPeerUserId,
      peerNickName: userData.username,
      username: userData.username,
      name: userData.username,
      peerAvatar: userData.avatar,
    });
  }, [navigation, userData, userId]);

  const loadContentData = async (tab = activeTab, page = 1) => {
    if (isBlacklisted) {
      return;
    }

    try {
      if (page > 1) {
        setIsLoadingMore(true);
      } else {
        setIsTabLoading(true);
      }

      if (tab === 'answers') {
        try {
          const {
            rows = [],
            total = 0,
          } = await loadProfileAnswersPage({
            isOwnProfile,
            userId: String(userData?.userId || userId || ''),
            pageNum: page,
            pageSize: PROFILE_ANSWER_PAGE_SIZE,
          });

          const nextAnswers = page === 1 ? rows : [...answersData, ...rows];
          setAnswersData(nextAnswers);
          setAnswersEmptyMessage('');
          setTabPages(prev => ({
            ...prev,
            [tab]: page,
          }));
          setTabHasMore(prev => ({
            ...prev,
            [tab]: nextAnswers.length < total,
          }));
          setLoadedTabs(prev => new Set([...prev, tab]));
        } catch (loadAnswersError) {
          if (isPublicProfileAnswersEndpointPendingError(loadAnswersError)) {
            if (page === 1) {
              setAnswersData([]);
            }
            setAnswersEmptyMessage(t('profile.publicProfileAnswersUnavailable'));
            setTabPages(prev => ({
              ...prev,
              [tab]: 1,
            }));
            setTabHasMore(prev => ({
              ...prev,
              [tab]: false,
            }));
            setLoadedTabs(prev => new Set([...prev, tab]));
            return;
          }

          throw loadAnswersError;
        } finally {
          setIsTabLoading(false);
          setIsLoadingMore(false);
        }

        return;
      }

      setTimeout(() => {
        let mockData = [];

        if (tab === 'questions') {
          mockData = [
            {
              id: `q${page}-1`,
              type: 'question',
              title: '如何在三个月内从零基础学会 Python 编程？',
              questionType: 'reward',
              reward: 50,
              solved: false,
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              viewsCount: 1200,
              commentsCount: 56,
              likesCount: 128,
            },
            {
              id: `q${page}-2`,
              type: 'question',
              title: '第一次养猫需要准备什么？',
              questionType: 'free',
              solved: true,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              viewsCount: 2500,
              commentsCount: 89,
              likesCount: 256,
            },
          ];
        } else if (tab === 'answers') {
          mockData = [
            {
              id: `a${page}-1`,
              type: 'answer',
              questionTitle: '如何高效学习一门新技能？',
              content: '作为一个自学了多门技能的人，我来分享一下自己的经验。',
              adopted: true,
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              likesCount: 256,
              commentsCount: 23,
            },
            {
              id: `a${page}-2`,
              type: 'answer',
              questionTitle: 'Python 数据分析入门需要学什么？',
              content: '先掌握 Python 基础语法，再学习 NumPy、Pandas 等常用库。',
              adopted: false,
              createdAt: new Date(Date.now() - 10800000).toISOString(),
              likesCount: 189,
              commentsCount: 15,
            },
          ];
        }

        if (tab === 'questions') {
          setQuestionsData(prev => (page === 1 ? mockData : [...prev, ...mockData]));
        }

        setTabPages(prev => ({
          ...prev,
          [tab]: page,
        }));
        setTabHasMore(prev => ({
          ...prev,
          [tab]: page < 3,
        }));
        setLoadedTabs(prev => new Set([...prev, tab]));
        setIsTabLoading(false);
        setIsLoadingMore(false);
      }, 0);
    } catch (loadError) {
      console.error('Load public profile content failed:', loadError);
      setIsTabLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  const handleSearchPress = () => {
    setIsSearchModalVisible(true);
  };

  const handleContentPress = item => {
    console.log('Navigate to content detail:', item?.type, item?.id);
  };

  const handleLoadMore = () => {
    if (isBlacklisted) {
      return;
    }

    if (!isLoadingMore && tabHasMore[activeTab]) {
      loadContentData(activeTab, tabPages[activeTab] + 1);
    }
  };

  const handleRefresh = () => {
    loadUserData();
  };

  const getCurrentTabData = () => {
    if (isBlacklisted) {
      return [];
    }

    switch (activeTab) {
      case 'questions':
        return questionsData;
      case 'answers':
        return answersData;
      default:
        return [];
    }
  };

  const currentEmptyMessage =
    activeTab === 'answers' && answersEmptyMessage
      ? answersEmptyMessage
      : t('profile.noContent');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color="#9ca3af" />
          <Text style={styles.errorMessage}>{t('profile.userNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleGoBack}>
            <Text style={styles.retryButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <PublicProfileHeader
        bio={userData.bio}
        onBack={handleGoBack}
        onShare={handleShare}
        showBlacklist={!isOwnProfile}
        onBlacklist={handleBlacklist}
        blacklistLabel={isBlacklisted ? '已加入黑名单' : '加入黑名单'}
        blacklistDisabled={isBlacklisted}
      />

      <FlatList
        data={getCurrentTabData()}
        renderItem={({ item }) => {
          if (activeTab === 'questions') {
            return <QuestionListItem item={item} onPress={handleContentPress} />;
          }

          if (activeTab === 'answers') {
            return <AnswerListItem item={item} onPress={handleContentPress} />;
          }

          return null;
        }}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={() => (
          <>
            <PublicProfileHero
              userData={userData}
              isFollowing={isFollowing}
              isFollowSubmitting={isFollowSubmitting}
              onFollowPress={handleFollowPress}
              onMessagePress={handleMessagePress}
              isOwnProfile={isOwnProfile}
              onStatPress={handleStatPress}
            />
            {isBlacklisted ? (
              <View style={styles.blockedContentBanner}>
                <Ionicons name="ban-outline" size={18} color="#6b7280" />
                <Text style={styles.blockedContentText}>已加入黑名单，该用户内容已隐藏</Text>
              </View>
            ) : (
              <ContentTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onSearchPress={handleSearchPress}
              />
            )}
          </>
        )}
        ListEmptyComponent={() => (
          isBlacklisted ? null : isTabLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{currentEmptyMessage}</Text>
            </View>
          )
        )}
        ListFooterComponent={() => {
          if (isLoadingMore) {
            return (
              <View style={styles.footerContainer}>
                <ActivityIndicator size="small" color="#ef4444" />
              </View>
            );
          }

          if (!tabHasMore[activeTab] && getCurrentTabData().length > 0) {
            return (
              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>{t('common.noMoreContent')}</Text>
              </View>
            );
          }

          return null;
        }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      />

      <UserContentSearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        userId={userId}
        onContentPress={handleContentPress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorMessage: {
    marginTop: 12,
    fontSize: scaleFont(16),
    color: '#374151',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  blockedContentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  blockedContentText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
});
