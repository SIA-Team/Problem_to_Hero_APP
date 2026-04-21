export const APP_BOOTSTRAP_COMPLETED_STORAGE_KEY = '@app_bootstrap_completed';

export const APP_LAUNCH_EXPERIENCE = {
  NEW_USER: 'new-user',
  RETURNING_USER: 'returning-user',
};

export function resolveLaunchExperience({
  hasCompletedBootstrap = false,
  hasAuthToken = false,
  hasDeviceFingerprint = false,
  hasManualLogoutMarker = false,
} = {}) {
  const hasHistoricalSession =
    hasCompletedBootstrap || hasAuthToken || hasDeviceFingerprint || hasManualLogoutMarker;

  return hasHistoricalSession
    ? APP_LAUNCH_EXPERIENCE.RETURNING_USER
    : APP_LAUNCH_EXPERIENCE.NEW_USER;
}
