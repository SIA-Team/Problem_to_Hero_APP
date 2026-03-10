import apiClient from './apiClient';
import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

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
  getQuestions: (params) => {
    const { pageNum = 1, pageSize = 20, question = {} } = params;
    
    // 构建请求参数
    const requestParams = {
      pageNum,
      pageSize,
      question: {
        ...question,
        // 确保必要的字段存在
        params: question.params || {},
      },
    };
    
    console.log('📡 请求问题列表:', requestParams);
    
    return contentApiClient.get(API_ENDPOINTS.QUESTION.LIST, { params: requestParams });
  },

  /**
   * 获取问题详情
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getQuestionDetail: (questionId) => {
    const url = replaceUrlParams(API_ENDPOINTS.QUESTION.DETAIL, { id: questionId });
    return apiClient.get(url);
  },

  /**
   * 创建问题
   * @param {Object} data - 问题数据
   * @param {number} data.type - 问题类型：0=公开问题，1=悬赏问题，2=定向问题
   * @param {number} data.categoryId - 二级分类ID（必填）
   * @param {string} data.title - 问题标题（必填，5-50字）
   * @param {string} data.description - 问题描述（必填）
   * @param {string} data.subQuestions - 子问题（可选）
   * @param {boolean} data.asDraft - 是否保存为草稿
   * @param {number} data.bountyAmount - 悬赏金额（type=1或2时必填，单位：分）
   * @param {number} data.payViewAmount - 付费查看金额（单位：分）
   * @param {string} data.location - 位置信息（可选）
   * @param {number} data.visibilityScope - 可见范围：0=所有人，1=仅关注我的人，2=仅自己
   * @param {number} data.isAnonymous - 是否匿名：0=不匿名，1=匿名
   * @param {number} data.isPublicAnswer - 是否公开答案：0=不公开，1=公开
   * @param {number} data.teamId - 团队ID（以团队身份发布时必填）
   * @param {Array<number>} data.expertIds - 专家ID列表（type=2时必填）
   * @param {Array<number>} data.topicIds - 已有话题ID列表（可选）
   * @param {Array<string>} data.topicNames - 新话题名称列表（可选）
   * @param {Array<string>} data.imageUrls - 图片URL列表（最多9张）
   * @returns {Promise<Object>}
   */
  createQuestion: (data) => {
    return contentApiClient.post(API_ENDPOINTS.QUESTION.CREATE, data);
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
