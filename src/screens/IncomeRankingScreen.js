import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';

// 收入榜数据
const incomeRankingData = [{
  id: 1,
  rank: 1,
  user: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income1',
  verified: true,
  title: '资深Python开发 · 10年经验',
  totalIncome: 125680,
  monthIncome: 28560,
  answersCount: 1234,
  adoptedCount: 567,
  rewardCount: 234,
  trend: 'up',
  trendValue: 15
}, {
  id: 2,
  rank: 2,
  user: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income2',
  verified: true,
  title: '数据分析师 · 8年经验',
  totalIncome: 98750,
  monthIncome: 21340,
  answersCount: 987,
  adoptedCount: 456,
  rewardCount: 189,
  trend: 'up',
  trendValue: 8
}, {
  id: 3,
  rank: 3,
  user: '技术博主老李',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income3',
  verified: true,
  title: '全栈工程师 · 12年经验',
  totalIncome: 87650,
  monthIncome: 19870,
  answersCount: 876,
  adoptedCount: 398,
  rewardCount: 167,
  trend: 'down',
  trendValue: 3
}, {
  id: 4,
  rank: 4,
  user: 'AI研究员',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income4',
  verified: true,
  title: 'AI工程师 · 6年经验',
  totalIncome: 76540,
  monthIncome: 17650,
  answersCount: 654,
  adoptedCount: 321,
  rewardCount: 145,
  trend: 'up',
  trendValue: 12
}, {
  id: 5,
  rank: 5,
  user: '前端大神',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income5',
  verified: false,
  title: '前端开发 · 5年经验',
  totalIncome: 65430,
  monthIncome: 15230,
  answersCount: 543,
  adoptedCount: 267,
  rewardCount: 123,
  trend: 'up',
  trendValue: 6
}, {
  id: 6,
  rank: 6,
  user: '后端架构师',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income6',
  verified: true,
  title: '后端架构师 · 9年经验',
  totalIncome: 58760,
  monthIncome: 13450,
  answersCount: 478,
  adoptedCount: 234,
  rewardCount: 109,
  trend: 'same',
  trendValue: 0
}, {
  id: 7,
  rank: 7,
  user: '产品经理小张',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income7',
  verified: false,
  title: '产品经理 · 4年经验',
  totalIncome: 52340,
  monthIncome: 12100,
  answersCount: 412,
  adoptedCount: 198,
  rewardCount: 95,
  trend: 'down',
  trendValue: 2
}, {
  id: 8,
  rank: 8,
  user: 'UI设计师',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income8',
  verified: false,
  title: 'UI/UX设计师 · 3年经验',
  totalIncome: 47890,
  monthIncome: 10980,
  answersCount: 356,
  adoptedCount: 176,
  rewardCount: 87,
  trend: 'up',
  trendValue: 4
}, {
  id: 9,
  rank: 9,
  user: '运维工程师',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income9',
  verified: true,
  title: '运维工程师 · 7年经验',
  totalIncome: 43210,
  monthIncome: 9870,
  answersCount: 298,
  adoptedCount: 145,
  rewardCount: 76,
  trend: 'up',
  trendValue: 7
}, {
  id: 10,
  rank: 10,
  user: '测试工程师',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=income10',
  verified: false,
  title: '测试工程师 · 4年经验',
  totalIncome: 39560,
  monthIncome: 8760,
  answersCount: 267,
  adoptedCount: 132,
  rewardCount: 68,
  trend: 'same',
  trendValue: 0
}];
const rankingTabs = ['totalIncome', 'monthIncome', 'weekIncome'];
const getRankBg = rank => {
  if (rank === 1) return '#ef4444';
  if (rank === 2) return '#f97316';
  if (rank === 3) return '#f59e0b';
  return '#9ca3af';
};
const formatMoney = amount => {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万';
  }
  return amount.toLocaleString();
};

