import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

export default function useKeyboardBottomOffset({
  enabled = true,
  bottomInset: _bottomInset = 0,
  extraOffset = 20,
} = {}) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      setKeyboardOffset(0);
      return undefined;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      const keyboardScreenY = event?.endCoordinates?.screenY;
      const windowHeight = Dimensions.get('window').height;
      const obscuredWindowHeight =
        typeof keyboardScreenY === 'number'
          ? Math.max(windowHeight - keyboardScreenY, 0)
          : 0;
      const resolvedKeyboardHeight = Math.max(keyboardHeight, obscuredWindowHeight);

      setKeyboardOffset(Math.max(resolvedKeyboardHeight + extraOffset, 0));
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [enabled, extraOffset]);

  return Platform.OS === 'android' ? keyboardOffset : 0;
}
