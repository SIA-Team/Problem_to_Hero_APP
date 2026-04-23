/**
 * 优化的问题列表 Hook
 *
 * 能力：
 * 1. 缓存优先加载
 * 2. 邻近 Tab 预取
 * 3. 分页加载
 * 4. 前后台切换时检查新内容
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import {
  loadQuestions,
  prefetchAdjacentTabs,
  prefetchNextPage,
  checkForNewContent,
} from '../utils/dataLoader';

const TAB_TYPE_MAP = {
  推荐: 'recommend',
  热榜: 'hot',
  关注: 'follow',
  Recommend: 'recommend',
  'Hot List': 'hot',
  Follow: 'follow',
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
  const hasStartedInitialLoad = useRef(false);
  const previousActiveTabRef = useRef(null);

  const getTabType = useCallback(
    tab => {
      if (!tab) {
        return null;
      }

      if (TAB_TYPE_MAP[tab]) {
        return TAB_TYPE_MAP[tab];
      }

      if (allTabs.includes(tab)) {
        return tab;
      }

      return null;
    },
    [allTabs]
  );

  const prefetchTabTypes = useMemo(() => {
    const normalizedTabs = allTabs
      .map(tab => getTabType(tab))
      .filter(Boolean);

    return Array.from(new Set(normalizedTabs));
  }, [allTabs, getTabType]);

  const resetQuestionState = useCallback(() => {
    setQuestionList([]);
    setPage(1);
    setHasMore(false);
    setHasNewContent(false);
  }, []);

  const loadData = useCallback(
    async (tabType, pageNum, forceRefresh = false) => {
      if (!tabType) {
        return [];
      }

      try {
        const { data } = await loadQuestions(tabType, pageNum, forceRefresh, onDebugUpdate);
        return data || [];
      } catch (error) {
        console.warn(`加载数据失败: ${tabType} - 第${pageNum}页`, error);
        return [];
      }
    },
    [onDebugUpdate]
  );

  const prefetchTabs = useCallback(tabType => {
    if (!tabType || prefetchTabTypes.length === 0) {
      return;
    }

    prefetchAdjacentTabs(tabType, prefetchTabTypes);
  }, [prefetchTabTypes]);

  const initialLoad = useCallback(async () => {
    if (!activeTab) {
      return;
    }

    const tabType = getTabType(activeTab);
    if (!tabType) {
      resetQuestionState();
      isInitialLoad.current = false;
      return;
    }

    setLoading(true);

    try {
      const data = await loadData(tabType, 1, false);
      setQuestionList(data);
      setPage(1);
      setHasMore(data.length >= 20);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [activeTab, getTabType, loadData, resetQuestionState]);

  const onRefresh = useCallback(async () => {
    if (!activeTab) {
      return;
    }

    const tabType = getTabType(activeTab);
    if (!tabType) {
      resetQuestionState();
      return;
    }

    setRefreshing(true);
    setHasNewContent(false);

    try {
      const cachedData = await loadData(tabType, 1, false);
      if (cachedData.length > 0) {
        setQuestionList(cachedData);
        setPage(1);
        setHasMore(cachedData.length >= 20);
      }

      const freshData = await loadData(tabType, 1, true);
      setQuestionList(freshData);
      setPage(1);
      setHasMore(freshData.length >= 20);

      setTimeout(() => {
        prefetchTabs(tabType);
      }, 500);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 300);
    }
  }, [activeTab, getTabType, loadData, prefetchTabs, resetQuestionState]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !activeTab) {
      return;
    }

    const tabType = getTabType(activeTab);
    if (!tabType) {
      setLoadingMore(false);
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const data = await loadData(tabType, nextPage, false);

      if (data.length > 0) {
        setQuestionList(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length >= 20);

        if (data.length >= 20) {
          prefetchNextPage(tabType, nextPage);
        }
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, getTabType, hasMore, loadData, loadingMore, page]);

  const onTabChange = useCallback(
    async newTab => {
      if (!newTab || newTab === activeTab) {
        return;
      }

      const tabType = getTabType(newTab);
      if (!tabType) {
        resetQuestionState();
        return;
      }

      setLoading(true);
      setHasNewContent(false);

      try {
        const data = await loadData(tabType, 1, false);
        setQuestionList(data);
        setPage(1);
        setHasMore(data.length >= 20);
        prefetchTabs(tabType);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, getTabType, loadData, prefetchTabs, resetQuestionState]
  );

  const checkNew = useCallback(async () => {
    if (!activeTab || questionList.length === 0) {
      return;
    }

    const tabType = getTabType(activeTab);
    if (!tabType) {
      return;
    }

    const hasNew = await checkForNewContent(tabType, questionList);
    if (hasNew) {
      setHasNewContent(true);
    }
  }, [activeTab, getTabType, questionList]);

  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkNew();
        checkInterval.current = setInterval(checkNew, 5 * 60 * 1000);
      } else if (nextAppState.match(/inactive|background/)) {
        if (checkInterval.current) {
          clearInterval(checkInterval.current);
          checkInterval.current = null;
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

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

  useEffect(() => {
    if (!activeTab) {
      previousActiveTabRef.current = activeTab;
      return;
    }

    if (isInitialLoad.current) {
      if (hasStartedInitialLoad.current) {
        return;
      }

      hasStartedInitialLoad.current = true;
      previousActiveTabRef.current = activeTab;
      initialLoad();
      return;
    }

    if (previousActiveTabRef.current === activeTab) {
      return;
    }

    previousActiveTabRef.current = activeTab;
    onTabChange(activeTab);
  }, [activeTab, initialLoad, onTabChange]);

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
