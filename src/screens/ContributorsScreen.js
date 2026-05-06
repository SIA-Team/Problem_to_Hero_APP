import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';
import { centsToAmount } from '../utils/rewardAmount';
import { formatTime } from '../utils/timeFormatter';
import questionApi from '../services/api/questionApi';

import { scaleFont } from '../utils/responsive';

const FALLBACK_CONTRIBUTORS = [];
const DEFAULT_PAGE_NUM = 1;
const DEFAULT_PAGE_SIZE = 20;

const isSuccessResponse = response => {
  const code = Number(response?.code ?? response?.data?.code);
  return code === 0 || code === 200;
};

const normalizeContributorRecord = (record, t) => ({
  id: String(record?.recordId ?? `${record?.rewarderUserId ?? 'rewarder'}-${record?.eventTime ?? Date.now()}`),
  userId: record?.rewarderUserId ?? null,
  name: String(record?.nickName || '').trim() || t('screens.questionDetail.states.anonymousUser'),
  avatar: record?.avatar || null,
  amount: centsToAmount(record?.amountFen ?? 0),
  time: formatTime(record?.eventTime) || String(record?.eventTime || '').trim() || t('common.loading'),
});

export default function ContributorsScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    questionId = '',
    currentReward = 50,
    rewardContributors = 3,
    rewardContributorsList: routeRewardContributorsList = [],
  } = route?.params || {};

  const fallbackContributors = useMemo(
    () => (
      Array.isArray(routeRewardContributorsList) && routeRewardContributorsList.length > 0
        ? routeRewardContributorsList
        : FALLBACK_CONTRIBUTORS
    ),
    [routeRewardContributorsList]
  );
  const [contributors, setContributors] = useState(fallbackContributors);
  const [contributorsTotal, setContributorsTotal] = useState(Math.max(Number(rewardContributors) || 0, 0));
  const [loading, setLoading] = useState(false);
  const formatPoints = amount => formatRewardPointsValue(amount, { locale: i18n?.locale });

  const loadRewardRecords = useCallback(async () => {
    const normalizedQuestionId = String(questionId ?? '').trim();
    if (!normalizedQuestionId) {
      setContributors(fallbackContributors);
      setContributorsTotal(Math.max(Number(rewardContributors) || 0, fallbackContributors.length));
      return;
    }

    try {
      setLoading(true);
      const response = await questionApi.getRewardRecords(normalizedQuestionId, {
        pageNum: DEFAULT_PAGE_NUM,
        pageSize: DEFAULT_PAGE_SIZE,
      });

      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || 'Failed to load reward records');
      }

      const remoteData = response?.data || {};
      const remoteRows = Array.isArray(remoteData?.rows) ? remoteData.rows : [];
      const normalizedRows = remoteRows.map(item => normalizeContributorRecord(item, t));
      const remoteTotal = Number(remoteData?.total);

      setContributors(normalizedRows);
      setContributorsTotal(
        Number.isFinite(remoteTotal) && remoteTotal >= 0
          ? remoteTotal
          : normalizedRows.length
      );
    } catch (error) {
      console.error('Failed to load reward contributor records:', error);
      setContributors(fallbackContributors);
      setContributorsTotal(Math.max(Number(rewardContributors) || 0, fallbackContributors.length));
    } finally {
      setLoading(false);
    }
  }, [fallbackContributors, questionId, rewardContributors, t]);

  useEffect(() => {
    loadRewardRecords().catch(error => {
      console.error('Failed to initialize reward contributor records:', error);
    });
  }, [loadRewardRecords]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.contributorsScreen.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.totalInfo}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('screens.contributorsScreen.totalLabel')}</Text>
          <Text style={styles.totalAmount}>{formatPoints(currentReward)}</Text>
        </View>
        <Text style={styles.totalDesc}>
          {t('screens.contributorsScreen.totalDesc').replace('{count}', contributorsTotal)}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        showsVerticalScrollIndicator={false}
      >
        {loading && contributors.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : contributors.length > 0 ? (
          contributors.map((contributor, index) => (
            <View key={contributor.id || `contributor-${index}`} style={styles.item}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Avatar uri={contributor.avatar} name={contributor.name} size={40} />
              <View style={styles.info}>
                <Text style={styles.name}>{contributor.name}</Text>
                <Text style={styles.time}>{contributor.time}</Text>
              </View>
              <View style={styles.amountBadge}>
                <Ionicons name="add" size={12} color="#ef4444" />
                <Text style={styles.amountText}>{formatPoints(contributor.amount)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('common.noData')}</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>{t('screens.contributorsScreen.closeButton')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  totalInfo: {
    backgroundColor: '#fef3c7',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: { fontSize: scaleFont(14), color: '#92400e', fontWeight: '500' },
  totalAmount: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  totalDesc: { fontSize: scaleFont(12), color: '#92400e' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: {
    paddingTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: scaleFont(14),
    color: '#94a3b8',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: scaleFont(12),
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  info: { flex: 1 },
  name: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  time: { fontSize: scaleFont(12), color: '#9ca3af' },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  amountText: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#ef4444',
  },
  emptyText: {
    paddingTop: 48,
    textAlign: 'center',
    fontSize: scaleFont(14),
    color: '#94a3b8',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  closeButton: {
    backgroundColor: '#f9fafb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#6b7280',
  },
});
