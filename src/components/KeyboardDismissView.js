import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function KeyboardDismissView({
  children,
  onDismiss,
}) {
  void onDismiss;
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
