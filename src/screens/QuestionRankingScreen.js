import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatNumber } from '../utils/numberFormatter';

import { scaleFont } from '../utils/responsive';
// 排行榜分类
const rankingTabs = [
  { key: 'answers', labelKey: 'screens.questionRanking.tabs.mostAnswers', icon: 'chatbubbles' },
  { key: 'comments', labelKey: 'screens.questionRanking.tabs.mostComments', icon: 'chatbox-ellipses' },
  { key: 'favorites', labelKey: 'screens.questionRanking.tabs.mostFavorites', icon: 'bookmark' },
  { key: 'views', labelKey: 'screens.questionRanking.tabs.mostViews', icon: 'eye' },
  { key: 'likes', labelKey: 'screens.questionRanking.tabs.mostLikes', icon: 'thumbs-up' },
];

// 模拟数据
const mockData = {
  answers: [
    { id: 'q1', rank: 1, title: '如何在三个月内从零基础学会Python编程？', answersCount: 2345, viewsCount: 156000, reward: 50, type: 'reward' },
    { id: 'q2', rank: 2, title: '35岁程序员如何规划职业发展？', answersCount: 1892, viewsCount: 123000, reward: 100, type: 'reward' },
    { id: 'q3', rank: 3, title: '第一次养猫需要准备什么？', answersCount: 1567, viewsCount: 98000, type: 'free' },
    { id: 'q4', rank: 4, title: '长期失眠应该怎么调理？', answersCount: 1234, viewsCount: 87000, type: 'free' },
    { id: 'q5', rank: 5, title: '如何写一份优秀的简历？', answersCount: 987, viewsCount: 76000, reward: 30, type: 'reward' },
  ],
  comments: [
    { id: 'q6', rank: 1, title: 'AI大模型会取代程序员吗？', commentsCount: 3456, viewsCount: 234000, type: 'free' },
    { id: 'q7', rank: 2, title: '2026年最值得学习的编程语言是什么？', commentsCount: 2987, viewsCount: 198000, reward: 80, type: 'reward' },
    { id: 'q8', rank: 3, title: '如何判断一个人是否真心喜欢你？', commentsCount: 2345, viewsCount: 167000, type: 'free' },
    { id: 'q9', rank: 4, title: '30岁转行还来得及吗？', commentsCount: 1987, viewsCount: 145000, reward: 50, type: 'reward' },
    { id: 'q10', rank: 5, title: '如何克服社交恐惧症？', commentsCount: 1654, viewsCount: 123000, type: 'free' },
  ],
  favorites: [
    { id: 'q11', rank: 1, title: 'Python爬虫入门教程推荐', favoritesCount: 4567, viewsCount: 289000, reward: 100, type: 'reward' },
    { id: 'q12', rank: 2, title: '如何高效学习一门新技能？', favoritesCount: 3987, viewsCount: 256000, type: 'free' },
    { id: 'q13', rank: 3, title: '基金定投真的能赚钱吗？', favoritesCount: 3456, viewsCount: 234000, reward: 60, type: 'reward' },
    { id: 'q14', rank: 4, title: '每天喝多少水才健康？', favoritesCount: 2987, viewsCount: 198000, type: 'free' },
    { id: 'q15', rank: 5, title: '如何科学减肥不反弹？', favoritesCount: 2654, viewsCount: 176000, type: 'free' },
  ],
  views: [
    { id: 'q16', rank: 1, title: 'ChatGPT对互联网行业的影响有多大？', viewsCount: 567000, answersCount: 2345, reward: 200, type: 'reward' },
    { id: 'q17', rank: 2, title: '华为Mate 60系列为何能突破封锁？', viewsCount: 489000, answersCount: 1987, type: 'free' },
    { id: 'q18', rank: 3, title: '2026年是买房好时机吗？', viewsCount: 423000, answersCount: 1654, reward: 150, type: 'reward' },
    { id: 'q19', rank: 4, title: 'iPhone 15 Pro值得购买吗？', viewsCount: 398000, answersCount: 1432, type: 'free' },
    { id: 'q20', rank: 5, title: '如何处理婆媳关系？', viewsCount: 367000, answersCount: 1234, type: 'free' },
  ],
  likes: [
    { id: 'q21', rank: 1, title: '有什么简单又好吃的家常菜推荐？', likesCount: 5678, viewsCount: 345000, type: 'free' },
    { id: 'q22', rank: 2, title: '2026年国内旅游最值得去的地方', likesCount: 4987, viewsCount: 312000, reward: 80, type: 'reward' },
    { id: 'q23', rank: 3, title: '如何写一份优秀的简历？', likesCount: 4321, viewsCount: 289000, type: 'free' },
    { id: 'q24', rank: 4, title: '面试时如何谈薪资？', likesCount: 3987, viewsCount: 267000, reward: 50, type: 'reward' },
    { id: 'q25', rank: 5, title: '年轻人如何开始理财？', likesCount: 3654, viewsCount: 245000, type: 'free' },
  ],
};

export default function QuestionRankingScreen({ navigation }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('answers');
  const [refreshing, setRefreshing] = useState(false);
  const [rankingData, setRankingData] = useState(mockData);

  const currentData = rankingData[activeTab] || [];

  const handleRefresh = () => {
    setRefreshing(true);
    // 模拟API请求
    setTimeout(() => {
      // 这里可以重新加载数据
      setRankingData(mockData);
      setRefreshing(false);
    }, 1000);
  };

  const handleQuestionPress = (item) => {
    navigation.navigate('QuestionDetail', { id: item.id });
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return '#ef4444';
    if (rank === 2) return '#f97316';
    if (rank === 3) return '#f59e0b';
    return '#9ca3af';
  };

  const getStatInfo = (item) => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.questionRanking.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 分类标签 */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {rankingTabs.map((tab) => (
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

      {/* 问题列表 */}
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
        {currentData.map((item) => {
          const statInfo = getStatInfo(item);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.questionItem}
              onPress={() => handleQuestionPress(item)}
              activeOpacity={0.7}
            >
              {/* 排名徽章 */}
              <View style={[styles.rankBadge, { backgroundColor: getRankBadgeColor(item.rank) }]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              {/* 问题内容 */}
              <View style={styles.questionContent}>
                <Text style={styles.questionTitle} numberOfLines={2}>
                  {item.type === 'reward' && item.reward && (
                    <Text style={styles.rewardTagInline}>${item.reward} </Text>
                  )}
                  {item.title}
                </Text>

                <View style={styles.statsRow}>
                  {/* 主要统计 */}
                  <View style={styles.mainStat}>
                    <Ionicons name={statInfo.icon} size={16} color="#10b981" />
                    <Text style={styles.mainStatValue}>{formatNumber(statInfo.value)}</Text>
                    <Text style={styles.mainStatLabel}>{statInfo.label}</Text>
                  </View>

                  {/* 浏览数 */}
                  <View style={styles.secondaryStat}>
                    <Ionicons name="eye-outline" size={14} color="#9ca3af" />
                    <Text style={styles.secondaryStatText}>{formatNumber(item.viewsCount)}</Text>
                  </View>
                </View>
              </View>

              {/* 箭头 */}
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>
          );
        })}

        <View style={styles.listFooter}>
          <Text style={styles.footerText}>{t('screens.questionRanking.allContentShown')}</Text>
        </View>
      </ScrollView>
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
