import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api';
import ENV, { shouldUseMock, getApiServerUrl } from '../../config/env';
import { showToast } from '../../utils/toast';

// 处理 token 过期的统一函数
const handleTokenExpired = async () => {
  return new Promise(async (resolve) => {
    try {
      // 获取用户信息用于显示
      const userInfo = await AsyncStorage.getItem('userInfo');
      let username = '';
      
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo);
          username = user.username || '';
        } catch (e) {
          console.error('解析用户信息失败:', e);
        }
      }
      
      // 清除认证信息
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
      
      // 显示登录过期提示，包含用户名信息
      const { showAppAlert } = require('../../utils/appAlert');
      
      const message = username 
        ? `登录已过期，请重新登录\n\n用户名：${username}\n默认密码：12345678`
        : '登录已过期，请重新登录';
      
      showAppAlert(
        '登录过期',
        message,
        [{ 
          text: '确定', 
          onPress: () => {
            resolve(); // 用户点击确定后才resolve
          }
        }]
      );
      
      console.log('🚪 [内容服务] Token expired, user logged out');
    } catch (error) {
      console.error('❌ 处理登录过期失败:', error);
      resolve(); // 出错时也要resolve，避免阻塞
    }
  });
};

// 内容服务的 baseURL
const CONTENT_BASE_URL = ENV.contentApiUrl || ENV.apiUrl;

// Mock 服务器的 baseURL
const MOCK_BASE_URL = 'https://m1.apifoxmock.com/m1/7857964-7606903-default';
const SKIP_AUTO_LOGOUT_URLS = ['/app/content/emergency-help/quota'];

