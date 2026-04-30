import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import activityApi from '../services/api/activityApi';
import {
  applyActivityJoinOverride,
  loadActivityJoinOverrides,
  markActivityJoinedOverride,
  removeActivityJoinedOverride,
} from '../utils/activityJoinState';
import {
  formatActivityDate,
  getActivityImages,
  getKnownJoinedActivityState,
  getJoinedActivityStateFromResponse,
  getQuitActivityState,
  getQuitActivityStateFromResponse,
  isActivityOwnedByCurrentUser,
  isActivityJoined,
  normalizeActivityItem,
} from '../utils/activityUtils';
import { scaleFont } from '../utils/responsive';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const horizontalPadding = 20;
const coverWidth = screenWidth - horizontalPadding * 2;
const loadedActivityImageUriCache = new Set();
const getCurrentUserIdCandidates = userInfo =>
  Array.from(
    new Set(
      [
        userInfo?.userId,
        userInfo?.appUserId,
        userInfo?.app_user_id,
        userInfo?.id,
        userInfo?.uid,
        userInfo?.user?.id,
        userInfo?.userBaseInfo?.userId,
        userInfo?.userBaseInfo?.appUserId,
        userInfo?.userBaseInfo?.id,
        userInfo?.userBaseInfo?.uid,
      ]
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
    )
  );
const ACTIVITY_ALREADY_JOINED_PATTERN = /宸瞇鍙備笌鍙俔鍔爘鎮ㄤ互鍙備笌璇ユ椿鍔▅already\s*(joined|participated?)/i;

const SECTION_LABELS = {
  overview: '\u6d3b\u52a8\u4ecb\u7ecd',
  organizer: '\u53d1\u8d77\u65b9',
  participation: '\u53c2\u4e0e\u4fe1\u606f',
  timeline: '\u65f6\u95f4\u4e0e\u5730\u70b9',
  reward: '\u5956\u52b1\u8bf4\u660e',
  rules: '\u6d3b\u52a8\u89c4\u5219',
  question: '\u5173\u8054\u95ee\u9898',
  tags: '\u6d3b\u52a8\u6807\u7b7e',
  official: '\u5b98\u65b9\u6d3b\u52a8',
  individual: '\u4e2a\u4eba\u53d1\u8d77',
  team: '\u56e2\u961f\u53d1\u8d77',
  online: '\u7ebf\u4e0a\u6d3b\u52a8',
  offline: '\u7ebf\u4e0b\u6d3b\u52a8',
  unlimited: '\u4e0d\u9650\u540d\u989d',
  quota: '\u540d\u989d',
  noDescription: '\u6682\u65e0\u6d3b\u52a8\u8be6\u60c5\u4ecb\u7ecd',
  noReward: '\u6682\u65e0\u5956\u52b1\u8bf4\u660e',
  noRules: '\u6682\u65e0\u6d3b\u52a8\u89c4\u5219',
  noQuestion: '\u6682\u672a\u5173\u8054\u95ee\u9898',
  loading: '\u6b63\u5728\u52a0\u8f7d\u6d3b\u52a8\u8be6\u60c5...',
  loadFailed: '\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25',
  retry: '\u91cd\u8bd5',
  currentParticipants: '\u5f53\u524d\u53c2\u4e0e',
  maxParticipants: '\u6700\u5927\u540d\u989d',
  sponsorIdentity: '\u53d1\u8d77\u8eab\u4efd',
  relatedQuestion: '\u95ee\u9898\u7ed1\u5b9a',
  joinHint: '\u53c2\u4e0e\u540e\u5373\u53ef\u83b7\u53d6\u6700\u65b0\u6d3b\u52a8\u8fdb\u5c55',
  joinedHint: '\u4f60\u5df2\u6210\u529f\u53c2\u4e0e\u8be5\u6d3b\u52a8',
  cancelJoin: '\u53d6\u6d88\u62a5\u540d',
  joining: '\u53c2\u52a0\u4e2d...',
  cancelling: '\u53d6\u6d88\u4e2d...',
  cancelJoinHint: '\u5982\u679c\u4f60\u4e0d\u518d\u53c2\u4e0e\uff0c\u53ef\u4ee5\u5728\u8fd9\u91cc\u53d6\u6d88\u62a5\u540d',
  endedHint: '\u8be5\u6d3b\u52a8\u5df2\u7ed3\u675f',
  teamName: '\u53d1\u8d77\u56e2\u961f',
  ownerBadge: '\u53d1\u8d77\u4eba',
};

