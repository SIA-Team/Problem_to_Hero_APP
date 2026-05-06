import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import walletApi from '../services/api/walletApi';
import {
  extractWalletTransactionRows,
  getWalletTransactionUniqueKey,
  normalizeWalletPointsOverview,
  WALLET_POINTS_DEFAULT_CURRENCY,
} from '../utils/walletPoints';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';

import { scaleFont } from '../utils/responsive';

const PAGE_SIZE = 20;

const TAB_KEYS = {
  INCOME: 'income',
  EXPENSE: 'expense',
};

const createInitialTabState = () => ({
  items: [],
  pageNum: 1,
  total: 0,
  loading: false,
  refreshing: false,
  loadingMore: false,
  initialized: false,
});

const TAB_ICON_MAP = {
  [TAB_KEYS.INCOME]: 'arrow-down',
  [TAB_KEYS.EXPENSE]: 'arrow-up',
};

const TAB_COLOR_MAP = {
  [TAB_KEYS.INCOME]: '#22c55e',
  [TAB_KEYS.EXPENSE]: '#ef4444',
};

const buildTabRequestParams = tabKey => {
  switch (tabKey) {
    case TAB_KEYS.INCOME:
      return { direction: 'CREDIT' };
    case TAB_KEYS.EXPENSE:
      return { direction: 'DEBIT' };
    default:
      return {};
  }
};

const getCurrencySymbol = currency => {
  switch (String(currency || WALLET_POINTS_DEFAULT_CURRENCY).toLowerCase()) {
    case 'usd':
      return '$';
    case 'cny':
    case 'rmb':
      return '¥';
    case 'eur':
      return 'EUR ';
    case 'gbp':
      return '£';
    default:
      return '$';
  }
};

const formatAmount = amount => {
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00';
};

const getSourceTypeLabel = (sourceType, t) => {
  switch (String(sourceType || '').trim().toUpperCase()) {
    case 'TOPUP':
      return t('screens.walletDetail.transactionTypes.topup');
    case 'REWARD':
      return t('screens.walletDetail.transactionTypes.reward');
    case 'ADOPT':
      return t('screens.walletDetail.transactionTypes.adopt');
    case 'PAID_VIEW':
      return t('screens.walletDetail.transactionTypes.paidView');
    case 'WITHDRAW':
      return t('screens.walletDetail.transactionTypes.withdraw');
    case 'REFUND':
      return t('screens.walletDetail.transactionTypes.refund');
    case 'BOUNTY':
      return t('screens.walletDetail.transactionTypes.bounty');
    case 'SUPER_LIKE':
      return t('screens.walletDetail.transactionTypes.superLike');
    default:
      return '';
  }
};

const getTransactionTitle = (item, t) => {
  const remark = String(item?.remark || '').trim();
  const sourceType = String(item?.sourceType || '').trim().toUpperCase();
  const refType = String(item?.refType || '').trim().toUpperCase();

  if (sourceType === 'BOUNTY' && remark) {
    const addRewardPrefix = `${t('screens.addRewardScreen.expenseRecordType')} - `;
    if (remark.startsWith(addRewardPrefix)) {
      return remark.slice(addRewardPrefix.length).trim() || t('screens.walletDetail.transactionTitles.addReward');
    }
  }

  if (remark) {
    return remark;
  }

  if (sourceType === 'BOUNTY' && refType === 'QUESTION') {
    return t('screens.walletDetail.transactionTitles.addReward');
  }

  const sourceTypeLabel = getSourceTypeLabel(sourceType, t);
  if (sourceTypeLabel) {
    return sourceTypeLabel;
  }

  if (refType) {
    return refType;
  }

  return t('screens.walletDetail.transactionTitles.default');
};

const getTransactionTag = (item, t) => {
  const sourceType = String(item?.sourceType || '').trim().toUpperCase();
  const refType = String(item?.refType || '').trim().toUpperCase();

  if (sourceType === 'BOUNTY' && refType === 'QUESTION' && item?.direction === 'DEBIT') {
    return t('screens.walletDetail.transactionTags.addReward');
  }

  const sourceTypeLabel = getSourceTypeLabel(sourceType, t);
  if (sourceTypeLabel) {
    return sourceTypeLabel;
  }

  return item?.direction === 'DEBIT'
    ? t('screens.walletDetail.transactionTags.expense')
    : t('screens.walletDetail.transactionTags.income');
};

