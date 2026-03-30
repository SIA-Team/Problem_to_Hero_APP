import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { scaleFont } from '../utils/responsive';
const { width } = Dimensions.get('window');

/**
 * 今日头条风格的Toast提示组件
 */
const Toast = ({ visible, message, type = 'success', duration = 2000, onHide }) => {
  const [opacity] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-100));

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  }, [opacity, translateY, onHide]);

  useEffect(() => {
    if (visible) {
      console.log('🍞 Toast显示:', { message, type, duration });
      
      // 重置动画值
      opacity.setValue(0);
      translateY.setValue(-100);
      
      // 显示动画
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('🍞 Toast显示动画完成');
      });

      // 自动隐藏
      const timer = setTimeout(() => {
        console.log('🍞 Toast自动隐藏');
        hideToast();
      }, duration);

      return () => {
        console.log('🍞 Toast清理定时器');
        clearTimeout(timer);
      };
    } else {
      console.log('🍞 Toast隐藏');
    }
  }, [visible, duration, hideToast, opacity, translateY, message, type]);

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'info':
      case 'warning':
        return 'information-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
      case 'warning':
        return '#f59e0b';
      default:
        return '#22c55e';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Ionicons 
          name={getIconName()} 
          size={20} 
          color={getIconColor()} 
          style={styles.icon}
        />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: 60, // 状态栏高度 + 安全距离
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    maxWidth: width - 40,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: '#fff',
    fontSize: scaleFont(15),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
});

export default Toast;