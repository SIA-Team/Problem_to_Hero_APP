/**
 * 优化的问题列表 Hook - 今日头条式优化策略
 * 
 * 核心功能：
 * 1. 缓存优先加载
 * 2. Tab 预加载
 * 3. 智能分页
 * 4. 自动刷新检测
 * 
 * 使用方法：
 * const {
 *   questionList,
 *   loading,
 *   refreshing,
 *   loadingMore,
 *   hasMore,
 *   hasNewContent,
 *   onRefresh,
 *   onLoadMore,
 *   onTabChange,
 * } = useOptimizedQuestions(activeTab, allTabs);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  loadQuestions,
  prefetchAdjacentTabs,
  prefetchNextPage,
  checkForNewContent,
  clearTabCache,
} from '../utils/dataLoader';

// Tab 类型映射（将显示名称映射到 API 类型）
const TAB_TYPE_MAP = {
  '推荐': 'recommend',
  '热榜': 'hot',
  '关注': 'follow',
  'Recommend': 'recommend',
  'Hot List': 'hot',
  'Follow': 'follow',
  // 其他 Tab 使用默认类型
};

export const useOptimizedQuestions = (activeTab, allTabs = [], onDebugUpdate = null) => {
  const [questionList, setQuestionList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);
  const [page, setPage] = useState(1);
  
  const appState = useRef(AppState.currentState);
  const checkInterval = useRef(null);
  const isInitialLoad = useRef(true);
  
  // 获取 Tab 类型
  const getTabType = useCallback((tab) => {
    return TAB_TYPE_MAP[tab] || 'recommend';
  }, []);
  
  /**
   * 加载数据（核心函数）
   */
  const loadData = useCallback(async (tabType, pageNum, forceRefresh = false) => {
    try {
      const { data, fromCache } = await loadQuestions(tabType, pageNum, forceRefresh, onDebugUpdate);
      
      if (fromCache) {
        console.log(`✅ 使用缓存数据: ${tabType} - 第${pageNum}页`);
      } else {
        console.log(`✅ 使用网络数据: ${tabType} - 第${pageNum}页`);
      }
      
      // 显示最后一条数据的昵称
      if (data && data.length > 0) {
        const lastItem = data[data.length - 1];
        console.log('='.repeat(60));
        console.log('📋 最后一条问题数据:');
        console.log('  ID:', lastItem.id);
        console.log('  标题:', lastItem.title?.substring(0, 30) + '...');
        console.log('  authorNickName:', lastItem.authorNickName);
        console.log('  authorAvatar:', lastItem.authorAvatar);
        console.log('  author (兼容字段):', lastItem.author);
        console.log('  avatar (兼容字段):', lastItem.avatar);
        console.log('='.repeat(60));
      }
      
      return data || [];
    } catch (error) {
      console.warn(`加载数据失败: ${tabType} - 第${pageNum}页`, error);
      return [];
    }
  }, [onDebugUpdate]);
  
  /**
   * 初始加载
   */
  const initialLoad = useCallback(async () => {
    if (!activeTab) return;
    
    setLoading(true);
    const tabType = getTabType(activeTab);
    
    try {
      const data = await loadData(tabType, 1, true);
      setQuestionList(data);
      setPage(1);
      setHasMore(data.length >= 20);
      
      // 预加载相邻 Tab
      if (allTabs.length > 0) {
        prefetchAdjacentTabs(activeTab, allTabs);
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [activeTab, allTabs, getTabType, loadData]);
  
  /**
   * 下拉刷新 - 优化：先显示缓存，再更新
   */
  const onRefresh = useCallback(async () => {
    if (!activeTab) return;
    
    setRefreshing(true);
    setHasNewContent(false);
    const tabType = getTabType(activeTab);
    
    try {
      // 策略1：先尝试显示缓存（如果有）- 给用户即时反馈
      const cachedData = await loadData(tabType, 1, false);
      if (cachedData.length > 0) {
        console.log(`⚡ 刷新：先显示缓存 ${cachedData.length} 条`);
        setQuestionList(cachedData);
        setPage(1);
        setHasMore(cachedData.length >= 20);
      }
      
      // 策略2：然后从网络加载最新数据
      const freshData = await loadData(tabType, 1, true);
      if (freshData.length > 0) {
        console.log(`✅ 刷新：更新为最新数据 ${freshData.length} 条`);
        setQuestionList(freshData);
        setPage(1);
        setHasMore(freshData.length >= 20);
      }
      
      // 延迟预加载
      setTimeout(() => {
        if (allTabs.length > 0) {
          prefetchAdjacentTabs(activeTab, allTabs);
        }
      }, 500);
    } finally {
      // 最小显示时间 300ms，避免闪烁
      setTimeout(() => {
        setRefreshing(false);
      }, 300);
    }
  }, [activeTab, allTabs, getTabType, loadData]);
  
  /**
   * 上拉加载更多
   */
  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !activeTab) return;
    
    setLoadingMore(true);
    const tabType = getTabType(activeTab);
    const nextPage = page + 1;
    
    try {
      const data = await loadData(tabType, nextPage, false);
      
      if (data.length > 0) {
        setQuestionList(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= 20);
        
        // 预加载下一页
        if (data.length >= 20) {
          prefetchNextPage(tabType, nextPage);
        }
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, page, hasMore, loadingMore, getTabType, loadData]);
  
  /**
   * Tab 切换
   */
  const onTabChange = useCallback(async (newTab) => {
    if (!newTab || newTab === activeTab) return;
    
    setLoading(true);
    setHasNewContent(false);
    const tabType = getTabType(newTab);
    
    try {
      const data = await loadData(tabType, 1, false);
      setQuestionList(data);
      setPage(1);
      setHasMore(data.length >= 20);
      
      // 预加载相邻 Tab
      if (allTabs.length > 0) {
        prefetchAdjacentTabs(newTab, allTabs);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, allTabs, getTabType, loadData]);
  
  /**
   * 检查新内容
   */
  const checkNew = useCallback(async () => {
    if (!activeTab || questionList.length === 0) return;
    
    const tabType = getTabType(activeTab);
    const hasNew = await checkForNewContent(tabType, questionList);
    
    if (hasNew) {
      setHasNewContent(true);
      console.log(`🆕 发现新内容: ${activeTab}`);
    }
  }, [activeTab, questionList, getTabType]);
  
  /**
   * 定时检查新内容（今日头条策略：每5分钟）
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 应用从后台回到前台，立即检查新内容
        checkNew();
        
        // 启动定时检查
        checkInterval.current = setInterval(checkNew, 5 * 60 * 1000);
      } else if (nextAppState.match(/inactive|background/)) {
        // 应用进入后台，停止定时检查
        if (checkInterval.current) {
          clearInterval(checkInterval.current);
          checkInterval.current = null;
        }
      }
      
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // 初始启动定时检查
    if (appState.current === 'active') {
      checkInterval.current = setInterval(checkNew, 5 * 60 * 1000);
    }
    
    return () => {
      subscription.remove();
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [checkNew]);
  
  /**
   * 初始加载和 Tab 切换
   */
  useEffect(() => {
    if (isInitialLoad.current) {
      initialLoad();
    } else {
      onTabChange(activeTab);
    }
  }, [activeTab]);
  
  return {
    questionList,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    hasNewContent,
    onRefresh,
    onLoadMore,
    onTabChange,
    setQuestionList, // 暴露出来，以便外部可以手动更新列表
  };
};
