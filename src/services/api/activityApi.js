import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../config/api';

const buildActivityCenterListParams = params => {
  const requestParams = {};

  const tabValue = typeof params?.tab === 'string' ? params.tab.trim() : '';
  requestParams.tab = tabValue || 'all';

  if (params?.type !== undefined && params?.type !== null && params.type !== '') {
    requestParams.type = Number(params.type);
  }

  if (typeof params?.keyword === 'string' && params.keyword.trim()) {
    requestParams.keyword = params.keyword.trim();
  }

  return requestParams;
};

const activityApi = {
  getActivityCenterList: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.CENTER_LIST, {
      params: buildActivityCenterListParams(params),
    }),
  getActivityList: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ACTIVITY.CENTER_LIST, {
      params: buildActivityCenterListParams(params),
    }),
};

export default activityApi;
