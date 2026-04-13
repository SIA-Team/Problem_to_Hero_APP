import AsyncStorage from '@react-native-async-storage/async-storage';
import teamApi from '../services/api/teamApi';

const TEAM_JOIN_PENDING_STORAGE_KEY = 'teamJoinPendingOverrides';

const normalizePendingMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [teamId, pending]) => {
    if (pending) {
      accumulator[String(teamId)] = true;
    }
    return accumulator;
  }, {});
};

export const loadTeamJoinPendingOverrides = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(TEAM_JOIN_PENDING_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    return normalizePendingMap(JSON.parse(rawValue));
  } catch (storageError) {
    console.error('Failed to load team join pending overrides:', storageError);
    return {};
  }
};

export const saveTeamJoinPendingOverrides = async (pendingMap) => {
  const normalizedMap = normalizePendingMap(pendingMap);

  try {
    await AsyncStorage.setItem(
      TEAM_JOIN_PENDING_STORAGE_KEY,
      JSON.stringify(normalizedMap)
    );
  } catch (storageError) {
    console.error('Failed to save team join pending overrides:', storageError);
  }

  return normalizedMap;
};

export const markTeamJoinPendingOverride = async (teamId) => {
  const normalizedTeamId = String(teamId ?? '').trim();

  if (!normalizedTeamId) {
    return loadTeamJoinPendingOverrides();
  }

  const currentMap = await loadTeamJoinPendingOverrides();
  currentMap[normalizedTeamId] = true;
  return saveTeamJoinPendingOverrides(currentMap);
};

export const isTeamJoinPendingError = (error) => {
  const message = String(error?.message ?? '').trim();
  return message.includes('已在申请中') || message.includes('申请中');
};

export const executeTeamJoinApply = async ({ teamId, reason = '' }) => {
  const normalizedTeamId = Number(teamId);

  if (!Number.isFinite(normalizedTeamId) || normalizedTeamId <= 0) {
    const invalidTeamError = new Error('团队ID无效');
    invalidTeamError.code = 'INVALID_TEAM_ID';
    throw invalidTeamError;
  }

  const response = await teamApi.applyToTeam(normalizedTeamId, reason);
  const isSuccess = response?.code === 0 || response?.code === 200;

  if (!isSuccess) {
    const requestError = new Error(response?.msg || '申请加入团队失败');
    requestError.response = response;
    requestError.code = response?.code;
    throw requestError;
  }

  return response;
};
