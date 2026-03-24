const LONG_INTEGER_LENGTH = 16;

const isLongIdKey = key => {
  if (!key || typeof key !== 'string') {
    return false;
  }

  return key === 'id' ||
    key === 'uid' ||
    key.endsWith('Id') ||
    key.endsWith('ID') ||
    key.endsWith('_id');
};

const isLongIdArrayKey = key => {
  if (!key || typeof key !== 'string') {
    return false;
  }

  return key.endsWith('Ids') ||
    key.endsWith('IDs') ||
    key.endsWith('_ids');
};

const quoteLongIdScalars = json =>
  json.replace(/"([^"\\]+)"\s*:\s*(-?\d{16,})(?![\d.eE])/g, (match, key, value) =>
    isLongIdKey(key) ? `"${key}":"${value}"` : match
  );

const quoteLongIdArrays = json =>
  json.replace(/"([^"\\]+)"\s*:\s*\[([^\]]*)\]/g, (match, key, value) => {
    if (!isLongIdArrayKey(key)) {
      return match;
    }

    const normalizedValue = value.replace(/(^|,)\s*(-?\d{16,})(?=\s*(?:,|$))/g, '$1"$2"');
    return `"${key}":[${normalizedValue}]`;
  });

export const parseJsonPreservingLongIds = data => {
  if (typeof data !== 'string') {
    return data;
  }

  const trimmedData = data.trim();
  if (!trimmedData) {
    return data;
  }

  if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
    return data;
  }

  const normalizedJson = quoteLongIdArrays(quoteLongIdScalars(trimmedData));

  try {
    return JSON.parse(normalizedJson);
  } catch (error) {
    try {
      return JSON.parse(trimmedData);
    } catch (fallbackError) {
      return data;
    }
  }
};

const shouldLogRawResponse = url => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  return url.includes('/app/user/profile/public/') ||
    url.includes('/app/content/question/');
};

export const createTransformResponsePreservingLongIds = clientName => function transformResponse(data) {
  if (__DEV__ && typeof data === 'string' && shouldLogRawResponse(this?.url)) {
    console.log(`RAW RESPONSE [${clientName}] ${this?.url}`);
    console.log('==================== RAW START ====================');
    console.log(data);
    console.log('===================== RAW END =====================');
  }

  return parseJsonPreservingLongIds(data);
};

export const normalizeEntityId = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

export const isPotentiallyUnsafeLongId = value => {
  const normalizedValue = normalizeEntityId(value);
  return !!normalizedValue && /^-?\d+$/.test(normalizedValue) && normalizedValue.replace('-', '').length >= LONG_INTEGER_LENGTH;
};