// 创建内容服务的 axios 实例
const contentApiClient = axios.create({
  baseURL: CONTENT_BASE_URL,  // 使用内容服务的URL
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// 请求拦截器
contentApiClient.interceptors.request.use(
  async (config) => {
    try {
      // 判断当前接口是否使用 Mock
      const useMock = shouldUseMock(config.url);
      
      // 动态设置 baseURL
      if (useMock) {
        config.baseURL = MOCK_BASE_URL;
        if (__DEV__) {
          console.log(`🔧 [内容服务] 接口 ${config.url} 使用 Mock 服务器`);
        }
      } else {
        // 使用多服务器配置获取正确的服务器地址
        const serverUrl = getApiServerUrl(config.url);
        config.baseURL = serverUrl;
        if (__DEV__) {
          console.log(`🌐 [内容服务] 接口 ${config.url} 使用服务器: ${serverUrl}`);
        }
      }
      
      // 从本地存储获取 token
      const token = await AsyncStorage.getItem('authToken');
      
      if (__DEV__) {
        console.log('\n🔍 [内容服务] 请求拦截器 - 读取 token:');
        console.log('   Token 存在:', !!token);
        if (token) {
          console.log('   Token 长度:', token.length);
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (__DEV__) {
          console.log('✅ [内容服务] Authorization 头已添加');
        }
      } else {
        if (__DEV__) {
          console.log('⚠️  [内容服务] Token 不存在，未添加 Authorization 头');
        }
      }
      
      // 打印请求信息（开发环境）
      if (__DEV__) {
        console.log('\n📤 [内容服务] API Request:');
        console.log('   Method:', config.method?.toUpperCase());
        console.log('   URL:', config.url);
        console.log('   Base URL:', config.baseURL);
        console.log('   Full URL:', config.baseURL + config.url);
        console.log('   Headers:', JSON.stringify(config.headers, null, 2));
        if (config.params) {
          console.log('   Params:', JSON.stringify(config.params, null, 2));
        }
        if (config.data) {
          console.log('   Request Body:', JSON.stringify(config.data, null, 2));
          // 特别检查发布问题的数据
          if (config.url?.includes('/question/publish') && config.data?.questionPublishRequest) {
            const qpr = config.data.questionPublishRequest;
            console.log('   🔍 发布问题数据验证:');
            console.log('     - title:', `"${qpr.title}" (长度: ${qpr.title?.length || 0})`);
            console.log('     - categoryId:', qpr.categoryId);
            console.log('     - type:', qpr.type);
            console.log('     - description:', `"${qpr.description}" (长度: ${qpr.description?.length || 0})`);
          }
        }
        console.log('');
      }
      
      return config;
    } catch (error) {
      console.error('❌ [内容服务] Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('❌ [内容服务] Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
contentApiClient.interceptors.response.use(
  async (response) => {
    // 打印响应信息（开发环境）
    if (__DEV__) {
      console.log('📥 [内容服务] API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    
    // 处理嵌套的 data 结构
    let responseData = response.data;
    if (responseData && responseData.data !== undefined && responseData.code !== undefined) {
      responseData = responseData;
    }
    
    // 检查业务层面的401错误（HTTP状态码200但业务code是401）
    if (responseData && responseData.code === 401) {
      const shouldSkipAutoLogout = SKIP_AUTO_LOGOUT_URLS.some(url => response.config?.url === url);
      if (shouldSkipAutoLogout) {
        if (__DEV__) {
          console.log(`ℹ️ [内容服务] 接口 ${response.config?.url} 返回401，跳过自动登出`);
        }
        return responseData;
      }
      console.log('🚪 [内容服务] 检测到业务层面401错误，触发登出');
      await handleTokenExpired();
      
      // 创建一个401错误并抛出，让错误处理逻辑接管
      const error = new Error('登录已过期');
      error.response = {
        status: 401,
        data: responseData
      };
      error.config = response.config;
      throw error;
    }
    
    // 判断当前接口是否使用 Mock
    const useMock = shouldUseMock(response.config.url);
    
    // Mock 环境特殊处理：标准化响应格式
    if (useMock && responseData) {
      if (responseData.data !== undefined) {
        if (__DEV__) {
          console.log('🔧 [内容服务] Mock 环境：检测到 data 字段，标准化 code 为 200');
        }
        
        return {
          ...responseData,
          code: 200,
          _originalCode: responseData.code,
          _isMockResponse: true,
        };
      }
    }
    
    return responseData;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 打印错误信息
    if (__DEV__) {
      console.log('⚠️ [内容服务] API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      
      // 特别处理发布问题的错误
      if (error.config?.url?.includes('/question/publish')) {
        console.log('⚠️ 发布问题失败详情:');
        console.log('   状态码:', error.response?.status);
        console.log('   错误数据:', JSON.stringify(error.response?.data, null, 2));
        if (error.response?.data?.msg) {
          console.log('   服务器错误消息:', error.response.data.msg);
        }
      }
    }
    
    // 处理 401 未授权错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 尝试刷新 token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          
          const { token } = response.data;
          await AsyncStorage.setItem('authToken', token);
          
          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return contentApiClient(originalRequest);
        } else {
          // 没有 refreshToken，直接触发登出
          console.log('❌ [内容服务] No refresh token found, clearing storage');
          await handleTokenExpired();
        }
      } catch (refreshError) {
        // 刷新 token 失败，清除本地存储并触发登出
        console.log('❌ [内容服务] Token refresh failed, clearing storage');
        await handleTokenExpired();
      }
    }
    
    // 统一错误处理
    const errorMessage = getErrorMessage(error);
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      response: error.response, // 保留原始响应对象
    });
  }
);

// 获取错误信息
const getErrorMessage = (error) => {
  if (error.response) {
    const { data, status } = error.response;
    
    if (data?.message) {
      return data.message;
    }
    
    switch (status) {
      case 400:
        return '请求参数错误';
      case 401:
        return '未授权，请重新登录';
      case 403:
        return '没有权限访问';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器错误，请稍后重试';
      case 502:
        return '网关错误';
      case 503:
        return '服务暂时不可用';
      default:
        return `请求失败 (${status})`;
    }
  } else if (error.request) {
    return '网络连接失败，请检查网络';
  } else {
    return error.message || '请求失败';
  }
};

export default contentApiClient;
