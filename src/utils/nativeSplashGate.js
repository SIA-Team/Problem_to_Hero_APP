export const canHideNativeSplashScreen = ({
  fontsLoaded = false,
  isInitializing = true,
  isLoggedIn = false,
  isCheckingInterestOnboarding = false,
} = {}) => {
  if (!fontsLoaded || isInitializing) {
    return false;
  }

  if (isLoggedIn && isCheckingInterestOnboarding) {
    return false;
  }

  return true;
};
