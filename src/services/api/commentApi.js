import contentApiClient from './contentApiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

/**
 * 评论相关 API
 */
const commentApi = {
  /**
   * 发布评论
   * @param {Object} data - 评论数据
   * @param {number} data.targetType - 目标类型：1=问题，2=回答，3=补充等
   * @param {number} data.targetId - 目标ID（问题ID、回答ID等）
   * @param {number} data.parentId - 父评论ID（0表示顶级评论）
   * @param {string} data.content - 评论内容
   * @returns {Promise<Object>}
   */
  createComment: (data) => {
    return contentApiClient.post(API_ENDPOINTS.COMMENT.CREATE, data);
  },

  /**
   * 获取评论列表
   * @param {Object} params - 查询参数
   * @param {number} params.targetType - 目标类型：1=问题，2=回答，3=补充等
   * @param {number} params.targetId - 目标ID（问题ID、回答ID等）
   * @param {number} params.parentId - 父评论ID（0表示顶级评论）
   * @param {string} params.sortBy - 排序方式：newest=最新，likes=点赞量
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getComments: (params) => {
    const {
      targetType,
      targetId,
      parentId = 0,
      sortBy = 'newest',
      pageNum = 1,
      pageSize = 10
    } = params;

    const requestParams = {
      targetType,
      targetId,
      parentId,
      sortBy,
      pageNum,
      pageSize
    };

    return contentApiClient.get(API_ENDPOINTS.COMMENT.LIST, { params: requestParams });
  },

  /**
   * 点赞评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  likeComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.LIKE, { id: commentId });
    return contentApiClient.post(url);
  },

  /**
   * 取消点赞评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  unlikeComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.UNLIKE, { id: commentId });
    return contentApiClient.post(url);
  },

  /**
   * 收藏评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  collectComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.COLLECT, { id: commentId });
    return contentApiClient.post(url);
  },

  /**
   * 取消收藏评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  uncollectComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.UNCOLLECT, { id: commentId });
    return contentApiClient.post(url);
  },

  /**
   * 点踩评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  dislikeComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.DISLIKE, { id: commentId });
    return contentApiClient.post(url);
  },

  /**
   * 取消点踩评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<Object>}
   */
  undislikeComment: (commentId) => {
    const url = replaceUrlParams(API_ENDPOINTS.COMMENT.UNDISLIKE, { id: commentId });
    return contentApiClient.post(url);
  },
};

export default commentApi;
