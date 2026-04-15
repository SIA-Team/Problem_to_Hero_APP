import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTranslation } from '../i18n/withTranslation';
import userApi from '../services/api/userApi';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';

const PAGE_SIZE = 10;

const pickFirstText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const normalizeBoolean = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes'].includes(normalized)) {
        return true;
      }

      if (['0', 'false', 'no'].includes(normalized)) {
        return false;
      }
    }
  }

  return false;
};

const toNonNegativeNumber = value => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null;
};

const normalizeCount = (...values) => {
  for (const value of values) {
    const normalized = toNonNegativeNumber(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return 0;
};

const formatCompactCount = value => {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    return '0';
  }

  if (normalized >= 10000) {
    return `${(normalized / 10000).toFixed(normalized >= 100000 ? 0 : 1).replace(/\.0$/, '')}万`;
  }

  if (normalized >= 1000) {
    return `${(normalized / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  return String(normalized);
};

const buildPayloadCandidates = payload => {
  const nestedData = payload?.data;

  return [
    payload,
    nestedData,
    payload?.page,
    payload?.pagination,
    payload?.result,
    nestedData?.page,
    nestedData?.pagination,
    nestedData?.result,
  ].filter(Boolean);
};

const extractUsersFromPayload = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = buildPayloadCandidates(payload);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['rows', 'list', 'records', 'items', 'content', 'users', 'followers', 'following', 'fans']) {
      if (Array.isArray(candidate[key])) {
        return candidate[key];
      }
    }
  }

  return [];
};

const extractTotal = payload => {
  const candidates = buildPayloadCandidates(payload);

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    for (const key of ['total', 'count', 'totalCount', 'recordsTotal']) {
      const normalized = toNonNegativeNumber(candidate[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
};

const resolveHasMore = (payload, pageNum, pageSize, currentPageLength, total) => {
  const candidates = buildPayloadCandidates(payload);

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    if (typeof candidate.hasNext === 'boolean') {
      return candidate.hasNext;
    }

    if (typeof candidate.hasMore === 'boolean') {
      return candidate.hasMore;
    }

    if (typeof candidate.isLastPage === 'boolean') {
      return !candidate.isLastPage;
    }

    const totalPages = toNonNegativeNumber(candidate.pages);
    if (totalPages !== null && totalPages > 0) {
      return pageNum < totalPages;
    }
  }

  if (total !== null) {
    return pageNum * pageSize < total;
  }

  return currentPageLength >= pageSize;
};

const mergeUsers = (currentUsers = [], incomingUsers = []) => {
  const mergedUsers = [];
  const seenIds = new Set();

  [...currentUsers, ...incomingUsers].forEach((user, index) => {
    const dedupeKey = String(user?.userId ?? user?.id ?? `relation-${index}`);
    if (seenIds.has(dedupeKey)) {
      return;
    }

    seenIds.add(dedupeKey);
    mergedUsers.push(user);
  });

  return mergedUsers;
};

const normalizeRelationUser = (user = {}, index = 0, relationType = 'followers') => {
  const rawUserId =
    user?.userId ??
    user?.followUserId ??
    user?.targetUserId ??
    user?.fanId ??
    user?.id ??
    `${relationType}-${index}`;
  const userId = String(rawUserId).trim();

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    key: `${relationType}-${userId}-${index}`,
    userId,
    username:
      pickFirstText(user?.nickName, user?.nickname, user?.name, user?.userName, user?.username) ||
      `User ${userId}`,
    avatar: pickFirstText(
      user?.avatar,
      user?.avatarUrl,
      user?.userAvatar,
      user?.headImg,
      user?.headImage,
      user?.profilePicture
    ),
    bio: pickFirstText(
      user?.signature,
      user?.profession,
      user?.title,
      user?.bio,
      user?.introduction,
      user?.description
    ),
    verified: normalizeBoolean(
      user?.verified,
      user?.isVerified,
      user?.authFlag,
      user?.authenticated,
      user?.realAuth
    ),
    followersCount: normalizeCount(
      user?.followersCount,
      user?.fanCount,
      user?.fansCount,
      user?.followerCount,
      user?.followers
    ),
    questionsCount: normalizeCount(
      user?.questionsCount,
      user?.questionCount,
      user?.questionNum,
      user?.questions,
      user?.askCount
    ),
    answersCount: normalizeCount(
      user?.answersCount,
      user?.answerCount,
      user?.answerNum,
      user?.answers,
      user?.replyCount
    ),
  };
};

const getRelationCopy = ({ relationType, isOwnList, t, profileName }) => {
  const safeName = profileName || '该用户';

  if (relationType === 'following') {
    return {
      totalLabel: count => `共 ${count} 位关注`,
      emptyTitle: '还没有关注任何人',
      emptyHint: isOwnList ? '你关注的用户会显示在这里' : `${safeName}关注的用户会显示在这里`,
      loadError: '获取关注列表失败',
      searchPlaceholder: '搜索关注的人',
    };
  }

  return {
    totalLabel: count => `共 ${count} 位粉丝`,
    emptyTitle: t('fans.empty'),
    emptyHint: isOwnList ? t('fans.emptyHint') : `${safeName}的粉丝会显示在这里`,
    loadError: '获取粉丝列表失败',
    searchPlaceholder: '搜索粉丝',
  };
};

export default function RelationUserList({
  navigation,
  relationType = 'followers',
  isOwnList = false,
  targetUserId = '',
  profileName = '',
  showSearch = false,
  showStatsBar = true,
  ListHeaderExtra = null,
  ListFooterExtra = null,
  contentContainerStyle,
  listStyle,
}) {
  const { t } = useTranslation();
  const copy = useMemo(
    () => getRelationCopy({ relationType, isOwnList, t, profileName }),
    [isOwnList, profileName, relationType, t]
  );

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState('');

  const usersRef = useRef([]);
  const requestIdRef = useRef(0);
  const listIdentity = useMemo(
    () => `${relationType}:${isOwnList ? 'mine' : targetUserId || 'unknown'}`,
    [isOwnList, relationType, targetUserId]
  );

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const resetState = useCallback(() => {
    usersRef.current = [];
    setUsers([]);
    setPage(1);
    setTotal(0);
    setHasMore(true);
    setLoaded(false);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
    setSearchText('');
  }, []);

  const loadUsers = useCallback(
    async ({ pageNum = 1, refresh = false, loadMore = false } = {}) => {
      if (loadMore) {
        if (loading || refreshing || loadingMore || !hasMore) {
          return;
        }
        setLoadingMore(true);
      } else if (refresh) {
        if (refreshing || loadingMore) {
          return;
        }
        setRefreshing(true);
      } else {
        if (loading) {
          return;
        }
        setLoading(true);
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      try {
        const requestParams = {
          pageNum,
          pageSize: PAGE_SIZE,
        };

        if (!isOwnList) {
          if (!targetUserId) {
            throw new Error('目标用户ID不能为空');
          }

          requestParams.userId = targetUserId;
        }

        let response;
        if (relationType === 'following') {
          response = isOwnList
            ? await userApi.getMyFollowing(requestParams)
            : await userApi.getUserFollowing(requestParams);
        } else {
          response = isOwnList
            ? await userApi.getMyFollowers(requestParams)
            : await userApi.getUserFollowers(requestParams);
        }

        if (!response || (response.code !== 200 && response.code !== 0)) {
          throw new Error(response?.msg || copy.loadError);
        }

        const pageUsers = extractUsersFromPayload(response?.data)
          .map((user, index) => normalizeRelationUser(user, (pageNum - 1) * PAGE_SIZE + index, relationType))
          .filter(Boolean);
        const nextTotal = extractTotal(response?.data);
        const nextUsers = pageNum === 1 ? pageUsers : mergeUsers(usersRef.current, pageUsers);
        const nextHasMore = resolveHasMore(response?.data, pageNum, PAGE_SIZE, pageUsers.length, nextTotal);

        if (requestIdRef.current !== requestId) {
          return;
        }

        usersRef.current = nextUsers;
        setUsers(nextUsers);
        setPage(pageNum);
        setTotal(nextTotal ?? nextUsers.length);
        setHasMore(nextHasMore);
        setLoaded(true);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        console.error('[RelationUserList] failed to load relation list:', error);

        if (pageNum === 1) {
          usersRef.current = [];
          setUsers([]);
          setPage(1);
          setTotal(0);
          setHasMore(false);
          setLoaded(true);
        }

        showToast(error?.message || copy.loadError, 'error');
      } finally {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [copy.loadError, hasMore, isOwnList, loading, loadingMore, refreshing, relationType, targetUserId]
  );

  useEffect(() => {
    requestIdRef.current += 1;
    resetState();
    loadUsers({ pageNum: 1 });

    return () => {
      requestIdRef.current += 1;
    };
  }, [listIdentity]);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter(user => {
      const fields = [user.username, user.bio, user.userId].filter(Boolean);
      return fields.some(field => String(field).toLowerCase().includes(keyword));
    });
  }, [searchText, users]);

  const handleRefresh = useCallback(() => {
    loadUsers({
      pageNum: 1,
      refresh: true,
    });
  }, [loadUsers]);

  const handleLoadMore = useCallback(() => {
    if (!loaded || loading || refreshing || loadingMore || !hasMore) {
      return;
    }

    loadUsers({
      pageNum: page + 1,
      loadMore: true,
    });
  }, [hasMore, loaded, loadUsers, loading, loadingMore, page, refreshing]);

  const handleUserPress = useCallback(
    item => {
      if (!navigation) {
        return;
      }

      navigateToPublicProfile(navigation, item);
    },
    [navigation]
  );

  const renderUserItem = useCallback(
    ({ item }) => {
      const stats = [];

      if (item.followersCount > 0) {
        stats.push(`${formatCompactCount(item.followersCount)} ${t('fans.followers')}`);
      }

      if (item.questionsCount > 0) {
        stats.push(`${formatCompactCount(item.questionsCount)} ${t('fans.questions')}`);
      }

      if (item.answersCount > 0) {
        stats.push(`${formatCompactCount(item.answersCount)} ${t('fans.answers')}`);
      }

      return (
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.75}
        >
          <Avatar
            uri={item.avatar}
            name={item.username || '未知用户'}
            size={48}
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.username || '未知用户'}
              </Text>
              {item.verified ? (
                <Ionicons name="checkmark-circle" size={16} color="#3b82f6" style={styles.verifiedIcon} />
              ) : null}
            </View>
            {item.bio ? (
              <Text style={styles.userBio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
            {stats.length > 0 ? (
              <Text style={styles.userStats} numberOfLines={1}>
                {stats.join(' · ')}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      );
    },
    [handleUserPress, t]
  );

  const renderEmpty = useCallback(() => {
    if (!loaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>{t('fans.loading')}</Text>
        </View>
      );
    }

    if (searchText.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyText}>没有找到匹配的用户</Text>
          <Text style={styles.emptyHint}>试试其他昵称、简介或用户ID关键词</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>{copy.emptyTitle}</Text>
        <Text style={styles.emptyHint}>{copy.emptyHint}</Text>
      </View>
    );
  }, [copy.emptyHint, copy.emptyTitle, loaded, searchText, t]);

  const renderFooter = useCallback(() => {
    return (
      <>
        {typeof ListFooterExtra === 'function' ? ListFooterExtra({ searchText, users: filteredUsers }) : ListFooterExtra}
        {loadingMore ? (
          <View style={styles.footerContainer}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.footerText}>{t('fans.loadingMore')}</Text>
          </View>
        ) : null}
        {!loadingMore && !hasMore && filteredUsers.length > 0 ? (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{t('fans.noMore')}</Text>
          </View>
        ) : null}
        {!loadingMore && (hasMore || filteredUsers.length === 0) ? <View style={styles.footerSpacer} /> : null}
      </>
    );
  }, [ListFooterExtra, filteredUsers, hasMore, loadingMore, searchText, t]);

  const listHeaderComponent = useMemo(() => {
    return (
      <>
        {showSearch ? (
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder={copy.searchPlaceholder}
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#9ca3af"
              />
              {searchText.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
        {ListHeaderExtra}
        {showStatsBar && filteredUsers.length > 0 ? (
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              {copy.totalLabel(searchText.trim() ? filteredUsers.length : total || filteredUsers.length)}
            </Text>
          </View>
        ) : null}
      </>
    );
  }, [ListHeaderExtra, copy, filteredUsers.length, searchText, showSearch, showStatsBar, total]);

  return (
    <FlatList
      style={listStyle}
      data={filteredUsers}
      keyExtractor={item => item.key}
      renderItem={renderUserItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.2}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#ef4444']}
          tintColor="#ef4444"
        />
      }
      contentContainerStyle={[
        filteredUsers.length === 0 ? styles.emptyContentContainer : styles.listContentContainer,
        contentContainerStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  listContentContainer: {
    paddingBottom: 16,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statsText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(14),
    color: '#1f2937',
    paddingVertical: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userAvatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: scaleFont(16),
    fontWeight: '500',
    color: '#1f2937',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  userBio: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginBottom: 4,
  },
  userStats: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: scaleFont(14),
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  footerSpacer: {
    height: 16,
  },
});
