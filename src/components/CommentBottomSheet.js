import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

function resolveCommentAuthor(comment) {
  return comment?.userName || comment?.userNickname || comment?.author || '';
}

function CommentBottomSheetActionButton({
  actionStyles,
  icon,
  iconSize,
  iconColor,
  text,
  textStyle,
  disabled,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        actionStyles.button,
        disabled ? actionStyles.disabledButton : null,
      ]}
      onPress={onPress}
      disabled={Boolean(disabled)}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      {text !== undefined && text !== null && text !== '' ? (
        <Text style={[actionStyles.text, textStyle]}>{text}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function CommentBottomSheetActionRow({
  styles,
  variant = 'comment',
  likeAction,
  replyAction,
  shareAction,
  collectAction,
  dislikeAction,
  reportAction,
}) {
  const isReply = variant === 'reply';
  const actionStyles = {
    container: isReply ? styles.replyActions : styles.commentListActions,
    button: isReply ? styles.replyActionBtn : styles.commentListActionBtn,
    text: isReply ? styles.replyActionText : styles.commentListActionText,
    disabledButton: styles.interactionBtnDisabled,
    disabledText: styles.interactionTextDisabled,
  };
  const iconSize = isReply ? 12 : 14;

  return (
    <View style={actionStyles.container}>
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon={likeAction.active ? 'thumbs-up' : 'thumbs-up-outline'}
        iconSize={iconSize}
        iconColor={likeAction.active ? '#ef4444' : likeAction.disabled ? '#d1d5db' : '#9ca3af'}
        text={likeAction.count}
        textStyle={[
          likeAction.active ? { color: '#ef4444' } : null,
          likeAction.disabled ? actionStyles.disabledText : null,
        ]}
        disabled={likeAction.buttonDisabled || likeAction.disabled}
        onPress={likeAction.onPress}
      />
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon="chatbubble-outline"
        iconSize={iconSize}
        iconColor="#9ca3af"
        text={replyAction.count}
        onPress={replyAction.onPress}
      />
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon="arrow-redo-outline"
        iconSize={iconSize}
        iconColor="#9ca3af"
        text={shareAction.count}
        onPress={shareAction.onPress}
      />
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon={collectAction.active ? 'star' : 'star-outline'}
        iconSize={iconSize}
        iconColor={collectAction.active ? '#f59e0b' : '#9ca3af'}
        text={collectAction.count}
        textStyle={collectAction.active ? { color: '#f59e0b' } : null}
        disabled={collectAction.buttonDisabled}
        onPress={collectAction.onPress}
      />
      <View style={{ flex: 1 }} />
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon={dislikeAction.active ? 'thumbs-down' : 'thumbs-down-outline'}
        iconSize={iconSize}
        iconColor={dislikeAction.active ? '#6b7280' : dislikeAction.disabled ? '#d1d5db' : '#9ca3af'}
        text={dislikeAction.count}
        textStyle={[
          dislikeAction.active ? { color: '#6b7280' } : null,
          dislikeAction.disabled ? actionStyles.disabledText : null,
        ]}
        disabled={dislikeAction.buttonDisabled || dislikeAction.disabled}
        onPress={dislikeAction.onPress}
      />
      <CommentBottomSheetActionButton
        actionStyles={actionStyles}
        icon="flag-outline"
        iconSize={iconSize}
        iconColor="#ef4444"
        text={reportAction.count}
        onPress={reportAction.onPress}
      />
    </View>
  );
}

export default function CommentBottomSheet({
  visible,
  onClose,
  title,
  styles,
  headerLeft,
  headerRight,
  children,
  footer,
}) {
  const leftSlot = headerLeft !== undefined ? headerLeft : <View style={styles.commentListHeaderLeft} />;
  const rightSlot = headerRight !== undefined ? headerRight : <View style={styles.commentListHeaderLeft} />;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.commentListModal}>
          <View style={styles.commentListModalHandle} />
          <View style={styles.commentListModalHeader}>
            {leftSlot}
            <Text style={styles.commentListModalTitle}>{title}</Text>
            {rightSlot}
          </View>
          {children}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

export function CommentBottomSheetIconButton({
  icon,
  onPress,
  styles,
  side = 'right',
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.commentListCloseBtn,
        side === 'left' ? { left: 16, right: 'auto' } : null,
      ]}
    >
      <Ionicons name={icon} size={26} color="#1f2937" />
    </TouchableOpacity>
  );
}

