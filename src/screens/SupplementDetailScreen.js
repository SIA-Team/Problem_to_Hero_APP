import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import IdentitySelector from '../components/IdentitySelector';
import ShareModal from '../components/ShareModal';
import WriteCommentModal from '../components/WriteCommentModal';
import WriteAnswerModal from '../components/WriteAnswerModal';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';
import { formatNumber } from '../utils/numberFormatter';
import { formatTime } from '../utils/timeFormatter';
import { normalizeEntityId } from '../utils/jsonLongId';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';
import answerApi from '../services/api/answerApi';
import commentApi from '../services/api/commentApi';
import questionApi from '../services/api/questionApi';
import uploadApi from '../services/api/uploadApi';

import { scaleFont } from '../utils/responsive';
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
const INITIAL_COMMENT_LIST_STATE = {
  list: [],
  total: 0,
  loading: false,
  loaded: false,
  error: ''
};
const INITIAL_COMMENT_COMPOSER_TARGET = {
  targetId: null,
  parentId: 0,
  replyToCommentId: 0,
  replyToUserId: null,
  replyToUserName: '',
  threadRootId: null,
  originalComment: null
};
const TAB_KEYS = {
  ANSWERS: 'answers',
  COMMENTS: 'comments',
  INVITE: 'invite'
};
const SORT_KEYS = {
  FEATURED: 'featured',
  LATEST: 'latest'
};
const INVITE_TAB_KEYS = {
  LOCAL: 'local',
  TWITTER: 'twitter',
  FACEBOOK: 'facebook'
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

const parseIsoLikeDate = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s])(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?(Z|[+-]\d{2}:?\d{2})?$/
  );

  if (!isoMatch) {
    return null;
  }

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]) - 1;
  const day = Number(isoMatch[3]);
  const hour = Number(isoMatch[4]);
  const minute = Number(isoMatch[5]);
  const second = Number(isoMatch[6] ?? 0);
  const millisecond = Number((isoMatch[7] ?? '0').padEnd(3, '0'));
  const timezone = isoMatch[8] ?? '';

  if (!timezone) {
    return new Date(year, month, day, hour, minute, second, millisecond);
  }

  if (timezone === 'Z') {
    return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
  }

  const timezoneMatch = timezone.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!timezoneMatch) {
    return null;
  }

  const sign = timezoneMatch[1] === '-' ? -1 : 1;
  const timezoneMinutes = Number(timezoneMatch[2]) * 60 + Number(timezoneMatch[3]);
  const utcTimestamp =
    Date.UTC(year, month, day, hour, minute, second, millisecond) -
    sign * timezoneMinutes * 60 * 1000;

  return new Date(utcTimestamp);
};

const extractTimezoneOffsetMs = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.endsWith('Z')) {
    return 0;
  }

  const timezoneMatch = trimmed.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!timezoneMatch) {
    return null;
  }

  const sign = timezoneMatch[1] === '-' ? -1 : 1;
  const timezoneMinutes = Number(timezoneMatch[2]) * 60 + Number(timezoneMatch[3]);
  return sign * timezoneMinutes * 60 * 1000;
};

const parseDateValue = timeValue => {
  if (timeValue instanceof Date) {
    return timeValue;
  }

  if (typeof timeValue === 'number' && Number.isFinite(timeValue)) {
    return new Date(timeValue < 1e12 ? timeValue * 1000 : timeValue);
  }

  if (typeof timeValue === 'string') {
    const trimmed = timeValue.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{10,13}$/.test(trimmed)) {
      const numericValue = Number(trimmed);
      return new Date(trimmed.length === 10 ? numericValue * 1000 : numericValue);
    }

    const isoLikeDate = parseIsoLikeDate(trimmed);
    if (isoLikeDate && !isNaN(isoLikeDate.getTime())) {
      return isoLikeDate;
    }

    return new Date(trimmed);
  }

  return null;
};

const resolveDisplayDateValue = timeValue => {
  const parsedDate = parseDateValue(timeValue);
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return null;
  }

  if (typeof timeValue !== 'string') {
    return parsedDate;
  }

  const offsetMs = extractTimezoneOffsetMs(timeValue);
  const nowTimestamp = Date.now();
  if (parsedDate.getTime() <= nowTimestamp || offsetMs === null) {
    return parsedDate;
  }

  const correctedDate = new Date(parsedDate.getTime() - offsetMs);
  if (!isNaN(correctedDate.getTime()) && correctedDate.getTime() <= nowTimestamp) {
    return correctedDate;
  }

  return parsedDate;
};

// 时间格式化函数 - 使用工具函数
// 已从 ../utils/timeFormatter 导入

const normalizeDisplayTime = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }

      const parsedTime = parseDateValue(trimmed);
      if (parsedTime && !isNaN(parsedTime.getTime())) {
        return formatTime(trimmed);
      }

      return trimmed;
    }

    const parsedTime = parseDateValue(value);
    if (parsedTime && !isNaN(parsedTime.getTime())) {
      return formatTime(value);
    }
  }

  return '刚刚';
};

const normalizeCount = (...values) => {
  for (const value of values) {
    const count = Number(value);
    if (!Number.isNaN(count)) {
      return count;
    }
  }
  return 0;
};

