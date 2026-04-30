import React from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ImagePickerSheet from '../components/ImagePickerSheet';
import { API_ENDPOINTS } from '../config/api';
import { getApiServerUrl } from '../config/env';
import { useTranslation } from '../i18n/withTranslation';
import ActivityCreationForm from '../components/ActivityCreationForm';
import DateTimePickerModal from '../components/DateTimePickerModal';
import KeyboardDismissView from '../components/KeyboardDismissView';
import useKeyboardVisibility from '../hooks/useKeyboardVisibility';
import uploadApi from '../services/api/uploadApi';
import useCreateActivityForm from '../hooks/useCreateActivityForm';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';
import { buildActivityFormCopy } from '../utils/createActivityShared';

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

const pickFirstNonEmptyString = values =>
  values.find(value => typeof value === 'string' && value.trim())?.trim() || '';

const getImageUploadServerUrl = () =>
  String(getApiServerUrl(API_ENDPOINTS.UPLOAD.IMAGE) || '').replace(/\/+$/, '');

const normalizeUploadedImageUrl = rawUrl => {
  const normalizedUrl = String(rawUrl || '').trim();
  if (!normalizedUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(normalizedUrl) || /^data:image\//i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const imageUploadServerUrl = getImageUploadServerUrl();

  if (normalizedUrl.startsWith('//')) {
    const protocol = imageUploadServerUrl.startsWith('https://') ? 'https:' : 'http:';
    return `${protocol}${normalizedUrl}`;
  }

  if (!imageUploadServerUrl) {
    return normalizedUrl;
  }

  const normalizedPath = normalizedUrl.startsWith('/')
    ? normalizedUrl
    : `/${normalizedUrl.replace(/^\/+/, '')}`;

  return `${imageUploadServerUrl}${normalizedPath}`;
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
      return normalizeUploadedImageUrl(payload);
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
        return normalizeUploadedImageUrl(directUrl);
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
          return normalizeUploadedImageUrl(nestedUrl);
        }
      }
    }
  }

  return '';
};

export default function CreateActivityScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const formScrollRef = React.useRef(null);
  const focusedFieldRef = React.useRef(null);
  const routeTeamId = route?.params?.teamId ?? null;
  const routeTeamName = route?.params?.teamName ?? '';
  const questionId = route?.params?.questionId;
  const onActivityCreated = route?.params?.onActivityCreated;
  const keyboardVisible = useKeyboardVisibility(true);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [uploadingImages, setUploadingImages] = React.useState(false);
  const [uploadedImagePreviews, setUploadedImagePreviews] = React.useState([]);
  const copy = React.useMemo(() => buildActivityFormCopy(t, 'page'), [t]);
  const {
    activeTimeField,
    closeTeamSelector,
    form,
    handleOrganizerTypeChange,
    handleSelectDateTime,
    handleSelectTeam,
    openTeamSelector,
    removeImage,
    setActiveTimeField,
    showTeamSelector,
    submitActivity,
    submitting,
    teams,
    updateField,
  } = useCreateActivityForm({
    copy,
    questionId,
    lockedTeamId: routeTeamId,
    lockedTeamName: routeTeamName,
  });
  const displayForm = React.useMemo(
    () => ({
      ...form,
      images: form.images.map((imageUrl, index) => uploadedImagePreviews[index] || imageUrl),
    }),
    [form, uploadedImagePreviews]
  );

  React.useEffect(() => {
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

  const handleSubmit = React.useCallback(async () => {
    try {
      const createdActivity = await submitActivity();
      if (!createdActivity) {
        return;
      }

      showAppAlert(copy.successTitle, copy.successMessage, [
        {
          text: copy.successConfirm,
          onPress: () => {
            if (typeof onActivityCreated === 'function') {
              onActivityCreated(createdActivity);
            }
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to create activity:', error);
      showAppAlert(copy.validationHint, error?.message || copy.successMessage);
    }
  }, [copy, navigation, onActivityCreated, submitActivity]);

  const scrollAndroidBottomFieldIntoView = React.useCallback(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const currentField = focusedFieldRef.current;
    if (!['contact', 'location'].includes(currentField)) {
      return;
    }

    requestAnimationFrame(() => {
      formScrollRef.current?.scrollToEnd?.({ animated: true });
    });
  }, []);

  React.useEffect(() => {
    if (!keyboardVisible) {
      return;
    }

    scrollAndroidBottomFieldIntoView();
    const settleTimer = setTimeout(scrollAndroidBottomFieldIntoView, 180);

    return () => {
      clearTimeout(settleTimer);
    };
  }, [keyboardVisible, scrollAndroidBottomFieldIntoView]);

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
        console.error('Failed to upload activity image:', error);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardDismissView>
        <View style={styles.screenContent}>
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('screens.createActivity.title')}</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitBtn}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <Text style={styles.submitText}>{t('screens.createActivity.publish')}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            innerRef={ref => {
              formScrollRef.current = ref;
            }}
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentInsetAdjustmentBehavior="automatic"
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={Platform.OS === 'ios' ? 12 : 24}
            extraHeight={Platform.OS === 'android' ? 140 : 0}
            keyboardOpeningTime={0}
          >
            <ActivityCreationForm
              copy={copy}
              form={displayForm}
              lockedTeamId={routeTeamId}
              lockedTeamName={routeTeamName}
              bottomSpacerHeight={insets.bottom + (Platform.OS === 'android' && keyboardVisible ? 120 : 16)}
              onFieldFocus={fieldName => {
                focusedFieldRef.current = fieldName;

                if (Platform.OS === 'android' && ['contact', 'location'].includes(fieldName)) {
                  setTimeout(scrollAndroidBottomFieldIntoView, 60);
                  setTimeout(scrollAndroidBottomFieldIntoView, 220);
                }
              }}
              onAddImage={handleOpenImagePicker}
              onFieldChange={updateField}
              onOpenTeamSelector={openTeamSelector}
              onOpenTimeField={fieldName => {
                Keyboard.dismiss();
                setTimeout(() => setActiveTimeField(fieldName), 40);
              }}
              onOrganizerTypeChange={handleOrganizerTypeChange}
              onRemoveImage={handleRemoveImage}
              onSelectTeam={handleSelectTeam}
              showTeamSelector={showTeamSelector}
              teams={teams}
              onCloseTeamSelector={closeTeamSelector}
              timeInputMode="picker"
            />
          </KeyboardAwareScrollView>

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
        </View>
      </KeyboardDismissView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenContent: {
    flex: 1,
  },
  formScrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeBtn: {
    padding: 8,
    width: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  submitBtn: {
    padding: 8,
    minWidth: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: scaleFont(16),
    color: '#ef4444',
    fontWeight: '600',
  },
});
