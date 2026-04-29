import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';

const STATUS_META = {
  responding: {
    icon: 'time-outline',
    label: '响应中',
    containerStyle: 'statusBadgeResponding',
    textStyle: 'statusBadgeRespondingText',
    iconColor: '#ef4444',
  },
  completed: {
    icon: 'checkmark-circle',
    label: '已完成',
    containerStyle: 'statusBadgeCompleted',
    textStyle: 'statusBadgeCompletedText',
    iconColor: '#6b7280',
  },
  ignored: {
    icon: 'remove-circle',
    label: '已忽略',
    containerStyle: 'statusBadgeIgnored',
    textStyle: 'statusBadgeIgnoredText',
    iconColor: '#6b7280',
  },
};

export default function EmergencyReceivedCard({
  item,
  highlight = false,
  isResponded = false,
  statusType,
  statusText,
  footerMode,
  completedActionLabel = '已完成',
  isActionLoading = false,
  showViewDetailInPending,
  onPressLocation,
  onPressResponders,
  onPressViewDetail,
  onPressIgnore,
  onPressRespond,
  style,
}) {
  const { t } = useTranslation();
  const LocationWrapper = onPressLocation ? TouchableOpacity : View;
  const resolvedFooterMode = footerMode || (isResponded ? 'responded' : 'pending');
  const statusMeta = statusType ? STATUS_META[statusType] : null;
  const rightActionDisabled = resolvedFooterMode !== 'pending' || isActionLoading;
  const shouldShowDetailInPending = resolvedFooterMode === 'pending' && (showViewDetailInPending ?? !footerMode);

  return (
    <View style={[styles.card, highlight && styles.cardHigh, style]}>
      {highlight ? <View style={styles.indicator} /> : null}

      <View style={styles.header}>
        <Avatar uri={item.avatar} name={item.name} size={44} />
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {statusMeta ? (
              <View style={[styles.statusBadge, styles[statusMeta.containerStyle]]}>
                <Ionicons name={statusMeta.icon} size={13} color={statusMeta.iconColor} />
                <Text style={[styles.statusBadgeText, styles[statusMeta.textStyle]]}>
                  {statusText || statusMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      <View style={styles.info}>
        <LocationWrapper
          style={styles.infoItem}
          {...(onPressLocation ? { activeOpacity: 0.72, onPress: onPressLocation } : {})}
        >
          <Ionicons name="location" size={14} color="#ef4444" />
          <Text style={styles.location} numberOfLines={1}>{item.location}</Text>
        </LocationWrapper>
        <View style={styles.distance}>
          <Ionicons name="navigate" size={12} color="#f59e0b" />
          <Text style={styles.distanceText}>{item.distance}</Text>
        </View>
      </View>

      <View style={styles.rescuerInfo}>
        <Ionicons name="people-outline" size={16} color="#6b7280" />
        <Text style={styles.rescuerText}>
          {t('components.emergencyReceivedCard.rescuerCount', { count: item.rescuerCount })}
        </Text>
        <TouchableOpacity
          style={styles.responseCountInlineBtn}
          activeOpacity={onPressResponders ? 0.72 : 1}
          onPress={onPressResponders}
          disabled={!onPressResponders}
        >
          <Text style={styles.responseCountInlineText}>
            {t('components.emergencyReceivedCard.responseCount', { count: item.responseCount })}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {resolvedFooterMode === 'pending' ? (
          <>
            {shouldShowDetailInPending ? (
              <TouchableOpacity style={styles.viewDetailBtn} onPress={onPressViewDetail}>
                <Ionicons name="document-text-outline" size={14} color="#6b7280" />
                <Text style={styles.viewDetailBtnText}>{t('components.emergencyReceivedCard.viewDetail')}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.pendingActionRow}>
              <TouchableOpacity
                style={[styles.ignoreBtn, isActionLoading && styles.actionBtnDisabled]}
                onPress={onPressIgnore}
                disabled={isActionLoading}
              >
                <Text style={styles.ignoreBtnText}>{t('components.emergencyReceivedCard.ignore')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.respondBtn, isActionLoading && styles.actionBtnDisabled]}
                onPress={onPressRespond}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.respondBtnText}>{t('components.emergencyReceivedCard.respondNow')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.viewDetailBtn} onPress={onPressViewDetail}>
              <Ionicons name="document-text-outline" size={14} color="#6b7280" />
              <Text style={styles.viewDetailBtnText}>{t('components.emergencyReceivedCard.viewDetail')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.stateActionBtn,
                resolvedFooterMode === 'responded' && styles.stateActionBtnResponded,
                resolvedFooterMode === 'ignored' && styles.stateActionBtnIgnored,
                resolvedFooterMode === 'completed' && styles.stateActionBtnCompleted,
              ]}
              disabled={rightActionDisabled}
              onPress={resolvedFooterMode === 'pending' ? onPressRespond : undefined}
              activeOpacity={1}
            >
              {resolvedFooterMode === 'responded' ? (
                <>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={[styles.stateActionBtnText, styles.stateActionBtnTextResponded]}>我已响应</Text>
                </>
              ) : resolvedFooterMode === 'ignored' ? (
                <>
                  <Ionicons name="remove-circle" size={14} color="#6b7280" />
                  <Text style={[styles.stateActionBtnText, styles.stateActionBtnTextMuted]}>我已忽略</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={14} color="#6b7280" />
                  <Text style={[styles.stateActionBtnText, styles.stateActionBtnTextMuted]}>{completedActionLabel}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHigh: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
    borderWidth: 2,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ef4444',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
  },
  time: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2,
  },
  title: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 10,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  location: {
    fontSize: scaleFont(13),
    color: '#4b5563',
    flex: 1,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: scaleFont(12),
    color: '#d97706',
    fontWeight: '600',
  },
  rescuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  rescuerText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  responseCountInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  responseCountInlineText: {
    fontSize: scaleFont(12),
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pendingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  viewDetailBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  statusBadgeResponding: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  statusBadgeRespondingText: {
    color: '#ef4444',
  },
  statusBadgeCompleted: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  statusBadgeCompletedText: {
    color: '#6b7280',
  },
  statusBadgeIgnored: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  statusBadgeIgnoredText: {
    color: '#6b7280',
  },
  ignoreBtn: {
    minWidth: 88,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ignoreBtnText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '600',
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ef4444',
    minWidth: 108,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  respondBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.7,
  },
  stateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 104,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  stateActionBtnResponded: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    borderColor: '#bbf7d0',
  },
  stateActionBtnIgnored: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  stateActionBtnCompleted: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  stateActionBtnText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  stateActionBtnTextResponded: {
    color: '#16a34a',
  },
  stateActionBtnTextMuted: {
    color: '#6b7280',
  },
});
