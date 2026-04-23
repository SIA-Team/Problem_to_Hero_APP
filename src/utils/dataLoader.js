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
import { formatTime as formatDisplayTime } from './timeFormatter';
import { applyPaidQuestionAccessState } from './paidQuestionAccess';
import { getQuestionAdoptRate, getQuestionPayViewAmount, shouldRequirePaidQuestionAccess } from './questionAccessRules';
import { centsToAmount } from './rewardAmount';
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
    
    // 尝试提取问题的核心部分
    // 1. 如果包含问号，截取到第一个问号
    const questionMarkIndex = title.indexOf('？') !== -1 ? title.indexOf('？') : title.indexOf('?');
    if (questionMarkIndex !== -1 && questionMarkIndex < 50) {
      const extractedTitle = title.substring(0, questionMarkIndex + 1);
      return extractedTitle;
    }
    
    // 2. 如果包含句号，截取到第一个句号
    const periodIndex = title.indexOf('。') !== -1 ? title.indexOf('。') : title.indexOf('.');
    if (periodIndex !== -1 && periodIndex < 50) {
      const extractedTitle = title.substring(0, periodIndex + 1);
      return extractedTitle;
    }
    
    // 3. 如果都没有，截取前40个字符并加省略号
    const truncatedTitle = title.substring(0, 40) + '...';
    return truncatedTitle;
  }
  
  return title;
};

const normalizeLocationText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
};

const resolveLocationParts = (item = {}) => {
  const normalizedLocation = normalizeLocationText(
    item.location ||
    item.ipLocation ||
    item.ip_location ||
    item.city ||
    item.region ||
    item.address
  );

  const parts = normalizedLocation ? normalizedLocation.split(/\s+/).filter(Boolean) : [];
  const fallbackCountry = normalizeLocationText(item.country);
  const fallbackCity = normalizeLocationText(item.city);
  const fallbackState = normalizeLocationText(item.state);
  const fallbackDistrict = normalizeLocationText(item.district);

  return {
    location: normalizedLocation,
    country: fallbackCountry || parts[0] || '',
    city: fallbackCity || parts[1] || '',
    state: fallbackState || parts[2] || '',
    district: fallbackDistrict || parts[3] || ''
  };
};

/**
 * 将补充API数据转换为组件期望的格式
 */
