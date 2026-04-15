import React from 'react';
import { Keyboard, TouchableWithoutFeedback, View, StyleSheet } from 'react-native';

export default function KeyboardDismissView({
  children,
  onDismiss = Keyboard.dismiss,
}) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={onDismiss}>
      <View style={styles.container}>{children}</View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
