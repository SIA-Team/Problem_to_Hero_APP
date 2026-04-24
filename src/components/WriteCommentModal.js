import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Avatar from './Avatar';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import ComposerModalScaffold from './ComposerModalScaffold';
import ComposerImageGrid from './ComposerImageGrid';
import ComposerAlertOverlay from './ComposerAlertOverlay';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import { showToast } from '../utils/toast';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import useKeyboardVisibility from '../hooks/useKeyboardVisibility';
import useMentionComposer from '../hooks/useMentionComposer';
import useRecommendedMentionUsers from '../hooks/useRecommendedMentionUsers';
import {
  appendComposerImage,
  isComposerImageLimitReached,
  removeComposerImageAt,
} from '../utils/composerImages';
import { resolveComposerScrollPadding } from '../utils/composerLayout';
import useComposerScrollManager from '../hooks/useComposerScrollManager';
import { scaleFont } from '../utils/responsive';

const SEND_BUTTON_COLOR = '#f472b6';

const WriteCommentModal = ({
  visible,
  onClose,
  onPublish,
  originalComment = null,
  publishInFooter = false,
  closeOnRight = false,
  placeholder = '\u5199\u4e0b\u4f60\u7684\u8bc4\u8bba...',
  title = '\u5199\u8bc4\u8bba',
}) => {
  const bottomSafeInset = useBottomSafeInset(12, { maxAndroidInset: 24 });
  const keyboardVisible = useKeyboardVisibility(visible);
  const { height: commentWindowHeight } = useWindowDimensions();
  const [text, setText] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('personal');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [composerAlert, setComposerAlert] = useState(null);
  const [inputTop, setInputTop] = useState(0);
  const commentInputRef = React.useRef(null);
  const {
    recommendedMentionUsers,
    resetRecommendedMentionUsers,
  } = useRecommendedMentionUsers({
    visible,
    scene: 'comment',
  });

  const canPublish = Boolean(text.trim() || selectedImages.length > 0);
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
    shouldShowMentionPanel,
  } = useMentionComposer({
    visible,
    text,
    onChangeText: setText,
    inputRef: commentInputRef,
    windowHeight: commentWindowHeight,
    bottomInset: bottomSafeInset,
    recommendedUsers: recommendedMentionUsers,
    baseBottomOffset: 0,
    onInvalidMention: () => showToast('\u8be5\u7528\u6237\u7f3a\u5c11\u53ef\u7528\u540d\u79f0', 'warning'),
  });
  const runToolbarAction = React.useCallback((action) => {
    if (action === 'image') {
      setShowImagePicker(true);
      return;
    }

    if (action === 'mention') {
      handleMentionPress({ focusInput: false });
    }
  }, [handleMentionPress]);
  const {
    pendingToolbarAction,
    scrollViewRef,
    inputFocusedRef,
    scrollToInput,
    handleInputFocus,
    handleInputBlur,
    triggerToolbarAction,
  } = useComposerScrollManager({
    visible,
    keyboardVisible,
    inputTop,
    runToolbarAction,
  });

  useEffect(() => {
    if (!visible) {
      setShowImagePicker(false);
      setComposerAlert(null);
      inputFocusedRef.current = false;
    }
  }, [visible]);

  const handlePublish = async () => {
    if (!canPublish) {
      return;
    }

    setComposerAlert(null);

    const publishResult = await Promise.resolve(
      onPublish(text.trim(), selectedIdentity === 'team', selectedImages)
    );

    if (publishResult && typeof publishResult === 'object' && publishResult.ok === false) {
      setComposerAlert({
        title: publishResult.title || '提示',
        message: publishResult.message || '',
      });
      return;
    }

    if (publishResult === false) {
      return;
    }

    setText('');
    setSelectedIdentity('personal');
    setSelectedImages([]);
    resetRecommendedMentionUsers();
  };

  const handleImageSelected = imageUri => {
    if (isComposerImageLimitReached(selectedImages)) {
      showToast('\u6700\u591a\u53ea\u80fd\u6dfb\u52a09\u5f20\u56fe\u7247', 'warning');
    } else {
      setSelectedImages(prev => appendComposerImage(prev, imageUri));
    }
    setShowImagePicker(false);
  };

  const handleSelectImageSource = async source => {
    try {
      const permissionStatus =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionStatus?.status !== 'granted') {
        showToast(
          source === 'camera' ? '需要相机权限才能拍照' : '需要相册权限才能选择图片',
          'error'
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
            });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to select composer image:', error);
      showToast(source === 'camera' ? '拍照失败，请重试' : '选择图片失败，请重试', 'error');
    }
  };

  const removeImage = index => {
    setSelectedImages(prev => removeComposerImageAt(prev, index));
  };

  const handleChangeText = value => {
    setText(value);

    if (inputFocusedRef.current) {
      scrollToInput(false);
    }
  };

  const handleOpenImagePicker = () => {
    if (Platform.OS === 'ios') {
      Alert.alert('选择图片', '请选择图片来源', [
        { text: '拍照', onPress: () => handleSelectImageSource('camera') },
        { text: '从相册选择', onPress: () => handleSelectImageSource('library') },
        { text: '取消', style: 'cancel' },
      ]);
      return;
    }

    triggerToolbarAction('image');
  };

  const handleToolbarMentionPress = () => {
    handleMentionPress({ focusInput: true });
  };

  const closeComposerAlert = () => {
    setComposerAlert(null);
  };

  return (
    <>
      <ComposerModalScaffold
        visible={visible}
        onClose={onClose}
        title={title}
        onSubmit={handlePublish}
        submitDisabled={!canPublish}
        submitPlacement="none"
        closePlacement={closeOnRight ? 'right' : 'left'}
        footerPaddingBottom={bottomSafeInset + 8}
        footerBottomInset={bottomSafeInset}
        footerHidden={Boolean(pendingToolbarAction)}
        overlayContent={
          showImagePicker || composerAlert ? (
            <>
              {showImagePicker ? (
                <ImagePickerSheet
                  visible={showImagePicker}
                  onClose={() => setShowImagePicker(false)}
                  onImageSelected={handleImageSelected}
                  title="添加图片"
                  renderInPlace
                />
              ) : null}
              {composerAlert ? (false ? (
                <View style={styles.composerAlertOverlay}>
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={closeComposerAlert}
                  />
                  <View style={styles.composerAlertCard}>
                    <Text style={styles.composerAlertTitle}>{composerAlert.title}</Text>
                    {composerAlert.message ? (
                      <Text style={styles.composerAlertMessage}>{composerAlert.message}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.composerAlertButton}
                      onPress={closeComposerAlert}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.composerAlertButtonText}>我知道了</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <ComposerAlertOverlay
                  title={composerAlert.title}
                  message={composerAlert.message}
                  onClose={closeComposerAlert}
                />
              )) : null}
            </>
          ) : null
        }
        footerLeft={
          <View style={styles.toolbarLeft}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={handleOpenImagePicker}>
              <Ionicons name="image-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={handleToolbarMentionPress}>
              <Ionicons name="at-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        }
        footerRight={
          <View style={styles.footerActionGroup}>
            <Text style={styles.charCount}>{text.length}/500</Text>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!canPublish || composerAlert) && styles.sendButtonDisabled,
              ]}
              onPress={handlePublish}
              disabled={!canPublish}
            >
              <Ionicons name="send" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        }
        floatingOverlay={
          renderMentionPanel ? (
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
              showHeader={false}
              users={candidateUsers}
              variant="keyboard-inline"
              keyboardInlineContentPadding={5}
              keyboardInlineTransparentItem
              keyboardInlineSeamless
            />
          ) : null
        }
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingBottom: resolveComposerScrollPadding({
                basePaddingBottom: 24,
                keyboardVisible: keyboardVisible || shouldShowMentionPanel,
              }),
            },
          ]}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          scrollEnabled={!shouldShowMentionPanel}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={shouldShowMentionPanel ? 'none' : 'interactive'}
        >
          {originalComment ? (
            <View style={styles.originalCommentCard}>
              <View style={styles.originalCommentHeader}>
                <Avatar
                  uri={originalComment.userAvatar || originalComment.avatar}
                  name={
                    originalComment.userName ||
                    originalComment.userNickname ||
                    originalComment.author
                  }
                  size={28}
                />
                <View style={styles.originalCommentMeta}>
                  <Text style={styles.originalCommentAuthor}>
                    {originalComment.userName ||
                      originalComment.userNickname ||
                      originalComment.author}
                  </Text>
                  <Text style={styles.originalCommentTime}>{originalComment.time}</Text>
                </View>
              </View>
              {originalComment.content ? (
                <Text style={styles.originalCommentText}>{originalComment.content}</Text>
              ) : null}
            </View>
          ) : null}

          <View
            onLayout={(event) => {
              setInputTop(event.nativeEvent.layout.y);
            }}
          >
            <TextInput
              ref={commentInputRef}
              style={styles.textInput}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={text}
              onChangeText={handleChangeText}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onSelectionChange={handleSelectionChange}
              selection={selection}
              multiline
              autoFocus
              maxLength={500}
              selectionColor={modalTokens.danger}
              textAlignVertical="top"
            />
          </View>

          <ComposerImageGrid
            images={selectedImages}
            onRemove={removeImage}
            containerStyle={styles.imageGrid}
            itemStyle={styles.imageItem}
            imageStyle={styles.uploadedImage}
            removeButtonStyle={styles.removeImage}
          />

          <View style={styles.identitySection}>
            <IdentitySelector
              selectedIdentity={selectedIdentity}
              onIdentityChange={setSelectedIdentity}
            />
          </View>
        </ScrollView>
      </ComposerModalScaffold>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  originalCommentCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    marginBottom: 16,
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  originalCommentMeta: {
    flex: 1,
    marginLeft: 10,
  },
  originalCommentAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  originalCommentTime: {
    marginTop: 2,
    fontSize: scaleFont(12),
    color: modalTokens.textMuted,
  },
  originalCommentText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    color: '#374151',
  },
  textInput: {
    minHeight: 240,
    paddingVertical: 4,
    fontSize: scaleFont(16),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(26),
    marginBottom: 16,
  },
  identitySection: {
    paddingBottom: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarBtn: {
    padding: 10,
  },
  footerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  charCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SEND_BUTTON_COLOR,
  },
  sendButtonDisabled: {
    backgroundColor: SEND_BUTTON_COLOR,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  composerAlertOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  composerAlertCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowRadius: 18,
    elevation: 10,
  },
  composerAlertTitle: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(24),
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  composerAlertMessage: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    color: '#4b5563',
    marginBottom: 16,
  },
  composerAlertButton: {
    alignSelf: 'flex-end',
    minWidth: 88,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },
  composerAlertButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default WriteCommentModal;
