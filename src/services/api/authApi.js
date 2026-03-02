import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldUseMock } from '../../config/env';
import LocalMockService from '../LocalMockService';

/**
 * 认证相关 API
 */
const authApi = {
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭证
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @returns {Promise<Object>} 用户信息和 token
   */
  login: async (credentials) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    
    // Mock 环境：使用本地数据保持一致性
    const useMock = shouldUseMock(API_ENDPOINTS.AUTH.LOGIN);
    const processedResponse = useMock 
      ? await LocalMockService.handleLoginResponse(credentials.username, response)
      : response;
    
    // 保存 token 和用户信息
    if (processedResponse.code === 200 && processedResponse.data) {
      if (processedResponse.data.token) {
        await AsyncStorage.setItem('authToken', processedResponse.data.token);
        console.log('✅ Token 已保存');
      }
      if (processedResponse.data.userBaseInfo) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(processedResponse.data.userBaseInfo));
        console.log('✅ 用户信息已保存:', processedResponse.data.userBaseInfo.username);
      }
    }
    
    return processedResponse;
  },

  /**
   * 用户注册
   * @param {Object} userData - 注册信息
   * @param {string} userData.phone - 手机号
   * @param {string} userData.password - 密码
   * @param {string} userData.verifyCode - 验证码
   * @returns {Promise<Object>} 用户信息和 token
   */
  register: async (userData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    
    // 保存 token 和用户信息
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
    }
    if (response.refreshToken) {
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
    }
    if (response.user) {
      await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));
    }
    
    return response;
  },

  /**
   * Token 自动登录
   * 使用已有的 Token 自动登录，Token 有效则刷新有效期并返回用户信息
   * @returns {Promise<Object>} 用户信息和新 token
   */
  tokenLogin: async () => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔐 Token 自动登录');
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
      // 获取本地保存的 token
      const savedToken = await AsyncStorage.getItem('authToken');
      
      if (!savedToken) {
        console.log('❌ 未找到本地 Token');
        console.log('═══════════════════════════════════════════════════════════════\n');
        return { code: 401, msg: '未找到 Token' };
      }
      
      console.log('✅ 找到本地 Token:', savedToken.substring(0, 30) + '...');
      console.log('📡 请求接口:', API_ENDPOINTS.AUTH.TOKEN_LOGIN);
      console.log('⏰ 请求时间:', new Date().toLocaleString('zh-CN'));
      console.log('───────────────────────────────────────────────────────────────');
      
      // 调用 token 登录接口（token 会自动在 apiClient 的请求拦截器中添加到 header）
      const response = await apiClient.post(API_ENDPOINTS.AUTH.TOKEN_LOGIN);
      
      // Mock 环境：使用本地数据保持一致性
      const useMock = shouldUseMock(API_ENDPOINTS.AUTH.TOKEN_LOGIN);
      const processedResponse = useMock 
        ? await LocalMockService.handleTokenLoginResponse(response)
        : response;
      
      console.log('\n📥 后端响应数据:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(JSON.stringify(processedResponse, null, 2));
      console.log('═══════════════════════════════════════════════════════════════');
      
      console.log('\n📊 响应数据解析:');
      console.log('   响应码 (code):', processedResponse.code);
      console.log('   响应消息 (msg):', processedResponse.msg);
      console.log('   是否成功:', processedResponse.code === 200 ? '✅ 是' : '❌ 否');
      
      if (processedResponse.code === 200 && processedResponse.data) {
        console.log('\n📦 data 字段内容:');
        console.log('   新 Token:', processedResponse.data.token ? `${processedResponse.data.token.substring(0, 30)}...` : '❌ 无');
        console.log('   Token 有效期 (expiresIn):', processedResponse.data.expiresIn, '小时');
        console.log('   用户基本信息 (userBaseInfo):', processedResponse.data.userBaseInfo ? '✅ 有' : '❌ 无');
        
        if (processedResponse.data.userBaseInfo) {
          console.log('\n👤 用户信息详情:');
          console.log('   用户ID:', processedResponse.data.userBaseInfo.userId);
          console.log('   用户名:', processedResponse.data.userBaseInfo.username);
          console.log('   昵称:', processedResponse.data.userBaseInfo.nickName);
          console.log('   头像:', processedResponse.data.userBaseInfo.avatar || '无');
        }
        
        // 保存新的 token 和用户信息
        if (processedResponse.data.token) {
          await AsyncStorage.setItem('authToken', processedResponse.data.token);
          console.log('\n💾 新 Token 已保存到 AsyncStorage');
        }
        
        if (processedResponse.data.userBaseInfo) {
          await AsyncStorage.setItem('userInfo', JSON.stringify(processedResponse.data.userBaseInfo));
          console.log('💾 用户信息已更新到 AsyncStorage');
        }
        
        console.log('\n✅ Token 自动登录成功');
      } else {
        console.log('\n❌ Token 自动登录失败:', processedResponse.msg);
      }
      
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      return processedResponse;
    } catch (error) {
      console.log('\n❌ Token 自动登录失败');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('错误类型:', error.constructor.name);
      console.log('错误消息:', error.message);
      
      if (error.response) {
        console.log('\n📥 错误响应数据:');
        console.log('   状态码:', error.response.status);
        console.log('   响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.log('═══════════════════════════════════════════════════════════════\n');
      throw error;
    }
  },

  /**
   * 设备指纹注册（自动注册/登录）
   * @param {string} fingerprint - 设备指纹
   * @returns {Promise<Object>} 用户信息和 token
   */
  registerByFingerprint: async (fingerprint) => {
    // 生产环境也保留关键日志，便于诊断问题
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📱 设备指纹注册/登录');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔑 设备指纹:', fingerprint);
    console.log('📡 请求接口:', API_ENDPOINTS.AUTH.REGISTER);
    console.log('📤 请求数据:', JSON.stringify({ fingerprint }, null, 2));
    console.log('⏰ 请求时间:', new Date().toLocaleString('zh-CN'));
    console.log('⚙️  环境:', __DEV__ ? '开发环境' : '生产环境');
    console.log('───────────────────────────────────────────────────────────────');
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
        fingerprint: fingerprint,
      });
      
      // Mock 环境：使用本地数据保持一致性
      const useMock = shouldUseMock(API_ENDPOINTS.AUTH.REGISTER);
      const processedResponse = useMock 
        ? await LocalMockService.handleRegisterResponse(response)
        : response;
      
      console.log('\n📥 后端响应数据:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(JSON.stringify(processedResponse, null, 2));
      console.log('═══════════════════════════════════════════════════════════════');
      
      console.log('\n📊 响应数据解析:');
      console.log('   响应码 (code):', processedResponse.code);
      console.log('   响应消息 (msg):', processedResponse.msg);
      console.log('   是否成功:', processedResponse.code === 200 ? '✅ 是' : '❌ 否');
      
      if (processedResponse.data) {
        console.log('\n📦 data 字段内容:');
        console.log('   Token:', processedResponse.data.token ? `${processedResponse.data.token.substring(0, 30)}...` : '❌ 无');
        console.log('   用户基本信息 (userBaseInfo):', processedResponse.data.userBaseInfo ? '✅ 有' : '❌ 无');
        
        if (processedResponse.data.userBaseInfo) {
          console.log('\n👤 用户信息详情:');
          console.log('   用户ID:', processedResponse.data.userBaseInfo.userId);
          console.log('   用户名:', processedResponse.data.userBaseInfo.username);
          console.log('   昵称:', processedResponse.data.userBaseInfo.nickName);
          console.log('   头像:', processedResponse.data.userBaseInfo.avatar || '无');
          console.log('   其他字段:', Object.keys(processedResponse.data.userBaseInfo).join(', '));
        }
      } else {
        console.log('\n⚠️ 警告: response.data 为空');
      }
      
      // 保存 token 和用户信息
      if (processedResponse.data && processedResponse.data.token) {
        await AsyncStorage.setItem('authToken', processedResponse.data.token);
        console.log('\n💾 Token 已保存到 AsyncStorage');
      } else {
        console.log('\n⚠️ 警告: 未找到 Token，无法保存');
      }
      
      if (processedResponse.data && processedResponse.data.userBaseInfo) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(processedResponse.data.userBaseInfo));
        console.log('💾 用户信息已保存到 AsyncStorage');
      } else {
        console.log('⚠️ 警告: 未找到用户信息，无法保存');
      }
      
      // 保存设备指纹，避免重复注册
      await AsyncStorage.setItem('deviceFingerprint', fingerprint);
      console.log('💾 设备指纹已保存到 AsyncStorage');
      
      console.log('\n✅ 设备指纹注册/登录流程完成');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      return processedResponse;
    } catch (error) {
      console.log('\n❌ 设备指纹注册/登录失败');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('错误类型:', error.constructor.name);
      console.log('错误消息:', error.message);
      
      if (error.response) {
        console.log('\n📥 错误响应数据:');
        console.log('   状态码:', error.response.status);
        console.log('   响应数据:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log('\n⚠️ 请求已发送但未收到响应');
        console.log('   可能原因: 网络问题、服务器未响应');
      } else {
        console.log('\n⚠️ 请求配置错误');
      }
      
      console.log('═══════════════════════════════════════════════════════════════\n');
      throw error;
    }
  },

  /**
   * 用户登出
   * @returns {Promise<Object>}
   */
  logout: async () => {
    console.log('\n🚪 开始退出登录...');
    
    try {
      // 调用退出登录 API
      console.log('📡 调用退出登录 API:', API_ENDPOINTS.AUTH.LOGOUT);
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      
      console.log('📥 退出登录响应:', JSON.stringify(response, null, 2));
      
      if (response.code === 200) {
        console.log('✅ 服务器退出登录成功');
      }
      
      return response;
    } catch (error) {
      console.error('❌ 退出登录 API 错误:', error);
      // 即使 API 失败，也继续清除本地数据
      return { code: 500, msg: '退出登录失败' };
    } finally {
      // 清除本地存储（保留 deviceFingerprint，避免重复注册）
      console.log('🗑️ 清除本地存储数据...');
      await AsyncStorage.multiRemove([
        'authToken', 
        'refreshToken', 
        'userInfo',
        'username',
        'lastRegisterTime',
        'userProfileCache',
        'userProfileCacheTime'
      ]);
      console.log('✅ 本地数据已清除（保留设备指纹）');
    }
  },

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @returns {Promise<Object>}
   */
  sendVerifyCode: async (phone) => {
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_CODE, { phone });
  },

  /**
   * 重置密码
   * @param {Object} data - 重置密码信息
   * @param {string} data.phone - 手机号
   * @param {string} data.verifyCode - 验证码
   * @param {string} data.newPassword - 新密码
   * @returns {Promise<Object>}
   */
  resetPassword: async (data) => {
    return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  },

  /**
   * 修改密码
   * @param {Object} data - 修改密码信息
   * @param {string} data.oldPassword - 旧密码
   * @param {string} data.newPassword - 新密码
   * @returns {Promise<Object>}
   */
  changePassword: async (data) => {
    return apiClient.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  /**
   * 刷新 token
   * @returns {Promise<Object>}
   */
  refreshToken: async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      refreshToken,
    });
    
    if (response.token) {
      await AsyncStorage.setItem('authToken', response.token);
    }
    
    return response;
  },

  /**
   * 获取当前用户信息（从本地存储）
   * @returns {Promise<Object|null>}
   */
  getCurrentUser: async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /**
   * 检查是否已登录
   * @returns {Promise<boolean>}
   */
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  },
};

export default authApi;
