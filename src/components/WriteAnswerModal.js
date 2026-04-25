import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import ComposerModalScaffold from './ComposerModalScaffold';
import ComposerImageGrid from './ComposerImageGrid';
import ComposerAlertOverlay from './ComposerAlertOverlay';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import TwemojiPickerSheet from './TwemojiPickerSheet';
import { showToast } from '../utils/toast';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import useKeyboardVisibility from '../hooks/useKeyboardVisibility';
import useMentionComposer from '../hooks/useMentionComposer';
import useRecommendedMentionUsers from '../hooks/useRecommendedMentionUsers';
import {
  appendComposerImage,
  isComposerImageLimitReached,
  removeComposerImageAt,
} from '../utils/composerImages';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
} from '../utils/mentionComposer';
import { resolveComposerScrollPadding } from '../utils/composerLayout';
import useComposerScrollManager from '../hooks/useComposerScrollManager';
import { scaleFont } from '../utils/responsive';
import { insertTextAtSelection } from '../utils/emojiInsert';
import { countDisplayCharacters } from '../utils/twemoji';

const COMPOSER_ALERT_CONFIRM_TEXT = '我知道了';

export default function WriteAnswerModal({
  visible,
  onClose,
  onSubmit,
  title = '写回答',
  publishText = '发布',
  questionTitle = '',
  supplementLabel = '补充问题：',
  supplementText = '',
  text = '',
  onChangeText,
  placeholder = '写下你的回答，帮助有需要的人...',
  selectedIdentity = 'personal',
  selectedTeams = [],
  onIdentityChange,
  onTeamsChange,
  images = [],
  onChangeImages,
  wordLimit = 2000,
  submitting = false,
  submitDisabled = false,
  headerNotice = null,
  showTagTool = true,
}) {
  const bottomSafeInset = useBottomSafeInset(12, { maxAndroidInset: 24 });
  const keyboardVisible = useKeyboardVisibility(visible);
  const { height: answerWindowHeight } = useWindowDimensions();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composerAlert, setComposerAlert] = useState(null);
  const [inputTop, setInputTop] = useState(0);
  const answerInputRef = React.useRef(null);
  const { recommendedMentionUsers } = useRecommendedMentionUsers({
    visible,
    scene: 'answer',
  });

  const currentImages = Array.isArray(images) ? images : [];
  const imageLimitReached = isComposerImageLimitReached(currentImages);
  const canSubmit = !!text.trim() && !submitting && !submitDisabled;
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
    setSelection,
    shouldShowMentionPanel,
  } = useMentionComposer({
    visible,
    text,
    onChangeText,
    inputRef: answerInputRef,
    windowHeight: answerWindowHeight,
    bottomInset: bottomSafeInset,
    recommendedUsers: recommendedMentionUsers,
    baseBottomOffset: DEFAULT_MENTION_PANEL_BASE_OFFSET,
    onInvalidMention: () => showToast('该用户缺少可用名称', 'warning'),
  });

  const runToolbarAction = React.useCallback((action) => {
    if (action === 'image') {
      setShowImagePicker(true);
      return;
    }

    if (action === 'emoji') {
      setShowEmojiPicker(true);
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
      setShowEmojiPicker(false);
      setComposerAlert(null);
      inputFocusedRef.current = false;
    }
  }, [visible]);

  const handleAddImage = imageUri => {
    if (imageLimitReached) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }

    onChangeImages?.(appendComposerImage(currentImages, imageUri));
    setShowImagePicker(false);
  };

  const handleRemoveImage = index => {
    onChangeImages?.(removeComposerImageAt(currentImages, index));
  };

  const handleOpenImagePicker = () => {
    if (imageLimitReached) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }

    triggerToolbarAction('image');
  };

  const handleChangeAnswerText = value => {
    onChangeText?.(value);

    if (inputFocusedRef.current) {
      scrollToInput(false);
    }
  };

  const handleToolbarMentionPress = () => {
    triggerToolbarAction('mention');
  };

  const handleToolbarEmojiPress = () => {
    triggerToolbarAction('emoji');
  };

  const handleEmojiSelected = emoji => {
    const { nextText, nextSelection } = insertTextAtSelection(text, selection, emoji);
    onChangeText?.(nextText);
    setSelection(nextSelection);

    setTimeout(() => {
      answerInputRef.current?.focus();
    }, 80);
  };

  const closeComposerAlert = () => {
    setComposerAlert(null);
  };

  const handleSubmitAnswer = async () => {
    setComposerAlert(null);

    const submitResult = await Promise.resolve(onSubmit?.());

    if (submitResult && typeof submitResult === 'object' && submitResult.ok === false) {
      setComposerAlert({
        title: submitResult.title || '提示',
        message: submitResult.message || '',
      });
    }
  };

  return (
    <>
      <ComposerModalScaffold
        visible={visible}
        onClose={onClose}
        title={title}
        onSubmit={handleSubmitAnswer}
        submitText={publishText}
        submitDisabled={!canSubmit}
        footerPaddingBottom={bottomSafeInset + 8}
        footerBottomInset={bottomSafeInset}
        footerHidden={Boolean(pendingToolbarAction)}
        overlayContent={
          showImagePicker || showEmojiPicker || composerAlert ? (
            <>
              {showImagePicker ? (
                <ImagePickerSheet
                  visible={showImagePicker}
                  onClose={() => setShowImagePicker(false)}
                  onImageSelected={handleAddImage}
                  renderInPlace
                />
              ) : null}
              {showEmojiPicker ? (
                <TwemojiPickerSheet
                  visible={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  onEmojiSelected={handleEmojiSelected}
                  title="插入表情"
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
                      <Text style={styles.composerAlertButtonText}>
                        {COMPOSER_ALERT_CONFIRM_TEXT}
                      </Text>
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
          <View style={styles.answerToolsLeft}>
            <TouchableOpacity style={styles.answerToolItem} onPress={handleOpenImagePicker}>
              <Ionicons name="image-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.answerToolItem} onPress={handleToolbarEmojiPress}>
              <Ionicons name="happy-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.answerToolItem} onPress={handleToolbarMentionPress}>
              <Ionicons name="at-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        }
        footerRight={
          <Text style={styles.answerWordCount}>
            {countDisplayCharacters(text)}/{wordLimit}
          </Text>
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
              users={candidateUsers}
            />
          ) : null
        }
      >
        {headerNotice}

        <View style={styles.answerContentRoot}>
          <View style={styles.answerQuestionCard}>
            <View style={styles.answerQuestionIcon}>
              <Ionicons name="help-circle" size={20} color="#ef4444" />
            </View>
            <View style={styles.answerQuestionContent}>
              <Text style={styles.answerQuestionText} numberOfLines={2}>
                {questionTitle || '无标题'}
              </Text>
              {Boolean(supplementText) ? (
                <View style={styles.answerSupplementInfo}>
                  <Ionicons name="arrow-forward" size={14} color="#f59e0b" />
                  <Text style={styles.answerSupplementLabel}>{supplementLabel}</Text>
                  <Text style={styles.answerSupplementText} numberOfLines={2}>
                    {supplementText}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.answerContentArea}
            contentContainerStyle={[
              styles.answerContentContainer,
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
                style={styles.answerTextInput}
                placeholder={placeholder}
                placeholderTextColor="#bbb"
                value={text}
                onChangeText={handleChangeAnswerText}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onSelectionChange={handleSelectionChange}
                selection={selection}
                multiline
                autoFocus
                maxLength={wordLimit}
                selectionColor="#ef4444"
                textAlignVertical="top"
              />
            </View>

            <ComposerImageGrid
              images={currentImages}
              onRemove={handleRemoveImage}
              containerStyle={styles.answerImagesPreview}
              itemStyle={styles.answerImagePreviewItem}
              imageStyle={styles.answerImagePreview}
              removeButtonStyle={styles.answerImageRemoveBtn}
            />

            <View style={styles.answerIdentitySection}>
              <IdentitySelector
                selectedIdentity={selectedIdentity}
                selectedTeams={selectedTeams}
                onIdentityChange={onIdentityChange}
                onTeamsChange={onTeamsChange}
              />
            </View>
          </ScrollView>
        </View>
      </ComposerModalScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  answerContentRoot: {
    flex: 1,
  },
  answerQuestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  answerQuestionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  answerQuestionContent: {
    flex: 1,
  },
  answerQuestionText: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#333',
    lineHeight: scaleFont(22),
    fontWeight: '500',
  },
  answerSupplementInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4,
  },
  answerSupplementLabel: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '600',
  },
  answerSupplementText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
  },
  answerContentArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  answerContentContainer: {
    paddingBottom: 24,
  },
  answerTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: '#333',
    lineHeight: scaleFont(26),
    minHeight: 300,
  },
  answerIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  answerImagesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  answerImagePreviewItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  answerImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  answerImageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  answerToolsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerToolItem: {
    padding: 10,
  },
  answerWordCount: {
    fontSize: scaleFont(13),
    color: '#999',
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
