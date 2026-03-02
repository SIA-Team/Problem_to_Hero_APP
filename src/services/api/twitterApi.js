import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';

/**
 * Twitter 相关 API
 * 注意：这些接口需要后端实现，后端调用 Twitter API
 */
const twitterApi = {
  /**
   * 搜索 Twitter 用户
   * @param {string} query - 搜索关键词（用户名）
   * @param {number} limit - 返回结果数量
   * @returns {Promise<Object>}
   */
  searchUsers: async (query, limit = 20) => {
    console.log('\n📡 搜索 Twitter 用户...');
    console.log('   关键词:', query);
    console.log('   限制数量:', limit);
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.TWITTER.SEARCH_USERS, {
        params: { q: query, limit },
      });
      
      console.log('✅ 搜索成功，找到', response.data?.length || 0, '个用户');
      return response;
    } catch (error) {
      console.error('❌ 搜索 Twitter 用户失败:', error.message);
      throw error;
    }
  },

  /**
   * 邀请 Twitter 用户回答问题
   * @param {string} questionId - 问题 ID
   * @param {string} twitterUserId - Twitter 用户 ID
   * @param {string} twitterUsername - Twitter 用户名
   * @returns {Promise<Object>}
   */
  inviteUser: async (questionId, twitterUserId, twitterUsername) => {
    console.log('\n📡 邀请 Twitter 用户...');
    console.log('   问题 ID:', questionId);
    console.log('   Twitter 用户:', twitterUsername);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.TWITTER.INVITE_USER, {
        questionId,
        twitterUserId,
        twitterUsername,
      });
      
      console.log('✅ 邀请成功');
      return response;
    } catch (error) {
      console.error('❌ 邀请 Twitter 用户失败:', error.message);
      throw error;
    }
  },

  /**
   * 获取已邀请的 Twitter 用户列表
   * @param {string} questionId - 问题 ID
   * @returns {Promise<Object>}
   */
  getInvitedUsers: async (questionId) => {
    console.log('\n📡 获取已邀请的 Twitter 用户...');
    console.log('   问题 ID:', questionId);
    
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.TWITTER.INVITED_USERS}/${questionId}`
      );
      
      console.log('✅ 获取成功，共', response.data?.length || 0, '个用户');
      return response;
    } catch (error) {
      console.error('❌ 获取已邀请用户失败:', error.message);
      throw error;
    }
  },
};

export default twitterApi;
