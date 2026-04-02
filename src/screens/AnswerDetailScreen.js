import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import IdentitySelector from '../components/IdentitySelector';
import { modalTokens } from '../components/modalTokens';
import SupplementAnswerSkeleton from '../components/SupplementAnswerSkeleton';
import SupplementAnswerModal from '../components/SupplementAnswerModal';
import ShareModal from '../components/ShareModal';
import WriteCommentModal from '../components/WriteCommentModal';
import EmptyState from '../components/EmptyState';
import { toast } from '../utils/toast';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { normalizeEntityId } from '../utils/jsonLongId';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';
import answerApi from '../services/api/answerApi';
import commentApi from '../services/api/commentApi';

import { scaleFont } from '../utils/responsive';
const INITIAL_SUPPLEMENT_PAGINATION = {
  pageNum: 1,
  pageSize: 10,
  hasMore: true,
  total: 0
};
const INITIAL_COMMENT_LIST_STATE = {
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 10,
  hasMore: true,
  loaded: false,
  loading: false,
  refreshing: false,
  loadingMore: false,
  targetId: null,
  error: null
};
const INITIAL_COMMENT_COMPOSER_TARGET = {
  targetId: null,
  parentId: 0,
  replyToCommentId: 0,
  replyToUserId: null,
  replyToUserName: '',
  originalComment: null
};
const DEFAULT_ANSWER_DETAIL = {
  id: 1,
  author: 'Python 老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
  verified: true,
  title: '资深 Python 开发 · 10 年经验',
  content: '如果你是从零开始学 Python，建议先打好语法基础，再逐步做一些小项目来巩固。',
  likes: 256,
  dislikes: 3,
  shares: 45,
  bookmarks: 89,
  comments: 128,
  views: 1234,
  time: '1小时前',
  adopted: true,
  invitedBy: {
    name: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=inviter1'
  }
};
const normalizeCount = (...values) => {
  for (const value of values) {
    const normalized = Number(value);
    if (!Number.isNaN(normalized)) {
      return normalized;
    }
  }
  return 0;
};
const hasCountValue = (...values) => values.some(value => value !== undefined && value !== null && value !== '');
const normalizeFlag = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === '1' || normalized === 'true') {
        return true;
      }
      if (normalized === '0' || normalized === 'false') {
        return false;
      }
    }
  }
  return false;
};
const pickDisplayText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};
const getInteractionDisplayCount = (baseCount, serverState, localState) => {
  const normalizedBase = normalizeCount(baseCount);
  const safeLocalState = localState === undefined ? serverState : localState;
  if (!!safeLocalState === !!serverState) {
    return normalizedBase;
  }
  return Math.max(normalizedBase + (safeLocalState ? 1 : -1), 0);
};
const getResolvedViewerInteractionCount = (baseCount, isActive, isResolved = false) => {
  const normalizedBase = normalizeCount(baseCount);
  if (!isActive || isResolved) {
    return normalizedBase;
  }
  return normalizedBase + 1;
};
const getResolvedInteractionDisplayCount = (baseCount, serverState, localState, isResolved = false) => {
  const normalizedBase = normalizeCount(baseCount);
  const resolvedBase = !!serverState && !isResolved ? normalizedBase + 1 : normalizedBase;
  const safeLocalState = localState === undefined ? serverState : localState;
  if (!!safeLocalState === !!serverState) {
    return !!safeLocalState ? Math.max(resolvedBase, 1) : resolvedBase;
  }
  const nextDisplayCount = Math.max(resolvedBase + (safeLocalState ? 1 : -1), 0);
  return !!safeLocalState ? Math.max(nextDisplayCount, 1) : nextDisplayCount;
};
export default function AnswerDetailScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const isFocused = useIsFocused();

  // Generate tabs with translations
  const getTabLabel = (index, count) => {
    if (index === 0) {
      return `${t('screens.answerDetail.tabs.supplements')} (${count})`;
    } else {
      return `${t('screens.answerDetail.tabs.comments')} (${count})`;
    }
  };
  const [activeTab, setActiveTab] = useState(0); // 0 for supplements, 1 for comments - default to supplements
  const [sortFilter, setSortFilter] = useState('featured'); // featured or newest
  const [answerCommentSortBy, setAnswerCommentSortBy] = useState('likes');
  const [supplementCollectLoading, setSupplementCollectLoading] = useState({});
  const [supplementLikeLoading, setSupplementLikeLoading] = useState({});
  const [supplementDislikeLoading, setSupplementDislikeLoading] = useState({});

  // 鍥炵瓟鐨勭敤鎴风姸鎬?- 寤惰繜鍒濆鍖栵紝閬垮厤渚濊禆鏈畬鎴愮殑answer瀵硅薄
  const [answerLiked, setAnswerLiked] = useState(false);
  const [answerBookmarked, setAnswerBookmarked] = useState(false);
  const [answerDisliked, setAnswerDisliked] = useState(false);
  const [answerCommentListState, setAnswerCommentListState] = useState(INITIAL_COMMENT_LIST_STATE);
  const [answerCommentTarget, setAnswerCommentTarget] = useState(INITIAL_COMMENT_COMPOSER_TARGET);
  const [answerCommentLiked, setAnswerCommentLiked] = useState({});
  const [answerCommentCollected, setAnswerCommentCollected] = useState({});
  const [answerCommentDisliked, setAnswerCommentDisliked] = useState({});
  const [answerCommentLikeLoading, setAnswerCommentLikeLoading] = useState({});
  const [answerCommentCollectLoading, setAnswerCommentCollectLoading] = useState({});
  const [answerCommentDislikeLoading, setAnswerCommentDislikeLoading] = useState({});
  const [showAnswerCommentReplyModal, setShowAnswerCommentReplyModal] = useState(false);
  const [currentAnswerCommentId, setCurrentAnswerCommentId] = useState(null);
  const [answerCommentRepliesMap, setAnswerCommentRepliesMap] = useState({});
  const [expandedAnswerReplyChildren, setExpandedAnswerReplyChildren] = useState({});
  const answerCommentsList = answerCommentListState.list;
  const [following, setFollowing] = useState(false);
  const [showSupplementCommentListModal, setShowSupplementCommentListModal] = useState(false);
  const [showSupplementCommentReplyModal, setShowSupplementCommentReplyModal] = useState(false);
  const [showSupplementCommentComposerModal, setShowSupplementCommentComposerModal] = useState(false);
  const [currentSupplementCommentTargetId, setCurrentSupplementCommentTargetId] = useState(null);
  const [currentSupplementCommentId, setCurrentSupplementCommentId] = useState(null);
  const [supplementCommentListState, setSupplementCommentListState] = useState(INITIAL_COMMENT_LIST_STATE);
  const [supplementCommentRepliesMap, setSupplementCommentRepliesMap] = useState({});
  const [expandedSupplementReplyChildren, setExpandedSupplementReplyChildren] = useState({});
  const [supplementCommentTarget, setSupplementCommentTarget] = useState({
    targetId: null,
    parentId: 0,
    replyToCommentId: 0,
    replyToUserId: null,
    replyToUserName: '',
    originalComment: null
  });
  const [supplementCommentLiked, setSupplementCommentLiked] = useState({});
  const [supplementCommentCollected, setSupplementCommentCollected] = useState({});
  const [supplementCommentDisliked, setSupplementCommentDisliked] = useState({});
  const [supplementCommentLikeLoading, setSupplementCommentLikeLoading] = useState({});
  const [supplementCommentCollectLoading, setSupplementCommentCollectLoading] = useState({});
  const [supplementCommentDislikeLoading, setSupplementCommentDislikeLoading] = useState({});
  const supplementCommentsList = supplementCommentListState.list;

  // 琛ュ厖鍥炵瓟鐩稿叧鐘舵€?
  const [supplementAnswers, setSupplementAnswers] = useState([]);
  const [supplementLoading, setSupplementLoading] = useState(false);
  const [supplementError, setSupplementError] = useState(null);
  const [supplementPagination, setSupplementPagination] = useState(INITIAL_SUPPLEMENT_PAGINATION);

  // 鍥炵瓟鏁版嵁鐘舵€?- 鐢ㄤ簬绠＄悊瀹屾暣鐨勫洖绛旀暟鎹?
  const [answerData, setAnswerData] = useState(null);

  // 鏀惰棌鐩稿叧鐘舵€佸拰闃查噸闃叉姈
  const [isCollectLoading, setIsCollectLoading] = useState(false);
  const collectTimeoutRef = useRef(null);
  const lastCollectTimeRef = useRef(0);
  const hasFocusedOnceRef = useRef(false);

  // 浠茶鐩稿叧鐘舵€?
  const [showArbitrationModal, setShowArbitrationModal] = useState(false);
  const [arbitrationReason, setArbitrationReason] = useState('');
  const [selectedExperts, setSelectedExperts] = useState([]);
  const [expertSearchText, setExpertSearchText] = useState('');

  // 琛ュ厖鍥炵瓟鐩稿叧鐘舵€?
  const [showSupplementAnswerModal, setShowSupplementAnswerModal] = useState(false);
  const [showWriteCommentModal, setShowWriteCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareData, setCurrentShareData] = useState(null);

  // 鎻愪氦琛ュ厖鍥炵瓟 - 宸茬Щ鑷?SupplementAnswerModal 缁勪欢

  // 可邀请的专家列表
  const expertsList = [{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert1',
    title: 'Python 架构师',
    verified: true,
    expertise: 'Python 开发'
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert2',
    title: '数据科学家',
    verified: true,
    expertise: '数据分析'
  }, {
    id: 3,
    name: '赵强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert3',
    title: '技术总监',
    verified: true,
    expertise: '技术管理'
  }, {
    id: 4,
    name: '刘洋',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert4',
    title: 'AI 工程师',
    verified: true,
    expertise: '机器学习'
  }, {
    id: 5,
    name: '陈静',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert5',
    title: '全栈开发',
    verified: true,
    expertise: 'Web 开发'
  }];
  const formatSupplementAnswerTime = timeValue => {
    if (!timeValue) {
      return t('screens.answerDetail.time.justNow');
    }
    if (typeof timeValue === 'string') {
      const directText = timeValue.trim();
      const maybeTimestamp = new Date(directText);
      if (directText && Number.isNaN(maybeTimestamp.getTime())) {
        return directText;
      }
    }
    try {
      const time = new Date(timeValue);
      const now = new Date();
      const diff = now - time;
      if (Number.isNaN(time.getTime()) || diff < 0) {
        return t('screens.answerDetail.time.justNow');
      }
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days >= 1) {
        return `${days}${t('screens.answerDetail.time.daysAgo')}`;
      }
      if (hours >= 1) {
        return `${hours}${t('screens.answerDetail.time.hoursAgo')}`;
      }
      if (minutes >= 1) {
        return `${minutes}${t('screens.answerDetail.time.minutesAgo')}`;
      }
      return t('screens.answerDetail.time.justNow');
    } catch (error) {
      return t('screens.answerDetail.time.justNow');
    }
  };
  const normalizeAnswerDetail = item => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    const likeCountResolved = normalizeFlag(item.__likeCountResolved, hasCountValue(item.likeCount, item.like_count, item.likes));
    const dislikeCountResolved = normalizeFlag(item.__dislikeCountResolved, hasCountValue(item.dislikeCount, item.dislike_count, item.dislikes));
    const collectCountResolved = normalizeFlag(item.__collectCountResolved, hasCountValue(item.collectCount, item.collect_count, item.bookmarks, item.bookmarkCount));
    const normalizedId = item.id ?? item.answerId ?? item.answer_id ?? null;
    const normalizedAuthor = pickDisplayText(item.authorNickName, item.userNickname, item.userName, item.author, item.nickName, item.nickname) || t('home.anonymous');
    const normalizedAvatar = pickDisplayText(item.authorAvatar, item.userAvatar, item.avatar, item.headImg, item.headImage) || null;
    const normalizedInviterName = pickDisplayText(item.invitedBy?.name, item.inviterName, item.invitedUserName, item.invitedNickName);
    const normalizedInviterAvatar = pickDisplayText(item.invitedBy?.avatar, item.inviterAvatar, item.invitedUserAvatar);
    const normalizedTime = formatSupplementAnswerTime(item.createTime ?? item.createdAt ?? item.updateTime ?? item.updatedAt ?? item.time);
    return {
      ...item,
      id: normalizedId,
      answerId: normalizedId,
      author: normalizedAuthor,
      userName: normalizedAuthor,
      userNickname: item.userNickname ?? item.authorNickName ?? normalizedAuthor,
      authorNickName: item.authorNickName ?? normalizedAuthor,
      avatar: normalizedAvatar,
      userAvatar: normalizedAvatar,
      authorAvatar: pickDisplayText(item.authorAvatar, item.userAvatar, item.avatar, item.headImg, item.headImage) || null,
      questionId: item.questionId ?? item.question_id ?? null,
      supplementId: item.supplementId ?? item.supplement_id ?? null,
      userId: item.userId ?? item.user_id ?? null,
      title: pickDisplayText(item.title, item.authorTitle, item.userTitle, item.position),
      content: item.content ?? item.description ?? '',
      time: normalizedTime,
      location: pickDisplayText(item.location, item.ipLocation, item.city) || t('screens.answerDetail.states.unknownLocation'),
      viewCount: normalizeCount(item.viewCount, item.view_count, item.views),
      views: normalizeCount(item.viewCount, item.view_count, item.views),
      likeCount: normalizeCount(item.likeCount, item.like_count, item.likes),
      likes: normalizeCount(item.likeCount, item.like_count, item.likes),
      commentCount: normalizeCount(item.commentCount, item.comment_count, item.comments),
      comments: normalizeCount(item.commentCount, item.comment_count, item.comments),
      supplementCount: normalizeCount(item.supplementCount, item.supplement_count),
      collectCount: normalizeCount(item.collectCount, item.collect_count, item.bookmarks, item.bookmarkCount),
      bookmarkCount: normalizeCount(item.collectCount, item.collect_count, item.bookmarks, item.bookmarkCount),
      bookmarks: normalizeCount(item.collectCount, item.collect_count, item.bookmarks, item.bookmarkCount),
      dislikeCount: normalizeCount(item.dislikeCount, item.dislike_count, item.dislikes),
      dislikes: normalizeCount(item.dislikeCount, item.dislike_count, item.dislikes),
      shareCount: normalizeCount(item.shareCount, item.share_count, item.shares),
      shares: normalizeCount(item.shareCount, item.share_count, item.shares),
      superLikeCount: normalizeCount(item.superLikeCount, item.super_like_count, item.superLikes),
      superLikes: normalizeCount(item.superLikeCount, item.super_like_count, item.superLikes),
      featureScore: normalizeCount(item.featureScore, item.feature_score),
      isTop: normalizeFlag(item.isTop, item.top, item.is_top),
      verified: normalizeFlag(item.verified, item.isVerified, item.authorVerified),
      liked: normalizeFlag(item.liked, item.isLiked),
      disliked: normalizeFlag(item.disliked, item.isDisliked),
      collected: normalizeFlag(item.collected, item.isCollected, item.bookmarked, item.isBookmarked),
      __likeCountResolved: likeCountResolved,
      __dislikeCountResolved: dislikeCountResolved,
      __collectCountResolved: collectCountResolved,
      adopted: normalizeFlag(item.adopted, item.isAccepted, item.isAdopted),
      canAdopt: normalizeFlag(item.canAdopt),
      canEdit: normalizeFlag(item.canEdit),
      invitedBy: normalizedInviterName ? {
        name: normalizedInviterName,
        avatar: normalizedInviterAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=inviter-${normalizedId ?? 'default'}`
      } : item.invitedBy ?? null,
      imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : []
    };
  };

  // 获取完整的回答数据（包含统计信息）
  const routeFallbackAnswer = React.useMemo(() => {
    const routeAnswerId = Number(route?.params?.id ?? route?.params?.answerId ?? 0) || null;
    const routeQuestionId = Number(route?.params?.questionId ?? route?.params?.question?.id ?? 0) || null;

    if (!routeAnswerId) {
      return null;
    }

    return {
      id: routeAnswerId,
      questionId: routeQuestionId,
    };
  }, [route?.params?.answerId, route?.params?.id, route?.params?.question?.id, route?.params?.questionId]);
  const answer =
    normalizeAnswerDetail(answerData || route?.params?.updatedAnswer || route?.params?.answer || routeFallbackAnswer) ||
    DEFAULT_ANSWER_DETAIL;
  const answerQuestionId = Number(route?.params?.questionId ?? answer?.questionId ?? route?.params?.question?.id ?? 0) || null;
  const openPublicProfile = (target, options = {}) => navigateToPublicProfile(navigation, target, options);
  const openShareModalWithData = payload => {
    if (!payload) {
      return;
    }

    setCurrentShareData(payload);
    setShowShareModal(true);
  };
  const closeShareModal = () => {
    setShowShareModal(false);
    setCurrentShareData(null);
  };
  const buildAnswerSharePayload = () => ({
    title: answer?.title || '',
    content: answer?.content || '',
    type: 'shareanswer',
    qid: answerQuestionId,
    aid: Number(answer?.id) || null
  });
  const buildAnswerCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getAnswerCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    return {
      title: answer?.title || '',
      content: comment?.content || answer?.content || '',
      type: 'sharecomment',
      qid: answerQuestionId,
      aid: Number(answer?.id) || null,
      cid: commentId,
      rootCid
    };
  };
  const buildSupplementCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getSupplementCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    return {
      title: answer?.title || '',
      content: comment?.content || '',
      type: 'sharecomment',
      qid: answerQuestionId,
      sid: Number(currentSupplementCommentTargetId) || null,
      cid: commentId,
      rootCid
    };
  };
  const handleShare = (platform, sharePayload) => {
    console.log('Answer detail shared via:', platform, sharePayload);
  };
  const normalizeSupplementAnswerItem = item => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    const normalizedId = item.id ?? item.supplementAnswerId ?? item.supplement_answer_id ?? null;
    const normalizedAuthor = pickDisplayText(item.authorNickName, item.userNickname, item.userName, item.author, item.nickName, item.nickname) || t('home.anonymous');
    const normalizedAvatar = pickDisplayText(item.authorAvatar, item.userAvatar, item.avatar, item.headImg, item.headImage) || null;
    const normalizedLikeCount = normalizeCount(item.likeCount, item.likes, item.like_count);
    const normalizedDislikeCount = normalizeCount(item.dislikeCount, item.dislikes, item.dislike_count);
    const normalizedCommentCount = normalizeCount(item.commentCount, item.comments, item.comment_count);
    const normalizedShareCount = normalizeCount(item.shareCount, item.shares, item.share_count);
    const normalizedCollectCount = normalizeCount(item.collectCount, item.bookmarkCount, item.bookmarks, item.collect_count);
    const normalizedAdopted = normalizeFlag(item.adopted, item.isAccepted, item.isAdopted);
    const likeCountResolved = normalizeFlag(item.__likeCountResolved, hasCountValue(item.likeCount, item.likes, item.like_count));
    const dislikeCountResolved = normalizeFlag(item.__dislikeCountResolved, hasCountValue(item.dislikeCount, item.dislikes, item.dislike_count));
    const collectCountResolved = normalizeFlag(item.__collectCountResolved, hasCountValue(item.collectCount, item.bookmarkCount, item.bookmarks, item.collect_count));
    return {
      ...item,
      id: normalizedId,
      supplementAnswerId: normalizedId,
      answerId: item.answerId ?? item.answer_id ?? answer.id ?? null,
      questionId: item.questionId ?? item.question_id ?? answer.questionId ?? null,
      userId: item.userId ?? item.user_id ?? null,
      author: normalizedAuthor,
      userName: normalizedAuthor,
      userNickname: item.userNickname ?? item.authorNickName ?? normalizedAuthor,
      authorNickName: item.authorNickName ?? normalizedAuthor,
      avatar: normalizedAvatar,
      userAvatar: normalizedAvatar,
      authorAvatar: pickDisplayText(item.authorAvatar, item.userAvatar, item.avatar, item.headImg, item.headImage) || null,
      verified: normalizeFlag(item.verified, item.isVerified, item.authorVerified),
      location: pickDisplayText(item.location, item.ipLocation, item.city) || t('screens.answerDetail.states.unknownLocation'),
      content: item.content ?? item.description ?? item.text ?? '',
      likeCount: normalizedLikeCount,
      likes: normalizedLikeCount,
      dislikeCount: normalizedDislikeCount,
      dislikes: normalizedDislikeCount,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount,
      shareCount: normalizedShareCount,
      shares: normalizedShareCount,
      collectCount: normalizedCollectCount,
      bookmarkCount: normalizedCollectCount,
      bookmarks: normalizedCollectCount,
      time: formatSupplementAnswerTime(item.createTime ?? item.createdAt ?? item.updateTime ?? item.updatedAt),
      liked: normalizeFlag(item.liked, item.isLiked),
      disliked: normalizeFlag(item.disliked, item.isDisliked),
      collected: normalizeFlag(item.collected, item.isCollected, item.bookmarked, item.isBookmarked),
      __likeCountResolved: likeCountResolved,
      __dislikeCountResolved: dislikeCountResolved,
      __collectCountResolved: collectCountResolved,
      adopted: normalizedAdopted,
      canEdit: !!(item.canEdit ?? false),
      imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : []
    };
  };
  const normalizeSupplementAnswerList = (rows = []) => rows.map(normalizeSupplementAnswerItem);
  const buildSupplementAnswerMutationResult = (currentSupplement = {}, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
    const liked = typeof responseData === 'boolean' && fallbackValues.liked !== undefined ? responseData : payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentSupplement.liked ?? false;
    const collected = typeof responseData === 'boolean' && fallbackValues.collected !== undefined ? responseData : payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentSupplement.collected ?? false;
    const disliked = typeof responseData === 'boolean' && fallbackValues.disliked !== undefined ? responseData : payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentSupplement.disliked ?? false;
    const likeCount = Number(fallbackValues.likeCount ?? payload.likeCount ?? payload.likes ?? currentSupplement.likeCount ?? currentSupplement.likes) || 0;
    const collectCount = Number(fallbackValues.collectCount ?? payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? currentSupplement.collectCount ?? currentSupplement.bookmarkCount ?? currentSupplement.bookmarks) || 0;
    const dislikeCount = Number(fallbackValues.dislikeCount ?? payload.dislikeCount ?? payload.dislikes ?? currentSupplement.dislikeCount ?? currentSupplement.dislikes) || 0;
    return normalizeSupplementAnswerItem({
      ...currentSupplement,
      ...payload,
      liked: !!liked,
      collected: !!collected,
      disliked: !!disliked,
      likeCount,
      collectCount,
      dislikeCount,
      likes: likeCount,
      bookmarkCount: collectCount,
      bookmarks: collectCount,
      dislikes: dislikeCount,
      __likeCountResolved: fallbackValues.likeCount !== undefined ? true : currentSupplement.__likeCountResolved,
      __collectCountResolved: fallbackValues.collectCount !== undefined ? true : currentSupplement.__collectCountResolved,
      __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentSupplement.__dislikeCountResolved
    });
  };
  const getSupplementLikeDisplayCount = supplement => getResolvedViewerInteractionCount(supplement?.likeCount ?? supplement?.likes ?? 0, supplement?.liked, supplement?.__likeCountResolved);
  const getSupplementDislikeDisplayCount = supplement => getResolvedViewerInteractionCount(supplement?.dislikeCount ?? supplement?.dislikes ?? 0, supplement?.disliked, supplement?.__dislikeCountResolved);
  const updateSupplementAnswerItem = (supplementId, updater) => {
    setSupplementAnswers(prevAnswers => prevAnswers.map(item => {
      if (String(item?.id) !== String(supplementId)) {
        return item;
      }
      const nextItem = typeof updater === 'function' ? updater(item) : updater;
      return normalizeSupplementAnswerItem(nextItem);
    }));
  };
  const extractCommentRows = response => response?.data?.rows || response?.data?.list || response?.data?.records || [];
  const extractCommentTotal = (response, fallback = 0) => response?.data?.total ?? response?.data?.count ?? response?.data?.recordsTotal ?? fallback;
  const formatCommentTime = value => formatSupplementAnswerTime(value);
  const normalizeCommentItem = (item, defaults = {}) => {
    if (!item || typeof item !== 'object') {
      return item;
    }
    const hasLikeCountField = hasCountValue(item.likeCount, item.likes);
    const hasDislikeCountField = hasCountValue(item.dislikeCount, item.dislikes);
    const hasCollectCountField = hasCountValue(item.collectCount, item.bookmarkCount, item.bookmarks);
    const normalizedId = item.commentId ?? item.comment_id ?? item.id ?? null;
    const normalizedAuthor = pickDisplayText(item.userName, item.userNickname, item.authorNickName, item.author, item.nickName, item.nickname) || t('home.anonymous');
    const normalizedAvatar = pickDisplayText(item.userAvatar, item.authorAvatar, item.avatar, item.headImg, item.headImage) || null;
    const normalizedContent = item.content ?? item.commentContent ?? item.contentText ?? item.commentText ?? item.text ?? '';
    const normalizedReplyToUserName = item.replyToUserName ?? item.replyUserName ?? item.toUserName ?? item.parentUserName ?? item.replyNickName ?? '';
    const normalizedReplyToCommentId = item.replyToCommentId ?? item.replyCommentId ?? item.toCommentId ?? item.parentCommentId ?? item.parentId ?? 0;
    const normalizedLikeCount = normalizeCount(item.likeCount, item.likes);
    const normalizedDislikeCount = normalizeCount(item.dislikeCount, item.dislikes);
    const normalizedReplyCount = normalizeCount(item.replyCount, item.replies, item.childCount, item.childrenCount);
    const normalizedShareCount = normalizeCount(item.shareCount, item.shares);
    const normalizedCollectCount = normalizeCount(item.collectCount, item.bookmarkCount, item.bookmarks);
    const normalizedCreateTime = item.createTime ?? item.createdAt ?? item.gmtCreate ?? item.publishTime ?? null;
    const normalizedTargetType = Number(item.targetType ?? item.target_type ?? defaults.targetType ?? 4) || Number(defaults.targetType ?? 4) || 4;
    const normalizedTargetId = Number(item.targetId ?? item.target_id ?? defaults.targetId ?? 0) || 0;
    const normalizedParentId = Number(item.parentId ?? item.parent_id ?? defaults.parentId ?? 0) || 0;
    return {
      ...item,
      id: normalizedId,
      commentId: normalizedId,
      targetType: normalizedTargetType,
      targetId: normalizedTargetId,
      parentId: normalizedParentId,
      author: normalizedAuthor,
      userName: normalizedAuthor,
      userNickname: item.userNickname ?? item.authorNickName ?? normalizedAuthor,
      avatar: normalizedAvatar,
      userAvatar: normalizedAvatar,
      content: normalizedContent,
      commentContent: item.commentContent ?? normalizedContent,
      replyToUserName: normalizedReplyToUserName,
      replyToCommentId: normalizedReplyToCommentId,
      likeCount: normalizedLikeCount,
      likes: normalizedLikeCount,
      dislikeCount: normalizedDislikeCount,
      dislikes: normalizedDislikeCount,
      replyCount: normalizedReplyCount,
      replies: normalizedReplyCount,
      shareCount: normalizedShareCount,
      shares: normalizedShareCount,
      collectCount: normalizedCollectCount,
      bookmarkCount: normalizedCollectCount,
      bookmarks: normalizedCollectCount,
      liked: normalizeFlag(item.liked, item.isLiked),
      disliked: normalizeFlag(item.disliked, item.isDisliked),
      collected: normalizeFlag(item.collected, item.isCollected, item.bookmarked, item.isBookmarked),
      createTime: normalizedCreateTime,
      time: item.time ?? formatCommentTime(normalizedCreateTime),
      __likeCountResolved: item.__likeCountResolved ?? hasLikeCountField,
      __dislikeCountResolved: item.__dislikeCountResolved ?? hasDislikeCountField,
      __collectCountResolved: item.__collectCountResolved ?? hasCollectCountField
    };
  };
  const normalizeComments = (rows = [], defaults = {}) => rows.map(row => normalizeCommentItem(row, defaults));
  const syncAnswerCommentInteractionStates = (commentsToSync = []) => {
    if (!commentsToSync.length) {
      return;
    }
    const likedState = {};
    const dislikedState = {};
    const collectedState = {};
    commentsToSync.forEach(comment => {
      if (!comment?.id) {
        return;
      }
      likedState[comment.id] = !!comment.liked;
      dislikedState[comment.id] = !!comment.disliked;
      collectedState[comment.id] = !!comment.collected;
    });
    setAnswerCommentLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setAnswerCommentDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
    setAnswerCommentCollected(prev => ({
      ...prev,
      ...collectedState
    }));
  };
  const findAnswerCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return answerCommentsList.find(comment => String(comment.id) === String(commentId)) || Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId)) || null;
  };
  const getAnswerCommentLikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.likeCount ?? comment?.likes ?? 0, !!comment?.liked, localState, comment?.__likeCountResolved);
  const getAnswerCommentDislikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.dislikeCount ?? comment?.dislikes ?? 0, !!comment?.disliked, localState, comment?.__dislikeCountResolved);
  const getAnswerCommentCollectDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.collectCount ?? comment?.bookmarkCount ?? comment?.bookmarks ?? 0, !!comment?.collected, localState, comment?.__collectCountResolved);
  const buildAnswerCommentFromMutationResponse = (currentComment = {}, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
    return normalizeCommentItem({
      ...currentComment,
      ...payload,
      liked: payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentComment.liked,
      disliked: payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentComment.disliked,
      collected: payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentComment.collected,
      likeCount: payload.likeCount ?? payload.likes ?? fallbackValues.likeCount ?? currentComment.likeCount ?? currentComment.likes,
      dislikeCount: payload.dislikeCount ?? payload.dislikes ?? fallbackValues.dislikeCount ?? currentComment.dislikeCount ?? currentComment.dislikes,
      collectCount: payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? fallbackValues.collectCount ?? currentComment.collectCount ?? currentComment.bookmarkCount ?? currentComment.bookmarks,
      commentCount: payload.commentCount ?? payload.comments ?? fallbackValues.commentCount ?? currentComment.commentCount ?? currentComment.comments
    }, {
      targetType: 2,
      targetId: currentComment.targetId,
      parentId: currentComment.parentId
    });
  };
  const updateAnswerCommentStates = (commentId, updater) => {
    if (!commentId) {
      return;
    }
    setAnswerCommentListState(prevState => {
      if (!prevState.list?.length) {
        return prevState;
      }
      let changed = false;
      const nextList = prevState.list.map(comment => {
        if (String(comment.id) !== String(commentId)) {
          return comment;
        }
        changed = true;
        return normalizeCommentItem(updater(comment), {
          targetType: 2,
          targetId: comment.targetId,
          parentId: comment.parentId
        });
      });
      return changed ? {
        ...prevState,
        list: nextList
      } : prevState;
    });
    setAnswerCommentRepliesMap(prevMap => {
      let changed = false;
      const nextMap = {
        ...prevMap
      };
      Object.keys(nextMap).forEach(parentId => {
        const currentEntry = nextMap[parentId];
        if (!currentEntry?.list?.length) {
          return;
        }
        let entryChanged = false;
        const nextList = currentEntry.list.map(comment => {
          if (String(comment.id) !== String(commentId)) {
            return comment;
          }
          entryChanged = true;
          changed = true;
          return normalizeCommentItem(updater(comment), {
            targetType: 2,
            targetId: comment.targetId,
            parentId: comment.parentId
          });
        });
        if (entryChanged) {
          nextMap[parentId] = {
            ...currentEntry,
            list: nextList
          };
        }
      });
      return changed ? nextMap : prevMap;
    });
  };
  const openAnswerCommentComposer = target => {
    setAnswerCommentTarget({
      targetId: target?.targetId ?? answer.id ?? null,
      parentId: Number(target?.parentId ?? 0) || 0,
      replyToCommentId: Number(target?.replyToCommentId ?? 0) || 0,
      replyToUserId: normalizeEntityId(target?.replyToUserId),
      replyToUserName: target?.replyToUserName ?? '',
      originalComment: target?.originalComment ? normalizeCommentItem(target.originalComment, {
        targetType: 2,
        targetId: target?.targetId ?? answer.id ?? null,
        parentId: target?.parentId ?? 0
      }) : null
    });
    setShowWriteCommentModal(true);
  };
  const buildAnswerCommentReplyTarget = comment => {
    if (!comment || typeof comment !== 'object') {
      return {
        ...INITIAL_COMMENT_COMPOSER_TARGET,
        targetId: answer.id ?? null
      };
    }
    const resolvedCommentId = Number(comment.id ?? comment.commentId ?? 0) || 0;
    const replyToUserName = comment.userName ?? comment.userNickname ?? comment.author ?? '';
    return {
      targetId: answer.id ?? null,
      parentId: resolvedCommentId,
      replyToCommentId: resolvedCommentId,
      replyToUserId: normalizeEntityId(comment.userId ?? comment.user_id),
      replyToUserName,
      originalComment: normalizeCommentItem(comment, {
        targetType: 2,
        targetId: answer.id ?? null,
        parentId: resolvedCommentId
      })
    };
  };
  const getAnswerCommentThreadRootId = commentId => {
    if (!commentId) {
      return null;
    }
    let currentComment = findAnswerCommentById(commentId);
    let safetyCount = 0;
    while (currentComment && Number(currentComment.parentId ?? 0) > 0 && safetyCount < 50) {
      const parentComment = findAnswerCommentById(currentComment.parentId);
      if (!parentComment || String(parentComment.id) === String(currentComment.id)) {
        break;
      }
      currentComment = parentComment;
      safetyCount += 1;
    }
    return currentComment?.id ?? commentId;
  };
  const syncSupplementCommentInteractionStates = (commentsToSync = []) => {
    if (!commentsToSync.length) {
      return;
    }
    const likedState = {};
    const dislikedState = {};
    const collectedState = {};
    commentsToSync.forEach(comment => {
      if (!comment?.id) {
        return;
      }
      likedState[comment.id] = !!comment.liked;
      dislikedState[comment.id] = !!comment.disliked;
      collectedState[comment.id] = !!comment.collected;
    });
    setSupplementCommentLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setSupplementCommentDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
    setSupplementCommentCollected(prev => ({
      ...prev,
      ...collectedState
    }));
  };
  const getSupplementCommentLikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.likeCount ?? comment?.likes ?? 0, !!comment?.liked, localState, comment?.__likeCountResolved);
  const getSupplementCommentDislikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.dislikeCount ?? comment?.dislikes ?? 0, !!comment?.disliked, localState, comment?.__dislikeCountResolved);
  const getSupplementCommentCollectDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(comment?.collectCount ?? comment?.bookmarkCount ?? comment?.bookmarks ?? 0, !!comment?.collected, localState, comment?.__collectCountResolved);
  const buildCommentReplyTree = (rows = [], rootCommentId = null) => {
    if (!Array.isArray(rows) || !rows.length) {
      return [];
    }
    const normalizedRootId = rootCommentId !== undefined && rootCommentId !== null ? String(rootCommentId) : null;
    const nodeMap = new Map();
    rows.forEach(row => {
      if (!row?.id) {
        return;
      }
      nodeMap.set(String(row.id), {
        ...row,
        children: []
      });
    });
    const roots = [];
    rows.forEach(row => {
      if (!row?.id) {
        return;
      }
      const currentId = String(row.id);
      const node = nodeMap.get(currentId);
      const directParentId = row.parentId !== undefined && row.parentId !== null ? String(row.parentId) : '';
      const replyTargetId = row.replyToCommentId !== undefined && row.replyToCommentId !== null ? String(row.replyToCommentId) : '';
      const structuralParentId = normalizedRootId && directParentId === normalizedRootId && replyTargetId && replyTargetId !== currentId ? replyTargetId : directParentId;
      if (!structuralParentId || structuralParentId === '0' || structuralParentId === currentId || (normalizedRootId && structuralParentId === normalizedRootId)) {
        roots.push(node);
        return;
      }
      const parentNode = nodeMap.get(structuralParentId);
      if (!parentNode) {
        roots.push(node);
        return;
      }
      parentNode.children.push(node);
    });
    return roots;
  };
  const flattenCommentReplyTree = (nodes = [], level = 0, accumulator = []) => {
    if (!Array.isArray(nodes) || !nodes.length) {
      return accumulator;
    }
    nodes.forEach(node => {
      if (!node) {
        return;
      }
      accumulator.push({
        ...node,
        __level: level
      });
      if (Array.isArray(node.children) && node.children.length > 0) {
        flattenCommentReplyTree(node.children, level + 1, accumulator);
      }
    });
    return accumulator;
  };
  const findSupplementCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return supplementCommentsList.find(comment => String(comment.id) === String(commentId)) || Object.values(supplementCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId)) || null;
  };
  const buildSupplementCommentFromMutationResponse = (currentComment = {}, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
    return normalizeCommentItem({
      ...currentComment,
      ...payload,
      liked: payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentComment.liked,
      disliked: payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentComment.disliked,
      collected: payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentComment.collected,
      likeCount: payload.likeCount ?? payload.likes ?? fallbackValues.likeCount ?? currentComment.likeCount ?? currentComment.likes,
      dislikeCount: payload.dislikeCount ?? payload.dislikes ?? fallbackValues.dislikeCount ?? currentComment.dislikeCount ?? currentComment.dislikes,
      collectCount: payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? fallbackValues.collectCount ?? currentComment.collectCount ?? currentComment.bookmarkCount ?? currentComment.bookmarks,
      commentCount: payload.commentCount ?? payload.comments ?? fallbackValues.commentCount ?? currentComment.commentCount ?? currentComment.comments
    }, {
      targetId: currentComment.targetId,
      parentId: currentComment.parentId
    });
  };
  const updateSupplementCommentStates = (commentId, updater) => {
    if (!commentId) {
      return;
    }
    setSupplementCommentListState(prevState => {
      if (!prevState.list?.length) {
        return prevState;
      }
      let changed = false;
      const nextList = prevState.list.map(comment => {
        if (String(comment.id) !== String(commentId)) {
          return comment;
        }
        changed = true;
        return normalizeCommentItem(updater(comment), {
          targetId: comment.targetId,
          parentId: comment.parentId
        });
      });
      return changed ? {
        ...prevState,
        list: nextList
      } : prevState;
    });
    setSupplementCommentRepliesMap(prevMap => {
      let changed = false;
      const nextMap = {
        ...prevMap
      };
      Object.keys(nextMap).forEach(parentId => {
        const currentEntry = nextMap[parentId];
        if (!currentEntry?.list?.length) {
          return;
        }
        let entryChanged = false;
        const nextList = currentEntry.list.map(comment => {
          if (String(comment.id) !== String(commentId)) {
            return comment;
          }
          entryChanged = true;
          changed = true;
          return normalizeCommentItem(updater(comment), {
            targetId: comment.targetId,
            parentId: comment.parentId
          });
        });
        if (entryChanged) {
          nextMap[parentId] = {
            ...currentEntry,
            list: nextList
          };
        }
      });
      return changed ? nextMap : prevMap;
    });
  };
  const buildSupplementCommentReplyTarget = (comment, targetId) => {
    if (!comment || typeof comment !== 'object') {
      return {
        targetId,
        parentId: 0,
        replyToCommentId: 0,
        replyToUserId: null,
        replyToUserName: '',
        originalComment: null
      };
    }
    const resolvedCommentId = Number(comment.id ?? comment.commentId ?? 0) || 0;
    const replyToUserName = comment.userName ?? comment.userNickname ?? comment.author ?? '';
    return {
      targetId,
      parentId: resolvedCommentId,
      replyToCommentId: resolvedCommentId,
      replyToUserId: normalizeEntityId(comment.userId ?? comment.user_id),
      replyToUserName,
      originalComment: normalizeCommentItem(comment, {
        targetId,
        parentId: resolvedCommentId
      })
    };
  };
  const getSupplementCommentThreadRootId = commentId => {
    if (!commentId) {
      return null;
    }
    let currentComment = findSupplementCommentById(commentId);
    let safetyCount = 0;
    while (currentComment && Number(currentComment.parentId ?? 0) > 0 && safetyCount < 50) {
      const parentComment = findSupplementCommentById(currentComment.parentId);
      if (!parentComment || String(parentComment.id) === String(currentComment.id)) {
        break;
      }
      currentComment = parentComment;
      safetyCount += 1;
    }
    return currentComment?.id ?? commentId;
  };
  const isSupplementTab = activeTab === 0;
  const bottomComposerPlaceholder = isSupplementTab ? t('screens.answerDetail.actions.supplementAnswer') : t('screens.answerDetail.placeholders.writeComment');
  const handleOpenBottomComposer = () => {
    if (isSupplementTab) {
      setShowSupplementAnswerModal(true);
      return;
    }
    openAnswerCommentComposer({
      ...INITIAL_COMMENT_COMPOSER_TARGET,
      targetId: answer.id ?? null
    });
  };
  const handlePublishComment = async (commentText, isTeam, selectedImages = []) => {
    const normalizedText = typeof commentText === 'string' ? commentText.trim() : '';
    if (!normalizedText && selectedImages.length === 0) {
      return;
    }
    const targetId = Number(answerCommentTarget?.targetId ?? answer.id ?? 0) || 0;
    const parentId = Number(answerCommentTarget?.parentId ?? 0) || 0;
    if (!targetId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    try {
      const payload = {
        targetType: 2,
        targetId,
        parentId,
        content: normalizedText
      };
      if (answerCommentTarget?.replyToCommentId) {
        payload.replyToCommentId = Number(answerCommentTarget.replyToCommentId) || 0;
      }
      if (answerCommentTarget?.replyToUserId) {
        payload.replyToUserId = answerCommentTarget.replyToUserId;
      }
      if (answerCommentTarget?.replyToUserName) {
        payload.replyToUserName = answerCommentTarget.replyToUserName;
      }
      const response = await commentApi.createComment(payload);
      if (response && response.code === 200) {
        toast.success(t('screens.answerDetail.alerts.commentPublished'));
        setShowWriteCommentModal(false);
        setAnswerCommentTarget({
          ...INITIAL_COMMENT_COMPOSER_TARGET,
          targetId
        });
        setAnswerData(prevAnswerData => {
          const baseAnswer = prevAnswerData || answer;
          const nextCommentCount = normalizeCount(baseAnswer?.commentCount, baseAnswer?.comments) + 1;
          return normalizeAnswerDetail({
            ...baseAnswer,
            commentCount: nextCommentCount,
            comments: nextCommentCount
          });
        });
        await loadAnswerComments({
          isRefresh: true
        });
        if (parentId > 0) {
          const threadRootId = getAnswerCommentThreadRootId(parentId);
          if (threadRootId) {
            setCurrentAnswerCommentId(threadRootId);
            await loadAnswerCommentReplies(threadRootId);
            setShowAnswerCommentReplyModal(true);
          }
        }
      } else {
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('发布回答评论失败:', error);
      toast.error(error?.message || t('screens.answerDetail.alerts.networkError'));
    }
  };
  const handleSubmitArbitration = () => {
    if (!arbitrationReason.trim()) {
      toast.error(t('screens.answerDetail.alerts.arbitrationReasonRequired'));
      return;
    }
    if (selectedExperts.length < 3) {
      toast.error(t('screens.answerDetail.alerts.minExpertsRequired'));
      return;
    }
    if (selectedExperts.length > 5) {
      toast.error(t('screens.answerDetail.alerts.maxExpertsExceeded'));
      return;
    }
    toast.success(t('screens.answerDetail.alerts.arbitrationSubmitted'));
    setShowArbitrationModal(false);
    setArbitrationReason('');
    setSelectedExperts([]);
  };

  // 鍒囨崲涓撳閫夋嫨
  const toggleExpertSelection = expertId => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter(id => id !== expertId));
    } else {
      if (selectedExperts.length >= 5) {
        toast.error(t('screens.answerDetail.alerts.maxExpertsExceeded'));
        return;
      }
      setSelectedExperts([...selectedExperts, expertId]);
    }
  };

  // 杩囨护涓撳鍒楄〃
  const filteredExperts = expertsList.filter(expert => expert.name.toLowerCase().includes(expertSearchText.toLowerCase()) || expert.title.toLowerCase().includes(expertSearchText.toLowerCase()) || expert.expertise.toLowerCase().includes(expertSearchText.toLowerCase()));
  const handleReply = comment => {
    if (!comment?.id) {
      return;
    }
    setCurrentAnswerCommentId(comment.id);
    setShowAnswerCommentReplyModal(true);
  };
  const handleAnswerCommentReport = (commentId, options = {}) => {
    const {
      closeReplyModal = false
    } = options;
    if (!commentId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (closeReplyModal) {
      setShowAnswerCommentReplyModal(false);
    }
    navigation.navigate('Report', {
      type: 'comment',
      targetType: 5,
      targetId: Number(commentId) || 0
    });
  };
  const handleSupplementAnswerReport = supplementId => {
    if (!supplementId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    navigation.navigate('Report', {
      type: 'supplement',
      targetType: 4,
      targetId: Number(supplementId) || 0
    });
  };
  const handleComment = () => {
    handleOpenBottomComposer();
  };

  // 澶勭悊鍥炵瓟鏀惰棌/鍙栨秷鏀惰棌 - 甯﹂槻鎶栧拰璇锋眰鍘婚噸
  const handleAnswerBookmark = async () => {
    console.log('馃攳 鏀惰棌鎿嶄綔:');
    console.log('  answerId:', answer.id);
    if (!answer.id) {
      console.error('回答 ID 不存在');
      toast.error(t('screens.answerDetail.alerts.answerIdMissing'));
      return;
    }

    // 闃叉閲嶅璇锋眰
    if (isCollectLoading) {
      console.log('馃毇 鏀惰棌璇锋眰杩涜涓紝蹇界暐閲嶅鐐瑰嚮');
      return;
    }

    // 娓呴櫎涔嬪墠鐨勯槻鎶栧畾鏃跺櫒
    if (collectTimeoutRef.current) {
      clearTimeout(collectTimeoutRef.current);
    }

    // 绔嬪嵆鏇存柊UI鐘舵€侊紝鎻愪緵鍗虫椂鍙嶉
    const currentState = answerBookmarked;
    const newState = !currentState;
    setAnswerBookmarked(newState);

    // 璁剧疆闃叉姈瀹氭椂鍣?
    collectTimeoutRef.current = setTimeout(async () => {
      try {
        // 璁剧疆鍔犺浇鐘舵€侊紝闃叉閲嶅璇锋眰
        setIsCollectLoading(true);
        console.log(`馃摛 ${newState ? '鏀惰棌' : '鍙栨秷鏀惰棌'}鍥炵瓟: id=${answer.id}`);

        // 鏍规嵁褰撳墠鐘舵€佽皟鐢ㄤ笉鍚岀殑鎺ュ彛
        const response = newState ? await answerApi.collectAnswer(answer.id) : await answerApi.uncollectAnswer(answer.id);
        console.log('馃摜 鏀惰棌鍝嶅簲:', response);
        if (response && response.code === 200) {
          // 鏈嶅姟鍣ㄨ繑鍥炴垚鍔燂紝淇濇寔UI鐘舵€?
          toast.success(newState ? t('screens.answerDetail.alerts.collected') : t('screens.answerDetail.alerts.uncollected'));

          // 鍚屾鏁版嵁鍒伴棶棰樿鎯呴〉
          syncDataToQuestionDetail({
            liked: answerLiked,
            disliked: answerDisliked,
            collected: newState
          });
        } else {
          // 鏈嶅姟鍣ㄨ繑鍥炲け璐ワ紝鍥炴粴UI鐘舵€?
          console.error('鉂?鏀惰棌鎿嶄綔澶辫触:', response);
          setAnswerBookmarked(currentState); // 鍥炴粴鍒板師鐘舵€?
          toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
        }
      } catch (error) {
        console.error('鉂?鏀惰棌璇锋眰寮傚父:', error);

        // 缃戠粶閿欒锛屽洖婊歎I鐘舵€?
        setAnswerBookmarked(currentState); // 鍥炴粴鍒板師鐘舵€?
        toast.error(t('screens.answerDetail.alerts.networkError'));
      } finally {
        // 娓呴櫎鍔犺浇鐘舵€?
        setIsCollectLoading(false);
        collectTimeoutRef.current = null;
      }
    }, 300); // 300ms闃叉姈寤惰繜
  };

  // 鍚屾鏁版嵁鍒伴棶棰樿鎯呴〉锛堜笉璺宠浆锛屽彧鏇存柊鍙傛暟锛?
  const syncDataToQuestionDetail = (overrides = {}) => {
    if (!answer || !navigation) return;
    console.log('馃攧 鍚屾鍥炵瓟鏁版嵁鍒伴棶棰樿鎯呴〉:', answer.id);
    const routes = navigation.getState()?.routes;
    const questionDetailRoute = routes?.find(r => r.name === 'QuestionDetail');
    const nextLiked = overrides.liked ?? answerLiked;
    const nextCollected = overrides.collected ?? answerBookmarked;
    const nextDisliked = overrides.disliked ?? answerDisliked;
    const updatedAnswer = normalizeAnswerDetail({
      ...answer,
      isLiked: nextLiked,
      liked: nextLiked,
      isBookmarked: nextCollected,
      bookmarked: nextCollected,
      isCollected: nextCollected,
      collected: nextCollected,
      isDisliked: nextDisliked,
      disliked: nextDisliked,
      likeCount: getInteractionDisplayCount(answer.likeCount || answer.like_count || answer.likes || 0, !!answer.liked, nextLiked),
      bookmarkCount: getInteractionDisplayCount(answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || answer.collectCount || 0, !!answer.collected, nextCollected),
      collectCount: getInteractionDisplayCount(answer.collectCount || answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || 0, !!answer.collected, nextCollected),
      dislikeCount: getInteractionDisplayCount(answer.dislikeCount || answer.dislike_count || answer.dislikes || 0, !!answer.disliked, nextDisliked)
    });
    setAnswerData(updatedAnswer);
    if (questionDetailRoute) {
      console.log('馃摛 鏇存柊鍙傛暟:', updatedAnswer);
      navigation.dispatch({
        ...CommonActions.setParams({
          updatedAnswer
        }),
        source: questionDetailRoute.key,
        target: navigation.getState()?.key
      });
    } else {
      console.log('鈿狅笍  鏈壘鍒伴棶棰樿鎯呴〉璺敱');
    }
  };

  // 澶勭悊鐐硅禐/鍙栨秷鐐硅禐
  const handleAnswerLike = async () => {
    if (!answer.id) {
      toast.error(t('screens.answerDetail.alerts.answerIdMissing'));
      return;
    }
    const currentState = answerLiked;
    const newState = !currentState;

    // 绔嬪嵆鏇存柊UI
    setAnswerLiked(newState);

    // 濡傛灉涔嬪墠鏄偣韪╃姸鎬侊紝鍙栨秷鐐硅俯
    if (answerDisliked) {
      setAnswerDisliked(false);
    }
    try {
      const response = newState ? await answerApi.likeAnswer(answer.id) : await answerApi.unlikeAnswer(answer.id);
      if (response && response.code === 200) {
        toast.success(newState ? t('screens.answerDetail.alerts.liked') : t('screens.answerDetail.alerts.unliked'));
        syncDataToQuestionDetail({
          liked: newState,
          disliked: answerDisliked ? false : answerDisliked,
          collected: answerBookmarked
        });
      } else {
        setAnswerLiked(currentState);
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('鉂?鐐硅禐鎿嶄綔澶辫触:', error);
      setAnswerLiked(currentState);
      toast.error(t('screens.answerDetail.alerts.networkError'));
    }
  };

  // 澶勭悊鐐硅俯/鍙栨秷鐐硅俯
  const handleAnswerDislike = async () => {
    if (!answer.id) {
      toast.error(t('screens.answerDetail.alerts.answerIdMissing'));
      return;
    }
    const currentState = answerDisliked;
    const newState = !currentState;

    // 绔嬪嵆鏇存柊UI
    setAnswerDisliked(newState);

    // 濡傛灉涔嬪墠鏄偣璧炵姸鎬侊紝鍙栨秷鐐硅禐
    if (answerLiked) {
      setAnswerLiked(false);
    }
    try {
      const response = newState ? await answerApi.dislikeAnswer(answer.id) : await answerApi.undislikeAnswer(answer.id);
      if (response && response.code === 200) {
        toast.success(newState ? t('screens.answerDetail.alerts.disliked') : t('screens.answerDetail.alerts.undisliked'));
        syncDataToQuestionDetail({
          liked: answerLiked ? false : answerLiked,
          disliked: newState,
          collected: answerBookmarked
        });
      } else {
        setAnswerDisliked(currentState);
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('鉂?鐐硅俯鎿嶄綔澶辫触:', error);
      setAnswerDisliked(currentState);
      toast.error(t('screens.answerDetail.alerts.networkError'));
    }
  };
  const answerLikeCount = getResolvedInteractionDisplayCount(answer.likeCount || answer.like_count || answer.likes || 0, !!answer.liked, answerLiked, answer.__likeCountResolved);
  const answerBookmarkCount = getResolvedInteractionDisplayCount(answer.collectCount || answer.bookmarkCount || answer.bookmark_count || answer.bookmarks || 0, !!answer.collected, answerBookmarked, answer.__collectCountResolved);
  const answerDislikeCount = getResolvedInteractionDisplayCount(answer.dislikeCount || answer.dislike_count || answer.dislikes || 0, !!answer.disliked, answerDisliked, answer.__dislikeCountResolved);
  const handleAnswerCommentsLoadMore = () => {
    if (!answer.id || !answerCommentListState.loaded || !answerCommentListState.hasMore || answerCommentListState.loadingMore || answerCommentListState.loading) {
      return;
    }
    loadAnswerComments({
      isLoadMore: true
    });
  };
  const handleAnswerCommentLike = async commentId => {
    const comment = findAnswerCommentById(commentId);
    if (!commentId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (!comment || answerCommentLikeLoading[commentId]) {
      return;
    }
    const currentState = answerCommentLiked[commentId] !== undefined ? answerCommentLiked[commentId] : !!comment.liked;
    const nextState = !currentState;
    setAnswerCommentLiked(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setAnswerCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState ? await commentApi.likeComment(commentId) : await commentApi.unlikeComment(commentId);
      if (response && response.code === 200) {
        toast.success(nextState ? t('screens.answerDetail.alerts.liked') : t('screens.answerDetail.alerts.unliked'));
        updateAnswerCommentStates(commentId, currentComment => buildAnswerCommentFromMutationResponse(currentComment, response.data, {
          liked: nextState,
          likeCount: Math.max(getAnswerCommentLikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setAnswerCommentLiked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('回答评论点赞失败:', error);
      setAnswerCommentLiked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setAnswerCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleAnswerCommentCollect = async commentId => {
    const comment = findAnswerCommentById(commentId);
    if (!commentId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (!comment || answerCommentCollectLoading[commentId]) {
      return;
    }
    const currentState = answerCommentCollected[commentId] !== undefined ? answerCommentCollected[commentId] : !!comment.collected;
    const nextState = !currentState;
    const collectPayload = {
      targetType: Number(comment?.targetType ?? 2) || 2,
      targetId: Number(comment?.targetId ?? answer.id) || undefined,
      parentId: Number(comment?.parentId ?? 0) || 0
    };
    setAnswerCommentCollected(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setAnswerCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState ? await commentApi.collectComment(commentId, collectPayload) : await commentApi.uncollectComment(commentId, collectPayload);
      if (response && response.code === 200) {
        toast.success(nextState ? t('screens.answerDetail.alerts.collected') : t('screens.answerDetail.alerts.uncollected'));
        updateAnswerCommentStates(commentId, currentComment => buildAnswerCommentFromMutationResponse(currentComment, response.data, {
          collected: nextState,
          collectCount: Math.max(getAnswerCommentCollectDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setAnswerCommentCollected(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('回答评论收藏失败:', error);
      setAnswerCommentCollected(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setAnswerCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleAnswerCommentDislike = async commentId => {
    const comment = findAnswerCommentById(commentId);
    if (!commentId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (!comment || answerCommentDislikeLoading[commentId]) {
      return;
    }
    const currentState = answerCommentDisliked[commentId] !== undefined ? answerCommentDisliked[commentId] : !!comment.disliked;
    const nextState = !currentState;
    setAnswerCommentDisliked(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setAnswerCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState ? await commentApi.dislikeComment(commentId) : await commentApi.undislikeComment(commentId);
      if (response && response.code === 200) {
        toast.success(nextState ? t('screens.answerDetail.alerts.disliked') : t('screens.answerDetail.alerts.undisliked'));
        updateAnswerCommentStates(commentId, currentComment => buildAnswerCommentFromMutationResponse(currentComment, response.data, {
          disliked: nextState,
          dislikeCount: Math.max(getAnswerCommentDislikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setAnswerCommentDisliked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('回答评论点踩失败:', error);
      setAnswerCommentDisliked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setAnswerCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleSupplementCollect = async supplementId => {
    const supplement = supplementAnswers.find(item => String(item?.id) === String(supplementId));
    if (!supplementId || !supplement) {
      toast.error(t('screens.answerDetail.alerts.collectFailed'));
      return;
    }
    if (supplementCollectLoading[supplementId]) {
      return;
    }
    const supplementQuestionId = supplement.questionId ?? answer.questionId ?? route?.params?.questionId ?? null;
    if (!supplementQuestionId) {
      toast.error(t('screens.answerDetail.alerts.supplementCollectUnavailable'));
      return;
    }
    try {
      setSupplementCollectLoading(prev => ({
        ...prev,
        [supplementId]: true
      }));
      const nextCollected = !supplement.collected;
      const currentCollectCount = Number(supplement.collectCount ?? supplement.bookmarkCount ?? supplement.bookmarks ?? 0) || 0;
      const response = nextCollected ? await answerApi.collectSupplementAnswer(supplementId) : await answerApi.uncollectSupplementAnswer(supplementId);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementAnswerMutationResult(supplement, response.data, {
          collected: nextCollected,
          collectCount: Math.max(currentCollectCount + (nextCollected ? 1 : -1), 0)
        });
        updateSupplementAnswerItem(supplementId, updatedSupplement);
        toast.success(updatedSupplement.collected ? t('screens.answerDetail.alerts.collected') : t('screens.answerDetail.alerts.uncollected'));
      } else {
        const rawMessage = response?.msg || '';
        if (rawMessage.includes('question_id') && rawMessage.includes('cannot be null')) {
          toast.error(t('screens.answerDetail.alerts.supplementCollectUnavailable'));
        } else {
          toast.error(rawMessage || t('screens.answerDetail.alerts.operationFailed'));
        }
      }
    } catch (error) {
      console.error('补充回答收藏失败:', error);
      const rawMessage = error?.message || '';
      if (rawMessage.includes('question_id') && rawMessage.includes('cannot be null')) {
        toast.error(t('screens.answerDetail.alerts.supplementCollectUnavailable'));
      } else {
        toast.error(rawMessage || t('screens.answerDetail.alerts.operationFailed'));
      }
    } finally {
      setSupplementCollectLoading(prev => ({
        ...prev,
        [supplementId]: false
      }));
    }
  };
  const handleSupplementLike = async supplementId => {
    const supplement = supplementAnswers.find(item => String(item?.id) === String(supplementId));
    if (!supplementId || !supplement) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (supplementLikeLoading[supplementId]) {
      return;
    }
    try {
      setSupplementLikeLoading(prev => ({
        ...prev,
        [supplementId]: true
      }));
      const nextLiked = !supplement.liked;
      const currentLikeCount = getSupplementLikeDisplayCount(supplement);
      const response = nextLiked ? await answerApi.likeSupplementAnswer(supplementId) : await answerApi.unlikeSupplementAnswer(supplementId);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementAnswerMutationResult(supplement, response.data, {
          liked: nextLiked,
          likeCount: Math.max(currentLikeCount + (nextLiked ? 1 : -1), 0)
        });
        updateSupplementAnswerItem(supplementId, updatedSupplement);
        toast.success(updatedSupplement.liked ? t('screens.answerDetail.alerts.liked') : t('screens.answerDetail.alerts.unliked'));
      } else {
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.log('补充回答点赞请求异常:', error);
      toast.error(error?.message || t('screens.answerDetail.alerts.operationFailed'));
    } finally {
      setSupplementLikeLoading(prev => ({
        ...prev,
        [supplementId]: false
      }));
    }
  };
  const handleSupplementDislike = async supplementId => {
    const supplement = supplementAnswers.find(item => String(item?.id) === String(supplementId));
    if (!supplementId || !supplement) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    if (supplementDislikeLoading[supplementId]) {
      return;
    }
    try {
      setSupplementDislikeLoading(prev => ({
        ...prev,
        [supplementId]: true
      }));
      const nextDisliked = !supplement.disliked;
      const currentDislikeCount = getSupplementDislikeDisplayCount(supplement);
      const response = nextDisliked ? await answerApi.dislikeSupplementAnswer(supplementId) : await answerApi.undislikeSupplementAnswer(supplementId);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementAnswerMutationResult(supplement, response.data, {
          disliked: nextDisliked,
          dislikeCount: Math.max(currentDislikeCount + (nextDisliked ? 1 : -1), 0)
        });
        updateSupplementAnswerItem(supplementId, updatedSupplement);
        toast.success(updatedSupplement.disliked ? t('screens.answerDetail.alerts.disliked') : t('screens.answerDetail.alerts.undisliked'));
      } else {
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.log('补充回答点踩请求异常:', error);
      toast.error(error?.message || t('screens.answerDetail.alerts.operationFailed'));
    } finally {
      setSupplementDislikeLoading(prev => ({
        ...prev,
        [supplementId]: false
      }));
    }
  };

  // 鑾峰彇琛ュ厖鍥炵瓟鍒楄〃
  const fetchSupplementAnswers = async (reset = false, sortByOverride = sortFilter) => {
    if (!answer.id) {
      console.error('回答 ID 不存在');
      return;
    }

    // 濡傛灉姝ｅ湪鍔犺浇锛屼笉閲嶅璇锋眰
    if (supplementLoading) {
      console.log('馃毇 琛ュ厖鍥炵瓟鍔犺浇涓紝蹇界暐閲嶅璇锋眰');
      return;
    }

    // 濡傛灉鏄姞杞芥洿澶氾紝妫€鏌ユ槸鍚﹁繕鏈夋洿澶氭暟鎹?
    if (!reset && !supplementPagination.hasMore) {
      console.log('没有更多补充回答了');
      return;
    }
    try {
      setSupplementLoading(true);
      setSupplementError(null);
      const pageNum = reset ? 1 : supplementPagination.pageNum;
      console.log(`馃摛 鑾峰彇琛ュ厖鍥炵瓟鍒楄〃: answerId=${answer.id}, pageNum=${pageNum}, sortBy=${sortFilter}`);
      const response = await answerApi.getSupplementAnswers(answer.id, {
        sortBy: sortByOverride,
        pageNum,
        pageSize: supplementPagination.pageSize
      });
      console.log('馃摜 琛ュ厖鍥炵瓟鍝嶅簲:', response);
      if (response && response.code === 200) {
        const data = response.data || {};
        const rawList = data.rows || data.list || data.records || [];
        const list = normalizeSupplementAnswerList(rawList);
        const total = data.total ?? data.count ?? data.recordsTotal ?? list.length;
        const nextPageSize = supplementPagination.pageSize;
        const hasMore = total > 0 ? pageNum * nextPageSize < total : list.length >= nextPageSize;

        // 鏇存柊琛ュ厖鍥炵瓟鍒楄〃
        setSupplementAnswers(prev => reset ? list : [...prev, ...list]);

        // 鏇存柊鍒嗛〉淇℃伅
        setSupplementPagination({
          pageNum: list.length < nextPageSize ? pageNum : pageNum + 1,
          pageSize: nextPageSize,
          hasMore,
          total
        });
      } else {
        throw new Error(response?.msg || t('screens.answerDetail.alerts.fetchSupplementsFailed'));
      }
    } catch (error) {
      console.log('⚠️ 获取补充回答异常:', error);
      setSupplementError(error.message || t('screens.answerDetail.alerts.networkError'));
    } finally {
      setSupplementLoading(false);
    }
  };
  const loadAnswerComments = async (options = {}) => {
    const {
      isRefresh = false,
      isLoadMore = false,
      sortByOverride = answerCommentSortBy
    } = options;
    if (!answer.id) {
      return;
    }
    const pageNum = isLoadMore ? answerCommentListState.pageNum : 1;
    try {
      setAnswerCommentListState(prevState => ({
        ...prevState,
        loading: !isRefresh && !isLoadMore,
        refreshing: isRefresh,
        loadingMore: isLoadMore,
        targetId: Number(answer.id),
        error: null
      }));
      const response = await commentApi.getComments({
        targetType: 2,
        targetId: Number(answer.id),
        parentId: 0,
        sortBy: sortByOverride,
        pageNum,
        pageSize: answerCommentListState.pageSize
      });
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = normalizeComments(rawRows, {
          targetType: 2,
          targetId: Number(answer.id),
          parentId: 0
        });
        const total = extractCommentTotal(response, newComments.length);
        syncAnswerCommentInteractionStates(newComments);
        setAnswerCommentListState(prevState => {
          const nextList = isLoadMore ? [...prevState.list, ...newComments] : newComments;
          const hasMore = total > 0 ? nextList.length < total : newComments.length >= prevState.pageSize;
          return {
            ...prevState,
            list: nextList,
            total,
            pageNum: newComments.length < prevState.pageSize ? pageNum : pageNum + 1,
            hasMore,
            loaded: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            targetId: Number(answer.id),
            error: null
          };
        });
      } else {
        setAnswerCommentListState(prevState => ({
          ...prevState,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: response?.msg || t('screens.answerDetail.states.loadFailed')
        }));
      }
    } catch (error) {
      console.error('加载回答评论失败:', error);
      setAnswerCommentListState(prevState => ({
        ...prevState,
        loading: false,
        refreshing: false,
        loadingMore: false,
        error: error?.message || t('screens.answerDetail.states.loadFailed')
      }));
    }
  };
  const loadAnswerCommentReplies = async parentCommentId => {
    if (!answer.id || !parentCommentId) {
      return;
    }
    setAnswerCommentRepliesMap(prevMap => ({
      ...prevMap,
      [parentCommentId]: {
        ...(prevMap[parentCommentId] || {}),
        loading: true
      }
    }));
    try {
      const fetchAllDescendantReplies = async rootParentId => {
        const pageSize = 50;
        const visitedParentIds = new Set();
        const collectedReplies = [];
        const collectedReplyIds = new Set();

        const fetchDirectChildren = async currentParentId => {
          let pageNum = 1;
          let directChildren = [];
          while (true) {
            const response = await commentApi.getComments({
              targetType: 2,
              targetId: Number(answer.id),
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });
            if (!(response && response.code === 200 && response.data)) {
              break;
            }
            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetType: 2,
              targetId: Number(answer.id)
            });
            directChildren = [...directChildren, ...normalizedRows];
            const total = extractCommentTotal(response, directChildren.length);
            if (!rawRows.length || directChildren.length >= total || rawRows.length < pageSize) {
              break;
            }
            pageNum += 1;
          }
          return directChildren;
        };

        const traverseChildren = async currentParentId => {
          const normalizedParentKey = String(currentParentId);
          if (visitedParentIds.has(normalizedParentKey)) {
            return;
          }
          visitedParentIds.add(normalizedParentKey);
          const children = await fetchDirectChildren(currentParentId);
          for (const child of children) {
            const childKey = String(child.id);
            if (!collectedReplyIds.has(childKey)) {
              collectedReplyIds.add(childKey);
              collectedReplies.push(child);
            }
            await traverseChildren(child.id);
          }
        };

        await traverseChildren(rootParentId);
        return collectedReplies;
      };

      const replies = await fetchAllDescendantReplies(parentCommentId);
      syncAnswerCommentInteractionStates(replies);
      setAnswerCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          list: replies,
          total: replies.length,
          loaded: true,
          loading: false
        }
      }));
    } catch (error) {
      console.error('加载回答评论回复失败:', error);
      setAnswerCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          ...(prevMap[parentCommentId] || {}),
          loading: false,
          loaded: true
        }
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    }
  };
  const loadSupplementComments = async (supplementAnswerId, options = {}) => {
    const {
      isRefresh = false,
      isLoadMore = false
    } = options;
    if (!supplementAnswerId) {
      return;
    }
    const pageNum = isLoadMore ? supplementCommentListState.pageNum : 1;
    try {
      setSupplementCommentListState(prevState => ({
        ...prevState,
        loading: !isRefresh && !isLoadMore,
        refreshing: isRefresh,
        loadingMore: isLoadMore,
        targetId: Number(supplementAnswerId)
      }));
      const response = await commentApi.getComments({
        targetType: 4,
        targetId: Number(supplementAnswerId),
        parentId: 0,
        pageNum,
        pageSize: supplementCommentListState.pageSize
      });
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = normalizeComments(rawRows, {
          targetId: Number(supplementAnswerId),
          parentId: 0
        });
        const total = extractCommentTotal(response, newComments.length);
        syncSupplementCommentInteractionStates(newComments);
        setSupplementCommentListState(prevState => {
          const nextList = isLoadMore ? [...prevState.list, ...newComments] : newComments;
          return {
            ...prevState,
            list: nextList,
            total,
            pageNum: newComments.length < prevState.pageSize ? pageNum : pageNum + 1,
            hasMore: newComments.length >= prevState.pageSize && nextList.length < total,
            loaded: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            targetId: Number(supplementAnswerId)
          };
        });
      } else {
        setSupplementCommentListState(prevState => ({
          ...prevState,
          loading: false,
          refreshing: false,
          loadingMore: false
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.networkError'));
      }
    } catch (error) {
      console.error('加载补充回答评论失败:', error);
      setSupplementCommentListState(prevState => ({
        ...prevState,
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    }
  };
  const loadSupplementCommentReplies = async parentCommentId => {
    if (!currentSupplementCommentTargetId || !parentCommentId) {
      return;
    }
    setSupplementCommentRepliesMap(prevMap => ({
      ...prevMap,
      [parentCommentId]: {
        ...(prevMap[parentCommentId] || {}),
        loading: true
      }
    }));
    try {
      const fetchAllDescendantReplies = async rootParentId => {
        const pageSize = 50;
        const visitedParentIds = new Set();
        const collectedReplies = [];
        const collectedReplyIds = new Set();

        const fetchDirectChildren = async currentParentId => {
          let pageNum = 1;
          let directChildren = [];
          while (true) {
            const response = await commentApi.getComments({
              targetType: 4,
              targetId: Number(currentSupplementCommentTargetId),
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });
            if (!(response && response.code === 200 && response.data)) {
              break;
            }
            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetId: Number(currentSupplementCommentTargetId)
            });
            directChildren = [...directChildren, ...normalizedRows];
            const total = extractCommentTotal(response, directChildren.length);
            if (!rawRows.length || directChildren.length >= total || rawRows.length < pageSize) {
              break;
            }
            pageNum += 1;
          }
          return directChildren;
        };

        const traverseChildren = async currentParentId => {
          const normalizedParentKey = String(currentParentId);
          if (visitedParentIds.has(normalizedParentKey)) {
            return;
          }
          visitedParentIds.add(normalizedParentKey);
          const children = await fetchDirectChildren(currentParentId);
          for (const child of children) {
            const childKey = String(child.id);
            if (!collectedReplyIds.has(childKey)) {
              collectedReplyIds.add(childKey);
              collectedReplies.push(child);
            }
            await traverseChildren(child.id);
          }
        };

        await traverseChildren(rootParentId);
        return collectedReplies;
      };

      const rawReplies = await fetchAllDescendantReplies(parentCommentId);
      const replies = rawReplies;
      syncSupplementCommentInteractionStates(replies);
      setSupplementCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          list: replies,
          total: replies.length,
          loaded: true,
          loading: false
        }
      }));
    } catch (error) {
      console.error('加载补充回答评论回复失败:', error);
      setSupplementCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          ...(prevMap[parentCommentId] || {}),
          loading: false,
          loaded: true
        }
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    }
  };
  const openSupplementCommentComposer = target => {
    setSupplementCommentTarget({
      targetId: target?.targetId ?? currentSupplementCommentTargetId,
      parentId: Number(target?.parentId ?? 0) || 0,
      replyToCommentId: Number(target?.replyToCommentId ?? 0) || 0,
      replyToUserId: normalizeEntityId(target?.replyToUserId),
      replyToUserName: target?.replyToUserName ?? '',
      originalComment: target?.originalComment ? normalizeCommentItem(target.originalComment, {
        targetId: target?.targetId ?? currentSupplementCommentTargetId,
        parentId: target?.parentId ?? 0
      }) : null
    });
    setShowSupplementCommentComposerModal(true);
  };
  const handleSubmitSupplementComment = async (commentText, isTeam, selectedImages = []) => {
    const normalizedText = typeof commentText === 'string' ? commentText.trim() : '';
    if (!normalizedText && selectedImages.length === 0) {
      return;
    }
    const targetId = Number(supplementCommentTarget?.targetId ?? currentSupplementCommentTargetId ?? 0) || 0;
    const parentId = Number(supplementCommentTarget?.parentId ?? 0) || 0;
    if (!targetId) {
      toast.error(t('screens.answerDetail.alerts.operationFailed'));
      return;
    }
    try {
      const payload = {
        targetType: 4,
        targetId,
        parentId,
        content: normalizedText
      };
      if (supplementCommentTarget?.replyToCommentId) {
        payload.replyToCommentId = Number(supplementCommentTarget.replyToCommentId) || 0;
      }
      if (supplementCommentTarget?.replyToUserId) {
        payload.replyToUserId = supplementCommentTarget.replyToUserId;
      }
      if (supplementCommentTarget?.replyToUserName) {
        payload.replyToUserName = supplementCommentTarget.replyToUserName;
      }
      const response = await commentApi.createComment(payload);
      if (response && response.code === 200) {
        toast.success(t('screens.answerDetail.alerts.commentPublished'));
        setShowSupplementCommentComposerModal(false);
        updateSupplementAnswerItem(targetId, previousItem => {
          const nextCommentCount = (Number(previousItem?.commentCount ?? previousItem?.comments ?? 0) || 0) + 1;
          return {
            ...previousItem,
            commentCount: nextCommentCount,
            comments: nextCommentCount
          };
        });
        await loadSupplementComments(targetId, {
          isRefresh: true
        });
        if (parentId > 0) {
          const threadRootId = getSupplementCommentThreadRootId(parentId);
          if (threadRootId) {
            await loadSupplementCommentReplies(threadRootId);
            setShowSupplementCommentReplyModal(true);
          }
        } else {
          setShowSupplementCommentListModal(true);
        }
      } else {
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('发布补充回答评论失败:', error);
      toast.error(error?.message || t('screens.answerDetail.alerts.networkError'));
    }
  };
  const handleSupplementCommentsLoadMore = () => {
    if (!currentSupplementCommentTargetId || !supplementCommentListState.loaded || !supplementCommentListState.hasMore || supplementCommentListState.loadingMore || supplementCommentListState.loading) {
      return;
    }
    loadSupplementComments(currentSupplementCommentTargetId, {
      isLoadMore: true
    });
  };
  const handleSupplementCommentLike = async commentId => {
    const comment = findSupplementCommentById(commentId);
    if (!commentId || !comment || supplementCommentLikeLoading[commentId]) {
      return;
    }
    const currentState = supplementCommentLiked[commentId] !== undefined ? supplementCommentLiked[commentId] : !!comment.liked;
    const nextState = !currentState;
    setSupplementCommentLiked(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setSupplementCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState ? await commentApi.likeComment(commentId) : await commentApi.unlikeComment(commentId);
      if (response && response.code === 200) {
        updateSupplementCommentStates(commentId, currentComment => buildSupplementCommentFromMutationResponse(currentComment, response.data, {
          liked: nextState,
          likeCount: Math.max(getSupplementCommentLikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setSupplementCommentLiked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('补充回答评论点赞失败:', error);
      setSupplementCommentLiked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setSupplementCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleSupplementCommentCollect = async commentId => {
    const comment = findSupplementCommentById(commentId);
    if (!commentId || !comment || supplementCommentCollectLoading[commentId]) {
      return;
    }
    const currentState = supplementCommentCollected[commentId] !== undefined ? supplementCommentCollected[commentId] : !!comment.collected;
    const nextState = !currentState;
    setSupplementCommentCollected(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setSupplementCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const collectPayload = {
        targetType: 4,
        targetId: Number(comment.targetId ?? currentSupplementCommentTargetId) || undefined,
        parentId: Number(comment.parentId ?? 0) || 0
      };
      const response = nextState ? await commentApi.collectComment(commentId, collectPayload) : await commentApi.uncollectComment(commentId, collectPayload);
      if (response && response.code === 200) {
        updateSupplementCommentStates(commentId, currentComment => buildSupplementCommentFromMutationResponse(currentComment, response.data, {
          collected: nextState,
          collectCount: Math.max(getSupplementCommentCollectDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setSupplementCommentCollected(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('补充回答评论收藏失败:', error);
      setSupplementCommentCollected(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setSupplementCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleSupplementCommentDislike = async commentId => {
    const comment = findSupplementCommentById(commentId);
    if (!commentId || !comment || supplementCommentDislikeLoading[commentId]) {
      return;
    }
    const currentState = supplementCommentDisliked[commentId] !== undefined ? supplementCommentDisliked[commentId] : !!comment.disliked;
    const nextState = !currentState;
    setSupplementCommentDisliked(prev => ({
      ...prev,
      [commentId]: nextState
    }));
    try {
      setSupplementCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState ? await commentApi.dislikeComment(commentId) : await commentApi.undislikeComment(commentId);
      if (response && response.code === 200) {
        updateSupplementCommentStates(commentId, currentComment => buildSupplementCommentFromMutationResponse(currentComment, response.data, {
          disliked: nextState,
          dislikeCount: Math.max(getSupplementCommentDislikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
      } else {
        setSupplementCommentDisliked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        toast.error(response?.msg || t('screens.answerDetail.alerts.operationFailed'));
      }
    } catch (error) {
      console.error('补充回答评论点踩失败:', error);
      setSupplementCommentDisliked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      toast.error(t('screens.answerDetail.alerts.networkError'));
    } finally {
      setSupplementCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const renderSupplementCommentReplyCard = (reply, options = {}) => {
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findSupplementCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    return <View key={reply.id} style={styles.replyCard}>
        <TouchableOpacity style={styles.replyHeader} activeOpacity={0.7} onPress={() => openPublicProfile(reply)}>
          <Avatar uri={reply.userAvatar || reply.avatar} name={reply.userName || reply.userNickname || reply.author} size={24} />
          <View style={styles.replyAuthorMeta}>
            <View style={styles.replyAuthorLine}>
              <Text style={styles.replyAuthor}>{reply.userName || reply.userNickname || reply.author}</Text>
              {shouldShowReplyRelation ? <>
                  <Text style={styles.replyAuthorRelation}> 回复 </Text>
                  <Text style={styles.replyReplyTarget}>{relationUserName}</Text>
                </> : null}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleSupplementCommentLike(reply.id)} disabled={supplementCommentLikeLoading[reply.id]}>
            <Ionicons name={supplementCommentLiked[reply.id] ?? reply.liked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={supplementCommentLiked[reply.id] ?? reply.liked ? "#ef4444" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (supplementCommentLiked[reply.id] ?? reply.liked) && { color: '#ef4444' }]}>{getSupplementCommentLikeDisplayCount(reply, supplementCommentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          setShowSupplementCommentReplyModal(false);
          openSupplementCommentComposer(buildSupplementCommentReplyTarget(reply, currentSupplementCommentTargetId));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.shares || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleSupplementCommentCollect(reply.id)} disabled={supplementCommentCollectLoading[reply.id]}>
            <Ionicons name={supplementCommentCollected[reply.id] ?? reply.collected ? "star" : "star-outline"} size={12} color={supplementCommentCollected[reply.id] ?? reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (supplementCommentCollected[reply.id] ?? reply.collected) && { color: '#f59e0b' }]}>{getSupplementCommentCollectDisplayCount(reply, supplementCommentCollected[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleSupplementCommentDislike(reply.id)} disabled={supplementCommentDislikeLoading[reply.id]}>
            <Ionicons name={supplementCommentDisliked[reply.id] ?? reply.disliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={supplementCommentDisliked[reply.id] ?? reply.disliked ? "#6b7280" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (supplementCommentDisliked[reply.id] ?? reply.disliked) && { color: '#6b7280' }]}>{getSupplementCommentDislikeDisplayCount(reply, supplementCommentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderAnswerCommentReplyCard = (reply, options = {}) => {
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findAnswerCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    return <View key={reply.id} style={styles.replyCard}>
        <TouchableOpacity style={styles.replyHeader} activeOpacity={0.7} onPress={() => openPublicProfile(reply)}>
          <Avatar uri={reply.userAvatar || reply.avatar} name={reply.userName || reply.userNickname || reply.author} size={24} />
          <View style={styles.replyAuthorMeta}>
            <View style={styles.replyAuthorLine}>
              <Text style={styles.replyAuthor}>{reply.userName || reply.userNickname || reply.author}</Text>
              {shouldShowReplyRelation ? <>
                  <Text style={styles.replyAuthorRelation}> 回复 </Text>
                  <Text style={styles.replyReplyTarget}>{relationUserName}</Text>
                </> : null}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleAnswerCommentLike(reply.id)} disabled={answerCommentLikeLoading[reply.id]}>
            <Ionicons name={answerCommentLiked[reply.id] ?? reply.liked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={answerCommentLiked[reply.id] ?? reply.liked ? "#ef4444" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (answerCommentLiked[reply.id] ?? reply.liked) && { color: '#ef4444' }]}>{getAnswerCommentLikeDisplayCount(reply, answerCommentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          setShowAnswerCommentReplyModal(false);
          openAnswerCommentComposer(buildAnswerCommentReplyTarget(reply));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.shares || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleAnswerCommentCollect(reply.id)} disabled={answerCommentCollectLoading[reply.id]}>
            <Ionicons name={answerCommentCollected[reply.id] ?? reply.collected ? "star" : "star-outline"} size={12} color={answerCommentCollected[reply.id] ?? reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (answerCommentCollected[reply.id] ?? reply.collected) && { color: '#f59e0b' }]}>{getAnswerCommentCollectDisplayCount(reply, answerCommentCollected[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleAnswerCommentDislike(reply.id)} disabled={answerCommentDislikeLoading[reply.id]}>
            <Ionicons name={answerCommentDisliked[reply.id] ?? reply.disliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={answerCommentDisliked[reply.id] ?? reply.disliked ? "#6b7280" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (answerCommentDisliked[reply.id] ?? reply.disliked) && { color: '#6b7280' }]}>{getAnswerCommentDislikeDisplayCount(reply, answerCommentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleAnswerCommentReport(reply.id, {
          closeReplyModal: true
        })}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderAnswerCommentReplyTreeNodes = (nodes = [], options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedAnswerReplyChildren[reply.id] !== undefined ? expandedAnswerReplyChildren[reply.id] : true;
    return <View key={reply.id}>
        {renderAnswerCommentReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedAnswerReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderAnswerCommentReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });
  const renderSupplementCommentReplyTreeNodes = (nodes = [], options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedSupplementReplyChildren[reply.id] !== undefined ? expandedSupplementReplyChildren[reply.id] : true;
    return <View key={reply.id}>
        {renderSupplementCommentReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedSupplementReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderSupplementCommentReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });

  // 澶勭悊鎺掑簭鍒囨崲
  const handleSortChange = newSortBy => {
    if (activeTab === 0) {
      if (sortFilter !== newSortBy) {
        console.log(`馃搵 鍒囨崲琛ュ厖鍥炵瓟鎺掑簭: ${sortFilter} -> ${newSortBy}`);
        setSortFilter(newSortBy);
        fetchSupplementAnswers(true, newSortBy);
      }
      return;
    }
    if (answerCommentSortBy !== newSortBy) {
      console.log(`馃搵 鍒囨崲鍥炵瓟璇勮鎺掑簭: ${answerCommentSortBy} -> ${newSortBy}`);
      setAnswerCommentSortBy(newSortBy);
      loadAnswerComments({
        isRefresh: true,
        sortByOverride: newSortBy
      });
    }
  };

  // 鑾峰彇鍥炵瓟璇︽儏鏁版嵁(鍖呭惈鏈€鏂扮殑鐐硅禐銆佹敹钘忋€佺偣韪╃姸鎬?
  const fetchAnswerDetail = async () => {
    if (!answer?.id) {
      console.log('鈿狅笍 鍥炵瓟ID涓嶅瓨鍦?璺宠繃鑾峰彇璇︽儏');
      return;
    }
    try {
      console.log(`馃摛 鑾峰彇鍥炵瓟璇︽儏: answerId=${answer.id}`);
      const response = await answerApi.getAnswerDetail(answer.id);
      console.log('馃摜 鍥炵瓟璇︽儏鍝嶅簲:', JSON.stringify(response, null, 2));
      if (response && response.code === 200 && response.data) {
        const detailData = normalizeAnswerDetail(response.data);

        // 鏇存柊鍥炵瓟鏁版嵁
        setAnswerData(detailData);

        // 鍒濆鍖栦氦浜掔姸鎬?
        setAnswerLiked(!!detailData.liked);
        setAnswerBookmarked(!!detailData.collected);
        setAnswerDisliked(!!detailData.disliked);
        console.log('鉁?鍥炵瓟璇︽儏鍔犺浇鎴愬姛,浜や簰鐘舵€佸凡鍒濆鍖?', {
          isLiked: detailData.isLiked,
          isCollected: detailData.isCollected || detailData.isBookmarked,
          isDisliked: detailData.isDisliked,
          likeCount: detailData.likeCount,
          collectCount: detailData.collectCount,
          dislikeCount: detailData.dislikeCount
        });
      }
    } catch (error) {
      console.log('⚠️ 获取回答详情异常:', error);
      // 澶辫触鏃朵娇鐢ㄤ紶閫掕繃鏉ョ殑鏁版嵁
      console.log('浣跨敤瀵艰埅鍙傛暟浼犻€掔殑鍥炵瓟鏁版嵁');
    }
  };

  // 鍒濆鍖栧姞杞借ˉ鍏呭洖绛?
  useEffect(() => {
    if (isFocused && answer.id) {
      // 鑾峰彇鍥炵瓟璇︽儏(鍖呭惈鏈€鏂扮殑浜や簰鐘舵€?
      fetchAnswerDetail();
      loadAnswerComments({
        isRefresh: true
      });

      // 濡傛灉褰撳墠鍦ㄨˉ鍏呭洖绛攖ab,鍔犺浇琛ュ厖鍥炵瓟鍒楄〃
      if (activeTab === 0) {
        fetchSupplementAnswers(true);
      }
    }
  }, [isFocused, answer.id, activeTab]);
  useEffect(() => {
    if (!showSupplementCommentListModal || !currentSupplementCommentTargetId) {
      return;
    }
    setSupplementCommentListState(prevState => ({
      ...prevState,
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      loading: true,
      refreshing: false,
      loadingMore: false,
      targetId: Number(currentSupplementCommentTargetId)
    }));
    setSupplementCommentRepliesMap({});
    setCurrentSupplementCommentId(null);
    loadSupplementComments(currentSupplementCommentTargetId, {
      isRefresh: true
    });
  }, [showSupplementCommentListModal, currentSupplementCommentTargetId]);
  useEffect(() => {
    if (!showSupplementCommentReplyModal || !currentSupplementCommentTargetId || !currentSupplementCommentId) {
      return;
    }
    const currentReplyEntry = supplementCommentRepliesMap[currentSupplementCommentId];
    if (currentReplyEntry?.loaded || currentReplyEntry?.loading) {
      return;
    }
    loadSupplementCommentReplies(currentSupplementCommentId);
  }, [showSupplementCommentReplyModal, currentSupplementCommentTargetId, currentSupplementCommentId, supplementCommentRepliesMap]);
  useEffect(() => {
    if (!showSupplementCommentReplyModal) {
      setExpandedSupplementReplyChildren({});
    }
  }, [showSupplementCommentReplyModal]);
  useEffect(() => {
    if (!showAnswerCommentReplyModal || !currentAnswerCommentId) {
      return;
    }
    const currentReplyEntry = answerCommentRepliesMap[currentAnswerCommentId];
    if (currentReplyEntry?.loaded || currentReplyEntry?.loading) {
      return;
    }
    loadAnswerCommentReplies(currentAnswerCommentId);
  }, [showAnswerCommentReplyModal, currentAnswerCommentId, answerCommentRepliesMap]);
  useEffect(() => {
    if (!showAnswerCommentReplyModal) {
      setExpandedAnswerReplyChildren({});
    }
  }, [showAnswerCommentReplyModal]);
  const answerCommentsTotalCount = answerCommentListState.loaded ? Math.max(normalizeCount(answerCommentListState.total), answerCommentsList.length) : 0;
  const currentAnswerReplyComment = answerCommentsList.find(comment => String(comment.id) === String(currentAnswerCommentId)) || Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(currentAnswerCommentId)) || null;
  const currentSupplementReplyComment = supplementCommentsList.find(comment => String(comment.id) === String(currentSupplementCommentId)) || Object.values(supplementCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(currentSupplementCommentId)) || null;
  return <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.answerDetail.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => openShareModalWithData(buildAnswerSharePayload())}>
            <Ionicons name="arrow-redo-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="flag-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 鍥炵瓟鍐呭 */}
        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <TouchableOpacity style={styles.answerHeaderMain} activeOpacity={0.7} onPress={() => openPublicProfile(answer)}>
            <Avatar uri={answer.authorAvatar || answer.userAvatar || answer.avatar} name={answer.authorNickName || answer.userNickname || answer.userName || answer.author || t('home.anonymous')} size={48} style={styles.answerAvatar} />
            <View style={styles.answerAuthorInfo}>
              <View style={styles.answerAuthorRow}>
                <Text style={styles.answerAuthor}>{answer.authorNickName || answer.userNickname || answer.userName || answer.author || t('home.anonymous')}</Text>
                {Boolean(answer.verified) && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}
                
                {/* 閲囩撼鎸夐挳 - 鏀惧湪鐢ㄦ埛鍚嶅悗闈?*/}
                {Boolean(answer.canAdopt || answer.adopted) && <TouchableOpacity style={styles.adoptAnswerBtn} onPress={() => {
                showAppAlert(t('screens.answerDetail.alerts.adoptAnswerTitle'), t('screens.answerDetail.alerts.adoptAnswerMessage'), [{
                  text: t('screens.answerDetail.alerts.cancel'),
                  style: 'cancel'
                }, {
                  text: t('screens.answerDetail.alerts.confirm'),
                  onPress: () => {}
                }]);
              }}>
                    <Text style={styles.adoptAnswerBtnText}>{t('screens.answerDetail.actions.adopt')}</Text>
                  </TouchableOpacity>}
              </View>
              {!!answer.title && <Text style={styles.answerAuthorTitle}>{answer.title}</Text>}
            </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.followBtn, following && styles.followBtnActive]} onPress={() => setFollowing(!following)}>
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? t('screens.answerDetail.actions.following') : t('screens.answerDetail.actions.follow')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.answerContent}>{answer.content}</Text>

          {/* 鏃堕棿鍜屾爣绛惧尯鍩?- 鍚堝苟鍦ㄤ竴琛?*/}
          <View style={styles.answerMetaWithBadges}>
            <View style={styles.answerMetaLeft}>
              <Ionicons name="eye-outline" size={14} color="#9ca3af" />
              <Text style={styles.answerViews}>{answer.viewCount || answer.view_count || answer.views || 0} {t('screens.answerDetail.stats.views')}</Text>
              <Text style={styles.answerMetaSeparator}>·</Text>
              <Text style={styles.answerTime}>{answer.time}</Text>
            </View>
            
            {/* 鏍囩鍖哄煙 - 鏀惧湪鍙充晶 */}
            <View style={styles.badgesSectionRight}>
              {/* 宸查噰绾虫爣绛?*/}
              {Boolean(answer.adopted) && <View style={styles.adoptedBadgeCompact}>
                  <Text style={styles.adoptedBadgeCompactText}>{t('screens.answerDetail.badges.adopted')}</Text>
                </View>}
              
              {/* 閭€璇疯€呮爣绛?*/}
              {Boolean(answer.invitedBy) && <View style={styles.inviterBadgeCompact}>
                  <Image source={{
                uri: answer.invitedBy.avatar
              }} style={styles.inviterAvatarCompact} />
                  <Text style={styles.inviterTextCompact}>{t('screens.answerDetail.badges.invitedBy').replace('{name}', answer.invitedBy.name)}</Text>
                </View>}

            </View>
          </View>
        </View>

        {/* Tab鏍囩 */}
        <View style={styles.tabsSection}>
          <View style={styles.tabs}>
            {[0, 1].map(tabIndex => {
            const count = tabIndex === 0 ? supplementPagination.total || supplementAnswers.length || answer.supplementCount || 0 : answerCommentsTotalCount;
            const label = getTabLabel(tabIndex, count);
            return <TouchableOpacity key={tabIndex} style={styles.tabItem} onPress={() => setActiveTab(tabIndex)}>
                  <Text style={[styles.tabText, activeTab === tabIndex && styles.tabTextActive]}>{label}</Text>
                  {activeTab === tabIndex && <View style={styles.tabIndicator} />}
                </TouchableOpacity>;
          })}
          </View>

          {/* 绛涢€夋潯 */}
          <View style={styles.sortFilterBar}>
            <View style={styles.sortFilterLeft}>
              <TouchableOpacity style={[styles.sortFilterBtn, (activeTab === 0 ? sortFilter : answerCommentSortBy) === (activeTab === 0 ? 'featured' : 'likes') && styles.sortFilterBtnActive]} onPress={() => handleSortChange(activeTab === 0 ? 'featured' : 'likes')}>
                <Ionicons name="star" size={14} color={(activeTab === 0 ? sortFilter : answerCommentSortBy) === (activeTab === 0 ? 'featured' : 'likes') ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, (activeTab === 0 ? sortFilter : answerCommentSortBy) === (activeTab === 0 ? 'featured' : 'likes') && styles.sortFilterTextActive]}>
                  {t('screens.answerDetail.filter.featured')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sortFilterBtn, (activeTab === 0 ? sortFilter : answerCommentSortBy) === 'newest' && styles.sortFilterBtnActive]} onPress={() => handleSortChange('newest')}>
                <Ionicons name="time" size={14} color={(activeTab === 0 ? sortFilter : answerCommentSortBy) === 'newest' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, (activeTab === 0 ? sortFilter : answerCommentSortBy) === 'newest' && styles.sortFilterTextActive]}>{t('screens.answerDetail.filter.latest')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sortFilterCount}>
              {activeTab === 0 ? t('screens.answerDetail.stats.supplementCount').replace('{count}', supplementPagination.total || supplementAnswers.length || answer.supplementCount || 0) : t('screens.answerDetail.stats.commentCount').replace('{count}', answerCommentsTotalCount)}
            </Text>
          </View>
        </View>

        {/* 鍐呭鍖哄煙 */}
        <View style={styles.contentSection}>
          {activeTab === 0 ?
        // 琛ュ厖鍥炵瓟鍒楄〃
        <>
              {supplementLoading && supplementAnswers.length === 0 ?
          // 棣栨鍔犺浇鏄剧ず楠ㄦ灦灞?
          <SupplementAnswerSkeleton count={2} /> : supplementError && supplementAnswers.length === 0 ?
          // 鍔犺浇澶辫触涓旀棤鏁版嵁鏃舵樉绀洪敊璇俊鎭?
          <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                  <Text style={styles.errorTitle}>{t('screens.answerDetail.states.loadFailed')}</Text>
                  <Text style={styles.errorMessage}>{supplementError}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => fetchSupplementAnswers(true)}>
                    <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View> : supplementAnswers.length === 0 ?
          // 鏃犳暟鎹椂鏄剧ず绌虹姸鎬?
          <EmptyState icon="chatbubbles-outline" title={t('screens.answerDetail.states.emptySupplementsTitle')} description={t('screens.answerDetail.states.emptySupplementsDescription')} /> :
          // 鏈夋暟鎹椂鏄剧ず鍒楄〃
          supplementAnswers.map(supplement => <View 
                    key={supplement.id} 
                    style={styles.supplementCard}
                  >
                    <View style={styles.supplementHeader}>
                      <TouchableOpacity style={styles.supplementHeaderMain} activeOpacity={0.7} onPress={() => openPublicProfile(supplement)}>
                      <Avatar uri={supplement.authorAvatar || supplement.userAvatar || supplement.avatar} name={supplement.authorNickName || supplement.userNickname || supplement.userName || supplement.author || t('home.anonymous')} size={32} style={styles.supplementAvatar} />
                      <View style={styles.supplementAuthorInfo}>
                        <View style={styles.supplementAuthorRow}>
                          <View style={styles.supplementTitleRow}>
                            <Text style={styles.supplementAuthor}>{supplement.author}</Text>
                            <View style={styles.supplementMeta}>
                              <Ionicons name="location-outline" size={12} color="#9ca3af" />
                              <Text style={styles.supplementLocation}>{supplement.location}</Text>
                              <Text style={styles.supplementLocation}>{supplement.time}</Text>
                            </View>
                          </View>
                          
                          {/* 閲囩撼鎸夐挳 - 鏀惧湪鐢ㄦ埛鍚嶅悗闈?*/}
                          <TouchableOpacity style={styles.adoptAnswerBtn} onPress={() => {
                    showAppAlert(t('screens.answerDetail.alerts.adoptSupplementTitle'), t('screens.answerDetail.alerts.adoptSupplementMessage'), [{
                      text: t('screens.answerDetail.alerts.cancel'),
                      style: 'cancel'
                    }, {
                      text: t('screens.answerDetail.alerts.confirm'),
                      onPress: () => {}
                    }]);
                          }}>
                            <Text style={styles.adoptAnswerBtnText}>{t('screens.answerDetail.actions.adopt')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.supplementContent}>{supplement.content}</Text>
                    <View style={styles.supplementActions}>
                      <View style={styles.supplementActionsLeft}>
                        <TouchableOpacity style={styles.supplementActionBtn} onPress={() => handleSupplementLike(supplement.id)} disabled={!!supplementLikeLoading[supplement.id]}>
                          <Ionicons name={supplement.liked ? "thumbs-up" : "thumbs-up-outline"} size={16} color={supplement.liked ? "#ef4444" : "#6b7280"} />
                          <Text style={[styles.supplementActionText, supplement.liked && {
                        color: '#ef4444'
                      }]}>{getSupplementLikeDisplayCount(supplement)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.supplementActionBtn} onPress={() => {
                      setCurrentSupplementCommentTargetId(supplement.id);
                      setShowSupplementCommentListModal(true);
                    }}>
                          <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                          <Text style={styles.supplementActionText}>{supplement.comments || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.supplementActionBtn}>
                          <Ionicons name="arrow-redo-outline" size={16} color="#6b7280" />
                          <Text style={styles.supplementActionText}>{supplement.shares || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.supplementActionBtn} onPress={() => handleSupplementCollect(supplement.id)} disabled={!!supplementCollectLoading[supplement.id]}>
                          <Ionicons name={supplement.collected ? "star" : "star-outline"} size={16} color={supplement.collected ? "#f59e0b" : "#6b7280"} />
                          <Text style={[styles.supplementActionText, supplement.collected && {
                        color: '#f59e0b'
                      }]}>{supplement.collectCount ?? supplement.bookmarkCount ?? supplement.bookmarks ?? 0}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.supplementActionsRight}>
                        <TouchableOpacity style={styles.supplementActionBtn} onPress={() => handleSupplementDislike(supplement.id)} disabled={!!supplementDislikeLoading[supplement.id]}>
                          <Ionicons name={supplement.disliked ? "thumbs-down" : "thumbs-down-outline"} size={16} color={supplement.disliked ? "#6b7280" : "#6b7280"} />
                          <Text style={styles.supplementActionText}>{getSupplementDislikeDisplayCount(supplement)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.supplementActionBtn} onPress={() => handleSupplementAnswerReport(supplement.id)}>
                          <Ionicons name="flag-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>)}
              
              {/* 鍔犺浇鏇村鎸囩ず鍣?*/}
              {Boolean(supplementLoading && supplementAnswers.length > 0) && <View style={styles.loadingMore}>
                  <Text style={styles.loadingMoreText}>{t('screens.answerDetail.states.loadingMore')}</Text>
                </View>}
            </>
          : (
        // 璇勮鍒楄〃
        <>
              {(answerCommentListState.loading || answerCommentListState.refreshing) && answerCommentsList.length === 0 ? <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.loadingText}>{t('screens.answerDetail.states.loadingMore')}</Text>
                </View> : answerCommentListState.error && answerCommentsList.length === 0 ? <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                  <Text style={styles.errorTitle}>{t('screens.answerDetail.states.loadFailed')}</Text>
                  <Text style={styles.errorMessage}>{answerCommentListState.error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => loadAnswerComments({
                isRefresh: true
              })}>
                    <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View> : answerCommentsList.length === 0 ? (
          <EmptyState icon="chatbubble-outline" title={t('screens.answerDetail.states.emptyCommentsTitle')} description={t('screens.answerDetail.states.emptyCommentsDescription')} />
              ) : (
                <>
                  {answerCommentsList.map(comment => {
                const isCommentLiked = answerCommentLiked[comment.id] !== undefined ? answerCommentLiked[comment.id] : !!comment.liked;
                const isCommentCollected = answerCommentCollected[comment.id] !== undefined ? answerCommentCollected[comment.id] : !!comment.collected;
                const isCommentDisliked = answerCommentDisliked[comment.id] !== undefined ? answerCommentDisliked[comment.id] : !!comment.disliked;
                return <View key={comment.id} style={styles.commentCard}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                    <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={36} />
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <TouchableOpacity style={styles.commentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                      <Text style={styles.commentAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </TouchableOpacity>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <View style={styles.commentActions}>
                      <View style={styles.commentActionsLeft}>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleAnswerCommentLike(comment.id)} disabled={answerCommentLikeLoading[comment.id]}>
                          <Ionicons name={isCommentLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isCommentLiked ? "#ef4444" : "#9ca3af"} />
                          <Text style={[styles.commentActionText, isCommentLiked && {
                      color: '#ef4444'
                    }]}>
                            {getAnswerCommentLikeDisplayCount(comment, answerCommentLiked[comment.id])}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleReply(comment)}>
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{Number(comment.replyCount ?? comment.replies ?? 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => openShareModalWithData(buildAnswerCommentSharePayload(comment))}>
                          <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{Number(comment.shareCount ?? comment.shares ?? 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleAnswerCommentCollect(comment.id)} disabled={answerCommentCollectLoading[comment.id]}>
                          <Ionicons name={isCommentCollected ? "star" : "star-outline"} size={14} color={isCommentCollected ? "#f59e0b" : "#9ca3af"} />
                          <Text style={[styles.commentActionText, isCommentCollected && {
                      color: '#f59e0b'
                    }]}>
                            {getAnswerCommentCollectDisplayCount(comment, answerCommentCollected[comment.id])}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.commentActionsRight}>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleAnswerCommentDislike(comment.id)} disabled={answerCommentDislikeLoading[comment.id]}>
                          <Ionicons name={isCommentDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{getAnswerCommentDislikeDisplayCount(comment, answerCommentDisliked[comment.id])}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleAnswerCommentReport(comment.id)}>
                          <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>;
              })}
                  {Boolean(answerCommentListState.loadingMore) && <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>加载更多评论中...</Text>
                    </View>}
                  {Boolean(answerCommentListState.hasMore && !answerCommentListState.loadingMore && answerCommentsList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={handleAnswerCommentsLoadMore}>
                      <Text style={styles.loadMoreText}>加载更多评论</Text>
                      <Ionicons name="chevron-down" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                  {!answerCommentListState.hasMore && answerCommentsList.length > 0 && <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>没有更多评论了</Text>
                    </View>}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* 搴曢儴鏍?*/}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <TouchableOpacity style={styles.bottomIconBtn} onPress={handleAnswerLike}>
            <Ionicons name={answerLiked ? "thumbs-up" : "thumbs-up-outline"} size={20} color={answerLiked ? "#ef4444" : "#6b7280"} />
            <Text style={[styles.bottomIconText, answerLiked && {
            color: '#ef4444'
          }]}>
              {answerLikeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomIconBtn, isCollectLoading && styles.bottomIconBtnDisabled]} onPress={handleAnswerBookmark} disabled={isCollectLoading}>
            <Ionicons name={answerBookmarked ? "star" : "star-outline"} size={20} color={answerBookmarked ? "#f59e0b" : "#6b7280"} />
            <Text style={[styles.bottomIconText, answerBookmarked && {
            color: '#f59e0b'
          }]}>
              {answerBookmarkCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomIconBtn} onPress={handleAnswerDislike}>
            <Ionicons name={answerDisliked ? "thumbs-down" : "thumbs-down-outline"} size={20} color={answerDisliked ? "#6b7280" : "#6b7280"} />
            <Text style={styles.bottomIconText}>
              {answerDislikeCount}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomBarRight}>
          <TouchableOpacity style={styles.bottomCommentInput} onPress={handleOpenBottomComposer}>
            <Text style={styles.bottomCommentPlaceholder}>{bottomComposerPlaceholder}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showAnswerCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAnswerCommentReplyModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <View style={styles.commentListHeaderLeft} />
              <Text style={styles.commentListModalTitle}>
                {Number(currentAnswerReplyComment?.replyCount ?? currentAnswerReplyComment?.replies ?? answerCommentRepliesMap[currentAnswerCommentId]?.total ?? answerCommentRepliesMap[currentAnswerCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <TouchableOpacity onPress={() => setShowAnswerCommentReplyModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
            </View>

            {Boolean(currentAnswerReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentAnswerReplyComment)}>
                  <Avatar uri={currentAnswerReplyComment.userAvatar || currentAnswerReplyComment.avatar} name={currentAnswerReplyComment.userName || currentAnswerReplyComment.userNickname || currentAnswerReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentAnswerReplyComment.userName || currentAnswerReplyComment.userNickname || currentAnswerReplyComment.author}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.originalCommentTime}>{currentAnswerReplyComment.time}</Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>{currentAnswerReplyComment.content}</Text>
              </View>}

            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentAnswerCommentId && answerCommentRepliesMap[currentAnswerCommentId]?.loading && !answerCommentRepliesMap[currentAnswerCommentId]?.loaded ? <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.loadingText}>加载回复中...</Text>
                </View> : null}
              {currentAnswerCommentId && answerCommentRepliesMap[currentAnswerCommentId]?.list ? renderAnswerCommentReplyTreeNodes(buildCommentReplyTree(answerCommentRepliesMap[currentAnswerCommentId].list, currentAnswerCommentId), {
            rootCommentId: currentAnswerCommentId
          }) : null}
              {currentAnswerCommentId && answerCommentRepliesMap[currentAnswerCommentId]?.loaded && (!answerCommentRepliesMap[currentAnswerCommentId]?.list || answerCommentRepliesMap[currentAnswerCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowAnswerCommentReplyModal(false);
              openAnswerCommentComposer(buildAnswerCommentReplyTarget(currentAnswerReplyComment));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSupplementCommentListModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSupplementCommentListModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <View style={styles.commentListHeaderLeft} />
              <Text style={styles.commentListModalTitle}>全部评论</Text>
              <TouchableOpacity onPress={() => setShowSupplementCommentListModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {(supplementCommentListState.loading || supplementCommentListState.refreshing) && supplementCommentsList.length === 0 ? <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.loadingText}>加载评论中...</Text>
                </View> : supplementCommentsList.length === 0 ? <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无评论</Text>
                </View> : supplementCommentsList.map(comment => {
              const isCommentLiked = supplementCommentLiked[comment.id] !== undefined ? supplementCommentLiked[comment.id] : !!comment.liked;
              const isCommentCollected = supplementCommentCollected[comment.id] !== undefined ? supplementCommentCollected[comment.id] : !!comment.collected;
              const isCommentDisliked = supplementCommentDisliked[comment.id] !== undefined ? supplementCommentDisliked[comment.id] : !!comment.disliked;
              return <View key={comment.id}>
                    <View style={styles.commentListCard}>
                      <TouchableOpacity style={styles.commentListCardHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                        <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={24} />
                        <Text style={styles.commentListAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.commentListTime}>{comment.time}</Text>
                      </TouchableOpacity>
                      <View style={styles.commentListContent}>
                        <Text style={styles.commentListText}>{comment.content}</Text>
                        <View style={styles.commentListActions}>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => handleSupplementCommentLike(comment.id)} disabled={supplementCommentLikeLoading[comment.id]}>
                            <Ionicons name={isCommentLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isCommentLiked ? "#ef4444" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentLiked && { color: '#ef4444' }]}>{getSupplementCommentLikeDisplayCount(comment, supplementCommentLiked[comment.id])}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                        setCurrentSupplementCommentId(comment.id);
                        setShowSupplementCommentListModal(false);
                        setShowSupplementCommentReplyModal(true);
                      }}>
                            <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentListActionText}>{Number(comment.replyCount ?? comment.replies ?? 0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => openShareModalWithData(buildSupplementCommentSharePayload(comment))}>
                            <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentListActionText}>{Number(comment.shareCount ?? comment.shares ?? 0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => handleSupplementCommentCollect(comment.id)} disabled={supplementCommentCollectLoading[comment.id]}>
                            <Ionicons name={isCommentCollected ? "star" : "star-outline"} size={14} color={isCommentCollected ? "#f59e0b" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentCollected && { color: '#f59e0b' }]}>{getSupplementCommentCollectDisplayCount(comment, supplementCommentCollected[comment.id])}</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => handleSupplementCommentDislike(comment.id)} disabled={supplementCommentDislikeLoading[comment.id]}>
                            <Ionicons name={isCommentDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={isCommentDisliked ? "#6b7280" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentDisliked && { color: '#6b7280' }]}>{getSupplementCommentDislikeDisplayCount(comment, supplementCommentDisliked[comment.id])}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn}>
                            <Ionicons name="flag-outline" size={14} color="#ef4444" />
                            <Text style={styles.commentListActionText}>{comment.reports || 0}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>;
            })}
              {Boolean(supplementCommentListState.loadingMore) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>加载更多评论中...</Text>
                </View>}
              {Boolean(supplementCommentListState.hasMore && !supplementCommentListState.loadingMore && supplementCommentsList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={handleSupplementCommentsLoadMore}>
                  <Text style={styles.loadMoreText}>加载更多评论</Text>
                  <Ionicons name="chevron-down" size={16} color="#ef4444" />
                </TouchableOpacity>}
              {!supplementCommentListState.hasMore && supplementCommentsList.length > 0 && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>没有更多评论了</Text>
                </View>}
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowSupplementCommentListModal(false);
              openSupplementCommentComposer({
                targetId: currentSupplementCommentTargetId,
                parentId: 0
              });
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写评论...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSupplementCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => {
            setShowSupplementCommentListModal(true);
            setTimeout(() => setShowSupplementCommentReplyModal(false), 50);
          }} />

          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={() => {
              setShowSupplementCommentListModal(true);
              setTimeout(() => setShowSupplementCommentReplyModal(false), 50);
            }} style={[styles.commentListCloseBtn, { left: 16, right: 'auto' }]}>
                <Ionicons name="arrow-back" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentListModalTitle}>
                {Number(currentSupplementReplyComment?.replyCount ?? currentSupplementReplyComment?.replies ?? supplementCommentRepliesMap[currentSupplementCommentId]?.total ?? supplementCommentRepliesMap[currentSupplementCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <View style={styles.commentListHeaderRight} />
            </View>

            {Boolean(currentSupplementReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentSupplementReplyComment)}>
                  <Avatar uri={currentSupplementReplyComment.userAvatar || currentSupplementReplyComment.avatar} name={currentSupplementReplyComment.userName || currentSupplementReplyComment.userNickname || currentSupplementReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentSupplementReplyComment.userName || currentSupplementReplyComment.userNickname || currentSupplementReplyComment.author}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.originalCommentTime}>{currentSupplementReplyComment.time}</Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>{currentSupplementReplyComment.content}</Text>
              </View>}

            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentSupplementCommentId && supplementCommentRepliesMap[currentSupplementCommentId]?.list ? renderSupplementCommentReplyTreeNodes(buildCommentReplyTree(supplementCommentRepliesMap[currentSupplementCommentId].list, currentSupplementCommentId), {
            rootCommentId: currentSupplementCommentId
          }) : null}
              {currentSupplementCommentId && supplementCommentRepliesMap[currentSupplementCommentId]?.loaded && (!supplementCommentRepliesMap[currentSupplementCommentId]?.list || supplementCommentRepliesMap[currentSupplementCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowSupplementCommentReplyModal(false);
              openSupplementCommentComposer(buildSupplementCommentReplyTarget(currentSupplementReplyComment, currentSupplementCommentTargetId));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 琛ュ厖鍥炵瓟寮圭獥 */}
      <SupplementAnswerModal visible={showSupplementAnswerModal} onClose={() => setShowSupplementAnswerModal(false)} answer={answer} questionId={route?.params?.questionId || answer?.questionId} onSuccess={() => {
      // 琛ュ厖鍥炵瓟鍙戝竷鎴愬姛鍚庡埛鏂板垪琛?
      fetchSupplementAnswers(true);
    }} />
      <ShareModal visible={showShareModal} onClose={closeShareModal} shareData={currentShareData || buildAnswerSharePayload()} onShare={handleShare} />
      <WriteCommentModal visible={showSupplementCommentComposerModal} onClose={() => setShowSupplementCommentComposerModal(false)} onPublish={handleSubmitSupplementComment} originalComment={supplementCommentTarget.originalComment} publishInFooter closeOnRight title={supplementCommentTarget.parentId ? '写回复' : '写评论'} placeholder={supplementCommentTarget.parentId ? '写下你的回复...' : '写下你的评论...'} />
      <WriteCommentModal visible={showWriteCommentModal} onClose={() => {
      setShowWriteCommentModal(false);
      setAnswerCommentTarget({
        ...INITIAL_COMMENT_COMPOSER_TARGET,
        targetId: answer.id ?? null
      });
    }} onPublish={handlePublishComment} originalComment={answerCommentTarget.originalComment} publishInFooter closeOnRight title={answerCommentTarget.parentId ? t('screens.answerDetail.modals.replyTitle').replace('{author}', answerCommentTarget.replyToUserName || '') : t('screens.answerDetail.modals.writeCommentTitle')} placeholder={answerCommentTarget.parentId ? t('screens.answerDetail.placeholders.writeReply') : t('screens.answerDetail.placeholders.writeCommentContent')} />
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 80,
    justifyContent: 'flex-end'
  },
  shareBtn: {
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  shareBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  content: {
    flex: 1
  },
  answerSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8
  },
  // 鏃堕棿鍜屾爣绛惧悎骞跺尯鍩?
  answerMetaWithBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8
  },
  answerMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  badgesSectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  // 鏍囩鍖哄煙鏍峰紡 - 绱у噾鐗?
  badgesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  adoptedBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  adoptedBadgeCompactText: {
    fontSize: scaleFont(11),
    color: '#22c55e',
    fontWeight: '600'
  },
  inviterBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  inviterAvatarCompact: {
    width: 14,
    height: 14,
    borderRadius: 7
  },
  inviterTextCompact: {
    fontSize: scaleFont(10),
    color: '#3b82f6',
    fontWeight: '500',
    textAlign: 'center'
  },
  arbitrationBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  arbitrationBtnTextCompact: {
    fontSize: scaleFont(10),
    color: '#6b7280',
    fontWeight: '500'
  },
  inviterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'flex-start'
  },
  inviterAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  inviterText: {
    fontSize: scaleFont(12),
    color: '#3b82f6',
    fontWeight: '500'
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  answerHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  answerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  answerAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  answerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap'
  },
  answerAuthor: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  // 閲囩撼鎸夐挳鏍峰紡 - 涓庨棶棰樿鎯呴〉涓€鑷?
  adoptAnswerBtn: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    marginLeft: 6
  },
  adoptAnswerBtnText: {
    fontSize: scaleFont(12),
    color: '#22c55e',
    fontWeight: '700',
    letterSpacing: 0.2
  },
  answerAuthorTitle: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  followBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16
  },
  followBtnActive: {
    backgroundColor: '#f3f4f6'
  },
  followBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '500'
  },
  followBtnTextActive: {
    color: '#6b7280'
  },
  adoptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12
  },
  adoptedText: {
    fontSize: scaleFont(13),
    color: '#22c55e',
    fontWeight: '500'
  },
  answerContent: {
    fontSize: scaleFont(15),
    color: '#374151',
    lineHeight: scaleFont(24),
    marginBottom: 12
  },
  answerMeta: {
    marginBottom: 12
  },
  answerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  answerViews: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  answerMetaSeparator: {
    fontSize: scaleFont(13),
    color: '#d1d5db',
    marginHorizontal: 2
  },
  answerTime: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  tabsSection: {
    backgroundColor: '#fff',
    marginBottom: 0
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center'
  },
  tabText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1
  },
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  sortFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  sortFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  sortFilterBtnActive: {
    backgroundColor: '#fef2f2'
  },
  sortFilterText: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  sortFilterTextActive: {
    color: '#ef4444',
    fontWeight: '500'
  },
  sortFilterCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  contentSection: {
    backgroundColor: '#fff'
  },
  supplementCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  supplementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  supplementHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  supplementAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  supplementAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  supplementAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  supplementAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  supplementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 6
  },
  supplementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
    flexShrink: 1
  },
  supplementLocation: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  supplementContent: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(22),
    marginBottom: 12
  },
  supplementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  supplementActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1
  },
  supplementActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  supplementActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  supplementActionText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  commentCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  commentContent: {
    flex: 1,
    marginLeft: 12
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  commentAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  commentTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  commentText: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(20),
    marginBottom: 8
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10
  },
  commentActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1
  },
  commentActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  commentActionText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  modalBackdrop: {
    flex: 1
  },
  commentListModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '65%',
    maxHeight: '88%',
    overflow: 'hidden'
  },
  commentListModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  commentListModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentListHeaderLeft: {
    width: 32
  },
  commentListHeaderRight: {
    width: 32
  },
  commentListModalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  commentListCloseBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  commentListScroll: {
    flex: 1
  },
  commentListCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentListCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  commentListAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  commentListTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  commentListText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10
  },
  commentListContent: {
    flex: 1
  },
  commentListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  commentListActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  commentListActionText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  commentListBottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff'
  },
  commentListWriteBtn: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  commentListWriteText: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  originalCommentCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  originalCommentAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  originalCommentTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  originalCommentText: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    color: '#1f2937'
  },
  repliesSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb'
  },
  repliesSectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#6b7280'
  },
  replyCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  replyAuthorMeta: {
    flexShrink: 1
  },
  replyAuthorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  replyAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af'
  },
  replyAuthorRelation: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  replyReplyTarget: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#6b7280'
  },
  replyTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  replyText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  replyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  replyActionText: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  replyChildrenSection: {
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10
  },
  replyChildrenToggle: {
    paddingBottom: 6
  },
  replyChildrenToggleText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500'
  },
  loadingIndicator: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 8,
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16
  },
  loadMoreText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '500'
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  bottomBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  bottomBarRight: {
    flex: 1,
    marginLeft: 16
  },
  bottomIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  bottomIconBtnDisabled: {
    opacity: 0.6
  },
  bottomIconText: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  bottomCommentInput: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  bottomCommentPlaceholder: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  replyModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    maxHeight: '60%'
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    paddingBottom: 12
  },
  replyModalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  replyInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  replySubmitBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  replySubmitBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  replySubmitText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 浠茶鐢宠寮圭獥鏍峰紡
  arbitrationModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '85%'
  },
  arbitrationModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  arbitrationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  arbitrationModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  arbitrationContent: {
    maxHeight: 500,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  arbitrationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  arbitrationInfoText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#1e40af',
    lineHeight: scaleFont(20)
  },
  arbitrationSectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginBottom: 10
  },
  arbitrationReasonInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    minHeight: 100,
    marginBottom: 20
  },
  arbitrationExpertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  arbitrationExpertsCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  expertSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8
  },
  expertSearchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    padding: 0
  },
  recommendedExpertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  recommendedExpertsTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  noExpertsFound: {
    alignItems: 'center',
    paddingVertical: 40
  },
  noExpertsFoundText: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: modalTokens.textSecondary,
    marginTop: 12
  },
  noExpertsFoundDesc: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
    marginTop: 4
  },
  expertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  expertItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2
  },
  expertInfo: {
    flex: 1,
    marginLeft: 12
  },
  expertNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  expertName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  expertTitle: {
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    marginBottom: 2
  },
  expertExpertise: {
    fontSize: scaleFont(11),
    color: modalTokens.textMuted
  },
  expertCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: modalTokens.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  expertCheckboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  arbitrationModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  submitArbitrationBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  submitArbitrationBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  submitArbitrationBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  cancelArbitrationBtn: {
    backgroundColor: modalTokens.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelArbitrationBtnText: {
    fontSize: scaleFont(15),
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  // 琛ュ厖鍥炵瓟寮圭獥鏍峰紡
  answerModal: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  answerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  answerCloseBtn: {
    padding: 4,
    zIndex: 10
  },
  answerHeaderCenter: {
    flex: 1,
    alignItems: 'center'
  },
  answerModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  answerPublishBtn: {
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius,
    zIndex: 1
  },
  answerPublishBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  answerPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  answerPublishTextDisabled: {
    color: '#fff'
  },
  answerContentArea: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  answerTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(26),
    minHeight: 300
  },
  answerIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  answerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
    backgroundColor: modalTokens.surface
  },
  answerToolsLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  answerToolItem: {
    padding: 10
  },
  answerWordCount: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted
  },
  supplementAnswerContext: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe'
  },
  supplementAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  supplementAnswerLabel: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '600'
  },
  supplementAnswerAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  supplementAnswerAuthorName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  supplementAnswerContent: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    lineHeight: scaleFont(20)
  },
  // 鍔犺浇鍜岄敊璇姸鎬佹牱寮?
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  errorTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8
  },
  errorMessage: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: scaleFont(20),
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: 20
  },
  loadingMoreText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  }
});
