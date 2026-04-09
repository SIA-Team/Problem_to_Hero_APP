import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export default function useKeyboardBottomOffset({
  enabled = true,
  bottomInset = 0,
  extraOffset = 12,
} = {}) {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      setKeyboardOffset(0);
      return undefined;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      const keyboardHeight = event?.endCoordinates?.height || 0;
      setKeyboardOffset(Math.max(keyboardHeight - bottomInset + extraOffset, 0));
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomInset, enabled, extraOffset]);

  return Platform.OS === 'android' ? keyboardOffset : 0;
}
