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
import ImagePickerSheet from '../components/ImagePickerSheet';
import MentionSuggestionsPanel from '../components/MentionSuggestionsPanel';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import apiClient from '../services/api/apiClient';
import questionApi from '../services/api/questionApi';
import userApi from '../services/api/userApi';
import { API_ENDPOINTS } from '../config/api';
import * as Updates from 'expo-updates';
import { SIMULATE_PRODUCTION } from '../config/debugMode';
import { isDevPreviewFeatureEnabled } from '../utils/devPreviewGate';
import useMentionComposer from '../hooks/useMentionComposer';
import {
  mergeLocalInviteUsers,
  normalizeFollowingInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
  DEFAULT_MENTION_SEARCH_LIMIT,
} from '../utils/mentionComposer';

import { scaleFont } from '../utils/responsive';
const DEFAULT_QUESTION = {
  title: '',
  author: '',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  memberCount: 0,
};

const isSuccessResponse = response => response && (response.code === 200 || response.code === 0);
const hasGroupIdValue = value => value !== null && value !== undefined && value !== '';
const GROUP_CHAT_INTERNAL_ERROR_PATTERN = /No static resource|NOT_FOUND|SQLSyntaxErrorException|app_group/i;
const GROUP_ALREADY_JOINED_PATTERN = /已加入该群组|已经加入该群组|already joined/i;

const getGroupIdValue = group =>
  group?.resolvedGroupId ??
  group?.groupId ??
  group?.id ??
  group?.publicGroupId ??
  group?.questionGroupId ??
  group?.groupID ??
  group?.groupNo ??
  null;

const pickPreferredGroup = groups =>
  groups.find(group => Boolean(group?.isJoined)) ||
  groups.find(group => Number(group?.status) === 1) ||
  groups.find(group => Boolean(getGroupIdValue(group))) ||
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
    return candidateList.map(normalizeGroupItem).filter(group => Boolean(getGroupIdValue(group)));
  }

  if (candidateList && typeof candidateList === 'object') {
    const normalizedGroup = normalizeGroupItem(candidateList, 0);
    return getGroupIdValue(normalizedGroup) ? [normalizedGroup] : [];
  }

  if (payload && typeof payload === 'object' && getGroupIdValue(payload)) {
    return [normalizeGroupItem(payload, 0)];
  }

  return [];
};

const normalizeQuestionGroupIdsResponse = response => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.list)
        ? payload.list
        : [];

  return candidateList
    .map(item => {
      if (item && typeof item === 'object') {
        return Number(
          item?.groupId ??
            item?.id ??
            item?.publicGroupId ??
            item?.questionGroupId ??
            item?.groupID ??
            item?.groupNo
        );
      }

      return Number(item);
    })
    .filter(item => Number.isInteger(item) && item >= 0);
};

const extractGroupIdsFromGroups = groups =>
  groups
    .map(group => getGroupIdValue(group))
    .filter(hasGroupIdValue)
    .map(groupId => String(groupId).trim())
    .filter(Boolean);

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
      item?.timeLabel === nextItem?.timeLabel &&
      item?.likes === nextItem?.likes &&
      item?.replyCount === nextItem?.replyCount &&
      item?.liked === nextItem?.liked &&
      item?.isFeatured === nextItem?.isFeatured &&
      item?.parentId === nextItem?.parentId &&
      item?.replyToCommentId === nextItem?.replyToCommentId &&
      item?.replyToUserName === nextItem?.replyToUserName &&
      item?.structuralParentId === nextItem?.structuralParentId
    );
  });

const isSameMessageSummary = (prev, next) =>
  prev?.total === next?.total && prev?.featuredCount === next?.featuredCount;

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
  console.log('[GroupChatDebug]', ...args);
};

const toSafeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
    timeLabel,
    likes: toSafeNumber(item?.likeCount ?? item?.likes ?? item?.upCount),
    replyCount: toSafeNumber(item?.replyCount ?? item?.commentCount ?? item?.comments),
    liked: Boolean(item?.isLiked ?? item?.liked),
    isFeatured,
    parentId,
    replyToCommentId,
    replyToUserName,
    raw: item,
  };
};

