import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { modalTokens } from '../components/modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import notificationApi from '../services/api/notificationApi';
import { sendPlainPrivateMessage } from '../utils/privateShareService';

import { scaleFont } from '../utils/responsive';
const isSuccessResponse = (response) => response && (response.code === 200 || response.code === 0);

const normalizeRouteParamString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value}`.trim();
};

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeComparableText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value}`.trim().toLowerCase();
};

const parseDateValue = (value) => {
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
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d+$/.test(trimmed)) {
      const fromNumericString = new Date(Number(trimmed));
      if (!Number.isNaN(fromNumericString.getTime())) {
        return fromNumericString;
      }
    }

    const normalizedValue = trimmed.includes('T') ? trimmed : trimmed.replace(/-/g, '/');
    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
};

const formatMessageTime = (value) => {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return '';
  }

  const hours = `${parsedDate.getHours()}`.padStart(2, '0');
  const minutes = `${parsedDate.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const safeJsonParse = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const extractListFromPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload.list)) {
    return payload.list;
  }

  if (Array.isArray(payload.records)) {
    return payload.records;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return extractListFromPayload(payload.data || payload.result || payload.page);
};

const resolveMessageText = (item, payload) => {
  const directText =
    item?.content ||
    item?.messageContent ||
    item?.message ||
    item?.text ||
    item?.body ||
    '';

  if (directText) {
    return `${directText}`.trim();
  }

  if (payload?.summary) {
    return `${payload.summary}`.trim();
  }

  if (payload?.title) {
    return `${payload.title}`.trim();
  }

  return '';
};

const normalizeConversationMessage = (
  item,
  index,
  peerUserId,
  currentUserId = '',
  currentUserNames = [],
  peerNames = [],
  currentUserAvatar = '',
  peerAvatar = ''
) => {
  const payload = safeJsonParse(item?.payload || item?.bizPayload || item?.ext || item?.extraData);
  const senderId =
    item?.senderId ??
    item?.senderUserId ??
    item?.fromUserId ??
    item?.sendUserId ??
    item?.userId ??
    item?.authorId ??
    item?.creatorId ??
    item?.sender?.id ??
    item?.user?.id ??
    null;
  const receiverId =
    item?.receiverId ??
    item?.receiverUserId ??
    item?.receiveUserId ??
    item?.toUserId ??
    item?.targetUserId ??
    item?.peerUserId ??
    null;
  const senderName =
    item?.senderNickName ||
    item?.senderNickname ||
    item?.nickName ||
    item?.nickname ||
    item?.userName ||
    item?.username ||
    '';
  const senderAvatar =
    item?.senderAvatar ||
    item?.avatar ||
    item?.userAvatar ||
    item?.authorAvatar ||
    '';
  const directionFlag =
    item?.direction ??
    item?.messageDirection ??
    item?.directionType ??
    item?.msgDirection ??
    item?.ownerType ??
    item?.fromType ??
    item?.sendType ??
    item?.outbound ??
    item?.outgoing ??
    item?.mine ??
    payload?.direction ??
    payload?.messageDirection ??
    payload?.ownerType ??
    null;

  const normalizedCurrentUserId = normalizeRouteParamString(currentUserId);
  const normalizedDirectionFlag = normalizeComparableText(directionFlag);
  const normalizedSenderName = normalizeComparableText(senderName);
  const normalizedSenderAvatar = normalizeComparableText(senderAvatar);
  const normalizedCurrentUserNames = currentUserNames.map(normalizeComparableText).filter(Boolean);
  const normalizedPeerNames = peerNames.map(normalizeComparableText).filter(Boolean);
  const normalizedCurrentUserAvatar = normalizeComparableText(currentUserAvatar);
  const normalizedPeerAvatar = normalizeComparableText(peerAvatar);
  let isSelf = false;
  if (typeof item?.isSelf === 'boolean') {
    isSelf = item.isSelf;
  } else if (typeof item?.isMine === 'boolean') {
    isSelf = item.isMine;
  } else if (['self', 'mine', 'me', 'out', 'outgoing', 'send', 'sender', '1'].includes(normalizedDirectionFlag)) {
    isSelf = true;
  } else if (['peer', 'other', 'in', 'incoming', 'receive', 'receiver', '0'].includes(normalizedDirectionFlag)) {
    isSelf = false;
  } else if (senderId !== null && senderId !== undefined && normalizedCurrentUserId) {
    isSelf = String(senderId) === normalizedCurrentUserId;
  } else if (receiverId !== null && receiverId !== undefined && normalizedCurrentUserId) {
    isSelf = String(receiverId) !== normalizedCurrentUserId;
  } else if (normalizedSenderName && normalizedCurrentUserNames.includes(normalizedSenderName)) {
    isSelf = true;
  } else if (normalizedSenderName && normalizedPeerNames.includes(normalizedSenderName)) {
    isSelf = false;
  } else if (normalizedSenderAvatar && normalizedCurrentUserAvatar && normalizedSenderAvatar === normalizedCurrentUserAvatar) {
    isSelf = true;
  } else if (normalizedSenderAvatar && normalizedPeerAvatar && normalizedSenderAvatar === normalizedPeerAvatar) {
    isSelf = false;
  } else if (senderId !== null && senderId !== undefined && peerUserId) {
    isSelf = String(senderId) !== String(peerUserId);
  } else if (receiverId !== null && receiverId !== undefined && peerUserId) {
    isSelf = String(receiverId) === String(peerUserId);
  }

  const rawTime =
    item?.createTime ||
    item?.createdAt ||
    item?.gmtCreate ||
    item?.sendTime ||
    item?.lastMessageTime ||
    item?.time ||
    item?.timestamp ||
    null;
  const parsedDate = parseDateValue(rawTime);

  return {
    id: item?.id ?? item?.messageId ?? item?.privateMessageId ?? item?.msgId ?? `private-message-${index}`,
    content: resolveMessageText(item, payload),
    payload,
    isSelf,
    senderId: senderId !== null && senderId !== undefined ? String(senderId) : '',
    senderName,
    senderAvatar,
    rawTime,
    timestamp: parsedDate?.getTime() || 0,
  };
};

export default function PrivateConversationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset();
  const scrollViewRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState({
    userId: '',
    name: '',
    avatar: '',
  });

  const routeConversationId = normalizeRouteParamString(route?.params?.conversationId);
  const peerUserId = normalizeRouteParamString(
    route?.params?.peerUserId ?? route?.params?.userId ?? route?.params?.id
  );
  const peerNickName =
    route?.params?.peerNickName ??
    route?.params?.username ??
    route?.params?.name ??
    '';
  const peerAvatar = route?.params?.peerAvatar ?? route?.params?.avatar ?? '';
  const [activeConversationId, setActiveConversationId] = useState(routeConversationId ? String(routeConversationId) : '');

  useEffect(() => {
    setActiveConversationId(routeConversationId ? String(routeConversationId) : '');
  }, [routeConversationId]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[PrivateConversation] route params:', route?.params || {});
      console.log('[PrivateConversation] resolved peer info:', {
        peerUserId,
        peerNickName,
        peerAvatar,
        routeConversationId,
      });
    }
  }, [peerAvatar, peerNickName, peerUserId, route?.params, routeConversationId]);

  const displayName = peerNickName || `User ${peerUserId || activeConversationId || ''}`.trim();
  const currentUserDisplayName = currentUserProfile.name || 'Me';
  const currentUserId = normalizeRouteParamString(currentUserProfile.userId);
  const currentUserNames = useMemo(() => [
    currentUserProfile.name,
    currentUserProfile.userId,
  ].filter(Boolean), [currentUserProfile.name, currentUserProfile.userId]);
  const peerDisplayNames = useMemo(() => [
    peerNickName,
    route?.params?.username,
    route?.params?.name,
    peerUserId,
  ].filter(Boolean), [peerNickName, peerUserId, route?.params?.name, route?.params?.username]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserProfile = async () => {
      try {
        const userInfoRaw = await AsyncStorage.getItem('userInfo');
        if (!userInfoRaw || !isMounted) {
          return;
        }

        const userInfo = JSON.parse(userInfoRaw);
        if (!userInfo || typeof userInfo !== 'object') {
          return;
        }

        const normalizedUserId = normalizeRouteParamString(
          userInfo?.userId ?? userInfo?.id ?? userInfo?.uid
        );
        const resolvedName =
          userInfo?.nickName ||
          userInfo?.nickname ||
          userInfo?.userName ||
          userInfo?.username ||
          userInfo?.name ||
          '';
        const resolvedAvatar =
          userInfo?.avatar ||
          userInfo?.avatarUrl ||
          userInfo?.userAvatar ||
          '';

        if (isMounted) {
          setCurrentUserProfile({
            userId: normalizedUserId,
            name: resolvedName,
            avatar: resolvedAvatar,
          });
        }
      } catch (error) {
        console.error('Failed to load current user info for private conversation:', error);
      }
    };

    loadCurrentUserProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.log('[PrivateConversation] current user profile:', {
      currentUserId,
      currentUserDisplayName,
      currentUserAvatar: currentUserProfile.avatar,
      peerUserId,
      peerNickName,
      activeConversationId,
    });
  }, [
    activeConversationId,
    currentUserDisplayName,
    currentUserId,
    currentUserProfile.avatar,
    peerNickName,
    peerUserId,
  ]);

  const loadConversationMessages = async ({ silent = false, conversationIdOverride = '' } = {}) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // 构建请求参数：优先使用 conversationId，否则使用 peerUserId
      const resolvedConversationId = `${conversationIdOverride || activeConversationId || ''}`.trim();
      const requestParams = {
        pageNum: 1,
        pageSize: 100,
      };

      if (resolvedConversationId) {
        requestParams.conversationId = resolvedConversationId;
      } else if (peerUserId) {
        requestParams.peerUserId = peerUserId;
      } else {
        throw new Error('缺少会话ID或用户ID');
      }

      const response = await notificationApi.getConversationMessages(requestParams);

      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || t('screens.privateConversation.loadFailed'));
      }

      const nextMessages = extractListFromPayload(response?.data)
        .map((item, index) => normalizeConversationMessage(
          item,
          index,
          peerUserId,
          currentUserId,
          currentUserNames,
          peerDisplayNames,
          currentUserProfile.avatar,
          peerAvatar
        ))
        .sort((left, right) => left.timestamp - right.timestamp);

      if (__DEV__) {
        console.log('[PrivateConversation] normalized messages:', nextMessages.map(message => ({
          id: message.id,
          senderId: message.senderId,
          senderName: message.senderName,
          isSelf: message.isSelf,
          rawTime: message.rawTime,
          contentPreview: `${message.content || ''}`.slice(0, 60),
        })));
      }

      setMessages(nextMessages);
    } catch (error) {
      console.error('Failed to load private conversation messages:', error);
      if (!activeConversationId && peerUserId) {
        setMessages([]);
      } else {
        showAppAlert(t('screens.messagesScreen.alerts.hint'), error?.message || t('screens.privateConversation.loadFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markConversationRead = async (conversationIdOverride = '') => {
    const resolvedConversationId = `${conversationIdOverride || activeConversationId || ''}`.trim();
    if (!resolvedConversationId) {
      return;
    }

    try {
      await notificationApi.markConversationRead(resolvedConversationId);
    } catch (error) {
      console.error('Failed to mark private conversation read:', error);
    }
  };

  useEffect(() => {
    loadConversationMessages();
    markConversationRead();
  }, [activeConversationId, currentUserId, currentUserNames, peerAvatar, peerDisplayNames, peerUserId, currentUserProfile.avatar]);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    });
  }, [messages.length]);

  const handleRefresh = async () => {
    await loadConversationMessages({ silent: true });
    await markConversationRead();
  };

  const handleSend = async () => {
    if (!peerUserId) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.privateConversation.sendUnavailable'));
      return;
    }

    const normalizedDraft = `${draft || ''}`.trim();
    if (!normalizedDraft || sending) {
      return;
    }

    setSending(true);

    try {
      const { response, conversationId: returnedConversationId } = await sendPlainPrivateMessage({
        recipientUserId: peerUserId,
        conversationId: activeConversationId,
        content: normalizedDraft,
      });
      console.log('[PrivateConversation] send response:', JSON.stringify(response, null, 2));

      const resolvedConversationId = `${returnedConversationId || activeConversationId || ''}`.trim();
      if (resolvedConversationId && resolvedConversationId !== activeConversationId) {
        setActiveConversationId(resolvedConversationId);
        navigation.setParams({
          conversationId: resolvedConversationId,
        });
      }

      setDraft('');

      if (resolvedConversationId) {
        await loadConversationMessages({
          silent: true,
          conversationIdOverride: resolvedConversationId,
        });
        await markConversationRead(resolvedConversationId);
      } else {
        const now = Date.now();
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `local-private-message-${now}`,
            content: normalizedDraft,
            payload: null,
            isSelf: true,
            senderId: '',
            senderName: '',
            senderAvatar: '',
            rawTime: new Date(now).toISOString(),
            timestamp: now,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to send private conversation message:', error);
      showAppAlert(t('screens.messagesScreen.alerts.hint'), error?.message || t('screens.privateConversation.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardDismissView>
        <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar uri={peerAvatar} name={displayName} size={36} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerSubtitle}>{t('screens.privateConversation.title')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {refreshing ? <ActivityIndicator size="small" color="#ef4444" /> : <Ionicons name="refresh" size={20} color="#6b7280" />}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 8) : 0}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#ef4444" />
            <Text style={styles.centerText}>{t('common.loading')}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color="#d1d5db" />
            <Text style={styles.centerText}>{t('screens.privateConversation.empty')}</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {messages.map((message) => {
              const shareCard = message.payload?.kind === 'content_share' ? message.payload : null;
              const senderDisplayName = message.isSelf
                ? currentUserDisplayName
                : message.senderName || displayName;
              const senderAvatar = message.isSelf
                ? currentUserProfile.avatar
                : message.senderAvatar || peerAvatar;

              return (
                <View
                  key={String(message.id)}
                  style={[styles.messageRow, message.isSelf ? styles.messageRowSelf : styles.messageRowPeer]}
                >
                  {!message.isSelf ? <Avatar uri={senderAvatar} name={senderDisplayName} size={32} /> : null}
                  <View style={[styles.messageBody, message.isSelf ? styles.messageBodySelf : styles.messageBodyPeer]}>
                    <View style={[styles.bubble, message.isSelf ? styles.selfBubble : styles.peerBubble]}>
                      {shareCard ? (
                        <View style={styles.shareCard}>
                          {message.content ? <Text style={[styles.shareIntro, message.isSelf ? styles.shareIntroSelf : styles.shareIntroPeer]}>{message.content}</Text> : null}
                          <View style={[styles.shareCardInner, message.isSelf ? styles.shareCardInnerSelf : styles.shareCardInnerPeer]}>
                            <Text style={[styles.shareTitle, message.isSelf ? styles.shareTitleSelf : styles.shareTitlePeer]} numberOfLines={2}>
                              {shareCard.title || t('common.share')}
                            </Text>
                            {shareCard.summary ? (
                              <Text style={[styles.shareSummary, message.isSelf ? styles.shareSummarySelf : styles.shareSummaryPeer]} numberOfLines={3}>
                                {shareCard.summary}
                              </Text>
                            ) : null}
                            {shareCard.url ? (
                              <Text style={[styles.shareUrl, message.isSelf ? styles.shareUrlSelf : styles.shareUrlPeer]} numberOfLines={1}>
                                {shareCard.url}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.messageText, message.isSelf ? styles.selfMessageText : styles.peerMessageText]}>
                          {message.content}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.messageTime, message.isSelf ? styles.messageTimeSelf : styles.messageTimePeer]}>
                      {formatMessageTime(message.rawTime)}
                    </Text>
                  </View>
                  {message.isSelf ? <Avatar uri={senderAvatar} name={senderDisplayName} size={32} /> : null}
                </View>
              );
            })}
          </ScrollView>
        )}

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: bottomSafeInset,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder={t('screens.privateConversation.inputPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending || !peerUserId) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending || !peerUserId}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>{t('screens.messagesScreen.privateModal.send')}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </KeyboardDismissView>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2,
  },
  refreshButton: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  centerText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    textAlign: 'center',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowPeer: {
    justifyContent: 'flex-start',
  },
  messageRowSelf: {
    justifyContent: 'flex-end',
  },
  messageBody: {
    maxWidth: '80%',
  },
  messageBodyPeer: {
    marginLeft: 10,
  },
  messageBodySelf: {
    marginLeft: 40,
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  peerBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 6,
  },
  selfBubble: {
    backgroundColor: '#ef4444',
    borderTopRightRadius: 6,
  },
  messageText: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  peerMessageText: {
    color: '#1f2937',
  },
  selfMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginTop: 6,
  },
  messageTimePeer: {
    marginLeft: 4,
  },
  messageTimeSelf: {
    marginRight: 4,
  },
  shareCard: {
    gap: 8,
  },
  shareIntro: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  shareIntroSelf: {
    color: '#fff',
  },
  shareIntroPeer: {
    color: '#1f2937',
  },
  shareCardInner: {
    borderRadius: 12,
    padding: 10,
  },
  shareCardInnerSelf: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  shareCardInnerPeer: {
    backgroundColor: '#f3f4f6',
  },
  shareTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  shareTitleSelf: {
    color: '#fff',
  },
  shareTitlePeer: {
    color: '#1f2937',
  },
  shareSummary: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(19),
    marginTop: 4,
  },
  shareSummarySelf: {
    color: 'rgba(255,255,255,0.92)',
  },
  shareSummaryPeer: {
    color: '#4b5563',
  },
  shareUrl: {
    fontSize: scaleFont(12),
    marginTop: 6,
  },
  shareUrlSelf: {
    color: 'rgba(255,255,255,0.8)',
  },
  shareUrlPeer: {
    color: '#6b7280',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary,
  },
  sendButton: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  sendButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#fff',
  },
});
