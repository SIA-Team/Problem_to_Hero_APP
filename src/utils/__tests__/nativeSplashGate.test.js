import { canHideNativeSplashScreen } from '../nativeSplashGate';

describe('nativeSplashGate', () => {
  it('keeps the native splash visible while fonts are still loading', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: false,
        isInitializing: false,
      })
    ).toBe(false);
  });

  it('keeps the native splash visible while app initialization is still running', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        isInitializing: true,
      })
    ).toBe(false);
  });

  it('keeps the native splash visible while the logged-in onboarding gate is still checking', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        isInitializing: false,
        isLoggedIn: true,
        isCheckingInterestOnboarding: true,
      })
    ).toBe(false);
  });

  it('allows the native splash to hide once the first real screen can render', () => {
    expect(
      canHideNativeSplashScreen({
        fontsLoaded: true,
        isInitializing: false,
        isLoggedIn: true,
        isCheckingInterestOnboarding: false,
      })
    ).toBe(true);
  });
});
