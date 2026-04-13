import * as Updates from 'expo-updates';

const UPDATE_LOG_WINDOW_MS = 24 * 60 * 60 * 1000;
const OTA_ERROR_CODES = new Set([
  'UpdateAssetsNotAvailable',
  'UpdateFailedToLoad',
  'AssetsFailedToLoad',
  'JSRuntimeError',
  'InitializationError',
]);

export const getCurrentBundleFingerprint = () => {
  const runtimeVersion = Updates.runtimeVersion || 'unknown-runtime';
  const updateId =
    Updates.updateId || (Updates.isEmbeddedLaunch ? 'embedded' : 'no-update-id');

  return `${runtimeVersion}:${updateId}`;
};

export const getOtaLaunchInfo = () => ({
  updateId: Updates.updateId || null,
  channel: Updates.channel || null,
  runtimeVersion: Updates.runtimeVersion || null,
  createdAt: Updates.createdAt ? Updates.createdAt.toISOString() : null,
  isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  isEmergencyLaunch: Updates.isEmergencyLaunch,
  emergencyLaunchReason: Updates.emergencyLaunchReason || null,
  launchDuration: Updates.launchDuration ?? null,
  isEnabled: Updates.isEnabled,
});

export const loadRecentOtaErrors = async (
  maxAge = UPDATE_LOG_WINDOW_MS,
  limit = 5
) => {
  if (!Updates.isEnabled) {
    return [];
  }

  try {
    const entries = await Updates.readLogEntriesAsync(maxAge);

    return entries
      .filter(
        (entry) =>
          entry.level === 'error' ||
          entry.level === 'fatal' ||
          OTA_ERROR_CODES.has(entry.code)
      )
      .slice(-limit)
      .reverse();
  } catch (error) {
    console.error('Failed to read expo-updates logs:', error);
    return [];
  }
};

export const buildEmergencyLaunchMessage = (reason, recentErrors = []) => {
  const lines = ['检测到上一次热更新启动失败，应用已自动回退到内置稳定版本。'];

  if (reason) {
    lines.push(`失败原因：${reason}`);
  }

  if (recentErrors.length > 0) {
    lines.push(`最近日志：${recentErrors[0].message}`);
  }

  lines.push('请先发布兼容旧运行时的修复热更新，再重新构建新的安装包。');

  return lines.join('\n');
};
