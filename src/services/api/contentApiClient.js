import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, getFullApiUrl } from '../../config/api';
import ENV, { ensureServerSelectionLoaded, getApiServerUrl } from '../../config/env';
import { showToast } from '../../utils/toast';
import { createTransformResponsePreservingLongIds } from '../../utils/jsonLongId';
import { logApiRequest, logApiResponse } from '../../screens/ApiDebugScreen';

const shouldPrintVerboseApiLogs = () => (
  __DEV__ &&
  globalThis?.__ENABLE_VERBOSE_API_LOGS__ === true
);

let hasShownTokenExpiredToast = false;

// Token expired handling
const handleTokenExpired = async () => {
  try {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);

    if (!hasShownTokenExpiredToast) {
      hasShownTokenExpiredToast = true;
      showToast('\u767b\u5f55\u72b6\u6001\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55', 'error');
      setTimeout(() => {
        hasShownTokenExpiredToast = false;
      }, 3000);
    }

    console.log('[Content API] Token expired, user logged out');
  } catch (error) {
    console.error('Failed to process content token expiration:', error);
  }
};

// 鍐呭鏈嶅姟鐨?baseURL
const CONTENT_BASE_URL = ENV.contentApiUrl || ENV.apiUrl;

const SKIP_AUTO_LOGOUT_URLS = [
  API_ENDPOINTS.EMERGENCY.QUOTA,
  API_ENDPOINTS.CHANNEL.CATALOG,
];

// 鍒涘缓鍐呭鏈嶅姟鐨?axios 瀹炰緥
const contentApiClient = axios.create({
  baseURL: CONTENT_BASE_URL,  // 浣跨敤鍐呭鏈嶅姟鐨刄RL
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
  transformResponse: [createTransformResponsePreservingLongIds('content')],
});

