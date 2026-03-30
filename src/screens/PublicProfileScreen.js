import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/useTranslation';
import PublicProfileHeader from '../components/PublicProfileHeader';
import ContentTabs from '../components/ContentTabs';
import QuestionListItem from '../components/QuestionListItem';
import AnswerListItem from '../components/AnswerListItem';
import FavoriteListItem from '../components/FavoriteListItem';
import UserContentSearchModal from '../components/UserContentSearchModal';
import PublicProfileHero from '../components/PublicProfileHero';
import userApi from '../services/api/userApi';
import blacklistApi from '../services/api/blacklistApi';
import { addBlockedUser, removeBlockedUser } from '../services/blacklistState';
import UserCacheService from '../services/UserCacheService';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import { invalidateBlacklistRelatedCaches } from '../utils/blacklistContent';

import { scaleFont } from '../utils/responsive';
const EMPTY_TAB_PAGES = {
  questions: 1,
  answers: 1,
  favorites: 1,
};

const EMPTY_HAS_MORE = {
  questions: false,
  answers: false,
  favorites: false,
};

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

export default function PublicProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { userId } = route.params;
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [questionsData, setQuestionsData] = useState([]);
  const [answersData, setAnswersData] = useState([]);
  const [favoritesData, setFavoritesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set());
  const [tabPages, setTabPages] = useState(EMPTY_TAB_PAGES);
  const [tabHasMore, setTabHasMore] = useState(EMPTY_HAS_MORE);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [isBlacklistSubmitting, setIsBlacklistSubmitting] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const isOwnProfile = useMemo(
    () => String(currentUserId || '') !== '' && String(currentUserId) === String(userId),
    [currentUserId, userId]
  );

  useEffect(() => {
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (isBlacklisted) {
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

      const [profileResponse, cachedProfile, blacklistItems] = await Promise.all([
        userApi.getPublicProfile(userId),
        UserCacheService.getUserProfile(),
        blacklistApi.getBlacklist().catch(blacklistError => {
          console.error('Load blacklist status failed:', blacklistError);
          return [];
        }),
      ]);

      const currentProfile =
        cachedProfile || (await UserCacheService.fetchAndCacheUserProfile(true));
      const profilePayload = resolveProfilePayload(profileResponse);
      const nextUserData = buildProfileViewModel(profilePayload, userId);
      const nextCurrentUserId = currentProfile?.userId ? String(currentProfile.userId) : null;
      const nextIsOwnProfile =
        String(nextCurrentUserId || '') !== '' &&
        String(nextCurrentUserId) === String(nextUserData.userId || userId);
      const nextIsBlacklisted = nextIsOwnProfile
        ? false
        : resolveBlacklistStatus(blacklistItems, nextUserData.userId || userId);

      if (__DEV__) {
        console.log('[PublicProfile] raw response:', profileResponse);
        console.log('[PublicProfile] resolved payload:', profilePayload);
        console.log('[PublicProfile] mapped fields:', {
          username: nextUserData.username,
          bio: nextUserData.bio,
          occupation: nextUserData.occupation,
          location: nextUserData.location,
          verification: nextUserData.verification,
          statsItems: nextUserData.statsItems,
          isBlacklisted: nextIsBlacklisted,
          blacklistTargetUserId: nextUserData.userId || userId,
          blacklistBlockedUserIds: Array.isArray(blacklistItems)
            ? blacklistItems.map(item => String(item?.blockedUserId ?? item?.blockedUid ?? item?.userId ?? ''))
            : [],
        });
      }

      setCurrentUserId(nextCurrentUserId);
      setUserData(nextUserData);
      setQuestionsData([]);
      setAnswersData([]);
      setFavoritesData([]);
      setIsBlacklisted(nextIsBlacklisted);
      setLoadedTabs(new Set());
      setTabPages(EMPTY_TAB_PAGES);
      setTabHasMore(EMPTY_HAS_MORE);
    } catch (err) {
      setError(err?.message || '加载失败');
    } finally {
      setIsLoading(false);
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
                setFavoritesData([]);
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

  const handleFollowPress = React.useCallback(async follow => {
    setIsFollowing(follow);
    showToast(follow ? '已关注' : '已取消关注', 'success');
  }, []);

  const loadContentData = async (tab = activeTab, page = 1) => {
    if (isBlacklisted) {
      return;
    }

    try {
      if (page > 1) {
        setIsLoadingMore(true);
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
        } else if (tab === 'favorites') {
          mockData = [
            {
              id: `f${page}-1`,
              type: 'favorite',
              title: '如何高效学习一门新技能？',
              author: '学习达人',
              favoriteType: 'question',
              createdAt: new Date(Date.now() - 172800000).toISOString(),
            },
            {
              id: `f${page}-2`,
              type: 'favorite',
              title: '关于职场新人如何快速成长的回答',
              author: '职场导师',
              favoriteType: 'answer',
              createdAt: new Date(Date.now() - 604800000).toISOString(),
            },
          ];
        }

        if (tab === 'questions') {
          setQuestionsData(prev => (page === 1 ? mockData : [...prev, ...mockData]));
        } else if (tab === 'answers') {
          setAnswersData(prev => (page === 1 ? mockData : [...prev, ...mockData]));
        } else if (tab === 'favorites') {
          setFavoritesData(prev => (page === 1 ? mockData : [...prev, ...mockData]));
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
        setIsLoadingMore(false);
      }, 0);
    } catch (loadError) {
      console.error('Load public profile content failed:', loadError);
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
      case 'favorites':
        return favoritesData;
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
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
      <SafeAreaView style={styles.container}>
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
    <SafeAreaView style={styles.container}>
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

          if (activeTab === 'favorites') {
            return <FavoriteListItem item={item} onPress={handleContentPress} />;
          }

          return null;
        }}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={() => (
          <>
            <PublicProfileHero
              userData={userData}
              isFollowing={isFollowing}
              onFollowPress={handleFollowPress}
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
          isBlacklisted ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('profile.noContent')}</Text>
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
