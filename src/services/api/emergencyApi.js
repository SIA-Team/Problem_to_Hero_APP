import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api';

const EMERGENCY_QUOTA_URL = 'http://8.146.230.62:8080/app/content/emergency-help/quota';
const EMERGENCY_PUBLISH_URL = 'http://8.146.230.62:8080/app/content/emergency-help/publish';

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
  getQuota: () => requestWithAuth({ method: 'get', url: EMERGENCY_QUOTA_URL }),
  publish: (data) => requestWithAuth({ method: 'post', url: EMERGENCY_PUBLISH_URL, data }),
};

export default emergencyApi;
