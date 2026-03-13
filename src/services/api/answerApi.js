import apiClient from './apiClient';
import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

/**
 * 回答相关 API
 */
const answerApi = {
  /**
   * 获取问题的回答列表
   * @param {string} questionId - 问题ID
   * @param {Object} params - 查询参数
   * @param {string} params.sortBy - 排序方式（featured=精选，latest=最新），默认featured
   * @param {number} params.pageNum - 页码，默认1
   * @param {number} params.pageSize - 每页数量，默认10
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
    
    console.log(`📋 获取回答列表: questionId=${questionId}`, requestParams);
    
    return contentApiClient.get(url, { params: requestParams });
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
   * @param {number} answerCreateRequest.supplementId - 补充ID（非必传）
   * @param {number} answerCreateRequest.invitedBy - 邀请人ID（非必传）
   * @param {Array<string>} answerCreateRequest.imageUrls - 图片URL数组（非必传）
   * @returns {Promise<Object>}
   */
  publishAnswer: (questionId, answerCreateRequest) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.PUBLISH, { questionId });
    
    console.log('📤 发布回答 API 调用:');
    console.log('  原始端点:', API_ENDPOINTS.ANSWER.PUBLISH);
    console.log('  questionId:', questionId);
    console.log('  构建后的URL:', url);
    console.log('  请求方法: POST (使用 contentApiClient)');
    console.log('  请求体:', JSON.stringify(answerCreateRequest, null, 2));
    
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
   * @param {Object} data - 更新的数据
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
    // 确保参数为数字类型
    const numQuestionId = parseInt(questionId, 10);
    const numAnswerId = parseInt(answerId, 10);
    
    console.log('📤 采纳回答:');
    console.log('  原始参数:', { questionId, answerId });
    console.log('  转换后参数:', { questionId: numQuestionId, answerId: numAnswerId });
    
    // 参数验证
    if (!Number.isInteger(numQuestionId) || numQuestionId <= 0) {
      console.error('❌ 无效的问题ID:', questionId);
      throw new Error('无效的问题ID');
    }
    if (!Number.isInteger(numAnswerId) || numAnswerId <= 0) {
      console.error('❌ 无效的回答ID:', answerId);
      throw new Error('无效的回答ID');
    }
    
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.ADOPT, { 
      questionId: numQuestionId, 
      answerId: numAnswerId 
    });
    
    console.log('  原始端点:', API_ENDPOINTS.ANSWER.ADOPT);
    console.log('  构建后的URL:', url);
    console.log('  请求方法: PUT (使用 contentApiClient)');
    
    try {
      // 尝试PUT请求
      return await contentApiClient.put(url);
    } catch (error) {
      console.error('❌ PUT请求失败，尝试POST请求:', error.message);
      
      // 如果PUT失败，尝试POST请求
      try {
        return await contentApiClient.post(url);
      } catch (postError) {
        console.error('❌ POST请求也失败:', postError.message);
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
    
    console.log('📤 收藏回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
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
    
    console.log('📤 取消收藏回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
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
    
    console.log('📤 点赞回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
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
    
    console.log('📤 取消点赞回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
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
    
    console.log('📤 点踩回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

  /**
   * 取消踩回答
   * @param {string} answerId - 回答ID
   * @returns {Promise<Object>}
   */
  undislikeAnswer: async (answerId) => {
    const url = replaceUrlParams(API_ENDPOINTS.ANSWER.UNDISLIKE, { id: answerId });
    
    console.log('📤 取消踩回答 API调用:');
    console.log('  answerId:', answerId);
    console.log('  URL:', url);
    console.log('  请求方法: POST');
    
    if (!answerId) {
      console.error('❌ answerId 为空或未定义');
      return Promise.reject(new Error('answerId is required'));
    }
    
    return contentApiClient.post(url);
  },

};

export default answerApi;
