import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { scaleFont } from '../utils/responsive';

export default function EmergencyReceivedCard({
  item,
  highlight = false,
  isResponded = false,
  onPressLocation,
  onPressResponders,
  onPressViewDetail,
  onPressIgnore,
  onPressRespond,
  style,
}) {
  const LocationWrapper = onPressLocation ? TouchableOpacity : View;

  return (
    <View style={[styles.card, highlight && styles.cardHigh, style]}>
      {highlight ? <View style={styles.indicator} /> : null}

      <View style={styles.header}>
        <Avatar uri={item.avatar} name={item.name} size={44} />
        <View style={styles.headerContent}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        {isResponded ? (
          <View style={styles.respondedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={styles.respondedBadgeText}>{'已响应'}</Text>
          </View>
        ) : null}
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

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.rescuerInfo}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.rescuerText}>{`需 ${item.rescuerCount} 人`}</Text>
            <TouchableOpacity
              style={styles.responseCountBtn}
              activeOpacity={0.72}
              onPress={onPressResponders}
            >
              <Text style={styles.responseCountText}>{`${item.responseCount} 人已响应`}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.viewDetailBtn} onPress={onPressViewDetail}>
            <Ionicons name="document-text-outline" size={14} color="#6b7280" />
            <Text style={styles.viewDetailBtnText}>{'查看详情'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          {isResponded ? (
            <View style={styles.respondedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.respondedBadgeText}>{'已响应'}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.ignoreBtn} onPress={onPressIgnore}>
                <Text style={styles.ignoreBtnText}>{'忽略'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.respondBtn} onPress={onPressRespond}>
                <Ionicons name="flash" size={14} color="#fff" />
                <Text style={styles.respondBtnText}>{'立即响应'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  name: {
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
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLeft: {
    flex: 1,
    gap: 8,
    marginRight: 8,
    minWidth: 0,
  },
  rescuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  rescuerText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  responseCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  responseCountText: {
    fontSize: scaleFont(12),
    color: '#2563eb',
    fontWeight: '600',
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  ignoreBtn: {
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
    gap: 5,
    backgroundColor: '#ef4444',
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
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  respondedBadgeText: {
    fontSize: scaleFont(13),
    color: '#22c55e',
    fontWeight: '600',
  },
});
