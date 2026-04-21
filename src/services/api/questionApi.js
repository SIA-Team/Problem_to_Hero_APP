import apiClient from './apiClient';
import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const LEGACY_QUESTION_DETAIL_ENDPOINT = '/qa-hero-content/app/content/question/detail';
const QUESTION_RANKING_ALL_CACHE_TTL = 2 * 60 * 1000;
const questionRankingAllCache = new Map();
const questionRankingAllPendingRequests = new Map();

const extractRequestErrorMessage = error => {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  const candidates = [
    error.message,
    error?.msg,
    error?.data?.msg,
    error?.data?.message,
    error?.response?.data?.msg,
    error?.response?.data?.message,
  ];

  return candidates.find(candidate => typeof candidate === 'string' && candidate.trim()) || '';
};

const isStaticResourceNotFoundError = error => {
  const message = extractRequestErrorMessage(error);
  return /No static resource|404_NOT_FOUND|404 NOT_FOUND/i.test(message);
};

const isQuestionApiSuccessResponse = response => !!response && response.code === 200;

const buildQuestionRankingAllCacheKey = params => {
  const parsedRegionId = Number(params?.regionId);
  const regionId = Number.isFinite(parsedRegionId) ? parsedRegionId : 0;
  return `question-ranking-all:${regionId}`;
};

const shouldFallbackQuestionRequest = result => {
  if (isQuestionApiSuccessResponse(result)) {
    return false;
  }

  return isStaticResourceNotFoundError(result);
};

const executeQuestionRequestWithFallback = async ({
  primaryRequest,
  fallbackRequests = [],
  debugLabel,
}) => {
  try {
    const primaryResponse = await primaryRequest();

    if (shouldFallbackQuestionRequest(primaryResponse)) {
      throw primaryResponse;
    }

    return primaryResponse;
  } catch (error) {
    if (!isStaticResourceNotFoundError(error)) {
      throw error;
    }

    if (__DEV__ && debugLabel) {
      console.warn(`[questionApi] ${debugLabel} 主路径不可用，尝试备用路径:`, extractRequestErrorMessage(error));
    }

    let lastFallbackError = error;

    for (const request of fallbackRequests) {
      try {
        const fallbackResponse = await request();

        if (!shouldFallbackQuestionRequest(fallbackResponse)) {
          return fallbackResponse;
        }

        lastFallbackError = fallbackResponse;
      } catch (fallbackError) {
        lastFallbackError = fallbackError;
      }
    }

    throw lastFallbackError;
  }
};

/**
 * 问题相关 API
 */
