import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import activityApi from '../services/api/activityApi';
import { showToast } from '../utils/toast';
import { normalizeActivityList } from '../utils/activityUtils';
import { scaleFont } from '../utils/responsive';

const extractMyActivityRows = response => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  const rawData = response?.data;
  const payload =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData) && rawData.data !== undefined
      ? rawData.data
      : rawData && typeof rawData === 'object' && !Array.isArray(rawData)
        ? rawData
        : response;
  const rows = payload?.rows || payload?.list || payload?.records || payload?.items || [];

  return Array.isArray(rows) ? rows : [];
};

const isSuccessfulMyActivitiesResponse = response =>
  response?.code === 200 || response?.code === 0 || Array.isArray(response?.data);

export default function MyActivitiesScreen({ navigation, route }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('joined');
  const routeType = Number(route?.params?.type);
  const type = routeType === 1 || routeType === 2 ? routeType : undefined;

  const loadActivities = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await activityApi.getMyActivities(type ? { type } : {});

      if (!isSuccessfulMyActivitiesResponse(response)) {
        throw new Error(response?.msg || '\u52a0\u8f7d\u6211\u7684\u6d3b\u52a8\u5931\u8d25');
      }

      const rows = extractMyActivityRows(response);
      setActivities(normalizeActivityList(rows));
    } catch (error) {
      console.error('Failed to load my activities:', error);
      showToast(
        error?.message || '\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5',
        'error'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadActivities({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenActivity = activity => {
    navigation.navigate('ActivityDetail', {
      activity,
    });
  };

  const handleCreateActivity = () => {
    navigation.navigate('CreateActivity');
  };

  const handleFilterPress = filterKey => {
    const matchedOption = filterOptions.find(item => item.key === filterKey);

    if (!matchedOption?.count) {
      return;
    }

    setSelectedFilter(filterKey);
  };

  const summary = useMemo(() => {
    const endedCount = activities.filter(item => item.status === 'ended').length;

    return {
      joinedCount: activities.length,
      ongoingCount: activities.length - endedCount,
      endedCount,
    };
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (selectedFilter === 'ongoing') {
      return activities.filter(item => item.status === 'active');
    }

    if (selectedFilter === 'ended') {
      return activities.filter(item => item.status === 'ended');
    }

    return activities;
  }, [activities, selectedFilter]);

  const filterOptions = useMemo(() => ([
    {
      key: 'joined',
      label: t('screens.activity.actions.joined'),
      count: summary.joinedCount,
    },
    {
      key: 'ongoing',
      label: t('activity.ongoing'),
      count: summary.ongoingCount,
    },
    {
      key: 'ended',
      label: t('activity.ended'),
      count: summary.endedCount,
    },
  ]), [summary.endedCount, summary.joinedCount, summary.ongoingCount, t]);

  useEffect(() => {
    if (!summary.joinedCount) {
      setSelectedFilter('joined');
      return;
    }

    const currentOption = filterOptions.find(item => item.key === selectedFilter);

    if (currentOption?.count) {
      return;
    }

    const nextAvailableOption = filterOptions.find(item => item.count > 0);
    setSelectedFilter(nextAvailableOption?.key || 'joined');
  }, [filterOptions, selectedFilter, summary.joinedCount]);

  const getStatusLabel = activity => {
    if (activity?.status === 'ended') {
      return t('activity.ended');
    }

    if (activity?.status === 'active') {
      return t('activity.ongoing');
    }

    return activity?.isJoined
      ? t('screens.activity.actions.joined')
      : t('activity.ongoing');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.activity.myActivities')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.activity.myActivities')}</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateActivity} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>{t('screens.activity.create')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        <View style={styles.summaryCard}>
          {filterOptions.map((item, index) => {
            const isSelected = selectedFilter === item.key;
            const isDisabled = item.count === 0;

            return (
              <React.Fragment key={item.key}>
                <TouchableOpacity
                  style={[
                    styles.summaryItem,
                    isSelected && styles.summaryItemActive,
                    isDisabled && styles.summaryItemDisabled,
                  ]}
                  activeOpacity={isDisabled ? 1 : 0.85}
                  onPress={() => handleFilterPress(item.key)}
                >
                  <Text style={[styles.summaryValue, isSelected && styles.summaryValueActive]}>
                    {item.count}
                  </Text>
                  <Text style={[styles.summaryLabel, isSelected && styles.summaryLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < filterOptions.length - 1 ? <View style={styles.summaryDivider} /> : null}
              </React.Fragment>
            );
          })}
        </View>

        {filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('screens.activity.empty')}</Text>
            <Text style={styles.emptyHint}>
              {'\u53bb\u53d1\u73b0\u4e00\u4e9b\u611f\u5174\u8da3\u7684\u6d3b\u52a8\u5427'}
            </Text>
          </View>
        ) : (
          filteredActivities.map(activity => (
            <TouchableOpacity
              key={activity.id}
              style={styles.card}
              onPress={() => handleOpenActivity(activity)}
              activeOpacity={0.9}
            >
              {activity.image || activity.coverImage ? (
                <Image source={{ uri: activity.image || activity.coverImage }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Ionicons name="image-outline" size={30} color="#cbd5e1" />
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  <View style={[styles.statusBadge, activity.status === 'ended' && styles.statusBadgeEnded]}>
                    <Text style={[styles.statusText, activity.status === 'ended' && styles.statusTextEnded]}>
                      {getStatusLabel(activity)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.organizerText} numberOfLines={1}>
                  {activity.organizer || activity.typeName || activity.description || ''}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{`${activity.participants || 0}\u4eba`}</Text>
                  </View>

                  {activity.reward ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>{activity.reward}</Text>
                    </View>
                  ) : null}

                  {activity.startTime ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>{activity.startTime}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eceff3',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 24,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  createBtnText: {
    marginLeft: 4,
    color: '#fff',
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    marginTop: 16,
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 16,
  },
  summaryItemActive: {
    backgroundColor: '#fff1f2',
  },
  summaryItemDisabled: {
    opacity: 0.6,
  },
  summaryValue: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryValueActive: {
    color: '#ef4444',
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
  summaryLabelActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#eef2f7',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cover: {
    width: '100%',
    height: 146,
    backgroundColor: '#e5e7eb',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeEnded: {
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '600',
  },
  statusTextEnded: {
    color: '#6b7280',
  },
  organizerText: {
    marginTop: 10,
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#4b5563',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
});