const isAlreadyJoinedActivityMessage = value => {
  const normalizedValue = String(value || '').trim();

  return (
    ACTIVITY_ALREADY_JOINED_PATTERN.test(normalizedValue) ||
    normalizedValue.includes('\u5df2\u53c2\u4e0e') ||
    normalizedValue.includes('\u5df2\u53c2\u52a0') ||
    normalizedValue.includes('\u60a8\u5df2\u53c2\u4e0e\u8be5\u6d3b\u52a8')
  );
};

const getJoinFeedbackMessage = error => {
  const candidates = [
    error?.message,
    error?.msg,
    error?.data?.msg,
    error?.data?.message,
    error?.response?.data?.msg,
    error?.response?.data?.message,
  ];

  return candidates.find(candidate => typeof candidate === 'string' && candidate.trim()) || '';
};

const extractActivityDetailPayload = response => {
  const candidates = [
    response?.data,
    response?.result,
    response?.record,
    response,
  ];

  return candidates.find(candidate => candidate && typeof candidate === 'object' && !Array.isArray(candidate))
    || null;
};

const normalizeText = value => (typeof value === 'string' ? value.trim() : '');

const extractTagLabels = tags =>
  Array.isArray(tags)
    ? tags
        .map(tag => {
          if (typeof tag === 'string') {
            return tag.trim();
          }

          if (tag && typeof tag === 'object') {
            return normalizeText(tag.name || tag.label || tag.title || tag.value);
          }

          return '';
        })
        .filter(Boolean)
    : [];

const getSponsorDisplay = activity => {
  const sponsorType = Number(activity?.sponsorType);
  const teamName = normalizeText(activity?.teamName);
  const teamAvatar = normalizeText(activity?.teamAvatar);
  const sponsorName = normalizeText(activity?.sponsor?.name || activity?.organizerName || activity?.organizer);
  const sponsorAvatar = normalizeText(activity?.sponsor?.avatar);
  const sponsorTypeName = normalizeText(activity?.sponsorTypeName);

  if (teamName || sponsorType === 2) {
    return {
      name: teamName || sponsorName || SECTION_LABELS.team,
      avatar: teamAvatar || sponsorAvatar,
      identity: sponsorTypeName || SECTION_LABELS.team,
    };
  }

  if (activity?.isOfficial && !sponsorName) {
    return {
      name: '\u5e73\u53f0',
      avatar: sponsorAvatar,
      identity: sponsorTypeName || SECTION_LABELS.official,
    };
  }

  return {
    name: sponsorName || '\u5e73\u53f0',
    avatar: sponsorAvatar,
    identity: sponsorTypeName || (activity?.isOfficial ? SECTION_LABELS.official : SECTION_LABELS.individual),
  };
};

const formatParticipantValue = value => {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue >= 0 ? normalizedValue : 0;
};

const getProgressRatio = (currentParticipants, maxParticipants) => {
  const maxValue = Number(maxParticipants);
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, formatParticipantValue(currentParticipants) / maxValue));
};

const formatSchedule = activity => {
  const startLabel = formatActivityDate(activity?.startTimeRaw || activity?.startTime);
  const endLabel = formatActivityDate(activity?.endTimeRaw || activity?.endTime);

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }

  return startLabel || endLabel || '';
};

const getStatusLabel = (activity, isEnded, isJoined, t) => {
  if (isEnded) {
    return activity?.statusName || t('screens.activity.actions.ended');
  }

  if (isJoined) {
    return t('screens.activity.actions.joined');
  }

  return activity?.statusName || t('screens.activity.actions.join');
};

const getActivityImageSource = uri => ({
  uri,
  cache: 'force-cache',
});

const prefetchActivityImages = async imageUris => {
  const normalizedUris = Array.isArray(imageUris)
    ? imageUris
        .filter(imageUri => typeof imageUri === 'string' && imageUri.trim())
        .map(imageUri => imageUri.trim())
    : [];

  if (normalizedUris.length === 0) {
    return;
  }

  await Promise.allSettled(
    normalizedUris.map(async imageUri => {
      if (!loadedActivityImageUriCache.has(imageUri)) {
        const didPrefetch = await Image.prefetch(imageUri);
        if (didPrefetch) {
          loadedActivityImageUriCache.add(imageUri);
        }
        return;
      }

      loadedActivityImageUriCache.add(imageUri);
    })
  );
};

const getActivityVisualFields = activity => ({
  image: activity?.image || null,
  coverImage: activity?.coverImage || null,
  images: Array.isArray(activity?.images) ? activity.images : [],
  imageUrls: Array.isArray(activity?.imageUrls) ? activity.imageUrls : [],
  bannerImages: Array.isArray(activity?.bannerImages) ? activity.bannerImages : [],
  gallery: Array.isArray(activity?.gallery) ? activity.gallery : [],
});

