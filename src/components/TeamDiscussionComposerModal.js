import React from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import ComposerImageGrid from './ComposerImageGrid';
import ImagePickerSheet from './ImagePickerSheet';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import TwemojiPickerSheet from './TwemojiPickerSheet';
import TwemojiText from './TwemojiText';
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
import { insertTextAtSelection } from '../utils/emojiInsert';
import { countDisplayCharacters } from '../utils/twemoji';

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
  const [text, setText] = React.useState('');
  const [selectedImages, setSelectedImages] = React.useState([]);
  const [showImagePicker, setShowImagePicker] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
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
    panelMaxHeight,
    renderMentionPanel,
    selection,
    setSelection,
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

  React.useEffect(() => {
    if (!visible) {
      clearAndroidOpenSequence();
      setText('');
      setSelectedImages([]);
      setShowImagePicker(false);
      setShowEmojiPicker(false);
      setAndroidKeyboardOffset(0);
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
    };
  }, [clearAndroidOpenSequence, resetRecommendedMentionUsers, visible]);

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
    setShowImagePicker(false);
    onClose?.();
  }, [onClose]);

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

  const handleOpenImagePicker = React.useCallback(() => {
    Keyboard.dismiss();
    setShowEmojiPicker(false);
    setShowImagePicker(true);
  }, []);

  const handleOpenEmojiPicker = React.useCallback(() => {
    Keyboard.dismiss();
    setShowImagePicker(false);
    setShowEmojiPicker(true);
  }, []);

  const handleImageSelected = React.useCallback((imageUri) => {
    if (isComposerImageLimitReached(selectedImages)) {
      showToast('最多只能添加9张图片', 'warning');
    } else {
      setSelectedImages(prevImages => appendComposerImage(prevImages, imageUri));
    }

    setShowImagePicker(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
  }, [selectedImages]);

  const handleCloseImagePicker = React.useCallback(() => {
    setShowImagePicker(false);

    setTimeout(() => {
      if (visible) {
        inputRef.current?.focus();
      }
    }, 120);
  }, [visible]);

  const handleCloseEmojiPicker = React.useCallback(() => {
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (visible) {
        inputRef.current?.focus();
      }
    }, 120);
  }, [visible]);

  const handleEmojiSelected = React.useCallback((emoji) => {
    const { nextText, nextSelection } = insertTextAtSelection(text, selection, emoji);
    setText(nextText);
    setSelection(nextSelection);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [selection, setSelection, text]);

  const handleRemoveImage = React.useCallback((index) => {
    setSelectedImages(prevImages => removeComposerImageAt(prevImages, index));
  }, []);

  const bottomPadding = Math.max(insets.bottom, 12) + 8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'android' ? 'none' : 'fade'}
      onRequestClose={handleClose}
      onShow={handleModalShow}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.portal} pointerEvents="box-none">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: bottomPadding,
              },
              Platform.OS === 'android' && androidKeyboardOffset > 0
                ? {
                    marginBottom: androidKeyboardOffset,
                  }
                : null,
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {renderMentionPanel ? (
              <MentionSuggestionsPanel
                activeKeyword={activeMention?.keyword ?? ''}
                animatedStyle={panelAnimatedStyle}
                bottomInset={mentionBottomInset}
                listMaxHeight={listMaxHeight}
                loading={mentionLoading}
                onBackdropPress={focusInput}
                onSelect={handleMentionSelect}
                panelMaxHeight={panelMaxHeight}
                placement="embedded"
                showHeader={false}
                users={candidateUsers}
                variant="keyboard-inline"
              />
            ) : null}

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
                  <TwemojiText
                    style={styles.originalCommentText}
                    numberOfLines={2}
                    text={originalComment.content}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.textBox}>
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
                autoFocus={Platform.OS !== 'android'}
                showSoftInputOnFocus
                maxLength={500}
                selectionColor={modalTokens.danger}
                textAlignVertical="top"
              />

              <TouchableOpacity
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

            <ComposerImageGrid
              images={selectedImages}
              onRemove={handleRemoveImage}
              containerStyle={styles.imageGrid}
              itemStyle={styles.imageItem}
              imageStyle={styles.imagePreview}
              removeButtonStyle={styles.removeImage}
            />

            <View style={styles.toolbar}>
              <View style={styles.toolbarLeft}>
                <TouchableOpacity style={styles.toolButton} onPress={handleOpenImagePicker}>
                  <Ionicons name="image-outline" size={22} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolButton} onPress={handleOpenEmojiPicker}>
                  <Ionicons name="happy-outline" size={22} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => handleMentionPress({ focusInput: true })}
                >
                  <Ionicons name="at-outline" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.charCount}>{countDisplayCharacters(text)}/500</Text>
            </View>
          </View>

          <ImagePickerSheet
            visible={showImagePicker}
            onClose={handleCloseImagePicker}
            onImageSelected={handleImageSelected}
            title="添加图片"
            renderInPlace
          />
          <TwemojiPickerSheet
            visible={showEmojiPicker}
            onClose={handleCloseEmojiPicker}
            onEmojiSelected={handleEmojiSelected}
            title="插入表情"
            renderInPlace
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
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
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
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
    minHeight: 168,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingTop: 14,
    paddingLeft: 16,
    paddingRight: 68,
    paddingBottom: 14,
  },
  input: {
    minHeight: 120,
    fontSize: scaleFont(16),
    lineHeight: 24,
    color: '#111827',
  },
  sendButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: modalTokens.warning,
  },
  sendButtonDisabled: {
    backgroundColor: '#fbcfe8',
  },
  imageGrid: {
    marginTop: 14,
    marginBottom: 4,
  },
  imageItem: {
    borderRadius: 16,
  },
  imagePreview: {
    borderRadius: 16,
  },
  removeImage: {
    top: 8,
    right: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  charCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
});
