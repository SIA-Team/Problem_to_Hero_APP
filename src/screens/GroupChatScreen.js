import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  InteractionManager,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import MentionSuggestionsPanel from '../components/MentionSuggestionsPanel';
import TeamDiscussionComposerModal from '../components/TeamDiscussionComposerModal';
import TwemojiText from '../components/TwemojiText';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import apiClient from '../services/api/apiClient';
import uploadApi from '../services/api/uploadApi';
import questionApi from '../services/api/questionApi';
import { API_ENDPOINTS } from '../config/api';
import * as Updates from 'expo-updates';
import { SIMULATE_PRODUCTION } from '../config/debugMode';
import { isDevPreviewFeatureEnabled } from '../utils/devPreviewGate';
import useMentionComposer from '../hooks/useMentionComposer';
import useRecommendedMentionUsers from '../hooks/useRecommendedMentionUsers';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
} from '../utils/mentionComposer';
import { resolveComposerKeyboardMetrics } from '../utils/composerLayout';
import {
  extractGroupIdsFromGroups,
  getGroupIdValue,
  hasGroupIdValue,
  normalizeGroupId,
  normalizeQuestionGroupIdsResponse,
} from '../utils/groupChatGroupId';

import { scaleFont } from '../utils/responsive';
const DEFAULT_QUESTION = {
  title: '',
  author: '',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  memberCount: 0,
};

const isSuccessResponse = response => response && (response.code === 200 || response.code === 0);
const GROUP_CHAT_INTERNAL_ERROR_PATTERN = /No static resource|NOT_FOUND|SQLSyntaxErrorException|app_group/i;
const GROUP_ALREADY_JOINED_PATTERN = /已加入该群组|已经加入该群组|already joined/i;

const GROUP_CHAT_DEBUG_LOGS_ENABLED = false;

const pickPreferredGroup = groups =>
  groups.find(group => Boolean(group?.isJoined)) ||
  groups.find(group => Number(group?.status) === 1) ||
  groups.find(group => hasGroupIdValue(getGroupIdValue(group))) ||
  groups[0] ||
  null;

const normalizeGroupItem = (item, index) => ({
  ...item,
  id: String(item?.id ?? item?.groupId ?? `group-${index}`),
  questionId: String(item?.questionId ?? item?.question_id ?? ''),
  resolvedGroupId: getGroupIdValue(item),
  avatar: item?.avatar || item?.groupAvatar || item?.icon || '',
  memberCount:
    toSafeNumber(
      item?.memberCount ??
      item?.joinedCount ??
      item?.currentMembers ??
      item?.userCount
    ) || 0,
  maxMembers:
    toSafeNumber(
      item?.maxMembers ??
      item?.capacity ??
      item?.groupMaxMembers ??
      item?.limitCount
    ) || 0,
  name: item?.name || item?.groupName || item?.title || item?.groupTitle || '',
  description: item?.description || item?.desc || item?.groupDescription || '',
  status: toSafeNumber(item?.status ?? item?.groupStatus ?? 0),
  isJoined: Boolean(item?.isJoined),
  userRole: toSafeNumber(item?.userRole ?? item?.role ?? 0),
});

const normalizeQuestionGroupsResponse = response => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : payload?.rows ||
      payload?.list ||
      payload?.records ||
      payload?.groups ||
      payload?.items ||
      (Array.isArray(payload?.data) ? payload.data : null) ||
      [];

  if (Array.isArray(candidateList)) {
    return candidateList.map(normalizeGroupItem).filter(group => hasGroupIdValue(getGroupIdValue(group)));
  }

  if (candidateList && typeof candidateList === 'object') {
    const normalizedGroup = normalizeGroupItem(candidateList, 0);
    return hasGroupIdValue(getGroupIdValue(normalizedGroup)) ? [normalizedGroup] : [];
  }

  if (payload && typeof payload === 'object' && hasGroupIdValue(getGroupIdValue(payload))) {
    return [normalizeGroupItem(payload, 0)];
  }

  return [];
};

const arePrimitiveArraysEqual = (prev = [], next = []) =>
  prev.length === next.length && prev.every((item, index) => item === next[index]);

const areQuestionGroupsEqual = (prev = [], next = []) =>
  prev.length === next.length &&
  prev.every((item, index) => {
    const nextItem = next[index];
    return (
      getGroupIdValue(item) === getGroupIdValue(nextItem) &&
      item?.memberCount === nextItem?.memberCount &&
      item?.maxMembers === nextItem?.maxMembers &&
      item?.avatar === nextItem?.avatar &&
      item?.questionId === nextItem?.questionId &&
      item?.name === nextItem?.name &&
      item?.description === nextItem?.description &&
      Boolean(item?.isJoined) === Boolean(nextItem?.isJoined) &&
      Number(item?.status) === Number(nextItem?.status) &&
      Number(item?.userRole) === Number(nextItem?.userRole)
    );
  });

const areMessageItemsEqual = (prev = [], next = []) =>
  prev.length === next.length &&
  prev.every((item, index) => {
    const nextItem = next[index];
    return (
      item?.id === nextItem?.id &&
      item?.author === nextItem?.author &&
      item?.content === nextItem?.content &&
      item?.imageUri === nextItem?.imageUri &&
      item?.timeLabel === nextItem?.timeLabel &&
      item?.likes === nextItem?.likes &&
      item?.dislikes === nextItem?.dislikes &&
      item?.shares === nextItem?.shares &&
      item?.bookmarks === nextItem?.bookmarks &&
      item?.reports === nextItem?.reports &&
      item?.replyCount === nextItem?.replyCount &&
      item?.liked === nextItem?.liked &&
      item?.disliked === nextItem?.disliked &&
      item?.collected === nextItem?.collected &&
      item?.isFeatured === nextItem?.isFeatured &&
      item?.parentId === nextItem?.parentId &&
      item?.replyToCommentId === nextItem?.replyToCommentId &&
      item?.replyToUserName === nextItem?.replyToUserName &&
      item?.structuralParentId === nextItem?.structuralParentId
    );
  });

const isSameMessageSummary = (prev, next) =>
  prev?.total === next?.total && prev?.featuredCount === next?.featuredCount;

const isLikeInteractionDisabled = (likedState, dislikedState) => !likedState && !!dislikedState;
const isDislikeInteractionDisabled = (likedState, dislikedState) => !dislikedState && !!likedState;

const getGroupChatErrorMessage = (error, fallbackMessage) => {
  const rawMessage = error?.msg || error?.data?.msg || error?.message || '';

  if (!rawMessage || GROUP_CHAT_INTERNAL_ERROR_PATTERN.test(rawMessage)) {
    return fallbackMessage;
  }

  return rawMessage;
};

const isJoinGroupSuccessResponse = response =>
  isSuccessResponse(response) || GROUP_ALREADY_JOINED_PATTERN.test(String(response?.msg ?? '').trim());

const GROUP_API_REQUEST_CONFIG = {};
const logGroupChatDebug = (...args) => {
  if (!GROUP_CHAT_DEBUG_LOGS_ENABLED) {
    return;
  }
  console.log('[GroupChatDebug]', ...args);
};

const toSafeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMessageImages = item => {
  const rawImages = Array.isArray(item?.imageUrls)
    ? item.imageUrls
    : Array.isArray(item?.images)
      ? item.images
      : Array.isArray(item?.imgUrls)
        ? item.imgUrls
        : [];
  const singleImageCandidates = [item?.imageUrl, item?.image, item?.imgUrl, item?.coverImage];
  const normalizedImages = rawImages
    .concat(singleImageCandidates)
    .filter(image => typeof image === 'string' && image.trim())
    .map(image => image.trim());

  return normalizedImages.filter((image, index) => normalizedImages.indexOf(image) === index);
};

const extractUploadedImageUrl = response => {
  const payload = response?.data;

  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (payload && typeof payload === 'object') {
    const nestedUrl = [payload.url, payload.imageUrl, payload.fileUrl, payload.path].find(
      value => typeof value === 'string' && value.trim()
    );

    if (nestedUrl) {
      return nestedUrl.trim();
    }
  }

  return '';
};

const inferUploadMimeType = imageUri => {
  const normalizedUri = String(imageUri || '').toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  if (normalizedUri.endsWith('.heic') || normalizedUri.endsWith('.heif')) {
    return 'image/heic';
  }

  return 'image/jpeg';
};

const parseDateValue = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  if (typeof value === 'string') {
    if (/^\d+$/.test(value.trim())) {
      const numericValue = Number(value);
      const fromNumericString = new Date(numericValue);
      if (!Number.isNaN(fromNumericString.getTime())) {
        return fromNumericString;
      }
    }

    const normalizedValue = value.includes('T') ? value : value.replace(/-/g, '/');
    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
};

const formatMessageTime = (rawValue, t) => {
  if (rawValue === 0 || rawValue === '0') {
    return t('screens.groupChat.justNow');
  }

  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue) && `${rawValue}`.trim() !== '') {
    if (numericValue < 1) {
      return t('screens.groupChat.justNow');
    }

    if (numericValue < 60) {
      return `${numericValue}${t('screens.groupChat.minutesAgo')}`;
    }

    return `${Math.floor(numericValue / 60)}${t('screens.groupChat.hoursAgo')}`;
  }

  const parsedDate = parseDateValue(rawValue);
  if (!parsedDate) {
    return '';
  }

  const diffMinutes = Math.floor((Date.now() - parsedDate.getTime()) / 60000);
  if (diffMinutes < 1) {
    return t('screens.groupChat.justNow');
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}${t('screens.groupChat.minutesAgo')}`;
  }

  return `${Math.floor(diffMinutes / 60)}${t('screens.groupChat.hoursAgo')}`;
};

const normalizeMessageItem = (item, index, t) => {
  const id = item?.id ?? item?.messageId ?? item?.groupMessageId ?? `group-message-${index}`;
  const author =
    item?.userName ||
    item?.username ||
    item?.author ||
    item?.nickname ||
    item?.nickName ||
    item?.creatorName ||
    t('screens.groupChat.questioner');
  const authorId = item?.userId ?? item?.authorId ?? item?.creatorId ?? id;
  const avatar =
    item?.userAvatar ||
    item?.avatar ||
    item?.authorAvatar ||
    item?.creatorAvatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=group-message-${authorId}`;
  const content = item?.content || item?.messageContent || item?.message || item?.text || '';
  const imageUrls = normalizeMessageImages(item);
  const rawTime = item?.time ?? item?.createTime ?? item?.createdAt ?? item?.gmtCreate ?? item?.createDate;
  const timeLabel = item?.createTimeDesc || item?.timeDesc || formatMessageTime(rawTime, t);
  const isFeatured =
    Boolean(item?.isFeatured ?? item?.featured ?? item?.essence) ||
    Number(item?.featuredFlag ?? item?.essenceFlag ?? item?.isEssence) === 1;
  const parentId = toSafeNumber(item?.parentId ?? item?.parent_id ?? item?.parentMessageId);
  const replyToCommentId = toSafeNumber(
    item?.replyToCommentId ??
      item?.replyCommentId ??
      item?.toCommentId ??
      item?.parentCommentId ??
      item?.replyMessageId
  );
  const replyToUserName = normalizeReplyTargetUserName(item);

  return {
    id,
    author,
    authorId,
    avatar,
    content,
    imageUrls,
    imageUri: imageUrls[0] || '',
    timeLabel,
    likes: toSafeNumber(item?.likeCount ?? item?.likes ?? item?.upCount),
    dislikes: toSafeNumber(item?.dislikeCount ?? item?.dislikes ?? item?.downCount),
    shares: toSafeNumber(item?.shareCount ?? item?.shares ?? item?.forwardCount),
    bookmarks: toSafeNumber(
      item?.bookmarkCount ?? item?.bookmarks ?? item?.collectCount ?? item?.favoriteCount
    ),
    reports: toSafeNumber(item?.reportCount ?? item?.reports),
    replyCount: toSafeNumber(item?.replyCount ?? item?.commentCount ?? item?.comments),
    liked: Boolean(item?.isLiked ?? item?.liked),
    disliked: Boolean(item?.isDisliked ?? item?.disliked),
    collected: Boolean(item?.isCollected ?? item?.collected ?? item?.bookmarked ?? item?.favorited),
    isFeatured,
    parentId,
    replyToCommentId,
    replyToUserName,
    raw: item,
  };
};

const isTopLevelThreadMessage = item => {
  if (!item?.id) {
    return false;
  }

  const currentId = String(item.id);
  const parentValue =
    item?.structuralParentId ??
    item?.parentId ??
    item?.parent_id ??
    item?.parentMessageId ??
    item?.rootMessageId ??
    item?.rootCommentId;

  if (parentValue === undefined || parentValue === null || parentValue === '') {
    return true;
  }

  const parentKey = String(parentValue);
  return parentKey === '0' || parentKey === currentId;
};

const sanitizeTopLevelMessageItems = rows => {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const seenIds = new Set();

  return rows.filter(item => {
    if (!item?.id || !item?.content || !isTopLevelThreadMessage(item)) {
      return false;
    }

    const itemKey = String(item.id);
    if (seenIds.has(itemKey)) {
      return false;
    }

    seenIds.add(itemKey);
    return true;
  });
};

