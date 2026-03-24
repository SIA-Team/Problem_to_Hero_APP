import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, API_ENDPOINTS, getFullApiUrl } from '../../config/api';

const requestWithAuth = async ({ method, url, data }) => {
  const token = await AsyncStorage.getItem('authToken');
  const headers = {
    ...API_CONFIG.HEADERS,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios({
      method,
      url,
      data,
      timeout: API_CONFIG.TIMEOUT,
      headers,
    });

    return response.data;
  } catch (error) {
    const responseData = error.response?.data;
    const wrappedError = new Error(responseData?.msg || error.message || 'Request failed');
    wrappedError.status = error.response?.status;
    wrappedError.data = responseData;
    throw wrappedError;
  }
};

const emergencyApi = {
  getQuota: () => requestWithAuth({ method: 'get', url: getFullApiUrl(API_ENDPOINTS.EMERGENCY.QUOTA) }),
  publish: (data) => requestWithAuth({ method: 'post', url: getFullApiUrl(API_ENDPOINTS.EMERGENCY.PUBLISH), data }),
};

export default emergencyApi;
