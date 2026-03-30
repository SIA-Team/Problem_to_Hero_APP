import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/useTranslation';
import { showToast } from '../utils/toast';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';

import { scaleFont } from '../utils/responsive';
export default function HeroRankingScreen({ navigation }) {
  const { t } = useTranslation();
  
  const tabs = [
    { id: 'adopted', label: '被采纳' },
    { id: 'liked', label: '被点赞' },
    { id: 'questions', label: '发问题' },
    { id: 'answers', label: '写回答' },
  ];
  
  const [activeTab, setActiveTab] = useState('adopted');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingData, setRankingData] = useState([]);

  // 模拟数据加载
  const loadRankingData = async (tabId, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 模拟 API 调用延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 模拟不同类型的排行数据
      const mockData = generateMockData(tabId);
      setRankingData(mockData);
    } catch (error) {
      console.error('加载排行榜数据失败:', error);
      showToast('加载失败，请重试', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 生成模拟数据
  const generateMockData = (tabId) => {
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'];
    const avatars = [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=9',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=10',
    ];

    return names.map((name, index) => {
      let count, label;
      switch (tabId) {
        case 'adopted':
          count = 150 - index * 10;
          label = '次采纳';
          break;
        case 'liked':
          count = 2500 - index * 150;
          label = '个赞';
          break;
        case 'questions':
          count = 320 - index * 20;
          label = '个问题';
          break;
        case 'answers':
          count = 580 - index * 35;
          label = '个回答';
          break;
        default:
          count = 100;
          label = '';
      }

      return {
        id: index + 1,
        userId: 1000 + index,
        name,
        avatar: avatars[index],
        count,
        label,
        rank: index + 1,
      };
    });
  };

  useEffect(() => {
    loadRankingData(activeTab);
  }, [activeTab]);

  const onRefresh = () => {
    loadRankingData(activeTab, true);
  };

  const handleUserPress = (item) => {
    navigateToPublicProfile(navigation, item.userId);
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return { icon: '🥇', color: '#FFD700' };
    if (rank === 2) return { icon: '🥈', color: '#C0C0C0' };
    if (rank === 3) return { icon: '🥉', color: '#CD7F32' };
    return { icon: rank.toString(), color: '#6B7280' };
  };

  const renderItem = ({ item }) => {
    const rankInfo = getRankIcon(item.rank);
    
    return (
      <TouchableOpacity
        style={styles.rankItem}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rankBadge}>
          {item.rank <= 3 ? (
            <Text style={styles.rankEmoji}>{rankInfo.icon}</Text>
          ) : (
            <Text style={[styles.rankNumber, { color: rankInfo.color }]}>{rankInfo.icon}</Text>
          )}
        </View>

        <Avatar
          source={{ uri: item.avatar }}
          size={48}
          style={styles.avatar}
        />

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.countRow}>
            <Text style={styles.countNumber}>{item.count}</Text>
            <Text style={styles.countLabel}>{item.label}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>英雄榜</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab 切换 */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* 排行榜列表 */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={rankingData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#EF4444']}
              tintColor="#EF4444"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: scaleFont(15),
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#EF4444',
    borderRadius: 1.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: scaleFont(24),
  },
  rankNumber: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNumber: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#EF4444',
    marginRight: 4,
  },
  countLabel: {
    fontSize: scaleFont(13),
    color: '#6B7280',
  },
});