const SECTION_THEME_STYLES = {
  slate: {
    card: styles => styles.sectionCardSlate,
    icon: styles => styles.sectionIconSlate,
  },
  rose: {
    card: styles => styles.sectionCardRose,
    icon: styles => styles.sectionIconRose,
  },
  blue: {
    card: styles => styles.sectionCardBlue,
    icon: styles => styles.sectionIconBlue,
  },
  amber: {
    card: styles => styles.sectionCardAmber,
    icon: styles => styles.sectionIconAmber,
  },
  emerald: {
    card: styles => styles.sectionCardEmerald,
    icon: styles => styles.sectionIconEmerald,
  },
  violet: {
    card: styles => styles.sectionCardViolet,
    icon: styles => styles.sectionIconViolet,
  },
};

function DetailSection({ title, icon, theme = 'slate', children, style }) {
  const themeStyle = SECTION_THEME_STYLES[theme] || SECTION_THEME_STYLES.slate;

  return (
    <View style={[styles.sectionCard, themeStyle.card(styles), style]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, themeStyle.icon(styles)]}>
          <Ionicons name={icon} size={16} color="#fff" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ActivityDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const heroScrollRef = useRef(null);
  const viewerScrollRef = useRef(null);
  const initialRouteActivity = route?.params?.activity || null;
  const onActivityChange = route?.params?.onActivityChange;
  const activityId = Number(
    route?.params?.id ??
    route?.params?.activityId ??
    initialRouteActivity?.id ??
    0
  );
  const activityRef = useRef(normalizeActivityItem(initialRouteActivity));

  const [activity, setActivity] = useState(() => normalizeActivityItem(initialRouteActivity));
  const [detailLoading, setDetailLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [joining, setJoining] = useState(false);
  const [loadedImageMap, setLoadedImageMap] = useState({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserIds, setCurrentUserIds] = useState([]);
  const [currentUserNames, setCurrentUserNames] = useState([]);

  useEffect(() => {
    const normalizedInitialActivity = normalizeActivityItem(initialRouteActivity);
    activityRef.current = normalizedInitialActivity;
    setActivity(normalizedInitialActivity);
    setCurrentImageIndex(0);
  }, [initialRouteActivity]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserIdentity = async () => {
      try {
        const [userInfoRaw, currentUsername] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('currentUsername'),
        ]);

        const nextNames = [];
        let nextUserIds = [];

        if (userInfoRaw) {
          try {
            const userInfo = JSON.parse(userInfoRaw);
            nextUserIds = getCurrentUserIdCandidates(userInfo);
            nextNames.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.warn('Failed to parse current user info for activity ownership:', parseError);
          }
        }

        nextNames.push(currentUsername);

        if (!isMounted) {
          return;
        }

        setCurrentUserId(nextUserIds[0] || '');
        setCurrentUserIds(nextUserIds);
        setCurrentUserNames(
          Array.from(
            new Set(
              nextNames
                .map(item => String(item ?? '').trim())
                .filter(Boolean)
            )
          )
        );
      } catch (storageError) {
        if (!isMounted) {
          return;
        }

        console.warn('Failed to load current user identity for activity ownership:', storageError);
        setCurrentUserId('');
        setCurrentUserIds([]);
        setCurrentUserNames([]);
      }
    };

    void loadCurrentUserIdentity();

    return () => {
      isMounted = false;
    };
  }, []);

  const syncActivity = useCallback((nextActivity, options = {}) => {
    const normalizedActivity = normalizeActivityItem(nextActivity);
    if (!normalizedActivity) {
      return;
    }

    activityRef.current = normalizedActivity;
    setActivity(normalizedActivity);

    if (!options.skipParentSync && typeof onActivityChange === 'function') {
      onActivityChange(normalizedActivity);
    }
  }, [onActivityChange]);

  const loadDetail = useCallback(async ({ silent = false } = {}) => {
    if (!activityId) {
      setDetailLoading(false);
      setRefreshing(false);
      setDetailError('');
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setDetailLoading(true);
    }

    try {
      const [response, joinedOverrideMap] = await Promise.all([
        activityApi.getActivityDetail(activityId),
        loadActivityJoinOverrides(),
      ]);

      if (Number(response?.code) !== 200) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      const detailPayload = extractActivityDetailPayload(response);
      const mergedActivity = applyActivityJoinOverride(
        {
          ...(initialRouteActivity || {}),
          ...(activityRef.current || {}),
          ...(detailPayload || {}),
          id: detailPayload?.id ?? activityId,
        },
        joinedOverrideMap
      );

      const currentVisualActivity = activityRef.current || initialRouteActivity || null;
      const currentImages = getActivityImages(currentVisualActivity);
      const nextImages = getActivityImages(mergedActivity);
      const hasImageSourceChanged =
        currentImages.length > 0 &&
        nextImages.length > 0 &&
        currentImages.join('|') !== nextImages.join('|');

      if (hasImageSourceChanged) {
        syncActivity({
          ...mergedActivity,
          ...getActivityVisualFields(currentVisualActivity),
          imageUrls: [],
          bannerImages: [],
          gallery: [],
        });

        await prefetchActivityImages(nextImages.slice(0, 3));
      } else if (nextImages.length > 0) {
        await prefetchActivityImages(nextImages.slice(0, 3));
      }

      syncActivity(mergedActivity);
      setDetailError('');
    } catch (error) {
      const nextErrorMessage = getJoinFeedbackMessage(error) || t('common.serverError');
      setDetailError(nextErrorMessage);
    } finally {
      setDetailLoading(false);
      setRefreshing(false);
    }
  }, [activityId, initialRouteActivity, syncActivity, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const images = useMemo(() => getActivityImages(activity), [activity]);

  useEffect(() => {
    const nextLoadedMap = images.reduce((accumulator, imageUri) => {
      if (loadedActivityImageUriCache.has(imageUri)) {
        accumulator[imageUri] = true;
      }

      return accumulator;
    }, {});

    setLoadedImageMap(currentMap => ({ ...nextLoadedMap, ...currentMap }));

    void prefetchActivityImages(images.slice(0, 3)).then(() => {
      setLoadedImageMap(currentMap =>
        images.reduce((accumulator, imageUri) => {
          if (loadedActivityImageUriCache.has(imageUri)) {
            accumulator[imageUri] = true;
          }

          return accumulator;
        }, { ...currentMap })
      );
    });
  }, [images]);

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

  if (!activity && !detailLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, styles.headerBtnGlass]}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
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

  if (!activity && detailLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, styles.headerBtnGlass]}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.activity.actions.viewDetail')}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={styles.emptyTitle}>{SECTION_LABELS.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEnded = activity?.status === 'ended';
  const isJoined = isActivityJoined(activity);
  const isOwnedByCurrentUser = isActivityOwnedByCurrentUser(activity, {
    currentUserId,
    currentUserIds,
    currentUserNames,
  });
  const imagesAvailable = images.length > 0;
  const sponsorDisplay = getSponsorDisplay(activity);
  const scheduleText = formatSchedule(activity);
  const currentParticipants = formatParticipantValue(
    activity?.currentParticipants ?? activity?.joinCount ?? activity?.participants
  );
  const maxParticipants = Number(activity?.maxParticipants);
  const hasParticipantLimit = Number.isFinite(maxParticipants) && maxParticipants > 0;
  const progressRatio = getProgressRatio(currentParticipants, maxParticipants);
  const typeLabel =
    normalizeText(activity?.typeName) ||
    (activity?.type === 'offline' ? SECTION_LABELS.offline : SECTION_LABELS.online);
  const statusLabel = getStatusLabel(activity, isEnded, isJoined, t);
  const description = normalizeText(activity?.description || activity?.desc);
  const reward = normalizeText(activity?.reward);
  const rules = normalizeText(activity?.rules);
  const tags = extractTagLabels(activity?.tags);
  const questionTitle = normalizeText(activity?.questionTitle);
  const questionDisplayTitle = questionTitle || `#${activity?.questionId}`;
  const hasQuestionBinding = Boolean(
    questionTitle || (Number.isFinite(Number(activity?.questionId)) && Number(activity?.questionId) > 0)
  );
  const location = normalizeText(activity?.location || activity?.address);
  const footerButtonLabel = joining
    ? (isJoined ? SECTION_LABELS.cancelling : SECTION_LABELS.joining)
    : isEnded
      ? t('screens.activity.actions.ended')
      : isJoined
        ? SECTION_LABELS.cancelJoin
        : t('screens.activity.actions.join');
  const footerHint = isEnded
    ? SECTION_LABELS.endedHint
    : isJoined
      ? SECTION_LABELS.cancelJoinHint
      : SECTION_LABELS.joinHint;

  const handleToggleJoin = async () => {
    if (!activity?.id || isOwnedByCurrentUser || isEnded || joining) {
      return;
    }

    if (isJoined) {
      showAppAlert(t('common.ok'), t('screens.activity.actions.quitConfirm'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: SECTION_LABELS.cancelJoin,
          onPress: async () => {
            setJoining(true);

            try {
              const response = await activityApi.cancelActivity(activity.id);

              if (Number(response?.code) !== 200) {
                throw new Error(response?.msg || t('common.serverError'));
              }

              await removeActivityJoinedOverride(activity.id);

              const nextActivity =
                getQuitActivityStateFromResponse(activity, response?.data) ||
                getQuitActivityState(activity);

              syncActivity(nextActivity);
            } catch (error) {
              const feedbackMessage = getJoinFeedbackMessage(error);
              showAppAlert(t('common.ok'), feedbackMessage || t('common.serverError'));
            } finally {
              setJoining(false);
            }
          },
        },
      ]);
      return;
    }

    setJoining(true);

    try {
      const response = await activityApi.joinActivity(activity.id);

      if (Number(response?.code) !== 200 && !isAlreadyJoinedActivityMessage(response?.msg)) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      await markActivityJoinedOverride(activity.id);

      const nextActivity =
        getJoinedActivityStateFromResponse(activity, response?.data) ||
        getKnownJoinedActivityState(activity);

      syncActivity(nextActivity);
      void loadDetail({ silent: true });
    } catch (error) {
      const feedbackMessage = getJoinFeedbackMessage(error);

      if (isAlreadyJoinedActivityMessage(feedbackMessage)) {
        await markActivityJoinedOverride(activity.id);
        syncActivity(getKnownJoinedActivityState(activity));
        return;
      }

      showAppAlert(t('common.ok'), feedbackMessage || t('common.serverError'));
    } finally {
      setJoining(false);
    }
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
    if (!imagesAvailable) {
      return;
    }

    setViewerStartIndex(index);
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, styles.headerBtnGlass]}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.activity.actions.viewDetail')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isOwnedByCurrentUser ? Math.max(insets.bottom + 32, 48) : Math.max(insets.bottom + 120, 136) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadDetail({ silent: true })} />
        }
      >
        <View style={styles.heroCard}>
          {imagesAvailable ? (
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
                  style={styles.heroImageFrame}
                >
                  {!loadedImageMap[image] ? (
                    <View style={styles.heroImagePlaceholder}>
                      <Ionicons name="image-outline" size={26} color="#cbd5e1" />
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  ) : null}
                  <Image
                    source={getActivityImageSource(image)}
                    style={[styles.heroImage, !loadedImageMap[image] && styles.heroImagePending]}
                    resizeMode="cover"
                    fadeDuration={0}
                    progressiveRenderingEnabled
                    onLoad={() => {
                      loadedActivityImageUriCache.add(image);
                      setLoadedImageMap(currentMap =>
                        currentMap[image]
                          ? currentMap
                          : { ...currentMap, [image]: true }
                      );
                    }}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="image-outline" size={34} color="#cbd5e1" />
            </View>
          )}

          <View style={styles.heroOverlay} pointerEvents="none" />

          <View style={styles.heroTopRow}>
            <View style={styles.leftHeroBadges}>
              <View
                style={[
                  styles.pillBadge,
                  activity?.type === 'offline' ? styles.offlineBadge : styles.onlineBadge,
                ]}
              >
                <Ionicons
                  name={activity?.type === 'offline' ? 'location-outline' : 'globe-outline'}
                  size={12}
                  color="#fff"
                />
                <Text style={styles.badgeText}>{typeLabel}</Text>
              </View>
              {activity?.isOfficial ? (
                <View style={[styles.pillBadge, styles.officialBadge]}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
                  <Text style={styles.badgeText}>{SECTION_LABELS.official}</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.statusBadge,
                isEnded && styles.statusBadgeEnded,
                isJoined && !isEnded && styles.statusBadgeJoined,
              ]}
            >
              <Text style={styles.badgeText}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.heroInfoPanel}>
            <Text style={styles.heroTitle}>{activity?.title}</Text>
            {scheduleText ? (
              <View style={styles.heroMetaItem}>
                <Ionicons name="calendar-outline" size={14} color="#fff" />
                <Text style={styles.heroMetaText}>{scheduleText}</Text>
              </View>
            ) : null}
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaChip}>
                <Ionicons name="people-outline" size={14} color="#fff" />
                <Text style={styles.heroMetaChipText}>
                  {currentParticipants}
                  {' '}
                  {t('screens.activity.detail.participants')}
                </Text>
              </View>
              {location ? (
                <View style={styles.heroMetaChip}>
                  <Ionicons name="location-outline" size={14} color="#fff" />
                  <Text style={styles.heroMetaChipText} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {imagesAvailable ? (
            <TouchableOpacity
              style={styles.previewBadge}
              activeOpacity={0.88}
              onPress={() => openImageViewer(currentImageIndex)}
            >
              <Ionicons name="images-outline" size={14} color="#fff" />
              <Text style={styles.previewBadgeText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </TouchableOpacity>
          ) : null}
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
                style={[
                  styles.thumbnailButton,
                  index === currentImageIndex && styles.thumbnailButtonActive,
                ]}
                onPress={() => handleThumbnailPress(index)}
              >
                <Image
                  source={getActivityImageSource(image)}
                  style={styles.thumbnailImage}
                  fadeDuration={0}
                  progressiveRenderingEnabled
                  onLoad={() => {
                    loadedActivityImageUriCache.add(image);
                    setLoadedImageMap(currentMap =>
                      currentMap[image]
                        ? currentMap
                        : { ...currentMap, [image]: true }
                    );
                  }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={[styles.summaryStatCard, styles.summaryStatCardRose]}>
            <View style={styles.summaryStatTop}>
              <View style={[styles.summaryStatIconWrap, styles.summaryStatIconWarm]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#ef4444" />
              </View>
              <Text style={styles.summaryStatLabel}>{SECTION_LABELS.organizer}</Text>
            </View>
            <Text style={styles.summaryStatValue} numberOfLines={1}>
              {sponsorDisplay.name}
            </Text>
          </View>
          <View style={[styles.summaryStatCard, styles.summaryStatCardBlue]}>
            <View style={styles.summaryStatTop}>
              <View style={[styles.summaryStatIconWrap, styles.summaryStatIconBlue]}>
                <Ionicons name="people-outline" size={16} color="#2563eb" />
              </View>
              <Text style={styles.summaryStatLabel}>{SECTION_LABELS.currentParticipants}</Text>
            </View>
            <Text style={styles.summaryStatValue}>{currentParticipants}</Text>
          </View>
          <View style={[styles.summaryStatCard, styles.summaryStatCardGreen]}>
            <View style={styles.summaryStatTop}>
              <View style={[styles.summaryStatIconWrap, styles.summaryStatIconGreen]}>
                <Ionicons name="ribbon-outline" size={16} color="#059669" />
              </View>
              <Text style={styles.summaryStatLabel}>{SECTION_LABELS.quota}</Text>
            </View>
            <Text style={styles.summaryStatValue}>
              {hasParticipantLimit ? maxParticipants : SECTION_LABELS.unlimited}
            </Text>
          </View>
        </View>

        <DetailSection title={SECTION_LABELS.overview} icon="sparkles-outline" theme="rose">
          <Text style={styles.sectionBody}>
            {description || SECTION_LABELS.noDescription}
          </Text>
        </DetailSection>

        <DetailSection title={SECTION_LABELS.organizer} icon="person-circle-outline" theme="violet">
          <View style={styles.organizerRow}>
            {sponsorDisplay.avatar ? (
              <Image source={{ uri: sponsorDisplay.avatar }} style={styles.organizerAvatar} />
            ) : (
              <View style={styles.organizerAvatarFallback}>
                <Text style={styles.organizerAvatarFallbackText}>
                  {(sponsorDisplay.name || '\u6d3b').slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={styles.organizerContent}>
              <View style={styles.organizerNameRow}>
                <Text style={styles.organizerName}>{sponsorDisplay.name}</Text>
                {isOwnedByCurrentUser ? (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>{SECTION_LABELS.ownerBadge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.organizerIdentity}>{sponsorDisplay.identity}</Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{SECTION_LABELS.sponsorIdentity}</Text>
              <Text style={styles.infoItemValue}>{sponsorDisplay.identity}</Text>
            </View>
            {normalizeText(activity?.teamName) ? (
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>{SECTION_LABELS.teamName}</Text>
                <Text style={styles.infoItemValue}>{normalizeText(activity.teamName)}</Text>
              </View>
            ) : null}
          </View>
        </DetailSection>

        <DetailSection title={SECTION_LABELS.participation} icon="bar-chart-outline" theme="blue">
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {currentParticipants}
              {hasParticipantLimit ? ` / ${maxParticipants}` : ''}
            </Text>
            <Text style={styles.progressCaption}>
              {hasParticipantLimit ? SECTION_LABELS.maxParticipants : SECTION_LABELS.unlimited}
            </Text>
          </View>
          {hasParticipantLimit ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
              </View>
              <Text style={styles.progressFootnote}>
                {Math.round(progressRatio * 100)}
                %
              </Text>
            </>
          ) : null}

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{SECTION_LABELS.currentParticipants}</Text>
              <Text style={styles.metricValue}>{currentParticipants}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{SECTION_LABELS.maxParticipants}</Text>
              <Text style={styles.metricValue}>
                {hasParticipantLimit ? maxParticipants : SECTION_LABELS.unlimited}
              </Text>
            </View>
          </View>
        </DetailSection>

        <DetailSection title={SECTION_LABELS.timeline} icon="calendar-outline" theme="slate">
          <View style={styles.infoList}>
            {scheduleText ? (
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>{t('screens.activity.detail.schedule')}</Text>
                <Text style={styles.infoItemValue}>{scheduleText}</Text>
              </View>
            ) : null}
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{t('screens.activity.detail.location')}</Text>
              <Text style={styles.infoItemValue}>
                {location || (activity?.type === 'online' ? SECTION_LABELS.online : '--')}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>{t('screens.activity.detail.participants')}</Text>
              <Text style={styles.infoItemValue}>
                {formatParticipantValue(activity?.joinCount ?? activity?.participants)}
              </Text>
            </View>
          </View>
        </DetailSection>

        <DetailSection title={SECTION_LABELS.reward} icon="gift-outline" theme="amber">
          <Text style={styles.sectionBody}>{reward || SECTION_LABELS.noReward}</Text>
        </DetailSection>

        <DetailSection title={SECTION_LABELS.rules} icon="document-text-outline" theme="emerald">
          <Text style={styles.sectionBody}>{rules || SECTION_LABELS.noRules}</Text>
        </DetailSection>

        {hasQuestionBinding ? (
          <DetailSection title={SECTION_LABELS.question} icon="help-buoy-outline" theme="rose">
            <View style={styles.questionCard}>
              <Ionicons name="help-buoy-outline" size={20} color="#ef4444" />
              <View style={styles.questionContent}>
                <Text style={styles.questionLabel}>{SECTION_LABELS.relatedQuestion}</Text>
                <Text style={styles.questionValue}>{questionDisplayTitle}</Text>
              </View>
            </View>
          </DetailSection>
        ) : null}

        {tags.length > 0 ? (
          <DetailSection title={SECTION_LABELS.tags} icon="pricetags-outline" theme="violet">
            <View style={styles.tagRow}>
              {tags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </DetailSection>
        ) : null}

        {detailLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.loadingText}>{SECTION_LABELS.loading}</Text>
          </View>
        ) : null}

        {detailError ? (
          <View style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
              <View style={styles.errorTextWrap}>
                <Text style={styles.errorTitle}>{SECTION_LABELS.loadFailed}</Text>
                <Text style={styles.errorText}>{detailError}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadDetail()}>
              <Text style={styles.retryButtonText}>{SECTION_LABELS.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {isOwnedByCurrentUser ? null : (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          <View style={styles.footerTextWrap}>
            <Text style={styles.footerTitle}>{footerButtonLabel}</Text>
            <Text style={styles.footerHint}>{footerHint}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={isEnded || joining ? 1 : 0.9}
            disabled={isEnded || joining}
            onPress={handleToggleJoin}
            style={[
              styles.footerButton,
              isJoined && styles.footerButtonCancel,
              isEnded && styles.footerButtonEnded,
            ]}
          >
            <Text style={styles.footerButtonText}>{footerButtonLabel}</Text>
          </TouchableOpacity>
        </View>
      )}

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
    backgroundColor: '#fff7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnGlass: {
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: horizontalPadding,
    gap: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: scaleFont(16),
    color: '#6b7280',
    textAlign: 'center',
  },
  heroCard: {
    position: 'relative',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe4e6',
    shadowColor: '#ef4444',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroImage: {
    width: coverWidth,
    height: 280,
  },
  heroImageFrame: {
    width: coverWidth,
    height: 280,
    backgroundColor: '#f3f4f6',
  },
  heroImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#e5e7eb',
  },
  heroImagePending: {
    opacity: 0.12,
  },
  heroPlaceholder: {
    width: coverWidth,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbe2ea',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.08)',
  },
  heroTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  leftHeroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  onlineBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.92)',
  },
  offlineBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.94)',
  },
  officialBadge: {
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.96)',
  },
  statusBadgeJoined: {
    backgroundColor: 'rgba(16, 185, 129, 0.96)',
  },
  statusBadgeEnded: {
    backgroundColor: 'rgba(107, 114, 128, 0.96)',
  },
  badgeText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  previewBadge: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 4,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  heroInfoPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    paddingRight: 104,
    backgroundColor: 'rgba(17, 24, 39, 0.34)',
  },
  heroTitle: {
    fontSize: scaleFont(26),
    lineHeight: scaleFont(34),
    fontWeight: '800',
    color: '#fff',
  },
  heroMetaItem: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: scaleFont(13),
    flex: 1,
  },
  heroMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroMetaChipText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600',
    maxWidth: coverWidth - 120,
  },
  thumbnailRow: {
    gap: 10,
    paddingHorizontal: 2,
  },
  thumbnailButton: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#e5e7eb',
  },
  thumbnailButtonActive: {
    borderColor: '#ef4444',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryStatCard: {
    flex: 1,
    minWidth: (coverWidth - 20) / 3,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#fbe4e6',
    shadowColor: '#ef4444',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  summaryStatCardRose: {
    backgroundColor: '#fff1f2',
  },
  summaryStatCardBlue: {
    backgroundColor: '#f0f7ff',
  },
  summaryStatCardGreen: {
    backgroundColor: '#f0fdf4',
  },
  summaryStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryStatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatIconWarm: {
    backgroundColor: '#fff1f2',
  },
  summaryStatIconBlue: {
    backgroundColor: '#eff6ff',
  },
  summaryStatIconGreen: {
    backgroundColor: '#ecfdf5',
  },
  summaryStatLabel: {
    color: '#6b7280',
    fontSize: scaleFont(12),
    flex: 1,
  },
  summaryStatValue: {
    marginTop: 10,
    color: '#111827',
    fontSize: scaleFont(16),
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f4dfe2',
    shadowColor: '#ef4444',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionCardSlate: {
    backgroundColor: '#ffffff',
  },
  sectionCardRose: {
    backgroundColor: '#fff5f5',
  },
  sectionCardBlue: {
    backgroundColor: '#f8fbff',
  },
  sectionCardAmber: {
    backgroundColor: '#fff8ef',
  },
  sectionCardEmerald: {
    backgroundColor: '#f3fcf8',
  },
  sectionCardViolet: {
    backgroundColor: '#faf7ff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconSlate: {
    backgroundColor: '#334155',
  },
  sectionIconRose: {
    backgroundColor: '#ef4444',
  },
  sectionIconBlue: {
    backgroundColor: '#2563eb',
  },
  sectionIconAmber: {
    backgroundColor: '#f59e0b',
  },
  sectionIconEmerald: {
    backgroundColor: '#10b981',
  },
  sectionIconViolet: {
    backgroundColor: '#8b5cf6',
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#111827',
  },
  sectionBody: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(24),
    color: '#475569',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#fff',
  },
  organizerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  organizerAvatarFallbackText: {
    color: '#ef4444',
    fontSize: scaleFont(18),
    fontWeight: '800',
  },
  organizerContent: {
    marginLeft: 14,
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  organizerName: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#111827',
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  ownerBadgeText: {
    color: '#e11d48',
    fontSize: scaleFont(10),
    fontWeight: '700',
  },
  organizerIdentity: {
    marginTop: 4,
    fontSize: scaleFont(13),
    color: '#64748b',
  },
  infoList: {
    marginTop: 16,
    gap: 14,
  },
  infoItem: {
    paddingTop: 2,
  },
  infoItemLabel: {
    color: '#94a3b8',
    fontSize: scaleFont(12),
    marginBottom: 6,
  },
  infoItemValue: {
    color: '#111827',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    fontSize: scaleFont(24),
    fontWeight: '800',
    color: '#111827',
  },
  progressCaption: {
    color: '#94a3b8',
    fontSize: scaleFont(12),
  },
  progressTrack: {
    marginTop: 16,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  progressFootnote: {
    marginTop: 8,
    alignSelf: 'flex-end',
    color: '#ef4444',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  metricGrid: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: scaleFont(12),
  },
  metricValue: {
    marginTop: 10,
    color: '#111827',
    fontSize: scaleFont(16),
    fontWeight: '700',
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 14,
  },
  questionContent: {
    flex: 1,
  },
  questionLabel: {
    color: '#ef4444',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  questionValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  tagText: {
    color: '#ef4444',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#64748b',
    fontSize: scaleFont(13),
  },
  errorCard: {
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    color: '#b91c1c',
    fontSize: scaleFont(14),
    fontWeight: '700',
  },
  errorText: {
    marginTop: 6,
    color: '#7f1d1d',
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: horizontalPadding,
    paddingTop: 14,
    backgroundColor: 'rgba(255, 250, 250, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
    shadowColor: '#ef4444',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  footerTextWrap: {
    marginBottom: 10,
  },
  footerTitle: {
    color: '#111827',
    fontSize: scaleFont(15),
    fontWeight: '700',
  },
  footerHint: {
    marginTop: 4,
    color: '#64748b',
    fontSize: scaleFont(12),
  },
  footerButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  footerButtonCancel: {
    backgroundColor: '#f59e0b',
  },
  footerButtonEnded: {
    backgroundColor: '#9ca3af',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '800',
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
    fontSize: scaleFont(16),
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
    width: 20,
    backgroundColor: '#fff',
  },
});
