import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IdentitySelector from './IdentitySelector';
import ImagePickerSheet from './ImagePickerSheet';
import ComposerModalScaffold from './ComposerModalScaffold';
import MentionSuggestionsPanel from './MentionSuggestionsPanel';
import userApi from '../services/api/userApi';
import { showToast } from '../utils/toast';
import {
  mergeLocalInviteUsers,
  normalizeFollowingInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import useMentionComposer from '../hooks/useMentionComposer';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
  DEFAULT_MENTION_SEARCH_LIMIT,
} from '../utils/mentionComposer';
import { scaleFont } from '../utils/responsive';

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
  const { height: answerWindowHeight } = useWindowDimensions();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [recommendedMentionUsers, setRecommendedMentionUsers] = useState([]);
  const answerInputRef = React.useRef(null);

  const currentImages = Array.isArray(images) ? images : [];
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

  useEffect(() => {
    if (!visible) {
      setRecommendedMentionUsers([]);
      return undefined;
    }

    let isActive = true;
    const fallbackSearchKeywords = ['a', 'e', 'm', '1', '8'];

    const loadRecommendedUsers = async () => {
      try {
        let mergedUsers = [];

        try {
          const response = await userApi.getFollowing({
            pageNum: 1,
            page: 1,
            pageSize: 20,
            size: 20,
            limit: 20,
          });
          mergedUsers = mergeLocalInviteUsers(normalizeFollowingInviteUsers(response));
        } catch (followError) {
          console.warn('Failed to load answer mention following users:', followError);
        }

        if (mergedUsers.length < 6) {
          const fallbackResults = await Promise.allSettled(
            fallbackSearchKeywords.map(keyword => userApi.searchPublicProfiles(keyword, 10))
          );

          fallbackResults.forEach(result => {
            if (result.status !== 'fulfilled') {
              return;
            }

            mergedUsers = mergeLocalInviteUsers([
              ...mergedUsers,
              ...normalizePublicUserSearchResponse(result.value),
            ]);
          });
        }

        if (isActive) {
          setRecommendedMentionUsers(mergedUsers.slice(0, DEFAULT_MENTION_SEARCH_LIMIT));
        }
      } catch (error) {
        if (isActive) {
          console.warn('Failed to load answer mention recommended users:', error);
          setRecommendedMentionUsers([]);
        }
      }
    };

    loadRecommendedUsers();

    return () => {
      isActive = false;
    };
  }, [visible]);

  const handleAddImage = imageUri => {
    if (currentImages.length >= 9) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }

    onChangeImages?.([...currentImages, imageUri]);
    setShowImagePicker(false);
  };

  const handleRemoveImage = index => {
    onChangeImages?.(currentImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleOpenImagePicker = () => {
    if (currentImages.length >= 9) {
      showToast('最多只能添加9张图片', 'warning');
      return;
    }

    setShowImagePicker(true);
  };

  return (
    <>
      <ComposerModalScaffold
        visible={visible}
        onClose={onClose}
        title={title}
        onSubmit={onSubmit}
        submitText={publishText}
        submitDisabled={!canSubmit}
        footerPaddingBottom={bottomSafeInset + 8}
        footerBottomInset={bottomSafeInset}
        footerLeft={
          <View style={styles.answerToolsLeft}>
            <TouchableOpacity style={styles.answerToolItem} onPress={handleOpenImagePicker}>
              <Ionicons name="image-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.answerToolItem} onPress={handleMentionPress}>
              <Ionicons name="at-outline" size={24} color="#666" />
            </TouchableOpacity>
            {showTagTool ? (
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="pricetag-outline" size={24} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
        }
        footerRight={
          <Text style={styles.answerWordCount}>
            {text.length}/{wordLimit}
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
            style={styles.answerContentArea}
            scrollEnabled={!shouldShowMentionPanel}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={shouldShowMentionPanel ? 'none' : 'interactive'}
          >
            <TextInput
              ref={answerInputRef}
              style={styles.answerTextInput}
              placeholder={placeholder}
              placeholderTextColor="#bbb"
              value={text}
              onChangeText={onChangeText}
              onSelectionChange={handleSelectionChange}
              selection={selection}
              multiline
              autoFocus
              maxLength={wordLimit}
              selectionColor="#ef4444"
              textAlignVertical="top"
            />

            {currentImages.length > 0 ? (
              <View style={styles.answerImagesPreview}>
                {currentImages.map((imageUri, index) => (
                  <View key={`${imageUri}_${index}`} style={styles.answerImagePreviewItem}>
                    <Image source={{ uri: imageUri }} style={styles.answerImagePreview} />
                    <TouchableOpacity
                      style={styles.answerImageRemoveBtn}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

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

      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleAddImage}
      />
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
  answerTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: '#333',
    lineHeight: scaleFont(26),
    minHeight: 300,
  },
  answerIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
});
