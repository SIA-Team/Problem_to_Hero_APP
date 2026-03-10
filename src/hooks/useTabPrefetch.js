import { useEffect, useRef } from 'react';

/**
 * Tab 预加载 Hook
 * 在当前 Tab 加载完成后，预加载相邻 Tab 的数据
 * 
 * @param {number} currentIndex - 当前 Tab 索引
 * @param {Array} tabs - Tab 列表
 * @param {Function} prefetchFunction - 预加载函数
 * @param {Object} options - 配置选项
 */
export const useTabPrefetch = (currentIndex, tabs, prefetchFunction, options = {}) => {
  const {
    delay = 500, // 延迟时间（毫秒）
    prefetchDistance = 1, // 预加载距离（相邻几个 Tab）
    enabled = true, // 是否启用预加载
  } = options;
  
  const prefetchedRef = useRef(new Set());
  const timerRef = useRef(null);
  
  useEffect(() => {
    if (!enabled || !prefetchFunction) return;
    
    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // 延迟预加载，避免影响当前 Tab 的加载
    timerRef.current = setTimeout(() => {
      const indicesToPrefetch = [];
      
      // 计算需要预加载的 Tab 索引
      for (let i = 1; i <= prefetchDistance; i++) {
        const prevIndex = currentIndex - i;
        const nextIndex = currentIndex + i;
        
        if (prevIndex >= 0 && !prefetchedRef.current.has(prevIndex)) {
          indicesToPrefetch.push(prevIndex);
        }
        
        if (nextIndex < tabs.length && !prefetchedRef.current.has(nextIndex)) {
          indicesToPrefetch.push(nextIndex);
        }
      }
      
      // 执行预加载
      indicesToPrefetch.forEach(index => {
        const tab = tabs[index];
        if (tab) {
          console.log(`🔮 预加载 Tab: ${tab.key || tab} (index: ${index})`);
          prefetchFunction(tab, index);
          prefetchedRef.current.add(index);
        }
      });
    }, delay);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, tabs, prefetchFunction, delay, prefetchDistance, enabled]);
  
  /**
   * 清除预加载记录
   */
  const clearPrefetchRecord = () => {
    prefetchedRef.current.clear();
  };
  
  return {
    clearPrefetchRecord,
  };
};
