import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/useTranslation';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';

import { scaleFont } from '../utils/responsive';
// 悬赏榜数据（示例数据）
const rewardRankingData = [
  {
    id: 1,
    rank: 1,
    title: '如何在三个月内从零基础学会Python编程？求详细学习路线和资源推荐',
    reward: 500,
    hot: '2856万',
    tag: '热',
    tagColor: '#ef4444',
    author: '张三丰',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward1',
    answers: 156,
    viewCount: '28.5万',
    timeLeft: '2天',
    isUp: true,
    category: '编程学习',
  },
  {
    id: 2,
    rank: 2,
    title: '35岁程序员如何规划职业发展？是继续技术深耕还是转管理？',
    reward: 300,
    hot: '1923万',
    tag: '热',
    tagColor: '#ef4444',
    author: '程序员老王',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward2',
    answers: 234,
    viewCount: '19.2万',
    timeLeft: '5天',
    isUp: true,
    category: '职业发展',
  },
  {
    id: 3,
    rank: 3,
    title: '如何系统学习人工智能和机器学习？需要哪些数学基础？',
    reward: 280,
    hot: '1645万',
    tag: '新',
    tagColor: '#22c55e',
    author: 'AI研究员',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward3',
    answers: 189,
    viewCount: '16.4万',
    timeLeft: '3天',
    isUp: false,
    category: '人工智能',
  },
  {
    id: 4,
    rank: 4,
    title: '创业公司技术选型：微服务架构还是单体架构？',
    reward: 250,
    hot: '1234万',
    tag: '',
    tagColor: '',
    author: '技术总监',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward4',
    answers: 145,
    viewCount: '12.3万',
    timeLeft: '1天',
    isUp: true,
    category: '技术架构',
  },
  {
    id: 5,
    rank: 5,
    title: '如何提高团队代码质量？有哪些最佳实践和工具推荐？',
    reward: 200,
    hot: '987万',
    tag: '',
    tagColor: '',
    author: '研发经理',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward5',
    answers: 123,
    viewCount: '9.8万',
    timeLeft: '4天',
    isUp: false,
    category: '团队管理',
  },
  {
    id: 6,
    rank: 6,
    title: '前端性能优化有哪些实用技巧？如何监控和分析性能瓶颈？',
    reward: 180,
    hot: '876万',
    tag: '',
    tagColor: '',
    author: '前端架构师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward6',
    answers: 98,
    viewCount: '8.7万',
    timeLeft: '6天',
    isUp: true,
    category: '前端开发',
  },
  {
    id: 7,
    rank: 7,
    title: '数据库设计有哪些常见的坑？如何避免性能问题？',
    reward: 150,
    hot: '765万',
    tag: '',
    tagColor: '',
    author: 'DBA专家',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward7',
    answers: 87,
    viewCount: '7.6万',
    timeLeft: '2天',
    isUp: false,
    category: '数据库',
  },
  {
    id: 8,
    rank: 8,
    title: '如何从零开始搭建一个完整的DevOps流程？',
    reward: 120,
    hot: '654万',
    tag: '',
    tagColor: '',
    author: '运维工程师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reward8',
    answers: 76,
    viewCount: '6.5万',
    timeLeft: '5天',
    isUp: true,
    category: 'DevOps',
  },
];

// 排名徽章背景色
const getRankBg = (rank) => {
  if (rank === 1) return '#ef4444';
  if (rank === 2) return '#f97316';
  if (rank === 3) return '#f59e0b';
  return '#9ca3af';
};

// 悬赏榜项组件
function RewardItem({ item, onPress, t }) {
  const { i18n } = useTranslation();
  return (
    <TouchableOpacity style={styles.rewardItem} onPress={onPress}>
      <View style={[styles.rankBadge, { backgroundColor: getRankBg(item.rank) }]}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      
      <View style={styles.rewardContent}>
        {/* 标题 */}
        <View style={styles.titleRow}>
          <Text style={styles.rewardTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>

        {/* 悬赏金额和热度 - 同一行显示 */}
        <View style={styles.rewardInfoRow}>
          <View style={styles.rewardAmountBadge}>
            <Ionicons name="cash" size={14} color="#fff" />
            <Text style={styles.rewardAmountText}>{formatRewardPointsValue(item.reward, { locale: i18n?.locale })}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={14} color="#ef4444" />
            <Text style={styles.statValue}>{item.hot}</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

export default function RewardRankingScreen({ navigation }) {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 刷新数据
  const onRefresh = async () => {
    setRefreshing(true);
    // 模拟API调用
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // 跳转到问题详情
  const navigateToDetail = (item) => {
    navigation.navigate('QuestionDetail', { id: item.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>悬赏榜</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 榜单说明 */}
      <View style={styles.descriptionCard}>
        <View style={styles.descriptionHeader}>
          <Ionicons name="trophy" size={20} color="#ef4444" />
          <Text style={styles.descriptionTitle}>悬赏榜说明</Text>
        </View>
        <Text style={styles.descriptionText}>
          根据悬赏金额、热度、回答数等综合排名，展示最受关注的悬赏问题
        </Text>
      </View>

      {/* 悬赏榜列表 */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ef4444" />
          </View>
        ) : (
          rewardRankingData.map((item) => (
            <RewardItem
              key={item.id}
              item={item}
              onPress={() => navigateToDetail(item)}
              t={t}
            />
          ))
        )}
      </ScrollView>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerRight: {
    width: 40,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  descriptionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18),
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '700',
  },
  rewardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rewardTitle: {
    flex: 1,
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: scaleFont(22),
  },
  rewardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  rewardAmountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  rewardAmountText: {
    color: '#fff',
    fontSize: scaleFont(13),
    fontWeight: '700',
    marginLeft: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statValue: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginLeft: 4,
    marginRight: 4,
  },
});
