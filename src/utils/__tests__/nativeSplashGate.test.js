import { canHideNativeSplashScreen } from '../nativeSplashGate';

describe('nativeSplashGate', () => {
  it('keeps the native splash visible while fonts are still loading', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: false,
        rootLayoutReady: true,
      })
    ).toBe(false);
  });

  it('keeps the native splash visible until the root layout is mounted', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        rootLayoutReady: false,
      })
    ).toBe(false);
  });

  it('allows the watchdog to release the native splash when layout callbacks stall', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        rootLayoutReady: false,
        rootLayoutWatchdogPassed: true,
      })
    ).toBe(true);
  });

  it('allows the native splash to hide once the first real screen can render', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        rootLayoutReady: true,
      })
    ).toBe(true);
  });

  it('allows a hard startup fallback to force-hide the native splash', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: false,
        rootLayoutReady: false,
        rootLayoutWatchdogPassed: false,
        forceHideSplash: true,
      })
    ).toBe(true);
  });
});
