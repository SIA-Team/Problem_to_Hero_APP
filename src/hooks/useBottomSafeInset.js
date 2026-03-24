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
  const statusBarHeight = StatusBar.currentHeight || 0;

  return Math.max(screenHeight - windowHeight - statusBarHeight, 0);
};

export default function useBottomSafeInset(minimumInset = 12) {
  const insets = useSafeAreaInsets();
  const androidNavigationInsetFallback = useMemo(
    () => getAndroidNavigationBarInsetFallback(),
    []
  );
  const initialBottomInset = initialWindowMetrics?.insets?.bottom ?? 0;

  return Math.max(
    insets.bottom,
    initialBottomInset,
    androidNavigationInsetFallback,
    minimumInset
  );
}
