import channelApi from './api/channelApi';

const SUBSCRIBED_LIST_KEYS = [
  'list',
  'rows',
  'items',
  'records',
  'channelList',
  'channels',
  'subscribedChannels',
  'myChannels',
];

const normalizeText = value => String(value ?? '').trim();

const pickFirstText = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

const extractSubscribedList = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of SUBSCRIBED_LIST_KEYS) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeSubscribedChannelName = item => {
  if (typeof item === 'string') {
    return normalizeText(item);
  }

  if (!item || typeof item !== 'object') {
    return '';
  }

  return pickFirstText(
    item.channelName,
    item.name,
    item.title,
    item.label,
    item.displayName,
    item.combinedChannelName,
    item.comboChannelName
  );
};

const normalizeSubscribedChannelTargetType = item =>
  pickFirstText(
    item?.targetType,
    item?.subscribeTargetType,
    item?.subscribedTargetType,
    item?.channelType,
    item?.type,
    item?.categoryType,
    item?.bindType
  );

const normalizeSubscribedChannelTargetKey = (item, fallbackName) =>
  pickFirstText(
    item?.targetKey,
    item?.subscribeTargetKey,
    item?.subscribedTargetKey,
    item?.channelKey,
    item?.channelId,
    item?.id,
    item?.categoryId,
    item?.bindId,
    fallbackName
  );

const dedupeSubscribedChannels = channels => {
  const seen = new Set();

  return channels.filter(channel => {
    const dedupeKey =
      `${normalizeText(channel?.targetType)}::${normalizeText(channel?.targetKey)}::${normalizeText(channel?.name)}`;

    if (!channel?.name || seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
};

const normalizeSubscribedChannelItem = item => {
  const name = normalizeSubscribedChannelName(item);

  if (!name) {
    return null;
  }

  if (typeof item === 'string') {
    return {
      name,
      targetType: '',
      targetKey: name,
      raw: item,
    };
  }

  return {
    name,
    targetType: normalizeSubscribedChannelTargetType(item),
    targetKey: normalizeSubscribedChannelTargetKey(item, name),
    raw: item,
  };
};

export const normalizeMySubscribedChannelItemsResponse = response => {
  const payload = response?.data ?? response;
  const list = extractSubscribedList(payload);

  return dedupeSubscribedChannels(list.map(normalizeSubscribedChannelItem).filter(Boolean));
};

export const normalizeMySubscribedChannelsResponse = response =>
  normalizeMySubscribedChannelItemsResponse(response).map(channel => channel.name);

export const fetchMySubscribedChannelItems = async () => {
  const response = await channelApi.getMySubscribedChannels();

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '获取我的频道失败');
  }

  return normalizeMySubscribedChannelItemsResponse(response);
};

export const fetchMySubscribedChannels = async () => {
  const channelItems = await fetchMySubscribedChannelItems();
  return channelItems.map(channel => channel.name);
};

export const buildRemoveMySubscribedChannelPayload = input => {
  const targetType = normalizeText(input?.targetType);
  const targetKey = normalizeText(input?.targetKey);

  return {
    targetType,
    targetKey,
  };
};

export const buildSubscribeChannelPayload = input => {
  const targetType = normalizeText(input?.targetType);
  const targetKey = normalizeText(input?.targetKey);

  return {
    targetType,
    targetKey,
  };
};

export const subscribeChannel = async input => {
  const payload = buildSubscribeChannelPayload(input);

  if (!payload.targetType || !payload.targetKey) {
    throw new Error('订阅频道缺少必要参数');
  }

  const response = await channelApi.subscribeChannel(payload);

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '订阅频道失败');
  }

  return response?.data ?? {};
};

export const buildSaveMyChannelOrderPayload = input => {
  const items = Array.isArray(input?.items) ? input.items : [];

  return {
    items: items
      .map((item, index) => {
        const targetType = normalizeText(item?.targetType);
        const targetKey = normalizeText(item?.targetKey);
        const sortOrder =
          Number.isInteger(item?.sortOrder) ? item.sortOrder : index;

        return {
          targetType,
          targetKey,
          sortOrder,
        };
      })
      .filter(item => item.targetType && item.targetKey),
  };
};

export const removeMySubscribedChannel = async input => {
  const payload = buildRemoveMySubscribedChannelPayload(input);

  if (!payload.targetType || !payload.targetKey) {
    throw new Error('移除频道缺少必要参数');
  }

  const response = await channelApi.removeMySubscribedChannel(payload);

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '移除频道失败');
  }

  return response?.data ?? {};
};

export const saveMySubscribedChannelOrder = async input => {
  const payload = buildSaveMyChannelOrderPayload(input);

  if (!payload.items.length) {
    throw new Error('频道排序缺少必要参数');
  }

  const response = await channelApi.saveMyChannelOrder(payload);

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '保存频道排序失败');
  }

  return response?.data ?? {};
};

export default {
  buildSaveMyChannelOrderPayload,
  buildSubscribeChannelPayload,
  buildRemoveMySubscribedChannelPayload,
  fetchMySubscribedChannelItems,
  fetchMySubscribedChannels,
  normalizeMySubscribedChannelItemsResponse,
  normalizeMySubscribedChannelsResponse,
  saveMySubscribedChannelOrder,
  subscribeChannel,
  removeMySubscribedChannel,
};
