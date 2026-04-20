import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';

const emergencyApi = {
  getList: (params) => apiClient.get(API_ENDPOINTS.EMERGENCY.HELP_LIST, { params }),
  getDetail: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_DETAIL, { id })),
  getComments: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_COMMENTS, { id })),
  createComment: (id, data) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_COMMENTS, { id }), data),
  getMaskedContact: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_CONTACT, { id })),
  joinHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_JOIN, { id })),
  resolveHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_RESOLVE, { id })),
  leaveHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_LEAVE, { id })),
  getQuota: () => apiClient.get(API_ENDPOINTS.EMERGENCY.QUOTA),
  getPublicSettings: () => apiClient.get(API_ENDPOINTS.EMERGENCY.SETTINGS_PUBLIC),
  getFeeEstimate: (params) => apiClient.get(API_ENDPOINTS.EMERGENCY.FEE_ESTIMATE, { params }),
  publish: (data) => apiClient.post(API_ENDPOINTS.EMERGENCY.PUBLISH, data),
};

export default emergencyApi;