const transformSupplementDataToFormat = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }
  
  return apiData.map((item) => {
    const normalizedId = item.supplementId ?? item.supplement_id ?? item.id ?? null;
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
    const normalizedIpLocation =
      item.ipLocation ||
      item.ip_location ||
      item.ipAddress ||
      item.ip_address ||
      null;
    const normalizedLikeCount = Number(item.likeCount ?? item.likes ?? item.like_count) || 0;
    const normalizedDislikeCount = Number(item.dislikeCount ?? item.dislikes ?? item.dislike_count) || 0;
    const normalizedCommentCount = Number(
      item.commentCount ??
      item.comments ??
      item.comment_count
    ) || 0;
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
      timeDisplay = formatDisplayTime(item.createTime || item.createdAt || item.updateTime || item.updatedAt);
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
      ipLocation: normalizedIpLocation,
      ip_location: normalizedIpLocation,
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
  
  // 过滤掉空值、非对象和 status 为 0 的数据
  const filteredData = apiData.filter(item => item && typeof item === 'object' && !Array.isArray(item) && item.status !== 0);
  
  if (filteredData.length !== apiData.length) {
  }
  
  return filteredData.map((item, index) => {
    const normalizedQuestionId =
      item.id ??
      item.questionId ??
      item.question_id ??
      item.contentId ??
      item.subjectId ??
      `question-${index}`;
    const normalizedPublicUserId =
      item.publicUserId ??
      item.authorUserId ??
      item.authorId ??
      item.author_id ??
      item.userId ??
      item.user_id ??
      item.createBy ??
      item.create_by ??
      item.creatorId ??
      item.creator_id ??
      item.uid ??
      null;
    // 生成一个合理的时间（如果API没有提供时间字段）
    let timeDisplay = '刚刚';
    
    if (item.createTime || item.createdAt || item.updateTime || item.updatedAt) {
      timeDisplay = formatDisplayTime(item.createTime || item.createdAt || item.updateTime || item.updatedAt);
    } else {
      // 如果没有时间字段，根据索引生成一个合理的时间
      const hoursAgo = Math.floor(Math.random() * 24) + 1; // 1-24小时前
      timeDisplay = `${hoursAgo}小时前`;
    }

    const locationParts = resolveLocationParts(item);
    
    const normalizedPayViewAmount = getQuestionPayViewAmount(item);
    const normalizedBountyAmount = Number(item.bountyAmount ?? 0) || 0;
    const normalizedAdoptRate = getQuestionAdoptRate(item);
    const requiresPaidView = shouldRequirePaidQuestionAccess({
      adoptRate: normalizedAdoptRate,
      payViewAmount: normalizedPayViewAmount,
    });

    // 基础数据转换
    const transformedItem = {
      id: normalizedQuestionId,
      publicUserId: normalizedPublicUserId,
      authorId: item.authorId ?? item.author_id ?? normalizedPublicUserId,
      userId: item.userId ?? item.user_id ?? normalizedPublicUserId,
      title: processTitle(item.title) || '无标题',
      author: item.authorNickName || item.userName || item.userNickname || '匿名用户',
      authorNickName: item.authorNickName || item.userName || item.userNickname || null,
      avatar:
        item.authorAvatar ||
        item.userAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=user${normalizedQuestionId}`,
      authorAvatar: item.authorAvatar || item.userAvatar || null,
      time: timeDisplay,
      likeCount: item.likeCount || 0,
      dislikeCount: item.dislikeCount || 0,
      answerCount: item.answerCount || 0,
      shareCount: item.shareCount || 0,
      collectCount: item.collectCount || 0,
      location: locationParts.location || '未知',
      country: locationParts.country || locationParts.location || '未知',
      city: locationParts.city || locationParts.location || locationParts.country || '未知',
      state: locationParts.state || '',
      district: locationParts.district || '',
      adoptRate: normalizedAdoptRate,
      solvedPercent: normalizedAdoptRate,
      payViewAmount: normalizedPayViewAmount,
      bountyAmount: normalizedBountyAmount,
      rawType: item.type ?? null,
      requiresPaidView,
    };
    
    // 问题类型转换
    // 注意：仅当问题已解决且配置了付费查看时，首页才显示付费样式
    if (requiresPaidView) {
      // 付费查看（优先级最高）
      transformedItem.type = 'paid';
      transformedItem.paidAmount = normalizedPayViewAmount / 100;
      // 付费功能暂未完成，统一设置为未付费
      transformedItem.isPaid = Boolean(item.isPaid ?? item.hasPaid ?? item.isUnlocked ?? false);
      // 保存原始问题类型，用户付费后可以看到
      transformedItem.originalType = item.type;
      if (normalizedBountyAmount > 0) {
        transformedItem.originalReward = centsToAmount(normalizedBountyAmount);
      }
    } else if (item.type !== 2 && normalizedBountyAmount > 0) {
      // 悬赏问题
      transformedItem.type = 'reward';
      transformedItem.reward = centsToAmount(normalizedBountyAmount); // 转换为元
    } else if (item.type === 2) {
      // 定向问题
      transformedItem.type = 'targeted';
      if (normalizedBountyAmount > 0) {
        transformedItem.reward = centsToAmount(normalizedBountyAmount);
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
const backgroundRefreshTimers = new Map();

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
    const response = await fetchSupplementsByQuestion(questionId, sortBy, page);
    
    if (response && response.length > 0) {
      await setCache('supplements', { questionId, sortBy, page }, response);
    }
  } catch (error) {
    console.warn(`补充列表后台更新失败: questionId=${questionId}, sortBy=${sortBy}, page=${page}`, error);
  }
};

/**
 * 获取问题补充数据
 */
const fetchSupplementsByQuestion = async (questionId, sortBy, page) => {
  try {
    
    const response = await questionApi.getQuestionSupplements(questionId, {
      sortBy,
      pageNum: page,
      pageSize: 10,
    });
    
    
    // 处理响应数据
    if (response && response.code === 200) {
      const rawData = response.data?.rows || response.data?.list || response.data || [];
      
      
      if (Array.isArray(rawData) && rawData.length > 0) {
        const firstItem = rawData[0];
        Object.keys(firstItem).forEach(key => {
        });
      }
      
      const transformedData = transformSupplementDataToFormat(rawData);
      
      
      return transformedData;
    } else {
      return [];
    }
  } catch (error) {
    console.warn('补充列表接口调用失败:', error);
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
        const response = await fetchQuestionsByTab(tabType, page, onDebugUpdate);
        const decoratedResponse = await applyPaidQuestionAccessState(response);
        
        // 保存到缓存
        if (response && response.length > 0) {
          await setCache('questions', { tabType, page }, response);
        }
        
        return { data: decoratedResponse, fromCache: false };
      }
      
      // 1. 如果不是强制刷新，先尝试从缓存获取
      const cached = await getCache('questions', { tabType, page });
      if (cached) {
        // 返回缓存数据，同时在后台更新
        scheduleBackgroundUpdate(tabType, page, onDebugUpdate);
        return { data: await applyPaidQuestionAccessState(cached), fromCache: true };
      }
      
      // 2. 从网络加载数据
      const response = await fetchQuestionsByTab(tabType, page, onDebugUpdate);
      const decoratedResponse = await applyPaidQuestionAccessState(response);
      
      // 3. 保存到缓存
      if (response && response.length > 0) {
        await setCache('questions', { tabType, page }, response);
      }
      
      return { data: decoratedResponse, fromCache: false };
    } catch (error) {
      // 如果网络请求失败，尝试返回缓存数据
      const cached = await getCache('questions', { tabType, page });
      if (cached) {
        return { data: await applyPaidQuestionAccessState(cached), fromCache: true };
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
    const response = await fetchQuestionsByTab(tabType, page);
    
    if (response && response.length > 0) {
      await setCache('questions', { tabType, page }, response);
    }
  } catch (error) {
    console.warn(`问题列表后台更新失败: ${tabType} - 第${page}页`, error);
  }
};

/**
 * 根据 Tab 类型获取数据
 */
const scheduleBackgroundUpdate = (tabType, page, onDebugUpdate = null) => {
  const cacheKey = `questions_${tabType}_${page}`;

  if (backgroundRefreshTimers.has(cacheKey)) {
    return;
  }

  const timer = setTimeout(() => {
    backgroundRefreshTimers.delete(cacheKey);
    loadQuestions(tabType, page, true, onDebugUpdate).catch(() => {});
  }, 1200);

  backgroundRefreshTimers.set(cacheKey, timer);
};

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
      await loadQuestions(tabType, 1, false);
    } catch (error) {
      console.warn(`问题列表预加载失败: ${tabType}`, error);
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
    await loadQuestions(tabType, nextPage, false);
  } catch (error) {
    console.warn(`问题列表预加载下一页失败: ${tabType} - 第${nextPage}页`, error);
  }
};

/**
 * 批量加载多个 Tab 的数据
 * 
 * @param {Array<string>} tabs - Tab 列表
 * @returns {Promise<Object>} 各 Tab 的数据
 */
export const batchLoadTabs = async (tabs) => {
  
  const results = {};
  
  // 并发加载所有 Tab
  await Promise.all(
    tabs.map(async (tab) => {
      try {
        const { data } = await loadQuestions(tab, 1, false);
        results[tab] = data;
      } catch (error) {
        console.warn(`问题列表批量加载失败: ${tab}`, error);
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
    console.warn('检查新内容失败:', error);
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
  
};