const normalizeTransactionItem = (item, t) => ({
  ...item,
  id: getWalletTransactionUniqueKey(item),
  title: getTransactionTitle(item, t),
  tag: getTransactionTag(item, t),
  amount: Number(item?.amount) || 0,
  createTime: String(item?.createTime || '').trim(),
  txnNo: String(item?.txnNo || '').trim(),
});

export default function WalletDetailScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const initialBalance = route?.params?.balance;
  const initialCurrency = route?.params?.currency || WALLET_POINTS_DEFAULT_CURRENCY;
  const [activeTab, setActiveTab] = useState(TAB_KEYS.INCOME);
  const [walletData, setWalletData] = useState(() => ({
    balance: Number(initialBalance) || 0,
    currency: initialCurrency,
  }));
  const [tabData, setTabData] = useState(() => ({
    [TAB_KEYS.INCOME]: createInitialTabState(),
    [TAB_KEYS.EXPENSE]: createInitialTabState(),
  }));
  const tabDataRef = useRef(tabData);
  const hasFocusedOnceRef = useRef(false);

  const tabs = useMemo(
    () => [
      { key: TAB_KEYS.INCOME, label: t('profile.incomeDetails') },
      { key: TAB_KEYS.EXPENSE, label: t('profile.expenseDetails') },
    ],
    [t]
  );

  const currentTabState = tabData[activeTab] || createInitialTabState();

  useEffect(() => {
    tabDataRef.current = tabData;
  }, [tabData]);

  const formatMoney = useCallback(
    amount => formatRewardPointsValue(amount, { locale: i18n?.locale }),
    [i18n?.locale]
  );

  const loadOverview = useCallback(async () => {
    const response = await walletApi.getPointsOverview();
    if (response?.code !== 0 && response?.code !== 200) {
      throw new Error(response?.msg || 'Failed to load wallet overview');
    }

    const overview = normalizeWalletPointsOverview(response?.data);
    setWalletData({
      balance: overview.balance,
      currency: overview.currency || WALLET_POINTS_DEFAULT_CURRENCY,
    });
  }, []);

  const loadTransactions = useCallback(async (tabKey, options = {}) => {
    const isLoadMore = options.loadMore === true;
    const isRefresh = options.refresh === true;
    const previousTabState = tabDataRef.current?.[tabKey] || createInitialTabState();
    const nextPageNum = isLoadMore ? previousTabState.pageNum + 1 : 1;

    setTabData(prev => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        loading: !isLoadMore && !isRefresh,
        refreshing: isRefresh,
        loadingMore: isLoadMore,
      },
    }));

    try {
      const response = await walletApi.getPointsTransactionList({
        ...buildTabRequestParams(tabKey),
        pageNum: nextPageNum,
        pageSize: PAGE_SIZE,
      });

      if (response?.code !== 0 && response?.code !== 200) {
        throw new Error(response?.msg || 'Failed to load wallet transactions');
      }

      const { rows, total } = extractWalletTransactionRows(response);
      const normalizedRows = rows.map(item => normalizeTransactionItem(item, t));

      setTabData(prev => {
        const prevState = prev[tabKey] || createInitialTabState();
        const items = isLoadMore ? prevState.items.concat(normalizedRows) : normalizedRows;

        return {
          ...prev,
          [tabKey]: {
            ...prevState,
            items,
            pageNum: nextPageNum,
            total,
            loading: false,
            refreshing: false,
            loadingMore: false,
            initialized: true,
          },
        };
      });
    } catch (error) {
      console.error(`Failed to load wallet transactions for ${tabKey}:`, error);
      setTabData(prev => ({
        ...prev,
        [tabKey]: {
          ...(prev[tabKey] || createInitialTabState()),
          loading: false,
          refreshing: false,
          loadingMore: false,
          initialized: true,
        },
      }));
    }
  }, [t]);

  const refreshCurrentTab = useCallback(async () => {
    await Promise.allSettled([
      loadOverview(),
      loadTransactions(activeTab, { refresh: true }),
    ]);
  }, [activeTab, loadOverview, loadTransactions]);

  useEffect(() => {
    loadOverview().catch(error => {
      console.error('Failed to load wallet overview in WalletDetailScreen:', error);
    });
  }, [loadOverview]);

  useEffect(() => {
    if (!currentTabState.initialized && !currentTabState.loading) {
      loadTransactions(activeTab).catch(error => {
        console.error(`Failed to initialize wallet tab ${activeTab}:`, error);
      });
    }
  }, [activeTab, currentTabState.initialized, currentTabState.loading, loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }

      refreshCurrentTab().catch(error => {
        console.error('Failed to refresh wallet detail on focus:', error);
      });

      return undefined;
    }, [refreshCurrentTab])
  );

  const handleLoadMore = useCallback(() => {
    if (
      currentTabState.loading ||
      currentTabState.refreshing ||
      currentTabState.loadingMore ||
      currentTabState.items.length >= currentTabState.total
    ) {
      return;
    }

    loadTransactions(activeTab, { loadMore: true }).catch(error => {
      console.error(`Failed to load more wallet transactions for ${activeTab}:`, error);
    });
  }, [
    activeTab,
    currentTabState.items.length,
    currentTabState.loading,
    currentTabState.loadingMore,
    currentTabState.refreshing,
    currentTabState.total,
    loadTransactions,
  ]);

  const renderItem = ({ item }) => {
    const amountColor = TAB_COLOR_MAP[activeTab] || '#3b82f6';
    const amountPrefix = activeTab === TAB_KEYS.EXPENSE ? '-' : '+';

    return (
      <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
        <View style={styles.listItemLeft}>
          <View style={[styles.iconCircle, { backgroundColor: `${amountColor}15` }]}>
            <Ionicons
              name={TAB_ICON_MAP[activeTab] || 'wallet'}
              size={20}
              color={amountColor}
            />
          </View>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemType} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.listItemTime}>{item.createTime || '--'}</Text>
            {!!item.txnNo && (
              <Text style={styles.listItemTxnNo} numberOfLines={1}>
                {item.txnNo}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.listItemRight}>
          <Text style={[styles.listItemAmount, { color: amountColor }]}>
            {amountPrefix}{formatMoney(item.amount)}
          </Text>
          <Text style={[styles.listItemTag, { color: amountColor }]}>
            {item.tag}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (currentTabState.loading && !currentTabState.items.length) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.emptyHint}>{t('screens.walletDetail.loading')}</Text>
        </View>
      );
    }

    let emptyHint = t('screens.walletDetail.emptyHints.default');
    if (activeTab === TAB_KEYS.INCOME) {
      emptyHint = t('screens.walletDetail.emptyHints.income');
    } else if (activeTab === TAB_KEYS.EXPENSE) {
      emptyHint = t('screens.walletDetail.emptyHints.expense');
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>{t('screens.walletDetail.emptyTitle')}</Text>
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.myWallet')}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceIconWrapper}>
          <Ionicons name="wallet" size={32} color="#ef4444" />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>{t('profile.pointsBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatMoney(walletData.balance)}</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={TAB_ICON_MAP[tab.key]}
              size={20}
              color={activeTab === tab.key ? '#ef4444' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={currentTabState.items}
        renderItem={renderItem}
        keyExtractor={item => `${activeTab}-${item.id}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        refreshControl={(
          <RefreshControl
            refreshing={currentTabState.refreshing}
            onRefresh={() => {
              refreshCurrentTab().catch(error => {
                console.error('Failed to refresh wallet detail list:', error);
              });
            }}
            colors={['#ef4444']}
          />
        )}
        ListFooterComponent={
          currentTabState.loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#ef4444" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRight: {
    width: 32,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: scaleFont(32),
    fontWeight: '700',
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
    gap: 6,
  },
  tabItemActive: {},
  tabText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemType: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listItemTime: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  listItemTxnNo: {
    marginTop: 4,
    fontSize: scaleFont(11),
    color: '#94a3b8',
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    marginBottom: 4,
  },
  listItemTag: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#475569',
  },
  emptyHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
    color: '#94a3b8',
  },
  footerLoading: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
