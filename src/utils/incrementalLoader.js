/**
 * 增量数据加载器 - 主流 APP 级别的数据加载策略
 * 
 * 核心功能：
 * 1. 增量加载（只加载新数据）
 * 2. 智能去重
 * 3. 数据合并
 * 4. 时间戳管理
 * 
 * 参考：Twitter、微博的增量加载策略
 */

import questionApi from '../services/api/questionApi';
import { setCache, getCache } from './cacheManager';

/**
 * 增量加载新数据
 * 
 * @param {string} tabType - Tab 类型
 * @param {Array} currentList - 当前列表数据
 * @returns {Promise<Array>} 新数据列表
 */
export const loadIncrementalData = async (tabType, currentList = []) => {
  try {
    // 获取当前列表的第一条数据的 ID（最新的数据）
    const latestId = currentList.length > 0 ? currentList[0].id : null;
    
    console.log(`🔄 增量加载: ${tabType}, latestId=${latestId}`);
    
    // 调用 API 获取比 latestId 更新的数据
    let response;
    const params = {
      pageNum: 1,
      pageSize: 20,
      question: { status: 1 },
    };
    
    // 如果有 latestId，添加到查询参数
    if (latestId) {
      params.sinceId = latestId; // 只获取 ID 大于 latestId 的数据
    }
    
    switch (tabType) {
      case 'recommend':
        response = await questionApi.getRecommendList(params);
        break;
      case 'hot':
        response = await questionApi.getHotList(params);
        break;
      case 'follow':
        response = await questionApi.getFollowList(params);
        break;
      default:
        response = await questionApi.getQuestions(params);
    }
    
    if (response && response.code === 200) {
      const rawData = response.data?.rows || response.rows || response.data || [];
      
      // 过滤掉已存在的数据（去重）
      const newData = deduplicateData(rawData, currentList);
      
      console.log(`✅ 增量加载完成: 获取 ${rawData.length} 条，去重后 ${newData.length} 条新数据`);
      
      return newData;
    }
    
    return [];
  } catch (error) {
    console.error('增量加载失败:', error);
    return [];
  }
};

/**
 * 数据去重
 * 
 * @param {Array} newData - 新数据
 * @param {Array} existingData - 已存在的数据
 * @returns {Array} 去重后的新数据
 */
const deduplicateData = (newData, existingData) => {
  if (!existingData || existingData.length === 0) {
    return newData;
  }
  
  const existingIds = new Set(existingData.map(item => item.id));
  
  return newData.filter(item => !existingIds.has(item.id));
};

/**
 * 智能合并数据
 * 
 * @param {Array} newData - 新数据
 * @param {Array} oldData - 旧数据
 * @param {Object} options - 合并选项
 * @returns {Array} 合并后的数据
 */
export const mergeData = (newData, oldData, options = {}) => {
  const {
    maxLength = 100, // 最大保留数据量
    sortBy = 'id', // 排序字段
    sortOrder = 'desc', // 排序顺序
  } = options;
  
  // 合并数据
  const merged = [...newData, ...oldData];
  
  // 去重
  const uniqueMap = new Map();
  merged.forEach(item => {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  });
  
  let result = Array.from(uniqueMap.values());
  
  // 排序
  result.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortOrder === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });
  
  // 限制数量
  if (result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  
  return result;
};

/**
 * 预加载下一批数据
 * 
 * @param {string} tabType - Tab 类型
 * @param {number} currentPage - 当前页码
 */
export const prefetchNextBatch = async (tabType, currentPage) => {
  const nextPage = currentPage + 1;
  
  try {
    console.log(`🔮 预加载下一批: ${tabType} - 第${nextPage}页`);
    
    let response;
    const params = {
      pageNum: nextPage,
      pageSize: 20,
      question: { status: 1 },
    };
    
    switch (tabType) {
      case 'recommend':
        response = await questionApi.getRecommendList(params);
        break;
      case 'hot':
        response = await questionApi.getHotList(params);
        break;
      case 'follow':
        response = await questionApi.getFollowList(params);
        break;
      default:
        response = await questionApi.getQuestions(params);
    }
    
    if (response && response.code === 200) {
      const rawData = response.data?.rows || response.rows || response.data || [];
      
      // 保存到缓存
      await setCache('questions', { tabType, page: nextPage }, rawData);
      
      console.log(`✅ 预加载完成: ${rawData.length} 条`);
    }
  } catch (error) {
    console.error('预加载失败:', error);
  }
};

/**
 * 批量预加载多个 Tab
 * 
 * @param {Array<string>} tabs - Tab 列表
 * @param {number} priority - 优先级（0-2，0最高）
 */
export const batchPrefetch = async (tabs, priority = 1) => {
  // 根据优先级设置延迟
  const delays = [0, 500, 1000];
  const delay = delays[priority] || 500;
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log(`📦 批量预加载 ${tabs.length} 个 Tab (优先级: ${priority})`);
  
  // 并发预加载
  await Promise.all(
    tabs.map(async (tab) => {
      try {
        const { data } = await loadQuestions(tab, 1, false);
        console.log(`✅ 预加载 ${tab}: ${data.length} 条`);
      } catch (error) {
        console.error(`❌ 预加载 ${tab} 失败:`, error);
      }
    })
  );
};

/**
 * 获取时间戳（用于增量加载）
 * 
 * @param {string} tabType - Tab 类型
 * @returns {Promise<number>} 上次加载的时间戳
 */
export const getLastLoadTimestamp = async (tabType) => {
  try {
    const timestamp = await getCache('timestamp', { tabType });
    return timestamp || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * 保存时间戳
 * 
 * @param {string} tabType - Tab 类型
 * @param {number} timestamp - 时间戳
 */
export const saveLoadTimestamp = async (tabType, timestamp = Date.now()) => {
  try {
    await setCache('timestamp', { tabType }, timestamp);
  } catch (error) {
    console.error('保存时间戳失败:', error);
  }
};

/**
 * 检查是否需要刷新
 * 
 * @param {string} tabType - Tab 类型
 * @param {number} threshold - 刷新阈值（毫秒）
 * @returns {Promise<boolean>} 是否需要刷新
 */
export const shouldRefresh = async (tabType, threshold = 5 * 60 * 1000) => {
  const lastTimestamp = await getLastLoadTimestamp(tabType);
  const now = Date.now();
  
  return (now - lastTimestamp) > threshold;
};
