import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ActivityCreationForm from '../components/ActivityCreationForm';
import AppAlertContainer from '../components/AppAlertContainer';
import DateTimePickerModal from '../components/DateTimePickerModal';
import ImagePickerSheet from '../components/ImagePickerSheet';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import uploadApi from '../services/api/uploadApi';
import activityApi from '../services/api/activityApi';
import useCreateActivityForm from '../hooks/useCreateActivityForm';
import { showToast } from '../utils/toast';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { resolveComposerTopInset } from '../utils/composerLayout';
import { scaleFont } from '../utils/responsive';
import { buildActivityFormCopy } from '../utils/createActivityShared';
import {
  getJoinedActivityState,
  getJoinedActivityStateFromResponse,
  getQuitActivityState,
  getQuitActivityStateFromResponse,
  isActivityJoined,
  normalizeActivityItem,
  normalizeActivityList,
} from '../utils/activityUtils';

let imageManipulatorModule = null;
let imageManipulatorResolved = false;

const getImageManipulatorModule = () => {
  if (imageManipulatorResolved) {
    return imageManipulatorModule;
  }

  imageManipulatorResolved = true;

  try {
    const requiredModule = require('expo-image-manipulator');
    imageManipulatorModule = requiredModule?.default || requiredModule;
  } catch (error) {
    console.warn('Image manipulator module is not available in the current native build.', error);
    imageManipulatorModule = null;
  }

  return imageManipulatorModule;
};

const pickFirstNonEmptyString = values =>
  values.find(value => typeof value === 'string' && value.trim())?.trim() || '';

const resolveUploadImageMimeType = (uri = '', asset = null) => {
  const directMimeType = String(asset?.mimeType || asset?.type || '').trim().toLowerCase();
  if (directMimeType.startsWith('image/')) {
    return directMimeType;
  }

  const normalizedUri = String(uri || '').split('?')[0].toLowerCase();
  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }
  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }
  if (normalizedUri.endsWith('.gif')) {
    return 'image/gif';
  }

  return 'image/jpeg';
};

const getLocalImageSize = async uri => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return Number(blob?.size) || 0;
  } catch (error) {
    console.warn('Failed to inspect local image size before upload:', error);
    return 0;
  }
};

const ensureFileNameHasExtension = (fileName, extension = 'jpg') => {
  const normalizedFileName = String(fileName || '').trim();
  if (!normalizedFileName) {
    return `activity_${Date.now()}.${extension}`;
  }

  return /\.[a-z0-9]+$/i.test(normalizedFileName)
    ? normalizedFileName
    : `${normalizedFileName}.${extension}`;
};

const prepareActivityImageForUpload = async (imageUri, asset = {}) => {
  const originalMimeType = resolveUploadImageMimeType(imageUri, asset);
  const originalName =
    String(asset?.fileName || asset?.name || '').trim() ||
    imageUri.split('/').pop() ||
    `activity_${Date.now()}.jpg`;

  const ImageManipulator = getImageManipulatorModule();
  const manipulateAsync = ImageManipulator?.manipulateAsync;
  const SaveFormat = ImageManipulator?.SaveFormat;

  if (typeof manipulateAsync !== 'function' || !SaveFormat?.JPEG) {
    return {
      uri: imageUri,
      name: originalName,
      type: originalMimeType,
      size: await getLocalImageSize(imageUri),
    };
  }

  const originalWidth = Number(asset?.width) || 0;
  const resizeActions = [];

  if (originalWidth > 1600) {
    resizeActions.push({
      resize: {
        width: 1600,
      },
    });
  }

  const firstPass = await manipulateAsync(imageUri, resizeActions, {
    compress: 0.78,
    format: SaveFormat.JPEG,
  });

  let preparedResult = firstPass;
  let preparedSize = await getLocalImageSize(firstPass?.uri || imageUri);

  if (preparedSize > 4.5 * 1024 * 1024) {
    const secondPassActions = (Number(firstPass?.width) || originalWidth) > 1280
      ? [
          {
            resize: {
              width: 1280,
            },
          },
        ]
      : [];

    preparedResult = await manipulateAsync(firstPass?.uri || imageUri, secondPassActions, {
      compress: 0.55,
      format: SaveFormat.JPEG,
    });
    preparedSize = await getLocalImageSize(preparedResult?.uri || firstPass?.uri || imageUri);
  }

  return {
    uri: preparedResult?.uri || firstPass?.uri || imageUri,
    name: ensureFileNameHasExtension(
      originalName.replace(/\.(heic|heif|png|webp)$/i, ''),
      'jpg'
    ),
    type: 'image/jpeg',
    size: preparedSize,
  };
};

