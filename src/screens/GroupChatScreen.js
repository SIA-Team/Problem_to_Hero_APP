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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import ImagePickerSheet from '../components/ImagePickerSheet';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import apiClient from '../services/api/apiClient';
import { API_ENDPOINTS, replaceUrlParams } from '../config/api';

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
  resolvedGroupId: getGroupIdValue(item),
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
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item >= 0);
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
      item?.name === nextItem?.name &&
      item?.description === nextItem?.description &&
      Boolean(item?.isJoined) === Boolean(nextItem?.isJoined) &&
      Number(item?.status) === Number(nextItem?.status)
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
      item?.dislikes === nextItem?.dislikes &&
      item?.shares === nextItem?.shares &&
      item?.bookmarks === nextItem?.bookmarks &&
      item?.isFeatured === nextItem?.isFeatured
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

const GROUP_API_REQUEST_CONFIG = {};

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

  return {
    id,
    author,
    avatar,
    content,
    timeLabel,
    likes: toSafeNumber(item?.likeCount ?? item?.likes ?? item?.upCount),
    dislikes: toSafeNumber(item?.dislikeCount ?? item?.dislikes ?? item?.downCount),
    shares: toSafeNumber(item?.shareCount ?? item?.shares ?? item?.forwardCount),
    bookmarks: toSafeNumber(item?.collectCount ?? item?.bookmarks ?? item?.favoriteCount),
    isFeatured,
    raw: item,
  };
};

const normalizeGroupMessagesResponse = (response, t) => {
  const payload = response?.data;
  const candidateList = Array.isArray(payload)
    ? payload
    : payload?.rows || payload?.list || payload?.records || payload?.comments || payload?.messages || [];
  const messages = Array.isArray(candidateList)
    ? candidateList.map((item, index) => normalizeMessageItem(item, index, t)).filter(item => Boolean(item.content))
    : [];

  return {
    messages,
    total:
      toSafeNumber(payload?.total ?? payload?.totalCount ?? payload?.count ?? payload?.messageCount) || messages.length,
    featuredCount:
      toSafeNumber(payload?.featuredCount ?? payload?.essenceCount) || messages.filter(item => item.isFeatured).length,
  };
};

