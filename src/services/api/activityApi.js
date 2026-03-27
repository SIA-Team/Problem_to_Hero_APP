import apiClient from './apiClient';  // 活动接口不使用微服务前缀，使用 apiClient
import { API_ENDPOINTS } from '../../config/api';

const buildActivityListParams = params => {
  const requestParams = {};

  if (params?.type !== undefined && params?.type !== null && params.type !== '') {
    requestParams.type = Number(params.type);
  }

  if (params?.status !== undefined && params?.status !== null && params.status !== '') {
    requestParams.status = Number(params.status);
  }

  return requestParams;
};

const activityApi = {
  getActivityList: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.LIST, {
      params: buildActivityListParams(params),
    }),
};

export default activityApi;
