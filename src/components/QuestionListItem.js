import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatTime } from '../utils/timeFormatter';
import {
  formatCompactRewardPoints,
  isChineseLocale,
  resolveRewardPointsFromItem,
} from '../utils/rewardPointsDisplay';
import useRewardAwareQuestionItem from '../hooks/useRewardAwareQuestionItem';

import { scaleFont } from '../utils/responsive';
/**
 * 提问列表项组件
 */
export default function QuestionListItem({ item, onPress }) {
  const { t, i18n } = useTranslation();
  const displayItem = useRewardAwareQuestionItem(item);
  const rewardPoints = resolveRewardPointsFromItem(displayItem);
  const rewardPointsValue = `${formatCompactRewardPoints(rewardPoints, { locale: i18n?.locale })}${isChineseLocale(i18n?.locale) ? '积分' : ' pts'}`;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(displayItem)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(displayItem.createdAt)}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={3}>
          {displayItem.questionType === 'reward' && rewardPoints > 0 && (
            <Text style={styles.rewardInlineBadge}>
              <Ionicons name="sparkles-outline" size={11} color="#b45309" />
              {' '}{t('home.reward')} {rewardPointsValue}
            </Text>
          )}
          {displayItem.questionType === 'reward' && rewardPoints > 0 ? ' ' : ''}
          {displayItem.title}
          {displayItem.solved && (
            <Text style={styles.solvedTagText}>
              {'  '}{t('components.questionListItem.solved')}{'  '}
            </Text>
          )}
        </Text>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{displayItem.viewsCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{displayItem.commentsCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
          <Text style={styles.statText}>{displayItem.likesCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 24,
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
  titleRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(23),
    color: '#1f2937',
    fontWeight: '500',
  },
  rewardInlineBadge: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f4d27d',
    backgroundColor: '#fff8e2',
    fontSize: scaleFont(15),
    color: '#92400e',
    fontWeight: '700',
    lineHeight: scaleFont(23),
    includeFontPadding: false,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  solvedTagText: {
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    fontSize: scaleFont(11),
    color: '#15803d',
    fontWeight: '600',
    lineHeight: scaleFont(18),
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
