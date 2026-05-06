import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatNumber } from '../utils/numberFormatter';
import { centsToAmount } from '../utils/rewardAmount';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';
import questionApi from '../services/api/questionApi';
import { scaleFont } from '../utils/responsive';

const rankingTabs = [
  { key: 'answers', labelKey: 'screens.questionRanking.tabs.mostAnswers', icon: 'chatbubbles' },
  { key: 'comments', labelKey: 'screens.questionRanking.tabs.mostComments', icon: 'chatbox-ellipses' },
  { key: 'favorites', labelKey: 'screens.questionRanking.tabs.mostFavorites', icon: 'bookmark' },
  { key: 'views', labelKey: 'screens.questionRanking.tabs.mostViews', icon: 'eye' },
  { key: 'likes', labelKey: 'screens.questionRanking.tabs.mostLikes', icon: 'thumbs-up' },
];

const DEFAULT_RANKING_DATA = {
  answers: [],
  comments: [],
  favorites: [],
  views: [],
  likes: [],
};

const pickFirstDefinedValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    return value;
  }

  return undefined;
};

const toSafeNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeRankToken = value => String(value || '').trim().toLowerCase();

const resolveTabKeyFromBucket = (mapKey, rankType, items = []) => {
  const tokens = [normalizeRankToken(mapKey), normalizeRankToken(rankType)];

  if (tokens.some(token => token.includes('answer'))) {
    return 'answers';
  }

  if (tokens.some(token => token.includes('comment'))) {
    return 'comments';
  }

  if (
    tokens.some(
      token =>
        token.includes('favorite') ||
        token.includes('favourite') ||
        token.includes('collect') ||
        token.includes('bookmark')
    )
  ) {
    return 'favorites';
  }

  if (tokens.some(token => token.includes('view') || token.includes('browse') || token.includes('read'))) {
    return 'views';
  }

  if (tokens.some(token => token.includes('like') || token.includes('thumb'))) {
    return 'likes';
  }

  const sampleItem = Array.isArray(items) ? items[0] : null;
  if (!sampleItem || typeof sampleItem !== 'object') {
    return null;
  }

  if (pickFirstDefinedValue(sampleItem.answerCount, sampleItem.answersCount, sampleItem.answerNum) !== undefined) {
    return 'answers';
  }

  if (pickFirstDefinedValue(sampleItem.commentCount, sampleItem.commentsCount, sampleItem.commentNum) !== undefined) {
    return 'comments';
  }

  if (pickFirstDefinedValue(sampleItem.favoriteCount, sampleItem.favoritesCount, sampleItem.collectCount, sampleItem.collectNum) !== undefined) {
    return 'favorites';
  }

  if (pickFirstDefinedValue(sampleItem.viewCount, sampleItem.viewsCount, sampleItem.browseCount, sampleItem.browseNum) !== undefined) {
    return 'views';
  }

  if (pickFirstDefinedValue(sampleItem.likeCount, sampleItem.likesCount, sampleItem.likeNum, sampleItem.thumbsUpCount) !== undefined) {
    return 'likes';
  }

  return null;
};

const normalizeRankingItem = (item, index) => {
  const directRewardAmount = pickFirstDefinedValue(item?.reward, item?.price, item?.amount);
  const centsRewardAmount = pickFirstDefinedValue(item?.rewardAmount, item?.bountyAmount);
  const reward =
    directRewardAmount !== undefined
      ? toSafeNumber(directRewardAmount)
      : centsToAmount(centsRewardAmount);

  return {
    ...item,
    id: String(
      pickFirstDefinedValue(item?.questionId, item?.id, item?.contentId, item?.subjectId, `rank-item-${index}`)
    ),
    rank: toSafeNumber(
      pickFirstDefinedValue(item?.rank, item?.rankNo, item?.sort, item?.sortNo, item?.orderNo, item?.order),
      index + 1
    ),
    title: String(
      pickFirstDefinedValue(item?.title, item?.questionTitle, item?.contentTitle, item?.subject, '')
    ),
    reward,
    type: reward > 0 ? 'reward' : 'free',
    answersCount: toSafeNumber(
      pickFirstDefinedValue(item?.answersCount, item?.answerCount, item?.answerNum, item?.replyCount)
    ),
    commentsCount: toSafeNumber(
      pickFirstDefinedValue(item?.commentsCount, item?.commentCount, item?.commentNum)
    ),
    favoritesCount: toSafeNumber(
      pickFirstDefinedValue(item?.favoritesCount, item?.favoriteCount, item?.collectCount, item?.collectNum)
    ),
    viewsCount: toSafeNumber(
      pickFirstDefinedValue(item?.viewsCount, item?.viewCount, item?.browseCount, item?.browseNum, item?.readCount)
    ),
    likesCount: toSafeNumber(
      pickFirstDefinedValue(item?.likesCount, item?.likeCount, item?.likeNum, item?.thumbsUpCount)
    ),
  };
};