export default function GroupChatScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showWriteMessageModal, setShowWriteMessageModal] = useState(false);
  const [writeMessageText, setWriteMessageText] = useState('');
  const [showMessageImagePicker, setShowMessageImagePicker] = useState(false);
  const [selectedMessageImage, setSelectedMessageImage] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [questionGroups, setQuestionGroups] = useState([]);
  const [questionGroupIds, setQuestionGroupIds] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupLoadError, setGroupLoadError] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [messageSummary, setMessageSummary] = useState({
    total: 0,
    featuredCount: 0,
  });
  const [messageReloadKey, setMessageReloadKey] = useState(0);
  const locale = i18n?.locale || 'en';
  const composerInputRef = useRef(null);
  const showWriteMessageModalRef = useRef(false);
  const keepComposerOpenRef = useRef(false);

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
  const displayAvatar = question.avatar || (question.userId ? `https://api.dicebear.com/7.x/avataaars/svg?seed=user${question.userId}` : DEFAULT_QUESTION.avatar);
  const displayName = question.author || t('screens.groupChat.questioner');
  const displayDescription = currentGroup?.description || '';
  const displayQuestionTitle = question.title || currentGroup?.name || t('screens.groupChat.title');
  const displayCapacity = currentGroup ? `${currentGroup.memberCount || 0}/${currentGroup.maxMembers || 0}` : '';

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
      setQuestionGroupIds(prev => (prev.length ? [] : prev));
      setGroupLoadError(prev => (prev ? '' : prev));
      return undefined;
    }

    const loadQuestionGroupIds = async () => {
      try {
        await fetchQuestionGroupIds();
      } catch (error) {
        if (isMounted) {
          const nextError = getGroupChatErrorMessage(error, t('screens.groupChat.groupInfoUnavailable'));
          setQuestionGroupIds(prev => (prev.length ? [] : prev));
          setGroupLoadError(prev => (prev === nextError ? prev : nextError));
        }
      }
    };

    loadQuestionGroupIds();

    return () => {
      isMounted = false;
    };
  }, [questionId]);

  const fetchQuestionGroupIds = async () => {
    if (!questionId) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    const response = await apiClient.get(
      replaceUrlParams(API_ENDPOINTS.GROUP.PUBLIC_QUESTION_IDS, {
        questionId,
      }),
      GROUP_API_REQUEST_CONFIG
    );

    if (!isSuccessResponse(response)) {
      throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.groupInfoUnavailable')));
    }

    const groupIds = normalizeQuestionGroupIdsResponse(response);
    if (!groupIds.length) {
      setQuestionGroupIds(prev => (prev.length ? [] : prev));
      throw new Error(t('screens.groupChat.groupNotFound'));
    }

    setQuestionGroupIds(prev => (arePrimitiveArraysEqual(prev, groupIds) ? prev : groupIds));
    setGroupLoadError(prev => (prev ? '' : prev));
    return groupIds;
  };

  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) {
        return prev;
      }

      const localizedMessages = prev.map((item, index) => normalizeMessageItem(item?.raw ?? item, index, t));
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
        const response = await apiClient.get(API_ENDPOINTS.GROUP.MESSAGE_LIST, {
          ...GROUP_API_REQUEST_CONFIG,
          params: {
            groupId: currentGroupId,
          },
        });
        if (!isSuccessResponse(response)) {
          throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.loadFailed')));
        }
        const normalizedResult = normalizeGroupMessagesResponse(response, t);

        if (isMounted) {
          setMessages(prev =>
            areMessageItemsEqual(prev, normalizedResult.messages) ? prev : normalizedResult.messages
          );
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
  }, [currentGroupId, messageReloadKey]);

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

  const ensureCurrentGroupId = async () => {
    if (hasGroupIdValue(currentGroupId)) {
      return currentGroupId;
    }

    if (hasGroupIdValue(routeGroupId)) {
      return routeGroupId;
    }

    if (questionGroupIds.length > 0) {
      return questionGroupIds[0];
    }
    const groupIds = await fetchQuestionGroupIds();
    const targetGroupId = groupIds[0];

    if (!hasGroupIdValue(targetGroupId)) {
      throw new Error(t('screens.groupChat.groupInfoUnavailable'));
    }

    return targetGroupId;
  };

  const createGroupMessage = async ({ content, parentId = 0 }) => {
    const resolvedGroupId = await ensureCurrentGroupId();
    const token = await AsyncStorage.getItem('authToken');
    const response = await apiClient.post(
      API_ENDPOINTS.GROUP.MESSAGE_CREATE,
      {
        groupId: Number(resolvedGroupId) || 0,
        content,
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

    if (!isSuccessResponse(response) || !response?.data) {
      throw new Error(getGroupChatErrorMessage(response, t('screens.groupChat.publishFailed')));
    }

    return normalizeMessageItem(response.data, 0, t);
  };

  const handlePublishMessage = async (content = '') => {
    const trimmedContent = content.trim();
    if (!trimmedContent && !selectedMessageImage) return;

    if (selectedMessageImage) {
      showToast(t('screens.groupChat.imageUploadUnsupported'), 'warning');
      return;
    }

    try {
      const createdMessage = await createGroupMessage({
        content: trimmedContent,
        parentId: 0,
      });

      setMessages(prev => [createdMessage, ...prev]);
      setMessageSummary(prev => ({
        ...prev,
        total: (prev?.total ?? messages.length) + 1,
      }));
      setActiveTab('all');
      setWriteMessageText('');
      setSelectedMessageImage('');
      setShowWriteMessageModal(false);
      Keyboard.dismiss();
    } catch (error) {
      console.error('[GroupChat] Failed to publish message:', error);
      showToast(getGroupChatErrorMessage(error, t('screens.groupChat.publishFailed')), 'error');
    }
  };

  const openWriteMessageModal = () => {
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
    setWriteMessageText(prev => (prev.trim() ? `${prev} @` : '@'));
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 60);
    showToast(t('screens.groupChat.mentionHint'), 'info');
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

  const openReplyModal = msg => {
    setReplyTarget(msg);
    setReplyText('');
    setShowReplyModal(true);
  };

  const handleReply = async () => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply) return;

    try {
      const createdMessage = await createGroupMessage({
        content: trimmedReply,
        parentId: replyTarget?.raw?.id ?? replyTarget?.id ?? 0,
      });

      setMessages(prev => [createdMessage, ...prev]);
      setMessageSummary(prev => ({
        ...prev,
        total: (prev?.total ?? messages.length) + 1,
      }));
      setActiveTab('all');
      setReplyText('');
      setShowReplyModal(false);
      setReplyTarget(null);
      Keyboard.dismiss();
    } catch (error) {
      console.error('[GroupChat] Failed to publish reply:', error);
      showToast(getGroupChatErrorMessage(error, t('screens.groupChat.replyFailed')), 'error');
    }
  };

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

  const filteredMessages =
    activeTab === 'featured'
      ? messages.filter(message => message.isFeatured)
      : [...messages.filter(message => message.isFeatured), ...messages.filter(message => !message.isFeatured)];
  const displayMessageCount = messageSummary.total || messages.length;

  return (
    <SafeAreaView style={styles.container}>
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
          </View>
          <Text style={styles.questionTitle}>{displayQuestionTitle}</Text>
          {Boolean(displayDescription) && <Text style={styles.groupDescription}>{displayDescription}</Text>}
          {Boolean(displayCapacity) && <Text style={styles.groupCapacityText}>{displayCapacity}</Text>}
          {groupLoading && !currentGroup && (
            <View style={styles.groupLoadingRow}>
              <ActivityIndicator size="small" color="#8b5cf6" />
            </View>
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

          {!messageLoading && !messageError && filteredMessages.length === 0 ? (
            <View style={styles.messageStateCard}>
              <Text style={styles.messageStateText}>{t('common.noData')}</Text>
            </View>
          ) : null}

          {!messageLoading && !messageError
            ? filteredMessages.map(msg => (
                <View key={msg.id} style={styles.messageCard}>
                  <View style={styles.msgHeader}>
                    <Avatar uri={msg.avatar} name={msg.author} size={24} />
                    <Text style={styles.msgAuthor}>{msg.author}</Text>
                    <Text style={styles.msgTime}>{msg.timeLabel || t('screens.groupChat.justNow')}</Text>
                  </View>
                  {msg.content ? <Text style={styles.msgText}>{msg.content}</Text> : null}
                  {msg.imageUri ? <Image source={{ uri: msg.imageUri }} style={styles.msgImage} /> : null}
                  <View style={styles.msgActions}>
                    <TouchableOpacity
                      style={styles.msgActionBtn}
                      onPress={() =>
                        setLiked(prev => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                    >
                      <Ionicons
                        name={liked[msg.id] ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={14}
                        color={liked[msg.id] ? '#ef4444' : '#6b7280'}
                      />
                      <Text style={[styles.msgActionText, liked[msg.id] && styles.msgActionTextLiked]}>
                        {msg.likes + (liked[msg.id] ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.msgActionBtn}
                      onPress={() =>
                        setDisliked(prev => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                    >
                      <Ionicons
                        name={disliked[msg.id] ? 'thumbs-down' : 'thumbs-down-outline'}
                        size={14}
                        color={disliked[msg.id] ? '#3b82f6' : '#6b7280'}
                      />
                      <Text style={[styles.msgActionText, disliked[msg.id] && styles.msgActionTextDisliked]}>
                        {msg.dislikes + (disliked[msg.id] ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.msgActionBtn}>
                      <Ionicons name="arrow-redo-outline" size={14} color="#6b7280" />
                      <Text style={styles.msgActionText}>{msg.shares}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.msgActionBtn}
                      onPress={() =>
                        setBookmarked(prev => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                    >
                      <Ionicons
                        name={bookmarked[msg.id] ? 'bookmark' : 'star-outline'}
                        size={14}
                        color={bookmarked[msg.id] ? '#f59e0b' : '#6b7280'}
                      />
                      <Text style={[styles.msgActionText, bookmarked[msg.id] && styles.msgActionTextBookmarked]}>
                        {msg.bookmarks + (bookmarked[msg.id] ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.msgActionBtn} onPress={handleReport}>
                      <Ionicons name="flag-outline" size={14} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.replyBtn} onPress={() => openReplyModal(msg)}>
                      <Ionicons name="return-down-back-outline" size={14} color="#ef4444" />
                      <Text style={styles.replyBtnText}>{t('screens.groupChat.reply')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            : null}
        </View>
      </ScrollView>

      <Modal visible={showReplyModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReplyModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.replyModal}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>{t('screens.groupChat.replyModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {Boolean(replyTarget) ? (
              <View style={styles.replyTargetCard}>
                <Image source={{ uri: replyTarget.avatar }} style={styles.replyTargetAvatar} />
                <View style={styles.replyTargetInfo}>
                  <Text style={styles.replyTargetAuthor}>{replyTarget.author}</Text>
                  <Text style={styles.replyTargetContent} numberOfLines={2}>
                    {replyTarget.content}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.replyInputWrapper}>
              <TextInput
                style={styles.replyInput}
                placeholder={t('screens.groupChat.replyPlaceholder').replace('{author}', replyTarget?.author || '')}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
            </View>

            <View style={styles.replyModalFooter}>
              <TouchableOpacity style={styles.replyCancelBtn} onPress={() => setShowReplyModal(false)}>
                <Text style={styles.replyCancelText}>{t('screens.groupChat.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]}
                onPress={handleReply}
                disabled={!replyText.trim()}
              >
                <Text style={styles.replySubmitText}>{t('screens.groupChat.send')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.85} onPress={openWriteMessageModal}>
          <Text style={styles.inputPlaceholderText}>{t('screens.groupChat.inputPlaceholder')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sendBtn, styles.sendBtnDisabled]} onPress={openWriteMessageModal}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

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
                  multiline
                  autoFocus
                  showSoftInputOnFocus
                  maxLength={500}
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
                    !writeMessageText.trim() && !selectedMessageImage && styles.composerSendBtnDisabled,
                  ]}
                  onPress={() => handlePublishMessage(writeMessageText)}
                  disabled={!writeMessageText.trim() && !selectedMessageImage}
                >
                  <Ionicons name="send" size={18} color="#fff" />
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
    fontWeight: '500',
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
  questionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(24),
  },
  groupDescription: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(20),
    marginTop: 8,
  },
  groupCapacityText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 8,
  },
  groupLoadingRow: {
    marginTop: 12,
    alignItems: 'flex-start',
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
  msgActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  msgActionText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  replyModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    paddingBottom: 34,
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
    minHeight: 100,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  replyInput: {
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    textAlignVertical: 'top',
  },
  replyModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
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
  inputPlaceholderText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
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

