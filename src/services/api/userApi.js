import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';
import { normalizeEntityId, serializeJsonPreservingLongIdNumbers } from '../../utils/jsonLongId';

const serializeFollowPayload = userId =>
  serializeJsonPreservingLongIdNumbers(
    {
      userId: normalizeEntityId(userId),
    },
    ['userId']
  );

const buildPaginationParams = ({ pageNum, pageSize } = {}) => {
  const params = {};

  if (Number.isFinite(Number(pageNum)) && Number(pageNum) > 0) {
    params.pageNum = Number(pageNum);
  }

  if (Number.isFinite(Number(pageSize)) && Number(pageSize) > 0) {
    params.pageSize = Number(pageSize);
  }

  return params;
};

/**
 * 用户相关 API
 */
const userApi = {
  /**
   * 获取用户资料
   * @param {string} userId - 用户ID（可选，不传则获取当前用户）
   * @returns {Promise<Object>}
   */
  getProfile: async (userId) => {
    console.log('\n📡 调用 getProfile API...');
    console.log('   userId:', userId || '当前用户');
    
    let response;
    if (userId) {
      // 获取其他用户的资料
      console.log('   请求 URL:', `${API_ENDPOINTS.USER.PROFILE}/${userId}`);
      response = await apiClient.get(`${API_ENDPOINTS.USER.PROFILE}/${userId}`);
    } else {
      // 获取当前用户的详细信息
      console.log('   请求 URL:', API_ENDPOINTS.USER.PROFILE_ME);
      response = await apiClient.get(API_ENDPOINTS.USER.PROFILE_ME);
    }
    
    console.log('\n📥 /app/user/profile/me 接口返回数据:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(response, null, 2));
    console.log('─────────────────────────────────────────────────────────────────');
    
    if (response && response.data) {
      console.log('\n📊 用户数据字段详情:');
      console.log('   userId:', response.data.userId);
      console.log('   username:', response.data.username, '(用户名)');
      console.log('   usernameLastModified:', response.data.usernameLastModified, '(用户名上次修改时间)');
      console.log('   nickName:', response.data.nickName);
      console.log('   email:', response.data.email);
      console.log('   phonenumber:', response.data.phonenumber);
      console.log('   avatar:', response.data.avatar);
      console.log('   signature:', response.data.signature);
      console.log('   profession:', response.data.profession);
      console.log('   location:', response.data.location);
      console.log('   sex:', response.data.sex);
      console.log('   passwordChanged:', response.data.passwordChanged, '(是否修改过密码)');
    }
    
    return response;
  },

  /**
   * 更新用户资料
   * @param {Object} data - 用户资料
   * @returns {Promise<Object>}
   */
  getPublicProfile: (userId) => {
    const url = replaceUrlParams(API_ENDPOINTS.USER.PUBLIC_PROFILE, { userId });
    return apiClient.get(url);
  },

  updateProfile: (data) => {
    return apiClient.put(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },

  submitFeedback: async (data) => {
    return apiClient.post(API_ENDPOINTS.USER.SUBMIT_FEEDBACK, data);
  },

  /**
   * 修改用户名
   * @param {string} username - 新用户名
   * @returns {Promise<Object>}
   */
  updateUsername: async (username) => {
    console.log('\n📡 调用 updateUsername API...');
    console.log('   新用户名:', username);
    console.log('   请求 URL:', API_ENDPOINTS.USER.UPDATE_USERNAME);
    
    const response = await apiClient.put(API_ENDPOINTS.USER.UPDATE_USERNAME, { username });
    
    console.log('\n📥 /app/user/profile/username 接口返回数据:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(response, null, 2));
    console.log('─────────────────────────────────────────────────────────────────');
    
    return response;
  },

  /**
   * 上传头像
   * @param {string} imageUri - 图片的本地 URI
   * @returns {Promise<Object>}
   */
  uploadAvatar: async (imageUri) => {
    console.log('🔧 准备上传头像:');
    console.log('   imageUri:', imageUri);
    console.log('   环境:', __DEV__ ? '开发环境' : '生产环境');
    
    // 从 URI 中提取文件名和扩展名
    const uriParts = imageUri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // 判断文件类型
    let fileType = 'image/jpeg'; // 默认
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.png')) {
      fileType = 'image/png';
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      fileType = 'image/jpeg';
    } else if (lowerFileName.endsWith('.gif')) {
      fileType = 'image/gif';
    } else if (lowerFileName.endsWith('.bmp')) {
      fileType = 'image/bmp';
    }
    
    console.log('📦 文件信息:');
    console.log('   文件名:', fileName);
    console.log('   文件类型:', fileType);
    
    // 创建 FormData
    const formData = new FormData();
    
    // React Native FormData 格式
    const file = {
      uri: imageUri,
      type: fileType,
      name: fileName || 'avatar.jpg',
    };
    
    formData.append('avatarfile', file);
    
    console.log('✅ FormData 已创建');
    
    try {
      console.log('📤 开始上传...');
      
      // 发送 multipart/form-data 请求
      const response = await apiClient.post(API_ENDPOINTS.USER.AVATAR, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data, // 不转换数据
        timeout: 60000, // 60秒超时
      });
      
      console.log('✅ 头像上传成功');
      console.log('📥 响应码:', response.code);
      
      return response;
    } catch (error) {
      console.error('❌ 头像上传失败');
      console.error('   错误类型:', error.constructor.name);
      console.error('   错误消息:', error.message);
      
      // 详细错误日志（仅开发环境）
      if (__DEV__) {
        if (error.response) {
          console.error('   响应状态:', error.response.status);
          console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
        }
      }
      
      // 提供友好的错误信息
      if (error.message === 'Network Error' || error.message.includes('网络')) {
        throw new Error('网络连接失败，请检查网络后重试');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('上传超时，请检查网络或选择更小的图片');
      } else if (error.response) {
        const errorMsg = error.response.data?.msg || error.response.data?.message || '上传失败';
        throw new Error(errorMsg);
      } else {
        throw new Error('上传失败：' + error.message);
      }
    }
  },

  /**
   * 关注用户
   * @param {string} userId - 要关注的用户ID
   * @returns {Promise<Object>}
   */
  followUser: (userId) => {
    return apiClient.post(API_ENDPOINTS.USER.FOLLOW, serializeFollowPayload(userId), {
      headers: {
        'Content-Type': 'application/json',
      },
      transformRequest: requestData => requestData,
    });
  },

  /**
   * 取消关注用户
   * @param {string} userId - 要取消关注的用户ID
   * @returns {Promise<Object>}
   */
  unfollowUser: (userId) => {
    return apiClient.post(API_ENDPOINTS.USER.UNFOLLOW, serializeFollowPayload(userId), {
      headers: {
        'Content-Type': 'application/json',
      },
      transformRequest: requestData => requestData,
    });
  },

  getFollowStatus: (userId) => {
    return apiClient.get(API_ENDPOINTS.USER.FOLLOW_STATUS, {
      params: {
        userId: normalizeEntityId(userId),
      },
    });
  },

  getMyFollowing: ({ pageNum, pageSize } = {}) => {
    return apiClient.get(API_ENDPOINTS.USER.MY_FOLLOWING, {
      params: buildPaginationParams({ pageNum, pageSize }),
    });
  },

  getMyFollowers: ({ pageNum, pageSize } = {}) => {
    return apiClient.get(API_ENDPOINTS.USER.MY_FOLLOWERS, {
      params: buildPaginationParams({ pageNum, pageSize }),
    });
  },

  getUserFollowers: ({ userId, pageNum, pageSize } = {}) => {
    if (!userId) {
      return Promise.reject(new Error('userId is required'));
    }

    return apiClient.get(API_ENDPOINTS.USER.USER_FOLLOWERS, {
      params: {
        userId: normalizeEntityId(userId),
        ...buildPaginationParams({ pageNum, pageSize }),
      },
    });
  },

  /**
   * 获取指定用户的关注列表
   * @param {Object} params - 查询参数
   * @param {string} params.userId - 用户ID
   * @param {number} params.pageNum - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getUserFollowing: ({ userId, pageNum, pageSize } = {}) => {
    if (!userId) {
      return Promise.reject(new Error('userId is required'));
    }

    return apiClient.get(API_ENDPOINTS.USER.USER_FOLLOWING, {
      params: {
        userId: normalizeEntityId(userId),
        ...buildPaginationParams({ pageNum, pageSize }),
      },
    });
  },

  /**
   * 获取粉丝列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getFollowers: (params) => {
    if (params?.userId !== undefined && params?.userId !== null && params?.userId !== '') {
      return userApi.getUserFollowers(params);
    }

    return userApi.getMyFollowers(params);
  },

  /**
   * 获取关注列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<Object>}
   */
  getFollowing: (params) => {
    const normalizedParams = {
      ...params,
    };

    if (normalizedParams.userId !== undefined && normalizedParams.userId !== null && normalizedParams.userId !== '') {
      normalizedParams.userId = normalizeEntityId(normalizedParams.userId);
    }

    return apiClient.get(API_ENDPOINTS.USER.FOLLOWING, { params: normalizedParams });
  },

  getWalletBalance: () => {
    return apiClient.get(API_ENDPOINTS.WALLET.BALANCE);
  },

  /**
   * 获取消息通知设置
   * @returns {Promise<Object>} 返回消息通知设置数据
   */
  getNotificationSettings: async () => {
    console.log('\n📡 调用 getNotificationSettings API...');
    console.log('   请求 URL: /app/user/settings/queryNotification');
    
    const response = await apiClient.get('/app/user/settings/queryNotification');
    
    console.log('\n📥 /app/user/settings/queryNotification 接口返回数据:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(response, null, 2));
    console.log('─────────────────────────────────────────────────────────────────');
    
    return response;
  },

  /**
   * 更新消息通知设置
   * @param {Object} settings - 消息通知设置
   * @param {number} settings.pushEnabled - 推送通知总开关 0-关 1-开
   * @param {number} settings.notifyLikes - 赞和喜欢 0-关 1-开
   * @param {number} settings.notifyComments - 评论 0-关 1-开
   * @param {number} settings.notifyFollowers - 新增关注 0-关 1-开
   * @param {number} settings.notifySystem - 系统消息 0-关 1-开
   * @returns {Promise<Object>}
   */
  updateNotificationSettings: async (settings) => {
    console.log('\n📡 调用 updateNotificationSettings API...');
    console.log('   请求 URL: /app/user/settings/updateNotification');
    console.log('   请求参数:', JSON.stringify(settings, null, 2));
    
    const response = await apiClient.post('/app/user/settings/updateNotification', settings);
    
    console.log('\n📥 /app/user/settings/updateNotification 接口返回数据:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log(JSON.stringify(response, null, 2));
    console.log('─────────────────────────────────────────────────────────────────');
    
    return response;
  },
};

export default userApi;