const normalizeQuestionRankingData = data => {
  const normalizedData = { ...DEFAULT_RANKING_DATA };
  const unresolvedBuckets = [];
  const usedTabs = new Set();
  const entries = Object.entries(data || {});

  entries.forEach(([mapKey, bucket]) => {
    const items = Array.isArray(bucket?.items)
      ? bucket.items
      : Array.isArray(bucket)
        ? bucket
        : [];
    const tabKey = resolveTabKeyFromBucket(mapKey, bucket?.rankType, items);
    const normalizedItems = items.map(normalizeRankingItem);

    if (tabKey && !usedTabs.has(tabKey)) {
      normalizedData[tabKey] = normalizedItems;
      usedTabs.add(tabKey);
      return;
    }

    unresolvedBuckets.push(normalizedItems);
  });

  const remainingTabs = ['answers', 'comments', 'favorites', 'views', 'likes'].filter(
    tabKey => !usedTabs.has(tabKey)
  );

  unresolvedBuckets.forEach((items, index) => {
    const tabKey = remainingTabs[index];
    if (tabKey) {
      normalizedData[tabKey] = items;
    }
  });

  return normalizedData;
};

const resolveRegionId = routeParams => {
  const directRegionId = toSafeNumber(routeParams?.regionId, NaN);
  if (Number.isFinite(directRegionId)) {
    return directRegionId;
  }

  const selectedRegion = routeParams?.selectedRegion || {};
  const regionId = pickFirstDefinedValue(
    selectedRegion.districtId,
    selectedRegion.stateId,
    selectedRegion.cityId,
    selectedRegion.countryId
  );

  return toSafeNumber(regionId, 0);
};

