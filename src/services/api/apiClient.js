import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, getFullApiUrl } from '../../config/api';
import ENV, { ensureServerSelectionLoaded, getApiServerUrl } from '../../config/env';
import { showAppAlert } from '../../utils/appAlert';
import { createTransformResponsePreservingLongIds } from '../../utils/jsonLongId';
import { logApiRequest, logApiResponse } from '../../screens/ApiDebugScreen';

const shouldPrintVerboseApiLogs = () => (
  __DEV__ &&
  globalThis?.__ENABLE_VERBOSE_API_LOGS__ === true
);

let hasShownTokenExpiredAlert = false;

const handleTokenExpired = async () => {
  try {
    const userInfo = await AsyncStorage.getItem('userInfo');
    let username = '';

    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        username = user.username || '';
      } catch (parseError) {
        console.error('Failed to parse cached user info:', parseError);
      }
    }

    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);

    if (!hasShownTokenExpiredAlert) {
      hasShownTokenExpiredAlert = true;
      const message = username
        ? `登录已过期，请重新登录\n\n用户名：${username}\n默认密码：12345678`
        : '登录已过期，请重新登录';

      showAppAlert('登录已过期', message, [{ text: '知道了' }]);
      setTimeout(() => {
        hasShownTokenExpiredAlert = false;
      }, 3000);
    }

    console.log('Token expired, user logged out');
  } catch (error) {
    console.error('Failed to handle expired token:', error);
  }
};

const REAL_BASE_URL = ENV.apiUrl || API_CONFIG.BASE_URL;

const apiClient = axios.create({
  baseURL: REAL_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
  transformResponse: [createTransformResponsePreservingLongIds('user')],
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      await ensureServerSelectionLoaded();

      if (!config.baseURL || config.baseURL === REAL_BASE_URL) {
        const serverUrl = getApiServerUrl(config.url);
        config.baseURL = serverUrl;
        if (__DEV__) {
          console.log(`API route ${config.url} resolved to ${serverUrl}`);
        }
      } else if (__DEV__) {
        console.log(`API route ${config.url} using preset base URL ${config.baseURL}`);
      }

      const logId = logApiRequest(config);
      config.logId = logId;

      const token = await AsyncStorage.getItem('authToken');

      if (__DEV__) {
        console.log('\nAPI request auth check:');
        console.log('   Token exists:', !!token);
        if (token) {
          console.log('   Token length:', token.length);
          console.log('   Token value:', token);
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (__DEV__) {
          console.log('Authorization header attached');
        }
      } else if (__DEV__) {
        console.log('Authorization header skipped because token is missing');
      }

      if (__DEV__) {
        console.log('\nAPI Request:');
        console.log('   Method:', config.method?.toUpperCase());
        console.log('   URL:', config.url);
        console.log('   Base URL:', config.baseURL);
        console.log('   Full URL:', `${config.baseURL}${config.url}`);
        console.log('   Headers:', JSON.stringify(config.headers, null, 2));
        if (config.data) {
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
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  async (response) => {
    if (response.config.logId) {
      logApiResponse(response.config.logId, response);
    }

    if (shouldPrintVerboseApiLogs()) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    let responseData = response.data;
    if (responseData && responseData.data !== undefined && responseData.code !== undefined) {
      responseData = responseData;
    }

    if (responseData && responseData.code === 401) {
      console.log('Detected business-level 401, triggering logout');
      await handleTokenExpired();

      const authError = new Error('登录已过期');
      authError.response = {
        status: 401,
        data: responseData,
      };
      authError.config = response.config;
      throw authError;
    }

    return responseData;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?.logId) {
      logApiResponse(originalRequest.logId, null, error);
    }

    if (__DEV__) {
      console.log('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (refreshToken) {
          const refreshResponse = await axios.post(
            getFullApiUrl(API_ENDPOINTS.AUTH.REFRESH_TOKEN),
            { refreshToken }
          );

          const { token } = refreshResponse.data;
          await AsyncStorage.setItem('authToken', token);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }

        console.log('No refresh token found, clearing storage');
        await handleTokenExpired();
      } catch (refreshError) {
        console.log('Token refresh failed, clearing storage and showing user info');
        await handleTokenExpired();
      }
    }

    const errorMessage = getErrorMessage(error);
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

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
  }

  if (error.request) {
    return '网络连接失败，请检查网络';
  }

  return error.message || '请求失败';
};

export default apiClient;
