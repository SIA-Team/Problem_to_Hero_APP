import { useRef, useCallback } from 'react';

/**
 * Tab 数据缓存 Hook
 * 用于缓存每个 Tab 的数据，避免重复请求
 */
export const useTabCache = (cacheTimeout = 5 * 60 * 1000) => {
  const cacheRef = useRef({});
  
  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存的数据或 null
   */
  const getCache = useCallback((key) => {
    const cached = cacheRef.current[key];
    if (!cached) return null;
    
    const now = Date.now();
    // 检查是否过期
    if (now - cached.timestamp > cacheTimeout) {
      delete cacheRef.current[key];
      return null;
    }
    
    return cached.data;
  }, [cacheTimeout]);
  
  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 要缓存的数据
   */
  const setCache = useCallback((key, data) => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
    };
  }, []);
  
  /**
   * 清除指定缓存
   * @param {string} key - 缓存键
   */
  const clearCache = useCallback((key) => {
    delete cacheRef.current[key];
  }, []);
  
  /**
   * 清除所有缓存
   */
  const clearAllCache = useCallback(() => {
    cacheRef.current = {};
  }, []);
  
  return {
    getCache,
    setCache,
    clearCache,
    clearAllCache,
  };
};