const pickDisplayText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const normalizeQuestionDetail = (question, fallbackSeed = 'question') => {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const normalizedId = question.id ?? question.questionId ?? question.question_id ?? null;
  const normalizedAuthorName =
    question.userName ??
    question.userNickname ??
    question.authorNickName ??
    question.author ??
    '鍖垮悕鐢ㄦ埛';
  const normalizedAvatar =
    question.userAvatar ??
    question.authorAvatar ??
    question.avatar ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackSeed}${normalizedId ?? 'unknown'}`;
  const normalizedCreateTime =
    question.createTime ??
    question.createdAt ??
    question.updateTime ??
    question.updatedAt ??
    null;
  const normalizedDescription =
    question.description ??
    question.content ??
    question.questionDescription ??
    question.text ??
    '';
  const normalizedTitle =
    question.title ??
    question.questionTitle ??
    normalizedDescription ??
    '无标题';
  const normalizedAnonymous = Number(question.isAnonymous ?? 0) === 1;
  const hasLikeCountField = hasCountValue(question.likeCount, question.likes, question.like_count);
  const hasDislikeCountField = hasCountValue(question.dislikeCount, question.dislikes, question.dislike_count);
  const hasCollectCountField = hasCountValue(question.collectCount, question.bookmarkCount, question.bookmarks, question.collect_count);

  return {
    ...question,
    id: normalizedId,
    questionId: question.questionId ?? question.question_id ?? normalizedId,
    parentQuestionId:
      question.parentQuestionId ??
      question.parentQuestionID ??
      question.originalQuestionId ??
      question.rootQuestionId ??
      question.questionId ??
      question.question_id ??
      null,
    title: normalizedTitle,
    description: normalizedDescription,
    content: normalizedDescription || normalizedTitle,
    author: normalizedAnonymous ? '鍖垮悕鐢ㄦ埛' : normalizedAuthorName,
    userName: normalizedAuthorName,
    userNickname: question.userNickname ?? question.authorNickName ?? normalizedAuthorName,
    avatar: normalizedAvatar,
    userAvatar: normalizedAvatar,
    authorAvatar: normalizedAvatar,
    location: question.location ?? question.ipLocation ?? question.city ?? '鏈煡',
    time: normalizeDisplayTime(question.time, normalizedCreateTime),
    createTime: normalizedCreateTime,
    likes: normalizeCount(question.likeCount, question.likes, question.like_count),
    likeCount: normalizeCount(question.likeCount, question.likes, question.like_count),
    dislikes: normalizeCount(question.dislikeCount, question.dislikes, question.dislike_count),
    dislikeCount: normalizeCount(question.dislikeCount, question.dislikes, question.dislike_count),
    bookmarks: normalizeCount(question.collectCount, question.bookmarkCount, question.bookmarks, question.collect_count),
    collectCount: normalizeCount(question.collectCount, question.bookmarkCount, question.bookmarks, question.collect_count),
    comments: normalizeCount(question.commentCount, question.comments, question.comment_count),
    commentCount: normalizeCount(question.commentCount, question.comments, question.comment_count),
    shares: normalizeCount(question.shareCount, question.shares, question.share_count),
    shareCount: normalizeCount(question.shareCount, question.shares, question.share_count),
    views: normalizeCount(question.viewCount, question.views, question.view_count),
    viewCount: normalizeCount(question.viewCount, question.views, question.view_count),
    liked: normalizeFlag(question.liked, question.isLiked),
    disliked: normalizeFlag(question.disliked, question.isDisliked),
    collected: normalizeFlag(question.collected, question.isCollected, question.bookmarked, question.isBookmarked),
    __likeCountResolved: question.__likeCountResolved ?? hasLikeCountField,
    __dislikeCountResolved: question.__dislikeCountResolved ?? hasDislikeCountField,
    __collectCountResolved: question.__collectCountResolved ?? hasCollectCountField,
  };
};

const buildOriginalQuestionSummary = source => {
  const normalized = normalizeQuestionDetail(source, 'original-question');
  if (!normalized) {
    return null;
  }

  return {
    id: normalized.id ?? normalized.questionId ?? null,
    title: normalized.title || normalized.content || '原问题',
    author: normalized.author || normalized.userName || '匿名用户',
    avatar: normalized.avatar || DEFAULT_AVATAR,
    time: normalized.time || '刚刚',
    location: normalized.location || '未知',
    content: normalized.description || normalized.content || normalized.title || ''
  };
};

const extractOriginalQuestionCandidate = detail => {
  if (!detail || typeof detail !== 'object') {
    return null;
  }

  const candidates = [
    detail.originalQuestion,
    detail.parentQuestion,
    detail.parent,
    detail.rootQuestion,
    detail.sourceQuestion
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return null;
};
const mergeQuestionDetailWithFallback = (detail, fallback = null, fallbackSeed = 'question-merged') => {
  if (!detail && !fallback) {
    return null;
  }

  const detailData = detail && typeof detail === 'object' ? detail : {};
  const fallbackData = fallback && typeof fallback === 'object' ? fallback : {};
  const preferFallbackLike = hasCountValue(fallbackData.likeCount, fallbackData.likes, fallbackData.like_count) || fallbackData.__likeCountResolved;
  const preferFallbackDislike = hasCountValue(fallbackData.dislikeCount, fallbackData.dislikes, fallbackData.dislike_count) || fallbackData.__dislikeCountResolved;
  const preferFallbackCollect = hasCountValue(fallbackData.collectCount, fallbackData.bookmarkCount, fallbackData.bookmarks, fallbackData.collect_count) || fallbackData.__collectCountResolved;
  const fallbackHasLikedState = fallbackData.liked !== undefined || fallbackData.isLiked !== undefined;
  const fallbackHasDislikedState = fallbackData.disliked !== undefined || fallbackData.isDisliked !== undefined;
  const fallbackHasCollectedState =
    fallbackData.collected !== undefined ||
    fallbackData.isCollected !== undefined ||
    fallbackData.bookmarked !== undefined ||
    fallbackData.isBookmarked !== undefined;
  const mergedDetail = {
    ...fallbackData,
    ...detailData,
    likeCount: preferFallbackLike
      ? fallbackData.likeCount ?? fallbackData.likes ?? fallbackData.like_count
      : detailData.likeCount ?? detailData.likes ?? detailData.like_count ?? fallbackData.likeCount ?? fallbackData.likes ?? fallbackData.like_count,
    likes: preferFallbackLike
      ? fallbackData.likeCount ?? fallbackData.likes ?? fallbackData.like_count
      : detailData.likeCount ?? detailData.likes ?? detailData.like_count ?? fallbackData.likeCount ?? fallbackData.likes ?? fallbackData.like_count,
    dislikeCount: preferFallbackDislike
      ? fallbackData.dislikeCount ?? fallbackData.dislikes ?? fallbackData.dislike_count
      : detailData.dislikeCount ?? detailData.dislikes ?? detailData.dislike_count ?? fallbackData.dislikeCount ?? fallbackData.dislikes ?? fallbackData.dislike_count,
    dislikes: preferFallbackDislike
      ? fallbackData.dislikeCount ?? fallbackData.dislikes ?? fallbackData.dislike_count
      : detailData.dislikeCount ?? detailData.dislikes ?? detailData.dislike_count ?? fallbackData.dislikeCount ?? fallbackData.dislikes ?? fallbackData.dislike_count,
    collectCount: preferFallbackCollect
      ? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count
      : detailData.collectCount ?? detailData.bookmarkCount ?? detailData.bookmarks ?? detailData.collect_count ?? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count,
    bookmarkCount: preferFallbackCollect
      ? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count
      : detailData.collectCount ?? detailData.bookmarkCount ?? detailData.bookmarks ?? detailData.collect_count ?? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count,
    bookmarks: preferFallbackCollect
      ? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count
      : detailData.collectCount ?? detailData.bookmarkCount ?? detailData.bookmarks ?? detailData.collect_count ?? fallbackData.collectCount ?? fallbackData.bookmarkCount ?? fallbackData.bookmarks ?? fallbackData.collect_count,
    commentCount: hasCountValue(detailData.commentCount, detailData.comments, detailData.comment_count)
      ? detailData.commentCount ?? detailData.comments ?? detailData.comment_count
      : fallbackData.commentCount ?? fallbackData.comments ?? fallbackData.comment_count,
    comments: hasCountValue(detailData.commentCount, detailData.comments, detailData.comment_count)
      ? detailData.commentCount ?? detailData.comments ?? detailData.comment_count
      : fallbackData.commentCount ?? fallbackData.comments ?? fallbackData.comment_count,
    shareCount: hasCountValue(detailData.shareCount, detailData.shares, detailData.share_count)
      ? detailData.shareCount ?? detailData.shares ?? detailData.share_count
      : fallbackData.shareCount ?? fallbackData.shares ?? fallbackData.share_count,
    shares: hasCountValue(detailData.shareCount, detailData.shares, detailData.share_count)
      ? detailData.shareCount ?? detailData.shares ?? detailData.share_count
      : fallbackData.shareCount ?? fallbackData.shares ?? fallbackData.share_count,
    viewCount: hasCountValue(detailData.viewCount, detailData.views, detailData.view_count)
      ? detailData.viewCount ?? detailData.views ?? detailData.view_count
      : fallbackData.viewCount ?? fallbackData.views ?? fallbackData.view_count,
    views: hasCountValue(detailData.viewCount, detailData.views, detailData.view_count)
      ? detailData.viewCount ?? detailData.views ?? detailData.view_count
      : fallbackData.viewCount ?? fallbackData.views ?? fallbackData.view_count,
    liked: fallbackHasLikedState
      ? normalizeFlag(fallbackData.liked, fallbackData.isLiked)
      : normalizeFlag(detailData.liked, detailData.isLiked, fallbackData.liked, fallbackData.isLiked),
    disliked: fallbackHasDislikedState
      ? normalizeFlag(fallbackData.disliked, fallbackData.isDisliked)
      : normalizeFlag(detailData.disliked, detailData.isDisliked, fallbackData.disliked, fallbackData.isDisliked),
    collected: fallbackHasCollectedState
      ? normalizeFlag(fallbackData.collected, fallbackData.isCollected, fallbackData.bookmarked, fallbackData.isBookmarked)
      : normalizeFlag(detailData.collected, detailData.isCollected, detailData.bookmarked, detailData.isBookmarked, fallbackData.collected, fallbackData.isCollected, fallbackData.bookmarked, fallbackData.isBookmarked),
    __likeCountResolved: preferFallbackLike ? true : hasCountValue(detailData.likeCount, detailData.likes, detailData.like_count),
    __dislikeCountResolved: preferFallbackDislike ? true : hasCountValue(detailData.dislikeCount, detailData.dislikes, detailData.dislike_count),
    __collectCountResolved: preferFallbackCollect ? true : hasCountValue(detailData.collectCount, detailData.bookmarkCount, detailData.bookmarks, detailData.collect_count),
  };

  return normalizeQuestionDetail(mergedDetail, fallbackSeed);
};
const getResolvedInteractionDisplayCount = (baseCount, serverState, localState, isResolved = false) => {
  const normalizedBaseCount = Number(baseCount) || 0;
  const resolvedBaseCount = !!serverState && !isResolved ? normalizedBaseCount + 1 : normalizedBaseCount;
  if (localState === undefined) {
    return !!serverState ? Math.max(resolvedBaseCount, 1) : resolvedBaseCount;
  }
  if (!!localState === !!serverState) {
    return !!localState ? Math.max(resolvedBaseCount, 1) : resolvedBaseCount;
  }
  const nextDisplayCount = Math.max(resolvedBaseCount + (localState ? 1 : -1), 0);
  return !!localState ? Math.max(nextDisplayCount, 1) : nextDisplayCount;
};
const buildSupplementMutationResult = (currentSupplement = {}, responseData, fallbackValues = {}) => {
  const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
  const liked = typeof responseData === 'boolean' && fallbackValues.liked !== undefined ? responseData : payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentSupplement.liked ?? false;
  const disliked = typeof responseData === 'boolean' && fallbackValues.disliked !== undefined ? responseData : payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentSupplement.disliked ?? false;
  const collected = typeof responseData === 'boolean' && fallbackValues.collected !== undefined ? responseData : payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentSupplement.collected ?? false;
  const likeCount = Number(fallbackValues.likeCount ?? payload.likeCount ?? payload.likes ?? currentSupplement.likeCount ?? currentSupplement.likes) || 0;
  const dislikeCount = Number(fallbackValues.dislikeCount ?? payload.dislikeCount ?? payload.dislikes ?? currentSupplement.dislikeCount ?? currentSupplement.dislikes) || 0;
  const collectCount = Number(fallbackValues.collectCount ?? payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? currentSupplement.collectCount ?? currentSupplement.bookmarkCount ?? currentSupplement.bookmarks) || 0;

  return normalizeQuestionDetail({
    ...currentSupplement,
    ...payload,
    liked: !!liked,
    disliked: !!disliked,
    collected: !!collected,
    likeCount,
    likes: likeCount,
    dislikeCount,
    dislikes: dislikeCount,
    collectCount,
    bookmarkCount: collectCount,
    bookmarks: collectCount,
    __likeCountResolved: fallbackValues.likeCount !== undefined ? true : currentSupplement.__likeCountResolved,
    __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentSupplement.__dislikeCountResolved,
    __collectCountResolved: fallbackValues.collectCount !== undefined ? true : currentSupplement.__collectCountResolved,
  }, 'supplement-mutation');
};
const normalizeAnswerItem = answer => {
  if (!answer || typeof answer !== 'object') {
    return null;
  }

  const hasLikeCountField = hasCountValue(answer.likeCount, answer.like_count, answer.likes);
  const hasDislikeCountField = hasCountValue(answer.dislikeCount, answer.dislike_count, answer.dislikes);
  const hasCollectCountField = hasCountValue(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks);
  const normalizedId = answer.answerId ?? answer.answer_id ?? answer.id ?? null;
  const normalizedQuestionId = answer.questionId ?? answer.question_id ?? answer.question?.id ?? null;
  const normalizedAuthorName =
    answer.userName ??
    answer.userNickname ??
    answer.authorNickName ??
    answer.author ??
    '鍖垮悕鐢ㄦ埛';
  const normalizedAvatar =
    answer.userAvatar ??
    answer.authorAvatar ??
    answer.avatar ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=answer${normalizedId ?? 'unknown'}`;
  const normalizedCreateTime =
    answer.createTime ??
    answer.createdAt ??
    answer.updateTime ??
    answer.updatedAt ??
    null;
  const normalizedContent =
    answer.content ??
    answer.answerContent ??
    answer.description ??
    answer.text ??
    '';
  const normalizedTitle =
    answer.title ??
    answer.userTitle ??
    answer.authorTitle ??
    answer.userDescription ??
    answer.descriptionText ??
    '';
  const normalizedCollected = normalizeFlag(answer.collected, answer.isCollected, answer.bookmarked, answer.isBookmarked);
  const normalizedLiked = normalizeFlag(answer.liked, answer.isLiked);
  const normalizedDisliked = normalizeFlag(answer.disliked, answer.isDisliked);

  return {
    ...answer,
    id: normalizedId,
    answerId: normalizedId,
    answer_id: answer.answer_id ?? normalizedId,
    questionId: normalizedQuestionId,
    question_id: answer.question_id ?? normalizedQuestionId,
    userName: normalizedAuthorName,
    userNickname: answer.userNickname ?? answer.authorNickName ?? normalizedAuthorName,
    author: answer.author ?? answer.authorNickName ?? normalizedAuthorName,
    userAvatar: normalizedAvatar,
    authorAvatar: normalizedAvatar,
    avatar: normalizedAvatar,
    title: normalizedTitle,
    content: normalizedContent,
    time: normalizeDisplayTime(answer.time, normalizedCreateTime),
    createTime: normalizedCreateTime,
    verified: normalizeFlag(answer.verified, answer.isVerified, answer.userVerified),
    liked: normalizedLiked,
    isLiked: normalizedLiked,
    disliked: normalizedDisliked,
    isDisliked: normalizedDisliked,
    collected: normalizedCollected,
    isCollected: normalizedCollected,
    bookmarked: normalizedCollected,
    isBookmarked: normalizedCollected,
    likeCount: normalizeCount(answer.likeCount, answer.like_count, answer.likes),
    likes: normalizeCount(answer.likeCount, answer.like_count, answer.likes),
    dislikeCount: normalizeCount(answer.dislikeCount, answer.dislike_count, answer.dislikes),
    dislikes: normalizeCount(answer.dislikeCount, answer.dislike_count, answer.dislikes),
    commentCount: normalizeCount(answer.commentCount, answer.comment_count, answer.comments),
    comments: normalizeCount(answer.commentCount, answer.comment_count, answer.comments),
    shareCount: normalizeCount(answer.shareCount, answer.share_count, answer.shares),
    shares: normalizeCount(answer.shareCount, answer.share_count, answer.shares),
    collectCount: normalizeCount(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks),
    bookmarkCount: normalizeCount(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks),
    bookmark_count: normalizeCount(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks),
    bookmarks: normalizeCount(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks),
    __likeCountResolved: answer.__likeCountResolved ?? hasLikeCountField,
    __dislikeCountResolved: answer.__dislikeCountResolved ?? hasDislikeCountField,
    __collectCountResolved: answer.__collectCountResolved ?? hasCollectCountField,
  };
};
const normalizeAnswerRows = (rows = []) => rows.map(normalizeAnswerItem).filter(Boolean);
const extractCommentRows = response => response?.data?.rows ?? response?.data?.list ?? response?.data?.records ?? [];
const extractCommentTotal = (response, fallback = 0) => response?.data?.total ?? response?.data?.count ?? response?.data?.recordsTotal ?? fallback;
const normalizeCommentItem = (comment, defaults = {}) => {
  if (!comment || typeof comment !== 'object') {
    return null;
  }

  const normalizedId = comment.commentId ?? comment.comment_id ?? comment.id ?? null;
  const normalizedAuthor =
    pickDisplayText(
      comment.userName,
      comment.userNickname,
      comment.authorNickName,
      comment.author,
      comment.nickName,
      comment.nickname
    ) || '鍖垮悕鐢ㄦ埛';
  const normalizedAvatar =
    pickDisplayText(
      comment.userAvatar,
      comment.authorAvatar,
      comment.avatar,
      comment.headImg,
      comment.headImage
    ) || `https://api.dicebear.com/7.x/avataaars/svg?seed=comment${normalizedId ?? 'unknown'}`;
  const normalizedContent =
    comment.content ??
    comment.commentContent ??
    comment.contentText ??
    comment.commentText ??
    comment.text ??
    '';
  const normalizedCreateTime =
    comment.createTime ??
    comment.createdAt ??
    comment.gmtCreate ??
    comment.publishTime ??
    null;
  const normalizedLikeCount = normalizeCount(comment.likeCount, comment.likes);
  const normalizedDislikeCount = normalizeCount(comment.dislikeCount, comment.dislikes);
  const normalizedCollectCount = normalizeCount(comment.collectCount, comment.bookmarkCount, comment.bookmarks);
  const normalizedReplyCount = normalizeCount(comment.replyCount, comment.replies, comment.childCount, comment.childrenCount);
  const normalizedShareCount = normalizeCount(comment.shareCount, comment.shares);

  return {
    ...comment,
    id: normalizedId,
    commentId: normalizedId,
    targetType: Number(comment.targetType ?? comment.target_type ?? defaults.targetType ?? 3) || 3,
    targetId: Number(comment.targetId ?? comment.target_id ?? defaults.targetId ?? 0) || 0,
    parentId: Number(comment.parentId ?? comment.parent_id ?? defaults.parentId ?? 0) || 0,
    author: normalizedAuthor,
    userName: normalizedAuthor,
    userNickname: comment.userNickname ?? comment.authorNickName ?? normalizedAuthor,
    avatar: normalizedAvatar,
    userAvatar: normalizedAvatar,
    content: normalizedContent,
    commentContent: comment.commentContent ?? normalizedContent,
    likeCount: normalizedLikeCount,
    likes: normalizedLikeCount,
    dislikeCount: normalizedDislikeCount,
    dislikes: normalizedDislikeCount,
    collectCount: normalizedCollectCount,
    bookmarkCount: normalizedCollectCount,
    bookmarks: normalizedCollectCount,
    replyCount: normalizedReplyCount,
    replies: normalizedReplyCount,
    shareCount: normalizedShareCount,
    shares: normalizedShareCount,
    liked: normalizeFlag(comment.liked, comment.isLiked),
    disliked: normalizeFlag(comment.disliked, comment.isDisliked),
    collected: normalizeFlag(comment.collected, comment.isCollected, comment.bookmarked, comment.isBookmarked),
    createTime: normalizedCreateTime,
    time: normalizeDisplayTime(comment.time, normalizedCreateTime),
    __likeCountResolved: comment.__likeCountResolved ?? hasCountValue(comment.likeCount, comment.likes),
    __dislikeCountResolved: comment.__dislikeCountResolved ?? hasCountValue(comment.dislikeCount, comment.dislikes),
    __collectCountResolved: comment.__collectCountResolved ?? hasCountValue(comment.collectCount, comment.bookmarkCount, comment.bookmarks),
  };
};
const normalizeComments = (rows = [], defaults = {}) => rows.map(row => normalizeCommentItem(row, defaults)).filter(Boolean);
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
    const structuralParentId = normalizedRootId && directParentId === normalizedRootId && replyTargetId && replyTargetId !== currentId
      ? replyTargetId
      : directParentId;

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
const getAnswerIdentityKey = answer => {
  if (!answer || typeof answer !== 'object') {
    return '';
  }

  const normalized = normalizeAnswerItem(answer) || answer;
  const primaryId = normalized.id ?? normalized.answerId ?? normalized.answer_id;
  if (primaryId !== undefined && primaryId !== null && primaryId !== '') {
    return `id:${primaryId}`;
  }

  const questionId = normalized.questionId ?? normalized.question_id ?? 'unknown-question';
  const content = String(normalized.content ?? '').trim();
  const author = String(normalized.userName ?? normalized.userNickname ?? normalized.author ?? '').trim();
  const createTime = String(normalized.createTime ?? normalized.time ?? '').trim();
  return `fallback:${questionId}:${author}:${content}:${createTime}`;
};
const mergeAnswerLists = (...answerGroups) => {
  const merged = [];
  const seenKeys = new Set();

  answerGroups.flat().forEach(answer => {
    const normalized = normalizeAnswerItem(answer);
    if (!normalized) {
      return;
    }

    const identityKey = getAnswerIdentityKey(normalized);
    if (seenKeys.has(identityKey)) {
      return;
    }

    seenKeys.add(identityKey);
    merged.push(normalized);
  });

  return merged;
};
const buildPendingAnswerItem = ({ responseData, questionId, content, imageUrls, selectedIdentity, selectedTeams }) => {
  const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData)
    ? responseData
    : {};
  const fallbackId = payload.id ?? payload.answerId ?? payload.answer_id ?? `pending-${Date.now()}`;
  const fallbackTitle = selectedIdentity === 'team'
    ? '鍥㈤槦韬唤'
    : '涓汉韬唤';

  return normalizeAnswerItem({
    ...payload,
    id: fallbackId,
    answerId: payload.answerId ?? payload.answer_id ?? payload.id ?? fallbackId,
    answer_id: payload.answer_id ?? payload.answerId ?? payload.id ?? fallbackId,
    questionId: payload.questionId ?? payload.question_id ?? questionId,
    question_id: payload.question_id ?? payload.questionId ?? questionId,
    content: payload.content ?? payload.answerContent ?? content,
    answerContent: payload.answerContent ?? payload.content ?? content,
    images: payload.images ?? imageUrls,
    imageUrls: payload.imageUrls ?? imageUrls,
    title: payload.title ?? payload.userTitle ?? fallbackTitle,
    userTitle: payload.userTitle ?? payload.title ?? fallbackTitle,
    userName: payload.userName ?? payload.userNickname ?? payload.author ?? (selectedIdentity === 'team' ? '团队回答' : '我'),
    userNickname: payload.userNickname ?? payload.userName ?? payload.author ?? (selectedIdentity === 'team' ? '团队回答' : '我'),
    author: payload.author ?? payload.userName ?? payload.userNickname ?? (selectedIdentity === 'team' ? '团队回答' : '我'),
    createTime: payload.createTime ?? payload.createdAt ?? new Date().toISOString(),
    liked: payload.liked ?? false,
    disliked: payload.disliked ?? false,
    collected: payload.collected ?? false,
    likeCount: payload.likeCount ?? payload.likes ?? 0,
    dislikeCount: payload.dislikeCount ?? payload.dislikes ?? 0,
    collectCount: payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? 0,
    commentCount: payload.commentCount ?? payload.comments ?? 0,
    shareCount: payload.shareCount ?? payload.shares ?? 0,
    verified: payload.verified ?? false,
    pendingLocalPublish: true,
    pendingTeamIds: selectedTeams,
  });
};
export default function SupplementDetailScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const openPublicProfile = (target, options = {}) => navigateToPublicProfile(navigation, target, options);
  const [activeTab, setActiveTab] = useState(TAB_KEYS.ANSWERS);
  const [sortFilter, setSortFilter] = useState(SORT_KEYS.FEATURED);
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState(undefined);
  const [bookmarked, setBookmarked] = useState(undefined);
  const [answerLiked, setAnswerLiked] = useState({});
  const [answerBookmarked, setAnswerBookmarked] = useState({});
  const [commentLiked, setCommentLiked] = useState({});
  const [commentDisliked, setCommentDisliked] = useState({});
  const [commentBookmarked, setCommentBookmarked] = useState({});
  const [commentListState, setCommentListState] = useState(INITIAL_COMMENT_LIST_STATE);
  const [commentListRefreshKey, setCommentListRefreshKey] = useState(0);
  const [commentRepliesMap, setCommentRepliesMap] = useState({});
  const [expandedReplyChildren, setExpandedReplyChildren] = useState({});
  const [commentLikeLoading, setCommentLikeLoading] = useState({});
  const [commentCollectLoading, setCommentCollectLoading] = useState({});
  const [commentDislikeLoading, setCommentDislikeLoading] = useState({});
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImages, setAnswerImages] = useState([]);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerIdentity, setAnswerIdentity] = useState('personal');
  const [answerSelectedTeams, setAnswerSelectedTeams] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareData, setCurrentShareData] = useState(null);
  const [commentComposerTarget, setCommentComposerTarget] = useState(INITIAL_COMMENT_COMPOSER_TARGET);
  const [showCommentReplyModal, setShowCommentReplyModal] = useState(false);
  const [currentCommentId, setCurrentCommentId] = useState(null);
  const [currentAnswerId, setCurrentAnswerId] = useState(null);
  const [showAnswerCommentModal, setShowAnswerCommentModal] = useState(false);
  const [answerCommentText, setAnswerCommentText] = useState('');
  const [inviteTab, setInviteTab] = useState(INVITE_TAB_KEYS.LOCAL);
  const [searchLocalUser, setSearchLocalUser] = useState('');
  const [searchTwitterUser, setSearchTwitterUser] = useState('');
  const [searchFacebookUser, setSearchFacebookUser] = useState('');
  const originalQuestion = {
    title: '如何在三个月内从零基础学会 Python，有没有系统的学习路线推荐？',
    author: '张三丰',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    content: '本人是一名文科生，之前完全没有接触过编程，最近想转行做数据分析，听说 Python 是必备技能。',
    time: '2小时前',
    location: '北京'
  };
  const supplementQuestion = route?.params?.supplement || {
    id: 1,
    author: '学习者小李',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supp1',
    location: '上海',
    content: '请问学 Python 需要先学什么数学基础吗？我高中数学不太好，会不会影响学习？',
    likes: 45,
    shares: 12,
    bookmarks: 23,
    comments: 8,
    time: '1小时前'
  };
  const routeSupplement = React.useMemo(() => normalizeQuestionDetail(route?.params?.supplement, 'route-supplement'), [route?.params?.supplement]);
  const routeOriginalQuestion = React.useMemo(() => buildOriginalQuestionSummary(route?.params?.originalQuestion), [route?.params?.originalQuestion]);
  const supplementId = route?.params?.supplement?.id ?? route?.params?.id ?? supplementQuestion?.id ?? null;
  const [supplementDetail, setSupplementDetail] = useState(routeSupplement);
  const [originalQuestionDetail, setOriginalQuestionDetail] = useState(routeOriginalQuestion);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [answerListState, setAnswerListState] = useState({
    list: [],
    total: 0,
    loading: false,
    loaded: false,
    error: ''
  });
  const [pendingPublishedAnswers, setPendingPublishedAnswers] = useState([]);
  const [interactionLoading, setInteractionLoading] = useState({
    like: false,
    collect: false,
    dislike: false
  });

  React.useEffect(() => {
    if (routeSupplement) {
      setSupplementDetail(routeSupplement);
      setLiked(prev => ({
        ...prev,
        main: !!routeSupplement.liked
      }));
      setDisliked(!!routeSupplement.disliked);
      setBookmarked(!!routeSupplement.collected);
    }

    if (routeOriginalQuestion) {
      setOriginalQuestionDetail(routeOriginalQuestion);
    }
  }, [routeSupplement, routeOriginalQuestion]);

  React.useEffect(() => {
    let cancelled = false;

    const loadSupplementDetail = async () => {
      if (!supplementId) {
        setDetailError('缺少补充问题ID');
        return;
      }

      try {
        setDetailLoading(true);
        setDetailError('');

        const detailResponse = await questionApi.getQuestionDetail(supplementId);
        const normalizedDetail = mergeQuestionDetailWithFallback(
          detailResponse?.data,
          routeSupplement ?? supplementQuestion,
          'supplement-detail'
        );

        if (!normalizedDetail || cancelled) {
          return;
        }

        setSupplementDetail(normalizedDetail);
        setLiked(prev => ({
          ...prev,
          main: !!normalizedDetail.liked
        }));
        setDisliked(!!normalizedDetail.disliked);
        setBookmarked(!!normalizedDetail.collected);

        const embeddedOriginalQuestion = buildOriginalQuestionSummary(extractOriginalQuestionCandidate(detailResponse?.data));
        if (embeddedOriginalQuestion) {
          setOriginalQuestionDetail(embeddedOriginalQuestion);
        }

        const possibleParentQuestionId =
          normalizedDetail.parentQuestionId ??
          route?.params?.parentQuestionId ??
          route?.params?.originalQuestion?.id ??
          null;

        if (possibleParentQuestionId && String(possibleParentQuestionId) !== String(normalizedDetail.id)) {
          try {
            const parentResponse = await questionApi.getQuestionDetail(possibleParentQuestionId);
            const parentQuestion = buildOriginalQuestionSummary(parentResponse?.data);
            if (!cancelled && parentQuestion) {
              setOriginalQuestionDetail(parentQuestion);
            }
          } catch (parentError) {
            console.warn('鑾峰彇鍘熼棶棰樿鎯呭け璐?', parentError);
          }
        }
      } catch (error) {
        console.error('鑾峰彇琛ュ厖闂璇︽儏澶辫触:', error);
        if (!cancelled) {
          setDetailError('鑾峰彇琛ュ厖闂璇︽儏澶辫触');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    loadSupplementDetail();

    return () => {
      cancelled = true;
    };
  }, [supplementId, route?.params?.parentQuestionId, route?.params?.originalQuestion?.id]);
  React.useEffect(() => {
    let cancelled = false;

    const loadSupplementAnswers = async () => {
      if (activeTab !== TAB_KEYS.ANSWERS) {
        return;
      }

      if (!supplementAnswerQuestionId) {
        setAnswerListState(prev => ({
          ...prev,
          list: [],
          total: 0,
          loaded: true,
          loading: false,
          error: '缂哄皯鍥炵瓟鍒楄〃闂ID'
        }));
        return;
      }

      try {
        setAnswerListState(prev => ({
          ...prev,
          loading: true,
          error: ''
        }));

        const response = await answerApi.getAnswers(supplementAnswerQuestionId, {
          sortBy: answerSortBy,
          pageNum: 1,
          pageSize: 20
        });

        if (cancelled) {
          return;
        }

        if (response?.code === 200 && response?.data) {
          const rows = response.data.rows ?? response.data.list ?? [];
          const normalizedRows = normalizeAnswerRows(rows);
          const mergedRows = answerSortBy === 'newest'
            ? mergeAnswerLists(pendingPublishedAnswers, normalizedRows)
            : normalizedRows;
          setAnswerListState({
            list: mergedRows,
            total: Math.max(Number(response.data.total ?? normalizedRows.length) || 0, mergedRows.length),
            loading: false,
            loaded: true,
            error: ''
          });
          return;
        }

        const fallbackRows = answerSortBy === 'newest' ? pendingPublishedAnswers : [];
        setAnswerListState({
          list: fallbackRows,
          total: fallbackRows.length,
          loading: false,
          loaded: true,
          error: response?.msg || '鑾峰彇鍥炵瓟鍒楄〃澶辫触'
        });
      } catch (error) {
        console.error('鑾峰彇琛ュ厖闂璇︽儏椤靛洖绛斿垪琛ㄥけ璐?', error);
        if (!cancelled) {
          const fallbackRows = answerSortBy === 'newest' ? pendingPublishedAnswers : [];
          setAnswerListState({
            list: fallbackRows,
            total: fallbackRows.length,
            loading: false,
            loaded: true,
            error: '鑾峰彇鍥炵瓟鍒楄〃澶辫触'
          });
        }
      }
    };

    loadSupplementAnswers();

    return () => {
      cancelled = true;
    };
  }, [activeTab, answerSortBy, supplementAnswerQuestionId, pendingPublishedAnswers]);
  const syncCommentInteractionStates = (commentsToSync = []) => {
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

    setCommentLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setCommentDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
    setCommentBookmarked(prev => ({
      ...prev,
      ...collectedState
    }));
  };
  const findCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return commentListState.list.find(comment => String(comment.id) === String(commentId))
      || Object.values(commentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId))
      || null;
  };
  const getCommentLikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(
    comment?.likeCount ?? comment?.likes ?? 0,
    !!comment?.liked,
    localState,
    comment?.__likeCountResolved
  );
  const getCommentDislikeDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(
    comment?.dislikeCount ?? comment?.dislikes ?? 0,
    !!comment?.disliked,
    localState,
    comment?.__dislikeCountResolved
  );
  const getCommentCollectDisplayCount = (comment, localState) => getResolvedInteractionDisplayCount(
    comment?.collectCount ?? comment?.bookmarkCount ?? comment?.bookmarks ?? 0,
    !!comment?.collected,
    localState,
    comment?.__collectCountResolved
  );
  const getCommentReplyDisplayCount = comment => {
    const baseCount = normalizeCount(
      comment?.replyCount,
      comment?.replies,
      comment?.childCount,
      comment?.childrenCount
    );
    const loadedTotal = normalizeCount(commentRepliesMap[comment?.id]?.total);
    return Math.max(baseCount, loadedTotal);
  };
  const buildCommentFromMutationResponse = (currentComment = {}, responseData, fallbackValues = {}) => {
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
    }, {
      targetType: 3,
      targetId: currentComment.targetId ?? supplementId,
      parentId: currentComment.parentId ?? 0
    });
  };
  const updateCommentStates = (commentId, updater) => {
    if (!commentId) {
      return;
    }

    setCommentListState(prevState => {
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
          targetType: 3,
          targetId: comment.targetId ?? supplementId,
          parentId: comment.parentId ?? 0
        });
      });

      return changed ? {
        ...prevState,
        list: nextList
      } : prevState;
    });
    setCommentRepliesMap(prevMap => {
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
            targetType: 3,
            targetId: comment.targetId ?? supplementId,
            parentId: comment.parentId ?? 0
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
  const buildCommentReplyTarget = (comment, fallbackTarget = {}) => {
    if (!comment || typeof comment !== 'object') {
      return {
        ...INITIAL_COMMENT_COMPOSER_TARGET,
        targetId: fallbackTarget.targetId ?? supplementId ?? null
      };
    }

    const resolvedCommentId = Number(comment.id ?? comment.commentId ?? 0) || 0;
    const replyToUserName = comment.userName ?? comment.userNickname ?? comment.author ?? '';
    return {
      targetId: Number(fallbackTarget.targetId ?? comment.targetId ?? supplementId ?? 0) || null,
      parentId: resolvedCommentId,
      replyToCommentId: resolvedCommentId,
      replyToUserId: normalizeEntityId(comment.userId ?? comment.user_id),
      replyToUserName,
      threadRootId: Number(fallbackTarget.threadRootId ?? getCommentThreadRootId(resolvedCommentId) ?? resolvedCommentId) || resolvedCommentId,
      originalComment: normalizeCommentItem(comment, {
        targetType: 3,
        targetId: fallbackTarget.targetId ?? comment.targetId ?? supplementId ?? null,
        parentId: resolvedCommentId
      })
    };
  };
  const getCommentThreadRootId = commentId => {
    if (!commentId) {
      return null;
    }

    let currentComment = findCommentById(commentId);
    let safetyCount = 0;

    while (currentComment && Number(currentComment.parentId ?? 0) > 0 && safetyCount < 50) {
      const parentComment = findCommentById(currentComment.parentId);
      if (!parentComment || String(parentComment.id) === String(currentComment.id)) {
        break;
      }
      currentComment = parentComment;
      safetyCount += 1;
    }

    return currentComment?.id ?? commentId;
  };
  const openCommentComposer = (target = {}) => {
    setCommentComposerTarget({
      targetId: target?.targetId ?? supplementId ?? null,
      parentId: Number(target?.parentId ?? 0) || 0,
      replyToCommentId: Number(target?.replyToCommentId ?? 0) || 0,
      replyToUserId: normalizeEntityId(target?.replyToUserId),
      replyToUserName: target?.replyToUserName ?? '',
      threadRootId: target?.threadRootId !== undefined && target?.threadRootId !== null ? Number(target.threadRootId) || null : null,
      originalComment: target?.originalComment ? normalizeCommentItem(target.originalComment, {
        targetType: 3,
        targetId: target?.targetId ?? supplementId ?? null,
        parentId: target?.parentId ?? 0
      }) : null
    });
    setShowCommentModal(true);
  };
  const closeCommentComposer = () => {
    const threadRootId = Number(commentComposerTarget.threadRootId ?? 0) || null;
    const shouldRestoreReplyModal = threadRootId && commentComposerTarget.parentId > 0;
    setShowCommentModal(false);
    setCommentComposerTarget(INITIAL_COMMENT_COMPOSER_TARGET);
    if (shouldRestoreReplyModal) {
      setCurrentCommentId(threadRootId);
      setShowCommentReplyModal(true);
    }
  };
  const loadCommentReplies = async parentCommentId => {
    if (!supplementId || !parentCommentId) {
      return;
    }

    setCommentRepliesMap(prevMap => ({
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
              targetType: 3,
              targetId: Number(supplementId),
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });

            if (!(response?.code === 200 && response?.data)) {
              break;
            }

            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetType: 3,
              targetId: Number(supplementId)
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

        await traverseChildren(parentCommentId);
        return collectedReplies;
      };

      const replies = await fetchAllDescendantReplies(parentCommentId);
      syncCommentInteractionStates(replies);
      const total = replies.length;
      updateCommentStates(parentCommentId, previousComment => ({
        ...previousComment,
        replyCount: total,
        replies: total
      }));
      setCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          list: replies,
          total,
          loaded: true,
          loading: false
        }
      }));
    } catch (error) {
      console.error('获取补充问题评论回复失败:', error);
      setCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          ...(prevMap[parentCommentId] || {}),
          list: [],
          total: 0,
          loaded: true,
          loading: false
        }
      }));
      showToast('加载回复失败', 'error');
    }
  };
  const renderCommentReplyCard = (reply, options = {}) => {
    const beforeOpenReply = typeof options.beforeOpenReply === 'function' ? options.beforeOpenReply : () => {};
    const beforeReport = typeof options.beforeReport === 'function' ? options.beforeReport : () => {};
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    const isLiked = commentLiked[reply.id] ?? reply.liked;
    const isCollected = commentBookmarked[reply.id] ?? reply.collected;
    const isDisliked = commentDisliked[reply.id] ?? reply.disliked;

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
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentLike(reply.id)} disabled={commentLikeLoading[reply.id]}>
            <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={isLiked ? "#ef4444" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isLiked && { color: '#ef4444' }]}>{getCommentLikeDisplayCount(reply, commentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeOpenReply();
          openCommentComposer(buildCommentReplyTarget(reply, {
            targetId: supplementId
          }));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => showToast(t('screens.supplementDetail.alerts.forwardFunction'), 'info')}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{formatNumber(reply.shares || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentCollect(reply.id)} disabled={commentCollectLoading[reply.id]}>
            <Ionicons name={isCollected ? "star" : "star-outline"} size={12} color={isCollected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isCollected && { color: '#f59e0b' }]}>{getCommentCollectDisplayCount(reply, commentBookmarked[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentDislike(reply.id)} disabled={commentDislikeLoading[reply.id]}>
            <Ionicons name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={isDisliked ? "#6b7280" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isDisliked && { color: '#6b7280' }]}>{getCommentDislikeDisplayCount(reply, commentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeReport();
          handleCommentReport(reply.id);
        }}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderCommentReplyTreeNodes = (nodes = [], level = 0, options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedReplyChildren[reply.id] !== undefined ? expandedReplyChildren[reply.id] : true;

    return <View key={reply.id}>
        {renderCommentReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderCommentReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });
  React.useEffect(() => {
    let cancelled = false;
    const resolvedCommentSortBy = sortFilter === SORT_KEYS.LATEST ? 'newest' : 'likes';

    const loadSupplementComments = async () => {
      if (activeTab !== TAB_KEYS.COMMENTS) {
        return;
      }

      if (!supplementId) {
        setCommentListState({
          list: [],
          total: 0,
          loading: false,
          loaded: true,
          error: '缺少评论列表目标ID'
        });
        return;
      }

      try {
        setCommentListState(prev => ({
          ...prev,
          loading: true,
          error: ''
        }));

        const response = await commentApi.getComments({
          targetType: 3,
          targetId: Number(supplementId),
          parentId: 0,
          sortBy: resolvedCommentSortBy
        });

        if (cancelled) {
          return;
        }

        if (response?.code === 200 && response?.data) {
          const rows = extractCommentRows(response);
          const normalizedRows = normalizeComments(rows, {
            targetType: 3,
            targetId: Number(supplementId),
            parentId: 0
          });
          const total = Math.max(extractCommentTotal(response, normalizedRows.length), normalizedRows.length);
          syncCommentInteractionStates(normalizedRows);
          setCommentListState({
            list: normalizedRows,
            total,
            loading: false,
            loaded: true,
            error: ''
          });
          return;
        }

        setCommentListState({
          list: [],
          total: 0,
          loading: false,
          loaded: true,
          error: response?.msg || '获取评论列表失败'
        });
      } catch (error) {
        console.error('获取补充问题评论列表失败:', error);
        if (!cancelled) {
          setCommentListState({
            list: [],
            total: 0,
            loading: false,
            loaded: true,
            error: '获取评论列表失败'
          });
        }
      }
    };

    loadSupplementComments();

    return () => {
      cancelled = true;
    };
  }, [activeTab, sortFilter, supplementId, commentListRefreshKey]);
  React.useEffect(() => {
    if (!showCommentReplyModal || !currentCommentId || commentRepliesMap[currentCommentId]?.loaded || commentRepliesMap[currentCommentId]?.loading) {
      return;
    }
    loadCommentReplies(currentCommentId);
  }, [showCommentReplyModal, currentCommentId, commentRepliesMap]);
  React.useEffect(() => {
    if (!showCommentReplyModal) {
      setExpandedReplyChildren({});
    }
  }, [showCommentReplyModal]);

  const resolvedSupplementQuestion = supplementDetail || routeSupplement || supplementQuestion;
  const resolvedOriginalQuestion = originalQuestionDetail || routeOriginalQuestion || originalQuestion;
  const parentQuestionId = Number(route?.params?.parentQuestionId ?? resolvedOriginalQuestion?.id ?? supplementQuestion?.questionId ?? 0) || null;
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
  const buildSupplementSharePayload = () => ({
    title: resolvedSupplementQuestion?.title || resolvedOriginalQuestion?.title || '',
    content: resolvedSupplementQuestion?.content || '',
    type: 'sharesupplement',
    qid: parentQuestionId,
    sid: Number(supplementId) || null
  });
  const buildCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    return {
      title: resolvedSupplementQuestion?.title || resolvedOriginalQuestion?.title || '',
      content: comment?.content || resolvedSupplementQuestion?.content || '',
      type: 'sharecomment',
      qid: parentQuestionId,
      sid: Number(supplementId) || null,
      cid: commentId,
      rootCid
    };
  };
  const handleShare = (platform, sharePayload) => {
    console.log('Supplement detail shared via:', platform, sharePayload);
  };
  const supplementAnswerQuestionId =
    resolvedSupplementQuestion?.id ??
    route?.params?.supplement?.id ??
    route?.params?.id ??
    supplementQuestion?.id ??
    null;
  const answerSortBy = sortFilter === SORT_KEYS.LATEST ? 'newest' : 'featured';
  const supplementDisplayAuthor =
    routeSupplement?.author ||
    routeSupplement?.userName ||
    routeSupplement?.userNickname ||
    resolvedSupplementQuestion?.author ||
    resolvedSupplementQuestion?.userName ||
    resolvedSupplementQuestion?.userNickname ||
    '鍖垮悕鐢ㄦ埛';
  const supplementDisplayAvatar =
    routeSupplement?.avatar ||
    routeSupplement?.userAvatar ||
    routeSupplement?.authorAvatar ||
    resolvedSupplementQuestion?.avatar ||
    resolvedSupplementQuestion?.userAvatar ||
    resolvedSupplementQuestion?.authorAvatar ||
    DEFAULT_AVATAR;
  const supplementDisplayLocation =
    routeSupplement?.location ||
    resolvedSupplementQuestion?.location ||
    '鏈煡';
  const supplementDisplayTime =
    routeSupplement?.time ||
    resolvedSupplementQuestion?.time ||
    '鍒氬垰';
  const supplementDisplayContent =
    routeSupplement?.content ||
    routeSupplement?.description ||
    routeSupplement?.title ||
    resolvedSupplementQuestion?.content ||
    resolvedSupplementQuestion?.description ||
    resolvedSupplementQuestion?.title ||
    '';
  const mainLiked = liked.main ?? resolvedSupplementQuestion?.liked ?? false;
  const mainCollected = bookmarked ?? resolvedSupplementQuestion?.collected ?? false;
  const mainDisliked = disliked ?? resolvedSupplementQuestion?.disliked ?? false;
  const supplementLikeDisplayCount = getResolvedInteractionDisplayCount(
    resolvedSupplementQuestion?.likeCount ?? resolvedSupplementQuestion?.likes,
    resolvedSupplementQuestion?.liked,
    liked.main,
    resolvedSupplementQuestion?.__likeCountResolved
  );
  const supplementCollectDisplayCount = getResolvedInteractionDisplayCount(
    resolvedSupplementQuestion?.collectCount ?? resolvedSupplementQuestion?.bookmarkCount ?? resolvedSupplementQuestion?.bookmarks,
    resolvedSupplementQuestion?.collected,
    bookmarked,
    resolvedSupplementQuestion?.__collectCountResolved
  );
  const supplementDislikeDisplayCount = getResolvedInteractionDisplayCount(
    resolvedSupplementQuestion?.dislikeCount ?? resolvedSupplementQuestion?.dislikes,
    resolvedSupplementQuestion?.disliked,
    disliked,
    resolvedSupplementQuestion?.__dislikeCountResolved
  );
  const supplementAnswersList = answerListState.list;
  const supplementAnswersTotal = answerListState.loaded
    ? Math.max(normalizeCount(answerListState.total), supplementAnswersList.length)
    : 0;
  const supplementCommentsList = commentListState.list;
  const currentReplyComment = supplementCommentsList.find(comment => String(comment.id) === String(currentCommentId)) || null;
  const supplementCommentsTotal = commentListState.loaded
    ? Math.max(normalizeCount(commentListState.total), supplementCommentsList.length)
    : normalizeCount(resolvedSupplementQuestion?.commentCount, resolvedSupplementQuestion?.comments);
  const handleAnswerSortFilterChange = nextSortFilter => {
    if (nextSortFilter === sortFilter) {
      return;
    }

    const nextSortBy = activeTab === TAB_KEYS.COMMENTS
      ? (nextSortFilter === SORT_KEYS.LATEST ? 'newest' : 'likes')
      : (nextSortFilter === SORT_KEYS.LATEST ? 'newest' : 'featured');
    console.log('琛ュ厖闂璇︽儏椤靛垏鎹㈠洖绛旀帓搴?', {
      nextSortFilter,
      nextSortBy
    });
    setSortFilter(nextSortFilter);
  };
  const handleSubmitSupplementComment = async (text) => {
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    if (!normalizedText) {
      return;
    }

    const targetId = Number(commentComposerTarget?.targetId ?? supplementId ?? 0) || 0;
    const parentId = Number(commentComposerTarget?.parentId ?? 0) || 0;
    const replyToCommentId = Number(commentComposerTarget?.replyToCommentId ?? 0) || 0;
    const threadRootId = Number(commentComposerTarget?.threadRootId ?? 0) || null;

    if (!targetId) {
      showToast('补充问题ID不存在', 'error');
      return;
    }

    try {
      const payload = {
        targetType: 3,
        targetId,
        parentId,
        content: normalizedText
      };

      if (replyToCommentId) {
        payload.replyToCommentId = replyToCommentId;
      }
      if (commentComposerTarget?.replyToUserId) {
        payload.replyToUserId = commentComposerTarget.replyToUserId;
      }
      if (commentComposerTarget?.replyToUserName) {
        payload.replyToUserName = commentComposerTarget.replyToUserName;
      }

      const response = await commentApi.createComment(payload);

      if (response?.code === 200) {
        if (parentId === 0) {
          const nextCommentCount = normalizeCount(
            resolvedSupplementQuestion?.commentCount,
            resolvedSupplementQuestion?.comments
          ) + 1;

          setSupplementDetail(prevDetail => normalizeQuestionDetail({
            ...(prevDetail || resolvedSupplementQuestion || {}),
            commentCount: nextCommentCount,
            comments: nextCommentCount
          }, 'supplement-comment-created'));
        } else {
          updateCommentStates(parentId, previousComment => {
            const nextReplyCount = normalizeCount(previousComment?.replyCount, previousComment?.replies) + 1;
            return {
              ...previousComment,
              replyCount: nextReplyCount,
              replies: nextReplyCount
            };
          });

          if (threadRootId && String(threadRootId) !== String(parentId)) {
            updateCommentStates(threadRootId, previousComment => {
              const nextReplyCount = normalizeCount(previousComment?.replyCount, previousComment?.replies) + 1;
              return {
                ...previousComment,
                replyCount: nextReplyCount,
                replies: nextReplyCount
              };
            });
          }
        }

        if (parentId === 0) {
          setCommentListRefreshKey(prev => prev + 1);
        }
        setShowCommentModal(false);
        setCommentComposerTarget(INITIAL_COMMENT_COMPOSER_TARGET);

        if (parentId > 0) {
          const resolvedThreadRootId = threadRootId || getCommentThreadRootId(parentId) || parentId;
          setCurrentCommentId(resolvedThreadRootId);
          await loadCommentReplies(resolvedThreadRootId);
          setShowCommentReplyModal(true);
        }

        showToast(t('screens.supplementDetail.alerts.commentPublished'), 'success');
        return;
      }

      showToast(response?.msg || '评论发布失败', 'error');
    } catch (error) {
      console.error('发布补充问题评论失败:', error);
      showToast('评论发布失败，请稍后重试', 'error');
    }
  };
  const handleCommentLike = async commentId => {
    const comment = findCommentById(commentId);
    if (!commentId || !comment || commentLikeLoading[commentId]) {
      return;
    }

    const currentState = commentLiked[commentId] !== undefined ? commentLiked[commentId] : !!comment.liked;
    const nextState = !currentState;
    setCommentLiked(prev => ({
      ...prev,
      [commentId]: nextState
    }));

    try {
      setCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState
        ? await commentApi.likeComment(commentId)
        : await commentApi.unlikeComment(commentId);

      if (response?.code === 200) {
        showToast(nextState ? '已点赞' : '已取消点赞', 'success');
        updateCommentStates(commentId, currentComment => buildCommentFromMutationResponse(currentComment, response.data, {
          liked: nextState,
          likeCount: Math.max(getCommentLikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
        return;
      }

      setCommentLiked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题评论点赞失败:', error);
      setCommentLiked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleCommentCollect = async commentId => {
    const comment = findCommentById(commentId);
    if (!commentId || !comment || commentCollectLoading[commentId]) {
      return;
    }

    const currentState = commentBookmarked[commentId] !== undefined ? commentBookmarked[commentId] : !!comment.collected;
    const nextState = !currentState;
    setCommentBookmarked(prev => ({
      ...prev,
      [commentId]: nextState
    }));

    try {
      setCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const collectPayload = {
        targetType: 3,
        targetId: Number(comment.targetId ?? supplementId) || undefined,
        parentId: Number(comment.parentId ?? 0) || 0
      };
      const response = nextState
        ? await commentApi.collectComment(commentId, collectPayload)
        : await commentApi.uncollectComment(commentId, collectPayload);

      if (response?.code === 200) {
        showToast(nextState ? '已收藏' : '已取消收藏', 'success');
        updateCommentStates(commentId, currentComment => buildCommentFromMutationResponse(currentComment, response.data, {
          collected: nextState,
          collectCount: Math.max(getCommentCollectDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
        return;
      }

      setCommentBookmarked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题评论收藏失败:', error);
      setCommentBookmarked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleCommentDislike = async commentId => {
    const comment = findCommentById(commentId);
    if (!commentId || !comment || commentDislikeLoading[commentId]) {
      return;
    }

    const currentState = commentDisliked[commentId] !== undefined ? commentDisliked[commentId] : !!comment.disliked;
    const nextState = !currentState;
    setCommentDisliked(prev => ({
      ...prev,
      [commentId]: nextState
    }));

    try {
      setCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = nextState
        ? await commentApi.dislikeComment(commentId)
        : await commentApi.undislikeComment(commentId);

      if (response?.code === 200) {
        showToast(nextState ? '已踩' : '已取消踩', 'success');
        updateCommentStates(commentId, currentComment => buildCommentFromMutationResponse(currentComment, response.data, {
          disliked: nextState,
          dislikeCount: Math.max(getCommentDislikeDisplayCount(currentComment, currentState) + (nextState ? 1 : -1), 0)
        }));
        return;
      }

      setCommentDisliked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题评论点踩失败:', error);
      setCommentDisliked(prev => ({
        ...prev,
        [commentId]: currentState
      }));
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: false
      }));
    }
  };
  const handleCommentReport = commentId => {
    if (!commentId) {
      showToast('操作失败', 'error');
      return;
    }

    navigation.navigate('Report', {
      type: 'comment',
      targetType: 5,
      targetId: Number(commentId) || 0
    });
  };
  const syncSupplementUpdateToQuestionDetail = updatedSupplement => {
    const sourceRouteKey = route?.params?.sourceRouteKey;
    if (!sourceRouteKey || !updatedSupplement?.id) {
      return;
    }
    const interactionOnlySupplement = {
      id: updatedSupplement.id,
      supplementId: updatedSupplement.supplementId,
      supplement_id: updatedSupplement.supplement_id,
      liked: !!updatedSupplement.liked,
      disliked: !!updatedSupplement.disliked,
      collected: !!updatedSupplement.collected,
      likeCount: Number(updatedSupplement.likeCount ?? updatedSupplement.likes) || 0,
      likes: Number(updatedSupplement.likeCount ?? updatedSupplement.likes) || 0,
      dislikeCount: Number(updatedSupplement.dislikeCount ?? updatedSupplement.dislikes) || 0,
      dislikes: Number(updatedSupplement.dislikeCount ?? updatedSupplement.dislikes) || 0,
      collectCount: Number(updatedSupplement.collectCount ?? updatedSupplement.bookmarkCount ?? updatedSupplement.bookmarks) || 0,
      bookmarkCount: Number(updatedSupplement.collectCount ?? updatedSupplement.bookmarkCount ?? updatedSupplement.bookmarks) || 0,
      bookmarks: Number(updatedSupplement.collectCount ?? updatedSupplement.bookmarkCount ?? updatedSupplement.bookmarks) || 0,
      __likeCountResolved: updatedSupplement.__likeCountResolved,
      __dislikeCountResolved: updatedSupplement.__dislikeCountResolved,
      __collectCountResolved: updatedSupplement.__collectCountResolved,
    };
    navigation.dispatch({
      ...CommonActions.setParams({
        updatedSupplement: interactionOnlySupplement
      }),
      source: sourceRouteKey,
      target: navigation.getState()?.key
    });
  };
  const applySupplementInteractionUpdate = updatedSupplement => {
    const normalizedSupplement = normalizeQuestionDetail(updatedSupplement, 'supplement-detail-updated');
    if (!normalizedSupplement) {
      return;
    }
    setSupplementDetail(normalizedSupplement);
    setLiked(prev => ({
      ...prev,
      main: !!normalizedSupplement.liked
    }));
    setBookmarked(!!normalizedSupplement.collected);
    setDisliked(!!normalizedSupplement.disliked);
    syncSupplementUpdateToQuestionDetail(normalizedSupplement);
  };
  const handleSupplementLike = async () => {
    const currentSupplement = normalizeQuestionDetail(resolvedSupplementQuestion, 'supplement-like');
    const currentSupplementId = currentSupplement?.id ?? supplementId;

    if (!currentSupplementId) {
      showToast('补充问题ID不存在', 'error');
      return;
    }

    try {
      setInteractionLoading(prev => ({
        ...prev,
        like: true
      }));
      const currentLiked = liked.main ?? currentSupplement?.liked ?? false;
      const nextLiked = !currentLiked;
      const fallbackLikeCount = Math.max(supplementLikeDisplayCount + (nextLiked ? 1 : -1), 0);
      const response = currentLiked ? await questionApi.unlikeSupplement(currentSupplementId) : await questionApi.likeSupplement(currentSupplementId);

      if (response?.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          liked: nextLiked,
          likeCount: fallbackLikeCount
        });
        applySupplementInteractionUpdate(updatedSupplement);
        showToast(updatedSupplement.liked ? '已点赞' : '已取消点赞', 'success');
        return;
      }

      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题详情页点赞失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setInteractionLoading(prev => ({
        ...prev,
        like: false
      }));
    }
  };
  const handleSupplementCollect = async () => {
    const currentSupplement = normalizeQuestionDetail(resolvedSupplementQuestion, 'supplement-collect');
    const currentSupplementId = currentSupplement?.id ?? supplementId;

    if (!currentSupplementId) {
      showToast('补充问题ID不存在', 'error');
      return;
    }

    const supplementQuestionId =
      currentSupplement?.questionId ??
      currentSupplement?.parentQuestionId ??
      route?.params?.parentQuestionId ??
      null;

    if (!supplementQuestionId) {
      showToast('当前补充问题数据异常，暂时无法收藏', 'error');
      return;
    }

    try {
      setInteractionLoading(prev => ({
        ...prev,
        collect: true
      }));
      const currentCollected = bookmarked ?? currentSupplement?.collected ?? false;
      const nextCollected = !currentCollected;
      const fallbackCollectCount = Math.max(supplementCollectDisplayCount + (nextCollected ? 1 : -1), 0);
      const response = currentCollected ? await questionApi.uncollectSupplement(currentSupplementId) : await questionApi.collectSupplement(currentSupplementId);

      if (response?.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          collected: nextCollected,
          collectCount: fallbackCollectCount
        });
        applySupplementInteractionUpdate(updatedSupplement);
        showToast(updatedSupplement.collected ? '已收藏' : '已取消收藏', 'success');
        return;
      }

      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题详情页收藏失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setInteractionLoading(prev => ({
        ...prev,
        collect: false
      }));
    }
  };
  const handleSupplementDislike = async () => {
    const currentSupplement = normalizeQuestionDetail(resolvedSupplementQuestion, 'supplement-dislike');
    const currentSupplementId = currentSupplement?.id ?? supplementId;

    if (!currentSupplementId) {
      showToast('补充问题ID不存在', 'error');
      return;
    }

    try {
      setInteractionLoading(prev => ({
        ...prev,
        dislike: true
      }));
      const currentDisliked = disliked ?? currentSupplement?.disliked ?? false;
      const nextDisliked = !currentDisliked;
      const fallbackDislikeCount = Math.max(supplementDislikeDisplayCount + (nextDisliked ? 1 : -1), 0);
      const response = currentDisliked ? await questionApi.undislikeSupplement(currentSupplementId) : await questionApi.dislikeSupplement(currentSupplementId);

      if (response?.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          disliked: nextDisliked,
          dislikeCount: fallbackDislikeCount
        });
        applySupplementInteractionUpdate(updatedSupplement);
        showToast(updatedSupplement.disliked ? '宸茶俯' : '宸插彇娑堣俯', 'success');
        return;
      }

      showToast(response?.msg || '操作失败', 'error');
    } catch (error) {
      console.error('补充问题详情页点踩失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setInteractionLoading(prev => ({
        ...prev,
        dislike: false
      }));
    }
  };
  const closeAnswerModal = () => {
    setShowAnswerModal(false);
    setAnswerText('');
    setAnswerImages([]);
    setAnswerIdentity('personal');
    setAnswerSelectedTeams([]);
    setAnswerSubmitting(false);
  };

  const legacyHandleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      showToast('请输入回答内容', 'warning');
      return;
    }

    const questionId =
      resolvedSupplementQuestion?.id ??
      route?.params?.supplement?.id ??
      route?.params?.id ??
      null;

    if (!questionId) {
      showToast('问题ID不存在，暂时无法发布回答', 'error');
      return;
    }

    try {
      setAnswerSubmitting(true);

      let imageUrls = [];
      if (answerImages.length > 0) {
        for (let i = 0; i < answerImages.length; i += 1) {
          const imageUri = answerImages[i];
          const uploadResult = await uploadApi.uploadImage({
            uri: imageUri,
            name: `supplement_answer_${Date.now()}_${i}.jpg`,
            type: 'image/jpeg',
          });

          if (uploadResult?.code === 200 && uploadResult?.data) {
            imageUrls.push(uploadResult.data);
          } else {
            showToast(`第${i + 1}张图片上传失败`, 'error');
            setAnswerSubmitting(false);
            return;
          }
        }
      }

      const answerCreateRequest = {
        content: answerText.trim(),
        supplementId: resolvedSupplementQuestion?.id,
      };

      if (imageUrls.length > 0) {
        answerCreateRequest.imageUrls = imageUrls;
      }

      const response = await answerApi.publishAnswer(questionId, answerCreateRequest);

      if (response?.code === 200) {
        showToast('回答发布成功', 'success');
        closeAnswerModal();
        return;
      }

      showToast(response?.msg || '回答发布失败', 'error');
    } catch (error) {
      console.error('补充问题详情页发布回答失败:', error);
      showToast('回答发布失败，请稍后重试', 'error');
    } finally {
      setAnswerSubmitting(false);
    }
  };
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      showToast('请输入回答内容', 'warning');
      return;
    }

    const questionId =
      resolvedSupplementQuestion?.id ??
      route?.params?.supplement?.id ??
      route?.params?.id ??
      null;

    if (!questionId) {
      showToast('补充问题ID不存在，暂时无法发布回答', 'error');
      return;
    }

    if (answerIdentity === 'team' && answerSelectedTeams.length === 0) {
      showToast('璇烽€夋嫨鍥㈤槦韬唤鍚庡啀鍙戝竷', 'warning');
      return;
    }

    try {
      setAnswerSubmitting(true);

      let imageUrls = [];
      if (answerImages.length > 0) {
        for (let i = 0; i < answerImages.length; i += 1) {
          const imageUri = answerImages[i];
          const uploadResult = await uploadApi.uploadImage({
            uri: imageUri,
            name: `supplement_answer_${Date.now()}_${i}.jpg`,
            type: 'image/jpeg',
          });

          if (uploadResult?.code === 200 && uploadResult?.data) {
            imageUrls.push(uploadResult.data);
          } else {
            showToast(`第${i + 1}张图片上传失败`, 'error');
            setAnswerSubmitting(false);
            return;
          }
        }
      }

      const answerCreateRequest = {
        questionId,
        content: answerText.trim(),
        supplementId: resolvedSupplementQuestion?.id ?? questionId,
        imageUrls,
        invitedBy: route?.params?.invitedBy ?? null,
        teamId: answerIdentity === 'team'
          ? Number(answerSelectedTeams[0]) || null
          : 100,
      };

      const response = await answerApi.publishAnswer(questionId, answerCreateRequest);

      if (response?.code === 200) {
        const pendingAnswer = buildPendingAnswerItem({
          responseData: response?.data,
          questionId,
          content: answerText.trim(),
          imageUrls,
          selectedIdentity: answerIdentity,
          selectedTeams: answerSelectedTeams,
        });

        showToast('鍥炵瓟鍙戝竷鎴愬姛', 'success');
        setPendingPublishedAnswers(prev => mergeAnswerLists([pendingAnswer], prev));
        setAnswerListState(prev => {
          const mergedList = mergeAnswerLists([pendingAnswer], prev.list);
          return {
            ...prev,
            list: mergedList,
            total: Math.max(normalizeCount(prev.total) + 1, mergedList.length),
            loading: false,
            loaded: true,
            error: ''
          };
        });
        setSortFilter(SORT_KEYS.LATEST);
        closeAnswerModal();
        return;
      }

      showToast(response?.msg || '鍥炵瓟鍙戝竷澶辫触', 'error');
    } catch (error) {
      console.error('琛ュ厖闂璇︽儏椤靛彂甯冨洖绛斿け璐?', error);
      showToast('鍥炵瓟鍙戝竷澶辫触锛岃绋嶅悗閲嶈瘯', 'error');
    } finally {
      setAnswerSubmitting(false);
    }
  };

  return <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.supplementDetail.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => openShareModalWithData(buildSupplementSharePayload())} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Ionicons name="arrow-redo-outline" size={22} color="#6b7280" />
            <Text style={styles.shareBtnText}>{resolvedSupplementQuestion.shareCount ?? resolvedSupplementQuestion.shares ?? 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => showToast(t('screens.supplementDetail.alerts.reportFunction'), 'info')}>
            <Ionicons name="flag-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.supplementSection}>
          <View style={styles.supplementHeader}>
            <TouchableOpacity style={styles.supplementHeaderMain} activeOpacity={0.7} onPress={() => openPublicProfile(resolvedSupplementQuestion || routeSupplement)}>
            <Avatar uri={supplementDisplayAvatar} name={supplementDisplayAuthor} size={40} />
            <View style={styles.supplementAuthorInfo}>
              <View style={styles.supplementAuthorRow}>
                <Text style={styles.supplementAuthor}>{supplementDisplayAuthor}</Text>
                <TouchableOpacity style={styles.followBtnSmall}>
                  <Ionicons name="add" size={12} color="#ef4444" />
                  <Text style={styles.followBtnSmallText}>{t('screens.supplementDetail.actions.follow')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.supplementMetaRow}>
                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                <Text style={styles.supplementLocation}>{supplementDisplayLocation}</Text>
                <Text style={styles.supplementTime}>路 {supplementDisplayTime}</Text>
              </View>
            </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.supplementContent}>{supplementDisplayContent}</Text>
          <View style={styles.supplementViewsRow}>
            <Ionicons name="eye-outline" size={14} color="#9ca3af" />
            <Text style={styles.supplementViewsText}>{resolvedSupplementQuestion.viewCount ?? resolvedSupplementQuestion.views ?? 0} {t('screens.supplementDetail.stats.views')}</Text>
          </View>
          {detailLoading && <View style={styles.detailHintRow}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={styles.detailHintText}>姝ｅ湪鍔犺浇琛ュ厖璇︽儏...</Text>
            </View>}
          {detailError ? <Text style={styles.detailErrorText}>{detailError}</Text> : null}
        </View>

        <View style={styles.originalQuestionCard}>
          <View style={styles.originalQuestionHeader}>
            <Ionicons name="link-outline" size={14} color="#9ca3af" />
            <Text style={styles.originalQuestionLabel}>{t('screens.supplementDetail.originalQuestion.label')}</Text>
          </View>
          <Text style={styles.originalQuestionTitle} numberOfLines={2}>{resolvedOriginalQuestion.title}</Text>
          <TouchableOpacity style={styles.originalQuestionFooter} activeOpacity={0.7} onPress={() => openPublicProfile(resolvedOriginalQuestion, {
          allowAnonymous: false
        })}>
            <Avatar uri={resolvedOriginalQuestion.avatar} name={resolvedOriginalQuestion.author} size={20} />
            <Text style={styles.originalQuestionAuthor}>{resolvedOriginalQuestion.author}</Text>
            <Text style={styles.originalQuestionTime}>路 {resolvedOriginalQuestion.time}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsSection}>
          <View style={styles.tabs}>
            <TouchableOpacity style={styles.tabItem} onPress={() => {
            setActiveTab(TAB_KEYS.ANSWERS);
            setSortFilter(SORT_KEYS.FEATURED);
          }}>
              <Text style={[styles.tabText, activeTab === TAB_KEYS.ANSWERS && styles.tabTextActive]}>{t('screens.supplementDetail.tabs.allAnswers')}</Text>
              {activeTab === TAB_KEYS.ANSWERS && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => {
            setActiveTab(TAB_KEYS.COMMENTS);
            setSortFilter(SORT_KEYS.FEATURED);
          }}>
              <Text style={[styles.tabText, activeTab === TAB_KEYS.COMMENTS && styles.tabTextActive]}>{t('screens.supplementDetail.tabs.allComments')}</Text>
              {activeTab === TAB_KEYS.COMMENTS && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab(TAB_KEYS.INVITE)}>
              <Text style={[styles.tabText, activeTab === TAB_KEYS.INVITE && styles.tabTextActive]}>{t('screens.supplementDetail.tabs.invite')}</Text>
              {activeTab === TAB_KEYS.INVITE && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          {(activeTab === TAB_KEYS.ANSWERS || activeTab === TAB_KEYS.COMMENTS) && <View style={styles.sortFilterBar}>
              <View style={styles.sortFilterLeft}>
                <TouchableOpacity style={[styles.sortFilterBtn, sortFilter === SORT_KEYS.FEATURED && styles.sortFilterBtnActive]} onPress={() => handleAnswerSortFilterChange(SORT_KEYS.FEATURED)}>
                  <Ionicons name="star" size={14} color={sortFilter === SORT_KEYS.FEATURED ? '#ef4444' : '#9ca3af'} />
                  <Text style={[styles.sortFilterText, sortFilter === SORT_KEYS.FEATURED && styles.sortFilterTextActive]}>{t('screens.supplementDetail.sort.featured')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sortFilterBtn, sortFilter === SORT_KEYS.LATEST && styles.sortFilterBtnActive]} onPress={() => handleAnswerSortFilterChange(SORT_KEYS.LATEST)}>
                  <Ionicons name="time" size={14} color={sortFilter === SORT_KEYS.LATEST ? '#ef4444' : '#9ca3af'} />
                  <Text style={[styles.sortFilterText, sortFilter === SORT_KEYS.LATEST && styles.sortFilterTextActive]}>{t('screens.supplementDetail.sort.latest')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sortFilterCount}>
                {activeTab === TAB_KEYS.ANSWERS ? t('screens.supplementDetail.count.answers', {
              count: supplementAnswersTotal
            }) : t('screens.supplementDetail.count.comments', {
              count: supplementCommentsTotal
            })}
              </Text>
            </View>}
        </View>

        <View style={styles.contentSection}>
          {activeTab === TAB_KEYS.ANSWERS ? <>
              {answerListState.loading && supplementAnswersList.length === 0 ? <View style={styles.detailHintRow}>
                  <ActivityIndicator size="small" color="#ef4444" />
                  <Text style={styles.detailHintText}>姝ｅ湪鍔犺浇鍥炵瓟鍒楄〃...</Text>
                </View> : null}
              {answerListState.error && supplementAnswersList.length === 0 ? <Text style={styles.detailErrorText}>{answerListState.error}</Text> : null}
              {!answerListState.loading && !answerListState.error && supplementAnswersList.length === 0 ? <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无回答，快来抢沙发吧</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个回答这个补充问题的人</Text>
                </View> : null}
              {supplementAnswersList.map(answer => {
            const isLiked = answerLiked[answer.id] ?? answer.liked;
            const isBookmarked = answerBookmarked[answer.id] ?? answer.collected;
            const likeCount = getResolvedInteractionDisplayCount(answer.likeCount ?? answer.likes, answer.liked, answerLiked[answer.id], answer.__likeCountResolved);
            const collectCount = getResolvedInteractionDisplayCount(answer.collectCount ?? answer.bookmarkCount ?? answer.bookmarks, answer.collected, answerBookmarked[answer.id], answer.__collectCountResolved);
            return <TouchableOpacity key={answer.id} style={styles.answerCard} onPress={() => navigation.navigate('AnswerDetail', {
            answer,
            defaultTab: 'supplements'
          })} activeOpacity={0.7}>
                  <TouchableOpacity style={styles.answerHeader} activeOpacity={0.7} onPress={e => {
                  e.stopPropagation();
                  openPublicProfile(answer);
                }}>
                    <Avatar uri={answer.userAvatar || answer.avatar} name={answer.userName || answer.userNickname || answer.author} size={40} />
                    <View style={styles.answerAuthorInfo}>
                      <View style={styles.answerAuthorRow}>
                        <Text style={styles.answerAuthor}>{answer.userName || answer.userNickname || answer.author || '鍖垮悕鐢ㄦ埛'}</Text>
                        {Boolean(answer.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                      </View>
                      <Text style={styles.answerAuthorTitle}>{answer.title || ' '}</Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.answerContent}>{answer.content}</Text>
                  <View style={styles.answerFooter}>
                    <View style={styles.answerFooterLeft}>
                      <TouchableOpacity style={styles.answerActionBtn} onPress={() => setAnswerLiked({
                  ...answerLiked,
                  [answer.id]: !answerLiked[answer.id]
                })}>
                        <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={16} color={isLiked ? "#ef4444" : "#6b7280"} />
                        <Text style={[styles.answerActionText, isLiked && {
                    color: '#ef4444'
                  }]}>{likeCount}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.answerActionBtn} onPress={() => {
                  setCurrentAnswerId(answer.id);
                  setShowAnswerCommentModal(true);
                }}>
                        <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                        <Text style={styles.answerActionText}>{answer.commentCount ?? answer.comments ?? 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.answerActionBtn}>
                        <Ionicons name="arrow-redo-outline" size={16} color="#6b7280" />
                        <Text style={styles.answerActionText}>{answer.shareCount ?? answer.shares ?? 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.answerActionBtn} onPress={() => setAnswerBookmarked({
                  ...answerBookmarked,
                  [answer.id]: !answerBookmarked[answer.id]
                })}>
                        <Ionicons name={isBookmarked ? "bookmark" : "star-outline"} size={16} color={isBookmarked ? "#f59e0b" : "#6b7280"} />
                        <Text style={[styles.answerActionText, isBookmarked && {
                    color: '#f59e0b'
                  }]}>{collectCount}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.answerFooterRight}>
                      <TouchableOpacity style={styles.answerActionBtn}>
                        <Ionicons name="thumbs-down-outline" size={16} color="#6b7280" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.answerActionBtn}>
                        <Ionicons name="flag-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>;
          })}
            </> : activeTab === TAB_KEYS.INVITE ?
        // 閭€璇峰垪琛?- 浜岀骇tab鏍囩
        <View style={styles.inviteContainer}>
              {/* 浜岀骇tab鏍囩 */}
              <View style={styles.inviteSubTabs}>
                <TouchableOpacity style={[styles.inviteSubTabItem, inviteTab === INVITE_TAB_KEYS.LOCAL && styles.inviteSubTabItemActive]} onPress={() => setInviteTab(INVITE_TAB_KEYS.LOCAL)}>
                  <Text style={[styles.inviteSubTabText, inviteTab === INVITE_TAB_KEYS.LOCAL && styles.inviteSubTabTextActive]}>{t('screens.supplementDetail.invite.tabs.local')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inviteSubTabItem, inviteTab === INVITE_TAB_KEYS.TWITTER && styles.inviteSubTabItemActive]} onPress={() => setInviteTab(INVITE_TAB_KEYS.TWITTER)}>
                  <Ionicons name="logo-twitter" size={14} color={inviteTab === INVITE_TAB_KEYS.TWITTER ? '#1DA1F2' : '#9ca3af'} />
                  <Text style={[styles.inviteSubTabText, inviteTab === INVITE_TAB_KEYS.TWITTER && styles.inviteSubTabTextActive]}>{t('screens.supplementDetail.invite.tabs.twitter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inviteSubTabItem, inviteTab === INVITE_TAB_KEYS.FACEBOOK && styles.inviteSubTabItemActive]} onPress={() => setInviteTab(INVITE_TAB_KEYS.FACEBOOK)}>
                  <Ionicons name="logo-facebook" size={14} color={inviteTab === INVITE_TAB_KEYS.FACEBOOK ? '#4267B2' : '#9ca3af'} />
                  <Text style={[styles.inviteSubTabText, inviteTab === INVITE_TAB_KEYS.FACEBOOK && styles.inviteSubTabTextActive]}>{t('screens.supplementDetail.invite.tabs.facebook')}</Text>
                </TouchableOpacity>
              </View>

              {/* 鎼滅储妗?*/}
              <View style={styles.inviteSearchContainer}>
                <View style={styles.inviteSearchBox}>
                  <Ionicons name="search" size={14} color="#9ca3af" />
                  <TextInput style={styles.inviteSearchInput} placeholder={inviteTab === INVITE_TAB_KEYS.LOCAL ? t('screens.supplementDetail.invite.search.local') : inviteTab === INVITE_TAB_KEYS.TWITTER ? t('screens.supplementDetail.invite.search.twitter') : t('screens.supplementDetail.invite.search.facebook')} placeholderTextColor="#9ca3af" value={inviteTab === INVITE_TAB_KEYS.LOCAL ? searchLocalUser : inviteTab === INVITE_TAB_KEYS.TWITTER ? searchTwitterUser : searchFacebookUser} onChangeText={text => {
                if (inviteTab === INVITE_TAB_KEYS.LOCAL) setSearchLocalUser(text);else if (inviteTab === INVITE_TAB_KEYS.TWITTER) setSearchTwitterUser(text);else setSearchFacebookUser(text);
              }} />
                </View>
              </View>

              {/* 鏈珯鐢ㄦ埛鍐呭 */}
              {inviteTab === INVITE_TAB_KEYS.LOCAL && <View style={styles.inviteTabContent}>
                  {/* 鎺ㄨ崘閭€璇风敤鎴?- 妯悜婊氬姩 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
                    {[1, 2, 3, 4, 5].map(i => <View key={`rec-local-${i}`} style={styles.recommendUserCard}>
                        <Image source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=reclocal${i}`
                }} style={styles.recommendUserAvatar} />
                        <View style={styles.recommendUserTextContainer}>
                          <Text style={styles.recommendUserName} numberOfLines={1}>鎺ㄨ崘鐢ㄦ埛{i}</Text>
                          <Text style={styles.recommendUserDesc} numberOfLines={1}>{i * 20}鍥炵瓟</Text>
                        </View>
                        <TouchableOpacity style={styles.recommendInviteBtn}>
                          <Ionicons name="add" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>)}
                  </ScrollView>

                  {/* 宸查個璇风敤鎴峰垪琛?*/}
                  <Text style={styles.invitedListTitle}>{t('screens.supplementDetail.invite.invited')}</Text>
                  {[1, 2, 3, 4].map(i => <View key={`invited-local-${i}`} style={styles.inviteUserCard}>
                      <Image source={{
                uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=local${i}`
              }} style={styles.inviteUserAvatar} />
                      <View style={styles.inviteUserInfo}>
                        <Text style={styles.inviteUserName}>鐢ㄦ埛{i}</Text>
                        <Text style={styles.inviteUserDesc}>Python 开发者 · 回答过 {i * 10} 个问题</Text>
                      </View>
                      <View style={styles.invitedTag}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.invitedTagText}>{t('screens.supplementDetail.invite.invited')}</Text>
                      </View>
                    </View>)}
                </View>}

              {/* 鎺ㄧ壒鐢ㄦ埛鍐呭 */}
              {inviteTab === INVITE_TAB_KEYS.TWITTER && <View style={styles.inviteTabContent}>
                  {/* 鎺ㄨ崘閭€璇风敤鎴?- 妯悜婊氬姩 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
                    {[1, 2, 3, 4, 5].map(i => <View key={`rec-twitter-${i}`} style={styles.recommendUserCard}>
                        <Image source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=rectwitter${i}`
                }} style={styles.recommendUserAvatar} />
                        <View style={styles.recommendUserTextContainer}>
                          <Text style={styles.recommendUserName} numberOfLines={1}>@user{i}</Text>
                          <Text style={styles.recommendUserDesc} numberOfLines={1}>{i}k绮変笣</Text>
                        </View>
                        <TouchableOpacity style={[styles.recommendInviteBtn, styles.recommendInviteBtnTwitter]}>
                          <Ionicons name="logo-twitter" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>)}
                  </ScrollView>

                  {/* 宸查個璇风敤鎴峰垪琛?*/}
                  <Text style={styles.invitedListTitle}>{t('screens.supplementDetail.invite.invited')}</Text>
                  {[1, 2, 3].map(i => <View key={`invited-twitter-${i}`} style={styles.inviteUserCard}>
                      <Image source={{
                uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=twitter${i}`
              }} style={styles.inviteUserAvatar} />
                      <View style={styles.inviteUserInfo}>
                        <Text style={styles.inviteUserName}>@twitter_user{i}</Text>
                        <Text style={styles.inviteUserDesc}>{i * 1000} {t('screens.supplementDetail.invite.followers')}</Text>
                      </View>
                      <View style={styles.invitedTag}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.invitedTagText}>{t('screens.supplementDetail.invite.invited')}</Text>
                      </View>
                    </View>)}
                </View>}

              {/* Facebook鐢ㄦ埛鍐呭 */}
              {inviteTab === INVITE_TAB_KEYS.FACEBOOK && <View style={styles.inviteTabContent}>
                  {/* 鎺ㄨ崘閭€璇风敤鎴?- 妯悜婊氬姩 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
                    {[1, 2, 3, 4, 5].map(i => <View key={`rec-facebook-${i}`} style={styles.recommendUserCard}>
                        <Image source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=recfacebook${i}`
                }} style={styles.recommendUserAvatar} />
                        <View style={styles.recommendUserTextContainer}>
                          <Text style={styles.recommendUserName} numberOfLines={1}>FB User{i}</Text>
                          <Text style={styles.recommendUserDesc} numberOfLines={1}>{i * 500}濂藉弸</Text>
                        </View>
                        <TouchableOpacity style={[styles.recommendInviteBtn, styles.recommendInviteBtnFacebook]}>
                          <Ionicons name="logo-facebook" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>)}
                  </ScrollView>

                  {/* 宸查個璇风敤鎴峰垪琛?*/}
                  <Text style={styles.invitedListTitle}>{t('screens.supplementDetail.invite.invited')}</Text>
                  {[1, 2, 3].map(i => <View key={`invited-facebook-${i}`} style={styles.inviteUserCard}>
                      <Image source={{
                uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=facebook${i}`
              }} style={styles.inviteUserAvatar} />
                      <View style={styles.inviteUserInfo}>
                        <Text style={styles.inviteUserName}>Facebook User {i}</Text>
                        <Text style={styles.inviteUserDesc}>{i * 500} {t('screens.supplementDetail.invite.friends')}</Text>
                      </View>
                      <View style={styles.invitedTag}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.invitedTagText}>{t('screens.supplementDetail.invite.invited')}</Text>
                      </View>
                    </View>)}
                </View>}
            </View> : <>
              {commentListState.loading && supplementCommentsList.length === 0 ? <View style={styles.detailHintRow}>
                  <ActivityIndicator size="small" color="#ef4444" />
                  <Text style={styles.detailHintText}>正在加载评论列表...</Text>
                </View> : null}
              {commentListState.error && supplementCommentsList.length === 0 ? <Text style={styles.detailErrorText}>{commentListState.error}</Text> : null}
              {!commentListState.loading && !commentListState.error && supplementCommentsList.length === 0 ? <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无评论，快来抢沙发吧</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个评论这条补充问题的人</Text>
                </View> : null}
              {supplementCommentsList.map(comment => {
            const isLiked = commentLiked[comment.id] ?? comment.liked;
            const isCollected = commentBookmarked[comment.id] ?? comment.collected;
            const isDisliked = commentDisliked[comment.id] ?? comment.disliked;
            return <View key={comment.id} style={styles.commentCard}>
                    <TouchableOpacity style={styles.commentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                      <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={24} />
                      <Text style={styles.commentAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                      <View style={{
                    flex: 1
                  }} />
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </TouchableOpacity>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <View style={styles.commentFooter}>
                        <View style={styles.commentFooterLeft}>
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentLike(comment.id)} disabled={commentLikeLoading[comment.id]}>
                            <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isLiked ? "#ef4444" : "#9ca3af"} />
                            <Text style={[styles.commentActionText, isLiked && {
                        color: '#ef4444'
                      }]}>{getCommentLikeDisplayCount(comment, commentLiked[comment.id])}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => {
                        setCurrentCommentId(comment.id);
                        setShowCommentReplyModal(true);
                      }}>
                            <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentActionText}>{getCommentReplyDisplayCount(comment)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => openShareModalWithData(buildCommentSharePayload(comment))}>
                            <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentActionText}>{comment.shareCount ?? comment.shares ?? 0}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentCollect(comment.id)} disabled={commentCollectLoading[comment.id]}>
                            <Ionicons name={isCollected ? "star" : "star-outline"} size={14} color={isCollected ? "#f59e0b" : "#9ca3af"} />
                            <Text style={[styles.commentActionText, isCollected && {
                        color: '#f59e0b'
                      }]}>{getCommentCollectDisplayCount(comment, commentBookmarked[comment.id])}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.commentFooterRight}>
                          <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentDislike(comment.id)} disabled={commentDislikeLoading[comment.id]}>
                            <Ionicons name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color="#9ca3af" />
                            <Text style={styles.commentActionText}>{getCommentDislikeDisplayCount(comment, commentDisliked[comment.id])}</Text>
                          </TouchableOpacity>
                            <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentReport(comment.id)}>
                              <Ionicons name="flag-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>;
          })}
            </>}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <TouchableOpacity style={styles.bottomIconBtn} onPress={handleSupplementLike} disabled={interactionLoading.like}>
            <Ionicons name={mainLiked ? "thumbs-up" : "thumbs-up-outline"} size={20} color={mainLiked ? "#ef4444" : "#6b7280"} />
            <Text style={[styles.bottomIconText, mainLiked && {
            color: '#ef4444'
          }]}>{supplementLikeDisplayCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomIconBtn} onPress={handleSupplementCollect} disabled={interactionLoading.collect}>
            <Ionicons name={mainCollected ? "star" : "star-outline"} size={20} color={mainCollected ? "#f59e0b" : "#6b7280"} />
            <Text style={[styles.bottomIconText, mainCollected && {
            color: '#f59e0b'
          }]}>{supplementCollectDisplayCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomIconBtn} onPress={handleSupplementDislike} disabled={interactionLoading.dislike}>
            <Ionicons name={mainDisliked ? "thumbs-down" : "thumbs-down-outline"} size={20} color="#6b7280" />
            <Text style={[styles.bottomIconText, mainDisliked && {
            color: '#6b7280'
          }]}>{supplementDislikeDisplayCount}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomBarRight}>
          <TouchableOpacity 
            style={styles.bottomCommentInput} 
            onPress={() => {
              if (activeTab === TAB_KEYS.ANSWERS) {
                setShowAnswerModal(true);
              } else if (activeTab === TAB_KEYS.COMMENTS) {
                openCommentComposer({
                  targetId: supplementId,
                  parentId: 0
                });
              }
            }}
          >
            <Text style={styles.bottomCommentPlaceholder}>
              {activeTab === TAB_KEYS.ANSWERS 
                ? t('screens.supplementDetail.modal.answerTitle')
                : activeTab === TAB_KEYS.COMMENTS
                ? t('screens.supplementDetail.modal.commentTitle')
                : t('screens.supplementDetail.bottomBar.commentPlaceholder')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 鍥炵瓟寮圭獥 */}
      <Modal visible={false && showAnswerModal} animationType="slide">
        <SafeAreaView style={styles.answerModal}>
          <View style={styles.answerModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAnswerModal(false);
              setAnswerText('');
              setAnswerIdentity('personal');
              setAnswerSelectedTeams([]);
            }} style={styles.answerCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.answerHeaderCenter}>
              <Text style={styles.answerModalTitle}>{t('screens.supplementDetail.modal.answerTitle')}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.answerPublishBtn, !answerText.trim() && styles.answerPublishBtnDisabled]} 
              onPress={handleSubmitAnswer} 
              disabled={!answerText.trim()}
            >
              <Text style={[styles.answerPublishText, !answerText.trim() && styles.answerPublishTextDisabled]}>
                {t('screens.supplementDetail.modal.publish')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 鏄剧ず琛ュ厖闂鍐呭 */}
          {Boolean(resolvedSupplementQuestion) && (
            <View style={styles.supplementAnswerContext}>
              <View style={styles.supplementAnswerHeader}>
                <Ionicons name="document-text" size={18} color="#3b82f6" />
                <Text style={styles.supplementAnswerLabel}>琛ュ厖闂</Text>
              </View>
              <View style={styles.supplementAnswerAuthor}>
                <Avatar 
                  uri={supplementDisplayAvatar} 
                  name={supplementDisplayAuthor} 
                  size={24} 
                />
                <Text style={styles.supplementAnswerAuthorName}>
                  {supplementDisplayAuthor}
                </Text>
              </View>
              <Text style={styles.supplementAnswerContent} numberOfLines={3}>
                {supplementDisplayContent}
              </Text>
            </View>
          )}

          <ScrollView style={styles.answerContentArea} keyboardShouldPersistTaps="handled">
            <TextInput 
              style={styles.answerTextInput} 
              placeholder={t('screens.supplementDetail.modal.answerPlaceholder')} 
              placeholderTextColor="#bbb" 
              value={answerText} 
              onChangeText={setAnswerText} 
              multiline 
              autoFocus 
              textAlignVertical="top" 
            />
            
            {/* 韬唤閫夋嫨鍣?*/}
            <View style={styles.answerIdentitySection}>
              <IdentitySelector 
                selectedIdentity={answerIdentity} 
                selectedTeams={answerSelectedTeams} 
                onIdentityChange={setAnswerIdentity} 
                onTeamsChange={setAnswerSelectedTeams} 
              />
            </View>
          </ScrollView>

          <View style={styles.answerToolbar}>
            <View style={styles.answerToolsLeft}>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="at-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerWordCount}>{answerText.length}/2000</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 璇勮寮圭獥 */}
      <WriteAnswerModal
        visible={showAnswerModal}
        onClose={closeAnswerModal}
        onSubmit={handleSubmitAnswer}
        title="写回答"
        publishText="发布"
        questionTitle={resolvedOriginalQuestion.title}
        supplementText={supplementDisplayContent}
        text={answerText}
        onChangeText={setAnswerText}
        placeholder="写下你的回答，帮助有需要的人..."
        selectedIdentity={answerIdentity}
        selectedTeams={answerSelectedTeams}
        onIdentityChange={setAnswerIdentity}
        onTeamsChange={setAnswerSelectedTeams}
        images={answerImages}
        onChangeImages={setAnswerImages}
        wordLimit={2000}
        submitting={answerSubmitting}
      />

      <Modal visible={showCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCommentReplyModal(false)} />
          <View style={styles.commentReplyModal}>
            <View style={styles.commentReplyModalHandle} />
            <View style={styles.commentReplyModalHeader}>
              <TouchableOpacity onPress={() => setShowCommentReplyModal(false)} style={styles.commentReplyModalCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentReplyModalTitle}>
                {Number(commentRepliesMap[currentCommentId]?.total ?? currentReplyComment?.replyCount ?? currentReplyComment?.replies ?? commentRepliesMap[currentCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <View style={styles.commentReplyModalHeaderRight} />
            </View>

            {Boolean(currentReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentReplyComment)}>
                  <Avatar uri={currentReplyComment.userAvatar || currentReplyComment.avatar} name={currentReplyComment.userName || currentReplyComment.userNickname || currentReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentReplyComment.userName || currentReplyComment.userNickname || currentReplyComment.author}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.originalCommentTime}>{currentReplyComment.time}</Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>{currentReplyComment.content}</Text>
              </View>}

            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>

            <ScrollView style={styles.commentReplyScroll} showsVerticalScrollIndicator={false}>
              {Boolean(currentCommentId && commentRepliesMap[currentCommentId]?.loading) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>加载回复中...</Text>
                </View>}
              {currentCommentId && commentRepliesMap[currentCommentId]?.list?.length ? renderCommentReplyTreeNodes(buildCommentReplyTree(commentRepliesMap[currentCommentId].list, currentCommentId), 0, {
            rootCommentId: currentCommentId,
            beforeOpenReply: () => setShowCommentReplyModal(false),
            beforeReport: () => setShowCommentReplyModal(false)
          }) : null}
              {currentCommentId && commentRepliesMap[currentCommentId]?.loaded && (!commentRepliesMap[currentCommentId]?.list || commentRepliesMap[currentCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={styles.commentReplyBottomBar}>
              <TouchableOpacity style={styles.commentReplyWriteBtn} onPress={() => {
              if (!currentReplyComment) {
                return;
              }
              setShowCommentReplyModal(false);
              openCommentComposer(buildCommentReplyTarget(currentReplyComment, {
                targetId: supplementId
              }));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentReplyWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WriteCommentModal
        visible={showCommentModal}
        onClose={closeCommentComposer}
        onPublish={handleSubmitSupplementComment}
        originalComment={commentComposerTarget.originalComment}
        placeholder={commentComposerTarget.parentId ? '写下你的回复...' : '写下你的评论...'}
        title={commentComposerTarget.parentId ? '写回复' : '写评论'}
        publishInFooter={true}
      />
      <ShareModal
        visible={showShareModal}
        onClose={closeShareModal}
        shareData={currentShareData || buildSupplementSharePayload()}
        onShare={handleShare}
      />
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
  supplementSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8
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
    width: 44,
    height: 44,
    borderRadius: 22
  },
  supplementAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  supplementAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  supplementAuthor: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  followBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2
  },
  followBtnSmallText: {
    fontSize: scaleFont(10),
    color: '#ef4444',
    fontWeight: '500'
  },
  supplementMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  supplementLocation: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  supplementTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  supplementContent: {
    fontSize: scaleFont(16),
    color: '#1f2937',
    lineHeight: scaleFont(26),
    fontWeight: '400',
    marginBottom: 12
  },
  supplementViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  supplementViewsText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  detailHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10
  },
  detailHintText: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  detailErrorText: {
    marginTop: 8,
    fontSize: scaleFont(12),
    color: '#ef4444'
  },
  supplementsEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  supplementsEmptyText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16
  },
  supplementsEmptyDesc: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    marginTop: 8
  },
  originalQuestionCard: {
    backgroundColor: '#fafafa',
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444'
  },
  originalQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6
  },
  originalQuestionLabel: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    fontWeight: '500'
  },
  originalQuestionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: scaleFont(20),
    marginBottom: 8
  },
  originalQuestionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  originalQuestionAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10
  },
  originalQuestionAuthor: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    fontWeight: '500'
  },
  originalQuestionTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  tabsSection: {
    backgroundColor: '#fff',
    marginBottom: 8
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
  answerCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  answerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  answerAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  answerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  answerAuthor: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  answerAuthorTitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2
  },
  answerContent: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(22),
    marginBottom: 12
  },
  answerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  answerFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  answerFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  answerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  answerActionText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  inviteContainer: {
    backgroundColor: '#fff'
  },
  inviteSubTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 16
  },
  inviteSubTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  inviteSubTabItemActive: {
    borderBottomColor: '#ef4444'
  },
  inviteSubTabText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    fontWeight: '500'
  },
  inviteSubTabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  inviteSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  inviteSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#1f2937',
    padding: 0
  },
  inviteTabContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  recommendScroll: {
    marginBottom: 16
  },
  recommendUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fafafa',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 8
  },
  recommendUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  recommendUserTextContainer: {
    flex: 1
  },
  recommendUserName: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2
  },
  recommendUserDesc: {
    fontSize: scaleFont(10),
    color: '#9ca3af'
  },
  recommendInviteBtn: {
    backgroundColor: '#ef4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  recommendInviteBtnTwitter: {
    backgroundColor: '#1DA1F2'
  },
  recommendInviteBtnFacebook: {
    backgroundColor: '#4267B2'
  },
  invitedListTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    marginTop: 4
  },
  inviteUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  inviteUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  inviteUserInfo: {
    flex: 1,
    marginLeft: 12
  },
  inviteUserName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4
  },
  inviteUserDesc: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  invitedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  invitedTagText: {
    fontSize: scaleFont(12),
    color: '#22c55e',
    fontWeight: '500'
  },
  commentCard: {
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
    flex: 1
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  commentAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af'
  },
  commentTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  commentText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  commentFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  commentFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
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
  repliesContainer: {
    paddingLeft: 48,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  replyCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  replyContent: {
    flex: 1,
    marginLeft: 10
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  replyAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af'
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.25)'
  },
  modalBackdrop: {
    flex: 1
  },
  commentReplyModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  commentReplyModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  commentReplyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentReplyModalCloseBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
    zIndex: 10
  },
  commentReplyModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937'
  },
  commentReplyModalHeaderRight: {
    width: 40
  },
  originalCommentCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: '#f9fafb'
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  originalCommentAuthor: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#9ca3af'
  },
  originalCommentTime: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  originalCommentText: {
    fontSize: scaleFont(16),
    color: '#1f2937',
    lineHeight: scaleFont(24)
  },
  repliesSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa'
  },
  repliesSectionTitle: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    fontWeight: '500'
  },
  commentReplyScroll: {
    maxHeight: 500,
    backgroundColor: '#fff'
  },
  loadingIndicator: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  replyAuthorMeta: {
    flexShrink: 1
  },
  replyAuthorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
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
  commentReplyBottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  commentReplyWriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  commentReplyWriteText: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 16
  },
  bottomIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  bottomIconText: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  bottomCommentInput: {
    flex: 1,
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
  bottomAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: modalTokens.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  bottomAnswerText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
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
  answerHeaderCenter: {
    flex: 1,
    alignItems: 'center'
  },
  answerCloseBtn: {
    padding: 4,
    width: 40
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
    borderRadius: modalTokens.actionRadius
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
    color: '#fff',
    opacity: 0.7
  },
  answerContentArea: {
    flex: 1,
    backgroundColor: modalTokens.surface,
    padding: 16
  },
  answerTextInput: {
    fontSize: scaleFont(16),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(26),
    minHeight: 200,
    marginBottom: 16,
    textAlignVertical: 'top'
  },
  answerIdentitySection: {
    marginTop: 8
  },
  answerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
    backgroundColor: modalTokens.surface
  },
  answerToolsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  answerToolItem: {
    padding: 4
  },
  answerWordCount: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  // 琛ュ厖鍥炵瓟涓婁笅鏂囨牱寮?
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
  }
});


