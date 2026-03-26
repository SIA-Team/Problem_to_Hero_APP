import apiClient from './apiClient';
import { buildApiPath, replaceUrlParams, SERVICES } from '../../config/api';

const NOTIFICATION_BASE_PATH = buildApiPath(SERVICES.USER, '/app/user/notification');
const PRIVATE_MESSAGE_BASE_PATH = buildApiPath(SERVICES.USER, '/app/user/private-message');

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const notificationApi = {
  getNotificationSummary: (params = { includePrivateUnread: true }) =>
    apiClient.get(`${NOTIFICATION_BASE_PATH}/summary`, {
      params: cleanParams(params),
    }),

  getNotificationList: (params = {}) =>
    apiClient.get(`${NOTIFICATION_BASE_PATH}/list`, {
      params: cleanParams(params),
    }),

  markNotificationRead: (id) =>
    apiClient.post(
      replaceUrlParams(`${NOTIFICATION_BASE_PATH}/:id/read`, {
        id,
      })
    ),

  markAllNotificationsRead: (category) =>
    apiClient.post(`${NOTIFICATION_BASE_PATH}/readAll`, null, {
      params: cleanParams({ category }),
    }),

  sendPrivateMessage: (data) => apiClient.post(`${PRIVATE_MESSAGE_BASE_PATH}/send`, data),

  getPrivateUnreadBrief: (params = {}) =>
    apiClient.get(`${PRIVATE_MESSAGE_BASE_PATH}/unread-brief`, {
      params: cleanParams(params),
    }),

  getConversationMessages: (params = {}) =>
    apiClient.get(`${PRIVATE_MESSAGE_BASE_PATH}/messages`, {
      params: cleanParams(params),
    }),

  markConversationRead: (conversationId) =>
    apiClient.post(
      replaceUrlParams(`${PRIVATE_MESSAGE_BASE_PATH}/conversation/:conversationId/read`, {
        conversationId,
      })
    ),
};

export default notificationApi;
