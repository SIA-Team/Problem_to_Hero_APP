import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatTime } from '../utils/timeFormatter';

import { scaleFont } from '../utils/responsive';
/**
 * 提问列表项组件
 */
export default function QuestionListItem({ item, onPress }) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      
      <Text style={styles.title}>
        {item.questionType === 'reward' && (
          <Text style={styles.rewardTag}>
            <Text style={styles.rewardTagText}>${item.reward}</Text>
          </Text>
        )}
        {item.solved && (
          <Text style={styles.solvedTag}>
            <Text style={styles.solvedTagText}>{t('components.questionListItem.solved')}</Text>
          </Text>
        )}
        {' '}{item.title}
      </Text>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{item.viewsCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{item.commentsCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{item.likesCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    marginBottom: 8,
  },
  time: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  title: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    color: '#1f2937',
    marginBottom: 8,
  },
  rewardTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardTagText: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '600',
  },
  solvedTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  solvedTagText: {
    fontSize: scaleFont(12),
    color: '#10b981',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
});
