import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatTime } from '../utils/timeFormatter';

/**
 * 回答列表项组件
 */
export default function AnswerListItem({ item, onPress }) {
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
      
      <Text style={styles.questionTitle} numberOfLines={1}>
        {item.adopted && (
          <Text style={styles.adoptedTag}>
            <Text style={styles.adoptedTagText}>{t('components.answerListItem.adopted')}</Text>
          </Text>
        )}
        {' '}{item.questionTitle}
      </Text>
      
      <Text style={styles.content} numberOfLines={2}>
        {item.content}
      </Text>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{item.likesCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{item.commentsCount}</Text>
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
    fontSize: 12,
    color: '#9ca3af',
  },
  questionTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  adoptedTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adoptedTagText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1f2937',
    marginBottom: 8,
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
    fontSize: 12,
    color: '#9ca3af',
  },
});
