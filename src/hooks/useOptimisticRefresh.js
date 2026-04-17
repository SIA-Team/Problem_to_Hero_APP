/**
 * 乐观刷新 Hook - 主流 APP 级别的下拉刷新体验
 * 
 * 核心策略：
 * 1. 立即显示缓存数据（如果有）
 * 2. 显示加载动画
 * 3. 后台静默更新
 * 4. 增量更新（只加载新数据）
 * 5. 智能合并数据
 * 
 * 参考：今日头条、微博、Twitter 的刷新策略
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  loadQuestions,
  prefetchAdjacentTabs,
  checkForNewContent,
} from '../utils/dataLoader';

// Tab 类型映射
const TAB_TYPE_MAP = {
  '推荐': 'recommend',
  '热榜': 'hot',
  '关注': 'follow',
  'Recommend': 'recommend',
  'Hot List': 'hot',
  'Follow': 'follow',
};

export const useOptimisticRefresh = (activeTab, allTabs = []) => {
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
  const lastRefreshTime = useRef(0);
  const refreshDebounceTimeout = useRef(null);
  
  // 获取 Tab 类型
  const getTabType = useCallback((tab) => {
    return TAB_TYPE_MAP[tab] || 'recommend';
  }, []);
  
  /**
   * 加载数据（核心函数）
   */
  const loadData = useCallback(async (tabType, pageNum, forceRefresh = false) => {
    try {
      const { data, fromCache } = await loadQuestions(tabType, pageNum, forceRefresh);
      
      if (fromCache) {
        console.log(`✅ 使用缓存数据: ${tabType} - 第${pageNum}页`);
      } else {
        console.log(`✅ 使用网络数据: ${tabType} - 第${pageNum}页`);
      }
      
      return data || [];
    } catch (error) {
      console.warn(`加载数据失败: ${tabType} - 第${pageNum}页`, error);
      return [];
    }
  }, []);
  
  /**
   * 初始加载 - 优先显示缓存
   */
  const initialLoad = useCallback(async () => {
    if (!activeTab) return;
    
    const tabType = getTabType(activeTab);
    
    // 第一步：立即尝试从缓存加载（不显示 loading）
    try {
      const cachedData = await loadData(tabType, 1, false);
      if (cachedData.length > 0) {
        console.log(`⚡ 立即显示缓存数据: ${cachedData.length} 条`);
        setQuestionList(cachedData);
        setPage(1);
        setHasMore(cachedData.length >= 20);
        
        // 后台静默更新
        setTimeout(() => {
          silentUpdate(tabType);
        }, 100);
        
        isInitialLoad.current = false;
        return;
      }
    } catch (error) {
      console.log('缓存加载失败，使用网络加载');
    }
    
    // 第二步：如果没有缓存，显示 loading 并从网络加载
    setLoading(true);
    try {
      const data = await loadData(tabType, 1, true);
      setQuestionList(data);
      setPage(1);
      setHasMore(data.length >= 20);
      
      // 预加载相邻 Tab
      if (allTabs.length > 0) {
        setTimeout(() => {
          prefetchAdjacentTabs(activeTab, allTabs);
        }, 500);
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [activeTab, allTabs, getTabType, loadData]);
  
  /**
   * 静默更新（后台更新，不显示 loading）
   */
  const silentUpdate = useCallback(async (tabType) => {
    try {
      console.log(`🔄 后台静默更新: ${tabType}`);
      const data = await loadData(tabType, 1, true);
      
      if (data.length > 0) {
        setQuestionList(data);
        setPage(1);
        setHasMore(data.length >= 20);
        console.log(`✅ 静默更新完成: ${data.length} 条`);
      }
    } catch (error) {
      console.warn('静默更新失败:', error);
    }
  }, [loadData]);
  
  /**
   * 下拉刷新 - 乐观更新策略
   */
  const onRefresh = useCallback(async () => {
    if (!activeTab) return;
    
    // 防抖：避免频繁刷新
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) {
      console.log('⏱️ 刷新太频繁，已忽略');
      return;
    }
    lastRefreshTime.current = now;
    
    setRefreshing(true);
    setHasNewContent(false);
    const tabType = getTabType(activeTab);
    
    try {
      // 策略1：立即显示缓存数据（如果有）
      const cachedData = await loadData(tabType, 1, false);
      if (cachedData.length > 0) {
        console.log(`⚡ 刷新：先显示缓存 ${cachedData.length} 条`);
        setQuestionList(cachedData);
      }
      
      // 策略2：后台加载新数据
      const freshData = await loadData(tabType, 1, true);
      
      // 策略3：智能合并数据（增量更新）
      if (freshData.length > 0) {
        console.log(`✅ 刷新：获取到新数据 ${freshData.length} 条`);
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
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, page, hasMore, loadingMore, getTabType, loadData]);
  
  /**
   * Tab 切换 - 优先显示缓存
   */
  const onTabChange = useCallback(async (newTab) => {
    if (!newTab || newTab === activeTab) return;
    
    const tabType = getTabType(newTab);
    
    // 立即尝试显示缓存
    try {
      const cachedData = await loadData(tabType, 1, false);
      if (cachedData.length > 0) {
        console.log(`⚡ Tab切换：立即显示缓存 ${cachedData.length} 条`);
        setQuestionList(cachedData);
        setPage(1);
        setHasMore(cachedData.length >= 20);
        
        // 后台更新
        setTimeout(() => {
          silentUpdate(tabType);
        }, 100);
        
        return;
      }
    } catch (error) {
      console.log('缓存加载失败');
    }
    
    // 如果没有缓存，显示 loading
    setLoading(true);
    try {
      const data = await loadData(tabType, 1, true);
      setQuestionList(data);
      setPage(1);
      setHasMore(data.length >= 20);
      
      // 预加载相邻 Tab
      if (allTabs.length > 0) {
        setTimeout(() => {
          prefetchAdjacentTabs(newTab, allTabs);
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, allTabs, getTabType, loadData, silentUpdate]);
  
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
   * 定时检查新内容
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // 应用从后台回到前台，立即检查新内容
        checkNew();
        
        // 启动定时检查（每3分钟）
        checkInterval.current = setInterval(checkNew, 3 * 60 * 1000);
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
      checkInterval.current = setInterval(checkNew, 3 * 60 * 1000);
    }
    
    return () => {
      subscription.remove();
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      if (refreshDebounceTimeout.current) {
        clearTimeout(refreshDebounceTimeout.current);
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
    setQuestionList,
  };
};