const questionApi = {
  /**
   * 获取问题列表
   * @param {Object} params - 查询参数
   * @param {Object} params.question - 筛选条件
   * @param {number} params.question.userId - 提问者ID
   * @param {number} params.question.type - 问题类型
   * @param {number} params.question.categoryId - 类别ID
   * @param {number} params.question.status - 状态
   * @param {string} params.question.title - 标题（模糊搜索）
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getQuestions: async (params) => {
    const { pageNum = 1, pageSize = 20, question = {} } = params;
    
    const requestParams = {
      pageNum,
      pageSize,
      question: {
        ...question,
        params: question.params || {},
      },
    };
    
    const response = await executeQuestionRequestWithFallback({
      primaryRequest: () =>
        contentApiClient.get(API_ENDPOINTS.QUESTION.LIST, { params: requestParams }),
      debugLabel: '问题列表',
    });
    
    if (response && response.data && response.data.rows) {
      const originalCount = response.data.rows.length;
      response.data.rows = response.data.rows.filter(item => item.status !== 0);
    }
    
    return response;
  },

  getBrowseHistoryList: (params = {}) => {
    const { pageNum = 1, pageSize = 10 } = params;

    return contentApiClient.get(API_ENDPOINTS.QUESTION.BROWSE_MY, {
      params: {
        pageNum,
        pageSize,
      },
    });
  },

  /**
   * 获取问题详情
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionDetail: async (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DETAIL, { id: questionId });
    return executeQuestionRequestWithFallback({
      primaryRequest: () => contentApiClient.get(url),
      fallbackRequests: [
        () =>
          contentApiClient.get(LEGACY_QUESTION_DETAIL_ENDPOINT, {
            params: { id: questionId },
          }),
        () =>
          contentApiClient.get(LEGACY_QUESTION_DETAIL_ENDPOINT, {
            params: { questionId },
          }),
      ],
      debugLabel: '问题详情',
    });
  },

  getCommunitySolveVoteSummary: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.COMMUNITY_SOLVE_VOTE_SUMMARY, { id: questionId });
    return contentApiClient.get(url);
  },

  submitCommunitySolveVote: (questionId, choice) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.COMMUNITY_SOLVE_VOTE, { id: questionId });
    return contentApiClient.post(url, {
      choice
    });
  },

  /**
   * 获取问题团队列表
   * @param {string|number} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionTeams: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.TEAM.PUBLIC_QUESTION, { questionId });
    return apiClient.get(url);
  },

  /**
   * 获取问题公开群组信息
   * @param {string|number} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionGroups: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.GROUP.PUBLIC_QUESTION, {
      questionId: String(questionId ?? '').trim(),
    });
    return apiClient.get(url);
  },

  /**
   * 获取问题公开群组ID列表
   * @param {string|number} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionGroupIds: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.GROUP.PUBLIC_QUESTION_IDS, {
      questionId: String(questionId ?? '').trim(),
    });
    return apiClient.get(url);
  },

  /**
   * 加入问题群组
   * @param {string|number} groupId - 群组ID
   * @returns {Promise<Object>}
   */
  joinQuestionGroup: (groupId) => {
    const normalizedGroupId = Number(groupId);

    if (!Number.isInteger(normalizedGroupId) || normalizedGroupId <= 0) {
      const invalidGroupError = new Error('群组ID无效');
      invalidGroupError.code = 'INVALID_GROUP_ID';
      throw invalidGroupError;
    }

    const url = replaceUrlParams(API_ENDPOINTS.GROUP.JOIN, {
      groupId: String(normalizedGroupId),
    });

    return apiClient.post(url, {
      groupId: normalizedGroupId,
    });
  },

  /**
   * 发布问题
   * @param {Object} data - 问题数据
   * @param {number} data.id - 问题ID（0=新建问题，有值=更新问题）
   * @param {number} data.type - 问题类型：0=公开问题，1=悬赏问题，2=定向问题
   * @param {number} data.categoryId - 二级分类ID（必填）
   * @param {string} data.title - 问题标题（必填，1-200字符）
   * @param {string} data.description - 问题描述
   * @param {string} data.subQuestions - 子问题（JSON数组字符串）
   * @param {number} data.bountyAmount - 悬赏金额（单位：分）
   * @param {number} data.payViewAmount - 付费查看金额（单位：分）
   * @param {string} data.location - 位置信息
   * @param {number} data.visibilityScope - 可见范围：0=所有人，1=仅关注我的人，2=仅自己
   * @param {number} data.isAnonymous - 是否匿名：0=不匿名，1=匿名
   * @param {number} data.isPublicAnswer - 是否公开答案：0=不公开，1=公开
   * @param {number} data.teamId - 团队ID
   * @param {Array<number>} data.expertIds - 专家ID列表
   * @param {Array<number>} data.topicIds - 已有话题ID列表
   * @param {Array<string>} data.topicNames - 新话题名称列表
   * @param {Array<string>} data.imageUrls - 图片URL列表
   * @returns {Promise<Object>}
   */
  publishQuestion: (data) => {
    const fixedData = {
      ...data,
      subQuestions: data.subQuestions === '' ? '[]' : data.subQuestions
    };
    
    return contentApiClient.post(API_ENDPOINTS.QUESTION.PUBLISH, fixedData);
  },

  /**
   * 保存问题草稿
   * @param {Object} data - 草稿数据
   * @param {number} data.id - 草稿ID（0=新建草稿，有值=更新草稿）
   * @param {number} data.type - 问题类型：0=公开问题，1=悬赏问题，2=定向问题
   * @param {number} data.categoryId - 二级分类ID
   * @param {string} data.title - 问题标题
   * @param {string} data.description - 问题描述
   * @param {string} data.subQuestions - 子问题
   * @param {number} data.bountyAmount - 悬赏金额（单位：分）
   * @param {number} data.payViewAmount - 付费查看金额（单位：分）
   * @param {string} data.location - 位置信息
   * @param {number} data.visibilityScope - 可见范围：0=所有人，1=仅关注我的人，2=仅自己
   * @param {number} data.isAnonymous - 是否匿名：0=不匿名，1=匿名
   * @param {number} data.isPublicAnswer - 是否公开答案：0=不公开，1=公开
   * @param {number} data.teamId - 团队ID
   * @param {Array<number>} data.expertIds - 专家ID列表
   * @param {Array<number>} data.topicIds - 已有话题ID列表
   * @param {Array<string>} data.topicNames - 新话题名称列表
   * @param {Array<string>} data.imageUrls - 图片URL列表
   * @returns {Promise<Object>}
   */
  saveDraft: (data) => {
    const fixedData = {
      ...data,
      subQuestions: data.subQuestions === '' ? '[]' : data.subQuestions
    };
    
    return contentApiClient.post(API_ENDPOINTS.QUESTION.DRAFT, fixedData);
  },

  getDraftDetail: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DRAFT_DETAIL, { id });
    return contentApiClient.get(url);
  },

  /**
   * 获取问题补充列表
   * @param {string} questionId - 问题ID
   * @param {Object} params - 查询参数
   * @param {string} params.sortBy - 排序方式（featured=精选，latest=最新）
   * @param {number} params.pageNum - 页码（默认1）
   * @param {number} params.pageSize - 每页数量（默认10）
   * @returns {Promise<Object>}
   */
  getQuestionSupplements: (questionId, params = {}) => {
    const {
      sortBy = 'featured',
      pageNum = 1,
      pageSize = 10
    } = params;

    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.SUPPLEMENTS, { questionId });
    
    const requestParams = {
      sortBy,
      pageNum,
      pageSize
    };
    
    return contentApiClient.get(url, { params: requestParams });
  },

  publishSupplement: (questionId, supplementCreateRequest) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.PUBLISH_SUPPLEMENT, { questionId });
    return contentApiClient.post(url, supplementCreateRequest);
  },

  dislikeSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DISLIKE_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  undislikeSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNDISLIKE_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  likeSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.LIKE_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  unlikeSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNLIKE_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  collectSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.COLLECT_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  uncollectSupplement: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNCOLLECT_SUPPLEMENT, { id });
    return contentApiClient.post(url);
  },

  /**
   * 点赞问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  likeQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.LIKE, { id });
    return contentApiClient.post(url);
  },

  /**
   * 取消点赞问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  unlikeQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNLIKE, { id });
    return contentApiClient.post(url);
  },

  /**
   * 点踩问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  dislikeQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DISLIKE, { id });
    return contentApiClient.post(url);
  },

  /**
   * 取消点踩问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  undislikeQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNDISLIKE, { id });
    return contentApiClient.post(url);
  },

  /**
   * 收藏问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  collectQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.COLLECT, { id });
    return contentApiClient.post(url);
  },

  /**
   * 取消收藏问题
   * @param {string} id - 问题ID
   * @returns {Promise<Object>}
   */
  uncollectQuestion: (id) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UNCOLLECT, { id });
    return contentApiClient.post(url);
  },

  getDraftsList: (params) => {
    const { pageNum = 1, pageSize = 10 } = params;
    
    const requestParams = {
      pageNum,
      pageSize,
    };
    
    return contentApiClient.get(API_ENDPOINTS.QUESTION.DRAFTS, { params: requestParams });
  },

  /**
   * 更新问题
   * @param {string} questionId - 问题ID
   * @param {Object} data - 更新的数据
   * @returns {Promise<Object>}
   */
  updateQuestion: (questionId, data) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.UPDATE, { id: questionId });
    return apiClient.put(url, data);
  },

  /**
   * 删除问题
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  deleteQuestion: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DELETE, { id: questionId });
    return apiClient.delete(url);
  },

  /**
   * 获取热门问题
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>}
   */
  getHotQuestions: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.HOT, { params });
  },

  /**
   * 获取问题排行榜
   * @param {Object} params - 查询参数
   * @param {string} params.type - 排行类型（views/answers/rewards）
   * @returns {Promise<Object>}
   */
  getQuestionRanking: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.RANKING, { params });
  },

  getQuestionRankingAll: (params = {}, options = {}) => {
    const parsedRegionId = Number(params.regionId);
    const regionId = Number.isFinite(parsedRegionId) ? parsedRegionId : 0;
    const cacheKey = buildQuestionRankingAllCacheKey({ regionId });
    const forceRefresh = options.forceRefresh === true;

    if (!forceRefresh) {
      const cachedEntry = questionRankingAllCache.get(cacheKey);
      const isCacheValid =
        cachedEntry &&
        Date.now() - cachedEntry.timestamp < QUESTION_RANKING_ALL_CACHE_TTL &&
        isQuestionApiSuccessResponse(cachedEntry.response);

      if (isCacheValid) {
        return Promise.resolve(cachedEntry.response);
      }

      if (questionRankingAllPendingRequests.has(cacheKey)) {
        return questionRankingAllPendingRequests.get(cacheKey);
      }
    }

    const request = contentApiClient.get(API_ENDPOINTS.QUESTION.RANKING_ALL, {
      params: { regionId },
    })
      .then(response => {
        if (isQuestionApiSuccessResponse(response)) {
          questionRankingAllCache.set(cacheKey, {
            response,
            timestamp: Date.now(),
          });
        }

        return response;
      })
      .finally(() => {
        questionRankingAllPendingRequests.delete(cacheKey);
      });

    questionRankingAllPendingRequests.set(cacheKey, request);
    return request;
  },

  /**
   * 搜索问题
   * @param {Object} params - 搜索参数
   * @param {string} params.keyword - 关键词
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  searchQuestions: (params) => {
    return apiClient.get(API_ENDPOINTS.QUESTION.SEARCH, { params });
  },

  /**
   * 获取推荐列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getRecommendList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 推荐列表：获取所有已发布的问题，按创建时间排序
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1, // 只获取已发布的问题
      },
    });
  },

  /**
   * 获取热榜列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getHotList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 热榜列表：可以根据浏览量、点赞数等排序
    // 这里先使用基础接口，后续可以优化
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1,
      },
    });
  },

  /**
   * 获取关注列表（用于首页优化）
   * @param {Object} params - 查询参数
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getFollowList: (params) => {
    const { pageNum = 1, pageSize = 20 } = params;
    
    // 关注列表：获取关注用户的问题
    // 这里先使用基础接口，后续需要后端支持
    return questionApi.getQuestions({
      pageNum,
      pageSize,
      question: {
        status: 1,
      },
    });
  },
};

export default questionApi;
