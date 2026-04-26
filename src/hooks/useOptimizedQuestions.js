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
  英雄榜: 'hero',
  关注: 'follow',
  Recommend: 'recommend',
  'Hot List': 'hot',
  Heroes: 'hero',
  'Hero Ranking': 'hero',
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
  const tabStateCacheRef = useRef(new Map());

  const getTabType = useCallback(
    (tab) => {
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
      .map((tab) => getTabType(tab))
      .filter(Boolean);

    return Array.from(new Set(normalizedTabs));
  }, [allTabs, getTabType]);

  const resetQuestionState = useCallback(() => {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
    setQuestionList([]);
    setPage(1);
    setHasMore(false);
    setHasNewContent(false);
  }, []);

  const resetTransientLoadingState = useCallback(() => {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  const cacheTabState = useCallback((tabType, nextState) => {
    if (!tabType) {
      return;
    }

    tabStateCacheRef.current.set(tabType, {
      questionList: Array.isArray(nextState.questionList) ? nextState.questionList : [],
      page: Number(nextState.page) || 1,
      hasMore: Boolean(nextState.hasMore),
      hasNewContent: Boolean(nextState.hasNewContent),
    });
  }, []);

  const restoreCachedTabState = useCallback((tabType) => {
    const cachedState = tabStateCacheRef.current.get(tabType);
    if (!cachedState) {
      return false;
    }

    resetTransientLoadingState();
    setQuestionList(cachedState.questionList);
    setPage(cachedState.page);
    setHasMore(cachedState.hasMore);
    setHasNewContent(cachedState.hasNewContent);
    return true;
  }, [resetTransientLoadingState]);

  const loadData = useCallback(
    async (tabType, pageNum, forceRefresh = false) => {
      if (!tabType) {
        return [];
      }

      try {
        const { data } = await loadQuestions(tabType, pageNum, forceRefresh, onDebugUpdate);
        return data || [];
      } catch (error) {
        console.warn(`Failed to load questions for ${tabType} page ${pageNum}:`, error);
        return [];
      }
    },
    [onDebugUpdate]
  );

  const prefetchTabs = useCallback(
    (tabType) => {
      if (!tabType || prefetchTabTypes.length === 0) {
        return;
      }

      prefetchAdjacentTabs(tabType, prefetchTabTypes);
    },
    [prefetchTabTypes]
  );

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

    if (restoreCachedTabState(tabType)) {
      isInitialLoad.current = false;
      return;
    }

    setLoading(true);

    try {
      const data = await loadData(tabType, 1, false);
      const nextHasMore = data.length >= 20;
      setQuestionList(data);
      setPage(1);
      setHasMore(nextHasMore);
      cacheTabState(tabType, {
        questionList: data,
        page: 1,
        hasMore: nextHasMore,
        hasNewContent: false,
      });
      prefetchTabs(tabType);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [activeTab, cacheTabState, getTabType, loadData, prefetchTabs, resetQuestionState, restoreCachedTabState]);

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
      const freshData = await loadData(tabType, 1, true);
      const nextHasMore = freshData.length >= 20;
      setQuestionList(freshData);
      setPage(1);
      setHasMore(nextHasMore);
      cacheTabState(tabType, {
        questionList: freshData,
        page: 1,
        hasMore: nextHasMore,
        hasNewContent: false,
      });

      setTimeout(() => {
        prefetchTabs(tabType);
      }, 500);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 300);
    }
  }, [activeTab, cacheTabState, getTabType, loadData, prefetchTabs, resetQuestionState]);

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
        const nextHasMore = data.length >= 20;
        setQuestionList((prev) => {
          const nextList = [...prev, ...data];
          cacheTabState(tabType, {
            questionList: nextList,
            page: nextPage,
            hasMore: nextHasMore,
            hasNewContent: false,
          });
          return nextList;
        });
        setPage(nextPage);
        setHasMore(nextHasMore);

        if (nextHasMore) {
          prefetchNextPage(tabType, nextPage);
        }
      } else {
        setHasMore(false);
        cacheTabState(tabType, {
          questionList,
          page,
          hasMore: false,
          hasNewContent: false,
        });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, cacheTabState, getTabType, hasMore, loadData, loadingMore, page, questionList]);

  const onTabChange = useCallback(
    async (newTab) => {
      if (!newTab) {
        return;
      }

      const tabType = getTabType(newTab);
      if (!tabType) {
        resetQuestionState();
        return;
      }

      resetTransientLoadingState();
      setHasNewContent(false);

      if (restoreCachedTabState(tabType)) {
        return;
      }

      setLoading(true);

      try {
        const data = await loadData(tabType, 1, false);
        const nextHasMore = data.length >= 20;
        setQuestionList(data);
        setPage(1);
        setHasMore(nextHasMore);
        cacheTabState(tabType, {
          questionList: data,
          page: 1,
          hasMore: nextHasMore,
          hasNewContent: false,
        });
        prefetchTabs(tabType);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, cacheTabState, getTabType, loadData, prefetchTabs, resetQuestionState, resetTransientLoadingState, restoreCachedTabState]
  );

  const checkNew = useCallback(async () => {
    if (!activeTab || questionList.length === 0) {
      return;
    }

    const tabType = getTabType(activeTab);
    if (!tabType) {
      return;
    }

    const nextHasNewContent = await checkForNewContent(tabType, questionList);
    if (nextHasNewContent) {
      setHasNewContent(true);
      cacheTabState(tabType, {
        questionList,
        page,
        hasMore,
        hasNewContent: true,
      });
    }
  }, [activeTab, cacheTabState, getTabType, hasMore, page, questionList]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkNew();
      } else if (nextAppState.match(/inactive|background/)) {
        if (checkInterval.current) {
          clearInterval(checkInterval.current);
          checkInterval.current = null;
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

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
