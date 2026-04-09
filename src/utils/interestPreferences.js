import AsyncStorage from '@react-native-async-storage/async-storage';

const INTEREST_ONBOARDING_PENDING_KEY = '@interest_onboarding_pending_user';
const INTEREST_ONBOARDING_COMPLETED_PREFIX = '@interest_onboarding_completed_';
const USER_INTEREST_PREFERENCES_PREFIX = '@user_interest_preferences_';

const toUserKey = (userId) => {
  if (userId === undefined || userId === null || userId === '') {
    return null;
  }
  return String(userId);
};

const getCompletedKey = (userId) => `${INTEREST_ONBOARDING_COMPLETED_PREFIX}${userId}`;
const getPreferencesKey = (userId) => `${USER_INTEREST_PREFERENCES_PREFIX}${userId}`;

const safeJsonParse = (value, fallback = null) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse interest preferences json:', error);
    return fallback;
  }
};

export const setInterestOnboardingPending = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return;

  await AsyncStorage.setItem(INTEREST_ONBOARDING_PENDING_KEY, normalizedUserId);
};

export const getInterestOnboardingPendingUser = async () => {
  return AsyncStorage.getItem(INTEREST_ONBOARDING_PENDING_KEY);
};

export const clearInterestOnboardingPendingIfMatch = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return;

  const pendingUserId = await getInterestOnboardingPendingUser();
  if (pendingUserId === normalizedUserId) {
    await AsyncStorage.removeItem(INTEREST_ONBOARDING_PENDING_KEY);
  }
};

export const saveUserInterestPreferences = async (userId, payload) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return;

  const persistedPayload = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...payload,
  };

  await AsyncStorage.setItem(
    getPreferencesKey(normalizedUserId),
    JSON.stringify(persistedPayload)
  );
};

export const getUserInterestPreferences = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return null;

  const raw = await AsyncStorage.getItem(getPreferencesKey(normalizedUserId));
  return safeJsonParse(raw);
};

export const markInterestOnboardingCompleted = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return;

  await AsyncStorage.setItem(
    getCompletedKey(normalizedUserId),
    JSON.stringify({
      completedAt: new Date().toISOString(),
      version: 1,
    })
  );

  await clearInterestOnboardingPendingIfMatch(normalizedUserId);
};

export const isInterestOnboardingCompleted = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return true;

  const completed = await AsyncStorage.getItem(getCompletedKey(normalizedUserId));
  return Boolean(completed);
};

export const shouldShowInterestOnboarding = async (userId) => {
  const normalizedUserId = toUserKey(userId);
  if (!normalizedUserId) return false;

  const completed = await isInterestOnboardingCompleted(normalizedUserId);
  if (completed) return false;

  const pendingUserId = await getInterestOnboardingPendingUser();
  return pendingUserId === normalizedUserId;
};