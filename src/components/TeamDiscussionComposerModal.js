import React from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import ComposerImageGrid from './ComposerImageGrid';
import ImagePickerSheet from './ImagePickerSheet';
import ComposerModalScaffold from './ComposerModalScaffold';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import { modalTokens } from './modalTokens';
import useMentionComposer from '../hooks/useMentionComposer';
import useRecommendedMentionUsers from '../hooks/useRecommendedMentionUsers';
import {
  appendComposerImage,
  isComposerImageLimitReached,
  removeComposerImageAt,
} from '../utils/composerImages';
import { DEFAULT_MENTION_PANEL_BASE_OFFSET } from '../utils/mentionComposer';
import { resolveComposerKeyboardMetrics } from '../utils/composerLayout';
import { scaleFont } from '../utils/responsive';
import { showToast } from '../utils/toast';

const TEAM_DISCUSSION_SEND_BUTTON_COLOR = '#f472b6';

export default function TeamDiscussionComposerModal({
  visible,
  onClose,
  onPublish,
  originalComment = null,
  placeholder = '说点什么...',
  title = '说点什么',
  submitting = false,
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const estimatedAndroidKeyboardOffset = React.useMemo(() => {
    if (Platform.OS !== 'android') {
      return 0;
    }

    return Math.round(Math.min(Math.max(windowHeight * 0.38, 260), 360));
  }, [windowHeight]);
  const inputRef = React.useRef(null);
  const androidFocusAnimationFrameRef = React.useRef(null);
  const androidFocusTimeoutRef = React.useRef(null);
  const imageSourceAlertTimeoutRef = React.useRef(null);
  const visibleRef = React.useRef(visible);
  const imagePickerBusyRef = React.useRef(false);
  const [text, setText] = React.useState('');
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [androidKeyboardOffset, setAndroidKeyboardOffset] = React.useState(0);
  const { recommendedMentionUsers, resetRecommendedMentionUsers } = useRecommendedMentionUsers({
    visible,
    scene: 'team-discussion',
  });
  const {
    activeMention,
    candidateUsers,
    focusInput,
    handleMentionPress,
    handleMentionSelect,
    handleSelectionChange,
    listMaxHeight,
    mentionBottomInset,
    mentionLoading,
    panelAnimatedStyle,
    panelBottomOffset,
    panelMaxHeight,
    renderMentionPanel,
    selection,
  } = useMentionComposer({
    visible,
    text,
    onChangeText: setText,
    inputRef,
    windowHeight,
    bottomInset: Math.max(insets.bottom, 12),
    recommendedUsers: recommendedMentionUsers,
    baseBottomOffset: DEFAULT_MENTION_PANEL_BASE_OFFSET,
    onInvalidMention: () => showToast('该用户缺少可用名称', 'warning'),
  });

  const canPublish = Boolean(text.trim() || selectedImages.length > 0);

  const clearAndroidOpenSequence = React.useCallback(() => {
    if (androidFocusAnimationFrameRef.current !== null) {
      cancelAnimationFrame(androidFocusAnimationFrameRef.current);
      androidFocusAnimationFrameRef.current = null;
    }

    if (androidFocusTimeoutRef.current !== null) {
      clearTimeout(androidFocusTimeoutRef.current);
      androidFocusTimeoutRef.current = null;
    }
  }, []);

  const clearImageSourceAlertTimeout = React.useCallback(() => {
    if (imageSourceAlertTimeoutRef.current !== null) {
      clearTimeout(imageSourceAlertTimeoutRef.current);
      imageSourceAlertTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  React.useEffect(() => {
    if (!visible) {
      clearAndroidOpenSequence();
      clearImageSourceAlertTimeout();
      setText('');
      setSelectedImages([]);
      setShowImagePicker(false);
      setAndroidKeyboardOffset(0);
      imagePickerBusyRef.current = false;
      Keyboard.dismiss();
      inputRef.current?.blur();
      resetRecommendedMentionUsers();
      return undefined;
    }

    if (Platform.OS === 'android') {
      return () => {
        clearAndroidOpenSequence();
      };
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => {
      clearTimeout(timer);
      clearAndroidOpenSequence();
      clearImageSourceAlertTimeout();
      imagePickerBusyRef.current = false;
    };
  }, [clearAndroidOpenSequence, clearImageSourceAlertTimeout, resetRecommendedMentionUsers, visible]);

  const handleModalShow = React.useCallback(() => {
    if (Platform.OS !== 'android' || !visible) {
      return;
    }

    clearAndroidOpenSequence();
    setAndroidKeyboardOffset(estimatedAndroidKeyboardOffset);

    const focusInput = () => {
      inputRef.current?.focus();
    };

    InteractionManager.runAfterInteractions(() => {
      focusInput();
    });

    androidFocusAnimationFrameRef.current = requestAnimationFrame(() => {
      focusInput();
      androidFocusAnimationFrameRef.current = null;
    });

    androidFocusTimeoutRef.current = setTimeout(() => {
      focusInput();
      androidFocusTimeoutRef.current = null;
    }, 48);
  }, [clearAndroidOpenSequence, estimatedAndroidKeyboardOffset, visible]);

  React.useEffect(() => {
    if (!visible) {
      setAndroidKeyboardOffset(0);
      return undefined;
    }

    const syncKeyboardOffset = event => {
      if (Platform.OS !== 'android') {
        return;
      }

      const keyboardMetrics = resolveComposerKeyboardMetrics({
        platform: Platform.OS,
        windowHeight,
        keyboardHeight: event?.endCoordinates?.height || 0,
        keyboardScreenY: event?.endCoordinates?.screenY ?? windowHeight,
        footerBottomInset: Math.max(insets.bottom, 12),
        androidFooterClearance: 0,
      });

      setAndroidKeyboardOffset(previousOffset =>
        Math.max(previousOffset, Math.max(keyboardMetrics.overlayOffset, 0))
      );
    };

    const resetKeyboardOffset = () => {
      setAndroidKeyboardOffset(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      syncKeyboardOffset
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      resetKeyboardOffset
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, visible, windowHeight]);

  const handleClose = React.useCallback(() => {
    clearImageSourceAlertTimeout();
    setShowImagePicker(false);
    imagePickerBusyRef.current = false;
    Keyboard.dismiss();
    inputRef.current?.blur();
    onClose?.();
  }, [clearImageSourceAlertTimeout, onClose]);

  const handlePublishPress = React.useCallback(async () => {
    if (!canPublish || submitting) {
      return;
    }

    const publishResult = await Promise.resolve(onPublish?.(text.trim(), selectedImages));

    if (publishResult === false) {
      return;
    }

    if (publishResult && typeof publishResult === 'object' && publishResult.ok === false) {
      return;
    }

    setText('');
    setSelectedImages([]);
    resetRecommendedMentionUsers();
  }, [canPublish, onPublish, resetRecommendedMentionUsers, selectedImages, submitting, text]);

  const requestCameraPermission = React.useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        showToast('需要相机权限才能拍照', 'error');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request camera permission:', error);
      showToast('请求相机权限失败', 'error');
      return false;
    }
  }, []);

  const requestMediaLibraryPermission = React.useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showToast('需要相册权限才能选择图片', 'error');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to request media library permission:', error);
      showToast('请求相册权限失败', 'error');
      return false;
    }
  }, []);

  const handleSelectComposerImage = React.useCallback(async (source) => {
    if (!visibleRef.current || imagePickerBusyRef.current) {
      return;
    }

    imagePickerBusyRef.current = true;

    try {
      const hasPermission =
        source === 'camera'
          ? await requestCameraPermission()
          : await requestMediaLibraryPermission();

      if (!hasPermission) {
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 0.8,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

      if (!result.canceled && Array.isArray(result.assets) && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;

        if (isComposerImageLimitReached(selectedImages)) {
          showToast('最多只能添加9张图片', 'warning');
        } else {
          setSelectedImages(prevImages => appendComposerImage(prevImages, selectedImageUri));
        }
      }
    } catch (error) {
      console.error(`Failed to ${source === 'camera' ? 'take photo' : 'pick image'}:`, error);
      showToast(source === 'camera' ? '拍照失败，请重试' : '选择图片失败，请重试', 'error');
    } finally {
      imagePickerBusyRef.current = false;
    }
  }, [requestCameraPermission, requestMediaLibraryPermission, selectedImages]);

  const handleOpenImagePicker = React.useCallback(() => {
    if (!visibleRef.current || imagePickerBusyRef.current) {
      return;
    }

    clearImageSourceAlertTimeout();
    Keyboard.dismiss();

    if (Platform.OS === 'android') {
      setShowImagePicker(true);
      return;
    }

    imageSourceAlertTimeoutRef.current = setTimeout(() => {
      if (!visibleRef.current) {
        imageSourceAlertTimeoutRef.current = null;
        return;
      }

      imageSourceAlertTimeoutRef.current = null;
      Alert.alert('选择图片', '请选择图片来源', [
        {
          text: '拍照',
          onPress: () => {
            handleSelectComposerImage('camera');
          },
        },
        {
          text: '从相册选择',
          onPress: () => {
            handleSelectComposerImage('library');
          },
        },
        {
          text: '取消',
          style: 'cancel',
        },
      ]);
    }, Platform.OS === 'ios' ? 180 : 60);
  }, [clearImageSourceAlertTimeout, handleSelectComposerImage]);

  const handleImageSelected = React.useCallback((imageUri) => {
    imagePickerBusyRef.current = false;
    setShowImagePicker(false);

    if (isComposerImageLimitReached(selectedImages)) {
      showToast('最多只能添加9张图片', 'warning');
    } else {
      setSelectedImages(prevImages => appendComposerImage(prevImages, imageUri));
    }
  }, [selectedImages]);

  const handleRemoveImage = React.useCallback((index) => {
    setSelectedImages(prevImages => removeComposerImageAt(prevImages, index));
  }, []);

  const bottomPadding = Math.max(insets.bottom, 12) + 8;

  return (
    <ComposerModalScaffold
      visible={visible}
      onClose={handleClose}
      title={title}
      submitPlacement="none"
      overlayContent={
        Platform.OS === 'android' && showImagePicker ? (
          <ImagePickerSheet
            visible={showImagePicker}
            onClose={() => setShowImagePicker(false)}
            onImageSelected={handleImageSelected}
            title="添加图片"
            renderInPlace
          />
        ) : null
      }
      footerPaddingBottom={bottomPadding}
      footerBottomInset={Math.max(insets.bottom, 12)}
      footerLeft={
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            testID="team-discussion-composer-image-button"
            style={styles.toolButton}
            onPress={handleOpenImagePicker}
          >
            <Ionicons name="image-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => handleMentionPress({ focusInput: true })}
          >
            <Ionicons name="at-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>
      }
      footerRight={
        <View style={styles.toolbarRight}>
          <Text style={styles.charCount}>{text.length}/500</Text>
          <TouchableOpacity
            testID="team-discussion-composer-send-button"
            style={[
              styles.sendButton,
              (!canPublish || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handlePublishPress}
            disabled={!canPublish || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.sheet} testID="team-discussion-composer-toolbar">
        {originalComment ? (
          <View style={styles.originalCommentCard}>
            <View style={styles.originalCommentHeader}>
              <Avatar
                uri={originalComment.userAvatar || originalComment.avatar}
                name={originalComment.userName || originalComment.author}
                size={28}
              />
              <View style={styles.originalCommentMeta}>
                <Text style={styles.originalCommentAuthor} numberOfLines={1}>
                  {originalComment.userName || originalComment.author}
                </Text>
                <Text style={styles.originalCommentTime} numberOfLines={1}>
                  {originalComment.time}
                </Text>
              </View>
            </View>
            {originalComment.content ? (
              <Text style={styles.originalCommentText} numberOfLines={2}>
                {originalComment.content}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.textBox} testID="team-discussion-composer-input-box">
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            multiline
            autoFocus
            showSoftInputOnFocus
            maxLength={500}
            selectionColor={modalTokens.danger}
            textAlignVertical="top"
          />
        </View>

        {renderMentionPanel ? (
          <View style={styles.mentionSection}>
            <MentionSuggestionsPanel
              activeKeyword={activeMention?.keyword ?? ''}
              animatedStyle={panelAnimatedStyle}
              bottomInset={mentionBottomInset}
              bottomOffset={panelBottomOffset}
              listMaxHeight={listMaxHeight}
              loading={mentionLoading}
              onBackdropPress={focusInput}
              onSelect={handleMentionSelect}
            panelMaxHeight={panelMaxHeight}
            placement="embedded"
            showHeader={false}
            users={candidateUsers}
            variant="keyboard-inline"
            keyboardInlineContentPadding={5}
            keyboardInlineTransparentItem
          />
        </View>
      ) : null}

        {selectedImages.length > 0 ? (
          <View style={styles.attachmentsSection}>
            <ComposerImageGrid
              images={selectedImages}
              onRemove={handleRemoveImage}
              containerStyle={styles.imageGrid}
              itemStyle={styles.imageItem}
              imageStyle={styles.imagePreview}
              removeButtonStyle={styles.removeImage}
            />
          </View>
        ) : null}
      </View>
    </ComposerModalScaffold>
  );
}

const styles = StyleSheet.create({
  portal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 16,
    paddingHorizontal: 15,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originalCommentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 14,
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalCommentMeta: {
    flex: 1,
    marginLeft: 10,
  },
  originalCommentAuthor: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#111827',
  },
  originalCommentTime: {
    marginTop: 2,
    fontSize: scaleFont(11),
    color: '#9ca3af',
  },
  originalCommentText: {
    marginTop: 10,
    fontSize: scaleFont(13),
    lineHeight: 20,
    color: '#4b5563',
  },
  textBox: {
    minHeight: 164,
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  input: {
    minHeight: 116,
    fontSize: scaleFont(16),
    lineHeight: 24,
    color: '#111827',
  },
  mentionSection: {
    marginTop: 6,
    marginBottom: 2,
  },
  attachmentsSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dbe4ee',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAM_DISCUSSION_SEND_BUTTON_COLOR,
  },
  sendButtonDisabled: {
    backgroundColor: TEAM_DISCUSSION_SEND_BUTTON_COLOR,
  },
  imageGrid: {
    marginTop: 0,
    marginBottom: 0,
  },
  imageItem: {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginRight: 10,
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  removeImage: {
    top: 6,
    right: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  charCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginRight: 10,
  },
});
