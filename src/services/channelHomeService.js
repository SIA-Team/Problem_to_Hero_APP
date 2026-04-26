import channelApi from './api/channelApi';

const HOME_LIST_KEYS = [
  'list',
  'rows',
  'items',
  'records',
  'channelList',
  'channels',
  'tabs',
  'homeChannels',
  'homeTabs',
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

const extractHomeList = payload => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of HOME_LIST_KEYS) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
};

const normalizeHomeChannelName = item => {
  if (typeof item === 'string') {
    return normalizeText(item);
  }

  if (!item || typeof item !== 'object') {
    return '';
  }

  return pickFirstText(
    item.channelName,
    item.tabName,
    item.name,
    item.title,
    item.label,
    item.displayName
  );
};

export const normalizeHomeChannelsResponse = response => {
  const payload = response?.data ?? response;
  const list = extractHomeList(payload);

  return dedupeNames(list.map(normalizeHomeChannelName));
};

export const fetchHomeChannels = async () => {
  const response = await channelApi.getHomeChannels();

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '获取首页频道失败');
  }

  return normalizeHomeChannelsResponse(response);
};

export default {
  fetchHomeChannels,
  normalizeHomeChannelsResponse,
};