// 排行榜项组件
function RankingItem({
  item,
  onPress,
  t
}) {
  return <TouchableOpacity style={styles.rankingItem} onPress={onPress}>
      <View style={[styles.rankBadge, {
      backgroundColor: getRankBg(item.rank)
    }]}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      
      <Avatar uri={item.avatar} name={item.user} size={48} />
      
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.user}</Text>
          {Boolean(item.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
        </View>
        <Text style={styles.userTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.statText}>{item.answersCount}{t('screens.incomeRankingScreen.stats.answers')}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#22c55e" />
            <Text style={styles.statText}>{item.adoptedCount}{t('screens.incomeRankingScreen.stats.adopted')}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="gift-outline" size={12} color="#f59e0b" />
            <Text style={styles.statText}>{item.rewardCount}{t('screens.incomeRankingScreen.stats.reward')}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.incomeInfo}>
        <View style={styles.incomeRow}>
          <Text style={styles.incomeAmount}>${formatMoney(item.totalIncome)}</Text>
          {item.trend === 'up' && <View style={styles.trendBadge}>
              <Ionicons name="trending-up" size={12} color="#22c55e" />
              <Text style={styles.trendText}>{item.trendValue}%</Text>
            </View>}
          {item.trend === 'down' && <View style={[styles.trendBadge, styles.trendBadgeDown]}>
              <Ionicons name="trending-down" size={12} color="#ef4444" />
              <Text style={[styles.trendText, styles.trendTextDown]}>{item.trendValue}%</Text>
            </View>}
          {item.trend === 'same' && <View style={[styles.trendBadge, styles.trendBadgeSame]}>
              <Ionicons name="remove" size={12} color="#9ca3af" />
            </View>}
        </View>
        <Text style={styles.monthIncome}>{t('screens.incomeRankingScreen.monthIncome')} ${formatMoney(item.monthIncome)}</Text>
      </View>
    </TouchableOpacity>;
}
export default function IncomeRankingScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const [activeTab, setActiveTab] = useState('totalIncome');
  const handleItemPress = item => {
    navigation.navigate('Profile', {
      userId: item.id
    });
  };
  return <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.incomeRankingScreen.title')}</Text>
        <TouchableOpacity style={styles.infoBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7} onPress={() => showToast(t('screens.incomeRankingScreen.infoContent'), 'info')}>
          <Ionicons name="information-circle-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rankingTabs.map(tab => <TouchableOpacity key={tab} style={[styles.tabItem, activeTab === tab && styles.tabItemActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {t(`screens.incomeRankingScreen.tabs.${tab}`)}
              </Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>

      <View style={styles.updateInfo}>
        <Ionicons name="time-outline" size={14} color="#9ca3af" />
        <Text style={styles.updateText}>{t('screens.incomeRankingScreen.updateInfo').replace('{time}', '5分钟前')}</Text>
      </View>

      <ScrollView style={styles.list}>
        {incomeRankingData.map(item => <RankingItem key={item.id} item={item} onPress={() => handleItemPress(item)} t={t} />)}
        <View style={styles.listFooter}>
          <Text style={styles.footerText}>{t('screens.incomeRankingScreen.allShown')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  infoBtn: {
    padding: 4
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444'
  },
  tabText: {
    fontSize: 15,
    color: '#6b7280'
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fafafa'
  },
  updateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4
  },
  list: {
    flex: 1
  },
  listFooter: {
    paddingVertical: 30,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af'
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  rankText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff'
  },
  userInfo: {
    flex: 1,
    marginLeft: 12
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937'
  },
  userTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  statText: {
    fontSize: 11,
    color: '#9ca3af'
  },
  incomeInfo: {
    alignItems: 'flex-end',
    marginLeft: 12
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  incomeAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ef4444'
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  trendBadgeDown: {
    backgroundColor: '#fef2f2'
  },
  trendBadgeSame: {
    backgroundColor: '#f9fafb'
  },
  trendText: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '600'
  },
  trendTextDown: {
    color: '#ef4444'
  },
  monthIncome: {
    fontSize: 11,
    color: '#9ca3af'
  }
});