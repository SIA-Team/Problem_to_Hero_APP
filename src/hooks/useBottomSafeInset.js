import { useMemo } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const getAndroidNavigationBarInsetFallback = () => {
  if (Platform.OS !== 'android') {
    return 0;
  }

  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const totalInsetDiff = Math.max(screenHeight - windowHeight, 0);
  const statusBarHeight = StatusBar.currentHeight || 0;

  if (totalInsetDiff <= statusBarHeight + 8) {
    return 0;
  }

  const navigationOnlyInset = Math.max(totalInsetDiff - statusBarHeight, 0);

  // Some Android devices report a window height that already excludes the status bar.
  // In that case, subtracting StatusBar.currentHeight makes the navigation inset too small.
  if (navigationOnlyInset < 24) {
    return totalInsetDiff;
  }

  return navigationOnlyInset;
};

export default function useBottomSafeInset(minimumInset = 12, options = {}) {
  const { maxAndroidInset = null } = options;
  const insets = useSafeAreaInsets();
  const androidNavigationInsetFallback = useMemo(
    () => getAndroidNavigationBarInsetFallback(),
    []
  );
  const initialBottomInset = initialWindowMetrics?.insets?.bottom ?? 0;
  const normalizedBottomInset =
    Platform.OS === 'android' && typeof maxAndroidInset === 'number'
      ? Math.min(insets.bottom, maxAndroidInset)
      : insets.bottom;

  return Math.max(
    normalizedBottomInset,
    initialBottomInset,
    androidNavigationInsetFallback,
    minimumInset
  );
}
