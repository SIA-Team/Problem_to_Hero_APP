import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import HomeTabContent from '../components/HomeTabContent';
import { useTabPrefetch } from '../hooks/useTabPrefetch';
import { useTranslation } from '../i18n/useTranslation';

const { width: screenWidth } = Dimensions.get('window');

/**
 * 优化版首页
 * 实现了 Tab 懒加载、缓存、预加载等性能优化
 */
export default function HomeScreenOptimized({ navigation }) {
  const { t } = useTranslation();
  
  const [index, setIndex] = useState(2); // 默认显示"推荐" Tab
  const [selectedRegion, setSelectedRegion] = useState('全球');
  
  // Tab 配置
  const routes = useMemo(() => [
    { key: 'follow', title: t('home.follow') },
    { key: 'topics', title: t('home.topics') },
    { key: 'recommend', title: t('home.recommend') },
    { key: 'hot', title: t('home.hotList') },
    { key: 'income', title: t('home.incomeRanking') },
    { key: 'question', title: t('home.questionRanking') },
    { key: 'sameCity', title: t('home.sameCity') },
    { key: 'country', title: t('home.country') },
    { key: 'industry', title: t('home.industry') },
    { key: 'personal', title: t('home.personal') },
    { key: 'workplace', title: t('home.workplace') },
    { key: 'education', title: t('home.education') },
  ], [t]);
  
  /**
   * 预加载函数
   */
  const prefetchTab = useCallback((tab, tabIndex) => {
    console.log(`🔮 预加载 Tab: ${tab.title} (index: ${tabIndex})`);
    // 这里可以触发预加载逻辑
    // 由于我们使用了 useTabData Hook，它会在 Tab 激活时自动加载
    // 预加载主要是为了提前准备数据
  }, []);
  
  /**
   * 使用预加载 Hook
   */
  useTabPrefetch(index, routes, prefetchTab, {
    delay: 500,
    prefetchDistance: 1,
    enabled: true,
  });
  
  /**
   * 渲染场景
   */
  const renderScene = useCallback(({ route }) => {
    const isActive = routes[index].key === route.key;
    
    // 特殊处理某些 Tab
    if (route.key === 'topics') {
      // 话题 Tab 可以使用不同的组件
      return (
        <View style={styles.comingSoon}>
          <Ionicons name="construct-outline" size={48} color="#9ca3af" />
          <Text style={styles.comingSoonText}>话题功能开发中...</Text>
        </View>
      );
    }
    
    return (
      <HomeTabContent
        tabKey={route.key}
        tabType={route.key}
        isActive={isActive}
        navigation={navigation}
      />
    );
  }, [index, routes, navigation]);
  
  /**
   * 渲染 TabBar
   */
  const renderTabBar = useCallback((props) => (
    <TabBar
      {...props}
      scrollEnabled
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      tabStyle={styles.tab}
      labelStyle={styles.label}
      activeColor="#ef4444"
      inactiveColor="#6b7280"
      pressColor="rgba(239, 68, 68, 0.1)"
    />
  ), []);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部搜索栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => {
            // 打开地区选择器
            console.log('打开地区选择器');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color="#ef4444" />
          <Text style={styles.regionText} numberOfLines={1}>
            {selectedRegion}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={16} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>{t('home.search')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('MyTeams')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={22} color="#4b5563" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Messages')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#4b5563" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* Tab 视图 */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        lazy
        lazyPreloadDistance={1}
        initialLayout={{ width: screenWidth }}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    marginRight: 8,
    maxWidth: 80,
  },
  regionText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  iconBtn: {
    padding: 4,
    marginLeft: 4,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  tabBar: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  indicator: {
    backgroundColor: '#ef4444',
    height: 3,
    borderRadius: 1.5,
  },
  tab: {
    width: 'auto',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'none',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});
