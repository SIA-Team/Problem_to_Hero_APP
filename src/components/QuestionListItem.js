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

import { scaleFont } from '../utils/responsive';
/**
 * 提问列表项组件
 */
export default function QuestionListItem({ item, onPress }) {
  const { t, i18n } = useTranslation();
  const rewardPoints = resolveRewardPointsFromItem(item);
  const rewardPointsValue = `${formatCompactRewardPoints(rewardPoints, { locale: i18n?.locale })}${isChineseLocale(i18n?.locale) ? '积分' : ' pts'}`;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>

      <View style={styles.titleRow}>
        {item.questionType === 'reward' && rewardPoints > 0 && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardCardIconWrap}>
              <Ionicons name="sparkles-outline" size={11} color="#b45309" />
            </View>
            <Text style={styles.rewardCardText} numberOfLines={1}>
              {t('home.reward')} {rewardPointsValue}
            </Text>
          </View>
        )}
        <Text style={styles.title}>
          {item.title}
          {item.solved && (
            <Text style={styles.solvedTagText}>
              {'  '}{t('components.questionListItem.solved')}{'  '}
            </Text>
          )}
        </Text>
      </View>
      
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(23),
    color: '#1f2937',
    fontWeight: '500',
  },
  rewardCard: {
    maxWidth: 124,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f4d27d',
    backgroundColor: '#fff8e2',
  },
  rewardCardIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rewardCardText: {
    fontSize: scaleFont(11),
    color: '#92400e',
    fontWeight: '700',
    lineHeight: scaleFont(15),
    includeFontPadding: false,
    flexShrink: 1,
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
