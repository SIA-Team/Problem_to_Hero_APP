import apiClient from './apiClient';
import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const ANSWER_SUPPLEMENT_COLLECT_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/collect';
const ANSWER_SUPPLEMENT_UNCOLLECT_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/uncollect';
const ANSWER_SUPPLEMENT_LIKE_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/like';
const ANSWER_SUPPLEMENT_UNLIKE_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/unlike';
const ANSWER_SUPPLEMENT_DISLIKE_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/dislike';
const ANSWER_SUPPLEMENT_UNDISLIKE_ENDPOINT = '/qa-hero-content/app/content/answer-supplement/:id/undislike';

/**
 * 回答相关 API
 */
const answerApi = {
  /**
   * 获取问题的回答列�?
   * @param {string} questionId - 问题ID
   * @param {Object} params - 查询参数
   * @param {string} params.sortBy - 排序方式（featured=精选，latest=最新），默认featured
   * @param {number} params.pageNum - 页码，默�?
   * @param {number} params.pageSize - 每页数量，默�?0
   * @returns {Promise<Object>}
   */
  getAnswers: (questionId, params = {}) => {
    const {
      sortBy = 'featured',
      pageNum = 1,
      pageSize = 10
    } = params;

    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.LIST, { questionId });
    
    const requestParams = {
      sortBy,
      pageNum,
      pageSize
    };
    
    return contentApiClient.get(url, { params: requestParams });
  },

  /**
   * 获取回答的补充回答列�?
   * @param {string|number} answerId - 回答ID
   * @param {Object} params - 查询参数
   * @param {string} params.sortBy - 排序方式（featured=精选，newest=最新），默认featured
   * @param {number} params.pageNum - 页码，默�?
   * @param {number} params.pageSize - 每页数量，默�?0
   * @returns {Promise<Object>}
   */
  getSupplementAnswers: (answerId, params = {}) => {
    const {
      sortBy = 'featured',
      pageNum = 1,
      pageSize = 10
    } = params;

    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.SUPPLEMENT_LIST, { answerId });
    
    const requestParams = {
      sortBy,
      pageNum,
      pageSize
    };
    
    return contentApiClient.get(url, { params: requestParams });
  },

  /**
   * 发布补充回答
   * @param {string|number} answerId - 回答ID
   * @param {Object} data - 补充回答数据
   * @param {string} data.content - 补充回答内容（必传）
   * @returns {Promise<Object>}
   */
  publishSupplementAnswer: async (answerId, data) => {
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }

    if (!data.content || !data.content.trim()) {
      return Promise.reject(new Error('content is required'));
    }

    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.SUPPLEMENT_PUBLISH, { answerId });
    
    console.log('📤 发布补充回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  请求数据:', JSON.stringify(data, null, 2));
    console.log('  URL:', url);
    
    try {
      const response = await contentApiClient.post(url, data);
      console.log('✅ 补充回答发布成功:', response);
      return response;
    } catch (error) {
      console.error('❌ 补充回答发布失败:', error);
      throw error;
    }
  },

  /**
   * 获取回答详情
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  getAnswerDetail: (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.DETAIL, { id: answerId });
    return apiClient.get(url);
  },

  /**
   * 发布回答
   * @param {string} questionId - 问题ID
   * @param {Object} answerCreateRequest - 回答数据
   * @param {string} answerCreateRequest.content - 回答内容（必传）
   * @param {number} answerCreateRequest.supplementId - 补充ID（非必传�?
   * @param {number} answerCreateRequest.invitedBy - 邀请人ID（非必传�?
   * @param {Array<string>} answerCreateRequest.imageUrls - 图片URL数组（非必传�?
   * @returns {Promise<Object>}
   */
  publishAnswer: (questionId, answerCreateRequest) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.PUBLISH, { questionId });
    return contentApiClient.post(url, answerCreateRequest);
  },

  /**
   * 创建回答
   * @param {Object} data - 回答数据
   * @param {string} data.questionId - 问题ID
   * @param {string} data.content - 回答内容
   * @param {Array} data.images - 图片列表
   * @returns {Promise<Object>}
   */
  createAnswer: (data) => {
    return apiClient.post(API_ENDPOINTS.ANSWER.CREATE, data);
  },

  /**
   * 更新回答
   * @param {string} answerId - 回答ID
   * @param {Object} data - 更新的数�?
   * @returns {Promise<Object>}
   */
  updateAnswer: (answerId, data) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.UPDATE, { id: answerId });
    return apiClient.put(url, data);
  },

  /**
   * 删除回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  deleteAnswer: (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.DELETE, { id: answerId });
    return apiClient.delete(url);
  },

  /**
   * 采纳回答
   * @param {string|number} questionId - 问题ID
   * @param {string|number} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  adoptAnswer: async (questionId, answerId) => {
    // 确保参数为数字类�?
    const numQuestionId = parseInt(questionId, 10);
    const numAnswerId = parseInt(answerId, 10);
    
    
    // 参数验证
    if (!Number.isInteger(numQuestionId) || numQuestionId <= 0) {
      throw new Error('无效的问题ID');
    }
    if (!Number.isInteger(numAnswerId) || numAnswerId <= 0) {
      throw new Error('无效的回答ID');
    }
    
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.ADOPT, { 
      questionId: numQuestionId, 
      answerId: numAnswerId 
    });
    
    
    try {
      // 尝试PUT请求
      return await contentApiClient.put(url);
    } catch (error) {
      
      // 如果PUT失败，尝试POST请求
      try {
        return await contentApiClient.post(url);
      } catch (postError) {
        throw postError;
      }
    }
  },

  /**
   * 收藏回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  collectAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.COLLECT, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 取消收藏回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  uncollectAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.UNCOLLECT, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 点赞回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  likeAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.LIKE, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 取消点赞回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  unlikeAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.UNLIKE, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 点踩回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  dislikeAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.DISLIKE, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 取消踩回�?
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  undislikeAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.UNDISLIKE, { id: answerId });
    
    
    if (!answerId) {
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 收藏补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  collectSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_COLLECT_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

  /**
   * 取消收藏补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  uncollectSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_UNCOLLECT_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

  /**
   * 点踩补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  dislikeSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_DISLIKE_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

  /**
   * 取消点踩补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  undislikeSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_UNDISLIKE_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

  /**
   * 点赞补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  likeSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_LIKE_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

  /**
   * 取消点赞补充回答
   * @param {string|number} supplementAnswerId - 补充回答ID
   * @returns {Promise<Object>}
   */
  unlikeSupplementAnswer: async (supplementAnswerId) => {
    if (!supplementAnswerId) {
      return Promise.reject(new Error('supplementAnswerId is required'));
    }

    const url = replaceUrlParams(ANSWER_SUPPLEMENT_UNLIKE_ENDPOINT, { id: supplementAnswerId });
    return contentApiClient.post(url);
  },

};

export default answerApi;
