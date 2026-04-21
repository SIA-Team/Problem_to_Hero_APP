export const canHideNativeSplashScreen = ({
  fontsLoaded = false,
  rootLayoutReady = false,
} = {}) => {
  return fontsLoaded && rootLayoutReady;
};
