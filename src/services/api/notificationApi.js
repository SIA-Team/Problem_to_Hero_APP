import apiClient from './apiClient';
import { buildApiPath, replaceUrlParams, SERVICES } from '../../config/api';
import { serializeJsonPreservingLongIdNumbers } from '../../utils/jsonLongId';

const NOTIFICATION_BASE_PATH = buildApiPath(SERVICES.USER, '/app/user/notification');
const PRIVATE_MESSAGE_BASE_PATH = buildApiPath(SERVICES.USER, '/app/user/private-message');

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const serializePrivateMessageBody = (data) =>
  serializeJsonPreservingLongIdNumbers(data, ['peerUserId', 'conversationId']);

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

  sendPrivateMessage: (data) => {
    const serializedRequestBody = serializePrivateMessageBody(data);

    console.log('\n========================================');
    console.log('[API Request] /app/user/private-message/send');
    console.log('Request data:', serializedRequestBody);
    console.log('========================================\n');

    return apiClient.post(`${PRIVATE_MESSAGE_BASE_PATH}/send`, serializedRequestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      transformRequest: requestData => requestData,
    }).then(response => {
      console.log('\n========================================');
      console.log('[API Response] /app/user/private-message/send');
      console.log('Response data:', JSON.stringify(response, null, 2));
      console.log('========================================\n');
      return response;
    }).catch(error => {
      console.log('\n========================================');
      console.log('[API Error] /app/user/private-message/send');
      console.log('Error:', error);
      console.log('========================================\n');
      throw error;
    });
  },

  getPrivateUnreadBrief: (params = {}) => {
    console.log('\n========================================');
    console.log('馃數 [API Request] /app/user/private-message/unread-brief');
    console.log('馃摛 Request params:', JSON.stringify(params, null, 2));
    console.log('========================================\n');
    return apiClient.get(`${PRIVATE_MESSAGE_BASE_PATH}/unread-brief`, {
      params: cleanParams(params),
    }).then(response => {
      console.log('\n========================================');
      console.log('馃摜 [API Response] /app/user/private-message/unread-brief');
      console.log('鉁?Response data:', JSON.stringify(response, null, 2));
      console.log('========================================\n');
      return response;
    }).catch(error => {
      console.log('\n========================================');
      console.log('鉂?[API Error] /app/user/private-message/unread-brief');
      console.log('Error:', error);
      console.log('========================================\n');
      throw error;
    });
  },

  getConversationMessages: (params = {}) => {
    console.log('\n========================================');
    console.log('馃數 [API Request] /app/user/private-message/messages');
    console.log('馃摛 Request params:', JSON.stringify(params, null, 2));
    console.log('========================================\n');
    return apiClient.get(`${PRIVATE_MESSAGE_BASE_PATH}/messages`, {
      params: cleanParams(params),
    }).then(response => {
      console.log('\n========================================');
      console.log('馃摜 [API Response] /app/user/private-message/messages');
      console.log('鉁?Response data:', JSON.stringify(response, null, 2));
      console.log('========================================\n');
      return response;
    }).catch(error => {
      console.log('\n========================================');
      console.log('鉂?[API Error] /app/user/private-message/messages');
      console.log('Error:', error);
      console.log('========================================\n');
      throw error;
    });
  },

  markConversationRead: (conversationId) => {
    console.log('\n========================================');
    console.log('馃數 [API Request] /app/user/private-message/conversation/{conversationId}/read');
    console.log('馃摛 Request conversationId:', conversationId);
    console.log('========================================\n');
    return apiClient.post(
      replaceUrlParams(`${PRIVATE_MESSAGE_BASE_PATH}/conversation/:conversationId/read`, {
        conversationId,
      })
    ).then(response => {
      console.log('\n========================================');
      console.log('馃摜 [API Response] /app/user/private-message/conversation/{conversationId}/read');
      console.log('鉁?Response data:', JSON.stringify(response, null, 2));
      console.log('========================================\n');
      return response;
    }).catch(error => {
      console.log('\n========================================');
      console.log('鉂?[API Error] /app/user/private-message/conversation/{conversationId}/read');
      console.log('Error:', error);
      console.log('========================================\n');
      throw error;
    });
  },
  markConversationRead: (conversationId) => {
    const requestUrl = replaceUrlParams(`${PRIVATE_MESSAGE_BASE_PATH}/conversation/:conversationId/read`, {
      conversationId,
    });

    console.log('\n========================================');
    console.log('[API Request]', requestUrl);
    console.log('Request conversationId:', conversationId);
    console.log('========================================\n');

    return apiClient.post(requestUrl).then(response => {
      console.log('\n========================================');
      console.log('[API Response]', requestUrl);
      console.log('Response data:', JSON.stringify(response, null, 2));
      console.log('========================================\n');
      return response;
    }).catch(error => {
      console.log('\n========================================');
      console.log('[API Error]', requestUrl);
      console.log('Error:', error);
      console.log('========================================\n');
      throw error;
    });
  },
};

export default notificationApi;
