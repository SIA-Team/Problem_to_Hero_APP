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

const dedupeHomeChannelItems = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const name = normalizeText(item?.name);

    if (!name || seen.has(name)) {
      return false;
    }

    seen.add(name);
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

const normalizeHomeChannelItem = (item) => {
  const name = normalizeHomeChannelName(item);

  if (!name) {
    return null;
  }

  if (typeof item === 'string') {
    return {
      name,
      raw: item,
    };
  }

  return {
    name,
    raw: item,
  };
};

export const normalizeHomeChannelItemsResponse = (response) => {
  const payload = response?.data ?? response;
  const list = extractHomeList(payload);

  return dedupeHomeChannelItems(list.map(normalizeHomeChannelItem).filter(Boolean));
};

export const normalizeHomeChannelsResponse = response => {
  return dedupeNames(normalizeHomeChannelItemsResponse(response).map((item) => item.name));
};

export const fetchHomeChannelItems = async () => {
  const response = await channelApi.getHomeChannels();

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '获取首页频道失败');
  }

  return normalizeHomeChannelItemsResponse(response);
};

export const fetchHomeChannels = async () => {
  const items = await fetchHomeChannelItems();
  return items.map((item) => item.name);
};

export default {
  fetchHomeChannelItems,
  fetchHomeChannels,
  normalizeHomeChannelItemsResponse,
  normalizeHomeChannelsResponse,
};
