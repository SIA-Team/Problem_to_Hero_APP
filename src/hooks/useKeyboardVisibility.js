import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export default function useKeyboardVisibility(enabled = true) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setKeyboardVisible(false);
      return undefined;
    }

    const showEvents =
      Platform.OS === 'ios'
        ? ['keyboardWillShow', 'keyboardDidShow']
        : ['keyboardDidShow'];
    const hideEvents =
      Platform.OS === 'ios'
        ? ['keyboardWillHide', 'keyboardDidHide']
        : ['keyboardDidHide'];
    const subscriptions = [];

    showEvents.forEach(eventName => {
      subscriptions.push(Keyboard.addListener(eventName, () => setKeyboardVisible(true)));
    });
    hideEvents.forEach(eventName => {
      subscriptions.push(Keyboard.addListener(eventName, () => setKeyboardVisible(false)));
    });

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [enabled]);

  return keyboardVisible;
}