export function CommentBottomSheetOriginalComment({
  comment,
  styles,
  onPressAuthor,
}) {
  if (!comment) {
    return null;
  }

  return (
    <View style={styles.originalCommentCard}>
      <TouchableOpacity
        style={styles.originalCommentHeader}
        activeOpacity={0.7}
        onPress={() => onPressAuthor?.(comment)}
      >
        <Avatar
          uri={comment.userAvatar || comment.avatar}
          name={resolveCommentAuthor(comment)}
          size={32}
        />
        <Text style={styles.originalCommentAuthor}>{resolveCommentAuthor(comment)}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.originalCommentTime}>{comment.time}</Text>
      </TouchableOpacity>
      <Text style={styles.originalCommentText}>{comment.content}</Text>
    </View>
  );
}

export function CommentBottomSheetSectionHeader({ title, styles }) {
  return (
    <View style={styles.repliesSectionHeader}>
      <Text style={styles.repliesSectionTitle}>{title}</Text>
    </View>
  );
}

export function CommentBottomSheetWriteBar({
  label,
  onPress,
  styles,
  bottomSpacing,
}) {
  return (
    <View style={[styles.commentListBottomBar, { paddingBottom: bottomSpacing }]}>
      <TouchableOpacity style={styles.commentListWriteBtn} onPress={onPress}>
        <Ionicons name="create-outline" size={18} color="#6b7280" />
        <Text style={styles.commentListWriteText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CommentBottomSheetCommentCard({
  comment,
  styles,
  onPressAuthor,
  isLiked,
  isCollected,
  isDisliked,
  likeDisabled,
  dislikeDisabled,
  likeCount,
  replyCount,
  shareCount,
  collectCount,
  dislikeCount,
  reportCount,
  onLike,
  onReply,
  onShare,
  onCollect,
  onDislike,
  onReport,
  likeButtonDisabled,
  collectButtonDisabled,
  dislikeButtonDisabled,
}) {
  const authorName = resolveCommentAuthor(comment);

  return (
    <View style={styles.commentListCard}>
      <TouchableOpacity
        style={styles.commentListHeader}
        activeOpacity={0.7}
        onPress={() => onPressAuthor?.(comment)}
      >
        <Avatar uri={comment?.userAvatar || comment?.avatar} name={authorName} size={24} />
        <Text style={styles.commentListAuthor}>{authorName}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.commentListTime}>{comment?.time}</Text>
      </TouchableOpacity>
      <View style={styles.commentListContent}>
        <Text style={styles.commentListText}>{comment?.content}</Text>
        <CommentBottomSheetActionRow
          styles={styles}
          variant="comment"
          likeAction={{
            active: isLiked,
            disabled: likeDisabled,
            count: likeCount,
            buttonDisabled: likeButtonDisabled,
            onPress: () => onLike?.(comment),
          }}
          replyAction={{
            count: replyCount,
            onPress: () => onReply?.(comment),
          }}
          shareAction={{
            count: shareCount,
            onPress: () => onShare?.(comment),
          }}
          collectAction={{
            active: isCollected,
            count: collectCount,
            buttonDisabled: collectButtonDisabled,
            onPress: () => onCollect?.(comment),
          }}
          dislikeAction={{
            active: isDisliked,
            disabled: dislikeDisabled,
            count: dislikeCount,
            buttonDisabled: dislikeButtonDisabled,
            onPress: () => onDislike?.(comment),
          }}
          reportAction={{
            count: reportCount,
            onPress: () => onReport?.(comment),
          }}
        />
      </View>
    </View>
  );
}

export function CommentBottomSheetReplyCard({
  reply,
  styles,
  onPressAuthor,
  shouldShowReplyRelation,
  relationUserName,
  isLiked,
  isCollected,
  isDisliked,
  likeDisabled,
  dislikeDisabled,
  likeCount,
  replyCount,
  shareCount,
  collectCount,
  dislikeCount,
  reportCount,
  onLike,
  onReply,
  onShare,
  onCollect,
  onDislike,
  onReport,
  likeButtonDisabled,
  collectButtonDisabled,
  dislikeButtonDisabled,
}) {
  const authorName = resolveCommentAuthor(reply);

  return (
    <View style={styles.replyCard}>
      <TouchableOpacity
        style={styles.replyHeader}
        activeOpacity={0.7}
        onPress={() => onPressAuthor?.(reply)}
      >
        <Avatar uri={reply?.userAvatar || reply?.avatar} name={authorName} size={24} />
        <View style={styles.replyAuthorMeta}>
          <View style={styles.replyAuthorLine}>
            <Text style={styles.replyAuthor}>{authorName}</Text>
            {shouldShowReplyRelation ? (
              <>
                <Text style={styles.replyAuthorRelation}> 回复 </Text>
                <Text style={styles.replyReplyTarget}>{relationUserName}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.replyTime}>{reply?.time}</Text>
      </TouchableOpacity>
      <Text style={styles.replyText}>{reply?.content}</Text>
      <CommentBottomSheetActionRow
        styles={styles}
        variant="reply"
        likeAction={{
          active: isLiked,
          disabled: likeDisabled,
          count: likeCount,
          buttonDisabled: likeButtonDisabled,
          onPress: () => onLike?.(reply),
        }}
        replyAction={{
          count: replyCount,
          onPress: () => onReply?.(reply),
        }}
        shareAction={{
          count: shareCount,
          onPress: () => onShare?.(reply),
        }}
        collectAction={{
          active: isCollected,
          count: collectCount,
          buttonDisabled: collectButtonDisabled,
          onPress: () => onCollect?.(reply),
        }}
        dislikeAction={{
          active: isDisliked,
          disabled: dislikeDisabled,
          count: dislikeCount,
          buttonDisabled: dislikeButtonDisabled,
          onPress: () => onDislike?.(reply),
        }}
        reportAction={{
          count: reportCount,
          onPress: () => onReport?.(reply),
        }}
      />
    </View>
  );
}

export function CommentBottomSheetListBody({
  styles,
  loading,
  items = [],
  renderItem,
  loadingText = 'Loading...',
  emptyIcon = 'chatbubble-outline',
  emptyTitle = 'No content',
  emptyDescription,
  loadingMore,
  loadingMoreText = 'Loading more...',
  hasMore,
  onLoadMore,
  loadMoreText = 'Load more',
  noMoreText = 'No more content',
}) {
  return (
    <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
      {loading && items.length === 0 ? (
        <View style={styles.supplementsLoadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.supplementsLoadingText}>{loadingText}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.supplementsEmptyContainer}>
          <Ionicons name={emptyIcon} size={48} color="#d1d5db" />
          <Text style={styles.supplementsEmptyText}>{emptyTitle}</Text>
          {emptyDescription ? (
            <Text style={styles.supplementsEmptyDesc}>{emptyDescription}</Text>
          ) : null}
        </View>
      ) : (
        items.map(renderItem)
      )}
      {Boolean(loadingMore) ? (
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>{loadingMoreText}</Text>
        </View>
      ) : null}
      {Boolean(hasMore && !loadingMore && items.length > 0) ? (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={onLoadMore}>
          <Text style={styles.loadMoreText}>{loadMoreText}</Text>
          <Ionicons name="chevron-down" size={16} color="#ef4444" />
        </TouchableOpacity>
      ) : null}
      {!hasMore && items.length > 0 ? (
        <View style={styles.supplementsNoMore}>
          <Text style={styles.supplementsNoMoreText}>{noMoreText}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function CommentBottomSheetReplyPanel({
  visible,
  onClose,
  title,
  styles,
  headerLeft,
  headerRight,
  footer,
  originalComment,
  onPressAuthor,
  sectionTitle = 'Replies',
  children,
  emptyState,
}) {
  return (
    <CommentBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      styles={styles}
      headerLeft={headerLeft}
      headerRight={headerRight}
      footer={footer}
    >
      <CommentBottomSheetOriginalComment
        comment={originalComment}
        styles={styles}
        onPressAuthor={onPressAuthor}
      />
      <CommentBottomSheetSectionHeader title={sectionTitle} styles={styles} />
      <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
        {children}
        {emptyState}
      </ScrollView>
    </CommentBottomSheet>
  );
}
