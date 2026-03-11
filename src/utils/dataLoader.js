/**
 * 数据加载管理器 - 今日头条式智能加载策略
 * 
 * 核心功能：
 * 1. 缓存优先加载（先显示缓存，后台更新）
 * 2. Tab 预加载（预加载相邻 Tab）
 * 3. 智能分页（提前触发加载）
 * 4. 防抖和去重
 */

import { getCache, setCache } from './cacheManager';
import questionApi from '../services/api/questionApi';

/**
 * 将API数据转换为HomeScreen组件期望的格式
 */
const transformApiDataToHomeFormat = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }
  
  // 过滤掉 status 为 0 的数据
  const filteredData = apiData.filter(item => item.status !== 0);
  
  if (filteredData.length !== apiData.length) {
    console.log(`🔍 过滤问题数据: 原始${apiData.length}条，过滤后${filteredData.length}条（移除了${apiData.length - filteredData.length}条 status=0 的数据）`);
  }
  
  return filteredData.map((item, index) => {
    // 生成一个合理的时间（如果API没有提供时间字段）
    let timeDisplay = '刚刚';
    
    if (item.createTime || item.createdAt || item.updateTime || item.updatedAt) {
      timeDisplay = formatApiTime(item.createTime || item.createdAt || item.updateTime || item.updatedAt);
    } else {
      // 如果没有时间字段，根据索引生成一个合理的时间
      const hoursAgo = Math.floor(Math.random() * 24) + 1; // 1-24小时前
      timeDisplay = `${hoursAgo}小时前`;
    }
    
    // 基础数据转换
    const transformedItem = {
      id: item.id,
      title: item.title || '无标题',
      author: item.userName || item.userNickname || '匿名用户',
      avatar: item.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${item.id}`,
      time: timeDisplay,
      likes: item.likeCount || Math.floor(Math.random() * 500) + 50,
      dislikes: item.dislikeCount || Math.floor(Math.random() * 20) + 1,
      answers: item.answerCount || Math.floor(Math.random() * 100) + 10,
      shares: item.shareCount || Math.floor(Math.random() * 50) + 5,
      bookmarks: item.bookmarkCount || Math.floor(Math.random() * 80) + 20,
      country: '中国',
      city: item.location || '北京',
      solvedPercent: item.solvedPercent || Math.floor(Math.random() * 100),
    };
    
    // 问题类型转换
    if (item.type === 1 && item.bountyAmount > 0) {
      // 悬赏问题
      transformedItem.type = 'reward';
      transformedItem.reward = Math.floor(item.bountyAmount / 100); // 转换为元
    } else if (item.type === 2) {
      // 定向问题
      transformedItem.type = 'targeted';
      if (item.bountyAmount > 0) {
        transformedItem.reward = Math.floor(item.bountyAmount / 100);
      }
    } else if (item.payViewAmount > 0) {
      // 付费查看
      transformedItem.type = 'paid';
      transformedItem.paidAmount = Math.floor(item.payViewAmount / 100);
      transformedItem.isPaid = false;
    } else {
      // 免费问题
      transformedItem.type = 'free';
    }
    
    // 处理图片
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      if (item.imageUrls.length === 1) {
        transformedItem.image = item.imageUrls[0];
      } else {
        transformedItem.images = item.imageUrls;
      }
    }
    
    // 处理专家认证
    if (item.userType === 'expert' || item.isExpert) {
      transformedItem.verified = true;
    }
    
    return transformedItem;
  });
};

/**
 * 格式化API时间为显示格式
 */
const formatApiTime = (timeStr) => {
  if (!timeStr) return '刚刚';
  
  try {
    // 处理不同的时间格式
    let time;
    
    // 如果是时间戳（数字）
    if (typeof timeStr === 'number') {
      time = new Date(timeStr);
    }
    // 如果是字符串格式的时间戳
    else if (typeof timeStr === 'string' && /^\d+$/.test(timeStr)) {
      const timestamp = parseInt(timeStr);
      // 判断是秒还是毫秒时间戳
      time = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
    }
    // 如果是标准时间字符串
    else {
      time = new Date(timeStr);
    }
    
    // 检查时间是否有效
    if (isNaN(time.getTime())) {
      return '刚刚';
    }
    
    const now = new Date();
    const diff = now - time;
    
    // 如果时间差为负数（未来时间），返回刚刚
    if (diff < 0) {
      return '刚刚';
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days >= 1) {
      return `${days}天前`;
    } else if (hours >= 1) {
      return `${hours}小时前`;
    } else if (minutes >= 1) {
      return `${minutes}分钟前`;
    } else if (seconds >= 30) {
      return '1分钟前';
    } else {
      return '刚刚';
    }
  } catch (error) {
    return '刚刚';
  }
};

// 正在进行的请求（用于去重）
const pendingRequests = new Map();

// 预加载队列
const prefetchQueue = [];
let isPrefetching = false;

/**
 * 加载问题列表（带缓存）
 * 
 * @param {string} tabType - Tab 类型 (recommend, hot, follow 等)
 * @param {number} page - 页码
 * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
 * @param {Function} onDebugUpdate - 调试信息回调
 * @returns {Promise<{data: Array, fromCache: boolean}>}
 */
export const loadQuestions = async (tabType, page = 1, forceRefresh = false, onDebugUpdate = null) => {
  const cacheKey = `questions_${tabType}_${page}`;
  
  // 检查是否有正在进行的相同请求
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // 创建请求 Promise
  const requestPromise = (async () => {
    try {
      // 1. 如果不是强制刷新，先尝试从缓存获取
      if (!forceRefresh) {
        const cached = await getCache('questions', { tabType, page });
        if (cached) {
          // 返回缓存数据，同时在后台更新
          backgroundUpdate(tabType, page, onDebugUpdate);
          return { data: cached, fromCache: true };
        }
      }
      
      // 2. 从网络加载数据
      const response = await fetchQuestionsByTab(tabType, page, onDebugUpdate);
      
      // 3. 保存到缓存
      if (response && response.length > 0) {
        await setCache('questions', { tabType, page }, response);
      }
      
      return { data: response, fromCache: false };
    } catch (error) {
      // 如果网络请求失败，尝试返回缓存数据
      const cached = await getCache('questions', { tabType, page });
      if (cached) {
        return { data: cached, fromCache: true };
      }
      
      throw error;
    } finally {
      // 请求完成，从 pending 中移除
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // 将请求添加到 pending
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

/**
 * 后台更新数据（不阻塞 UI）
 */
const backgroundUpdate = async (tabType, page) => {
  try {
    console.log(`🔄 后台更新: ${tabType} - 第${page}页`);
    const response = await fetchQuestionsByTab(tabType, page);
    
    if (response && response.length > 0) {
      await setCache('questions', { tabType, page }, response);
      console.log(`✅ 后台更新完成: ${tabType} - 第${page}页`);
    }
  } catch (error) {
    console.error(`❌ 后台更新失败: ${tabType} - 第${page}页`, error);
  }
};

/**
 * 根据 Tab 类型获取数据
 */
const fetchQuestionsByTab = async (tabType, page, onDebugUpdate) => {
  const pageSize = 20;
  
  try {
    const apiCall = `${tabType} - 第${page}页`;
    
    // 更新调试信息
    if (onDebugUpdate) {
      onDebugUpdate({
        lastApiCall: apiCall,
        lastResponse: null,
        error: null,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    let response;
    
    switch (tabType) {
      case 'recommend':
        response = await questionApi.getRecommendList({ pageNum: page, pageSize });
        break;
      case 'hot':
        response = await questionApi.getHotList({ pageNum: page, pageSize });
        break;
      case 'follow':
        response = await questionApi.getFollowList({ pageNum: page, pageSize });
        break;
      default:
        response = await questionApi.getQuestions({
          pageNum: page,
          pageSize,
          question: { status: 1 },
        });
    }
    
    // 更新调试信息 - 显示响应
    if (onDebugUpdate) {
      onDebugUpdate({
        lastApiCall: apiCall,
        lastResponse: response,
        error: null,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    // 处理响应数据
    if (response && response.code === 200) {
      const rawData = response.data?.rows || response.rows || response.data || [];
      const transformedData = transformApiDataToHomeFormat(rawData);
      return transformedData;
    } else {
      return [];
    }
  } catch (error) {
    // 更新调试信息 - 显示错误
    if (onDebugUpdate) {
      onDebugUpdate({
        lastApiCall: `${tabType} - 第${page}页`,
        lastResponse: null,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    throw error;
  }
};

/**
 * 预加载相邻 Tab 的数据
 * 
 * @param {string} currentTab - 当前 Tab
 * @param {Array<string>} allTabs - 所有 Tab 列表
 */
export const prefetchAdjacentTabs = (currentTab, allTabs) => {
  const currentIndex = allTabs.indexOf(currentTab);
  if (currentIndex === -1) return;
  
  const tabsToPrefetch = [];
  
  // 预加载左边的 Tab
  if (currentIndex > 0) {
    tabsToPrefetch.push(allTabs[currentIndex - 1]);
  }
  
  // 预加载右边的 Tab
  if (currentIndex < allTabs.length - 1) {
    tabsToPrefetch.push(allTabs[currentIndex + 1]);
  }
  
  // 添加到预加载队列
  tabsToPrefetch.forEach(tab => {
    if (!prefetchQueue.includes(tab)) {
      prefetchQueue.push(tab);
    }
  });
  
  // 开始预加载
  processPrefetchQueue();
};

/**
 * 处理预加载队列
 */
const processPrefetchQueue = async () => {
  if (isPrefetching || prefetchQueue.length === 0) return;
  
  isPrefetching = true;
  
  while (prefetchQueue.length > 0) {
    const tabType = prefetchQueue.shift();
    
    try {
      console.log(`🔮 预加载 Tab: ${tabType}`);
      await loadQuestions(tabType, 1, false);
    } catch (error) {
      console.error(`❌ 预加载失败: ${tabType}`, error);
    }
    
    // 延迟一下，避免同时发起太多请求
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isPrefetching = false;
};

/**
 * 预加载下一页数据
 * 
 * @param {string} tabType - Tab 类型
 * @param {number} currentPage - 当前页码
 */
export const prefetchNextPage = async (tabType, currentPage) => {
  const nextPage = currentPage + 1;
  
  try {
    console.log(`🔮 预加载下一页: ${tabType} - 第${nextPage}页`);
    await loadQuestions(tabType, nextPage, false);
  } catch (error) {
    console.error(`❌ 预加载下一页失败: ${tabType} - 第${nextPage}页`, error);
  }
};

/**
 * 批量加载多个 Tab 的数据
 * 
 * @param {Array<string>} tabs - Tab 列表
 * @returns {Promise<Object>} 各 Tab 的数据
 */
export const batchLoadTabs = async (tabs) => {
  console.log(`📦 批量加载 ${tabs.length} 个 Tab`);
  
  const results = {};
  
  // 并发加载所有 Tab
  await Promise.all(
    tabs.map(async (tab) => {
      try {
        const { data } = await loadQuestions(tab, 1, false);
        results[tab] = data;
      } catch (error) {
        console.error(`❌ 批量加载失败: ${tab}`, error);
        results[tab] = [];
      }
    })
  );
  
  return results;
};

/**
 * 检查是否有新内容
 * 
 * @param {string} tabType - Tab 类型
 * @param {Array} currentData - 当前显示的数据
 * @returns {Promise<boolean>} 是否有新内容
 */
export const checkForNewContent = async (tabType, currentData) => {
  try {
    const { data } = await loadQuestions(tabType, 1, true);
    
    if (!data || data.length === 0) return false;
    if (!currentData || currentData.length === 0) return true;
    
    // 比较第一条数据的 ID
    return data[0].id !== currentData[0].id;
  } catch (error) {
    console.error('检查新内容失败:', error);
    return false;
  }
};

/**
 * 清除指定 Tab 的缓存
 * 
 * @param {string} tabType - Tab 类型
 */
export const clearTabCache = async (tabType) => {
  const { clearCache } = require('./cacheManager');
  
  // 清除所有页的缓存
  for (let page = 1; page <= 10; page++) {
    await clearCache('questions', { tabType, page });
  }
  
  console.log(`🗑️ 已清除 ${tabType} 的所有缓存`);
};
