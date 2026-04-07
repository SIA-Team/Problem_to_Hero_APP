import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { getMockRechargeRecords, getMockWalletExpenseRecords } from '../utils/walletMock';

import { scaleFont } from '../utils/responsive';
export default function WalletDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { balance = 0, currency = 'usd' } = route.params || {};
  
  const [activeTab, setActiveTab] = useState('income'); // income, expense, recharge
  const [refreshing, setRefreshing] = useState(false);
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);
  const [rechargeList, setRechargeList] = useState([]);

  // 获取货币符号
  const getCurrencySymbol = (curr) => {
    switch (String(curr || 'usd').toLowerCase()) {
      case 'usd': return '$';
      case 'cny':
      case 'rmb': return '¥';
      case 'eur': return '€';
      case 'gbp': return '£';
      default: return '$';
    }
  };

  // 格式化金额
  const formatAmount = (amount) => {
    const num = Number(amount);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  };

  // 加载数据
  const loadData = async () => {
    try {
      const mockRechargeRecords = await getMockRechargeRecords();
      const mockExpenseRecords = await getMockWalletExpenseRecords();
      // TODO: 调用实际的 API
      // 这里使用模拟数据
      setIncomeList([
        { id: 1, type: '问题被采纳', amount: 50.00, time: '2024-03-20 14:30', status: 'completed' },
        { id: 2, type: '回答获赞', amount: 10.00, time: '2024-03-19 10:15', status: 'completed' },
        { id: 3, type: '回答收入', amount: 30.00, time: '2024-03-18 16:45', status: 'completed' },
      ]);
      
      setExpenseList([
        ...mockExpenseRecords,
        { id: 1, type: '发布紧急求助', amount: 30.00, time: '2024-03-20 12:00', status: 'completed' },
        { id: 2, type: '购买超级赞', amount: 5.00, time: '2024-03-19 09:30', status: 'completed' },
        { id: 3, type: '提现', amount: 100.00, time: '2024-03-18 15:20', status: 'processing' },
        { id: 4, type: '悬赏支出', amount: 50.00, time: '2024-03-17 11:00', status: 'completed' },
      ]);
      
      setRechargeList([
        ...mockRechargeRecords,
        { id: 1, type: 'Stripe充值', amount: 100.00, time: '2024-03-20 08:00', status: 'completed' },
        { id: 2, type: 'Stripe充值', amount: 50.00, time: '2024-03-15 14:30', status: 'completed' },
        { id: 3, type: 'Stripe充值', amount: 200.00, time: '2024-03-10 10:00', status: 'failed' },
      ]);
    } catch (error) {
      console.error('加载钱包明细失败:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 获取当前列表
  const getCurrentList = () => {
    switch (activeTab) {
      case 'income': return incomeList;
      case 'expense': return expenseList;
      case 'recharge': return rechargeList;
      default: return [];
    }
  };

  // 获取状态文本和颜色
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { text: '已完成', color: '#22c55e' };
      case 'processing':
        return { text: '处理中', color: '#f59e0b' };
      case 'failed':
        return { text: '失败', color: '#ef4444' };
      default:
        return { text: '未知', color: '#9ca3af' };
    }
  };

  // 渲染列表项
  const renderItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const isIncome = activeTab === 'income';
    const isExpense = activeTab === 'expense';
    const amountColor = isIncome ? '#22c55e' : isExpense ? '#ef4444' : '#3b82f6';
    const amountPrefix = isIncome ? '+' : isExpense ? '-' : '+';

    return (
      <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
        <View style={styles.listItemLeft}>
          <View style={[styles.iconCircle, { backgroundColor: `${amountColor}15` }]}>
            <Ionicons 
              name={isIncome ? 'arrow-down' : isExpense ? 'arrow-up' : 'card'} 
              size={20} 
              color={amountColor} 
            />
          </View>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemType}>{item.type}</Text>
            <Text style={styles.listItemTime}>{item.time}</Text>
          </View>
        </View>
        <View style={styles.listItemRight}>
          <Text style={[styles.listItemAmount, { color: amountColor }]}>
            {amountPrefix}{getCurrencySymbol(currency)}{formatAmount(item.amount)}
          </Text>
          <Text style={[styles.listItemStatus, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>暂无记录</Text>
      <Text style={styles.emptyHint}>
        {activeTab === 'income' && '还没有收入记录'}
        {activeTab === 'expense' && '还没有支出记录'}
        {activeTab === 'recharge' && '还没有充值记录'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>钱包明细</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 余额卡片 */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconWrapper}>
          <Ionicons name="wallet" size={32} color="#ef4444" />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>当前余额</Text>
          <Text style={styles.balanceAmount}>
            {getCurrencySymbol(currency)}{formatAmount(balance)}
          </Text>
        </View>
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'income' && styles.tabItemActive]}
          onPress={() => setActiveTab('income')}
        >
          <Ionicons 
            name="arrow-down-circle" 
            size={20} 
            color={activeTab === 'income' ? '#ef4444' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
            收入明细
          </Text>
          {activeTab === 'income' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'expense' && styles.tabItemActive]}
          onPress={() => setActiveTab('expense')}
        >
          <Ionicons 
            name="arrow-up-circle" 
            size={20} 
            color={activeTab === 'expense' ? '#ef4444' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>
            支出明细
          </Text>
          {activeTab === 'expense' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'recharge' && styles.tabItemActive]}
          onPress={() => setActiveTab('recharge')}
        >
          <Ionicons 
            name="card" 
            size={20} 
            color={activeTab === 'recharge' ? '#ef4444' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, activeTab === 'recharge' && styles.tabTextActive]}>
            充值明细
          </Text>
          {activeTab === 'recharge' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* 列表 */}
      <FlatList
        data={getCurrentList()}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeTab}-${item.id}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ef4444']} />
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
  tabItemActive: {
    // Active state handled by indicator
  },
  tabText: {
    fontSize: scaleFont(15),
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
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ef4444',
    borderRadius: 1.5,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    marginBottom: 4,
  },
  listItemStatus: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
});