const extractUploadedImageUrl = response => {
  const payloadCandidates = [
    response?.data,
    response?.data?.data,
    response?.data?.result,
    response?.result,
    response,
  ].filter(Boolean);

  for (let index = 0; index < payloadCandidates.length; index += 1) {
    const payload = payloadCandidates[index];

    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const directUrl = pickFirstNonEmptyString([
        payload.url,
        payload.imageUrl,
        payload.fileUrl,
        payload.link,
        payload.path,
        typeof payload.data === 'string' ? payload.data : '',
      ]);

      if (directUrl) {
        return directUrl;
      }

      if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        const nestedUrl = pickFirstNonEmptyString([
          payload.data.url,
          payload.data.imageUrl,
          payload.data.fileUrl,
          payload.data.link,
          payload.data.path,
        ]);

        if (nestedUrl) {
          return nestedUrl;
        }
      }
    }
  }

  return '';
};

const extractActivityRows = response => {
  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }

  if (Array.isArray(response?.data?.list)) {
    return response.data.list;
  }

  if (Array.isArray(response?.data?.records)) {
    return response.data.records;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const isSuccessfulActivityResponse = response =>
  response?.code === 0 ||
  response?.code === 200 ||
  Array.isArray(response?.data) ||
  Array.isArray(response?.rows);

const toPositiveInt = value => {
  const normalizedValue = Number(value);
  return Number.isInteger(normalizedValue) && normalizedValue > 0 ? normalizedValue : 0;
};

const normalizeComparableText = value => String(value ?? '').trim();

const matchesContext = (activity, { teamId, teamName, questionId, questionTitle }) => {
  if (teamId > 0) {
    if (toPositiveInt(activity?.teamId) === teamId) {
      return true;
    }

    const normalizedTeamName = normalizeComparableText(teamName);
    if (!normalizedTeamName) {
      return false;
    }

    const activityTeamCandidates = [
      activity?.teamName,
      activity?.organizer,
      activity?.organizerName,
      activity?.sponsorName,
    ].map(normalizeComparableText);

    return activityTeamCandidates.includes(normalizedTeamName);
  }

  if (questionId > 0) {
    if (toPositiveInt(activity?.questionId) === questionId) {
      return true;
    }

    const normalizedQuestionTitle = normalizeComparableText(questionTitle);
    if (!normalizedQuestionTitle) {
      return false;
    }

    const activityQuestionCandidates = [
      activity?.questionTitle,
      activity?.questionName,
      activity?.title,
    ].map(normalizeComparableText);

    return activityQuestionCandidates.includes(normalizedQuestionTitle);
  }

  return true;
};

const getRequestErrorMessage = (error, fallbackMessage) => {
  const candidates = [
    error?.message,
    error?.msg,
    error?.data?.msg,
    error?.data?.message,
    error?.response?.data?.msg,
    error?.response?.data?.message,
  ];

  return candidates.find(candidate => typeof candidate === 'string' && candidate.trim()) || fallbackMessage;
};

const sortActivitiesByTimeDesc = (items = []) =>
  [...items].sort((left, right) => {
    const rightTimestamp = new Date(right?.startTimeRaw || right?.startTime || 0).getTime() || 0;
    const leftTimestamp = new Date(left?.startTimeRaw || left?.startTime || 0).getTime() || 0;

    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return toPositiveInt(right?.id) - toPositiveInt(left?.id);
  });

const buildOptimisticCreatedActivity = ({
  createdActivity,
  form,
  contextTeamId,
  contextTeamName,
  contextQuestionId,
  contextQuestionTitle,
}) => normalizeActivityItem({
  ...(createdActivity || {}),
  id: createdActivity?.id ?? Date.now(),
  title: createdActivity?.title || form.title.trim(),
  description: createdActivity?.description || form.description.trim(),
  desc: createdActivity?.desc || createdActivity?.description || form.description.trim(),
  images: Array.isArray(createdActivity?.images) && createdActivity.images.length > 0
    ? createdActivity.images
    : form.images,
  image: createdActivity?.image || createdActivity?.coverImage || form.images[0] || null,
  coverImage: createdActivity?.coverImage || createdActivity?.image || form.images[0] || null,
  startTime: createdActivity?.startTime || form.startTime,
  endTime: createdActivity?.endTime || form.endTime,
  startTimeRaw: createdActivity?.startTimeRaw || createdActivity?.startTime || form.startTime,
  endTimeRaw: createdActivity?.endTimeRaw || createdActivity?.endTime || form.endTime,
  location: createdActivity?.location || form.location.trim(),
  address: createdActivity?.address || createdActivity?.location || form.location.trim(),
  type: createdActivity?.type || form.activityType,
  sponsorType: createdActivity?.sponsorType ?? (contextTeamId > 0 ? 2 : form.organizerType === 'team' ? 2 : 1),
  teamId: createdActivity?.teamId ?? (contextTeamId > 0 ? contextTeamId : form.teamId),
  teamName: createdActivity?.teamName || contextTeamName || form.teamName,
  questionId: createdActivity?.questionId ?? (contextQuestionId > 0 ? contextQuestionId : undefined),
  questionTitle: createdActivity?.questionTitle || contextQuestionTitle,
  participants: createdActivity?.participants ?? createdActivity?.joinCount ?? 0,
  joinCount: createdActivity?.joinCount ?? createdActivity?.participants ?? 0,
  currentParticipants: createdActivity?.currentParticipants ?? createdActivity?.joinCount ?? createdActivity?.participants ?? 0,
  joined: Boolean(createdActivity?.joined || createdActivity?.isJoined),
  isJoined: Boolean(createdActivity?.joined || createdActivity?.isJoined),
  organizer: createdActivity?.organizer || createdActivity?.organizerName || contextTeamName || form.teamName || '',
  organizerName: createdActivity?.organizerName || createdActivity?.organizer || contextTeamName || form.teamName || '',
  status: createdActivity?.status || 'active',
  statusName: createdActivity?.statusName || '',
});

export default function QuestionActivityListScreen({ navigation, route }) {
  const { t } = useTranslation();
  const activityAlertRef = useRef(null);
  const insets = useSafeAreaInsets();
  const initialTopInset = initialWindowMetrics?.insets?.top ?? 0;
  const activityModalTopInset = resolveComposerTopInset({
    platform: Platform.OS,
    topInset: insets.top,
    initialTopInset,
  });
  const bottomSafeInset = useBottomSafeInset(20);
  const {
    openCreateModal,
    questionId: routeQuestionId,
    questionTitle = '',
    teamId: routeTeamId,
    teamName = '',
  } = route?.params || {};
  const contextQuestionId = useMemo(() => toPositiveInt(routeQuestionId), [routeQuestionId]);
  const contextTeamId = useMemo(() => toPositiveInt(routeTeamId), [routeTeamId]);
  const hasTeamContext = contextTeamId > 0;
  const contextSubtitle = hasTeamContext ? String(teamName || '').trim() : String(questionTitle || '').trim();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [joiningActivityIds, setJoiningActivityIds] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedImagePreviews, setUploadedImagePreviews] = useState([]);

  const copy = useMemo(() => buildActivityFormCopy(t, 'modal'), [t]);
  const {
    activeTimeField,
    closeTeamSelector,
    form,
    handleOrganizerTypeChange,
    handleSelectDateTime,
    handleSelectTeam,
    openTeamSelector,
    removeImage,
    resetForm,
    setActiveTimeField,
    showTeamSelector,
    submitActivity,
    submitting,
    teams,
    updateField,
  } = useCreateActivityForm({
    copy,
    questionId: contextQuestionId || undefined,
    requireQuestionId: !hasTeamContext,
    lockedTeamId: hasTeamContext ? contextTeamId : null,
    lockedTeamName: hasTeamContext ? teamName : '',
    visible: showActivityModal,
  });

  const displayForm = useMemo(
    () => ({
      ...form,
      images: form.images.map((imageUrl, index) => uploadedImagePreviews[index] || imageUrl),
    }),
    [form, uploadedImagePreviews]
  );

  const showActivityAlert = useCallback((title, message, buttons = [], options = {}) => {
    if (activityAlertRef.current?.showAlert) {
      activityAlertRef.current.showAlert(title, message, buttons, options);
    }
  }, []);

  const loadActivities = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await activityApi.getActivityCenterList({ tab: 'all' });

      if (!isSuccessfulActivityResponse(response)) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      const rows = normalizeActivityList(extractActivityRows(response)).filter(activity =>
        matchesContext(activity, {
          teamId: contextTeamId,
          teamName,
          questionId: contextQuestionId,
          questionTitle,
        })
      );

      setActivities(sortActivitiesByTimeDesc(rows));
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to load activities for contextual list:', error);
      setErrorMessage(getRequestErrorMessage(error, t('common.serverError')));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [contextQuestionId, contextTeamId, questionTitle, t, teamName]);

  useFocusEffect(
    useCallback(() => {
      void loadActivities();
    }, [loadActivities])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadActivities({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadActivities]);

  const syncActivityFromDetail = useCallback(nextActivity => {
    const normalizedActivity = normalizeActivityItem(nextActivity);

    if (!normalizedActivity) {
      return;
    }

    setActivities(currentActivities =>
      sortActivitiesByTimeDesc(
        currentActivities.map(activity =>
          toPositiveInt(activity?.id) === toPositiveInt(normalizedActivity?.id) ? normalizedActivity : activity
        )
      )
    );
  }, []);

  const handleOpenActivity = useCallback(activity => {
    navigation.navigate('ActivityDetail', {
      activityId: activity?.id,
      activity,
      questionTitle: activity?.questionTitle || questionTitle,
      onActivityChange: syncActivityFromDetail,
    });
  }, [navigation, questionTitle, syncActivityFromDetail]);

  const handleJoinActivity = useCallback(async activity => {
    const activityId = toPositiveInt(activity?.id);

    if (!activityId || joiningActivityIds.includes(activityId)) {
      return;
    }

    const previousActivityState = normalizeActivityItem(activity);
    const wasJoined = isActivityJoined(previousActivityState);

    setJoiningActivityIds(currentIds => [...currentIds, activityId]);
    setActivities(currentActivities =>
      currentActivities.map(currentActivity => {
        if (toPositiveInt(currentActivity?.id) !== activityId) {
          return currentActivity;
        }

        return wasJoined
          ? getQuitActivityState(currentActivity) || currentActivity
          : getJoinedActivityState(currentActivity) || currentActivity;
      })
    );

    try {
      const response = wasJoined
        ? await activityApi.cancelActivity(activityId)
        : await activityApi.joinActivity(activityId);

      const isSuccess = response?.code === 0 || response?.code === 200;
      if (!isSuccess) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      setActivities(currentActivities =>
        currentActivities.map(currentActivity => {
          if (toPositiveInt(currentActivity?.id) !== activityId) {
            return currentActivity;
          }

          return wasJoined
            ? getQuitActivityStateFromResponse(currentActivity, response?.data || response) ||
                getQuitActivityState(currentActivity) ||
                currentActivity
            : getJoinedActivityStateFromResponse(currentActivity, response?.data || response) ||
                getJoinedActivityState(currentActivity) ||
                currentActivity;
        })
      );

      showToast(
        wasJoined
          ? t('screens.questionActivityList.cancelSuccess')
          : t('screens.questionActivityList.joinSuccess'),
        wasJoined ? 'info' : 'success'
      );
    } catch (error) {
      console.error('Failed to update activity join state:', error);
      setActivities(currentActivities =>
        currentActivities.map(currentActivity =>
          toPositiveInt(currentActivity?.id) === activityId
            ? previousActivityState || currentActivity
            : currentActivity
        )
      );
      showToast(getRequestErrorMessage(error, t('common.serverError')), 'error');
    } finally {
      setJoiningActivityIds(currentIds => currentIds.filter(id => id !== activityId));
    }
  }, [joiningActivityIds, t]);

  const handleSubmitActivity = useCallback(async () => {
    try {
      const createdActivity = await submitActivity();
      if (!createdActivity) {
        return;
      }

      const optimisticActivity = buildOptimisticCreatedActivity({
        createdActivity,
        form,
        contextTeamId,
        contextTeamName: teamName,
        contextQuestionId,
        contextQuestionTitle: questionTitle,
      });

      showActivityAlert(copy.successTitle, copy.successMessage, [
        {
          text: copy.successConfirm,
          onPress: () => {
            if (optimisticActivity && matchesContext(optimisticActivity, {
              teamId: contextTeamId,
              teamName,
              questionId: contextQuestionId,
              questionTitle,
            })) {
              setActivities(currentActivities => {
                const deduplicatedActivities = currentActivities.filter(
                  activity => toPositiveInt(activity?.id) !== toPositiveInt(optimisticActivity?.id)
                );
                return sortActivitiesByTimeDesc([optimisticActivity, ...deduplicatedActivities]);
              });
            }

            resetForm();
            setUploadedImagePreviews([]);
            setActiveTimeField(null);
            setShowImagePicker(false);

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setShowActivityModal(false);
                void loadActivities({ showLoading: false });
              });
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to create activity from contextual activity list:', error);
      showActivityAlert(copy.validationHint, error?.message || copy.successMessage, [
        { text: copy.successConfirm },
      ]);
    }
  }, [
    contextQuestionId,
    contextTeamId,
    copy.successConfirm,
    copy.successMessage,
    copy.successTitle,
    copy.validationHint,
    form,
    loadActivities,
    questionTitle,
    resetForm,
    setActiveTimeField,
    showActivityAlert,
    submitActivity,
    teamName,
  ]);

  useEffect(() => {
    if (!openCreateModal) {
      return;
    }

    setShowActivityModal(true);
    navigation.setParams({
      openCreateModal: undefined,
    });
  }, [navigation, openCreateModal]);

  useEffect(() => {
    setUploadedImagePreviews(current => {
      if (form.images.length === 0) {
        return current.length > 0 ? [] : current;
      }

      if (current.length <= form.images.length) {
        return current;
      }

      return current.slice(0, form.images.length);
    });
  }, [form.images.length]);

  const handleOpenImagePicker = useCallback(() => {
    if (uploadingImages) {
      showToast('图片上传中，请稍候', 'info');
      return;
    }

    if (form.images.length >= 9) {
      showToast(copy.validationImagesMaxLimit, 'warning');
      return;
    }

    setShowImagePicker(true);
  }, [copy.validationImagesMaxLimit, form.images.length, uploadingImages]);

  const handleActivityImageSelected = useCallback(
    async (imageUri, meta = {}) => {
      if (!imageUri) {
        return;
      }

      if (form.images.length >= 9) {
        showToast(copy.validationImagesMaxLimit, 'warning');
        return;
      }

      try {
        setUploadingImages(true);
        showToast('图片上传中...', 'info');

        const asset = meta?.asset || {};
        const preparedFile = await prepareActivityImageForUpload(imageUri, asset);

        const response = await uploadApi.uploadImage({
          uri: preparedFile.uri,
          name: preparedFile.name,
          type: preparedFile.type,
        });

        const code = Number(response?.code ?? response?.data?.code);
        const uploadedUrl = extractUploadedImageUrl(response);
        const previewUri = preparedFile.uri || imageUri;

        if ((code !== 0 && code !== 200) || !uploadedUrl) {
          throw new Error(
            response?.msg ||
              response?.message ||
              response?.data?.msg ||
              response?.data?.message ||
              '图片上传失败'
          );
        }

        setUploadedImagePreviews(current => [...current, previewUri]);
        updateField('images', [...form.images, uploadedUrl]);
        showToast('图片上传成功', 'success');
      } catch (error) {
        console.error('Failed to upload activity image from contextual flow:', error);
        showToast(error?.message || '图片上传失败，请稍后重试', 'error');
      } finally {
        setUploadingImages(false);
        setShowImagePicker(false);
      }
    },
    [copy.validationImagesMaxLimit, form.images, updateField]
  );

  const handleRemoveImage = useCallback(
    index => {
      setUploadedImagePreviews(current => current.filter((_, imageIndex) => imageIndex !== index));
      removeImage(index);
    },
    [removeImage]
  );

  const stats = useMemo(() => ({
    totalActivities: activities.length,
    enrollingCount: activities.filter(activity => activity?.status === 'active').length,
    totalParticipants: activities.reduce(
      (sum, activity) => sum + Number(activity?.participants || activity?.joinCount || 0),
      0
    ),
  }), [activities]);

  const getStatusLabel = useCallback(activity => {
    if (activity?.status === 'ended') {
      return t('activity.ended');
    }

    if (activity?.status === 'active') {
      return t('screens.questionActivityList.status.enrolling');
    }

    return t('screens.questionActivityList.status.starting');
  }, [t]);

  const getActivityTypeLabel = useCallback(activity => {
    if (activity?.type === 'offline') {
      return t('screens.questionActivityList.activityType.offline');
    }

    return t('screens.questionActivityList.activityType.online');
  }, [t]);

  const pageTitle = hasTeamContext ? '团队活动' : t('screens.questionActivityList.title');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{pageTitle}</Text>
            {contextSubtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {contextSubtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerActionSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          {contextSubtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {contextSubtitle}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => setShowActivityModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.publishBtnText}>{t('screens.questionActivityList.publish')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        )}
      >
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalActivities}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalActivities')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.enrollingCount}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.enrolling')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalParticipants}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalParticipants')}</Text>
          </View>
        </View>

        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.questionActivityList.activityList')}</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadActivities()}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={52} color="#d1d5db" />
              <Text style={styles.emptyTitle}>{t('common.noData')}</Text>
              <Text style={styles.emptyHint}>
                {hasTeamContext ? '当前团队还没有活动，先创建一个吧' : '当前问题还没有关联活动，先创建一个吧'}
              </Text>
            </View>
          ) : (
            activities.map(activity => {
              const normalizedActivityId = toPositiveInt(activity?.id);
              const joined = isActivityJoined(activity);
              const joining = joiningActivityIds.includes(normalizedActivityId);

              return (
                <TouchableOpacity
                  key={String(activity?.id)}
                  style={styles.activityCard}
                  activeOpacity={0.9}
                  onPress={() => handleOpenActivity(activity)}
                >
                  <View style={styles.activityHeader}>
                    <View style={[styles.activityTypeTag, activity.type === 'offline' && styles.activityTypeTagOffline]}>
                      <Ionicons
                        name={activity.type === 'offline' ? 'location' : 'videocam'}
                        size={12}
                        color={activity.type === 'offline' ? '#22c55e' : '#3b82f6'}
                      />
                      <Text style={[styles.activityTypeText, activity.type === 'offline' && styles.activityTypeTextOffline]}>
                        {getActivityTypeLabel(activity)}
                      </Text>
                    </View>
                    <View style={[styles.activityStatusTag, activity.status === 'ended' && styles.activityStatusTagEnded]}>
                      <Text style={[styles.activityStatusText, activity.status === 'ended' && styles.activityStatusTextEnded]}>
                        {getStatusLabel(activity)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription} numberOfLines={2}>
                    {activity.description || activity.desc || ''}
                  </Text>

                  <View style={styles.activityInfo}>
                    <View style={styles.activityInfoRow}>
                      <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                      <Text style={styles.activityInfoText}>
                        {[activity.startTime, activity.endTime].filter(Boolean).join(' - ') || '-'}
                      </Text>
                    </View>
                    <View style={styles.activityInfoRow}>
                      <Ionicons
                        name={activity.type === 'offline' ? 'location-outline' : 'videocam-outline'}
                        size={14}
                        color="#9ca3af"
                      />
                      <Text style={styles.activityInfoText} numberOfLines={1}>
                        {activity.location || activity.address || '-'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.activityFooter}>
                    <View style={styles.activityOrganizer}>
                      {activity.sponsorAvatar || activity.teamAvatar ? (
                        <Image
                          source={{ uri: activity.sponsorAvatar || activity.teamAvatar }}
                          style={styles.organizerAvatar}
                        />
                      ) : (
                        <View style={[styles.organizerAvatar, styles.organizerAvatarPlaceholder]}>
                          <Ionicons
                            name={activity.teamId ? 'people' : 'person'}
                            size={16}
                            color="#9ca3af"
                          />
                        </View>
                      )}
                      <View style={styles.organizerInfo}>
                        <Text style={styles.organizerLabel}>{t('screens.questionActivityList.organizer')}</Text>
                        <Text style={styles.organizerName} numberOfLines={1}>
                          {activity.organizer || activity.teamName || '-'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityActions}>
                      <View style={styles.participantsInfo}>
                        <Ionicons name="people" size={14} color="#6b7280" />
                        <Text style={styles.participantsText}>
                          {activity.participants || 0}
                          {activity.maxParticipants ? `/${activity.maxParticipants}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.joinBtn,
                          joined && styles.joinBtnActive,
                          joining && styles.joinBtnDisabled,
                        ]}
                        onPress={() => handleJoinActivity(activity)}
                        disabled={joining}
                      >
                        {joining ? (
                          <ActivityIndicator
                            size="small"
                            color={joined ? '#22c55e' : '#fff'}
                          />
                        ) : (
                          <Ionicons
                            name={joined ? 'checkmark-circle' : 'add-circle-outline'}
                            size={16}
                            color={joined ? '#22c55e' : '#fff'}
                          />
                        )}
                        <Text style={[styles.joinBtnText, joined && styles.joinBtnTextActive]}>
                          {joined
                            ? t('screens.questionActivityList.joined')
                            : t('screens.questionActivityList.join')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.emptySpace} />
      </ScrollView>

      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <KeyboardDismissView>
            <SafeAreaView style={styles.activityModal} edges={['bottom']}>
              <View style={[styles.activityModalHeader, { paddingTop: activityModalTopInset + 8 }]}>
                <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.activityCloseBtn}>
                  <Ionicons name="close" size={26} color="#333" />
                </TouchableOpacity>
                <View style={styles.activityHeaderCenter}>
                  <Text style={styles.activityModalTitle}>{t('screens.questionActivityList.modal.createTitle')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.activityPublishBtn, (!form.title.trim() || submitting) && styles.activityPublishBtnDisabled]}
                  onPress={handleSubmitActivity}
                  disabled={!form.title.trim() || submitting}
                >
                  <Text style={styles.activityPublishText}>{t('screens.questionActivityList.modal.publish')}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.activityFormArea}
                contentContainerStyle={[styles.activityFormContent, { paddingBottom: bottomSafeInset + 28 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                <ActivityCreationForm
                  copy={{ ...copy, boundQuestionLabel: t('screens.questionActivityList.modal.boundQuestion') }}
                  form={displayForm}
                  lockedTeamId={hasTeamContext ? contextTeamId : null}
                  lockedTeamName={hasTeamContext ? teamName : ''}
                  boundQuestionTitle={!hasTeamContext ? questionTitle : ''}
                  bottomSpacerHeight={bottomSafeInset + 16}
                  onAddImage={handleOpenImagePicker}
                  onFieldChange={updateField}
                  onOpenTimeField={fieldName => {
                    Keyboard.dismiss();
                    setTimeout(() => setActiveTimeField(fieldName), 40);
                  }}
                  onOpenTeamSelector={openTeamSelector}
                  onOrganizerTypeChange={handleOrganizerTypeChange}
                  onRemoveImage={handleRemoveImage}
                  onSelectTeam={handleSelectTeam}
                  showTeamSelector={showTeamSelector}
                  teams={teams}
                  onCloseTeamSelector={closeTeamSelector}
                  timeInputMode="picker"
                />
              </ScrollView>

              <DateTimePickerModal
                visible={Boolean(activeTimeField)}
                onClose={() => setActiveTimeField(null)}
                currentDateTime={activeTimeField ? form[activeTimeField] : ''}
                onSelect={value => handleSelectDateTime(activeTimeField, value)}
                title={activeTimeField === 'endTime' ? copy.timePickerEndTitle : copy.timePickerStartTitle}
                cancelText={copy.timePickerCancel}
                confirmText={copy.timePickerConfirm}
              />

              <ImagePickerSheet
                visible={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onImageSelected={handleActivityImageSelected}
                title={copy.imagesAdd}
              />

              <AppAlertContainer ref={activityAlertRef} />
            </SafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2,
  },
  headerActionSpacer: {
    width: 88,
  },
  publishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  publishBtnText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  activitiesSection: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    padding: 14,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    color: '#b91c1c',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  retryBtnText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#4b5563',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
    color: '#9ca3af',
    textAlign: 'center',
  },
  activityCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
  },
  activityTypeTagOffline: {
    backgroundColor: '#f0fdf4',
  },
  activityTypeText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
    color: '#3b82f6',
  },
  activityTypeTextOffline: {
    color: '#22c55e',
  },
  activityStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
  },
  activityStatusTagEnded: {
    backgroundColor: '#e5e7eb',
  },
  activityStatusText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
    color: '#f59e0b',
  },
  activityStatusTextEnded: {
    color: '#6b7280',
  },
  activityTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    lineHeight: scaleFont(20),
    marginBottom: 12,
  },
  activityInfo: {
    gap: 8,
    marginBottom: 12,
  },
  activityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityInfoText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    flex: 1,
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  activityOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  organizerAvatarPlaceholder: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerInfo: {
    flex: 1,
  },
  organizerLabel: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
  },
  organizerName: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#374151',
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  joinBtn: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinBtnActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  joinBtnDisabled: {
    opacity: 0.7,
  },
  joinBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '500',
  },
  joinBtnTextActive: {
    color: '#22c55e',
  },
  emptySpace: {
    height: 20,
  },
  modalKeyboardView: {
    flex: 1,
  },
  activityModal: {
    flex: 1,
    backgroundColor: modalTokens.surface,
  },
  activityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  activityCloseBtn: {
    width: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  activityModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  activityPublishBtn: {
    minWidth: 56,
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityPublishBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft,
  },
  activityPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600',
  },
  activityFormArea: {
    flex: 1,
    padding: 16,
    backgroundColor: modalTokens.surface,
  },
  activityFormContent: {
    flexGrow: 1,
  },
});
