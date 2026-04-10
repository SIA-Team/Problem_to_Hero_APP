import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_EXPERTISE_PREFERENCES_PREFIX = '@user_expertise_preferences_';

const toUserKey = (userId) => {
  if (userId === undefined || userId === null || userId === '') {
    return null;
  }

  return String(userId);
};

const getPreferencesKey = (userId) => `${USER_EXPERTISE_PREFERENCES_PREFIX}${userId}`;

const safeJsonParse = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse expertise preferences json:', error);
    return fallback;
  }
};

const normalizeLevel1 = (level1) =>
  Array.isArray(level1)
    ? level1
        .map((item) => ({
          id: Number(item?.id),
          name: item?.name || '',
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)
    : [];

const normalizeLevel2 = (level2) =>
  Array.isArray(level2)
    ? level2
        .map((item) => ({
          id: Number(item?.id),
          name: item?.name || '',
          parentId: Number(item?.parentId),
          parentName: item?.parentName || '',
        }))
        .filter(
          (item) =>
            Number.isFinite(item.id) &&
            item.id > 0 &&
            item.name &&
            Number.isFinite(item.parentId) &&
            item.parentId > 0
        )
    : [];

const normalizePayload = (payload = {}) => ({
  level1: normalizeLevel1(payload.level1),
  level2: normalizeLevel2(payload.level2),
});

export const saveUserExpertisePreferences = async (userId, payload) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) {
    return;
  }

  const normalizedPayload = normalizePayload(payload);

  const persistedPayload = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...normalizedPayload,
  };

  await AsyncStorage.setItem(
    getPreferencesKey(normalizedUserId),
    JSON.stringify(persistedPayload)
  );
};

export const getUserExpertisePreferences = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) {
    return null;
  }

  const raw = await AsyncStorage.getItem(getPreferencesKey(normalizedUserId));
  const parsed = safeJsonParse(raw, null);

  if (!parsed) {
    return null;
  }

  return normalizePayload(parsed);
};

const summarizeNames = (items = [], suffix = '') => {
  if (!items.length) {
    return '';
  }

  if (items.length <= 2) {
    return items.map((item) => item.name).join(' / ');
  }

  return `${items[0].name} / ${items[1].name} 等${items.length}${suffix}`;
};

export const buildExpertiseSummary = (payload) => {
  const normalized = normalizePayload(payload || {});

  if (normalized.level2.length > 0) {
    return summarizeNames(normalized.level2, '项');
  }

  if (normalized.level1.length > 0) {
    return summarizeNames(normalized.level1, '类');
  }

  return '未设置';
};
