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

    console.log('Token expired, user logged out');
  } catch (error) {
    console.error('Failed to process token expiration:', error);
  }
};

// 鐪熷疄鏈嶅姟鍣ㄧ殑 baseURL
const REAL_BASE_URL = ENV.apiUrl || API_CONFIG.BASE_URL;

// 鍒涘缓 axios 瀹炰緥
const apiClient = axios.create({
  baseURL: REAL_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
  transformResponse: [createTransformResponsePreservingLongIds('user')],
});

// 璇锋眰鎷︽埅鍣?
apiClient.interceptors.request.use(
  async (config) => {
    try {
      await ensureServerSelectionLoaded();
      // 璁板綍 API 璇锋眰鏃ュ織

      // 鍔ㄦ€佽缃?baseURL
      // 濡傛灉璇锋眰宸茬粡鎸囧畾浜?baseURL锛屽垯涓嶈鐩栵紙鐢ㄤ簬鏀寔澶氭湇鍔℃灦鏋勶級
      if (!config.baseURL || config.baseURL === REAL_BASE_URL) {
        // 浣跨敤澶氭湇鍔″櫒閰嶇疆鑾峰彇姝ｇ‘鐨勬湇鍔″櫒鍦板潃
        const serverUrl = getApiServerUrl(config.url);
        config.baseURL = serverUrl;
        if (shouldPrintVerboseApiLogs()) {
          console.log(`馃寪 鎺ュ彛 ${config.url} 浣跨敤鏈嶅姟鍣? ${serverUrl}`);
        }
      } else {
        // 浣跨敤璇锋眰涓寚瀹氱殑 baseURL
        if (shouldPrintVerboseApiLogs()) {
          console.log(`馃幆 鎺ュ彛 ${config.url} 浣跨敤鑷畾涔夋湇鍔″櫒: ${config.baseURL}`);
        }
      }

      // 浠庢湰鍦板瓨鍌ㄨ幏鍙?token
      const logId = logApiRequest(config);
      config.logId = logId;

      const token = await AsyncStorage.getItem('authToken');

      if (shouldPrintVerboseApiLogs()) {
        console.log('\n馃攳 璇锋眰鎷︽埅鍣?- 璇诲彇 token:');
        console.log('   Token 瀛樺湪:', !!token);
        if (token) {
          console.log('   Token 闀垮害:', token.length);
          console.log('   Token (瀹屾暣):', token);
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (shouldPrintVerboseApiLogs()) {
          console.log('已添加 Authorization 请求头');
        }
      } else {
        if (shouldPrintVerboseApiLogs()) {
          console.log('Token 不存在，未添加 Authorization 请求头');
        }
      }

      // 鎵撳嵃璇锋眰淇℃伅锛堝紑鍙戠幆澧冿級
      if (shouldPrintVerboseApiLogs()) {
        console.log('\n馃摛 API Request:');
        console.log('   Method:', config.method?.toUpperCase());
        console.log('   URL:', config.url);
        console.log('   Base URL:', config.baseURL);
        console.log('   Full URL:', config.baseURL + config.url);
        console.log('   Headers:', JSON.stringify(config.headers, null, 2));
        if (config.data) {
          // 妫€鏌ユ槸鍚︽槸 FormData
          if (config.data instanceof FormData) {
            console.log('   Data: [FormData]');
          } else {
            console.log('   Data:', JSON.stringify(config.data, null, 2));
          }
        }
        console.log('');
      }

      return config;
    } catch (error) {
      console.error('鉂?Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('鉂?Request error:', error);
    return Promise.reject(error);
  }
);

// 鍝嶅簲鎷︽埅鍣?
apiClient.interceptors.response.use(
  async (response) => {
    // 璁板綍 API 鍝嶅簲鏃ュ織
    if (response.config.logId) {
      logApiResponse(response.config.logId, response);
    }

    // 鎵撳嵃鍝嶅簲淇℃伅锛堝紑鍙戠幆澧冿級
    if (shouldPrintVerboseApiLogs()) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    // 澶勭悊宓屽鐨?data 缁撴瀯
    // 濡傛灉杩斿洖鐨勬槸 {data: {code: 200, data: {...}, msg: "..."}}
    // 鍒欐彁鍙栧唴灞傜殑 {code: 200, data: {...}, msg: "..."}
    let responseData = response.data;
    if (responseData && responseData.data !== undefined && responseData.code !== undefined) {
      responseData = responseData;
    }

    // 妫€鏌ヤ笟鍔″眰闈㈢殑401閿欒锛圚TTP鐘舵€佺爜200浣嗕笟鍔ode鏄?01锛?
    if (responseData && responseData.code === 401) {
      console.log('检测到业务层 401，触发登出');
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

    // 璁板綍 API 閿欒鏃ュ織
    if (originalRequest?.logId) {
      logApiResponse(originalRequest.logId, null, error);
    }

    // 鎵撳嵃閿欒淇℃伅
    if (shouldPrintVerboseApiLogs()) {
      console.log('鈿狅笍 API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
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
          return apiClient(originalRequest);
        } else {
          // 娌℃湁 refreshToken锛岀洿鎺ヨЕ鍙戠櫥鍑?
          console.log('鉂?No refresh token found, clearing storage');
          await handleTokenExpired();
        }
      } catch (refreshError) {
        // 鍒锋柊 token 澶辫触锛屾竻闄ゆ湰鍦板瓨鍌ㄥ苟瑙﹀彂鐧诲嚭
        console.log('鉂?Token refresh failed, clearing storage and showing user info');
        await handleTokenExpired();
      }
    }

    // 缁熶竴閿欒澶勭悊
    const errorMessage = getErrorMessage(error);
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// 鑾峰彇閿欒淇℃伅
const getErrorMessage = (error) => {
  if (error.response) {
    // 鏈嶅姟鍣ㄨ繑鍥為敊璇?
    const { data, status } = error.response;

    if (data?.message) {
      return data.message;
    }

    if (data?.msg) {
      return data.msg;
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
    // 璇锋眰宸插彂閫佷絾娌℃湁鏀跺埌鍝嶅簲
    return '网络连接失败，请检查网络';
  } else {
    // 鍏朵粬閿欒
    return error.message || '请求失败';
  }
};

export default apiClient;
