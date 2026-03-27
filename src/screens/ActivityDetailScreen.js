import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { getActivityImages, getJoinedActivityState, getQuitActivityState, normalizeActivityItem } from '../utils/activityUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = 20;
const coverWidth = screenWidth - horizontalPadding * 2;

export default function ActivityDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const heroScrollRef = useRef(null);
  const viewerScrollRef = useRef(null);
  const initialRouteActivity = route?.params?.activity || null;
  const onActivityChange = route?.params?.onActivityChange;
  const [activity, setActivity] = useState(() => normalizeActivityItem(initialRouteActivity));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  useEffect(() => {
    setActivity(normalizeActivityItem(initialRouteActivity));
    setCurrentImageIndex(0);
  }, [initialRouteActivity]);

  const images = useMemo(() => getActivityImages(activity), [activity]);

  useEffect(() => {
    if (!showImageViewer) {
      return;
    }

    const timer = setTimeout(() => {
      viewerScrollRef.current?.scrollTo({
        x: viewerStartIndex * screenWidth,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [showImageViewer, viewerStartIndex]);

  if (!activity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.activity.actions.viewDetail')}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{t('screens.activity.detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEnded = activity.status === 'ended';
  const isJoined = Boolean(activity.joined);
  const organizerLabel =
    activity.organizerType === 'platform'
      ? t('screens.activity.organizer.platform')
      : activity.organizer;
  const typeLabel =
    activity.typeName ||
    (activity.type ? t(`screens.activity.type.${activity.type}`) : '');
  const statusLabel = isEnded
    ? activity.statusName || t('screens.activity.actions.ended')
    : isJoined
      ? t('screens.activity.actions.joined')
      : activity.statusName || t('screens.activity.actions.join');

  const syncActivity = nextActivity => {
    const normalizedActivity = normalizeActivityItem(nextActivity);
    setActivity(normalizedActivity);

    if (typeof onActivityChange === 'function' && normalizedActivity) {
      onActivityChange(normalizedActivity);
    }
  };

  const handleToggleJoin = () => {
    if (isEnded) {
      return;
    }

    if (isJoined) {
      showAppAlert(t('common.ok'), t('screens.activity.actions.quitConfirm'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          onPress: () => {
            syncActivity(getQuitActivityState(activity));
          },
        },
      ]);
      return;
    }

    syncActivity(getJoinedActivityState(activity));
  };

  const handleHeroScrollEnd = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / coverWidth);
    setCurrentImageIndex(index);
  };

  const handleThumbnailPress = index => {
    setCurrentImageIndex(index);
    heroScrollRef.current?.scrollTo({
      x: index * coverWidth,
      animated: true,
    });
  };

  const openImageViewer = index => {
    if (images.length === 0) {
      return;
    }

    setViewerStartIndex(index);
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.activity.actions.viewDetail')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            {images.length > 0 ? (
              <ScrollView
                ref={heroScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleHeroScrollEnd}
              >
                {images.map((image, index) => (
                  <TouchableOpacity
                    key={`${image}-${index}`}
                    activeOpacity={0.96}
                    onPress={() => openImageViewer(index)}
                  >
                    <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#cbd5e1" />
              </View>
            )}

            {images.length > 0 ? (
              <TouchableOpacity
                style={styles.previewBadge}
                activeOpacity={0.88}
                onPress={() => openImageViewer(currentImageIndex)}
              >
                <Ionicons name="expand-outline" size={14} color="#fff" />
                <Text style={styles.previewBadgeText}>
                  {currentImageIndex + 1}/{images.length}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.badgeRow}>
              {typeLabel ? (
                <View
                  style={[
                    styles.typeBadge,
                    activity.type === 'offline' ? styles.typeBadgeOffline : styles.typeBadgeOnline,
                  ]}
                >
                  <Ionicons
                    name={activity.type === 'offline' ? 'location-outline' : 'globe-outline'}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.badgeText}>{typeLabel}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={isEnded ? 1 : 0.88}
                disabled={isEnded}
                onPress={handleToggleJoin}
                style={[
                  styles.statusBadge,
                  isEnded && styles.statusBadgeEnded,
                  isJoined && !isEnded && styles.statusBadgeJoined,
                ]}
              >
                <Text style={styles.badgeText}>{statusLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {images.map((image, index) => (
                <TouchableOpacity
                  key={`thumb-${image}-${index}`}
                  activeOpacity={0.9}
                  style={[styles.thumbnailButton, index === currentImageIndex && styles.thumbnailButtonActive]}
                  onPress={() => handleThumbnailPress(index)}
                >
                  <Image source={{ uri: image }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.title}>{activity.title}</Text>
          <Text style={styles.description}>{activity.desc}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="person-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.infoLabel}>{t('screens.activity.detail.organizer')}</Text>
            <Text style={styles.infoValue}>{organizerLabel}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="people-outline" size={18} color="#ef4444" />
            <Text style={styles.infoLabel}>{t('screens.activity.detail.participants')}</Text>
            <Text style={styles.infoValue}>{activity.participants}</Text>
          </View>
          <View style={styles.infoCardWide}>
            <Ionicons name="calendar-outline" size={18} color="#ef4444" />
            <Text style={styles.infoLabel}>{t('screens.activity.detail.schedule')}</Text>
            <Text style={styles.infoValue}>
              {activity.startTime} - {activity.endTime}
            </Text>
          </View>
          {activity.type === 'offline' && activity.address ? (
            <View style={styles.infoCardWide}>
              <Ionicons name="location-outline" size={18} color="#ef4444" />
              <Text style={styles.infoLabel}>{t('screens.activity.detail.location')}</Text>
              <Text style={styles.infoValue}>{activity.address}</Text>
            </View>
          ) : null}
          {activity.joined && activity.progress ? (
            <View style={styles.infoCardWide}>
              <Ionicons name="bar-chart-outline" size={18} color="#ef4444" />
              <Text style={styles.infoLabel}>{t('screens.activity.detail.progress')}</Text>
              <Text style={styles.infoValue}>{activity.progress}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('screens.activity.detail.guideTitle')}</Text>
          <Text style={styles.sectionBody}>{t('screens.activity.detail.guideBody')}</Text>
        </View>
      </ScrollView>

      <Modal visible={showImageViewer} animationType="fade" transparent={false} statusBarTranslucent>
        <View style={styles.imageViewerContainer}>
          <View style={[styles.imageViewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowImageViewer(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageViewerCounter}>
              {images.length > 0 ? `${currentImageIndex + 1}/${images.length}` : '0/0'}
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
            {images.map((image, index) => (
              <View key={`viewer-${image}-${index}`} style={styles.imageSlide}>
                <Image source={{ uri: image }} style={styles.fullImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.imageViewerFooter}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[styles.imageIndicator, index === currentImageIndex && styles.imageIndicatorActive]}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: horizontalPadding,
    paddingBottom: 32,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  heroSection: {
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroImage: {
    width: coverWidth,
    height: 240,
  },
  heroPlaceholder: {
    width: coverWidth,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  previewBadge: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.68)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeBadgeOnline: {
    backgroundColor: '#8b5cf6',
  },
  typeBadgeOffline: {
    backgroundColor: '#f59e0b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  statusBadgeJoined: {
    backgroundColor: '#10b981',
  },
  statusBadgeEnded: {
    backgroundColor: '#9ca3af',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailRow: {
    gap: 10,
    paddingHorizontal: 4,
  },
  thumbnailButton: {
    width: 76,
    height: 76,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailButtonActive: {
    borderColor: '#ef4444',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4b5563',
  },
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  infoCardWide: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  infoLabel: {
    marginTop: 10,
    fontSize: 12,
    color: '#9ca3af',
  },
  infoValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6b7280',
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
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
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
