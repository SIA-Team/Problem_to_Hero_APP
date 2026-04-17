import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
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
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import useMentionComposer from '../hooks/useMentionComposer';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
  DEFAULT_MENTION_SEARCH_LIMIT,
} from '../utils/mentionComposer';
import { scaleFont } from '../utils/responsive';

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
  const { height: commentWindowHeight } = useWindowDimensions();
  const [text, setText] = useState('');
  const [selectedIdentity, setSelectedIdentity] = useState('personal');
  const [selectedImages, setSelectedImages] = useState([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [recommendedMentionUsers, setRecommendedMentionUsers] = useState([]);
  const commentInputRef = React.useRef(null);

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
    baseBottomOffset: DEFAULT_MENTION_PANEL_BASE_OFFSET,
    onInvalidMention: () => showToast('\u8be5\u7528\u6237\u7f3a\u5c11\u53ef\u7528\u540d\u79f0', 'warning'),
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
          console.warn('Failed to load comment mention following users:', followError);
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
          console.warn('Failed to load comment mention recommended users:', error);
          setRecommendedMentionUsers([]);
        }
      }
    };

    loadRecommendedUsers();

    return () => {
      isActive = false;
    };
  }, [visible]);

  const handlePublish = () => {
    if (!canPublish) {
      return;
    }

    onPublish(text.trim(), selectedIdentity === 'team', selectedImages);
    setText('');
    setSelectedIdentity('personal');
    setSelectedImages([]);
    setRecommendedMentionUsers([]);
  };

  const handleImageSelected = imageUri => {
    if (selectedImages.length < 9) {
      setSelectedImages(prev => [...prev, imageUri]);
    } else {
      showToast('\u6700\u591a\u53ea\u80fd\u6dfb\u52a09\u5f20\u56fe\u7247', 'warning');
    }
    setShowImagePicker(false);
  };

  const removeImage = index => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <ComposerModalScaffold
        visible={visible}
        onClose={onClose}
        title={title}
        onSubmit={handlePublish}
        submitDisabled={!canPublish}
        submitPlacement={publishInFooter ? 'footer' : 'header'}
        closePlacement={closeOnRight ? 'right' : 'left'}
        footerPaddingBottom={bottomSafeInset + 8}
        footerBottomInset={bottomSafeInset}
        footerLeft={
          <View style={styles.toolbarLeft}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => setShowImagePicker(true)}>
              <Ionicons name="image-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn} onPress={handleMentionPress}>
              <Ionicons name="at-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarBtn}>
              <Ionicons name="happy-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        }
        footerRight={<Text style={styles.charCount}>{text.length}/500</Text>}
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
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
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

          <TextInput
            ref={commentInputRef}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={text}
            onChangeText={setText}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            multiline
            autoFocus
            maxLength={500}
            selectionColor={modalTokens.danger}
            textAlignVertical="top"
          />

          {selectedImages.length > 0 ? (
            <View style={styles.imageGrid}>
              {selectedImages.map((imageUri, index) => (
                <View key={`${imageUri}-${index}`} style={styles.imageItem}>
                  <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                  <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.identitySection}>
            <IdentitySelector
              selectedIdentity={selectedIdentity}
              onIdentityChange={setSelectedIdentity}
            />
          </View>
        </ScrollView>
      </ComposerModalScaffold>

      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleImageSelected}
        title="\u6dfb\u52a0\u56fe\u7247"
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
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
  charCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
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
});

export default WriteCommentModal;
