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
 * 处理标题字段
 * 如果后端返回的title字段包含描述内容，进行适当处理
 */
const processTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return '无标题';
  }
  
  // 去除首尾空格
  title = title.trim();
  
  // 如果标题过长（超过50个字符），可能包含了描述内容
  if (title.length > 50) {
    console.log(`⚠️ 标题过长: "${title}" (${title.length}字符)`);
    
    // 尝试提取问题的核心部分
    // 1. 如果包含问号，截取到第一个问号
    const questionMarkIndex = title.indexOf('？') !== -1 ? title.indexOf('？') : title.indexOf('?');
    if (questionMarkIndex !== -1 && questionMarkIndex < 50) {
      const extractedTitle = title.substring(0, questionMarkIndex + 1);
      console.log(`📝 提取问题标题: "${extractedTitle}"`);
      return extractedTitle;
    }
    
    // 2. 如果包含句号，截取到第一个句号
    const periodIndex = title.indexOf('。') !== -1 ? title.indexOf('。') : title.indexOf('.');
    if (periodIndex !== -1 && periodIndex < 50) {
      const extractedTitle = title.substring(0, periodIndex + 1);
      console.log(`📝 提取问题标题: "${extractedTitle}"`);
      return extractedTitle;
    }
    
    // 3. 如果都没有，截取前40个字符并加省略号
    const truncatedTitle = title.substring(0, 40) + '...';
    console.log(`📝 截断标题: "${truncatedTitle}"`);
    return truncatedTitle;
  }
  
  return title;
};

/**
 * 将补充API数据转换为组件期望的格式
 */
