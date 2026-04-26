import channelApi from './api/channelApi';

const normalizeText = value => String(value ?? '').trim();

const toPositiveInteger = value => {
  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue < 0) {
    return 0;
  }

  return normalizedValue;
};

const pickFirstText = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

export const buildCombinedChannelCreatePayload = input => {
  const name = normalizeText(input?.name);
  const locationText = normalizeText(input?.locationText);
  const regionId = toPositiveInteger(input?.regionId);
  const parentCategoryId = toPositiveInteger(input?.parentCategoryId);
  const subCategoryId = toPositiveInteger(input?.subCategoryId);

  return {
    name,
    regionId,
    locationText,
    parentCategoryId,
    subCategoryId,
  };
};

export const normalizeCreatedCombinedChannel = response => {
  const payload = response?.data ?? response;

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const name = pickFirstText(
    payload.name,
    payload.channelName,
    payload.combinedChannelName,
    payload.comboChannelName,
    payload.title
  );

  return {
    id: normalizeText(payload.id ?? payload.channelId ?? payload.combinedChannelId ?? ''),
    name,
    raw: payload,
  };
};

export const createCombinedChannel = async input => {
  const payload = buildCombinedChannelCreatePayload(input);
  const response = await channelApi.createCombinedChannel(payload);

  if (!response || response.code !== 200) {
    throw new Error(response?.msg || '创建组合频道失败');
  }

  return {
    payload,
    createdChannel: normalizeCreatedCombinedChannel(response),
    raw: response?.data ?? response,
  };
};

export default {
  buildCombinedChannelCreatePayload,
  createCombinedChannel,
  normalizeCreatedCombinedChannel,
};
