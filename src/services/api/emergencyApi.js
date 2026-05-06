import apiClient from './apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../../config/api';
import ENV, { getApiServerUrl } from '../../config/env';

const SUCCESS_CODES = new Set([0, 200]);
const EMERGENCY_FALLBACK_BASE_URL = 'http://123.144.57.221:30560';
const EMERGENCY_ENDPOINTS = {
  SETTINGS_PUBLIC: '/app/content/emergency-help/settings/public',
  QUOTA: '/app/content/emergency-help/quota',
  FEE_ESTIMATE: '/app/content/emergency-help/fee-estimate',
  PUBLISH: '/app/content/emergency-help/publish',
};

const isEmergencyMissingResourceMessage = (message) =>
  /No static resource/i.test(String(message || '').trim());

const isEmergencyRetryableError = (error) => {
  const message = String(
    error?.message ||
      error?.msg ||
      error?.data?.msg ||
      error?.data?.message ||
      ''
  ).trim();

  return /Network Error/i.test(message) || /网络连接失败/.test(message) || isEmergencyMissingResourceMessage(message);
};

const shouldRetryEmergencyResponse = (response) => {
  const code = Number(response?.code ?? response?.data?.code);
  const message = String(response?.msg ?? response?.data?.msg ?? '').trim();

  return !SUCCESS_CODES.has(code) && isEmergencyMissingResourceMessage(message);
};

const getEmergencyFallbackBaseUrls = (endpoint) => {
  const candidates = [
    EMERGENCY_FALLBACK_BASE_URL,
    getApiServerUrl(endpoint),
    ENV.server1Url,
    ENV.server2Url,
    ENV.apiUrl,
  ].filter(Boolean);

  return candidates.filter((baseUrl, index) => candidates.indexOf(baseUrl) === index);
};

const requestEmergencyWithFallback = async (endpoint, requestFactory) => {
  const baseUrls = getEmergencyFallbackBaseUrls(endpoint);
  let lastFailure = null;

  for (const baseURL of baseUrls) {
    try {
      const response = await requestFactory(baseURL);
      if (shouldRetryEmergencyResponse(response)) {
        lastFailure = new Error(response?.msg || 'Emergency endpoint not found on current server');
        continue;
      }

      return response;
    } catch (error) {
      if (isEmergencyRetryableError(error)) {
        lastFailure = error;
        continue;
      }

      throw error;
    }
  }

  if (lastFailure) {
    throw lastFailure;
  }

  throw new Error('Emergency request failed');
};

export const getEmergencyHelpQuota = () =>
  requestEmergencyWithFallback(
    EMERGENCY_ENDPOINTS.QUOTA,
    (baseURL) => apiClient.get(EMERGENCY_ENDPOINTS.QUOTA, { baseURL })
  );

export const getEmergencyHelpPublicSettings = () =>
  requestEmergencyWithFallback(
    EMERGENCY_ENDPOINTS.SETTINGS_PUBLIC,
    (baseURL) => apiClient.get(EMERGENCY_ENDPOINTS.SETTINGS_PUBLIC, { baseURL })
  );

export const getEmergencyHelpFeeEstimate = (params) =>
  requestEmergencyWithFallback(
    EMERGENCY_ENDPOINTS.FEE_ESTIMATE,
    (baseURL) => apiClient.get(EMERGENCY_ENDPOINTS.FEE_ESTIMATE, { params, baseURL })
  );

export const publishEmergencyHelp = (data) =>
  requestEmergencyWithFallback(
    EMERGENCY_ENDPOINTS.PUBLISH,
    (baseURL) => apiClient.post(EMERGENCY_ENDPOINTS.PUBLISH, data, { baseURL })
  );

const emergencyApi = {
  getList: (params) => apiClient.get(API_ENDPOINTS.EMERGENCY.HELP_LIST, { params }),
  getDetail: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_DETAIL, { id })),
  getComments: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_COMMENTS, { id })),
  createComment: (id, data) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_COMMENTS, { id }), data),
  getMaskedContact: (id) => apiClient.get(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_CONTACT, { id })),
  joinHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_JOIN, { id })),
  resolveHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_RESOLVE, { id })),
  leaveHelp: (id) => apiClient.post(replaceUrlParams(API_ENDPOINTS.EMERGENCY.HELP_LEAVE, { id })),
  getQuota: getEmergencyHelpQuota,
  getPublicSettings: getEmergencyHelpPublicSettings,
  getFeeEstimate: getEmergencyHelpFeeEstimate,
  publish: publishEmergencyHelp,
};

export default emergencyApi;
