import {
  APP_LAUNCH_EXPERIENCE,
  resolveLaunchExperience,
} from '../appLaunch';

describe('appLaunch', () => {
  it('treats users without completed bootstrap as new users', () => {
    expect(
      resolveLaunchExperience({
        hasCompletedBootstrap: false,
        hasAuthToken: false,
        hasDeviceFingerprint: false,
        hasManualLogoutMarker: false,
      })
    ).toBe(APP_LAUNCH_EXPERIENCE.NEW_USER);
  });

  it('treats users with completed bootstrap as returning users', () => {
    expect(
      resolveLaunchExperience({
        hasCompletedBootstrap: true,
      })
    ).toBe(APP_LAUNCH_EXPERIENCE.RETURNING_USER);
  });

  it('treats existing installs with prior session traces as returning users during migration', () => {
    expect(
      resolveLaunchExperience({
        hasCompletedBootstrap: false,
        hasDeviceFingerprint: true,
      })
    ).toBe(APP_LAUNCH_EXPERIENCE.RETURNING_USER);

    expect(
      resolveLaunchExperience({
        hasCompletedBootstrap: false,
        hasManualLogoutMarker: true,
      })
    ).toBe(APP_LAUNCH_EXPERIENCE.RETURNING_USER);
  });
});
