import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';
import { syncBlockedUsers } from '../blacklistState';
import { normalizeEntityId } from '../../utils/jsonLongId';

/**
 * 黑名单相关 API
 */
const blacklistApi = {
  /**
   * 获取黑名单列表
   * @returns {Promise<Array>} 黑名单用户列表
   */
  async getBlacklist() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USER.QUERY_BLACKLIST);

      if (response?.code !== 200) {
        throw new Error(response?.msg || '获取黑名单失败');
      }

      const blacklistItems = Array.isArray(response?.data) ? response.data : [];
      syncBlockedUsers(blacklistItems);
      return blacklistItems;
    } catch (error) {
      console.error('获取黑名单失败:', error);
      throw error;
    }
  },

  /**
   * 添加用户到黑名单
   * @param {number} blockedUserId - 被拉黑用户ID
   * @returns {Promise<Object>}
   */
  async addToBlacklist(blockedUserId) {
    try {
      const normalizedBlockedUserId = normalizeEntityId(blockedUserId);

      if (!normalizedBlockedUserId) {
        throw new Error('用户ID无效');
      }

      const response = await apiClient.post(API_ENDPOINTS.USER.ADD_BLACKLIST, null, {
        params: { blockedUserId: normalizedBlockedUserId },
      });
      return response;
    } catch (error) {
      console.error('添加黑名单失败:', error);
      throw error;
    }
  },

  /**
   * 从黑名单移除用户
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>}
   */
  async removeFromBlacklist(blockedUserId) {
    try {
      const normalizedBlockedUserId = normalizeEntityId(blockedUserId);

      if (!normalizedBlockedUserId) {
        throw new Error('用户ID无效');
      }

      const url = replaceUrlParams(API_ENDPOINTS.USER.REMOVE_BLACKLIST, {
        blockedUserId: normalizedBlockedUserId,
      });
      const response = await apiClient.post(url);
      return response;
    } catch (error) {
      console.error('移出黑名单失败:', error);
      throw error;
    }
  },
};

export default blacklistApi;
