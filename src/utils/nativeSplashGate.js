export const canHideNativeSplashScreen = ({
  fontsLoaded = false,
  rootLayoutReady = false,
  rootLayoutWatchdogPassed = false,
  forceHideSplash = false,
} = {}) => {
  if (forceHideSplash) {
    return true;
  }

  return fontsLoaded && (rootLayoutReady || rootLayoutWatchdogPassed);
};
