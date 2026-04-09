import React from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export default function KeyboardDismissView({
  children,
  onDismiss = Keyboard.dismiss,
}) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={onDismiss}>
      {children}
    </TouchableWithoutFeedback>
  );
}
