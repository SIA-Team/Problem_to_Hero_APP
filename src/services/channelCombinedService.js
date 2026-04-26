import channelApi from './api/channelApi';

const COMBINED_LIST_KEYS = [
  'list',
  'rows',
  'items',
  'records',
  'channelList',
  'channels',
  'myCreatedChannels',
  'combinedChannels',
];

const normalizeText = value => String(value ?? '').trim();

const asArray = value => (Array.isArray(value) ? value : []);

const pickFirstText = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

const dedupeNames = names => {
  const seen = new Set();

  return names.filter(name => {
    const normalizedName = normalizeText(name);
    if (!normalizedName || seen.has(normalizedName)) {
      return false;
    }

    seen.add(normalizedName);
    return true;
  });
};

const extractCombinedList = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of COMBINED_LIST_KEYS) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeCombinedChannelName = item => {
  if (typeof item === 'string') {
    return normalizeText(item);
  }

  if (!item || typeof item !== 'object') {
    return '';
  }

  return pickFirstText(
    item.combinedChannelName,
    item.comboChannelName,
    item.channelName,
    item.name,
    item.title,
    item.label,
    item.displayName
  );
};

export const normalizeMyCreatedCombinedChannelsResponse = response => {
  const payload = response?.data ?? response;
  const list = extractCombinedList(payload);

  return dedupeNames(list.map(normalizeCombinedChannelName));
};

export const fetchMyCreatedCombinedChannels = async () => {
  const response = await channelApi.getMyCreatedCombinedChannels();

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '获取我创建的组合频道失败');
  }

  return normalizeMyCreatedCombinedChannelsResponse(response);
};

export default {
  fetchMyCreatedCombinedChannels,
  normalizeMyCreatedCombinedChannelsResponse,
};