const transformSupplementDataToFormat = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }
  
  return apiData.map((item) => {
    const normalizedId = item.id ?? item.supplementId ?? item.supplement_id ?? null;
    const normalizedAuthor =
      item.author ||
      item.authorNickName ||
      item.userName ||
      item.userNickname ||
      item.nickname ||
      '匿名用户';
    const normalizedAvatar =
      item.avatar ||
      item.authorAvatar ||
      item.userAvatar ||
      item.user_avatar ||
      null;
    const normalizedLocation =
      item.location ||
      item.ipLocation ||
      item.city ||
      '未知';
    const normalizedLikeCount = Number(item.likeCount ?? item.likes ?? item.like_count) || 0;
    const normalizedDislikeCount = Number(item.dislikeCount ?? item.dislikes ?? item.dislike_count) || 0;
    const normalizedCommentCount = Number(item.commentCount ?? item.comments ?? item.comment_count) || 0;
    const normalizedShareCount = Number(item.shareCount ?? item.shares ?? item.share_count) || 0;
    const normalizedCollectCount = Number(item.collectCount ?? item.bookmarkCount ?? item.bookmarks ?? item.collect_count) || 0;
    const normalizedAnswerCount = Number(item.answerCount ?? item.answers ?? item.answer_count) || 0;
    const normalizedSuperLikeCount = Number(item.superLikeCount ?? item.superLikes ?? item.super_like_count) || 0;
    const normalizedLiked = item.liked ?? item.isLiked ?? false;
    const normalizedDisliked = item.disliked ?? item.isDisliked ?? false;
    const normalizedCollected = item.collected ?? item.isCollected ?? false;
    const normalizedCanEdit = item.canEdit ?? item.editable ?? false;
    // 生成一个合理的时间（如果API没有提供时间字段）
    let timeDisplay = '刚刚';
    
    if (item.createTime || item.createdAt || item.updateTime || item.updatedAt) {
      timeDisplay = formatApiTime(item.createTime || item.createdAt || item.updateTime || item.updatedAt);
    }
    
    // 基础数据转换
    const transformedItem = {
      ...item,
      id: normalizedId,
      author: item.userName || item.userNickname || '匿名用户',
      supplementId: normalizedId,
      questionId: item.questionId ?? item.question_id ?? null,
      userId: item.userId ?? item.user_id ?? null,
      authorNickName: item.authorNickName ?? item.author_nick_name ?? normalizedAuthor,
      avatar: normalizedAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${normalizedId ?? 'supplement'}`,
      authorAvatar: normalizedAvatar,
      location: item.location || '未知',
      content: item.content || item.description || '',
      likes: item.likeCount || 0,
      dislikes: item.dislikeCount || 0,
      comments: item.commentCount || 0,
      shares: item.shareCount || 0,
      bookmarks: item.collectCount || 0,
      superLikes: item.superLikeCount || 0,
      author: normalizedAuthor,
      location: normalizedLocation,
      content: item.content || item.description || item.text || '',
      liked: normalizedLiked,
      disliked: normalizedDisliked,
      collected: normalizedCollected,
      canEdit: normalizedCanEdit,
      likeCount: normalizedLikeCount,
      likes: normalizedLikeCount,
      dislikeCount: normalizedDislikeCount,
      dislikes: normalizedDislikeCount,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount,
      shareCount: normalizedShareCount,
      shares: normalizedShareCount,
      collectCount: normalizedCollectCount,
      bookmarkCount: normalizedCollectCount,
      bookmarks: normalizedCollectCount,
      answerCount: normalizedAnswerCount,
      superLikeCount: normalizedSuperLikeCount,
      superLikes: normalizedSuperLikeCount,
      time: timeDisplay,
    };
    
    // 处理图片
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      transformedItem.imageUrls = item.imageUrls;
      transformedItem.images = item.imageUrls;
    }
    
    return transformedItem;
  });
};

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
      title: processTitle(item.title) || '无标题',
      author: item.authorNickName || item.userName || item.userNickname || '匿名用户',
      authorNickName: item.authorNickName || item.userName || item.userNickname || null,
      avatar: item.authorAvatar || item.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${item.id}`,
      authorAvatar: item.authorAvatar || item.userAvatar || null,
      time: timeDisplay,
      likeCount: item.likeCount || 0,
      dislikeCount: item.dislikeCount || 0,
      answerCount: item.answerCount || 0,
      shareCount: item.shareCount || 0,
      collectCount: item.collectCount || 0,
      country: '中国',
      city: item.location || '北京',
      solvedPercent: item.solvedPercent || Math.floor(Math.random() * 100),
    };
    
    // 问题类型转换
    // 注意：付费查看的优先级最高，如果 payViewAmount > 0，优先显示付费样式
    if (item.payViewAmount > 0) {
      // 付费查看（优先级最高）
      transformedItem.type = 'paid';
      transformedItem.paidAmount = Math.floor(item.payViewAmount / 100);
      // 付费功能暂未完成，统一设置为未付费
      transformedItem.isPaid = false;
      // 保存原始问题类型，用户付费后可以看到
      transformedItem.originalType = item.type;
      if (item.bountyAmount > 0) {
        transformedItem.originalReward = Math.floor(item.bountyAmount / 100);
      }
    } else if (item.type === 1 && item.bountyAmount > 0) {
      // 悬赏问题
      transformedItem.type = 'reward';
      transformedItem.reward = Math.floor(item.bountyAmount / 100); // 转换为元
    } else if (item.type === 2) {
      // 定向问题
      transformedItem.type = 'targeted';
      if (item.bountyAmount > 0) {
        transformedItem.reward = Math.floor(item.bountyAmount / 100);
      }
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
 * 加载问题补充列表（带缓存）
 * 
 * @param {string} questionId - 问题ID
 * @param {string} sortBy - 排序方式 (featured, latest)
 * @param {number} page - 页码
 * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
 * @returns {Promise<{data: Array, fromCache: boolean}>}
 */
export const loadQuestionSupplements = async (questionId, sortBy = 'featured', page = 1, forceRefresh = false) => {
  const cacheKey = `supplements_${questionId}_${sortBy}_${page}`;
  
  // 检查是否有正在进行的相同请求
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // 创建请求 Promise
  const requestPromise = (async () => {
    try {
      // 1. 如果不是强制刷新，先尝试从缓存获取
      if (!forceRefresh) {
        const cached = await getCache('supplements', { questionId, sortBy, page });
        if (cached) {
          // 返回缓存数据，同时在后台更新
          backgroundUpdateSupplements(questionId, sortBy, page);
          return { data: cached, fromCache: true };
        }
      }
      
      // 2. 从网络加载数据
      const response = await fetchSupplementsByQuestion(questionId, sortBy, page);
      
      // 3. 保存到缓存
      if (response && response.length > 0) {
        await setCache('supplements', { questionId, sortBy, page }, response);
      }
      
      return { data: response, fromCache: false };
    } catch (error) {
      // 如果网络请求失败，尝试返回缓存数据
      const cached = await getCache('supplements', { questionId, sortBy, page });
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
 * 后台更新补充数据（不阻塞 UI）
 */
const backgroundUpdateSupplements = async (questionId, sortBy, page) => {
  try {
    console.log(`🔄 后台更新补充: questionId=${questionId}, sortBy=${sortBy}, page=${page}`);
    const response = await fetchSupplementsByQuestion(questionId, sortBy, page);
    
    if (response && response.length > 0) {
      await setCache('supplements', { questionId, sortBy, page }, response);
      console.log(`✅ 后台更新补充完成: questionId=${questionId}, sortBy=${sortBy}, page=${page}`);
    }
  } catch (error) {
    console.error(`❌ 后台更新补充失败: questionId=${questionId}, sortBy=${sortBy}, page=${page}`, error);
  }
};

/**
 * 获取问题补充数据
 */
const fetchSupplementsByQuestion = async (questionId, sortBy, page) => {
  try {
    console.log('\n🔍 ==================== 补充列表API调用 ====================');
    console.log('📊 调用参数:');
    console.log('  questionId:', questionId);
    console.log('  sortBy:', sortBy);
    console.log('  page:', page);
    
    const response = await questionApi.getQuestionSupplements(questionId, {
      sortBy,
      pageNum: page,
      pageSize: 10,
    });
    
    console.log('📥 API原始响应:');
    console.log(JSON.stringify(response, null, 2));
    
    // 处理响应数据
    if (response && response.code === 200) {
      const rawData = response.data?.rows || response.data?.list || response.data || [];
      
      console.log('📋 提取的数据:');
      console.log('  数据路径: response.data?.rows || response.data?.list || response.data');
      console.log('  提取结果:', JSON.stringify(rawData, null, 2));
      console.log('  数据条数:', Array.isArray(rawData) ? rawData.length : 0);
      
      if (Array.isArray(rawData) && rawData.length > 0) {
        console.log('\n📄 第一条数据详细分析:');
        const firstItem = rawData[0];
        console.log('  完整数据:', JSON.stringify(firstItem, null, 2));
        console.log('\n  字段检查:');
        Object.keys(firstItem).forEach(key => {
          console.log(`    ${key}: ${firstItem[key]} (${typeof firstItem[key]})`);
        });
      }
      
      const transformedData = transformSupplementDataToFormat(rawData);
      
      console.log('\n📊 转换后数据:');
      console.log(JSON.stringify(transformedData, null, 2));
      console.log('🔍 ==================== API调用结束 ====================\n');
      
      return transformedData;
    } else {
      console.log('⚠️  API响应异常:', response);
      console.log('🔍 ==================== API调用结束 ====================\n');
      return [];
    }
  } catch (error) {
    console.error('❌ API调用失败:', error);
    console.log('🔍 ==================== API调用结束 ====================\n');
    throw error;
  }
};

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
      // 优化：如果是强制刷新，直接从网络加载，不检查缓存
      if (forceRefresh) {
        console.log(`⚡ 强制刷新: ${tabType} - 第${page}页 (跳过缓存检查)`);
        const response = await fetchQuestionsByTab(tabType, page, onDebugUpdate);
        
        // 保存到缓存
        if (response && response.length > 0) {
          await setCache('questions', { tabType, page }, response);
        }
        
        return { data: response, fromCache: false };
      }
      
      // 1. 如果不是强制刷新，先尝试从缓存获取
      const cached = await getCache('questions', { tabType, page });
      if (cached) {
        // 返回缓存数据，同时在后台更新
        backgroundUpdate(tabType, page, onDebugUpdate);
        return { data: cached, fromCache: true };
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
        console.log(`⚠️ 网络请求失败，使用缓存数据: ${tabType} - 第${page}页`);
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
