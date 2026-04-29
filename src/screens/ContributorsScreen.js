import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { formatAmount } from '../utils/rewardAmount';

import { scaleFont } from '../utils/responsive';

const FALLBACK_CONTRIBUTORS = [];

export default function ContributorsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    currentReward = 50,
    rewardContributors = 3,
    rewardContributorsList: routeRewardContributorsList = [],
  } = route?.params || {};

  const rewardContributorsList =
    Array.isArray(routeRewardContributorsList) && routeRewardContributorsList.length > 0
      ? routeRewardContributorsList
      : FALLBACK_CONTRIBUTORS;

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
          <Text style={styles.totalAmount}>{formatAmount(currentReward)}</Text>
        </View>
        <Text style={styles.totalDesc}>
          {t('screens.contributorsScreen.totalDesc').replace('{count}', rewardContributors)}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        showsVerticalScrollIndicator={false}
      >
        {rewardContributorsList.length > 0 ? (
          rewardContributorsList.map((contributor, index) => (
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
                <Text style={styles.amountText}>{formatAmount(contributor.amount)}</Text>
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
