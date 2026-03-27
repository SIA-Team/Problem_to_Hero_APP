import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import activityApi from '../services/api/activityApi';
import {
  getActivitiesByTab,
  getActivityImages,
  getJoinedActivityState,
  getQuitActivityState,
  normalizeActivityItem,
  normalizeActivityList,
} from '../utils/activityUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const getOrganizerIcon = organizerType => {
  switch (organizerType) {
    case 'team':
      return 'people';
    case 'personal':
      return 'person';
    case 'platform':
      return 'shield-checkmark';
    default:
      return 'person';
  }
};

const getOrganizerColor = organizerType => {
  switch (organizerType) {
    case 'team':
      return '#8b5cf6';
    case 'personal':
      return '#3b82f6';
    case 'platform':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

export default function ActivityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const viewerScrollRef = useRef(null);
  const isFromProfile = Boolean(route?.params?.fromProfile);

  const [activeTabKey, setActiveTabKey] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const tabs = useMemo(
    () => [
      { key: 'all', label: t('screens.activity.tabs.all') },
      { key: 'hot', label: t('screens.activity.tabs.hot') },
      { key: 'new', label: t('screens.activity.tabs.new') },
      { key: 'ended', label: t('screens.activity.tabs.ended') },
      { key: 'mine', label: t('screens.activity.tabs.mine') },
    ],
    [t]
  );

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    if (!showImageViewer) {
      return;
    }

    const timer = setTimeout(() => {
      viewerScrollRef.current?.scrollTo({
        x: currentImageIndex * screenWidth,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [showImageViewer, currentImageIndex]);

  const loadActivities = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');
      const response = await activityApi.getActivityList();
      const nextActivities = normalizeActivityList(response?.data);
      setActivities(nextActivities);
    } catch (error) {
      const nextErrorMessage = error?.message || t('common.noData');
      setErrorMessage(nextErrorMessage);
      showToast(nextErrorMessage, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredActivities = useMemo(
    () => getActivitiesByTab(activities, activeTabKey),
    [activities, activeTabKey]
  );

  const handleActivityChange = updatedActivity => {
    const normalizedActivity = normalizeActivityItem(updatedActivity);

    if (!normalizedActivity?.id) {
      return;
    }

    setActivities(currentActivities =>
      currentActivities.map(activity =>
        activity.id === normalizedActivity.id ? normalizedActivity : activity
      )
    );
  };

  const openImageViewer = (images, initialIndex = 0) => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    setViewerImages(images);
    setCurrentImageIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleImagePress = activity => {
    openImageViewer(getActivityImages(activity), 0);
  };

  const handleOpenActivityDetail = activity => {
    navigation.navigate('ActivityDetail', {
      activity,
      onActivityChange: handleActivityChange,
    });
  };

  const handleJoinActivity = id => {
    setActivities(currentActivities =>
      currentActivities.map(activity => {
        if (activity.id !== id) {
          return activity;
        }

        if (activity.joined) {
          showAppAlert(t('common.ok'), t('screens.activity.actions.quitConfirm'), [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('common.confirm'),
              onPress: () => {
                setActivities(previousActivities =>
                  previousActivities.map(previousActivity =>
                    previousActivity.id === id
                      ? getQuitActivityState(previousActivity)
                      : previousActivity
                  )
                );
              },
            },
          ]);

          return activity;
        }

        return getJoinedActivityState(activity);
      })
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>
          {errorMessage || t('screens.activity.empty')}
        </Text>
        {errorMessage ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadActivities()}
            activeOpacity={0.85}
          >
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {isFromProfile ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.headerTitle}>
          {isFromProfile ? t('screens.activity.myActivities') : t('screens.activity.title')}
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateActivity')}
          style={styles.createBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>{t('screens.activity.create')}</Text>
        </TouchableOpacity>
      </View>

      {!isFromProfile ? (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, activeTabKey === tab.key && styles.tabItemActive]}
                onPress={() => setActiveTabKey(tab.key)}
              >
                <Text style={[styles.tabText, activeTabKey === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadActivities({ silent: true })}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        {filteredActivities.length > 0
          ? filteredActivities.map(item => {
              const itemImages = getActivityImages(item);
              const tagLabel =
                item.tags?.[0] ||
                (item.status === 'ended'
                  ? item.statusName || t('screens.activity.tag.ended')
                  : null);
              const typeLabel =
                item.typeName ||
                (item.type ? t(`screens.activity.type.${item.type}`) : '');

              return (
                <View key={item.id} style={styles.activityCard}>
                  <TouchableOpacity
                    style={styles.coverImageContainer}
                    onPress={() => handleImagePress(item)}
                    activeOpacity={0.92}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.activityImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={28} color="#cbd5e1" />
                      </View>
                    )}

                    {itemImages.length > 0 ? (
                      <View style={styles.previewIconBadge}>
                        <Ionicons name="expand-outline" size={14} color="#fff" />
                      </View>
                    ) : null}

                    {itemImages.length > 1 ? (
                      <View style={styles.imageCountBadge}>
                        <Ionicons name="images" size={14} color="#fff" />
                        <Text style={styles.imageCountText}>1/{itemImages.length}</Text>
                      </View>
                    ) : null}

                    {(tagLabel || typeLabel) ? (
                      <View style={styles.activityBadges}>
                        {tagLabel ? (
                          <View
                            style={[
                              styles.activityTag,
                              item.status === 'ended'
                                ? styles.activityTagEnded
                                : styles.activityTagDefault,
                            ]}
                          >
                            <Text style={styles.activityTagText}>{tagLabel}</Text>
                          </View>
                        ) : null}
                        {typeLabel ? (
                          <View
                            style={[
                              styles.typeTag,
                              item.type === 'offline'
                                ? styles.typeTagOffline
                                : styles.typeTagOnline,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.type === 'offline'
                                  ? 'location-outline'
                                  : 'globe-outline'
                              }
                              size={10}
                              color="#fff"
                            />
                            <Text style={styles.typeTagText}>{typeLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.activityInfo}>
                    <TouchableOpacity
                      style={styles.activityInfoTouchable}
                      activeOpacity={0.86}
                      onPress={() => handleOpenActivityDetail(item)}
                    >
                      <View style={styles.titleRow}>
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                      </View>

                      <Text style={styles.activityDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>

                      {item.type === 'offline' && item.address ? (
                        <View style={styles.addressRow}>
                          <Ionicons name="location" size={14} color="#ef4444" />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {item.address}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.activityMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons
                            name={getOrganizerIcon(item.organizerType)}
                            size={14}
                            color={getOrganizerColor(item.organizerType)}
                          />
                          <Text
                            style={[
                              styles.metaText,
                              { color: getOrganizerColor(item.organizerType) },
                            ]}
                          >
                            {item.organizerType === 'platform'
                              ? t('screens.activity.organizer.platform')
                              : item.organizer}
                          </Text>
                        </View>

                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={14} color="#9ca3af" />
                          <Text style={styles.metaText}>
                            {item.participants}
                            {t('screens.activity.participants')}
                          </Text>
                        </View>

                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                          <Text style={styles.metaText}>
                            {item.startTime} ~ {item.endTime}
                          </Text>
                        </View>
                      </View>

                      {item.joined && item.progress ? (
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>{t('screens.activity.progress')}</Text>
                          <Text style={styles.progressText}>{item.progress}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.joinBtn,
                        item.joined && styles.joinedBtn,
                        item.status === 'ended' && styles.endedBtn,
                      ]}
                      onPress={() => item.status !== 'ended' && handleJoinActivity(item.id)}
                      disabled={item.status === 'ended'}
                    >
                      <Text style={[styles.joinBtnText, item.joined && styles.joinedBtnText]}>
                        {item.status === 'ended'
                          ? t('screens.activity.actions.ended')
                          : item.joined
                            ? t('screens.activity.actions.joined')
                            : t('screens.activity.actions.join')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          : renderEmptyState()}
      </ScrollView>

      <Modal visible={showImageViewer} animationType="fade" transparent={false} statusBarTranslucent>
        <View style={styles.imageViewerContainer}>
          <View style={[styles.imageViewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowImageViewer(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageViewerCounter}>
              {viewerImages.length > 0 ? `${currentImageIndex + 1}/${viewerImages.length}` : '0/0'}
            </Text>
            <View style={styles.viewerHeaderSpacer} />
          </View>

          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
              );
              setCurrentImageIndex(index);
            }}
            style={styles.imageViewerScroll}
          >
            {viewerImages.map((image, index) => (
              <View key={`${image}-${index}`} style={styles.imageSlide}>
                <Image source={{ uri: image }} style={styles.fullImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.imageViewerFooter}>
            {viewerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.imageIndicator,
                  index === currentImageIndex && styles.imageIndicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    minHeight: 38,
    minWidth: 74,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabScroll: {
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  coverImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#eef2f7',
  },
  activityImage: {
    width: '100%',
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  previewIconBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: modalTokens.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activityBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  activityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activityTagDefault: {
    backgroundColor: '#ef4444',
  },
  activityTagEnded: {
    backgroundColor: '#9ca3af',
  },
  activityTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  typeTagOnline: {
    backgroundColor: '#8b5cf6',
  },
  typeTagOffline: {
    backgroundColor: '#f59e0b',
  },
  typeTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  activityInfo: {
    padding: 14,
  },
  activityInfoTouchable: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  activityDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#ef4444',
  },
  activityMeta: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinedBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  endedBtn: {
    backgroundColor: '#e5e7eb',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  joinedBtnText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: modalTokens.overlay,
  },
  imageViewerCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  viewerHeaderSpacer: {
    width: 28,
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageSlide: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
});