// 璇锋眰鎷︽埅鍣?
contentApiClient.interceptors.request.use(
  async (config) => {
    try {
      await ensureServerSelectionLoaded();
      // 鍔ㄦ€佽缃?baseURL
      // 浣跨敤澶氭湇鍔″櫒閰嶇疆鑾峰彇姝ｇ‘鐨勬湇鍔″櫒鍦板潃
      const serverUrl = getApiServerUrl(config.url);
      config.baseURL = serverUrl;
      if (shouldPrintVerboseApiLogs()) {
        console.log(`馃寪 [鍐呭鏈嶅姟] 鎺ュ彛 ${config.url} 浣跨敤鏈嶅姟鍣? ${serverUrl}`);
      }
      
      // 浠庢湰鍦板瓨鍌ㄨ幏鍙?token
      const logId = logApiRequest(config);
      config.logId = logId;

      const token = await AsyncStorage.getItem('authToken');
      
      if (__DEV__) {
        console.log('\n馃攳 [鍐呭鏈嶅姟] 璇锋眰鎷︽埅鍣?- 璇诲彇 token:');
        console.log('   Token 瀛樺湪:', !!token);
        if (token) {
          console.log('   Token 闀垮害:', token.length);
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (__DEV__) {
          console.log('[内容服务] 已添加 Authorization 请求头');
        }
      } else {
        if (__DEV__) {
          console.log('[内容服务] Token 不存在，未添加 Authorization 请求头');
        }
      }
      
      // 鎵撳嵃璇锋眰淇℃伅锛堝紑鍙戠幆澧冿級
      if (__DEV__) {
        console.log('\n馃摛 [鍐呭鏈嶅姟] API Request:');
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
          // 鐗瑰埆妫€鏌ュ彂甯冮棶棰樼殑鏁版嵁
          if (config.url?.includes('/question/publish') && config.data?.questionPublishRequest) {
            const qpr = config.data.questionPublishRequest;
            console.log('   馃攳 鍙戝竷闂鏁版嵁楠岃瘉:');
            console.log('     - title:', `"${qpr.title}" (闀垮害: ${qpr.title?.length || 0})`);
            console.log('     - categoryId:', qpr.categoryId);
            console.log('     - type:', qpr.type);
            console.log('     - description:', `"${qpr.description}" (闀垮害: ${qpr.description?.length || 0})`);
          }
        }
        console.log('');
      }
      
      return config;
    } catch (error) {
      console.error('鉂?[鍐呭鏈嶅姟] Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('鉂?[鍐呭鏈嶅姟] Request error:', error);
    return Promise.reject(error);
  }
);

// 鍝嶅簲鎷︽埅鍣?
contentApiClient.interceptors.response.use(
  async (response) => {
    if (response.config?.logId) {
      logApiResponse(response.config.logId, response);
    }
    // 鎵撳嵃鍝嶅簲淇℃伅锛堝紑鍙戠幆澧冿級
    if (__DEV__) {
      console.log('馃摜 [鍐呭鏈嶅姟] API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    
    // 澶勭悊宓屽鐨?data 缁撴瀯
    let responseData = response.data;
    if (responseData && responseData.data !== undefined && responseData.code !== undefined) {
      responseData = responseData;
    }
    
    // 妫€鏌ヤ笟鍔″眰闈㈢殑401閿欒锛圚TTP鐘舵€佺爜200浣嗕笟鍔ode鏄?01锛?
    if (responseData && responseData.code === 401) {
      const shouldSkipAutoLogout = SKIP_AUTO_LOGOUT_URLS.some(url => response.config?.url === url);
      if (shouldSkipAutoLogout) {
        if (__DEV__) {
          console.log(`[内容服务] 接口 ${response.config?.url} 返回 401，跳过自动登出`);
        }
        return responseData;
      }
      console.log('[内容服务] 检测到业务层 401，触发登出');
      await handleTokenExpired();
      
      // 鍒涘缓涓€涓?01閿欒骞舵姏鍑猴紝璁╅敊璇鐞嗛€昏緫鎺ョ
      const error = new Error('登录已过期');
      error.response = {
        status: 401,
        data: responseData
      };
      error.config = response.config;
      throw error;
    }
    
    return responseData;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.logId) {
      logApiResponse(originalRequest.logId, null, error);
    }
    
    // 鎵撳嵃閿欒淇℃伅
    if (__DEV__) {
      console.log('鈿狅笍 [鍐呭鏈嶅姟] API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      
      // 鐗瑰埆澶勭悊鍙戝竷闂鐨勯敊璇?
      if (error.config?.url?.includes('/question/publish')) {
        console.log('鈿狅笍 鍙戝竷闂澶辫触璇︽儏:');
        console.log('   鐘舵€佺爜:', error.response?.status);
        console.log('   閿欒鏁版嵁:', JSON.stringify(error.response?.data, null, 2));
        if (error.response?.data?.msg) {
          console.log('   鏈嶅姟鍣ㄩ敊璇秷鎭?', error.response.data.msg);
        }
      }
    }
    
    // 澶勭悊 401 鏈巿鏉冮敊璇?
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 灏濊瘯鍒锋柊 token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(
            getFullApiUrl(API_ENDPOINTS.AUTH.REFRESH_TOKEN),
            { refreshToken }
          );
          
          const { token } = response.data;
          await AsyncStorage.setItem('authToken', token);
          
          // 閲嶈瘯鍘熷璇锋眰
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return contentApiClient(originalRequest);
        } else {
          // 娌℃湁 refreshToken锛岀洿鎺ヨЕ鍙戠櫥鍑?
          console.log('鉂?[鍐呭鏈嶅姟] No refresh token found, clearing storage');
          await handleTokenExpired();
        }
      } catch (refreshError) {
        // 鍒锋柊 token 澶辫触锛屾竻闄ゆ湰鍦板瓨鍌ㄥ苟瑙﹀彂鐧诲嚭
        console.log('鉂?[鍐呭鏈嶅姟] Token refresh failed, clearing storage');
        await handleTokenExpired();
      }
    }
    
    // 缁熶竴閿欒澶勭悊
    const errorMessage = getErrorMessage(error);
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      response: error.response, // 淇濈暀鍘熷鍝嶅簲瀵硅薄
    });
  }
);

// 鑾峰彇閿欒淇℃伅
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
