import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

/**
 * 加载指示器组件
 */
const LoadingSpinner = ({ 
  size = 'large', 
  color = '#ef4444', 
  text = '加载中...',
  fullScreen = false 
}) => {
  const containerStyle = fullScreen 
    ? [styles.container, styles.fullScreen] 
    : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {Boolean(text) ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default LoadingSpinner;