export default function QuestionRankingScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('answers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingData, setRankingData] = useState(DEFAULT_RANKING_DATA);

  const regionId = useMemo(() => resolveRegionId(route?.params), [route?.params]);
  const currentData = rankingData[activeTab] || [];

  const translateOrFallback = useCallback(
    (key, fallback) => {
      const translatedText = t(key);
      return translatedText === key ? fallback : translatedText;
    },
    [t]
  );

  const loadRankingData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await questionApi.getQuestionRankingAll(
          { regionId },
          { forceRefresh: isRefresh }
        );
        if (response?.code === 200) {
          setRankingData(normalizeQuestionRankingData(response.data));
        } else {
          setRankingData(DEFAULT_RANKING_DATA);
        }
      } catch (error) {
        console.error('Failed to load question ranking data:', error);
        setRankingData(DEFAULT_RANKING_DATA);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [regionId]
  );

  useEffect(() => {
    loadRankingData();
  }, [loadRankingData]);

  const handleRefresh = useCallback(() => {
    loadRankingData(true);
  }, [loadRankingData]);

  const handleQuestionPress = item => {
    if (!item?.id) {
      return;
    }

    navigation.navigate('QuestionDetail', { id: item.id });
  };

  const getRankBadgeColor = rank => {
    if (rank === 1) return '#ef4444';
    if (rank === 2) return '#f97316';
    if (rank === 3) return '#f59e0b';
    return '#9ca3af';
  };

  const getStatInfo = item => {
    switch (activeTab) {
      case 'answers':
        return { icon: 'chatbubbles-outline', value: item.answersCount, label: t('screens.questionRanking.stats.answers') };
      case 'comments':
        return { icon: 'chatbox-ellipses-outline', value: item.commentsCount, label: t('screens.questionRanking.stats.comments') };
      case 'favorites':
        return { icon: 'bookmark-outline', value: item.favoritesCount, label: t('screens.questionRanking.stats.favorites') };
      case 'views':
        return { icon: 'eye-outline', value: item.viewsCount, label: t('screens.questionRanking.stats.views') };
      case 'likes':
        return { icon: 'thumbs-up-outline', value: item.likesCount, label: t('screens.questionRanking.stats.likes') };
      default:
        return { icon: 'chatbubbles-outline', value: 0, label: '' };
    }
  };

  const getEmptyStateText = () => {
    if (activeTab === 'likes') {
      return {
        title: translateOrFallback(
          'screens.questionRanking.empty.likesTitle',
          `${t('screens.questionRanking.tabs.mostLikes')} · ${t('common.noData')}`
        ),
        description: translateOrFallback(
          'screens.questionRanking.empty.likesDescription',
          t('common.noData')
        ),
      };
    }

    return {
      title: translateOrFallback(
        'screens.questionRanking.empty.defaultTitle',
        t('common.noData')
      ),
      description: translateOrFallback(
        'screens.questionRanking.empty.defaultDescription',
        t('common.refresh')
      ),
    };
  };

  const emptyStateText = getEmptyStateText();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.questionRanking.title')}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {rankingTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {t(tab.labelKey)}
              </Text>
              {activeTab === tab.key && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ef4444" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#ef4444']}
              tintColor="#ef4444"
            />
          }
        >
          {currentData.length > 0 ? (
            currentData.map(item => {
              const statInfo = getStatInfo(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.questionItem}
                  onPress={() => handleQuestionPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(item.rank) }]}>
                    <Text style={styles.rankText}>{item.rank}</Text>
                  </View>

                  <View style={styles.questionContent}>
                    <Text style={styles.questionTitle} numberOfLines={2}>
                      {item.type === 'reward' && item.reward > 0 ? (
                        <Text style={styles.rewardTagInline}>{formatRewardPointsValue(item.reward, { locale: i18n?.locale })} </Text>
                      ) : null}
                      {item.title}
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.mainStat}>
                        <Ionicons name={statInfo.icon} size={16} color="#10b981" />
                        <Text style={styles.mainStatValue}>{formatNumber(statInfo.value)}</Text>
                        <Text style={styles.mainStatLabel}>{statInfo.label}</Text>
                      </View>

                      {activeTab !== 'views' ? (
                        <View style={styles.secondaryStat}>
                          <Ionicons name="eye-outline" size={14} color="#9ca3af" />
                          <Text style={styles.secondaryStatText}>{formatNumber(item.viewsCount)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={activeTab === 'likes' ? 'time-outline' : 'document-text-outline'}
                  size={28}
                  color="#9ca3af"
                />
              </View>
              <Text style={styles.emptyTitle}>{emptyStateText.title}</Text>
              <Text style={styles.emptyDescription}>{emptyStateText.description}</Text>
            </View>
          )}

          <View style={styles.listFooter}>
            <Text style={styles.footerText}>{t('screens.questionRanking.allContentShown')}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  tabsContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#ef4444',
    borderRadius: 1.5,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#374151',
  },
  emptyDescription: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
    color: '#9ca3af',
    textAlign: 'center',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#fff',
  },
  questionContent: {
    flex: 1,
    gap: 8,
  },
  questionTitle: {
    flex: 1,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    color: '#1f2937',
    fontWeight: '500',
  },
  rewardTagInline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    fontSize: scaleFont(19),
    color: '#ef4444',
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(22),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mainStatValue: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#10b981',
  },
  mainStatLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
  },
  secondaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secondaryStatText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
});
