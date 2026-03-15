import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * 通用空状态组件
 * 与问题详情页面的样式保持一致
 */
const EmptyState = ({ 
  icon = "chatbubble-outline", 
  title = "暂无数据", 
  description = "还没有相关内容",
  iconSize = 48,
  iconColor = "#d1d5db"
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default EmptyState;