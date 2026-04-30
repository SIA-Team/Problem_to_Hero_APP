import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVITY_JOIN_OVERRIDE_STORAGE_KEY = 'activityJoinOverrides';

const normalizeJoinedOverrideMap = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [activityId, joined]) => {
    if (joined) {
      accumulator[String(activityId)] = true;
    }

    return accumulator;
  }, {});
};

export const loadActivityJoinOverrides = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(ACTIVITY_JOIN_OVERRIDE_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    return normalizeJoinedOverrideMap(JSON.parse(rawValue));
  } catch (storageError) {
    console.error('Failed to load activity join overrides:', storageError);
    return {};
  }
};

export const saveActivityJoinOverrides = async joinedMap => {
  const normalizedMap = normalizeJoinedOverrideMap(joinedMap);

  try {
    await AsyncStorage.setItem(
      ACTIVITY_JOIN_OVERRIDE_STORAGE_KEY,
      JSON.stringify(normalizedMap)
    );
  } catch (storageError) {
    console.error('Failed to save activity join overrides:', storageError);
  }

  return normalizedMap;
};

export const markActivityJoinedOverride = async activityId => {
  const normalizedActivityId = String(activityId ?? '').trim();

  if (!normalizedActivityId) {
    return loadActivityJoinOverrides();
  }

  const currentMap = await loadActivityJoinOverrides();
  currentMap[normalizedActivityId] = true;
  return saveActivityJoinOverrides(currentMap);
};

export const removeActivityJoinedOverride = async activityId => {
  const normalizedActivityId = String(activityId ?? '').trim();

  if (!normalizedActivityId) {
    return loadActivityJoinOverrides();
  }

  const currentMap = await loadActivityJoinOverrides();
  delete currentMap[normalizedActivityId];
  return saveActivityJoinOverrides(currentMap);
};

export const applyActivityJoinOverride = (activity, joinedOverrideMap = {}) => {
  if (!activity?.id) {
    return activity;
  }

  if (!joinedOverrideMap[String(activity.id)]) {
    return activity;
  }

  return {
    ...activity,
    joined: true,
    isJoined: true,
    joinStatus: activity?.joinStatus ?? 1,
  };
};

export const applyActivityJoinOverrides = (activities, joinedOverrideMap = {}) =>
  Array.isArray(activities)
    ? activities.map(activity => applyActivityJoinOverride(activity, joinedOverrideMap))
    : [];
