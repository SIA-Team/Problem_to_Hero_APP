import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/useTranslation';
import Avatar from '../components/Avatar';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';

/**
 * 付费用户列表页面
 * 显示已付费查看问题的用户信息
 */
export default function PaidUsersListScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { questionId, totalAmount, paidCount } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paidUsers, setPaidUsers] = useState([]);

  // 加载付费用户列表
  const loadPaidUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // TODO: 调用实际的API接口获取付费用户列表
      // const response = await questionApi.getPaidUsers(questionId);
      
      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockData = [
        {
          id: 1,
          userId: 'user1',
          userName: '张三',
          userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
          amount: 20,
          paidAt: '2024-03-20 14:30',
          timestamp: new Date('2024-03-20 14:30').getTime()
        },
        {
          id: 2,
          userId: 'user2',
          userName: '李四',
          userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
          amount: 20,
          paidAt: '2024-03-19 10:15',
          timestamp: new Date('2024-03-19 10:15').getTime()
        },
        {
          id: 3,
          userId: 'user3',
          userName: '王五',
          userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
          amount: 20,
          paidAt: '2024-03-18 16:45',
          timestamp: new Date('2024-03-18 16:45').getTime()
        }
      ];

      setPaidUsers(mockData);
    } catch (error) {
      console.error('加载付费用户列表失败:', error);
      showToast('加载失败，请重试', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaidUsers();
  }, []);

  // 渲染用户项
  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <Avatar 
        uri={item.userAvatar} 
        name={item.userName} 
        size={44} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.paidTime}>{item.paidAt}</Text>
      </View>
      <Text style={styles.paidAmount}>${item.amount}</Text>
    </View>
  );

  // 渲染空状态
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>{t('screens.paidUsersList.empty')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navigationBar}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.navigationTitle}>{t('screens.paidUsersList.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 头部统计信息 */}
      <View style={styles.header}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('screens.paidUsersList.totalIncome')}</Text>
          <Text style={styles.statValue}>${totalAmount || 0}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('screens.paidUsersList.paidCount')}</Text>
          <Text style={styles.statValue}>{paidCount || paidUsers.length}</Text>
        </View>
      </View>

      {/* 用户列表 */}
      <FlatList
        data={paidUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPaidUsers(true)}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  backBtn: {
    padding: 4,
    width: 32
  },
  navigationTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center'
  },
  placeholder: {
    width: 32
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  statCard: {
    flex: 1,
    alignItems: 'center'
  },
  statLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 8
  },
  statValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#1f2937'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  userInfo: {
    flex: 1,
    marginLeft: 12
  },
  userName: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  paidTime: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  paidAmount: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#22c55e'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: scaleFont(15),
    color: '#9ca3af',
    marginTop: 16
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  }
});