const normalizeGroupMessagesResponse = (response, t) => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : payload?.rows || payload?.list || payload?.records || payload?.comments || payload?.messages || [];
  const messages = Array.isArray(candidateList)
    ? hydrateThreadMessageItems(
        candidateList
          .map((item, index) => normalizeThreadMessageItem(item, index, t))
          .filter(item => Boolean(item.content))
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
  const [isJoined, setIsJoined] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showReplyListModal, setShowReplyListModal] = useState(false);
  const [showReplyThreadModal, setShowReplyThreadModal] = useState(false);
  const [showWriteMessageModal, setShowWriteMessageModal] = useState(false);
  const [writeMessageText, setWriteMessageText] = useState('');
  const [showMessageImagePicker, setShowMessageImagePicker] = useState(false);
  const [selectedMessageImage, setSelectedMessageImage] = useState('');
  const [recommendedMentionUsers, setRecommendedMentionUsers] = useState([]);
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
  const keepComposerOpenRef = useRef(false);
  const autoJoinAttemptedGroupIdsRef = useRef(new Set());
  const joinRequestMapRef = useRef(new Map());
  const getMessageLikedState = message => liked[message?.id] !== undefined ? liked[message.id] : !!message?.liked;
  const currentReplyMessage =
    messages.find(item => String(item.id) === String(currentReplyMessageId)) || null;
  const currentMessageReplies = currentReplyMessageId ? messageRepliesMap[currentReplyMessageId] || [] : [];
  const currentReplyLoading = currentReplyMessageId ? Boolean(replyLoadingMap[currentReplyMessageId]) : false;
  const currentReplyError = currentReplyMessageId ? replyErrorMap[currentReplyMessageId] || '' : '';
  const topLevelMessageNodes = useMemo(() => buildThreadMessageTree(messages), [messages]);
  const {
    activeMention,
    candidateUsers,
    focusInput: focusMentionInput,
    handleMentionPress: triggerMentionPress,
    handleMentionSelect,
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

  const focusComposerInput = () => {
    const triggerFocus = () => {
      composerInputRef.current?.focus();
    };

    triggerFocus();
    requestAnimationFrame(triggerFocus);
    setTimeout(triggerFocus, 80);
    setTimeout(triggerFocus, 180);
    InteractionManager.runAfterInteractions(triggerFocus);
  };

  useEffect(() => {
    showWriteMessageModalRef.current = showWriteMessageModal;
  }, [showWriteMessageModal]);

  useEffect(() => {
    if (!showWriteMessageModal) {
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
          console.warn('[GroupChat] Failed to load mention following users:', followError);
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
          console.warn('[GroupChat] Failed to load mention recommended users:', error);
          setRecommendedMentionUsers([]);
        }
      }
    };

    loadRecommendedUsers();

    return () => {
      isActive = false;
    };
  }, [showWriteMessageModal]);

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
  const routeGroupId =
    route?.params?.groupId ??
    route?.params?.group?.id ??
    route?.params?.group?.groupId ??
    question?.groupId ??
    question?.publicGroupId ??
    question?.questionGroupId ??
    null;
  const currentGroup = useMemo(() => pickPreferredGroup(questionGroups), [questionGroups]);
  const currentGroupId = getGroupIdValue(currentGroup) ?? routeGroupId ?? questionGroupIds[0] ?? null;
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

    loadQuestionGroups();

    return () => {
      isMounted = false;
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
    const normalizedGroupId = Number(targetGroupId);

    if (!Number.isInteger(normalizedGroupId) || normalizedGroupId <= 0) {
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
    if (!hasGroupIdValue(currentGroupId)) {
      return undefined;
    }

    const groupIdKey = String(currentGroupId).trim();
    if (!groupIdKey || autoJoinAttemptedGroupIdsRef.current.has(groupIdKey)) {
      return undefined;
    }

    autoJoinAttemptedGroupIdsRef.current.add(groupIdKey);

    ensureJoinedGroup(currentGroupId).catch(() => {});

    return undefined;
  }, [currentGroupId]);

  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) {
        return prev;
      }

      const localizedMessages = hydrateThreadMessageItems(
        prev.map((item, index) =>
          normalizeThreadMessageItem(item?.raw ?? item, index, t, {
            parentId: item?.parentId,
            replyToCommentId: item?.replyToCommentId,
            replyToUserName: item?.replyToUserName,
          })
        )
      );
      return areMessageItemsEqual(prev, localizedMessages) ? prev : localizedMessages;
    });
  }, [locale]);

  useEffect(() => {
    let isMounted = true;

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

          setMessages(prev =>
            areMessageItemsEqual(prev, normalizedResult.messages) ? prev : normalizedResult.messages
          );
          setLiked(nextLikedState);
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

    loadGroupMessages();

    return () => {
      isMounted = false;
    };
  }, [activeTab, currentGroupId, messageReloadKey]);

  useEffect(() => {
    if (!showWriteMessageModal) {
      return undefined;
    }

    const focusTimer = setTimeout(() => {
      focusComposerInput();
    }, 60);

    return () => clearTimeout(focusTimer);
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
    const handleComposerKeyboardHide = () => {
      if (!showWriteMessageModalRef.current || keepComposerOpenRef.current) {
        return;
      }

      setShowWriteMessageModal(false);
      setWriteMessageText('');
      setSelectedMessageImage('');
    };

    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleComposerKeyboardHide);
    const willHideSubscription =
      Platform.OS === 'ios' ? Keyboard.addListener('keyboardWillHide', handleComposerKeyboardHide) : null;

    return () => {
      hideSubscription.remove();
      willHideSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (canOpenMessageComposer || !showWriteMessageModal) {
      return;
    }

    keepComposerOpenRef.current = false;
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
  }) => {
    const resolvedGroupId = await ensureCurrentGroupId();
    await ensureJoinedGroup(resolvedGroupId, { refreshOnSuccess: !isJoined });
    const token = await AsyncStorage.getItem('authToken');
    logGroupChatDebug('createGroupMessage:payload', {
      resolvedGroupId,
      currentGroupId,
      routeGroupId,
      questionGroupIds,
      parentId,
      contentLength: String(content ?? '').trim().length,
    });
    const response = await apiClient.post(
      API_ENDPOINTS.GROUP.MESSAGE_CREATE,
      {
        groupId: Number(resolvedGroupId) || 0,
        content: String(content ?? '').trim(),
        parentId: Number(parentId) || 0,
        isBoutique: 0,
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
          ? {
              ...message,
              replyCount: (message.replyCount || 0) + 1,
            }
          : message
      );
    });

    setLiked(prev => ({
      ...prev,
      [createdMessage.id]: Boolean(createdMessage.liked),
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
          // Some environments return reply rows without explicit relation fields.
          // Since this request already filters by parentId, we can safely hydrate
          // the missing parent relationship from the request parameters.
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

      const hydratedReplies = hydrateThreadMessageItems(
        responseRows
          .map((item, index) =>
            normalizeThreadMessageItem(item, index, t, {
              parentId: item?.parentId ?? resolvedMessageId,
            })
          )
          .filter(item => String(item.id) !== String(resolvedMessageId)),
        resolvedMessageId
      );

      setMessageRepliesMap(prev => ({
        ...prev,
        [resolvedMessageId]: hydratedReplies,
      }));

      setMessages(prev =>
        prev.map(message =>
          String(message.id) === String(resolvedMessageId)
            ? {
                ...message,
                replyCount: hydratedReplies.length,
              }
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
      const nextMessages = [createdReply, ...prev].filter(
        (item, index, list) => list.findIndex(candidate => String(candidate.id) === String(item.id)) === index
      );

      return nextMessages.map(message =>
        String(message.id) === String(messageId)
          ? {
              ...message,
              replyCount: Math.max((Number(message.replyCount) || 0) + 1, 1),
            }
          : message
      );
    });

    setMessageRepliesMap(prev => {
      const currentReplies = prev[messageId] || [];
      const hydratedReplies = hydrateThreadMessageItems(
        [...currentReplies, createdReply].filter(item => String(item.id) !== String(messageId)),
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

    setMessageSummary(prev => ({
      ...prev,
      total: Math.max((prev?.total ?? 0) + 1, 1),
      featuredCount:
        (prev?.featuredCount ?? 0) + (createdReply.isFeatured ? 1 : 0),
    }));
  };

  const handlePublishMessage = async (content = '') => {
    const trimmedContent = content.trim();
    if ((!trimmedContent && !selectedMessageImage) || publishingMessage) return;

    if (selectedMessageImage) {
      showToast(t('screens.groupChat.imageUploadUnsupported'), 'warning');
      return;
    }

    try {
      setPublishingMessage(true);
      const createdMessage = await createGroupMessage({
        content: trimmedContent,
        parentId: 0,
      });

      appendCreatedMessage(createdMessage);
      setActiveTab('all');
      setWriteMessageText('');
      setSelectedMessageImage('');
      setRecommendedMentionUsers([]);
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
    setTimeout(() => {
      focusComposerInput();
    }, 0);
  };

  const closeWriteMessageModal = () => {
    keepComposerOpenRef.current = false;
    setShowWriteMessageModal(false);
    setWriteMessageText('');
    setSelectedMessageImage('');
    setRecommendedMentionUsers([]);
    Keyboard.dismiss();
  };

  const handleOpenMessageImagePicker = () => {
    keepComposerOpenRef.current = true;
    setShowMessageImagePicker(true);
    Keyboard.dismiss();
  };

  const handleSelectMessageImage = imageUri => {
    setSelectedMessageImage(imageUri);
    setShowMessageImagePicker(false);
    keepComposerOpenRef.current = false;
    setTimeout(() => {
      focusComposerInput();
    }, 120);
  };

  const handleMentionPress = () => {
    triggerMentionPress();
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
    const knownReplyCount = Number(msg?.replyCount ?? msg?.raw?.replyCount ?? 0) || 0;

    setCurrentReplyMessageId(messageId);
    setCurrentReplyRootId(null);
    setShowReplyThreadModal(false);
    setShowReplyListModal(true);

    if (!normalizedMessageId) {
      return;
    }

    if (cachedReplies.length === 0 && knownReplyCount === 0) {
      setReplyErrorMap(prev => ({
        ...prev,
        [normalizedMessageId]: '',
      }));
      setReplyLoadingMap(prev => ({
        ...prev,
        [normalizedMessageId]: false,
      }));
      setMessageRepliesMap(prev =>
        prev[normalizedMessageId]
          ? prev
          : {
              ...prev,
              [normalizedMessageId]: [],
            }
      );
      return;
    }

    void loadMessageReplies(messageId, { forceRefresh: true });
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

        <Text style={styles.threadReplyContent}>{reply.content}</Text>

        <View style={styles.threadReplyActions}>
          <View style={styles.threadReplyMetaGroup}>
            <Ionicons name="heart-outline" size={12} color="#9ca3af" />
            <Text style={styles.threadReplyMetaText}>{Number(reply.likes || 0)}</Text>
          </View>
          <TouchableOpacity
            style={styles.threadReplyActionBtn}
            onPress={() => openReplyComposer(reply, currentReplyMessageId)}
          >
            <Ionicons name="chatbubble-outline" size={12} color="#ef4444" />
            <Text style={styles.threadReplyActionText}>{t('screens.groupChat.reply')}</Text>
          </TouchableOpacity>
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

          <Text style={styles.inlineReplyContent}>{reply.content}</Text>

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
                <Ionicons name="list" size={14} color={activeTab === 'all' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, activeTab === 'all' && styles.sortFilterTextActive]}>
                  {t('screens.groupChat.allTab')}
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
                const childNodes = Array.isArray(msg.children) ? msg.children : [];
                const flatReplies = childNodes.length > 0 ? flattenThreadMessageTree(childNodes) : [];

                return (
                  <View key={msg.id} style={styles.messageCard}>
                    <View style={styles.msgHeader}>
                      <Avatar uri={msg.avatar} name={msg.author} size={24} />
                      <Text style={styles.msgAuthor}>{msg.author}</Text>
                      <Text style={styles.msgTime}>{msg.timeLabel || t('screens.groupChat.justNow')}</Text>
                    </View>
                    {msg.content ? <Text style={styles.msgText}>{msg.content}</Text> : null}
                    {msg.imageUri ? <Image source={{ uri: msg.imageUri }} style={styles.msgImage} /> : null}

                    {childNodes.length > 0 ? (
                      <View style={styles.inlineRepliesContainer}>
                        {renderInlineMessageReplyNodes(childNodes, {
                          rootMessageId: msg.id,
                          flatReplies,
                        })}
                      </View>
                    ) : null}

                    <View style={styles.msgActions}>
                      <TouchableOpacity style={styles.replyBtn} onPress={() => openReplyModal(msg)}>
                        <Ionicons name="chatbubble-outline" size={14} color="#ef4444" />
                        <Text style={styles.replyBtnText}>
                          {t('screens.groupChat.reply')}
                          {msg.replyCount > 0 ? ` (${msg.replyCount})` : ''}
                        </Text>
                      </TouchableOpacity>
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
                  ? currentTopLevelReplies.map(reply => (
                      <View key={reply.id} style={styles.threadListCard}>
                        <View style={styles.threadReplyHeader}>
                          <Avatar uri={reply.avatar} name={reply.author} size={24} />
                          <Text style={styles.threadReplyAuthor}>{reply.author}</Text>
                          <View style={{ flex: 1 }} />
                          <Text style={styles.threadReplyTime}>
                            {reply.timeLabel || t('screens.groupChat.justNow')}
                          </Text>
                        </View>
                        <Text style={styles.threadReplyContent}>{reply.content}</Text>
                        <View style={styles.threadListActions}>
                          <TouchableOpacity
                            style={styles.threadReplyActionBtn}
                            onPress={() => openReplyThreadLayer(reply.id)}
                          >
                            <Ionicons name="chatbubble-outline" size={12} color="#ef4444" />
                            <Text style={styles.threadReplyActionText}>
                              {t('screens.groupChat.reply')}
                              {Number(reply.replyCount || 0) > 0 ? ` (${Number(reply.replyCount || 0)})` : ''}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
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
                  <Text style={styles.originalReplyContent}>{currentThreadRootReply.content}</Text>
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
                        <Text style={styles.replyTargetContent} numberOfLines={2}>
                          {replyTarget.content}
                        </Text>
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

      {showWriteMessageModal ? (
        <View style={styles.composerPortal} pointerEvents="box-none">
          <TouchableOpacity style={styles.composerBackdrop} activeOpacity={1} onPress={closeWriteMessageModal} />
          <KeyboardAvoidingView
            style={styles.composerOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.composerSheet,
                {
                  paddingBottom: Math.max(insets.bottom, 12) + 8,
                },
              ]}
            >
              <View style={styles.composerHandle} />
              <View style={styles.composerHeader}>
                <Text style={styles.composerTitle}>{t('screens.groupChat.inputPlaceholder').replace('...', '')}</Text>
                <TouchableOpacity onPress={closeWriteMessageModal} style={styles.composerCloseBtn}>
                  <Ionicons name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <View style={styles.composerTextBox}>
                <TextInput
                  ref={composerInputRef}
                  style={styles.composerInput}
                  placeholder={t('screens.groupChat.inputPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={writeMessageText}
                  onChangeText={setWriteMessageText}
                  onSelectionChange={handleComposerSelectionChange}
                  selection={composerSelection}
                  multiline
                  autoFocus
                  showSoftInputOnFocus
                  maxLength={500}
                  selectionColor={modalTokens.danger}
                  textAlignVertical="top"
                />
                {selectedMessageImage ? (
                  <View style={styles.composerImagePreview}>
                    <Image source={{ uri: selectedMessageImage }} style={styles.composerPreviewImage} />
                    <TouchableOpacity
                      style={styles.composerRemoveImageBtn}
                      onPress={() => setSelectedMessageImage('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.composerSendBtn,
                    (!writeMessageText.trim() && !selectedMessageImage) && styles.composerSendBtnDisabled,
                    publishingMessage && styles.composerSendBtnDisabled,
                  ]}
                  onPress={() => handlePublishMessage(writeMessageText)}
                  disabled={(!writeMessageText.trim() && !selectedMessageImage) || publishingMessage}
                >
                  {publishingMessage ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.composerToolbar}>
                <View style={styles.composerTools}>
                  <TouchableOpacity
                    style={styles.composerToolBtn}
                    onPress={handleOpenMessageImagePicker}
                  >
                    <Ionicons name="image-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.composerToolBtn} onPress={handleMentionPress}>
                    <Ionicons name="at-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
            {shouldRenderComposerMentionPanel ? (
              <MentionSuggestionsPanel
                activeKeyword={activeMention?.keyword ?? ''}
                animatedStyle={composerMentionPanelAnimatedStyle}
                bottomInset={composerMentionBottomInset}
                bottomOffset={composerMentionPanelBottomOffset}
                listMaxHeight={composerMentionListMaxHeight}
                loading={composerMentionLoading}
                onBackdropPress={focusMentionInput}
                onSelect={handleMentionSelect}
                panelMaxHeight={composerMentionPanelMaxHeight}
                users={candidateUsers}
              />
            ) : null}
          </KeyboardAvoidingView>
        </View>
      ) : null}
      <ImagePickerSheet
        visible={showMessageImagePicker}
        onClose={() => {
          keepComposerOpenRef.current = false;
          setShowMessageImagePicker(false);
          setTimeout(() => {
            if (showWriteMessageModalRef.current) {
              focusComposerInput();
            }
          }, 120);
        }}
        onImageSelected={handleSelectMessageImage}
        title={t('screens.groupChat.uploadImageTitle')}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  msgAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af',
  },
  msgTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  msgText: {
    fontSize: scaleFont(14),
    color: '#4b5563',
    lineHeight: scaleFont(20),
    marginBottom: 10,
  },
  msgImage: {
    width: 148,
    height: 148,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#e5e7eb',
  },
  msgActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginTop: 10,
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