const normalizeGroupMessagesResponse = (response, t) => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : payload?.rows || payload?.list || payload?.records || payload?.comments || payload?.messages || [];
  const normalizedRows = Array.isArray(candidateList)
    ? candidateList
        .map((item, index) => normalizeThreadMessageItem(item, index, t))
        .filter(item => Boolean(item.content))
    : [];
  const messages = normalizedRows.length
    ? sanitizeTopLevelMessageItems(
        resolveThreadReplyCounts(hydrateThreadMessageItems(normalizedRows))
      )
    : [];

  return {
    messages,
    total:
      toSafeNumber(payload?.total ?? payload?.totalCount ?? payload?.count ?? payload?.messageCount) || messages.length,
    featuredCount:
      toSafeNumber(payload?.featuredCount ?? payload?.essenceCount) || messages.filter(item => item.isFeatured).length,
  };
};

const normalizeReplyTargetUserName = item =>
  item?.replyToUserName ||
  item?.replyUserName ||
  item?.toUserName ||
  item?.parentUserName ||
  item?.replyNickName ||
  '';

const normalizeThreadMessageItem = (item, index, t, fallback = {}) => {
  const normalized = normalizeMessageItem(item, index, t);
  const parentId = toSafeNumber(item?.parentId ?? item?.parent_id ?? fallback.parentId);
  const replyToCommentId = toSafeNumber(
    item?.replyToCommentId ??
      item?.replyCommentId ??
      item?.toCommentId ??
      item?.parentCommentId ??
      fallback.replyToCommentId
  );
  const replyToUserName = normalizeReplyTargetUserName(item) || fallback.replyToUserName || '';

  return {
    ...normalized,
    imageUrls:
      normalized.imageUrls.length > 0
        ? normalized.imageUrls
        : Array.isArray(fallback.imageUrls)
          ? fallback.imageUrls
          : [],
    imageUri:
      normalized.imageUri ||
      (Array.isArray(fallback.imageUrls) && fallback.imageUrls.length > 0
        ? fallback.imageUrls[0]
        : ''),
    replyCount: toSafeNumber(fallback.replyCount ?? item?.replyCount ?? normalized.replyCount),
    parentId,
    replyToCommentId,
    replyToUserName,
    structuralParentId: fallback.structuralParentId ?? parentId,
    threadRootId: fallback.threadRootId ?? null,
    rootCommentId: fallback.rootCommentId ?? null,
  };
};

const extractGroupMessageRows = response => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : payload?.rows || payload?.list || payload?.records || payload?.comments || payload?.messages || [];

  return Array.isArray(candidateList) ? candidateList : [];
};

const extractGroupMessageTotalCount = response => {
  const payload = response?.data;
  return toSafeNumber(
    payload?.total ??
      payload?.totalCount ??
      payload?.count ??
      payload?.messageCount ??
      payload?.commentCount
  );
};

const filterThreadRowsForMessage = (rows = [], rootMessageId = null) => {
  const normalizedRootId =
    rootMessageId !== undefined && rootMessageId !== null ? String(rootMessageId) : '';

  if (!normalizedRootId || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const normalizedRows = rows.filter(item => Boolean(item?.id));
  const includedIds = new Set();
  const pendingRows = normalizedRows.filter(item => String(item.id) !== normalizedRootId);

  const isDirectChildOfRoot = item => {
    const parentId = String(item?.parentId ?? item?.parent_id ?? item?.parentMessageId ?? '');
    const rootId = String(item?.rootMessageId ?? item?.rootCommentId ?? item?.threadRootId ?? '');
    return parentId === normalizedRootId || rootId === normalizedRootId;
  };

  pendingRows.forEach(item => {
    if (isDirectChildOfRoot(item)) {
      includedIds.add(String(item.id));
    }
  });

  let hasChanges = true;
  while (hasChanges) {
    hasChanges = false;

    pendingRows.forEach(item => {
      const currentId = String(item.id);
      if (includedIds.has(currentId)) {
        return;
      }

      const parentId = String(item?.parentId ?? item?.parent_id ?? item?.parentMessageId ?? '');
      const replyTargetId = String(
        item?.replyToCommentId ??
          item?.replyCommentId ??
          item?.toCommentId ??
          item?.parentCommentId ??
          item?.replyMessageId ??
          ''
      );
      const rootId = String(item?.rootMessageId ?? item?.rootCommentId ?? item?.threadRootId ?? '');

      if (
        rootId === normalizedRootId ||
        includedIds.has(parentId) ||
        includedIds.has(replyTargetId) ||
        parentId === normalizedRootId
      ) {
        includedIds.add(currentId);
        hasChanges = true;
      }
    });
  }

  return pendingRows.filter(item => includedIds.has(String(item.id)));
};

const hydrateThreadMessageItems = (rows = [], rootMessageId = null) => {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const normalizedRootId =
    rootMessageId !== undefined && rootMessageId !== null ? String(rootMessageId) : '';
  const rowIdSet = new Set(rows.map(item => String(item?.id ?? '')).filter(Boolean));

  const withStructuralParent = rows.map(item => {
    const currentId = String(item?.id ?? '');
    const directParentId =
      item?.parentId !== undefined && item?.parentId !== null ? String(item.parentId) : '';
    const replyTargetId =
      item?.replyToCommentId !== undefined && item?.replyToCommentId !== null
        ? String(item.replyToCommentId)
        : '';

    let structuralParentId = directParentId;

    if (!structuralParentId || structuralParentId === '0') {
      structuralParentId = normalizedRootId;
    }

    if (
      replyTargetId &&
      replyTargetId !== '0' &&
      replyTargetId !== currentId &&
      (
        (normalizedRootId && directParentId === normalizedRootId) ||
        (!normalizedRootId &&
          directParentId &&
          directParentId !== '0' &&
          rowIdSet.has(replyTargetId))
      )
    ) {
      structuralParentId = replyTargetId;
    }

    return {
      ...item,
      structuralParentId,
    };
  });

  const itemMap = new Map(withStructuralParent.map(item => [String(item.id), item]));

  const resolveThreadRootId = item => {
    let currentItem = item;
    let parentKey = String(currentItem?.structuralParentId ?? '');
    let safetyCount = 0;

    while (
      parentKey &&
      parentKey !== '0' &&
      parentKey !== normalizedRootId &&
      safetyCount < 100
    ) {
      const parentItem = itemMap.get(parentKey);

      if (!parentItem || String(parentItem.id) === String(currentItem.id)) {
        break;
      }

      currentItem = parentItem;
      parentKey = String(currentItem?.structuralParentId ?? '');
      safetyCount += 1;
    }

    return currentItem?.id ?? item?.id;
  };

  return withStructuralParent.map(item => {
    const threadRootId = resolveThreadRootId(item);

    return {
      ...item,
      threadRootId,
      rootCommentId: threadRootId,
    };
  });
};

const buildThreadMessageTree = (rows = [], rootId = null) => {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const normalizedRootId =
    rootId !== undefined && rootId !== null ? String(rootId) : null;
  const nodeMap = new Map();
  const roots = [];

  rows.forEach(row => {
    if (!row?.id) {
      return;
    }

    nodeMap.set(String(row.id), {
      ...row,
      children: [],
    });
  });

  rows.forEach(row => {
    if (!row?.id) {
      return;
    }

    const currentId = String(row.id);
    const node = nodeMap.get(currentId);
    const parentKey = String(row.structuralParentId ?? row.parentId ?? '');

    if (
      !parentKey ||
      parentKey === '0' ||
      parentKey === currentId ||
      (normalizedRootId && parentKey === normalizedRootId)
    ) {
      roots.push(node);
      return;
    }

    const parentNode = nodeMap.get(parentKey);

    if (!parentNode) {
      roots.push(node);
      return;
    }

    parentNode.children.push(node);
  });

  return roots;
};

const flattenThreadMessageTree = (nodes = [], accumulator = []) => {
  nodes.forEach(node => {
    accumulator.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenThreadMessageTree(node.children, accumulator);
    }
  });

  return accumulator;
};

const resolveThreadReplyCounts = (rows = [], rootId = null) => {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const replyCountMap = new Map();

  const traverse = nodes => {
    nodes.forEach(node => {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length > 0) {
        traverse(children);
      }
      const descendantCount = children.reduce((total, child) => {
        const childDescendantCount = replyCountMap.get(String(child.id)) ?? 0;
        return total + 1 + childDescendantCount;
      }, 0);
      replyCountMap.set(String(node.id), descendantCount);
    });
  };

  const tree = buildThreadMessageTree(rows, rootId);
  traverse(tree);

  return rows.map(item => ({
    ...item,
    replyCount: Math.max(Number(item?.replyCount) || 0, replyCountMap.get(String(item?.id)) ?? 0),
    raw:
      item?.raw && typeof item.raw === 'object'
        ? {
            ...item.raw,
            replyCount: Math.max(
              Number(item?.replyCount) || 0,
              replyCountMap.get(String(item?.id)) ?? 0
            ),
          }
        : item?.raw,
  }));
};

const applyMessagePatch = (message, patch = {}) => {
  if (!message) {
    return message;
  }

  const nextRaw =
    message?.raw && typeof message.raw === 'object'
      ? {
          ...message.raw,
          ...patch,
        }
      : message?.raw;

  if (nextRaw !== undefined) {
    return {
      ...message,
      ...patch,
      raw: nextRaw,
    };
  }

  return {
    ...message,
    ...patch,
  };
};

const getGroupRoleMeta = userRole => {
  if (Number(userRole) === 2) {
    return {
      label: '管理员',
      backgroundColor: '#eff6ff',
      color: '#2563eb',
    };
  }

  if (Number(userRole) === 1) {
    return {
      label: '成员',
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
    };
  }

  return null;
};

const getGroupStatusMeta = status => {
  if (Number(status) === 2) {
    return {
      label: '群组已解散',
      color: '#ef4444',
    };
  }

  if (Number(status) === 1) {
    return {
      label: '群组状态正常',
      color: '#22c55e',
    };
  }

  return null;
};

