import React, { useEffect } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import useCreateActivityForm from '../hooks/useCreateActivityForm';
import { showToast } from '../utils/toast';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { resolveComposerTopInset } from '../utils/composerLayout';
import { scaleFont } from '../utils/responsive';
import { buildActivityFormCopy } from '../utils/createActivityShared';

const activitiesData = [
  { id: 1, title: 'Python学习交流会', type: '线上活动', date: '2026-01-20', time: '19:00-21:00', location: '腾讯会议', participants: 45, maxParticipants: 100, organizer: '张三丰', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1', status: '报名中', description: '本次活动将邀请多位Python专家分享学习经验和实战技巧,适合零基础和有一定基础的学习者参加。' },
  { id: 2, title: 'Python实战项目分享', type: '线下活动', date: '2026-01-25', time: '14:00-17:00', location: '北京市海淀区中关村创业大街', participants: 28, maxParticipants: 50, organizer: 'Python老司机', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1', status: '报名中', description: '分享真实的Python项目开发经验,包括数据分析、Web开发等多个方向。' },
  { id: 3, title: '数据分析入门讲座', type: '线上活动', date: '2026-01-18', time: '20:00-21:30', location: 'Zoom会议', participants: 120, maxParticipants: 200, organizer: '数据分析师小王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer2', status: '即将开始', description: '从零开始学习数据分析,掌握Python数据分析的核心技能。' },
];

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

export default function QuestionActivityListScreen({ navigation, route }) {
  const { t } = useTranslation();
  const activityAlertRef = React.useRef(null);
  const { questionId, questionTitle } = route?.params || {};
  const insets = useSafeAreaInsets();
  const initialTopInset = initialWindowMetrics?.insets?.top ?? 0;
  const activityModalTopInset = resolveComposerTopInset({
    platform: Platform.OS,
    topInset: insets.top,
    initialTopInset,
  });
  const bottomSafeInset = useBottomSafeInset(20);
  const [joinedActivities, setJoinedActivities] = React.useState({});
  const [showActivityModal, setShowActivityModal] = React.useState(false);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [uploadingImages, setUploadingImages] = React.useState(false);
  const [uploadedImagePreviews, setUploadedImagePreviews] = React.useState([]);
  const copy = React.useMemo(() => buildActivityFormCopy(t, 'modal'), [t]);
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
    questionId,
    requireQuestionId: true,
    visible: showActivityModal,
  });
  const displayForm = React.useMemo(
    () => ({
      ...form,
      images: form.images.map((imageUrl, index) => uploadedImagePreviews[index] || imageUrl),
    }),
    [form, uploadedImagePreviews]
  );

  const showActivityAlert = React.useCallback((title, message, buttons = [], options = {}) => {
    if (activityAlertRef.current?.showAlert) {
      activityAlertRef.current.showAlert(title, message, buttons, options);
    }
  }, []);

  const handleJoinActivity = activityId => {
    setJoinedActivities(current => ({
      ...current,
      [activityId]: !current[activityId],
    }));

    if (!joinedActivities[activityId]) {
      showToast(t('screens.questionActivityList.joinSuccess'), 'success');
    } else {
      showToast(t('screens.questionActivityList.cancelSuccess'), 'info');
    }
  };

  const handleSubmitActivity = React.useCallback(async () => {
    try {
      const createdActivity = await submitActivity();
      if (!createdActivity) {
        return;
      }

      showActivityAlert(copy.successTitle, copy.successMessage, [
        {
          text: copy.successConfirm,
          onPress: () => {
            resetForm();
            setUploadedImagePreviews([]);
            setActiveTimeField(null);
            setShowImagePicker(false);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setShowActivityModal(false);
              });
            });
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to create activity from question activity list:', error);
      showActivityAlert(copy.validationHint, error?.message || copy.successMessage, [
        { text: copy.successConfirm },
      ]);
    }
  }, [
    copy.successConfirm,
    copy.successMessage,
    copy.successTitle,
    copy.validationHint,
    resetForm,
    setActiveTimeField,
    showActivityAlert,
    submitActivity,
  ]);

  useEffect(() => {
    if (!route?.params?.openCreateModal) {
      return;
    }

    setShowActivityModal(true);
    navigation.setParams({
      openCreateModal: undefined,
    });
  }, [navigation, route?.params?.openCreateModal]);

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

  const handleOpenImagePicker = React.useCallback(() => {
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

  const handleActivityImageSelected = React.useCallback(
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
        console.error('Failed to upload activity image from question flow:', error);
        showToast(error?.message || '图片上传失败，请稍后重试', 'error');
      } finally {
        setUploadingImages(false);
        setShowImagePicker(false);
      }
    },
    [copy.validationImagesMaxLimit, form.images, updateField]
  );

  const handleRemoveImage = React.useCallback(
    index => {
      setUploadedImagePreviews(current => current.filter((_, imageIndex) => imageIndex !== index));
      removeImage(index);
    },
    [removeImage]
  );

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
          <Text style={styles.headerTitle}>{t('screens.questionActivityList.title')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {questionTitle}
          </Text>
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
      >
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.length}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalActivities')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.filter(a => a.status === '报名中').length}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.enrolling')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.reduce((sum, activity) => sum + activity.participants, 0)}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalParticipants')}</Text>
          </View>
        </View>

        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.questionActivityList.activityList')}</Text>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="filter-outline" size={16} color="#6b7280" />
              <Text style={styles.filterText}>{t('screens.questionActivityList.filter')}</Text>
            </TouchableOpacity>
          </View>

          {activitiesData.map(activity => (
            <TouchableOpacity key={activity.id} style={styles.activityCard} activeOpacity={0.7}>
              <View style={styles.activityHeader}>
                <View style={styles.activityTypeTag}>
                  <Ionicons
                    name={activity.type === '线上活动' ? 'videocam' : 'location'}
                    size={12}
                    color={activity.type === '线上活动' ? '#3b82f6' : '#22c55e'}
                  />
                  <Text style={[styles.activityTypeText, { color: activity.type === '线上活动' ? '#3b82f6' : '#22c55e' }]}>
                    {activity.type === '线上活动'
                      ? t('screens.questionActivityList.activityType.online')
                      : t('screens.questionActivityList.activityType.offline')}
                  </Text>
                </View>
                <View style={[styles.activityStatusTag, activity.status === '即将开始' && styles.activityStatusTagUrgent]}>
                  <Text style={[styles.activityStatusText, activity.status === '即将开始' && styles.activityStatusTextUrgent]}>
                    {activity.status === '报名中'
                      ? t('screens.questionActivityList.status.enrolling')
                      : t('screens.questionActivityList.status.starting')}
                  </Text>
                </View>
              </View>

              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription} numberOfLines={2}>
                {activity.description}
              </Text>

              <View style={styles.activityInfo}>
                <View style={styles.activityInfoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                  <Text style={styles.activityInfoText}>
                    {activity.date} {activity.time}
                  </Text>
                </View>
                <View style={styles.activityInfoRow}>
                  <Ionicons
                    name={activity.type === '线上活动' ? 'videocam-outline' : 'location-outline'}
                    size={14}
                    color="#9ca3af"
                  />
                  <Text style={styles.activityInfoText} numberOfLines={1}>
                    {activity.location}
                  </Text>
                </View>
              </View>

              <View style={styles.activityFooter}>
                <View style={styles.activityOrganizer}>
                  <Image source={{ uri: activity.avatar }} style={styles.organizerAvatar} />
                  <View style={styles.organizerInfo}>
                    <Text style={styles.organizerLabel}>{t('screens.questionActivityList.organizer')}</Text>
                    <Text style={styles.organizerName}>{activity.organizer}</Text>
                  </View>
                </View>
                <View style={styles.activityActions}>
                  <View style={styles.participantsInfo}>
                    <Ionicons name="people" size={14} color="#6b7280" />
                    <Text style={styles.participantsText}>
                      {activity.participants}/{activity.maxParticipants}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinBtn, joinedActivities[activity.id] && styles.joinBtnActive]}
                    onPress={() => handleJoinActivity(activity.id)}
                  >
                    <Ionicons
                      name={joinedActivities[activity.id] ? 'checkmark-circle' : 'add-circle-outline'}
                      size={16}
                      color={joinedActivities[activity.id] ? '#22c55e' : '#fff'}
                    />
                    <Text style={[styles.joinBtnText, joinedActivities[activity.id] && styles.joinBtnTextActive]}>
                      {joinedActivities[activity.id] ? t('screens.questionActivityList.joined') : t('screens.questionActivityList.join')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptySpace} />
      </ScrollView>

      <Modal visible={showActivityModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent>
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
                  boundQuestionTitle={questionTitle}
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
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937' },
  headerSubtitle: { fontSize: scaleFont(12), color: '#9ca3af', marginTop: 2 },
  publishBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  publishBtnText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  content: { flex: 1 },
  statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 16, marginBottom: 8 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: scaleFont(20), fontWeight: 'bold', color: '#ef4444', marginBottom: 4 },
  statLabel: { fontSize: scaleFont(12), color: '#9ca3af' },
  statDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  activitiesSection: { backgroundColor: '#fff', paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  filterText: { fontSize: scaleFont(13), color: '#6b7280' },
  activityCard: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activityTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f0f9ff' },
  activityTypeText: { fontSize: scaleFont(11), fontWeight: '500' },
  activityStatusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f0fdf4' },
  activityStatusTagUrgent: { backgroundColor: '#fef3c7' },
  activityStatusText: { fontSize: scaleFont(11), fontWeight: '500', color: '#22c55e' },
  activityStatusTextUrgent: { color: '#f59e0b' },
  activityTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  activityDescription: { fontSize: scaleFont(14), color: '#6b7280', lineHeight: scaleFont(20), marginBottom: 12 },
  activityInfo: { gap: 8, marginBottom: 12 },
  activityInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityInfoText: { fontSize: scaleFont(13), color: '#6b7280', flex: 1 },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  activityOrganizer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  organizerAvatar: { width: 32, height: 32, borderRadius: 16 },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: scaleFont(10), color: '#9ca3af' },
  organizerName: { fontSize: scaleFont(13), fontWeight: '500', color: '#374151' },
  activityActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  participantsInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantsText: { fontSize: scaleFont(12), color: '#6b7280' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  joinBtnActive: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#22c55e' },
  joinBtnText: { fontSize: scaleFont(13), color: '#fff', fontWeight: '500' },
  joinBtnTextActive: { color: '#22c55e' },
  emptySpace: { height: 20 },
  modalKeyboardView: { flex: 1 },
  activityModal: { flex: 1, backgroundColor: modalTokens.surface },
  activityModalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  activityCloseBtn: { width: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  activityHeaderCenter: { flex: 1, alignItems: 'center' },
  activityModalTitle: { fontSize: scaleFont(17), fontWeight: '600', color: modalTokens.textPrimary },
  activityPublishBtn: { minWidth: 56, backgroundColor: modalTokens.danger, paddingHorizontal: modalTokens.actionPaddingX, paddingVertical: modalTokens.actionPaddingY, borderRadius: modalTokens.actionRadius, alignItems: 'center', justifyContent: 'center' },
  activityPublishBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  activityPublishText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  activityFormArea: { flex: 1, padding: 16, backgroundColor: modalTokens.surface },
  activityFormContent: { flexGrow: 1 },
});
