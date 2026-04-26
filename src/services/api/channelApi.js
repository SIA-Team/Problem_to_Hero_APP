import contentApiClient from './contentApiClient';
import { API_ENDPOINTS } from '../../config/api';

const channelApi = {
  getChannelCatalog: () => contentApiClient.get(API_ENDPOINTS.CHANNEL.CATALOG),
  createCombinedChannel: payload =>
    contentApiClient.post(API_ENDPOINTS.CHANNEL.COMBINED_CREATE, payload),
  getMyCreatedCombinedChannels: () =>
    contentApiClient.get(API_ENDPOINTS.CHANNEL.COMBINED_MY_CREATED),
  getHomeChannels: () => contentApiClient.get(API_ENDPOINTS.CHANNEL.HOME),
  saveMyChannelOrder: payload =>
    contentApiClient.put(API_ENDPOINTS.CHANNEL.MY_ORDER_SAVE, payload),
  subscribeChannel: payload =>
    contentApiClient.post(API_ENDPOINTS.CHANNEL.SUBSCRIBE, payload),
  removeMySubscribedChannel: payload =>
    contentApiClient.post(API_ENDPOINTS.CHANNEL.MY_SUBSCRIBED_REMOVE, payload),
  getMySubscribedChannels: () =>
    contentApiClient.get(API_ENDPOINTS.CHANNEL.MY_SUBSCRIBED),
};

export default channelApi;