export default function GroupChatScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isExpandedErrorDetailEnabled = isDevPreviewFeatureEnabled({
    isDev: __DEV__,
    simulateProduction: SIMULATE_PRODUCTION,
    platformOS: Platform.OS,
    updatesChannel: Updates.channel,
  });
  const [messages, setMessages] = useState([]);
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showReplyListModal, setShowReplyListModal] = useState(false);
  const [showReplyThreadModal, setShowReplyThreadModal] = useState(false);
  const [showWriteMessageModal, setShowWriteMessageModal] = useState(false);
  const [writeMessageText, setWriteMessageText] = useState('');
  const [showMessageImagePicker, setShowMessageImagePicker] = useState(false);
  const [selectedMessageImage, setSelectedMessageImage] = useState('');
  const [messageComposerKeyboardVisible, setMessageComposerKeyboardVisible] = useState(false);
  const [androidComposerKeyboardOffset, setAndroidComposerKeyboardOffset] = useState(0);
  const [androidComposerReady, setAndroidComposerReady] = useState(Platform.OS !== 'android');
  const [pendingComposerToolbarAction, setPendingComposerToolbarAction] = useState(null);
  const [isComposerMentionPanelPinned, setIsComposerMentionPanelPinned] = useState(false);
  const [composerSheetHeight, setComposerSheetHeight] = useState(0);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyParentMessageId, setReplyParentMessageId] = useState(null);
  const [replyComposerReturnTarget, setReplyComposerReturnTarget] = useState(null);
  const [replyKeyboardOffset, setReplyKeyboardOffset] = useState(0);
  const [currentReplyMessageId, setCurrentReplyMessageId] = useState(null);
  const [currentReplyRootId, setCurrentReplyRootId] = useState(null);
  const [messageRepliesMap, setMessageRepliesMap] = useState({});
  const [replyLoadingMap, setReplyLoadingMap] = useState({});
  const [replyErrorMap, setReplyErrorMap] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [questionGroups, setQuestionGroups] = useState([]);
  const [questionGroupIds, setQuestionGroupIds] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupLoadError, setGroupLoadError] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState('');
  const hasActiveMessageLayer =
    showReplyModal || showReplyListModal || showReplyThreadModal || showWriteMessageModal;
  const replyModalBottomPadding = Math.max(insets.bottom, 16) + 12;
  const replyModalMaxHeight = useMemo(() => {
    const defaultHeight = Math.round(windowHeight * 0.58);
    const availableHeight = Math.max(320, windowHeight - replyKeyboardOffset - 48);
    return Math.min(defaultHeight, availableHeight);
  }, [replyKeyboardOffset, windowHeight]);
  const [messageSummary, setMessageSummary] = useState({
    total: 0,
    featuredCount: 0,
  });
  const [messageReloadKey, setMessageReloadKey] = useState(0);
  const [publishingMessage, setPublishingMessage] = useState(false);
  const [publishingReply, setPublishingReply] = useState(false);
  const locale = i18n?.locale || 'en';
  const composerInputRef = useRef(null);
  const showWriteMessageModalRef = useRef(false);
  const composerFocusTimeoutsRef = useRef([]);
  const composerFocusInteractionRef = useRef(null);
  const composerLayoutFocusedRef = useRef(false);
  const joinRequestMapRef = useRef(new Map());
  const getMessageLikedState = message => liked[message?.id] !== undefined ? liked[message.id] : !!message?.liked;
  const getMessageDislikedState = message =>
    disliked[message?.id] !== undefined ? disliked[message.id] : !!message?.disliked;
  const getMessageBookmarkedState = message =>
    bookmarked[message?.id] !== undefined ? bookmarked[message.id] : !!message?.collected;
  const currentReplyMessage =
    messages.find(item => String(item.id) === String(currentReplyMessageId)) || null;
  const currentMessageReplies = currentReplyMessageId ? messageRepliesMap[currentReplyMessageId] || [] : [];
  const currentReplyLoading = currentReplyMessageId ? Boolean(replyLoadingMap[currentReplyMessageId]) : false;
  const currentReplyError = currentReplyMessageId ? replyErrorMap[currentReplyMessageId] || '' : '';
  const topLevelMessageNodes = useMemo(() => buildThreadMessageTree(messages), [messages]);
  const {
    recommendedMentionUsers,
    resetRecommendedMentionUsers,
  } = useRecommendedMentionUsers({
    visible: showWriteMessageModal,
    scene: 'group-message',
  });
  const {
    activeMention,
    candidateUsers,
    focusInput: focusMentionInput,
    handleMentionPress: triggerMentionPress,
    handleMentionSelect: handleComposerMentionSelect,
    handleSelectionChange: handleComposerSelectionChange,
    listMaxHeight: composerMentionListMaxHeight,
    mentionBottomInset: composerMentionBottomInset,
    mentionLoading: composerMentionLoading,
    panelAnimatedStyle: composerMentionPanelAnimatedStyle,
    panelBottomOffset: composerMentionPanelBottomOffset,
    panelMaxHeight: composerMentionPanelMaxHeight,
    renderMentionPanel: shouldRenderComposerMentionPanel,
    selection: composerSelection,
  } = useMentionComposer({
    visible: showWriteMessageModal,
    text: writeMessageText,
    onChangeText: setWriteMessageText,
    inputRef: composerInputRef,
    windowHeight,
    bottomInset: Math.max(insets.bottom, 12),
    recommendedUsers: recommendedMentionUsers,
    baseBottomOffset: DEFAULT_MENTION_PANEL_BASE_OFFSET,
    onInvalidMention: () => showToast('该用户缺少可用名称', 'warning'),
  });

  const clearComposerFocusRequests = () => {
    composerFocusTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    composerFocusTimeoutsRef.current = [];
    composerFocusInteractionRef.current?.cancel?.();
    composerFocusInteractionRef.current = null;
  };

  const focusComposerInput = () => {
    clearComposerFocusRequests();

    const triggerFocus = () => {
      if (showWriteMessageModalRef.current) {
        composerInputRef.current?.focus();
      }
    };

    requestAnimationFrame(triggerFocus);
    composerFocusTimeoutsRef.current = [
      setTimeout(triggerFocus, 60),
      setTimeout(triggerFocus, 140),
    ];
    composerFocusInteractionRef.current = InteractionManager.runAfterInteractions(triggerFocus);
  };

  useEffect(() => {
    showWriteMessageModalRef.current = showWriteMessageModal;
  }, [showWriteMessageModal]);

  useEffect(() => {
    if (!showWriteMessageModal) {
      clearComposerFocusRequests();
      composerLayoutFocusedRef.current = false;
      setMessageComposerKeyboardVisible(false);
      setAndroidComposerKeyboardOffset(0);
      setAndroidComposerReady(Platform.OS !== 'android');
      setPendingComposerToolbarAction(null);
      setIsComposerMentionPanelPinned(false);
      setComposerSheetHeight(0);
      return undefined;
    }

    if (Platform.OS === 'android') {
      composerLayoutFocusedRef.current = false;
      setAndroidComposerReady(false);
    }

    const handleKeyboardShow = event => {
      setMessageComposerKeyboardVisible(true);

      if (Platform.OS === 'android') {
        const keyboardMetrics = resolveComposerKeyboardMetrics({
          platform: Platform.OS,
          windowHeight,
          keyboardHeight: event?.endCoordinates?.height || 0,
          keyboardScreenY: event?.endCoordinates?.screenY ?? windowHeight,
          footerBottomInset: Math.max(insets.bottom, 12),
          androidFooterClearance: 0,
        });

        setAndroidComposerKeyboardOffset(Math.max(keyboardMetrics.overlayOffset, 0));
        setAndroidComposerReady(true);
      }
    };
    const handleKeyboardHide = () => {
      setMessageComposerKeyboardVisible(false);

      if (Platform.OS === 'android') {
        setAndroidComposerKeyboardOffset(0);
      }
    };

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', handleKeyboardShow),
      Keyboard.addListener('keyboardDidHide', handleKeyboardHide),
    ];

    if (Platform.OS === 'ios') {
      subscriptions.push(Keyboard.addListener('keyboardWillShow', handleKeyboardShow));
      subscriptions.push(Keyboard.addListener('keyboardWillHide', handleKeyboardHide));
    }

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [insets.bottom, showWriteMessageModal, windowHeight]);

  useEffect(() => {
    if (!showWriteMessageModal || !pendingComposerToolbarAction) {
      return undefined;
    }

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      runComposerToolbarAction(pendingComposerToolbarAction);
      setPendingComposerToolbarAction(null);
    });

    return () => {
      hideSubscription.remove();
    };
  }, [pendingComposerToolbarAction, showWriteMessageModal]);

  useEffect(() => {
    if (!isComposerMentionPanelPinned) {
      return undefined;
    }

    if (shouldRenderComposerMentionPanel) {
      return undefined;
    }

    const normalizedText = String(writeMessageText ?? '');
    const cursor = Math.max(
      0,
      Math.min(Number(composerSelection?.start ?? normalizedText.length) || 0, normalizedText.length)
    );
    const textBeforeCursor = normalizedText.slice(0, cursor);

    if (textBeforeCursor.endsWith('@')) {
      return undefined;
    }

    setIsComposerMentionPanelPinned(false);
    return undefined;
  }, [
    composerSelection?.start,
    isComposerMentionPanelPinned,
    shouldRenderComposerMentionPanel,
    writeMessageText,
  ]);

  useEffect(() => {
    logGroupChatDebug('screen init', {
      routeQuestionId: route?.params?.questionId,
      routeGroupId: route?.params?.groupId,
      routeGroup: route?.params?.group,
      question: route?.params?.question,
    });
  }, [route?.params?.group, route?.params?.groupId, route?.params?.question, route?.params?.questionId]);

  const question = route?.params?.question || DEFAULT_QUESTION;
  const questionId = route?.params?.questionId || question?.id;
  const routeGroupId = normalizeGroupId(
    route?.params?.groupId ??
      route?.params?.group?.id ??
      route?.params?.group?.groupId ??
      question?.groupId ??
      question?.publicGroupId ??
      question?.questionGroupId
  );
  const currentGroup = useMemo(() => pickPreferredGroup(questionGroups), [questionGroups]);
  const currentGroupId = getGroupIdValue(currentGroup) ?? routeGroupId ?? normalizeGroupId(questionGroupIds[0]);
  const displayMemberCount = currentGroup?.memberCount ?? question.memberCount ?? 0;
  const displayMaxMembers = currentGroup?.maxMembers ?? 0;
  const displayAvatar =
    currentGroup?.avatar ||
    question.avatar ||
    (question.userId
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=user${question.userId}`
      : DEFAULT_QUESTION.avatar);
  const displayName = question.author || t('screens.groupChat.questioner');
  const displayDescription = currentGroup?.description || '';
  const displayQuestionTitle = currentGroup?.name || question.title || t('screens.groupChat.title');
  const displayCapacity =
    currentGroup && displayMaxMembers > 0 ? `${displayMemberCount}/${displayMaxMembers}` : '';
  const canOpenMessageComposer = hasGroupIdValue(currentGroupId);
  const disabledComposerHint = groupLoadError || t('screens.groupChat.groupNotFound');
  const groupRoleMeta = getGroupRoleMeta(currentGroup?.userRole);
  const groupStatusMeta = getGroupStatusMeta(currentGroup?.status);
  const groupStatusText =
    !currentGroup && !groupLoading && !groupLoadError ? '当前问题暂无关联群组' : groupStatusMeta?.label || '';

  useEffect(() => {
    const routeGroup = route?.params?.group;

    if (!routeGroup || typeof routeGroup !== 'object') {
      setQuestionGroups(prev => (prev.length ? [] : prev));
      setGroupLoading(false);
      return undefined;
    }

    const groups = normalizeQuestionGroupsResponse({ data: routeGroup });
    setQuestionGroups(prev => (areQuestionGroupsEqual(prev, groups) ? prev : groups));
    setGroupLoading(false);
    return undefined;
  }, [route?.params?.group]);

  useEffect(() => {
    setIsJoined(prev => {
      const nextValue = Boolean(currentGroup?.isJoined);
      return prev === nextValue ? prev : nextValue;
    });
  }, [currentGroup]);

  useEffect(() => {
    let isMounted = true;
    let interactionTask = null;

    if (!questionId) {
      setQuestionGroups(prev => (prev.length ? [] : prev));
      setQuestionGroupIds(prev => (prev.length ? [] : prev));
      setGroupLoadError(prev => (prev ? '' : prev));
      setGroupLoading(false);
      return undefined;
    }

    const loadQuestionGroups = async () => {
      setGroupLoading(true);
      setGroupLoadError('');

      try {
        const groups = await fetchQuestionGroups();

        if (!isMounted) {
          return;
        }

        if (groups.length > 0) {
          return;
        }

        await fetchQuestionGroupIds();
      } catch (error) {
        if (isMounted) {
          const nextError = getGroupChatErrorMessage(error, t('screens.groupChat.groupInfoUnavailable'));
          setQuestionGroups(prev => (prev.length ? [] : prev));
          setQuestionGroupIds(prev => (prev.length ? [] : prev));
          setGroupLoadError(prev => (prev === nextError ? prev : nextError));
        }
      } finally {
        if (isMounted) {
          setGroupLoading(false);
        }
      }
    };

    interactionTask = InteractionManager.runAfterInteractions(() => {
      if (isMounted) {
        loadQuestionGroups();
      }
    });

    return () => {
      isMounted = false;
      interactionTask?.cancel?.();
    };
  }, [questionId]);

  const fetchQuestionGroups = async () => {
    if (!questionId) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    logGroupChatDebug('fetchQuestionGroups:start', {
      questionId,
      routeGroupId,
      routeQuestion: question,
    });
    const response = await questionApi.getQuestionGroups(questionId);
    logGroupChatDebug('fetchQuestionGroups:response', response);

    if (!isSuccessResponse(response)) {
      throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.groupInfoUnavailable')));
    }

    const groups = normalizeQuestionGroupsResponse(response);
    const nextGroupIds = extractGroupIdsFromGroups(groups);
    logGroupChatDebug('fetchQuestionGroups:normalized', {
      questionId,
      groups,
      nextGroupIds,
    });

    setQuestionGroups(prev => (areQuestionGroupsEqual(prev, groups) ? prev : groups));
    setQuestionGroupIds(prev => (arePrimitiveArraysEqual(prev, nextGroupIds) ? prev : nextGroupIds));
    setGroupLoadError(prev => (prev ? '' : prev));

    return groups;
  };

  const fetchQuestionGroupIds = async () => {
    if (!questionId) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    logGroupChatDebug('fetchQuestionGroupIds:start', {
      questionId,
      routeGroupId,
      cachedQuestionGroupIds: questionGroupIds,
    });
    const response = await questionApi.getQuestionGroupIds(questionId);
    logGroupChatDebug('fetchQuestionGroupIds:response', response);

    if (!isSuccessResponse(response)) {
      throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.groupInfoUnavailable')));
    }

    const groupIds = normalizeQuestionGroupIdsResponse(response);
    logGroupChatDebug('fetchQuestionGroupIds:normalized', {
      questionId,
      rawData: response?.data,
      groupIds,
    });
    if (!groupIds.length) {
      setQuestionGroupIds(prev => (prev.length ? [] : prev));
      throw new Error(t('screens.groupChat.groupNotFound'));
    }

    setQuestionGroupIds(prev => (arePrimitiveArraysEqual(prev, groupIds) ? prev : groupIds));
    setGroupLoadError(prev => (prev ? '' : prev));
    return groupIds;
  };

  const applyJoinedStateForGroup = targetGroupId => {
    const normalizedTargetGroupId = String(targetGroupId ?? '').trim();

    if (!normalizedTargetGroupId) {
      return;
    }

    setIsJoined(true);
    setQuestionGroups(prevGroups =>
      prevGroups.map(group =>
        String(getGroupIdValue(group) ?? '').trim() === normalizedTargetGroupId
          ? {
              ...group,
              isJoined: true,
            }
          : group
      )
    );
  };

  const ensureJoinedGroup = async (targetGroupId, { refreshOnSuccess = true } = {}) => {
    const normalizedGroupId = normalizeGroupId(targetGroupId);

    if (normalizedGroupId === null) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    const groupIdKey = String(normalizedGroupId);
    const matchedGroup = questionGroups.find(
      group => String(getGroupIdValue(group) ?? '').trim() === groupIdKey
    );

    if (
      matchedGroup?.isJoined ||
      (isJoined && String(currentGroupId ?? '').trim() === groupIdKey)
    ) {
      return matchedGroup;
    }

    const inFlightRequest = joinRequestMapRef.current.get(groupIdKey);
    if (inFlightRequest) {
      return inFlightRequest;
    }

    const joinRequest = (async () => {
      const response = await questionApi.joinQuestionGroup(normalizedGroupId);

      if (!isJoinGroupSuccessResponse(response)) {
        throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.groupInfoUnavailable')));
      }

      applyJoinedStateForGroup(groupIdKey);

      if (refreshOnSuccess) {
        try {
          await fetchQuestionGroups();
        } catch (refreshError) {}
      }

      return response?.data ?? {};
    })();

    joinRequestMapRef.current.set(groupIdKey, joinRequest);

    try {
      return await joinRequest;
    } finally {
      joinRequestMapRef.current.delete(groupIdKey);
    }
  };

  useEffect(() => {
    setCurrentReplyMessageId(null);
    setCurrentReplyRootId(null);
    setReplyTarget(null);
    setReplyParentMessageId(null);
    setReplyText('');
    setReplyComposerReturnTarget(null);
    setShowReplyModal(false);
    setShowReplyListModal(false);
    setShowReplyThreadModal(false);
    setReplyKeyboardOffset(0);
    setMessageRepliesMap(prev => (Object.keys(prev).length ? {} : prev));
    setReplyLoadingMap(prev => (Object.keys(prev).length ? {} : prev));
    setReplyErrorMap(prev => (Object.keys(prev).length ? {} : prev));
  }, [currentGroupId]);

  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) {
        return prev;
      }

      const localizedMessages = sanitizeTopLevelMessageItems(
        resolveThreadReplyCounts(
          hydrateThreadMessageItems(
            prev.map((item, index) =>
              normalizeThreadMessageItem(item?.raw ?? item, index, t, {
                parentId: item?.parentId,
                replyToCommentId: item?.replyToCommentId,
                replyToUserName: item?.replyToUserName,
                replyCount: item?.replyCount,
              })
            )
          )
        )
      );
      return areMessageItemsEqual(prev, localizedMessages) ? prev : localizedMessages;
    });
  }, [locale]);

  useEffect(() => {
    let isMounted = true;
    let interactionTask = null;

    if (!hasGroupIdValue(currentGroupId)) {
      setMessages(prev => (prev.length ? [] : prev));
      setMessageSummary(prev =>
        isSameMessageSummary(prev, {
          total: 0,
          featuredCount: 0,
        })
          ? prev
          : {
              total: 0,
              featuredCount: 0,
            }
      );
      setMessageError(prev => (prev ? '' : prev));
      setMessageLoading(false);
      return undefined;
    }

    const loadGroupMessages = async () => {
      setMessageLoading(true);
      setMessageError('');
      try {
        const response = await apiClient.get(API_ENDPOINTS.GROUP.MESSAGE_PUBLIC_LIST, {
          ...GROUP_API_REQUEST_CONFIG,
          params: {
            groupId: Number(currentGroupId),
            isBoutique: activeTab === 'featured' ? 1 : 0,
          },
        });
        if (!isSuccessResponse(response)) {
          throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.loadFailed')));
        }
        const normalizedResult = normalizeGroupMessagesResponse(response, t);

        if (isMounted) {
          const nextLikedState = normalizedResult.messages.reduce((result, item) => {
            result[item.id] = Boolean(item.liked);
            return result;
          }, {});
          const nextDislikedState = normalizedResult.messages.reduce((result, item) => {
            result[item.id] = Boolean(item.disliked);
            return result;
          }, {});
          const nextBookmarkedState = normalizedResult.messages.reduce((result, item) => {
            result[item.id] = Boolean(item.collected);
            return result;
          }, {});

          setMessages(prev =>
            areMessageItemsEqual(prev, normalizedResult.messages) ? prev : normalizedResult.messages
          );
          setLiked(nextLikedState);
          setDisliked(nextDislikedState);
          setBookmarked(nextBookmarkedState);
          setMessageSummary(prev =>
            isSameMessageSummary(prev, {
              total: normalizedResult.total,
              featuredCount: normalizedResult.featuredCount,
            })
              ? prev
              : {
                  total: normalizedResult.total,
                  featuredCount: normalizedResult.featuredCount,
                }
          );
        }
      } catch (error) {
        if (isMounted) {
          const nextError = getGroupChatErrorMessage(error, t('screens.groupChat.loadFailed'));
          setMessages(prev => (prev.length ? [] : prev));
          setMessageSummary(prev =>
            isSameMessageSummary(prev, {
              total: 0,
              featuredCount: 0,
            })
              ? prev
              : {
                  total: 0,
                  featuredCount: 0,
                }
          );
          setMessageError(prev => (prev === nextError ? prev : nextError));
        }
      } finally {
        if (isMounted) {
          setMessageLoading(false);
        }
      }
    };

    interactionTask = InteractionManager.runAfterInteractions(() => {
      if (isMounted) {
        loadGroupMessages();
      }
    });

    return () => {
      isMounted = false;
      interactionTask?.cancel?.();
    };
  }, [activeTab, currentGroupId, messageReloadKey]);

  useEffect(() => {
    if (!showWriteMessageModal) {
      return undefined;
    }

    let androidRevealTimer = null;
    let androidRefocusTimer = null;

    focusComposerInput();

    if (Platform.OS === 'android') {
      androidRefocusTimer = setTimeout(() => {
        focusComposerInput();
      }, 80);

      androidRevealTimer = setTimeout(() => {
        setAndroidComposerReady(true);
      }, 260);
    }

    return () => {
      if (androidRevealTimer) {
        clearTimeout(androidRevealTimer);
      }
      if (androidRefocusTimer) {
        clearTimeout(androidRefocusTimer);
      }
      clearComposerFocusRequests();
    };
  }, [showWriteMessageModal]);

  useEffect(() => {
    if (!showReplyModal) {
      setReplyKeyboardOffset(0);
      return undefined;
    }

    const resolveReplyKeyboardOffset = event => {
      const keyboardTop = Number(event?.endCoordinates?.screenY);
      const occupiedHeight = Number.isFinite(keyboardTop) ? Math.max(0, windowHeight - keyboardTop) : 0;
      const keyboardHeight = Math.max(occupiedHeight, Math.max(0, event?.endCoordinates?.height || 0));
      if (!keyboardHeight) {
        setReplyKeyboardOffset(0);
        return;
      }

      setReplyKeyboardOffset(
        Platform.OS === 'ios'
          ? Math.max(0, keyboardHeight - insets.bottom)
          : Math.max(0, keyboardHeight)
      );
    };

    const handleReplyKeyboardHide = () => {
      setReplyKeyboardOffset(0);
    };

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', resolveReplyKeyboardOffset),
      Keyboard.addListener('keyboardDidHide', handleReplyKeyboardHide),
    ];

    if (Platform.OS === 'ios') {
      subscriptions.push(Keyboard.addListener('keyboardWillChangeFrame', resolveReplyKeyboardOffset));
      subscriptions.push(Keyboard.addListener('keyboardWillHide', handleReplyKeyboardHide));
    }

    return () => {
      subscriptions.forEach(subscription => subscription.remove());
      setReplyKeyboardOffset(0);
    };
  }, [insets.bottom, showReplyModal, windowHeight]);

  useEffect(() => {
    if (canOpenMessageComposer || !showWriteMessageModal) {
      return;
    }

    clearComposerFocusRequests();
    setShowWriteMessageModal(false);
    setWriteMessageText('');
    setSelectedMessageImage('');
  }, [canOpenMessageComposer, showWriteMessageModal]);

  const ensureCurrentGroupId = async () => {
    logGroupChatDebug('ensureCurrentGroupId:input', {
      currentGroupId,
      routeGroupId,
      questionGroupIds,
      currentGroup,
    });

    if (hasGroupIdValue(currentGroupId)) {
      logGroupChatDebug('ensureCurrentGroupId:useCurrentGroupId', currentGroupId);
      return currentGroupId;
    }

    if (hasGroupIdValue(routeGroupId)) {
      logGroupChatDebug('ensureCurrentGroupId:useRouteGroupId', routeGroupId);
      return routeGroupId;
    }

    if (questionGroupIds.length > 0) {
      logGroupChatDebug('ensureCurrentGroupId:useCachedQuestionGroupId', questionGroupIds[0]);
      return questionGroupIds[0];
    }
    const groupIds = await fetchQuestionGroupIds();
    const targetGroupId = groupIds[0];
    logGroupChatDebug('ensureCurrentGroupId:fetchedFallbackGroupIds', groupIds);

    if (!hasGroupIdValue(targetGroupId)) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    return targetGroupId;
  };

  const createGroupMessage = async ({
    content,
    parentId = 0,
    replyToCommentId = 0,
    replyToUserName = '',
    imageUrls = [],
  }) => {
    const resolvedGroupId = await ensureCurrentGroupId();
    await ensureJoinedGroup(resolvedGroupId, { refreshOnSuccess: !isJoined });
    const token = await AsyncStorage.getItem('authToken');
    const normalizedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter(url => typeof url === 'string' && url.trim())
      : [];
    logGroupChatDebug('createGroupMessage:payload', {
      resolvedGroupId,
      currentGroupId,
      routeGroupId,
      questionGroupIds,
      parentId,
      contentLength: String(content ?? '').trim().length,
      imageCount: normalizedImageUrls.length,
    });
    const response = await apiClient.post(
      API_ENDPOINTS.GROUP.MESSAGE_CREATE,
      {
        groupId: Number(resolvedGroupId) || 0,
        content: String(content ?? '').trim(),
        parentId: Number(parentId) || 0,
        isBoutique: 0,
        ...(normalizedImageUrls.length > 0
          ? {
              imageUrls: normalizedImageUrls,
              images: normalizedImageUrls,
              imageUrl: normalizedImageUrls[0],
            }
          : {}),
      },
      {
        ...GROUP_API_REQUEST_CONFIG,
        headers: token
          ? {
              token,
            }
          : undefined,
      }
    );
    logGroupChatDebug('createGroupMessage:response', response);

    if (!isSuccessResponse(response) || !response?.data) {
      throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.publishFailed')));
    }

    return normalizeThreadMessageItem(response.data, 0, t, {
      parentId,
      replyToCommentId,
      replyToUserName,
      imageUrls: normalizedImageUrls,
    });
  };

  const appendCreatedMessage = (createdMessage, parentMessageId = null) => {
    setMessages(prev => {
      const nextMessages = [createdMessage, ...prev];

      if (!parentMessageId) {
        return nextMessages;
      }

      return nextMessages.map(message =>
        String(message.id) === String(parentMessageId)
          ? applyMessagePatch(message, {
              replyCount: (message.replyCount || 0) + 1,
            })
          : message
      );
    });

    setLiked(prev => ({
      ...prev,
      [createdMessage.id]: Boolean(createdMessage.liked),
    }));
    setDisliked(prev => ({
      ...prev,
      [createdMessage.id]: Boolean(createdMessage.disliked),
    }));
    setBookmarked(prev => ({
      ...prev,
      [createdMessage.id]: Boolean(createdMessage.collected),
    }));

    setMessageSummary(prev => ({
      ...prev,
      total: Math.max((prev?.total ?? 0) + 1, 1),
      featuredCount:
        (prev?.featuredCount ?? 0) + (createdMessage.isFeatured ? 1 : 0),
    }));
  };

  const getThreadReplies = messageId => {
    if (!messageId) {
      return [];
    }

    return messageRepliesMap[messageId] || [];
  };

  const findReplyById = (messageId, replyId) => {
    if (!messageId || !replyId) {
      return null;
    }

    return getThreadReplies(messageId).find(item => String(item.id) === String(replyId)) || null;
  };

  const getTopLevelReplies = messageId =>
    buildThreadMessageTree(getThreadReplies(messageId), messageId);

  const getReplyThreadRootId = (messageId, replyId) => {
    if (!messageId || !replyId) {
      return null;
    }

    let currentReply = findReplyById(messageId, replyId);
    let safetyCount = 0;
    const normalizedMessageId = String(messageId);

    while (
      currentReply &&
      currentReply?.structuralParentId &&
      String(currentReply.structuralParentId) !== normalizedMessageId &&
      String(currentReply.structuralParentId) !== '0' &&
      safetyCount < 100
    ) {
      const parentReply = findReplyById(messageId, currentReply.structuralParentId);

      if (!parentReply || String(parentReply.id) === String(currentReply.id)) {
        break;
      }

      currentReply = parentReply;
      safetyCount += 1;
    }

    return currentReply?.id ?? replyId;
  };

  const currentTopLevelReplies = currentReplyMessageId ? getTopLevelReplies(currentReplyMessageId) : [];
  const currentThreadRootReply =
    currentReplyMessageId && currentReplyRootId
      ? findReplyById(currentReplyMessageId, currentReplyRootId)
      : null;
  const currentThreadReplyNodes = currentThreadRootReply
    ? buildThreadMessageTree(
        currentMessageReplies.filter(
          item =>
            String(item.threadRootId) === String(currentThreadRootReply.id) &&
            String(item.id) !== String(currentThreadRootReply.id)
        ),
        currentThreadRootReply.id
      )
    : [];

  const requestMessageRepliesSnapshot = async messageId => {
    const resolvedMessageId = Number(messageId) || 0;

    if (!resolvedMessageId) {
      return {
        replies: [],
        totalCount: 0,
      };
    }

    const resolvedGroupId = await ensureCurrentGroupId();
    const token = await AsyncStorage.getItem('authToken');
    const requestParams = {
      groupId: Number(resolvedGroupId) || 0,
      parentId: resolvedMessageId,
      pageNum: 1,
      pageSize: 200,
    };
    const requestCandidates = [
      {
        endpoint: API_ENDPOINTS.GROUP.MESSAGE_PUBLIC_LIST,
        params: {
          ...requestParams,
          isBoutique: 0,
        },
        headers: undefined,
        validateRows: rows => Array.isArray(rows),
      },
      {
        endpoint: API_ENDPOINTS.GROUP.MESSAGE_LIST,
        params: requestParams,
        headers: token
          ? {
              token,
            }
          : undefined,
      },
    ];

    let response = null;
    let responseRows = [];
    let lastLoadError = null;

    for (const candidate of requestCandidates) {
      try {
        const nextResponse = await apiClient.get(candidate.endpoint, {
          ...GROUP_API_REQUEST_CONFIG,
          params: candidate.params,
          headers: candidate.headers,
        });

        if (!isSuccessResponse(nextResponse)) {
          throw new Error(getGroupChatErrorMessage(nextResponse, t('screens.groupChat.loadFailed')));
        }

        const nextRows = extractGroupMessageRows(nextResponse);
        const isValidResponse = candidate.validateRows ? candidate.validateRows(nextRows) : true;

        if (!isValidResponse) {
          throw new Error('Reply list response did not contain threaded rows');
        }

        response = nextResponse;
        responseRows = nextRows;
        lastLoadError = null;
        break;
      } catch (candidateError) {
        lastLoadError = candidateError;
        console.warn('[GroupChat] Reply list request failed:', {
          endpoint: candidate.endpoint,
          params: candidate.params,
          error: candidateError,
        });
      }
    }

    if (!response) {
      throw lastLoadError || new Error(t('screens.groupChat.loadFailed'));
    }

    const filteredRows = filterThreadRowsForMessage(responseRows, resolvedMessageId);
    const responseReplyRowCount = responseRows.filter(
      item => String(item?.id ?? '') !== String(resolvedMessageId)
    ).length;
    const allRowsBelongToCurrentRoot =
      filteredRows.length > 0 && filteredRows.length === responseReplyRowCount;
    const responseTotalCount = extractGroupMessageTotalCount(response);
    const hydratedReplies = resolveThreadReplyCounts(
      hydrateThreadMessageItems(
        filteredRows
          .map((item, index) =>
            normalizeThreadMessageItem(item, index, t, {
              parentId:
                item?.parentId ??
                item?.parent_id ??
                item?.parentMessageId ??
                item?.rootMessageId ??
                item?.rootCommentId ??
                resolvedMessageId,
            })
          )
          .filter(item => String(item.id) !== String(resolvedMessageId)),
        resolvedMessageId
      ),
      resolvedMessageId
    );

    return {
      replies: hydratedReplies,
      totalCount: allRowsBelongToCurrentRoot
        ? Math.max(responseTotalCount, hydratedReplies.length)
        : hydratedReplies.length,
    };
  };

  const updateMessageItemById = (targetId, updater) => {
    if (!targetId || typeof updater !== 'function') {
      return;
    }

    setMessages(prevMessages =>
      prevMessages.map(item =>
        String(item.id) === String(targetId) ? applyMessagePatch(item, updater(item)) : item
      )
    );

    setMessageRepliesMap(prevMap => {
      let hasChanged = false;
      const nextMap = Object.keys(prevMap).reduce((result, key) => {
        const currentList = Array.isArray(prevMap[key]) ? prevMap[key] : [];
        const nextList = currentList.map(item => {
          if (String(item.id) !== String(targetId)) {
            return item;
          }

          hasChanged = true;
          return applyMessagePatch(item, updater(item));
        });

        result[key] = nextList;
        return result;
      }, {});

      return hasChanged ? nextMap : prevMap;
    });
  };

  const toggleMessageLike = message => {
    const targetId = message?.id;
    const likedState = getMessageLikedState(message);
    const dislikedState = getMessageDislikedState(message);

    if (!targetId || isLikeInteractionDisabled(likedState, dislikedState)) {
      return;
    }

    const nextLikedState = !likedState;
    setLiked(prev => ({
      ...prev,
      [targetId]: nextLikedState,
    }));
    updateMessageItemById(targetId, currentItem => ({
      liked: nextLikedState,
      likes: Math.max((Number(currentItem?.likes) || 0) + (nextLikedState ? 1 : -1), 0),
    }));
  };

  const toggleMessageDislike = message => {
    const targetId = message?.id;
    const likedState = getMessageLikedState(message);
    const dislikedState = getMessageDislikedState(message);

    if (!targetId || isDislikeInteractionDisabled(likedState, dislikedState)) {
      return;
    }

    const nextDislikedState = !dislikedState;
    setDisliked(prev => ({
      ...prev,
      [targetId]: nextDislikedState,
    }));
    updateMessageItemById(targetId, currentItem => ({
      disliked: nextDislikedState,
      dislikes: Math.max((Number(currentItem?.dislikes) || 0) + (nextDislikedState ? 1 : -1), 0),
    }));
  };

  const toggleMessageBookmark = message => {
    const targetId = message?.id;
    const bookmarkedState = getMessageBookmarkedState(message);

    if (!targetId) {
      return;
    }

    const nextBookmarkedState = !bookmarkedState;
    setBookmarked(prev => ({
      ...prev,
      [targetId]: nextBookmarkedState,
    }));
    updateMessageItemById(targetId, currentItem => ({
      collected: nextBookmarkedState,
      bookmarks: Math.max((Number(currentItem?.bookmarks) || 0) + (nextBookmarkedState ? 1 : -1), 0),
    }));
  };

  const loadMessageReplies = async (messageId, options = {}) => {
    const { forceRefresh = false } = options;
    const resolvedMessageId = Number(messageId) || 0;

    if (!resolvedMessageId) {
      return [];
    }

    if (replyLoadingMap[resolvedMessageId] && !forceRefresh) {
      return getThreadReplies(resolvedMessageId);
    }

    if (getThreadReplies(resolvedMessageId).length > 0 && !forceRefresh) {
      return getThreadReplies(resolvedMessageId);
    }

    try {
      setReplyLoadingMap(prev => ({
        ...prev,
        [resolvedMessageId]: true,
      }));
      setReplyErrorMap(prev => ({
        ...prev,
        [resolvedMessageId]: '',
      }));

      const { replies: hydratedReplies, totalCount } = await requestMessageRepliesSnapshot(
        resolvedMessageId
      );

      setMessageRepliesMap(prev => ({
        ...prev,
        [resolvedMessageId]: hydratedReplies,
      }));

      setMessages(prev =>
        prev.map(message =>
          String(message.id) === String(resolvedMessageId)
            ? applyMessagePatch(message, {
                replyCount: totalCount,
              })
            : message
        )
      );

      return hydratedReplies;
    } catch (error) {
      const currentMessageReplyCount =
        Number(
          messages.find(message => String(message.id) === String(resolvedMessageId))?.replyCount ?? 0
        ) || 0;
      const cachedReplies = getThreadReplies(resolvedMessageId);

      if (cachedReplies.length === 0 && currentMessageReplyCount === 0) {
        setMessageRepliesMap(prev => ({
          ...prev,
          [resolvedMessageId]: [],
        }));
        setReplyErrorMap(prev => ({
          ...prev,
          [resolvedMessageId]: '',
        }));
        return [];
      }

      const fallbackMessage = t('screens.groupChat.loadFailed');
      const normalizedErrorMessage = getGroupChatErrorMessage(error, fallbackMessage);
      const rawErrorMessage = String(error?.data?.msg || error?.msg || error?.message || '').trim();
        const nextError =
          isExpandedErrorDetailEnabled &&
          rawErrorMessage &&
          rawErrorMessage !== normalizedErrorMessage
            ? `${normalizedErrorMessage}\n${rawErrorMessage}`
            : normalizedErrorMessage;
      setReplyErrorMap(prev => ({
        ...prev,
        [resolvedMessageId]: nextError,
      }));
      return [];
    } finally {
      setReplyLoadingMap(prev => ({
        ...prev,
        [resolvedMessageId]: false,
      }));
    }
  };

  const appendCreatedReply = (createdReply, messageId) => {
    if (!messageId || !createdReply) {
      return;
    }

    setMessages(prev => {
      let hasPatchedTarget = false;
      const nextMessages = prev.map(message => {
        if (String(message.id) !== String(messageId)) {
          return message;
        }

        hasPatchedTarget = true;
        return applyMessagePatch(message, {
          replyCount: Math.max((Number(message.replyCount) || 0) + 1, 1),
        });
      });

      return hasPatchedTarget
        ? nextMessages
        : prev;
    });

    setMessageRepliesMap(prev => {
      const currentReplies = prev[messageId] || [];
      const hydratedReplies = resolveThreadReplyCounts(
        hydrateThreadMessageItems(
          [...currentReplies, createdReply].filter(item => String(item.id) !== String(messageId)),
          messageId
        ),
        messageId
      );

      return {
        ...prev,
        [messageId]: hydratedReplies,
      };
    });

    setLiked(prev => ({
      ...prev,
      [createdReply.id]: Boolean(createdReply.liked),
    }));
    setDisliked(prev => ({
      ...prev,
      [createdReply.id]: Boolean(createdReply.disliked),
    }));
    setBookmarked(prev => ({
      ...prev,
      [createdReply.id]: Boolean(createdReply.collected),
    }));

    setReplyErrorMap(prev => ({
      ...prev,
      [messageId]: '',
    }));
  };

  const handlePublishMessage = async (content = '', selectedImages = []) => {
    const trimmedContent = content.trim();
    const normalizedSelectedImages = Array.isArray(selectedImages) ? selectedImages.filter(Boolean) : [];

    if ((!trimmedContent && normalizedSelectedImages.length === 0) || publishingMessage) return;

    try {
      setPublishingMessage(true);
      const uploadedImageUrls = [];

      if (normalizedSelectedImages.length > 0) {
        for (let index = 0; index < normalizedSelectedImages.length; index += 1) {
          const imageUri = normalizedSelectedImages[index];
          const uploadResponse = await uploadApi.uploadImage({
            uri: imageUri,
            name: `group_message_${Date.now()}_${index}.jpg`,
            type: inferUploadMimeType(imageUri),
          });
          const uploadedImageUrl = extractUploadedImageUrl(uploadResponse);

          if (!isSuccessResponse(uploadResponse) || !uploadedImageUrl) {
            throw new Error(t('screens.groupChat.publishFailed'));
          }

          uploadedImageUrls.push(uploadedImageUrl);
        }
      }

      const createdMessage = await createGroupMessage({
        content: trimmedContent,
        parentId: 0,
        imageUrls: uploadedImageUrls,
      });

      appendCreatedMessage(createdMessage);
      setActiveTab('all');
      setWriteMessageText('');
      setSelectedMessageImage('');
      setIsComposerMentionPanelPinned(false);
      resetRecommendedMentionUsers();
      setShowWriteMessageModal(false);
      Keyboard.dismiss();
    } catch (error) {
      console.warn('[GroupChat] Failed to publish message:', error);
      showToast(getGroupChatErrorMessage(error, t('screens.groupChat.publishFailed')), 'error');
    } finally {
      setPublishingMessage(false);
    }
  };

  const openWriteMessageModal = () => {
    if (!canOpenMessageComposer) {
      showToast(disabledComposerHint, 'warning');
      return;
    }

    setShowWriteMessageModal(true);
  };

  const closeWriteMessageModal = () => {
    clearComposerFocusRequests();
    setPendingComposerToolbarAction(null);
    setMessageComposerKeyboardVisible(false);
    setIsComposerMentionPanelPinned(false);
    setShowMessageImagePicker(false);
    setShowWriteMessageModal(false);
    setWriteMessageText('');
    setSelectedMessageImage('');
    resetRecommendedMentionUsers();
    Keyboard.dismiss();
  };

  const runComposerToolbarAction = action => {
    if (action === 'image') {
      setShowMessageImagePicker(true);
      return;
    }

    if (action === 'mention') {
      setIsComposerMentionPanelPinned(true);
      triggerMentionPress({ focusInput: !messageComposerKeyboardVisible });
    }
  };

  const handlePinnedComposerMentionSelect = user => {
    setIsComposerMentionPanelPinned(false);
    handleComposerMentionSelect(user);
  };

  const handleOpenMessageImagePicker = () => {
    clearComposerFocusRequests();
    setPendingComposerToolbarAction(null);
    setIsComposerMentionPanelPinned(false);
    runComposerToolbarAction('image');
    if (messageComposerKeyboardVisible) {
      Keyboard.dismiss();
    }
  };

  const handleMentionPress = () => {
    clearComposerFocusRequests();
    runComposerToolbarAction('mention');
  };

  const shouldShowPinnedComposerMentionPanel =
    shouldRenderComposerMentionPanel || (showWriteMessageModal && isComposerMentionPanelPinned);
  const composerMentionPanelUsers = activeMention ? candidateUsers : recommendedMentionUsers;
  const resolvedComposerMentionPanelAnimatedStyle =
    isComposerMentionPanelPinned && !shouldRenderComposerMentionPanel
      ? {
          opacity: 1,
          transform: [{ translateY: 0 }, { scale: 1 }],
        }
      : composerMentionPanelAnimatedStyle;
  const resolvedComposerMentionPanelMaxHeight = Math.min(
    composerMentionPanelMaxHeight,
    composerSheetHeight > 0
      ? Math.max(96, windowHeight - composerSheetHeight - Math.max(insets.top, 24) - 24)
      : composerMentionPanelMaxHeight
  );
  const resolvedComposerMentionListMaxHeight = Math.min(
    composerMentionListMaxHeight,
    Math.max(72, resolvedComposerMentionPanelMaxHeight - composerMentionBottomInset)
  );

  const handleSelectMessageImage = imageUri => {
    setSelectedMessageImage(imageUri);
    setShowMessageImagePicker(false);
    setPendingComposerToolbarAction(null);
    setTimeout(() => {
      focusComposerInput();
    }, 120);
  };

  const handleExitGroup = () => {
    showAppAlert(t('screens.groupChat.exitConfirmTitle'), t('screens.groupChat.exitConfirmMessage'), [
      {
        text: t('screens.groupChat.cancel'),
        style: 'cancel',
      },
      {
        text: t('screens.groupChat.confirmExit'),
        style: 'destructive',
        onPress: () => {
          setIsJoined(false);
          navigation.goBack();
        },
      },
    ]);
  };

  const restoreReplyParentLayer = target => {
    if (target === 'thread') {
      setShowReplyThreadModal(true);
      return;
    }

    if (target === 'list') {
      setShowReplyListModal(true);
    }
  };

  const closeReplyComposer = ({ restoreParent = true } = {}) => {
    const returnTarget = restoreParent ? replyComposerReturnTarget : null;

    setShowReplyModal(false);
    setReplyText('');
    setReplyTarget(null);
    setReplyParentMessageId(null);
    setReplyComposerReturnTarget(null);
    Keyboard.dismiss();

    if (returnTarget) {
      setTimeout(() => {
        restoreReplyParentLayer(returnTarget);
      }, 80);
    }
  };

  const openReplyThreadLayer = replyId => {
    setCurrentReplyRootId(replyId);
    setShowReplyListModal(false);
    setTimeout(() => {
      setShowReplyThreadModal(true);
    }, 80);
  };

  const returnFromReplyThreadToList = () => {
    setShowReplyThreadModal(false);
    setTimeout(() => {
      setShowReplyListModal(true);
    }, 80);
  };

  const openReplyComposer = (target, messageId) => {
    const returnTarget = showReplyThreadModal ? 'thread' : showReplyListModal ? 'list' : null;

    if (showReplyThreadModal) {
      setShowReplyThreadModal(false);
    }

    if (showReplyListModal) {
      setShowReplyListModal(false);
    }

    setReplyTarget(target);
    setReplyParentMessageId(messageId ?? target?.raw?.id ?? target?.id ?? null);
    setReplyComposerReturnTarget(returnTarget);
    setReplyText('');
    setTimeout(() => {
      setShowReplyModal(true);
    }, 80);
  };

  const openReplyModal = msg => {
    const messageId = msg?.raw?.id ?? msg?.id ?? null;
    const normalizedMessageId = Number(messageId) || 0;
    const cachedReplies = normalizedMessageId ? getThreadReplies(normalizedMessageId) : [];
    const expectedReplyCount = Number(msg?.replyCount ?? msg?.raw?.replyCount ?? 0) || 0;
    const shouldForceRefresh =
      normalizedMessageId > 0 &&
      (cachedReplies.length === 0 || cachedReplies.length !== expectedReplyCount);

    setCurrentReplyMessageId(messageId);
    setCurrentReplyRootId(null);
    setShowReplyThreadModal(false);
    setShowReplyListModal(true);

    if (!normalizedMessageId) {
      return;
    }

    void loadMessageReplies(messageId, { forceRefresh: shouldForceRefresh });
  };

  const handleReply = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply || publishingReply) return;

    try {
      setPublishingReply(true);
      const parentMessageId = replyTarget?.raw?.id ?? replyTarget?.id ?? 0;
      const threadMessageId = replyParentMessageId || currentReplyMessageId || parentMessageId;
      const createdMessage = await createGroupMessage({
        content: trimmedReply,
        parentId: parentMessageId,
        replyToCommentId: parentMessageId,
        replyToUserName: replyTarget?.author || '',
      });

      appendCreatedReply(createdMessage, threadMessageId);
      setReplyText('');
      closeReplyComposer({ restoreParent: true });
    } catch (error) {
      console.warn('[GroupChat] Failed to publish reply:', error);
      showToast(getGroupChatErrorMessage(error, t('screens.groupChat.replyFailed')), 'error');
    } finally {
      setPublishingReply(false);
    }
  };

  const renderThreadReplyCard = (reply, options = {}) => {
    const rootReplyId = options.rootReplyId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationReplyId = Number(reply?.replyToCommentId ?? 0) || 0;
    const relationReply = relationReplyId ? findReplyById(currentReplyMessageId, relationReplyId) : null;
    const relationUserName = reply?.replyToUserName || relationReply?.author || '';
    const likedState = getMessageLikedState(reply);
    const dislikedState = getMessageDislikedState(reply);
    const bookmarkedState = getMessageBookmarkedState(reply);
    const shouldHideContextRelation =
      contextReplyId !== null && String(relationReplyId) === String(contextReplyId);
    const shouldShowRelation =
      !!relationUserName &&
      !shouldHideContextRelation &&
      rootReplyId !== null &&
      String(relationReplyId) !== String(rootReplyId) &&
      String(relationReplyId) !== String(reply?.id);

    return (
      <View key={reply.id} style={styles.threadReplyCard}>
        <View style={styles.threadReplyHeader}>
          <Avatar uri={reply.avatar} name={reply.author} size={24} />
          <View style={styles.threadReplyHeaderMeta}>
            <View style={styles.threadReplyAuthorRow}>
              <Text style={styles.threadReplyAuthor}>{reply.author}</Text>
              {shouldShowRelation ? (
                <>
                  <Text style={styles.threadReplyRelation}> 回复 </Text>
                  <Text style={styles.threadReplyTarget}>{relationUserName}</Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.threadReplyTime}>{reply.timeLabel || t('screens.groupChat.justNow')}</Text>
        </View>

        <TwemojiText style={styles.threadReplyContent} text={reply.content} />

        <View style={styles.threadReplyActions}>
          <View style={styles.threadReplyActionsLeft}>
            <TouchableOpacity
              style={[
                styles.threadReplyActionBtn,
                isLikeInteractionDisabled(likedState, dislikedState) && styles.msgActionBtnDisabled,
              ]}
              onPress={() => toggleMessageLike(reply)}
              disabled={isLikeInteractionDisabled(likedState, dislikedState)}
            >
              <Ionicons
                name={likedState ? 'thumbs-up' : 'thumbs-up-outline'}
                size={12}
                color={
                  likedState
                    ? '#ef4444'
                    : isLikeInteractionDisabled(likedState, dislikedState)
                      ? '#d1d5db'
                      : '#9ca3af'
                }
              />
              <Text
                style={[
                  styles.threadReplyMetaText,
                  likedState && styles.msgActionTextLiked,
                  isLikeInteractionDisabled(likedState, dislikedState) && styles.msgActionTextDisabled,
                ]}
              >
                {Number(reply.likes || 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.threadReplyActionBtn} onPress={() => openReplyComposer(reply, currentReplyMessageId)}>
              <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
              <Text style={styles.threadReplyMetaText}>{Number(reply.replyCount || reply.replies || 0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.threadReplyActionBtn}>
              <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
              <Text style={styles.threadReplyMetaText}>{Number(reply.shares || 0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.threadReplyActionBtn} onPress={() => toggleMessageBookmark(reply)}>
              <Ionicons
                name={bookmarkedState ? 'star' : 'star-outline'}
                size={12}
                color={bookmarkedState ? '#f59e0b' : '#9ca3af'}
              />
              <Text style={[styles.threadReplyMetaText, bookmarkedState && styles.msgActionTextBookmarked]}>
                {Number(reply.bookmarks || 0)}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.threadReplyActionsRight}>
            <TouchableOpacity
              style={[
                styles.threadReplyActionBtn,
                isDislikeInteractionDisabled(likedState, dislikedState) && styles.msgActionBtnDisabled,
              ]}
              onPress={() => toggleMessageDislike(reply)}
              disabled={isDislikeInteractionDisabled(likedState, dislikedState)}
            >
              <Ionicons
                name={dislikedState ? 'thumbs-down' : 'thumbs-down-outline'}
                size={12}
                color={
                  dislikedState
                    ? '#6b7280'
                    : isDislikeInteractionDisabled(likedState, dislikedState)
                      ? '#d1d5db'
                      : '#9ca3af'
                }
              />
              <Text
                style={[
                  styles.threadReplyMetaText,
                  dislikedState && styles.msgActionTextDisliked,
                  isDislikeInteractionDisabled(likedState, dislikedState) && styles.msgActionTextDisabled,
                ]}
              >
                {Number(reply.dislikes || 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.threadReplyActionBtn} onPress={handleReport}>
              <Ionicons name="flag-outline" size={12} color="#ef4444" />
              <Text style={styles.threadReplyMetaText}>{Number(reply.reports || 0)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderInlineMessageReplyNodes = (nodes = [], options = {}) =>
    nodes.map(reply => {
      const depth = options.depth ?? 0;
      const childNodes = Array.isArray(reply.children) ? reply.children : [];
      const relationReplyId = Number(reply?.replyToCommentId ?? 0) || 0;
      const relationReply =
        relationReplyId && Array.isArray(options.flatReplies)
          ? options.flatReplies.find(item => String(item.id) === String(relationReplyId))
          : null;
      const relationUserName = reply?.replyToUserName || relationReply?.author || '';
      const shouldShowRelation =
        !!relationUserName &&
        String(relationReplyId) !== String(reply?.id) &&
        String(relationReplyId) !== String(options.rootMessageId ?? '');

      return (
        <View
          key={reply.id}
          style={[
            styles.inlineReplyCard,
            depth > 0 && styles.inlineReplyCardNested,
          ]}
        >
          <View style={styles.inlineReplyHeader}>
            <Avatar uri={reply.avatar} name={reply.author} size={22} />
            <View style={styles.inlineReplyHeaderMeta}>
              <View style={styles.inlineReplyAuthorRow}>
                <Text style={styles.inlineReplyAuthor}>{reply.author}</Text>
                {shouldShowRelation ? (
                  <>
                    <Text style={styles.inlineReplyRelation}> 回复 </Text>
                    <Text style={styles.inlineReplyTarget}>{relationUserName}</Text>
                  </>
                ) : null}
              </View>
              <Text style={styles.inlineReplyTime}>{reply.timeLabel || t('screens.groupChat.justNow')}</Text>
            </View>
          </View>

          <TwemojiText style={styles.inlineReplyContent} text={reply.content} />

          <View style={styles.inlineReplyActions}>
            <TouchableOpacity
              style={styles.inlineReplyBtn}
              onPress={() => openReplyComposer(reply, options.rootMessageId)}
            >
              <Ionicons name="chatbubble-outline" size={12} color="#ef4444" />
              <Text style={styles.inlineReplyBtnText}>{t('screens.groupChat.reply')}</Text>
            </TouchableOpacity>
          </View>

          {childNodes.length > 0 ? (
            <View style={styles.inlineReplyChildren}>
              {renderInlineMessageReplyNodes(childNodes, {
                ...options,
                depth: depth + 1,
              })}
            </View>
          ) : null}
        </View>
      );
    });

  const renderThreadReplyTreeNodes = (nodes = [], options = {}) =>
    nodes.map(reply => {
      const childNodes = Array.isArray(reply.children) ? reply.children : [];
      const hasChildren = childNodes.length > 0;
      const descendantReplies = hasChildren ? flattenThreadMessageTree(childNodes) : [];

      return (
        <View key={reply.id}>
          {renderThreadReplyCard(reply, options)}
          {hasChildren ? (
            <View style={styles.threadReplyChildrenSection}>
              <View style={styles.threadReplyChildrenToggle}>
                <Text style={styles.threadReplyChildrenToggleText}>
                  {`展开回复 (${descendantReplies.length})`}
                </Text>
              </View>
              {descendantReplies.map(childReply =>
                renderThreadReplyCard(childReply, {
                  ...options,
                  contextReplyId: reply.id,
                })
              )}
            </View>
          ) : null}
        </View>
      );
    });

  const handleReport = () => {
    showAppAlert(t('screens.groupChat.reportTitle'), t('screens.groupChat.reportConfirm'), [
      {
        text: t('screens.groupChat.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.confirm'),
        onPress: () => showAppAlert(t('screens.groupChat.hint'), t('screens.groupChat.reportSuccess')),
      },
    ]);
  };

  const retryLoadMessages = () => {
    setMessageReloadKey(prev => prev + 1);
  };

  const displayMessageCount = messageSummary.total || messages.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('screens.groupChat.title')}</Text>
          <Text style={styles.memberCount}>
            {displayMemberCount} {t('screens.groupChat.memberCount')}
          </Text>
        </View>
        {isJoined ? (
          <TouchableOpacity onPress={handleExitGroup} style={styles.exitBtn}>
            <Ionicons name="exit-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <View style={styles.exitBtnPlaceholder} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Avatar uri={displayAvatar} name={displayName} size={36} />
            <Text style={styles.questionAuthor}>{displayName}</Text>
            <View style={styles.questionTag}>
              <Text style={styles.questionTagText}>{t('screens.groupChat.questioner')}</Text>
            </View>
            {groupRoleMeta ? (
              <View
                style={[
                  styles.groupMetaTag,
                  { backgroundColor: groupRoleMeta.backgroundColor },
                ]}
              >
                <Text style={[styles.groupMetaTagText, { color: groupRoleMeta.color }]}>
                  {groupRoleMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.questionTitle}>{displayQuestionTitle}</Text>
          {Boolean(displayDescription) && <Text style={styles.groupDescription}>{displayDescription}</Text>}
          {(Boolean(displayCapacity) || Boolean(groupStatusText)) && (
            <View style={styles.groupInfoRow}>
              {Boolean(groupStatusText) && (
                <Text
                  style={[
                    styles.groupStatusText,
                    groupStatusMeta?.color ? { color: groupStatusMeta.color } : null,
                  ]}
                >
                  {groupStatusText}
                </Text>
              )}
              {Boolean(displayCapacity) && <Text style={styles.groupCapacityText}>{displayCapacity}</Text>}
            </View>
          )}
          {groupLoading && !currentGroup && (
            <View style={styles.groupLoadingRow}>
              <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
          )}
          {Boolean(groupLoadError) && !groupLoading && !currentGroup && (
            <Text style={styles.groupErrorText}>{groupLoadError}</Text>
          )}
        </View>

        <View style={styles.messagesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.groupChat.messagesSection')}</Text>
            <Text style={styles.messageCount}>
              {displayMessageCount} {t('screens.groupChat.messageCount')}
            </Text>
          </View>

          <View style={styles.sortFilterBar}>
            <View style={styles.sortFilterLeft}>
              <TouchableOpacity
                style={[styles.sortFilterBtn, activeTab === 'featured' && styles.sortFilterBtnActive]}
                onPress={() => setActiveTab('featured')}
              >
                <Ionicons name="star" size={14} color={activeTab === 'featured' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, activeTab === 'featured' && styles.sortFilterTextActive]}>
                  {t('screens.groupChat.featuredTab')}
                </Text>
              </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortFilterBtn, activeTab === 'all' && styles.sortFilterBtnActive]}
                  onPress={() => setActiveTab('all')}
                >
                  <Ionicons name="time" size={14} color={activeTab === 'all' ? '#ef4444' : '#9ca3af'} />
                  <Text style={[styles.sortFilterText, activeTab === 'all' && styles.sortFilterTextActive]}>
                    {t('common.latest')}
                  </Text>
                </TouchableOpacity>
            </View>
          </View>

          {messageLoading ? (
            <View style={styles.messageStateCard}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.messageStateText}>{t('common.loading')}</Text>
            </View>
          ) : null}

          {!messageLoading && messageError ? (
            <View style={styles.messageStateCard}>
              <Text style={styles.messageStateErrorText}>{messageError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retryLoadMessages}>
                <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!messageLoading && !messageError && messages.length === 0 ? (
            <View style={styles.messageStateCard}>
              <Text style={styles.messageStateText}>{t('common.noData')}</Text>
            </View>
          ) : null}

          {!messageLoading && !messageError
            ? topLevelMessageNodes.map(msg => {
                const likedState = getMessageLikedState(msg);
                const dislikedState = getMessageDislikedState(msg);
                const bookmarkedState = getMessageBookmarkedState(msg);

                return (
                  <View key={msg.id} style={styles.messageCard}>
                    <View style={styles.msgHeader}>
                      <Avatar uri={msg.avatar} name={msg.author} size={24} />
                      <Text style={styles.msgAuthor}>{msg.author}</Text>
                      <Text style={styles.msgTime}>{msg.timeLabel || t('screens.groupChat.justNow')}</Text>
                    </View>
                    {msg.content ? <TwemojiText style={styles.msgText} text={msg.content} /> : null}
                    {Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0 ? (
                      <View style={styles.msgImageGrid}>
                        {msg.imageUrls.map((imageUrl, imageIndex) => (
                          <Image
                            key={`${msg.id}-image-${imageIndex}`}
                            source={{ uri: imageUrl }}
                            style={styles.msgImage}
                          />
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.msgActions}>
                      <View style={styles.msgActionsLeft}>
                        <TouchableOpacity
                          style={[
                            styles.msgActionBtn,
                            isLikeInteractionDisabled(likedState, dislikedState) &&
                              styles.msgActionBtnDisabled,
                          ]}
                          onPress={() => toggleMessageLike(msg)}
                          disabled={isLikeInteractionDisabled(likedState, dislikedState)}
                        >
                          <Ionicons
                            name={likedState ? 'thumbs-up' : 'thumbs-up-outline'}
                            size={14}
                            color={
                              likedState
                                ? '#ef4444'
                                : isLikeInteractionDisabled(likedState, dislikedState)
                                  ? '#d1d5db'
                                  : '#9ca3af'
                            }
                          />
                          <Text
                            style={[
                              styles.msgActionText,
                              likedState && styles.msgActionTextLiked,
                              isLikeInteractionDisabled(likedState, dislikedState) &&
                                styles.msgActionTextDisabled,
                            ]}
                          >
                            {Number(msg.likes || 0)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.msgActionBtn} onPress={() => openReplyModal(msg)}>
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.msgActionText}>{Number(msg.replyCount || 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.msgActionBtn}>
                          <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                          <Text style={styles.msgActionText}>{Number(msg.shares || 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.msgActionBtn}
                          onPress={() => toggleMessageBookmark(msg)}
                        >
                          <Ionicons
                            name={bookmarkedState ? 'star' : 'star-outline'}
                            size={14}
                            color={bookmarkedState ? '#f59e0b' : '#9ca3af'}
                          />
                          <Text
                            style={[
                              styles.msgActionText,
                              bookmarkedState && styles.msgActionTextBookmarked,
                            ]}
                          >
                            {Number(msg.bookmarks || 0)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.msgActionsRight}>
                        <TouchableOpacity
                          style={[
                            styles.msgActionBtn,
                            isDislikeInteractionDisabled(likedState, dislikedState) &&
                              styles.msgActionBtnDisabled,
                          ]}
                          onPress={() => toggleMessageDislike(msg)}
                          disabled={isDislikeInteractionDisabled(likedState, dislikedState)}
                        >
                          <Ionicons
                            name={dislikedState ? 'thumbs-down' : 'thumbs-down-outline'}
                            size={14}
                            color={
                              dislikedState
                                ? '#6b7280'
                                : isDislikeInteractionDisabled(likedState, dislikedState)
                                  ? '#d1d5db'
                                  : '#9ca3af'
                            }
                          />
                          <Text
                            style={[
                              styles.msgActionText,
                              dislikedState && styles.msgActionTextDisliked,
                              isDislikeInteractionDisabled(likedState, dislikedState) &&
                                styles.msgActionTextDisabled,
                            ]}
                          >
                            {Number(msg.dislikes || 0)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.msgActionBtn} onPress={handleReport}>
                          <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            : null}
        </View>
      </ScrollView>

      <Modal
        visible={showReplyListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReplyListModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowReplyListModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.threadModal, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
            >
              <View style={styles.threadModalHandle} />
              <View style={styles.threadModalHeader}>
                <View style={styles.threadModalHeaderPlaceholder} />
                <Text style={styles.threadModalTitle}>
                  {currentReplyMessage?.replyCount || currentMessageReplies.length || 0}条回复
                </Text>
                <TouchableOpacity
                  onPress={() => setShowReplyListModal(false)}
                  style={styles.threadModalCloseBtn}
                >
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.threadScroll} showsVerticalScrollIndicator={false}>
                {currentReplyLoading ? (
                  <View style={styles.threadStateCard}>
                    <ActivityIndicator size="small" color="#ef4444" />
                    <Text style={styles.threadStateText}>{t('common.loading')}</Text>
                  </View>
                ) : null}

                {!currentReplyLoading && currentReplyError ? (
                  <View style={styles.threadStateCard}>
                    <Text style={styles.threadStateErrorText}>{currentReplyError}</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => void loadMessageReplies(currentReplyMessageId, { forceRefresh: true })}
                    >
                      <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {!currentReplyLoading && !currentReplyError && currentTopLevelReplies.length === 0 ? (
                  <View style={styles.threadStateCard}>
                    <Text style={styles.threadStateText}>暂无回复</Text>
                  </View>
                ) : null}

                {!currentReplyLoading && !currentReplyError
                  ? currentTopLevelReplies.map(reply => {
                      const likedState = getMessageLikedState(reply);
                      const dislikedState = getMessageDislikedState(reply);
                      const bookmarkedState = getMessageBookmarkedState(reply);

                      return (
                      <View key={reply.id} style={styles.threadListCard}>
                        <View style={styles.threadReplyHeader}>
                          <Avatar uri={reply.avatar} name={reply.author} size={24} />
                          <Text style={styles.threadReplyAuthor}>{reply.author}</Text>
                          <View style={{ flex: 1 }} />
                          <Text style={styles.threadReplyTime}>
                            {reply.timeLabel || t('screens.groupChat.justNow')}
                          </Text>
                        </View>
                        <TwemojiText style={styles.threadReplyContent} text={reply.content} />
                        <View style={styles.threadListActions}>
                          <View style={styles.threadListActionsLeft}>
                            <TouchableOpacity
                              style={[
                                styles.threadReplyActionBtn,
                                isLikeInteractionDisabled(likedState, dislikedState) &&
                                  styles.msgActionBtnDisabled,
                              ]}
                              onPress={() => toggleMessageLike(reply)}
                              disabled={isLikeInteractionDisabled(likedState, dislikedState)}
                            >
                              <Ionicons
                                name={likedState ? 'thumbs-up' : 'thumbs-up-outline'}
                                size={12}
                                color={
                                  likedState
                                    ? '#ef4444'
                                    : isLikeInteractionDisabled(likedState, dislikedState)
                                      ? '#d1d5db'
                                      : '#9ca3af'
                                }
                              />
                              <Text
                                style={[
                                  styles.threadReplyMetaText,
                                  likedState && styles.msgActionTextLiked,
                                  isLikeInteractionDisabled(likedState, dislikedState) &&
                                    styles.msgActionTextDisabled,
                                ]}
                              >
                                {Number(reply.likes || 0)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.threadReplyActionBtn}
                              onPress={() => openReplyThreadLayer(reply.id)}
                            >
                              <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                              <Text style={styles.threadReplyMetaText}>
                                {Number(reply.replyCount || 0)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.threadReplyActionBtn}>
                              <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                              <Text style={styles.threadReplyMetaText}>{Number(reply.shares || 0)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.threadReplyActionBtn}
                              onPress={() => toggleMessageBookmark(reply)}
                            >
                              <Ionicons
                                name={bookmarkedState ? 'star' : 'star-outline'}
                                size={12}
                                color={bookmarkedState ? '#f59e0b' : '#9ca3af'}
                              />
                              <Text
                                style={[
                                  styles.threadReplyMetaText,
                                  bookmarkedState && styles.msgActionTextBookmarked,
                                ]}
                              >
                                {Number(reply.bookmarks || 0)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.threadListActionsRight}>
                            <TouchableOpacity
                              style={[
                                styles.threadReplyActionBtn,
                                isDislikeInteractionDisabled(likedState, dislikedState) &&
                                  styles.msgActionBtnDisabled,
                              ]}
                              onPress={() => toggleMessageDislike(reply)}
                              disabled={isDislikeInteractionDisabled(likedState, dislikedState)}
                            >
                              <Ionicons
                                name={dislikedState ? 'thumbs-down' : 'thumbs-down-outline'}
                                size={12}
                                color={
                                  dislikedState
                                    ? '#6b7280'
                                    : isDislikeInteractionDisabled(likedState, dislikedState)
                                      ? '#d1d5db'
                                      : '#9ca3af'
                                }
                              />
                              <Text
                                style={[
                                  styles.threadReplyMetaText,
                                  dislikedState && styles.msgActionTextDisliked,
                                  isDislikeInteractionDisabled(likedState, dislikedState) &&
                                    styles.msgActionTextDisabled,
                                ]}
                              >
                                {Number(reply.dislikes || 0)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.threadReplyActionBtn} onPress={handleReport}>
                              <Ionicons name="flag-outline" size={12} color="#ef4444" />
                              <Text style={styles.threadReplyMetaText}>{Number(reply.reports || 0)}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                    })
                  : null}
              </ScrollView>

              <View style={styles.threadModalBottomBar}>
                <TouchableOpacity
                  style={styles.threadWriteBtn}
                  onPress={() => openReplyComposer(currentReplyMessage, currentReplyMessageId)}
                >
                  <Ionicons name="create-outline" size={18} color="#6b7280" />
                  <Text style={styles.threadWriteBtnText}>写回复...</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showReplyThreadModal}
        transparent
        animationType="slide"
        onRequestClose={returnFromReplyThreadToList}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={returnFromReplyThreadToList}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.threadModal, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}
            >
              <View style={styles.threadModalHandle} />
              <View style={styles.threadModalHeader}>
                <TouchableOpacity
                  onPress={returnFromReplyThreadToList}
                  style={[styles.threadModalCloseBtn, { left: 16, right: 'auto' }]}
                >
                  <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.threadModalTitle}>
                  {Math.max(
                    Number(currentThreadRootReply?.replyCount || 0),
                    currentThreadReplyNodes.length
                  )}条回复
                </Text>
                <View style={styles.threadModalHeaderPlaceholder} />
              </View>

              {currentThreadRootReply ? (
                <View style={styles.originalReplyCard}>
                  <View style={styles.threadReplyHeader}>
                    <Avatar uri={currentThreadRootReply.avatar} name={currentThreadRootReply.author} size={32} />
                    <Text style={styles.threadReplyAuthor}>{currentThreadRootReply.author}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.threadReplyTime}>
                      {currentThreadRootReply.timeLabel || t('screens.groupChat.justNow')}
                    </Text>
                  </View>
                  <TwemojiText style={styles.originalReplyContent} text={currentThreadRootReply.content} />
                </View>
              ) : null}

              <View style={styles.repliesSectionHeader}>
                <Text style={styles.repliesSectionTitle}>全部回复</Text>
              </View>

              <ScrollView style={styles.threadScroll} showsVerticalScrollIndicator={false}>
                {currentReplyLoading ? (
                  <View style={styles.threadStateCard}>
                    <ActivityIndicator size="small" color="#ef4444" />
                    <Text style={styles.threadStateText}>{t('common.loading')}</Text>
                  </View>
                ) : null}

                {!currentReplyLoading && currentThreadReplyNodes.length > 0
                  ? renderThreadReplyTreeNodes(currentThreadReplyNodes, {
                      rootReplyId: currentThreadRootReply?.id ?? null,
                    })
                  : null}

                {!currentReplyLoading &&
                !currentReplyError &&
                currentThreadReplyNodes.length === 0 &&
                currentThreadRootReply ? (
                  <View style={styles.threadStateCard}>
                    <Text style={styles.threadStateText}>暂无回复</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.threadModalBottomBar}>
                <TouchableOpacity
                  style={styles.threadWriteBtn}
                  onPress={() => openReplyComposer(currentThreadRootReply, currentReplyMessageId)}
                >
                  <Ionicons name="create-outline" size={18} color="#6b7280" />
                  <Text style={styles.threadWriteBtnText}>写回复...</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showReplyModal}
        transparent
        animationType="slide"
        onRequestClose={() => closeReplyComposer({ restoreParent: true })}
        statusBarTranslucent
      >
        <View style={styles.replyKeyboardAvoidingView}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => closeReplyComposer({ restoreParent: true })}
          >
            <View style={styles.replySheetContainer} pointerEvents="box-none">
              <TouchableOpacity
                activeOpacity={1}
                style={[
                  styles.replyModal,
                  {
                    paddingBottom: replyModalBottomPadding,
                    marginBottom: replyKeyboardOffset,
                    maxHeight: replyModalMaxHeight,
                  },
                ]}
              >
                <View style={styles.replyModalHandle} />
                <View style={styles.replyModalHeader}>
                  <Text style={styles.replyModalTitle}>{t('screens.groupChat.replyModalTitle')}</Text>
                  <TouchableOpacity onPress={() => closeReplyComposer({ restoreParent: true })}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.replyComposerScroll}
                  contentContainerStyle={styles.replyComposerContent}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  {Boolean(replyTarget) ? (
                    <View style={styles.replyTargetCard}>
                      <Avatar uri={replyTarget.avatar} name={replyTarget.author} size={32} />
                      <View style={styles.replyTargetInfo}>
                        <Text style={styles.replyTargetAuthor}>{replyTarget.author}</Text>
                        <TwemojiText
                          style={styles.replyTargetContent}
                          numberOfLines={2}
                          text={replyTarget.content}
                        />
                      </View>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.replyInputWrapper,
                      replyKeyboardOffset > 0 && styles.replyInputWrapperCompact,
                    ]}
                  >
                    <TextInput
                      style={[styles.replyInput, replyKeyboardOffset > 0 && styles.replyInputCompact]}
                      placeholder={t('screens.groupChat.replyPlaceholder').replace('{author}', replyTarget?.author || '')}
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline
                      autoFocus
                    />
                  </View>
                </ScrollView>

                <View style={styles.replyModalFooter}>
                  <TouchableOpacity
                    style={styles.replyCancelBtn}
                    onPress={() => closeReplyComposer({ restoreParent: true })}
                  >
                    <Text style={styles.replyCancelText}>{t('screens.groupChat.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.replySubmitBtn,
                      (!replyText.trim() || publishingReply) && styles.replySubmitBtnDisabled,
                    ]}
                    onPress={handleReply}
                    disabled={!replyText.trim() || publishingReply}
                  >
                    {publishingReply ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.replySubmitText}>{t('screens.groupChat.send')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {!hasActiveMessageLayer ? (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.inputWrapper, !canOpenMessageComposer && styles.inputWrapperDisabled]}
            activeOpacity={canOpenMessageComposer ? 0.85 : 1}
            onPress={openWriteMessageModal}
            disabled={!canOpenMessageComposer}
          >
            <Text
              style={[
                styles.inputPlaceholderText,
                !canOpenMessageComposer && styles.inputPlaceholderTextDisabled,
              ]}
            >
              {canOpenMessageComposer ? t('screens.groupChat.inputPlaceholder') : disabledComposerHint}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, !canOpenMessageComposer && styles.sendBtnDisabled]}
            onPress={openWriteMessageModal}
            disabled={!canOpenMessageComposer}
          >
            <Ionicons name="send" size={18} color={canOpenMessageComposer ? '#fff' : '#fef2f2'} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TeamDiscussionComposerModal
        visible={showWriteMessageModal}
        onClose={closeWriteMessageModal}
        onPublish={handlePublishMessage}
        placeholder={t('screens.groupChat.inputPlaceholder')}
        title={t('screens.groupChat.inputPlaceholder').replace('...', '')}
        submitting={publishingMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  memberCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2,
  },
  exitBtn: {
    padding: 4,
  },
  exitBtnPlaceholder: {
    width: 30,
  },
  content: {
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionAuthor: {
    fontSize: scaleFont(14),
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 10,
  },
  questionTag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  questionTagText: {
    fontSize: scaleFont(11),
    color: '#ef4444',
  },
  groupMetaTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  groupMetaTagText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  questionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    color: '#1f2937',
    lineHeight: scaleFont(24),
  },
  groupDescription: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#6b7280',
    lineHeight: scaleFont(20),
    marginTop: 8,
  },
  groupInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  groupCapacityText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    fontWeight: '400',
  },
  groupStatusText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '400',
  },
  groupLoadingRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  groupErrorText: {
    marginTop: 12,
    fontSize: scaleFont(13),
    color: '#ef4444',
    lineHeight: 18,
  },
  messagesSection: {
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
  },
  messageCount: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sortFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sortFilterBtnActive: {
    backgroundColor: '#fef2f2',
  },
  sortFilterText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
  },
  sortFilterTextActive: {
    color: '#ef4444',
    fontWeight: '500',
  },
  messageStateCard: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  messageStateText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
  },
  messageStateErrorText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryBtnText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    fontWeight: '500',
  },
  messageCard: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  msgAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af',
    flex: 1,
  },
  msgTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  msgText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10,
  },
  msgImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  msgImage: {
    width: 148,
    height: 148,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  msgActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  msgActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  msgActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineRepliesContainer: {
    marginTop: 2,
    marginBottom: 10,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#f3d7da',
    gap: 10,
  },
  inlineReplyCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  inlineReplyCardNested: {
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  inlineReplyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inlineReplyHeaderMeta: {
    flex: 1,
  },
  inlineReplyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  inlineReplyAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#6b7280',
  },
  inlineReplyRelation: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  inlineReplyTarget: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#6b7280',
  },
  inlineReplyTime: {
    marginTop: 2,
    fontSize: scaleFont(11),
    color: '#9ca3af',
  },
  inlineReplyContent: {
    marginTop: 8,
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    color: '#1f2937',
  },
  inlineReplyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  inlineReplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineReplyBtnText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '500',
  },
  inlineReplyChildren: {
    marginTop: 8,
    marginLeft: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    gap: 8,
  },
  msgActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  msgActionBtnDisabled: {
    opacity: 0.45,
  },
  msgActionText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  msgActionTextDisabled: {
    color: '#d1d5db',
  },
  msgActionTextLiked: {
    color: '#ef4444',
  },
  msgActionTextDisliked: {
    color: '#3b82f6',
  },
  msgActionTextBookmarked: {
    color: '#f59e0b',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  replyBtnText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '500',
  },
  threadModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  threadModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  threadModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  threadModalHeaderPlaceholder: {
    width: 40,
  },
  threadModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
  },
  threadModalCloseBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  threadScroll: {
    flexShrink: 1,
    backgroundColor: '#fff',
  },
  threadStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 10,
  },
  threadStateText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  threadStateErrorText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  threadListCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  threadListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  threadListActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  threadListActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadModalBottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  threadWriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  threadWriteBtnText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  originalReplyCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: '#f9fafb',
  },
  originalReplyContent: {
    fontSize: scaleFont(16),
    color: '#1f2937',
    lineHeight: scaleFont(24),
  },
  repliesSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  repliesSectionTitle: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    fontWeight: '500',
  },
  threadReplyCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  threadReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  threadReplyHeaderMeta: {
    flexShrink: 1,
  },
  threadReplyAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  threadReplyAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af',
  },
  threadReplyRelation: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  threadReplyTarget: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#6b7280',
  },
  threadReplyTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  threadReplyContent: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
  },
  threadReplyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  threadReplyActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  threadReplyActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadReplyMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadReplyMetaText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  threadReplyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadReplyActionText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '500',
  },
  threadReplyChildrenSection: {
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  threadReplyChildrenToggle: {
    paddingBottom: 6,
  },
  threadReplyChildrenToggleText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  replyKeyboardAvoidingView: {
    flex: 1,
  },
  replySheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  replyComposerScroll: {
    flexShrink: 1,
  },
  replyComposerContent: {
    paddingTop: 8,
    backgroundColor: modalTokens.surface,
    paddingBottom: 8,
  },
  replyModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    overflow: 'hidden',
    paddingBottom: 12,
    maxHeight: '58%',
  },
  replyModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  replyModalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  replyTargetCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: modalTokens.surfaceSoft,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  replyTargetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyTargetInfo: {
    flex: 1,
    marginLeft: 10,
  },
  replyTargetAuthor: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: modalTokens.textPrimary,
  },
  replyTargetContent: {
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    marginTop: 2,
    lineHeight: scaleFont(18),
  },
  replyInputWrapper: {
    margin: 16,
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  replyInputWrapperCompact: {
    minHeight: 96,
    maxHeight: 148,
  },
  replyInput: {
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    textAlignVertical: 'top',
    minHeight: 96,
  },
  replyInputCompact: {
    minHeight: 72,
  },
  replyModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  replyCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  replyCancelText: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
  },
  replySubmitBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  replySubmitBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft,
  },
  replySubmitText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  inputWrapperDisabled: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputPlaceholderText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  inputPlaceholderTextDisabled: {
    color: '#c0c7d1',
  },
  sendBtn: {
    backgroundColor: '#ef4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft,
  },
  composerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  composerPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  composerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  composerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  composerSheetHidden: {
    opacity: 0,
  },
  composerHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  composerTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
  },
  composerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerTextBox: {
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e7ebf0',
    padding: 14,
    position: 'relative',
  },
  composerInput: {
    minHeight: 132,
    maxHeight: 184,
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 56,
    paddingBottom: 56,
  },
  composerImagePreview: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  composerPreviewImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  composerRemoveImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  composerToolbar: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  composerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerToolBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  composerSendBtnDisabled: {
    backgroundColor: '#fca5a5',
  },
});

