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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = 20;
const coverWidth = screenWidth - horizontalPadding * 2;

const getJoinedActivityState = activity => ({
  ...activity,
  joined: true,
  participants: activity.participants + 1,
  progress: activity.progress || '0/7天',
});

const getQuitActivityState = activity => ({
  ...activity,
  joined: false,
  participants: Math.max(0, activity.participants - 1),
  progress: undefined,
});

export default function ActivityDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const heroScrollRef = useRef(null);
  const viewerScrollRef = useRef(null);
  const initialActivity = route?.params?.activity || null;
  const onActivityChange = route?.params?.onActivityChange;
  const [activity, setActivity] = useState(initialActivity);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  useEffect(() => {
    setActivity(initialActivity);
  }, [initialActivity]);

  const images = useMemo(() => {
    if (!activity) {
      return [];
    }

    if (Array.isArray(activity.images) && activity.images.length > 0) {
      return activity.images;
    }

    return activity.image ? [activity.image] : [];
  }, [activity]);

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
  const statusLabel = isEnded
    ? t('screens.activity.actions.ended')
    : isJoined
      ? t('screens.activity.actions.joined')
      : t('screens.activity.actions.join');
  const organizerLabel =
    activity.organizerType === 'platform' ? t('screens.activity.organizer.platform') : activity.organizer;

  const syncActivity = nextActivity => {
    setActivity(nextActivity);

    if (typeof onActivityChange === 'function') {
      onActivityChange(nextActivity);
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
            <ScrollView
              ref={heroScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageTrack}
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

            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Ionicons
                  name={activity.type === 'online' ? 'globe-outline' : 'location-outline'}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.badgeText}>
                  {t(`screens.activity.type.${activity.type === 'online' ? 'online' : 'offline'}`)}
                </Text>
              </View>
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
              {currentImageIndex + 1}/{images.length}
            </Text>
            <View style={styles.viewerHeaderSpacer} />
          </View>

          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
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
              <View key={index} style={[styles.imageIndicator, index === currentImageIndex && styles.imageIndicatorActive]} />
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
  heroSection: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111827',
    position: 'relative',
  },
  imageTrack: {
    flexDirection: 'row',
  },
  heroImage: {
    width: coverWidth,
    height: 240,
  },
  previewBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
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
    left: 14,
    top: 14,
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeEnded: {
    backgroundColor: 'rgba(107, 114, 128, 0.92)',
  },
  statusBadgeJoined: {
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbnailRow: {
    gap: 10,
    paddingHorizontal: 2,
  },
  thumbnailButton: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.72,
  },
  thumbnailButtonActive: {
    borderColor: '#ef4444',
    opacity: 1,
    transform: [{ scale: 1.02 }],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
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
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardWide: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#6b7280',
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
