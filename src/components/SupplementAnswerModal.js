import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import ComposerModalScaffold from './ComposerModalScaffold';
import ComposerImageGrid from './ComposerImageGrid';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import { modalTokens } from './modalTokens';
import { toast } from '../utils/toast';
import { showPublishFailureAlert } from '../utils/appAlert';
import answerApi from '../services/api/answerApi';
import uploadApi from '../services/api/uploadApi';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import useKeyboardVisibility from '../hooks/useKeyboardVisibility';
import useMentionComposer from '../hooks/useMentionComposer';
import useRecommendedMentionUsers from '../hooks/useRecommendedMentionUsers';
import {
  appendComposerImage,
  getComposerImageUri,
  isComposerImageLimitReached,
  removeComposerImageAt,
} from '../utils/composerImages';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
} from '../utils/mentionComposer';
import { resolveComposerScrollPadding } from '../utils/composerLayout';
import useComposerScrollManager from '../hooks/useComposerScrollManager';
import { scaleFont } from '../utils/responsive';

export default function SupplementAnswerModal({
  visible,
  onClose,
  answer,
  questionId,
  onSuccess,
  title = '补充回答',
  submitText = '发布',
  placeholder = '补充你的回答，提供更多信息...',
  text,
  onChangeText,
  selectedIdentity,
  selectedTeams,
  onIdentityChange,
  onTeamsChange,
  images,
  onChangeImages,
  submitting = false,
  onSubmit,
  allowImages = true,
}) {
  const bottomSafeInset = useBottomSafeInset(12, { maxAndroidInset: 24 });
  const keyboardVisible = useKeyboardVisibility(visible);
  const { height: answerWindowHeight } = useWindowDimensions();
  const [internalText, setInternalText] = useState('');
  const [internalIdentity, setInternalIdentity] = useState('personal');
  const [internalSelectedTeams, setInternalSelectedTeams] = useState([]);
  const [internalImages, setInternalImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [inputTop, setInputTop] = useState(0);
  const answerInputRef = React.useRef(null);
  const { recommendedMentionUsers } = useRecommendedMentionUsers({
    visible,
    scene: 'supplement answer',
  });

  const isControlled = typeof onSubmit === 'function';
  const currentText = text ?? internalText;
  const currentIdentity = selectedIdentity ?? internalIdentity;
  const currentTeams = selectedTeams ?? internalSelectedTeams;
  const currentImages = useMemo(
    () => (Array.isArray(images) ? images : internalImages),
    [images, internalImages]
  );
  const imageLimitReached = isComposerImageLimitReached(currentImages);
  const hasPendingUploads = currentImages.some(image => image?.uploading);
  const submitLoading = isControlled ? submitting : isSubmitting;
  const canSubmit = !!currentText.trim() && !submitLoading && !hasPendingUploads;

  function updateText(value) {
    if (onChangeText) {
      onChangeText(value);
      return;
    }

    setInternalText(value);
  }

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
    text: currentText,
    onChangeText: updateText,
    inputRef: answerInputRef,
    windowHeight: answerWindowHeight,
    bottomInset: bottomSafeInset,
    recommendedUsers: recommendedMentionUsers,
    baseBottomOffset: DEFAULT_MENTION_PANEL_BASE_OFFSET,
    onInvalidMention: () => toast.warning('该用户缺少可用名称'),
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
      inputFocusedRef.current = false;
    }
  }, [visible]);

  const updateIdentity = value => {
    if (onIdentityChange) {
      onIdentityChange(value);
      return;
    }

    setInternalIdentity(value);
  };

  const updateTeams = value => {
    if (onTeamsChange) {
      onTeamsChange(value);
      return;
    }

    setInternalSelectedTeams(value);
  };

  const updateImages = value => {
    if (onChangeImages) {
      onChangeImages(value);
      return;
    }

    setInternalImages(value);
  };

  const resetInternalState = () => {
    if (text === undefined) {
      setInternalText('');
    }
    if (selectedIdentity === undefined) {
      setInternalIdentity('personal');
    }
    if (selectedTeams === undefined) {
      setInternalSelectedTeams([]);
    }
    if (images === undefined) {
      setInternalImages([]);
    }
  };

  const handleClose = () => {
    if (!isControlled) {
      resetInternalState();
    }
    setShowImagePicker(false);
    inputFocusedRef.current = false;
    onClose?.();
  };

  const handleImageSelected = async imageUri => {
    if (!allowImages) {
      setShowImagePicker(false);
      return;
    }

    if (imageLimitReached) {
      toast.error('最多只能上传 9 张图片');
      return;
    }

    if (isControlled) {
      updateImages(appendComposerImage(currentImages, imageUri));
      setShowImagePicker(false);
      return;
    }

    try {
      setUploadingImages(true);

      const localImage = {
        uri: imageUri,
        uploading: true,
      };
      const nextImages = appendComposerImage(currentImages, localImage);
      updateImages(nextImages);

      const fileName = imageUri.split('/').pop() || `supplement_${Date.now()}.jpg`;
      const fileType = fileName.split('.').pop() || 'jpeg';
      const response = await uploadApi.uploadImage({
        uri: imageUri,
        name: fileName,
        type: `image/${fileType}`,
      });

      if (response?.data?.code === 200 && response?.data?.data) {
        updateImages(
          nextImages
            .map(image =>
              image.uri === imageUri
                ? {
                    uri: imageUri,
                    url: response.data.data,
                    uploading: false,
                  }
                : image
            )
        );
        toast.success('图片上传成功');
      } else {
        throw new Error(response?.data?.msg || '上传失败');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error(error || '图片上传失败');
      updateImages(currentImages.filter(image => image?.uri !== imageUri));
    } finally {
      setUploadingImages(false);
      setShowImagePicker(false);
    }
  };

  const handleRemoveImage = index => {
    updateImages(removeComposerImageAt(currentImages, index));
  };

  const handleOpenImagePicker = () => {
    triggerToolbarAction('image');
  };

  const handleToolbarMentionPress = () => {
    triggerToolbarAction('mention');
  };

  const handleChangeSupplementAnswerText = value => {
    updateText(value);

    if (inputFocusedRef.current) {
      scrollToInput(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentText.trim()) {
      toast.error('请输入补充回答内容');
      return;
    }

    if (isControlled) {
      onSubmit?.();
      return;
    }

    if (!answer?.id) {
      toast.error('回答信息不完整');
      return;
    }

    if (isSubmitting || uploadingImages) {
      if (uploadingImages) {
        toast.error('图片正在上传中，请稍候');
      }
      return;
    }

    if (hasPendingUploads) {
      toast.error('图片正在上传中，请稍候');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData = {
        content: currentText.trim(),
      };

      const response = await answerApi.publishSupplementAnswer(answer.id, requestData);

      if (response?.code === 200) {
        toast.success('补充回答发布成功');
        resetInternalState();
        onClose?.();
        onSuccess?.(response.data);
      } else {
        throw new Error(response?.msg || '发布失败');
      }
    } catch (error) {
      showPublishFailureAlert(error, {
        title: '暂时无法补充回答',
        fallbackMessage: '当前回答暂不支持继续补充，请稍后再试。',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!answer) {
    return null;
  }

  const renderedSubmitText = submitLoading ? '发布中...' : submitText;
  const answerAuthorName =
    answer.userName || answer.userNickname || answer.author || '匿名用户';

  return (
    <>
      <ComposerModalScaffold
        visible={visible}
        onClose={handleClose}
        title={title}
        onSubmit={handleSubmit}
        submitText={renderedSubmitText}
        submitDisabled={!canSubmit}
        footerPaddingBottom={bottomSafeInset + 8}
        footerBottomInset={bottomSafeInset}
        footerHidden={Boolean(pendingToolbarAction)}
        overlayContent={showImagePicker && allowImages ? (
          <ImagePickerSheet
            visible={showImagePicker}
            onClose={() => setShowImagePicker(false)}
            onImageSelected={handleImageSelected}
            title="选择图片"
            renderInPlace
          />
        ) : null}
        footerLeft={
          <View style={styles.toolsLeft}>
            {allowImages ? (
              <TouchableOpacity
                style={styles.toolItem}
                onPress={handleOpenImagePicker}
                disabled={submitLoading || uploadingImages || imageLimitReached}
              >
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={
                    submitLoading || uploadingImages || imageLimitReached
                      ? '#ccc'
                      : '#666'
                  }
                />
                {currentImages.length > 0 ? (
                  <View style={styles.imageBadge}>
                    <Text style={styles.imageBadgeText}>{currentImages.length}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.toolItem} onPress={handleToolbarMentionPress}>
              <Ionicons name="at-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        }
        footerRight={<Text style={styles.wordCount}>{currentText.length}/2000</Text>}
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
              users={candidateUsers}
            />
          ) : null
        }
      >
        <View style={styles.originalAnswerContext}>
          <View style={styles.originalAnswerHeader}>
            <Ionicons name="document-text" size={18} color="#3b82f6" />
            <Text style={styles.originalAnswerLabel}>原回答</Text>
          </View>
          <View style={styles.originalAnswerAuthor}>
            <Avatar
              uri={answer.userAvatar || answer.avatar}
              name={answerAuthorName}
              size={24}
            />
            <Text style={styles.originalAnswerAuthorName}>{answerAuthorName}</Text>
          </View>
          <Text style={styles.originalAnswerContent} numberOfLines={3}>
            {answer.content}
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentArea}
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
          <View
            onLayout={(event) => {
              setInputTop(event.nativeEvent.layout.y);
            }}
          >
            <TextInput
              ref={answerInputRef}
              style={styles.textInput}
              placeholder={placeholder}
              placeholderTextColor="#bbb"
              value={currentText}
              onChangeText={handleChangeSupplementAnswerText}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onSelectionChange={handleSelectionChange}
              selection={selection}
              multiline
              autoFocus
              maxLength={2000}
              selectionColor={modalTokens.danger}
              textAlignVertical="top"
            />
          </View>

          <ComposerImageGrid
            images={currentImages}
            onRemove={handleRemoveImage}
            getImageUri={getComposerImageUri}
            renderItemOverlay={(image) => (
              image?.uploading ? (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>涓婁紶涓?..</Text>
                </View>
              ) : null
            )}
            containerStyle={styles.imagesContainer}
            itemStyle={styles.imageWrapper}
            imageStyle={styles.imagePreview}
            removeButtonStyle={styles.removeImageBtn}
            removeIconSize={24}
          />

          {false && currentImages.length > 0 ? (
            <View style={styles.imagesContainer}>
              {currentImages.map((image, index) => {
                const imageUri = typeof image === 'string' ? image : image?.uri;
                const isUploading = Boolean(image?.uploading);

                return (
                  <View key={`${imageUri}-${index}`} style={styles.imageWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    {isUploading ? (
                      <View style={styles.uploadingOverlay}>
                        <Text style={styles.uploadingText}>上传中...</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.identitySection}>
            <IdentitySelector
              selectedIdentity={currentIdentity}
              selectedTeams={currentTeams}
              onIdentityChange={updateIdentity}
              onTeamsChange={updateTeams}
            />
          </View>
        </ScrollView>
      </ComposerModalScaffold>

    </>
  );
}

const styles = StyleSheet.create({
  originalAnswerContext: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  originalAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  originalAnswerLabel: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '600',
  },
  originalAnswerAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  originalAnswerAuthorName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
  },
  originalAnswerContent: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    lineHeight: scaleFont(20),
  },
  contentArea: {
    flex: 1,
    backgroundColor: modalTokens.surface,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  textInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(26),
    minHeight: 300,
  },
  identitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  toolsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolItem: {
    padding: 10,
  },
  wordCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  imageBadgeText: {
    color: '#fff',
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
});
