import { useState, useEffect, useRef, useCallback } from 'react';
import { useTabCache } from './useTabCache';

/**
 * Tab 数据加载 Hook
 * 支持懒加载、缓存、分页、下拉刷新
 * 
 * @param {string} tabKey - Tab 的唯一标识
 * @param {Function} fetchFunction - 数据获取函数
 * @param {boolean} isActive - Tab 是否激活
 * @param {Object} options - 配置选项
 */
export const useTabData = (tabKey, fetchFunction, isActive, options = {}) => {
  const {
    pageSize = 20,
    enableCache = true,
    cacheTimeout = 5 * 60 * 1000, // 5分钟
    autoLoad = true, // 是否自动加载
  } = options;
  
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const { getCache, setCache, clearCache } = useTabCache(cacheTimeout);
  const abortControllerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  
  /**
   * 加载数据
   */
  const loadData = useCallback(async (pageNum = 1, isRefresh = false) => {
    // 检查缓存
    if (enableCache && pageNum === 1 && !isRefresh) {
      const cacheKey = `${tabKey}_${pageNum}`;
      const cached = getCache(cacheKey);
      if (cached) {
        console.log(`✅ 使用缓存数据: ${tabKey} page ${pageNum}`);
        setData(cached);
        setHasMore(cached.length === pageSize);
        return;
      }
    }
    
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      console.log(`🔄 加载数据: ${tabKey} page ${pageNum}`);
      
      const result = await fetchFunction({
        page: pageNum,
        pageSize,
        signal: abortControllerRef.current.signal,
      });
      
      const newData = result.data || result;
      
      // 更新数据
      if (pageNum === 1) {
        setData(newData);
        // 缓存首页数据
        if (enableCache) {
          const cacheKey = `${tabKey}_${pageNum}`;
          setCache(cacheKey, newData);
        }
      } else {
        setData(prev => [...prev, ...newData]);
      }
      
      setPage(pageNum);
      setHasMore(newData.length === pageSize);
      hasLoadedRef.current = true;
      
    } catch (err) {
      if (err.name !== 'AbortError') {
      console.warn(`加载失败: ${tabKey}`, err);
        setError(err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [tabKey, fetchFunction, pageSize, enableCache, getCache, setCache]);
  
  /**
   * 加载更多
   */
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, loadData]);
  
  /**
   * 下拉刷新
   */
  const refresh = useCallback(() => {
    // 清除缓存
    if (enableCache) {
      clearCache(`${tabKey}_1`);
    }
    loadData(1, true);
  }, [loadData, enableCache, clearCache, tabKey]);
  
  /**
   * 重新加载
   */
  const reload = useCallback(() => {
    hasLoadedRef.current = false;
    loadData(1);
  }, [loadData]);
  
  // 当 Tab 激活且未加载过数据时，自动加载
  useEffect(() => {
    if (isActive && !hasLoadedRef.current && autoLoad) {
      loadData(1);
    }
    
    // 清理：取消未完成的请求
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isActive, autoLoad, loadData]);
  
  return {
    data,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    reload,
    hasLoaded: hasLoadedRef.current,
  };
};
