import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import EmergencyReceivedCard from '../components/EmergencyReceivedCard';
import KeyboardDismissView from '../components/KeyboardDismissView';
import ModalSafeAreaView from '../components/ModalSafeAreaView';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showAppAlert } from '../utils/appAlert';
import { openMapChooser } from '../utils/mapChooser';
import notificationApi from '../services/api/notificationApi';
import userApi from '../services/api/userApi';
import emergencyApi from '../services/api/emergencyApi';
import authApi from '../services/api/authApi';
import { filterFriendUsers, normalizeFollowingResponse, sendPlainPrivateMessage } from '../utils/privateShareService';

import { scaleFont } from '../utils/responsive';
import { useEmergency } from '../contexts/EmergencyContext';
// 椤堕儴蹇嵎鍏ュ彛鏁版嵁
const BUCKET_EVENT_TYPE_MAP = {
  COMMENT_SHARE: ['COMMENT_REPLY', 'MENTION'],
  INVITE_ANSWER: ['INVITE_ANSWER', 'INVITER_GOT_ANSWER'],
  ARBITRATION: ['ARBITRATION_INVITE'],
  LIKE_AGREE: [
    'QUESTION_LIKED',
    'ANSWER_LIKED',
    'COMMENT_LIKED',
    'SUPPLEMENT_LIKED',
    'ANSWER_SUPPLEMENT_LIKED'
  ],
  FAVORITE_ME: [
    'QUESTION_COLLECTED',
    'ANSWER_COLLECTED',
    'COMMENT_COLLECTED',
    'SUPPLEMENT_COLLECTED',
    'ANSWER_SUPPLEMENT_COLLECTED'
  ],
  FOLLOW: ['NEW_FOLLOWER']
};

const QUICK_ENTRY_CONFIGS = [{
  key: 'comment',
  icon: 'chatbubbles',
  color: '#3b82f6',
  bucketKey: 'COMMENT_SHARE'
}, {
  key: 'like',
  icon: 'heart',
  color: '#ef4444',
  bucketKey: 'LIKE_AGREE'
}, {
  key: 'bookmark',
  icon: 'bookmark',
  color: '#f59e0b',
  bucketKey: 'FAVORITE_ME'
}, {
  key: 'follow',
  icon: 'person-add',
  color: '#22c55e',
  bucketKey: 'FOLLOW'
}];

const MESSAGE_COPY = {
  interaction: '\u4e92\u52a8\u6d88\u606f',
  system: '\u7cfb\u7edf\u6d88\u606f',
  activity: '\u6d3b\u52a8\u6d88\u606f',
  allNotifications: '\u5168\u90e8\u901a\u77e5',
  noNotifications: '\u6682\u65e0\u901a\u77e5',
  notificationFallbackTitle: '\u901a\u77e5\u6d88\u606f',
  notificationFallbackSummary: '\u6682\u65e0\u66f4\u591a\u5185\u5bb9',
  clearFilter: '\u67e5\u770b\u5168\u90e8'
};

const CATEGORY_CONFIGS = [{
  key: 'INTERACTION',
  title: '浜掑姩',
  icon: 'chatbubble-ellipses',
  iconBg: '#dcfce7',
  iconColor: '#22c55e'
}, {
  key: 'SYSTEM',
  title: '绯荤粺',
  icon: 'settings',
  iconBg: '#f3f4f6',
  iconColor: '#6b7280'
}, {
  key: 'ACTIVITY',
  title: '娲诲姩',
  icon: 'megaphone',
  iconBg: '#dbeafe',
  iconColor: '#3b82f6'
}];

const EMPTY_SUMMARY = {
  totalUnread: 0,
  byCategory: {
    INTERACTION: 0,
    SYSTEM: 0,
    ACTIVITY: 0
  },
  buckets: {
    COMMENT_SHARE: 0,
    INVITE_ANSWER: 0,
    ARBITRATION: 0,
    LIKE_AGREE: 0,
    FAVORITE_ME: 0,
    FOLLOW: 0
  },
  privateUnread: 0
};

const DEFAULT_NOTIFICATION_FILTER = {
  mode: 'all',
  title: '鍏ㄩ儴閫氱煡',
  category: null,
  bucketKey: null,
  eventTypes: []
};

const NOTIFICATION_PAGE_SIZE = 10;
const FOLLOWING_PAGE_SIZE = 100;
const MAX_FOLLOWING_PAGES = 10;

const isSuccessResponse = response => response && (response.code === 200 || response.code === 0);

const toSafeNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractFollowingTotal = response => {
  const payload = response?.data;
  const nestedData = payload?.data;

  return toPositiveNumber(payload?.total) || toPositiveNumber(payload?.count) || toPositiveNumber(payload?.totalCount) || toPositiveNumber(payload?.pagination?.total) || toPositiveNumber(payload?.page?.total) || toPositiveNumber(nestedData?.total) || toPositiveNumber(nestedData?.count) || toPositiveNumber(nestedData?.totalCount) || null;
};

const safeJsonParse = value => {
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

const MOJIBAKE_PATTERN = /�|[閺闂缁濮娴妤鐠鍒鍓宸韫堫亞銉璇]{2,}/;

const isLikelyMojibakeText = value => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return /娑堟|鏆傛|閫氱煡|鍒嗛挓|灏忔椂|缁|妫ら|鍙戦€?/.test(trimmed);
};

const sanitizeDisplayText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || /\uFFFD|[\u95FA\u95C2\u7F01\u6FDE\u5A34\u59A4\u9420\u9352\u9353\u5BB8\u97EB]{2,}/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
};

const formatRelativeTime = value => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return '\u521a\u521a';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}\u5206\u949f\u524d`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}\u5c0f\u65f6\u524d`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}\u5929\u524d`;
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const findBucketKeyForEventType = eventType => Object.entries(BUCKET_EVENT_TYPE_MAP).find(([, eventTypes]) => eventTypes.includes(eventType))?.[0] || null;

const buildQuickEntries = summary => QUICK_ENTRY_CONFIGS.map(entry => ({
  ...entry,
  count: toSafeNumber(summary?.buckets?.[entry.bucketKey])
}));

const normalizeSummary = summary => ({
  ...EMPTY_SUMMARY,
  ...summary,
  totalUnread: toSafeNumber(summary?.totalUnread),
  privateUnread: toSafeNumber(summary?.privateUnread),
  byCategory: {
    ...EMPTY_SUMMARY.byCategory,
    ...(summary?.byCategory || {})
  },
  buckets: {
    ...EMPTY_SUMMARY.buckets,
    ...(summary?.buckets || {})
  }
});

const extractEmergencyListRows = (response) => {
  const data = response?.data;
  const candidates = [
    data,
    data?.rows,
    data?.list,
    data?.records,
    data?.items,
    data?.content,
    data?.data,
    data?.data?.rows,
    data?.data?.list,
    data?.data?.records,
    data?.page?.rows,
    data?.page?.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const toNullableNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDistanceLabel = (distanceMeters, fallbackLabel = '') => {
  const meters = Number(distanceMeters);
  if (Number.isFinite(meters) && meters > 0) {
    if (meters >= 1000) {
      const km = meters / 1000;
      const kmLabel = km >= 10 ? Math.round(km).toString() : km.toFixed(1).replace(/\.0$/, '');
      return `${kmLabel}km`;
    }
    return `${Math.round(meters)}m`;
  }

  if (typeof fallbackLabel === 'string' && fallbackLabel.trim()) {
    return fallbackLabel.trim();
  }

  return '';
};

const normalizeEmergencyListItem = (item = {}, index = 0) => {
  const id = item?.id ?? item?.helpId ?? item?.emergencyId ?? `emergency-${index}`;
  const rescuerCount = Math.max(0, Math.round(toSafeNumber(item?.neededHelperCount ?? item?.rescuerCount)));
  const respondedCount = Math.max(0, Math.round(toSafeNumber(
    item?.responderCount ??
    item?.responseCount ??
    item?.respondedHelperCount ??
    item?.respondedCount ??
    item?.currentHelperCount
  )));
  const rawTimestamp = item?.createTime ?? item?.publishTime ?? item?.gmtCreate ?? item?.createdAt ?? item?.timestamp ?? null;
  const parsedTimestamp = rawTimestamp ? new Date(rawTimestamp).getTime() : NaN;
  const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now();

  return {
    id,
    ownerUserId: String(
      item?.appUserId ??
      item?.seekerUserId ??
      item?.authorId ??
      item?.creatorId ??
      item?.userId ??
      ''
    ),
    avatar: item?.avatar || item?.avatarUrl || item?.userAvatar || item?.seekerAvatar || '',
    name: sanitizeDisplayText(
      item?.seekerNickName ||
      item?.nickName ||
      item?.nickname ||
      item?.seekerName ||
      item?.userName ||
      item?.username ||
      item?.name,
      `User ${id}`
    ),
    title: sanitizeDisplayText(item?.title || item?.description, '\u7d27\u6025\u6c42\u52a9'),
    location: sanitizeDisplayText(item?.regionDisplay || item?.addressText || item?.location || item?.locationText, '\u4f4d\u7f6e\u5f85\u8865\u5145'),
    latitude: toNullableNumber(item?.latitude),
    longitude: toNullableNumber(item?.longitude),
    distance: formatDistanceLabel(item?.distanceMeters, item?.distanceText || item?.distance),
    time: formatRelativeTime(rawTimestamp || timestamp),
    timestamp,
    rescuerCount,
    respondedCount,
    responseCount: respondedCount,
    status: item?.status || '',
    urgencyLevel: item?.urgencyLevel,
  };
};

const extractEmergencyDetailPayload = (response) => {
  const rootData = response?.data;
  const candidates = [rootData, rootData?.data];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate;
    }
  }

  return {};
};

const normalizeEmergencyResponder = (item = {}, index = 0) => {
  const id = item?.userId ?? item?.id ?? `responder-${index}`;
  return {
    id: String(id),
    userId: item?.userId ?? id,
    name: sanitizeDisplayText(item?.nickName || item?.nickname || item?.name, '\u533f\u540d\u7528\u6237'),
    avatar: item?.avatar || item?.avatarUrl || '',
    joinTime: item?.joinTime || '',
  };
};

const formatCurrencyFromCents = (value) => {
  const cents = Math.max(0, Math.round(toSafeNumber(value, 0)));
  return '$' + (cents / 100).toFixed(2);
};

const getEmergencyOwnerUserId = (detail = {}, fallbackOwnerUserId = '') => String(
  detail?.ownerUserId ??
  detail?.appUserId ??
  detail?.seekerUserId ??
  detail?.authorId ??
  detail?.creatorId ??
  detail?.publisherId ??
  detail?.userId ??
  detail?.user?.id ??
  fallbackOwnerUserId ??
  ''
).trim();

const canViewEmergencyFee = (detail, currentUserId) => {
  const normalizedCurrentUserId = String(currentUserId || '').trim();
  const ownerUserId = getEmergencyOwnerUserId(detail);
  return Boolean(normalizedCurrentUserId && ownerUserId && normalizedCurrentUserId === ownerUserId);
};

const normalizeEmergencyDetail = (detail = {}, fallbackItem = null) => {
  const neededHelperCount = Math.max(0, Math.round(toSafeNumber(detail?.neededHelperCount, fallbackItem?.rescuerCount || 0)));
  const responderCount = Math.max(0, Math.round(toSafeNumber(detail?.responderCount, fallbackItem?.respondedCount || fallbackItem?.responseCount || 0)));
  const responders = Array.isArray(detail?.responders)
    ? detail.responders.map((item, index) => normalizeEmergencyResponder(item, index))
    : (fallbackItem?.responders || []).map((item, index) => normalizeEmergencyResponder(item, index));

  const locationParts = [detail?.regionDisplay, detail?.detailAddress].filter(Boolean);
  const fallbackLocation = sanitizeDisplayText(fallbackItem?.location, '\u4f4d\u7f6e\u5f85\u8865\u5145');

  return {
    id: String(detail?.id ?? fallbackItem?.id ?? ''),
    ownerUserId: getEmergencyOwnerUserId(detail, fallbackItem?.ownerUserId),
    name: sanitizeDisplayText(detail?.seekerNickName || fallbackItem?.name, '\u533f\u540d\u7528\u6237'),
    avatar: detail?.seekerAvatar || fallbackItem?.avatar || '',
    title: sanitizeDisplayText(detail?.title || fallbackItem?.title, '\u7d27\u6025\u6c42\u52a9'),
    description: sanitizeDisplayText(detail?.description || detail?.descriptionSummary, '\u6682\u65e0\u8be6\u7ec6\u63cf\u8ff0'),
    location: locationParts.length > 0 ? sanitizeDisplayText(locationParts.join(' '), fallbackLocation) : fallbackLocation,
    distanceLabel: formatDistanceLabel(detail?.distanceMeters, fallbackItem?.distance || ''),
    relativeTime: detail?.relativeTime || formatRelativeTime(detail?.createTime) || fallbackItem?.time || '',
    neededHelperCount,
    responderCount,
    publishFeeCents: Math.max(0, Math.round(toSafeNumber(detail?.publishFeeCents, 0))),
    helperOverageFeeCents: Math.max(0, Math.round(toSafeNumber(detail?.helperOverageFeeCents, 0))),
    responders,
  };
};

// 閭€璇峰洖绛旀暟鎹?
const inviteAnswers = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite1',
    name: '张三丰',
    question: '如何在三个月内从零基础学会 Python 编程？',
    time: '10分钟前',
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite2',
    name: '李小龙',
    question: '35 岁程序员如何规划职业发展？',
    time: '30分钟前',
  },
];

const arbitrationInvites = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    name: '张三丰',
    question: '如何在三个月内从零基础学会 Python 编程？',
    answer: 'Python老司机',
    reason: '原答案中的时间估计偏乐观，建议补充更细化的学习路径。',
    time: '5分钟前',
    status: 'pending',
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    name: '李四',
    question: 'React 和 Vue 应该选择哪个？',
    answer: '前端专家',
    reason: '建议从团队规模和生态维护成本两个维度来判断。',
    time: '1小时前',
    status: 'voted',
  },
];

const messageGroups = [
  {
    type: 'official',
    icon: 'megaphone',
    iconBg: '#dbeafe',
    iconColor: '#3b82f6',
    lastMessage: '平台新功能上线通知：现已支持视频回答。',
    time: '1小时前',
    unread: 2,
  },
  {
    type: 'question',
    icon: 'help-circle',
    iconBg: '#dcfce7',
    iconColor: '#22c55e',
    lastMessage: '您关注的问题有 3 个新回答。',
    time: '2小时前',
    unread: 3,
  },
  {
    type: 'system',
    icon: 'settings',
    iconBg: '#f3f4f6',
    iconColor: '#6b7280',
    lastMessage: '您的账户安全设置已更新。',
    time: '昨天',
    unread: 0,
  },
];

const privateMessages = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
    name: 'Python老司机',
    verified: true,
    lastMessage: '谢谢你的回答，帮了我很大的忙。',
    time: '30分钟前',
    unread: 2,
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
    name: '数据分析师小王',
    lastMessage: '请问你有时间交流一下吗？',
    time: '1小时前',
    unread: 1,
  },
  {
    id: 3,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
    name: '美食达人',
    lastMessage: '好的，我会试试你推荐的方法。',
    time: '3小时前',
    unread: 0,
  },
  {
    id: 4,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
    name: '编程新手',
    lastMessage: '太感谢了！',
    time: '昨天',
    unread: 0,
  },
];

const allUsers = [
  {
    id: 1,
    name: 'Python老司机',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
    title: '资深Python开发',
    verified: true,
  },
  {
    id: 2,
    name: '数据分析师小王',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
    title: '数据分析师',
  },
  {
    id: 3,
    name: '美食达人',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
    title: '美食博主',
  },
  {
    id: 4,
    name: '编程新手',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
    title: '学生',
  },
  {
    id: 5,
    name: '王医生',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow2',
    title: '三甲医院主治医师',
    verified: true,
  },
  {
    id: 6,
    name: '程序员小张',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow4',
    title: '全栈开发工程师',
  },
  {
    id: 7,
    name: '设计师小陈',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow5',
    title: 'UI/UX设计师',
  },
];
export default function MessagesScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const isFocused = useIsFocused();
  const bottomSafeInset = useBottomSafeInset(16);
  const followingLoadRequestIdRef = React.useRef(0);
  const { respondedEmergencies, ignoredEmergencies, respondToEmergency, ignoreEmergency } = useEmergency();
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [currentArbitration, setCurrentArbitration] = useState(null);
  const [voteChoice, setVoteChoice] = useState(null); // 'agree' or 'disagree'
  const [voteReason, setVoteReason] = useState('');
  const [showArbitrationResultModal, setShowArbitrationResultModal] = useState(false);
  const [currentArbitrationResult, setCurrentArbitrationResult] = useState(null);
  const [notificationSummary, setNotificationSummary] = useState(EMPTY_SUMMARY);
  const [notificationFilter, setNotificationFilter] = useState(DEFAULT_NOTIFICATION_FILTER);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationLoadingMore, setNotificationLoadingMore] = useState(false);
  const [categoryPreviewMap, setCategoryPreviewMap] = useState({});
  const [privateConversations, setPrivateConversations] = useState([]);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [privateSending, setPrivateSending] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followingUsersLoading, setFollowingUsersLoading] = useState(false);
  const [followingUsersLoadError, setFollowingUsersLoadError] = useState('');
  const [emergencyRequestsData, setEmergencyRequestsData] = useState([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyLoadError, setEmergencyLoadError] = useState('');
  const [showEmergencyRespondersModal, setShowEmergencyRespondersModal] = useState(false);
  const [selectedEmergencyResponders, setSelectedEmergencyResponders] = useState(null);
  const [emergencyRespondersLoading, setEmergencyRespondersLoading] = useState(false);
  const [emergencyRespondersError, setEmergencyRespondersError] = useState('');
  const [showEmergencyDetailModal, setShowEmergencyDetailModal] = useState(false);
  const [selectedEmergencyDetail, setSelectedEmergencyDetail] = useState(null);
  const [emergencyDetailLoading, setEmergencyDetailLoading] = useState(false);
  const [emergencyDetailError, setEmergencyDetailError] = useState('');

  const quickEntryLabels = {
    comment: t('screens.messagesScreen.quickEntries.commentForward'),
    like: t('screens.messagesScreen.quickEntries.likeAgree'),
    bookmark: t('screens.messagesScreen.quickEntries.bookmarked'),
    follow: t('screens.messagesScreen.quickEntries.followSubscribe')
  };
  const quickEntries = buildQuickEntries(notificationSummary);
  const notificationGroupsDisplay = CATEGORY_CONFIGS.map(category => {
    const preview = categoryPreviewMap[category.key];
    const resolvedTitle = category.key === 'INTERACTION'
      ? MESSAGE_COPY.interaction
      : category.key === 'SYSTEM'
        ? MESSAGE_COPY.system
        : category.key === 'ACTIVITY'
          ? MESSAGE_COPY.activity
          : category.title;

    return {
      ...category,
      title: resolvedTitle,
      unread: toSafeNumber(notificationSummary.byCategory?.[category.key]),
      lastMessage: sanitizeDisplayText(preview?.summary, '') || sanitizeDisplayText(preview?.title, '') || MESSAGE_COPY.noNotifications,
      time: formatRelativeTime(preview?.createTime)
    };
  });
  const currentFilterTitleDisplay = sanitizeDisplayText(notificationFilter.title, MESSAGE_COPY.allNotifications);
  const notificationGroups = CATEGORY_CONFIGS.map(category => {
    const preview = categoryPreviewMap[category.key];
    return {
      ...category,
      unread: toSafeNumber(notificationSummary.byCategory?.[category.key]),
      lastMessage: preview?.summary || preview?.title || '鏆傛棤閫氱煡',
      time: formatRelativeTime(preview?.createTime)
    };
  });
  const currentFilterTitle = notificationFilter.title || '鍏ㄩ儴閫氱煡';
  const canLoadMoreNotifications = notificationFilter.mode !== 'bucket' && notificationItems.length < notificationTotal;
  const respondedEmergencyIdSet = React.useMemo(() => new Set(respondedEmergencies.map(id => String(id))), [respondedEmergencies]);
  const ignoredEmergencyIdSet = React.useMemo(() => new Set(ignoredEmergencies.map(id => String(id))), [ignoredEmergencies]);

  const loadEmergencyRequests = async () => {
    setEmergencyLoading(true);
    setEmergencyLoadError('');

    try {
      const response = await emergencyApi.getList({
        tab: 'all',
        pageNum: 1,
        pageSize: 20,
      });

      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '加载紧急求助失败');
      }

      const rows = extractEmergencyListRows(response);
      const normalizedRows = rows.map((item, index) => normalizeEmergencyListItem(item, index))
        .filter(item => item?.id !== undefined && item?.id !== null)
        .sort((left, right) => toSafeNumber(right?.timestamp) - toSafeNumber(left?.timestamp));

      setEmergencyRequestsData(normalizedRows);
    } catch (error) {
      console.error('鍔犺浇绱ф€ユ眰鍔╁垪琛ㄥけ璐?', error);
      setEmergencyRequestsData([]);
      setEmergencyLoadError(error?.message || '加载紧急求助失败');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const applyNotificationReadLocally = notification => {
    if (!notification || toSafeNumber(notification.readFlag) === 1) {
      return;
    }
    const bucketKey = findBucketKeyForEventType(notification.eventType);
    setNotificationItems(prev => prev.map(item => String(item.id) === String(notification.id) ? {
      ...item,
      readFlag: 1,
      readTime: new Date().toISOString()
    } : item));
    setNotificationSummary(prev => ({
      ...prev,
      totalUnread: Math.max(0, toSafeNumber(prev.totalUnread) - 1),
      byCategory: {
        ...prev.byCategory,
        [notification.category]: Math.max(0, toSafeNumber(prev.byCategory?.[notification.category]) - 1)
      },
      buckets: bucketKey ? {
        ...prev.buckets,
        [bucketKey]: Math.max(0, toSafeNumber(prev.buckets?.[bucketKey]) - 1)
      } : prev.buckets
    }));
  };

  const loadNotificationSummary = async () => {
    try {
      const response = await notificationApi.getNotificationSummary({
        includePrivateUnread: true
      });
      if (isSuccessResponse(response) && response.data) {
        setNotificationSummary(normalizeSummary(response.data));
      }
    } catch (error) {
      console.error('鍔犺浇閫氱煡姹囨€诲け璐?', error);
    }
  };

  const loadCategoryPreviews = async () => {
    try {
      const results = await Promise.all(CATEGORY_CONFIGS.map(async category => {
        const response = await notificationApi.getNotificationList({
          pageNum: 1,
          pageSize: 1,
          category: category.key
        });
        return [category.key, response?.data?.rows?.[0] || null];
      }));
      setCategoryPreviewMap(Object.fromEntries(results));
    } catch (error) {
      console.error('鍔犺浇閫氱煡鍒嗙被棰勮澶辫触:', error);
    }
  };

  const loadPrivateUnreadBrief = async () => {
    setPrivateLoading(true);
    try {
      const response = await notificationApi.getPrivateUnreadBrief({
        limit: 20
      });
      if (isSuccessResponse(response) && response.data) {
        setPrivateConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('鍔犺浇绉佷俊绠€琛ㄥけ璐?', error);
    } finally {
      setPrivateLoading(false);
    }
  };

  const loadFollowingUsers = async () => {
    const requestId = followingLoadRequestIdRef.current + 1;
    followingLoadRequestIdRef.current = requestId;
    setFollowingUsersLoading(true);
    setFollowingUsersLoadError('');

    try {
      let pageNum = 1;
      let expectedTotal = null;
      let mergedUsers = [];

      while (pageNum <= MAX_FOLLOWING_PAGES) {
        const response = await userApi.getFollowing({
          pageNum,
          page: pageNum,
          pageSize: FOLLOWING_PAGE_SIZE,
          size: FOLLOWING_PAGE_SIZE,
          limit: FOLLOWING_PAGE_SIZE
        });
        const pageUsers = normalizeFollowingResponse(response);
        mergedUsers = [...mergedUsers, ...pageUsers].filter((user, index, list) => list.findIndex(currentUser => String(currentUser.userId || currentUser.id) === String(user.userId || user.id)) === index);

        if (expectedTotal === null) {
          expectedTotal = extractFollowingTotal(response);
        }
        if (pageUsers.length < FOLLOWING_PAGE_SIZE) {
          break;
        }
        if (expectedTotal && mergedUsers.length >= expectedTotal) {
          break;
        }

        pageNum += 1;
      }

      if (followingLoadRequestIdRef.current !== requestId) {
        return;
      }

      setFollowingUsers(mergedUsers);
    } catch (error) {
      if (followingLoadRequestIdRef.current !== requestId) {
        return;
      }

      console.error('鍔犺浇鍏虫敞鍒楄〃澶辫触:', error);
      setFollowingUsers([]);
      setFollowingUsersLoadError(error.message || t('screens.privateConversation.loadFailed'));
    } finally {
      if (followingLoadRequestIdRef.current === requestId) {
        setFollowingUsersLoading(false);
      }
    }
  };

  const loadNotifications = async (filter = notificationFilter, pageNum = 1, append = false) => {
    if (filter.mode === 'bucket') {
      setNotificationLoading(pageNum === 1);
      try {
        const responses = await Promise.all(filter.eventTypes.map(eventType => notificationApi.getNotificationList({
          pageNum: 1,
          pageSize: NOTIFICATION_PAGE_SIZE,
          eventType
        })));
        const total = responses.reduce((sum, response) => sum + toSafeNumber(response?.data?.total), 0);
        const merged = responses.flatMap(response => response?.data?.rows || []);
        const deduped = Array.from(new Map(merged.map(item => [String(item.id), item])).values()).sort((left, right) => new Date(right.createTime || 0).getTime() - new Date(left.createTime || 0).getTime());
        setNotificationItems(deduped.slice(0, NOTIFICATION_PAGE_SIZE * 2));
        setNotificationTotal(total);
        setNotificationPage(1);
      } catch (error) {
        console.error('鍔犺浇妗堕€氱煡澶辫触:', error);
        showAppAlert('鎻愮ず', error.message || '鍔犺浇閫氱煡澶辫触锛岃绋嶅悗閲嶈瘯');
      } finally {
        setNotificationLoading(false);
        setNotificationLoadingMore(false);
      }
      return;
    }

    if (pageNum === 1) {
      setNotificationLoading(true);
    } else {
      setNotificationLoadingMore(true);
    }

    try {
      const response = await notificationApi.getNotificationList({
        pageNum,
        pageSize: NOTIFICATION_PAGE_SIZE,
        category: filter.category || undefined
      });
      if (isSuccessResponse(response) && response.data) {
        const rows = response.data.rows || [];
        setNotificationItems(prev => append ? [...prev, ...rows] : rows);
        setNotificationTotal(toSafeNumber(response.data.total));
        setNotificationPage(pageNum);
      }
    } catch (error) {
      console.error('鍔犺浇閫氱煡鍒楄〃澶辫触:', error);
      if (pageNum === 1) {
        showAppAlert('鎻愮ず', error.message || '鍔犺浇閫氱煡澶辫触锛岃绋嶅悗閲嶈瘯');
      }
    } finally {
      setNotificationLoading(false);
      setNotificationLoadingMore(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadCurrentUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (!mounted) {
          return;
        }

        setCurrentUserId(String(currentUser?.userId ?? currentUser?.id ?? '').trim());
      } catch (error) {
        console.error('Failed to load current user for messages emergency cards:', error);
        if (mounted) {
          setCurrentUserId('');
        }
      }
    };

    void loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    loadNotificationSummary();
    loadCategoryPreviews();
    loadPrivateUnreadBrief();
    loadEmergencyRequests();
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    loadNotifications(notificationFilter, 1, false);
  }, [isFocused, notificationFilter]);

  const handleQuickEntryPress = entry => {
    const nextFilter = notificationFilter.mode === 'bucket' && notificationFilter.bucketKey === entry.bucketKey ? DEFAULT_NOTIFICATION_FILTER : {
      mode: 'bucket',
      title: quickEntryLabels[entry.key],
      category: null,
      bucketKey: entry.bucketKey,
      eventTypes: BUCKET_EVENT_TYPE_MAP[entry.bucketKey] || []
    };
    setNotificationFilter(nextFilter);
  };

  const handleCategoryPress = group => {
    const nextFilter = notificationFilter.mode === 'category' && notificationFilter.category === group.key ? DEFAULT_NOTIFICATION_FILTER : {
      mode: 'category',
      title: `${group.title}閫氱煡`,
      category: group.key,
      bucketKey: null,
      eventTypes: []
    };
    setNotificationFilter(nextFilter);
  };

  const handleNotificationPress = async notification => {
    if (toSafeNumber(notification.readFlag) !== 1) {
      try {
        const response = await notificationApi.markNotificationRead(notification.id);
        if (isSuccessResponse(response)) {
          applyNotificationReadLocally(notification);
        }
      } catch (error) {
        showAppAlert('鎻愮ず', error.message || '鏍囪宸茶澶辫触锛岃绋嶅悗閲嶈瘯');
        return;
      }
    }

    const payload = safeJsonParse(notification.payload) || {};
    const routeName = `${payload.route || ''}`.toUpperCase();
    const questionId = payload.questionId ?? payload.question_id ?? null;
    const answerId = payload.answerId ?? payload.answer_id ?? null;
    const supplementId = payload.supplementId ?? payload.supplement_id ?? null;
    const activityId = payload.activityId ?? payload.activity_id ?? payload.id ?? null;

    if ((routeName.includes('ACTIVITY') || notification.category === 'ACTIVITY') && activityId) {
      navigation.navigate('ActivityDetail', {
        id: activityId
      });
      return;
    }
    if ((routeName.includes('SUPPLEMENT') || supplementId) && supplementId) {
      navigation.navigate('SupplementDetail', {
        id: supplementId,
        parentQuestionId: questionId || undefined
      });
      return;
    }
    if ((routeName.includes('ANSWER') || answerId) && answerId) {
      navigation.navigate('AnswerDetail', {
        answer: {
          id: answerId,
          questionId: questionId || undefined
        },
        questionId: questionId || undefined
      });
      return;
    }
    if (questionId) {
      navigation.navigate('QuestionDetail', {
        id: questionId
      });
      return;
    }
    showAppAlert(notification.title || '閫氱煡', notification.summary || '褰撳墠閫氱煡鏆傛棤鍙烦杞殑涓氬姟鏁版嵁');
  };

  const handleMarkAllRead = () => {
    const targetCategory = notificationFilter.mode === 'category' ? notificationFilter.category : undefined;
    showAppAlert(t('screens.messagesScreen.alerts.markAllReadTitle'), t('screens.messagesScreen.alerts.markAllReadMessage'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: async () => {
        try {
          const response = await notificationApi.markAllNotificationsRead(targetCategory);
          if (isSuccessResponse(response)) {
            await Promise.all([
              loadNotificationSummary(),
              loadCategoryPreviews(),
              loadNotifications(notificationFilter, 1, false)
            ]);
            showAppAlert(t('screens.messagesScreen.alerts.success'), t('screens.messagesScreen.alerts.markAllReadSuccess'));
          }
        } catch (error) {
          showAppAlert('鎻愮ず', error.message || '鍏ㄩ儴宸茶澶辫触锛岃绋嶅悗閲嶈瘯');
        }
      }
    }]);
  };

  const resetPrivateComposer = () => {
    followingLoadRequestIdRef.current += 1;
    setShowPrivateModal(false);
    setSelectedUser(null);
    setMessageContent('');
    setSearchText('');
    setFollowingUsersLoadError('');
  };

  const openPrivateComposer = () => {
    followingLoadRequestIdRef.current += 1;
    setShowPrivateModal(true);
    setSelectedUser(null);
    setMessageContent('');
    setSearchText('');
    loadFollowingUsers();
  };

  const handleSendMessage = async () => {
    if (!selectedUser) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.selectUserHint'));
      return;
    }
    if (!messageContent.trim()) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.enterMessageHint'));
      return;
    }

    if (privateSending) {
      return;
    }

    setPrivateSending(true);

    try {
      await sendPlainPrivateMessage({
        recipientUserId: selectedUser.userId || selectedUser.id,
        content: messageContent,
      });

      showAppAlert(
        t('screens.messagesScreen.alerts.success'),
        t('screens.messagesScreen.alerts.sendSuccess').replace('{name}', selectedUser.nickname || selectedUser.username || selectedUser.name || `${selectedUser.userId || selectedUser.id}`)
      );
      resetPrivateComposer();
      loadNotificationSummary();
      loadPrivateUnreadBrief();
    } catch (error) {
      showAppAlert('提示', error.message || '发送失败，请稍后重试');
    } finally {
      setPrivateSending(false);
    }
  };
  const handleOpenVoteModal = arbitration => {
    setCurrentArbitration(arbitration);
    setShowVoteModal(true);
  };
  const handleSubmitVote = () => {
    if (!voteChoice) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.selectVoteHint'));
      return;
    }
    if (!voteReason.trim()) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.enterReasonHint'));
      return;
    }
    showAppAlert(t('screens.messagesScreen.alerts.success'), t('screens.messagesScreen.alerts.voteSuccess'));
    setShowVoteModal(false);
    setCurrentArbitration(null);
    setVoteChoice(null);
    setVoteReason('');
  };

  // 澶勭悊鍝嶅簲绱ф€ユ眰鍔?  // 处理响应紧急求助
  const handleRespondEmergency = (item) => {
    showAppAlert('\u786e\u8ba4\u54cd\u5e94', `\u786e\u5b9a\u8981\u54cd\u5e94 ${item.name} \u7684\u7d27\u6025\u6c42\u52a9\u5417\uff1f`, [
      { text: '\u53d6\u6d88', style: 'cancel' },
      {
        text: '\u7acb\u5373\u54cd\u5e94',
        onPress: async () => {
          try {
            const response = await emergencyApi.joinHelp(item.id);
            if (!isSuccessResponse(response)) {
              throw new Error(response?.msg || '\u52a0\u5165\u6551\u63f4\u5931\u8d25');
            }

            respondToEmergency(String(item.id));
            setEmergencyRequestsData(prev => prev.map(prevItem => {
              if (String(prevItem.id) !== String(item.id)) {
                return prevItem;
              }

              const nextCount = Math.max(0, toSafeNumber(prevItem.respondedCount)) + 1;
              return {
                ...prevItem,
                respondedCount: nextCount,
              };
            }));
            showAppAlert('\u6210\u529f', '\u5df2\u52a0\u5165\u6551\u63f4\uff0c\u8bf7\u5c3d\u5feb\u524d\u5f80\u73b0\u573a');
          } catch (error) {
            console.error('\u52a0\u5165\u6551\u63f4\u5931\u8d25:', error);
            showAppAlert('\u5931\u8d25', error?.message || '\u52a0\u5165\u6551\u63f4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
          }
        }
      }
    ]);
  };

  const handleIgnoreEmergency = (item) => {
    ignoreEmergency(String(item.id));
  };

  const handleOpenEmergencyLocation = (item) => {
    if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9\u672a\u63d0\u4f9b\u53ef\u7528\u5750\u6807');
      return;
    }

    void openMapChooser({
      label: `${item.name} \u7684\u6c42\u52a9\u4f4d\u7f6e`,
      location: item.location,
      distance: item.distance,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  };

  const handleShowEmergencyResponders = async (item) => {
    setSelectedEmergencyResponders(item);
    setEmergencyRespondersError('');
    setShowEmergencyRespondersModal(true);

    if (!item?.id) {
      return;
    }

    setEmergencyRespondersLoading(true);
    try {
      const response = await emergencyApi.getDetail(item.id);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u52a0\u8f7d\u54cd\u5e94\u8005\u5931\u8d25');
      }

      const detailPayload = extractEmergencyDetailPayload(response);
      const normalizedDetail = normalizeEmergencyDetail(detailPayload, item);
      setSelectedEmergencyResponders({
        ...item,
        responders: normalizedDetail.responders,
        responseCount: normalizedDetail.responderCount,
      });
    } catch (error) {
      console.error('Failed to load emergency responders in messages screen:', error);
      setEmergencyRespondersError(error?.message || '\u52a0\u8f7d\u54cd\u5e94\u8005\u5931\u8d25');
    } finally {
      setEmergencyRespondersLoading(false);
    }
  };

  const handleShowEmergencyDetail = async (item) => {
    setSelectedEmergencyDetail(normalizeEmergencyDetail({}, item));
    setEmergencyDetailError('');
    setShowEmergencyDetailModal(true);

    if (!item?.id) {
      return;
    }

    setEmergencyDetailLoading(true);
    try {
      const response = await emergencyApi.getDetail(item.id);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u52a0\u8f7d\u8be6\u60c5\u5931\u8d25');
      }

      const detailPayload = extractEmergencyDetailPayload(response);
      setSelectedEmergencyDetail(normalizeEmergencyDetail(detailPayload, item));
    } catch (error) {
      console.error('Failed to load emergency detail in messages screen:', error);
      setEmergencyDetailError(error?.message || '\u52a0\u8f7d\u8be6\u60c5\u5931\u8d25');
    } finally {
      setEmergencyDetailLoading(false);
    }
  };

  const isWithinOneHour = (timestamp) => Number.isFinite(Number(timestamp)) && Date.now() - Number(timestamp) < 60 * 60 * 1000;

  const filteredEmergencyRequests = emergencyRequestsData
    .filter(item => {
      const isOwnEmergency = currentUserId !== '' && String(item?.ownerUserId || '').trim() === currentUserId;
      if (isOwnEmergency) {
        return false;
      }

      const isCompleted = toSafeNumber(item.respondedCount) >= toSafeNumber(item.rescuerCount) && toSafeNumber(item.rescuerCount) > 0;
      const idKey = String(item.id);
      return !ignoredEmergencyIdSet.has(idKey) && !isCompleted;
    })
    .slice(0, 3);

  const handleLoadMoreNotifications = () => {
    if (!canLoadMoreNotifications || notificationLoadingMore) {
      return;
    }
    loadNotifications(notificationFilter, notificationPage + 1, true);
  };
  const showMessageEmergencyFee = canViewEmergencyFee(selectedEmergencyDetail, currentUserId);
  const filteredUsers = filterFriendUsers(followingUsers, searchText);
  return <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.messagesScreen.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Text style={styles.markAllRead}>{t('screens.messagesScreen.markAllRead')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendMsgBtn} onPress={openPrivateComposer} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 椤堕儴蹇嵎鍏ュ彛 */}
        <View style={styles.quickSection}>
          <View style={styles.quickGrid}>
            {quickEntries.map(entry => <TouchableOpacity key={entry.key} style={styles.quickItem} onPress={() => handleQuickEntryPress(entry)}>
                <View style={[styles.quickIcon, {
              backgroundColor: entry.color + '20'
            }, notificationFilter.mode === 'bucket' && notificationFilter.bucketKey === entry.bucketKey && styles.quickIconActive]}>
                  <View style={[styles.quickIconInner, {
                borderColor: notificationFilter.mode === 'bucket' && notificationFilter.bucketKey === entry.bucketKey ? entry.color : 'transparent'
              }]}>
                    <Ionicons name={entry.icon} size={22} color={entry.color} />
                    {entry.count > 0 && <View style={styles.quickBadge}>
                        <Text style={styles.quickBadgeText}>{entry.count}</Text>
                      </View>}
                  </View>
                </View>
                <Text style={styles.quickLabel}>{quickEntryLabels[entry.key]}</Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 閭€璇峰洖绛旀ā鍧?*/}
        <View style={styles.inviteSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="hand-left" size={18} color="#f59e0b" />
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.inviteAnswer.title')}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionMore}>{t('screens.messagesScreen.inviteAnswer.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {inviteAnswers.map(item => <TouchableOpacity key={item.id} style={styles.inviteItem}>
              <Avatar uri={item.avatar} name={item.name} size={40} />
              <View style={styles.inviteContent}>
                <Text style={styles.inviteName}>{item.name} {t('screens.messagesScreen.inviteAnswer.invitedYou')}</Text>
                <Text style={styles.inviteQuestion} numberOfLines={1}>{item.question}</Text>
              </View>
              <View style={styles.inviteRight}>
                <Text style={styles.inviteTime}>{item.time}</Text>
                <TouchableOpacity style={styles.inviteBtn}>
                  <Text style={styles.inviteBtnText}>{t('screens.messagesScreen.inviteAnswer.goAnswer')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>)}
        </View>

        {/* 绱ф€ユ眰鍔╂ā鍧?*/}
        <View style={styles.emergencySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>{'\u7d27\u6025\u6c42\u52a9'}</Text>
              <View style={styles.emergencyPulse}>
                <View style={styles.emergencyPulseDot} />
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('EmergencyList')}>
              <Text style={styles.sectionMore}>{'\u67e5\u770b\u5168\u90e8'}</Text>
            </TouchableOpacity>
          </View>

          {emergencyLoading ? (
            <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View>
          ) : filteredEmergencyRequests.length === 0 ? (
            <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>{emergencyLoadError || '\u6682\u65e0\u7d27\u6025\u6c42\u52a9'}</Text>
            </View>
          ) : filteredEmergencyRequests.map(item => {
            const withinOneHour = isWithinOneHour(item.timestamp);
            const isResponded = respondedEmergencyIdSet.has(String(item.id));

            return (
              <EmergencyReceivedCard
                key={item.id}
                item={item}
                highlight={withinOneHour}
                isResponded={isResponded}
                onPressLocation={() => handleOpenEmergencyLocation(item)}
                onPressResponders={() => handleShowEmergencyResponders(item)}
                onPressViewDetail={() => handleShowEmergencyDetail(item)}
                onPressIgnore={() => handleIgnoreEmergency(item)}
                onPressRespond={() => handleRespondEmergency(item)}
              />
            );
          })}
        </View>
        {/* <View style={styles.arbitrationSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="gavel" size={18} color="#ef4444" />
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.arbitration.title')}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionMore}>{t('screens.messagesScreen.inviteAnswer.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {arbitrationInvites.map(item => <View key={item.id} style={styles.arbitrationItem}>
              <Avatar uri={item.avatar} name={item.name} size={40} />
              <View style={styles.arbitrationContent}>
                <View style={styles.arbitrationHeader}>
                  <Text style={styles.arbitrationName}>{item.name} {t('screens.messagesScreen.arbitration.invitedYou')}</Text>
                  {item.status === 'voted' && <View style={styles.votedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                      <Text style={styles.votedBadgeText}>{t('screens.messagesScreen.arbitration.voted')}</Text>
                    </View>}
                </View>
                <Text style={styles.arbitrationQuestion} numberOfLines={1}>
                  {t('screens.messagesScreen.arbitration.question')}锛歿item.question}
                </Text>
                <Text style={styles.arbitrationAnswer} numberOfLines={1}>
                  {t('screens.messagesScreen.arbitration.answerAuthor')}锛歿item.answer}
                </Text>
                <Text style={styles.arbitrationReason} numberOfLines={2}>
                  {t('screens.messagesScreen.arbitration.reason')}锛歿item.reason}
                </Text>
              </View>
              <View style={styles.arbitrationRight}>
                <Text style={styles.arbitrationTime}>{item.time}</Text>
                {item.status === 'pending' ? <TouchableOpacity style={styles.voteBtn} onPress={() => handleOpenVoteModal(item)}>
                    <Ionicons name="hand-right" size={14} color="#fff" />
                    <Text style={styles.voteBtnText}>{t('screens.messagesScreen.arbitration.goVote')}</Text>
                  </TouchableOpacity> : <TouchableOpacity style={styles.viewVoteBtn}>
                    <Text style={styles.viewVoteBtnText}>{t('screens.messagesScreen.arbitration.view')}</Text>
                  </TouchableOpacity>}
              </View>
            </View>)}
        </View> */}

        {/* 娑堟伅鍒嗙粍 */}
        <View style={styles.messageGroupSection}>
          {notificationGroupsDisplay.map(group => <TouchableOpacity key={group.key} style={[styles.messageGroupItem, notificationFilter.mode === 'category' && notificationFilter.category === group.key && styles.messageGroupItemActive]} onPress={() => handleCategoryPress(group)}>
              <View style={[styles.groupIcon, {
            backgroundColor: group.iconBg
          }]}>
                <Ionicons name={group.icon} size={22} color={group.iconColor} />
              </View>
              <View style={styles.groupContent}>
                <View style={styles.groupTitleRow}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Text style={styles.groupTime}>{group.time}</Text>
                </View>
                <Text style={styles.groupMessage} numberOfLines={1}>{group.lastMessage}</Text>
              </View>
              {group.unread > 0 && <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{group.unread}</Text>
                </View>}
            </TouchableOpacity>)}
        </View>

        {/* 绉佷俊鍒楄〃 */}
        <View style={styles.notificationSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications-outline" size={18} color="#ef4444" />
              <Text style={styles.sectionTitle}>{currentFilterTitleDisplay}</Text>
            </View>
            {notificationFilter.mode !== 'all' && <TouchableOpacity onPress={() => setNotificationFilter(DEFAULT_NOTIFICATION_FILTER)}>
                <Text style={styles.sectionMore}>{MESSAGE_COPY.clearFilter}</Text>
              </TouchableOpacity>}
          </View>
          {notificationLoading ? <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View> : notificationItems.length === 0 ? <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>{MESSAGE_COPY.noNotifications}</Text>
            </View> : <>
              {notificationItems.map(item => <TouchableOpacity key={item.id} style={[styles.notificationItem, toSafeNumber(item.readFlag) !== 1 && styles.notificationItemUnread]} onPress={() => handleNotificationPress(item)}>
                  <View style={styles.notificationBody}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>{sanitizeDisplayText(item.title, MESSAGE_COPY.notificationFallbackTitle)}</Text>
                      <Text style={styles.notificationTime}>{formatRelativeTime(item.createTime)}</Text>
                    </View>
                    <Text style={styles.notificationSummary} numberOfLines={2}>{sanitizeDisplayText(item.summary, '') || sanitizeDisplayText(item.eventType, MESSAGE_COPY.notificationFallbackSummary) || MESSAGE_COPY.notificationFallbackSummary}</Text>
                  </View>
                  {toSafeNumber(item.readFlag) !== 1 && <View style={styles.notificationUnreadDot} />}
                </TouchableOpacity>)}
              {canLoadMoreNotifications && <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMoreNotifications} disabled={notificationLoadingMore}>
                  {notificationLoadingMore ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.loadMoreText}>{'\u52a0\u8f7d\u66f4\u591a'}</Text>}
                </TouchableOpacity>}
            </>}
        </View>

        {false && (<View style={styles.notificationSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications-outline" size={18} color="#ef4444" />
              <Text style={styles.sectionTitle}>{currentFilterTitleDisplay}</Text>
            </View>
            {notificationFilter.mode !== 'all' && <TouchableOpacity onPress={() => setNotificationFilter(DEFAULT_NOTIFICATION_FILTER)}>
                <Text style={styles.sectionMore}>鏌ョ湅鍏ㄩ儴</Text>
              </TouchableOpacity>}
          </View>
          {notificationLoading ? <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View> : notificationItems.length === 0 ? <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>鏆傛棤閫氱煡</Text>
            </View> : <>
              {notificationItems.map(item => <TouchableOpacity key={item.id} style={[styles.notificationItem, toSafeNumber(item.readFlag) !== 1 && styles.notificationItemUnread]} onPress={() => handleNotificationPress(item)}>
                  <View style={styles.notificationBody}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>{item.title || '绔欏唴閫氱煡'}</Text>
                      <Text style={styles.notificationTime}>{formatRelativeTime(item.createTime)}</Text>
                    </View>
                    <Text style={styles.notificationSummary} numberOfLines={2}>{item.summary || item.eventType || '鏆傛棤鎽樿'}</Text>
                  </View>
                  {toSafeNumber(item.readFlag) !== 1 && <View style={styles.notificationUnreadDot} />}
                </TouchableOpacity>)}
              {canLoadMoreNotifications && <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMoreNotifications} disabled={notificationLoadingMore}>
                  {notificationLoadingMore ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.loadMoreText}>鍔犺浇鏇村</Text>}
                </TouchableOpacity>}
            </>}
        </View>)}

        <View style={styles.privateSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.privateMessages.title')}</Text>
              {notificationSummary.privateUnread > 0 && <View style={styles.inlineCountBadge}>
                  <Text style={styles.inlineCountBadgeText}>{notificationSummary.privateUnread}</Text>
                </View>}
            </View>
          </View>
          {privateLoading ? <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View> : privateConversations.length === 0 ? <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>{t('screens.messagesScreen.empty')}</Text>
            </View> : privateConversations.map(item => <TouchableOpacity key={item.conversationId} style={styles.privateItem} onPress={() => navigation.navigate('PrivateConversation', {
            conversationId: item.conversationId,
            peerUserId: item.peerUserId,
            peerNickName: item.peerNickName,
            peerAvatar: item.peerAvatar
          })}>
              <Avatar uri={item.peerAvatar} name={item.peerNickName} size={48} />
              <View style={styles.privateContent}>
                <View style={styles.privateTitleRow}>
                  <Text style={styles.privateName}>{item.peerNickName || `User ${item.peerUserId}`}</Text>
                  <Text style={styles.privateTime}>{formatRelativeTime(item.lastMessageTime)}</Text>
                </View>
                <Text style={styles.privateMessage} numberOfLines={1}>{item.lastMessagePreview || ''}</Text>
              </View>
              {toSafeNumber(item.unreadCount) > 0 && <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>{toSafeNumber(item.unreadCount)}</Text>
                </View>}
            </TouchableOpacity>)}
        </View>

        {false && <View style={styles.privateSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.privateMessages.title')}</Text>
              {notificationSummary.privateUnread > 0 && <View style={styles.inlineCountBadge}>
                  <Text style={styles.inlineCountBadgeText}>{notificationSummary.privateUnread}</Text>
                </View>}
            </View>
          </View>
          {privateLoading ? <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View> : privateConversations.length === 0 ? <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>鏆傛棤鏈绉佷俊</Text>
            </View> : privateConversations.map(item => <TouchableOpacity key={item.conversationId} style={styles.privateItem} onPress={() => showAppAlert('私信', '当前版本暂未接入私信会话详情页')}>
              <Avatar uri={item.peerAvatar} name={item.peerNickName} size={48} />
              <View style={styles.privateContent}>
                <View style={styles.privateTitleRow}>
                  <Text style={styles.privateName}>{item.peerNickName || `鐢ㄦ埛${item.peerUserId}`}</Text>
                  <Text style={styles.privateTime}>{formatRelativeTime(item.lastMessageTime)}</Text>
                </View>
                <Text style={styles.privateMessage} numberOfLines={1}>{item.lastMessagePreview || '鏆傛棤娑堟伅鍐呭'}</Text>
              </View>
              {toSafeNumber(item.unreadCount) > 0 && <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>{toSafeNumber(item.unreadCount)}</Text>
                </View>}
            </TouchableOpacity>)}
        </View>}

        <View style={{
        height: 20
      }} />
      </ScrollView>

      {/* 鍙戦€佺淇″脊绐?*/}
      <Modal visible={showEmergencyRespondersModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setShowEmergencyRespondersModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEmergencyRespondersModal(false)} />
          <View style={styles.respondersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'响应者列表'}</Text>
              <TouchableOpacity onPress={() => setShowEmergencyRespondersModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubTitle}>{`共 ${selectedEmergencyResponders?.responseCount || 0} 人响应`}</Text>
            </View>
            <ScrollView style={styles.respondersList} contentContainerStyle={styles.respondersListContent}>
              {emergencyRespondersLoading ? <View style={styles.detailLoadingRow}>
                  <ActivityIndicator color="#ef4444" size="small" />
                  <Text style={styles.detailLoadingText}>{'响应者加载中...'}</Text>
                </View> : emergencyRespondersError ? <Text style={styles.commentsErrorText}>{emergencyRespondersError}</Text> : selectedEmergencyResponders?.responders?.length ? selectedEmergencyResponders.responders.map(responder => <View key={responder.id || responder.userId || responder.name} style={styles.responderItem}>
                    <Avatar uri={responder.avatar || responder.avatarUrl} name={responder.name} size={40} />
                    <View style={styles.responderMeta}>
                      <Text style={styles.responderName}>{responder.name || '匿名用户'}</Text>
                      <Text style={styles.responderJoinTime}>{formatRelativeTime(responder.joinTime) || responder.joinTime || ''}</Text>
                    </View>
                  </View>) : <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{'暂无响应者'}</Text>
                </View>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEmergencyDetailModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setShowEmergencyDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEmergencyDetailModal(false)} />
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'求助详情'}</Text>
              <TouchableOpacity onPress={() => setShowEmergencyDetailModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {emergencyDetailLoading ? <View style={styles.emptyContainer}>
                <ActivityIndicator color="#ef4444" />
                <Text style={styles.emptyText}>{'详情加载中...'}</Text>
              </View> : <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
                <View style={styles.detailSection}>
                  <View style={styles.detailHeaderRow}>
                    <Avatar uri={selectedEmergencyDetail?.avatar} name={selectedEmergencyDetail?.name} size={44} />
                    <View style={styles.detailHeaderMeta}>
                      <Text style={styles.detailName}>{selectedEmergencyDetail?.name || '匿名用户'}</Text>
                      <Text style={styles.detailTime}>{selectedEmergencyDetail?.relativeTime || '--'}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailTitle}>{selectedEmergencyDetail?.title || '紧急求助'}</Text>
                  <Text style={styles.detailDescription}>{selectedEmergencyDetail?.description || '暂无详细描述'}</Text>
                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'求助位置'}</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.location || '位置待补充'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'距离'}</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.distanceLabel || '--'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'响应进度'}</Text>
                      <Text style={styles.detailInfoValue}>{`${selectedEmergencyDetail?.responderCount || 0}/${selectedEmergencyDetail?.neededHelperCount || 0}`}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'发布时间'}</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.relativeTime || '--'}</Text>
                    </View>
                  </View>
                  {showMessageEmergencyFee ? <View style={styles.detailFeeBox}>
                      <Text style={styles.detailFeeText}>{`发布超额费：${formatCurrencyFromCents(selectedEmergencyDetail?.publishFeeCents)}`}</Text>
                      <Text style={styles.detailFeeText}>{`救援超额费：${formatCurrencyFromCents(selectedEmergencyDetail?.helperOverageFeeCents)}`}</Text>
                    </View> : null}
                  <View style={styles.detailTagsRow}>
                    <View style={styles.detailTagNeutral}>
                      <Text style={styles.detailTagNeutralText}>{`${selectedEmergencyDetail?.responderCount || 0}人响应`}</Text>
                    </View>
                    <View style={styles.detailTagWarning}>
                      <Text style={styles.detailTagWarningText}>{`需${selectedEmergencyDetail?.neededHelperCount || 0}人`}</Text>
                    </View>
                  </View>
                  {emergencyDetailError ? <Text style={styles.detailErrorText}>{emergencyDetailError}</Text> : null}
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{'响应者'}</Text>
                  {selectedEmergencyDetail?.responders?.length ? selectedEmergencyDetail.responders.map(responder => <View key={responder.id || responder.userId || responder.name} style={styles.responderItem}>
                      <Avatar uri={responder.avatar || responder.avatarUrl} name={responder.name} size={38} />
                      <View style={styles.responderMeta}>
                        <Text style={styles.responderName}>{responder.name || '匿名用户'}</Text>
                        <Text style={styles.responderJoinTime}>{formatRelativeTime(responder.joinTime) || responder.joinTime || ''}</Text>
                      </View>
                    </View>) : <Text style={styles.emptyText}>{'暂无响应者'}</Text>}
                </View>
              </ScrollView>}
          </View>
        </View>
      </Modal>

      <Modal visible={showPrivateModal} animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.privateModalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <KeyboardDismissView>
            <ModalSafeAreaView style={styles.privateModal} edges={['top']}>
          <View style={styles.privateModalHeader}>
            <TouchableOpacity onPress={resetPrivateComposer}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.privateModalTitle}>{t('screens.messagesScreen.privateModal.title')}</Text>
            <TouchableOpacity style={[styles.sendBtn, (!selectedUser || !messageContent.trim() || privateSending) && styles.sendBtnDisabled]} onPress={handleSendMessage} disabled={!selectedUser || !messageContent.trim() || privateSending}>
              <Text style={[styles.sendBtnText, (!selectedUser || !messageContent.trim() || privateSending) && styles.sendBtnTextDisabled]}>{privateSending ? '鍙戦€佷腑...' : t('screens.messagesScreen.privateModal.send')}</Text>
            </TouchableOpacity>
          </View>

          {/* 鎼滅储鐢ㄦ埛 */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput style={styles.searchInput} placeholder={t('screens.messagesScreen.privateModal.searchPlaceholder')} value={searchText} onChangeText={setSearchText} />
              {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>}
            </View>
          </View>

          {/* 宸查€夋嫨鐨勭敤鎴?*/}
          <View style={[styles.selectedUserSection, {
          display: selectedUser ? 'flex' : 'none'
        }]}>
            <Text style={styles.selectedLabel}>{t('screens.messagesScreen.privateModal.sendTo')}</Text>
            <View style={styles.selectedUserTag}>
              <Avatar uri={selectedUser?.avatar} name={selectedUser?.nickname || selectedUser?.username || selectedUser?.name || `User ${selectedUser?.userId || selectedUser?.id || ''}`} size={24} />
              <Text style={styles.selectedUserName}>{selectedUser?.nickname || selectedUser?.username || selectedUser?.name || `User ${selectedUser?.userId || selectedUser?.id || ''}`}</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 鐢ㄦ埛鍒楄〃 */}
          <View style={[styles.userListSection, {
          display: selectedUser ? 'none' : 'flex'
        }]}>
            <Text style={styles.userListTitle}>{t('screens.messagesScreen.privateModal.selectUser')}</Text>
            <ScrollView style={styles.userList} contentContainerStyle={styles.userListContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
              {followingUsersLoading ? <View style={styles.userListFeedback}>
                  <ActivityIndicator color="#ef4444" />
                  <Text style={styles.userListFeedbackText}>{t('common.loading')}</Text>
                </View> : followingUsersLoadError ? <View style={styles.userListFeedback}>
                  <Text style={styles.userListFeedbackText}>{followingUsersLoadError}</Text>
                  <TouchableOpacity style={styles.userListRetryButton} onPress={loadFollowingUsers}>
                    <Text style={styles.userListRetryButtonText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </View> : filteredUsers.length === 0 ? <View style={styles.userListFeedback}>
                  <Text style={styles.userListFeedbackText}>{t('screens.messagesScreen.privateModal.emptyUsers')}</Text>
                </View> : filteredUsers.map(user => <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => setSelectedUser(user)}>
                  <Avatar uri={user.avatar} name={user.nickname || user.username || `User ${user.userId || user.id}`} size={44} />
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{user.nickname || user.username || `User ${user.userId || user.id}`}</Text>
                      {Boolean(user.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                    </View>
                    <Text style={styles.userTitle}>{user.username ? `@${user.username}` : `ID: ${user.userId || user.id}`}</Text>
                  </View>
                </TouchableOpacity>)}
            </ScrollView>
          </View>

          {/* 绉佷俊鍐呭 */}
          <View style={[styles.messageInputSection, {
          display: selectedUser ? 'flex' : 'none',
          paddingBottom: bottomSafeInset
        }]}>
            <Text style={styles.messageInputLabel}>{t('screens.messagesScreen.privateModal.messageContent')}</Text>
            <TextInput style={styles.messageTextInput} placeholder={t('screens.messagesScreen.privateModal.messagePlaceholder')} placeholderTextColor="#bbb" value={messageContent} onChangeText={setMessageContent} multiline textAlignVertical="top" />
          </View>
            </ModalSafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 涓撳鎶曠エ寮圭獥 */}
      <Modal visible={showVoteModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.voteModalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.voteModalOverlay}>
          <View style={[styles.voteModal, {
            paddingBottom: bottomSafeInset
          }]}>
            <View style={styles.voteModalHandle} />
            <Text style={styles.voteModalTitle}>{t('screens.messagesScreen.voteModal.title')}</Text>

            {Boolean(currentArbitration) && <ScrollView style={styles.voteModalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
                {/* 闂淇℃伅 */}
                <View style={styles.voteQuestionCard}>
                  <Text style={styles.voteQuestionLabel}>{t('screens.messagesScreen.voteModal.questionLabel')}</Text>
                  <Text style={styles.voteQuestionText}>{currentArbitration.question}</Text>
                  <View style={styles.voteAnswerRow}>
                    <Text style={styles.voteAnswerLabel}>{t('screens.messagesScreen.voteModal.answerAuthorLabel')}</Text>
                    <Text style={styles.voteAnswerAuthor}>{currentArbitration.answer}</Text>
                  </View>
                </View>

                {/* 浠茶鐞嗙敱 */}
                <View style={styles.voteReasonCard}>
                  <Text style={styles.voteReasonLabel}>{t('screens.messagesScreen.voteModal.reasonLabel')}</Text>
                  <Text style={styles.voteReasonText}>{currentArbitration.reason}</Text>
                  <View style={styles.voteApplicantRow}>
                    <Avatar uri={currentArbitration.avatar} name={currentArbitration.name} size={20} />
                    <Text style={styles.voteApplicantName}>{currentArbitration.name}</Text>
                    <Text style={styles.voteApplicantTime}>{currentArbitration.time}</Text>
                  </View>
                </View>

                {/* 鎶曠エ閫夐」 */}
                <Text style={styles.voteChoiceTitle}>{t('screens.messagesScreen.voteModal.voteChoiceTitle')}</Text>
                <View style={styles.voteChoices}>
                  <TouchableOpacity style={[styles.voteChoiceBtn, voteChoice === 'agree' && styles.voteChoiceBtnActive]} onPress={() => setVoteChoice('agree')}>
                    <View style={[styles.voteChoiceRadio, voteChoice === 'agree' && styles.voteChoiceRadioActive]}>
                      {voteChoice === 'agree' && <View style={styles.voteChoiceRadioDot} />}
                    </View>
                    <View style={styles.voteChoiceContent}>
                      <Text style={[styles.voteChoiceLabel, voteChoice === 'agree' && styles.voteChoiceLabelActive]}>{t('screens.messagesScreen.voteModal.agreeOverthrow')}</Text>
                      <Text style={styles.voteChoiceDesc}>
                        {t('screens.messagesScreen.voteModal.agreeOverthrowDesc')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.voteChoiceBtn, voteChoice === 'disagree' && styles.voteChoiceBtnActive]} onPress={() => setVoteChoice('disagree')}>
                    <View style={[styles.voteChoiceRadio, voteChoice === 'disagree' && styles.voteChoiceRadioActive]}>
                      {voteChoice === 'disagree' && <View style={styles.voteChoiceRadioDot} />}
                    </View>
                    <View style={styles.voteChoiceContent}>
                      <Text style={[styles.voteChoiceLabel, voteChoice === 'disagree' && styles.voteChoiceLabelActive]}>{t('screens.messagesScreen.voteModal.maintainOriginal')}</Text>
                      <Text style={styles.voteChoiceDesc}>
                        {t('screens.messagesScreen.voteModal.maintainOriginalDesc')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 鎶曠エ鐞嗙敱 */}
                <Text style={styles.voteReasonInputLabel}>{t('screens.messagesScreen.voteModal.reasonInputLabel')}</Text>
                <TextInput style={styles.voteReasonInput} placeholder={t('screens.messagesScreen.voteModal.reasonPlaceholder')} placeholderTextColor="#9ca3af" value={voteReason} onChangeText={setVoteReason} multiline numberOfLines={4} textAlignVertical="top" />

                <View style={{
              height: 20
            }} />
              </ScrollView>}

            <View style={[styles.voteModalFooter, {
            paddingBottom: bottomSafeInset
          }]}>
              <TouchableOpacity style={[styles.submitVoteBtn, (!voteChoice || !voteReason.trim()) && styles.submitVoteBtnDisabled]} onPress={handleSubmitVote} disabled={!voteChoice || !voteReason.trim()}>
                <Text style={styles.submitVoteBtnText}>{t('screens.messagesScreen.voteModal.submitVote')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelVoteBtn} onPress={() => {
              setShowVoteModal(false);
              setCurrentArbitration(null);
              setVoteChoice(null);
              setVoteReason('');
            }}>
                <Text style={styles.cancelVoteBtnText}>{t('screens.messagesScreen.voteModal.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backBtn: {
    marginRight: 12
  },
  headerTitle: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  markAllRead: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  sendMsgBtn: {
    padding: 4
  },
  content: {
    flex: 1
  },
  // 蹇嵎鍏ュ彛鏍峰紡
  quickSection: {
    backgroundColor: '#fff',
    paddingVertical: 16
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  quickItem: {
    alignItems: 'center'
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  quickIconActive: {
    transform: [{
      translateY: -1
    }]
  },
  quickIconInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  quickBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  quickLabel: {
    fontSize: scaleFont(12),
    color: '#4b5563',
    marginTop: 6
  },
  // 閭€璇峰洖绛旀牱寮?
  inviteSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  sectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  sectionMore: {
    fontSize: scaleFont(13),
    color: '#ef4444'
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  inviteContent: {
    flex: 1,
    marginLeft: 10
  },
  inviteName: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  inviteQuestion: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 2
  },
  inviteRight: {
    alignItems: 'flex-end'
  },
  inviteTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginBottom: 6
  },
  inviteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12
  },
  inviteBtnText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '500'
  },
  // 绱ф€ユ眰鍔╂牱寮?
  emergencySection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  emergencyPulse: {
    marginLeft: 6,
    width: 8,
    height: 8,
    position: 'relative'
  },
  emergencyPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4
  },
  emergencyItem: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
    position: 'relative',
    overflow: 'hidden'
  },
  emergencyItemHigh: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
    borderWidth: 2
  },
  emergencyIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#ef4444'
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  emergencyHeaderContent: {
    flex: 1,
    marginLeft: 10
  },
  emergencyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2
  },
  emergencyName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  urgentBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '700'
  },
  respondingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  respondingBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  emergencyTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  emergencyTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 10
  },
  emergencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  emergencyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1
  },
  emergencyLocation: {
    fontSize: scaleFont(13),
    color: '#4b5563',
    flex: 1
  },
  emergencyDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  emergencyDistanceText: {
    fontSize: scaleFont(12),
    color: '#d97706',
    fontWeight: '600'
  },
  emergencyFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12
  },
  emergencyFooterLeft: {
    flex: 1,
    gap: 8,
    marginRight: 8,
    minWidth: 0
  },
  emergencyFooterRight: {
    alignItems: 'flex-end',
    gap: 8
  },
  emergencyFooterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  emergencyRescuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap'
  },
  emergencyRescuerText: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  respondBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '700'
  },
  emergencyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  ignoreBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  ignoreBtnText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '600'
  },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  respondedBadgeText: {
    fontSize: scaleFont(13),
    color: '#22c55e',
    fontWeight: '600'
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  completedBadgeText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '600'
  },
  responseCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  responseCountText: {
    fontSize: scaleFont(12),
    color: '#2563eb',
    fontWeight: '600'
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  viewDetailBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 娑堟伅鍒嗙粍鏍峰紡
  messageGroupSection: {
    backgroundColor: '#fff',
    marginTop: 8
  },
  messageGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  messageGroupItemActive: {
    backgroundColor: '#fff7f7'
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupContent: {
    flex: 1,
    marginLeft: 12
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  groupTitle: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937'
  },
  groupTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  groupMessage: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginTop: 4
  },
  groupBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  groupBadgeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  notificationSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center'
  },
  sectionEmpty: {
    paddingVertical: 24,
    alignItems: 'center'
  },
  sectionEmptyText: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: modalTokens.overlay
  },
  respondersModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '65%',
    paddingBottom: 24
  },
  detailModal: {
    backgroundColor: '#F8F9FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7'
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#111827'
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalSubHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  modalSubTitle: {
    fontSize: scaleFont(16),
    color: '#6b7280'
  },
  respondersList: {
    maxHeight: 420
  },
  respondersListContent: {
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  responderMeta: {
    flex: 1
  },
  responderName: {
    fontSize: scaleFont(15),
    color: '#111827',
    fontWeight: '600'
  },
  responderJoinTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 4
  },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24
  },
  detailLoadingText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  commentsErrorText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24
  },
  detailScroll: {
    maxHeight: 640
  },
  detailScrollContent: {
    paddingTop: 16,
    paddingBottom: 24
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12
  },
  detailSectionTitle: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#111827'
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  detailHeaderMeta: {
    flex: 1
  },
  detailName: {
    fontSize: scaleFont(16),
    color: '#111827',
    fontWeight: '600'
  },
  detailTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 3
  },
  detailTitle: {
    fontSize: scaleFont(21),
    color: '#111827',
    fontWeight: '700',
    lineHeight: scaleFont(28)
  },
  detailDescription: {
    fontSize: scaleFont(15),
    color: '#6B7280',
    lineHeight: scaleFont(23)
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 2
  },
  detailInfoItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 12
  },
  detailInfoLabel: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginBottom: 6
  },
  detailInfoValue: {
    fontSize: scaleFont(15),
    color: '#111827',
    fontWeight: '500',
    lineHeight: scaleFont(22)
  },
  detailFeeBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8
  },
  detailFeeText: {
    fontSize: scaleFont(14),
    color: '#c2410c',
    fontWeight: '600'
  },
  detailTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  detailTagNeutral: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  detailTagNeutralText: {
    fontSize: scaleFont(13),
    color: '#2563eb',
    fontWeight: '600'
  },
  detailTagWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  detailTagWarningText: {
    fontSize: scaleFont(13),
    color: '#d97706',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10
  },
  emptyText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    textAlign: 'center'
  },
  detailErrorText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    lineHeight: scaleFont(20),
    marginHorizontal: 16,
    marginBottom: 18
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  notificationItemUnread: {
    backgroundColor: '#fffafa'
  },
  notificationBody: {
    flex: 1
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8
  },
  notificationTitle: {
    flex: 1,
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  notificationTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  notificationSummary: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(19)
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 10,
    marginTop: 6
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 4
  },
  loadMoreText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    fontWeight: '500'
  },
  // 绉佷俊鍒楄〃鏍峰紡
  privateSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  privateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  privateContent: {
    flex: 1,
    marginLeft: 12
  },
  privateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  privateName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937'
  },
  privateTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginLeft: 'auto'
  },
  privateMessage: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginTop: 4
  },
  privateBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  privateBadgeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  // 鍙戦€佺淇″脊绐楁牱寮?
  inlineCountBadge: {
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5
  },
  inlineCountBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  privateModal: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  privateModalKeyboardView: {
    flex: 1
  },
  privateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  privateModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: modalTokens.textPrimary
  },
  sendBtn: {
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius
  },
  sendBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  sendBtnText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  sendBtnTextDisabled: {
    color: '#fff'
  },
  searchSection: {
    padding: 12,
    backgroundColor: '#fff'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(14)
  },
  selectedUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: modalTokens.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  selectedLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginRight: 8
  },
  selectedUserTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6
  },
  selectedUserName: {
    fontSize: scaleFont(13),
    color: '#1f2937'
  },
  userListSection: {
    flex: 1,
    padding: 12
  },
  userListTitle: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12
  },
  userList: {
    flex: 1
  },
  userListContent: {
    paddingBottom: 16
  },
  userListFeedback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10
  },
  userListFeedbackText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 12
  },
  userListRetryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16
  },
  userListRetryButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#fff'
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  userInfo: {
    flex: 1,
    marginLeft: 12
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  userName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937'
  },
  userTitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2
  },
  messageInputSection: {
    flex: 1,
    padding: 16
  },
  messageInputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  messageTextInput: {
    flex: 1,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary,
    minHeight: 150
  },
  // 浠茶閭€璇锋牱寮?
  arbitrationSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  arbitrationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  arbitrationContent: {
    flex: 1,
    marginLeft: 10
  },
  arbitrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  arbitrationName: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    flex: 1
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  votedBadgeText: {
    fontSize: scaleFont(10),
    color: '#22c55e',
    fontWeight: '600'
  },
  arbitrationQuestion: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2
  },
  arbitrationAnswer: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 2
  },
  arbitrationReason: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: scaleFont(18)
  },
  arbitrationRight: {
    alignItems: 'flex-end',
    marginLeft: 10
  },
  arbitrationTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginBottom: 8
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  voteBtnText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600'
  },
  viewVoteBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  viewVoteBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 涓撳鎶曠エ寮圭獥鏍峰紡
  voteModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  voteModalKeyboardView: {
    flex: 1
  },
  voteModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '90%',
    overflow: 'hidden'
  },
  voteModalHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  voteModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: modalTokens.textPrimary,
    textAlign: 'center',
    marginBottom: 16
  },
  voteModalContent: {
    flexShrink: 1,
    paddingHorizontal: 20
  },
  voteQuestionCard: {
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  voteQuestionLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6
  },
  voteQuestionText: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 8
  },
  voteAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  voteAnswerLabel: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  voteAnswerAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#3b82f6'
  },
  voteReasonCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  voteReasonLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 6
  },
  voteReasonText: {
    fontSize: scaleFont(13),
    color: '#78350f',
    lineHeight: scaleFont(20),
    marginBottom: 10
  },
  voteApplicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  voteApplicantName: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#92400e'
  },
  voteApplicantTime: {
    fontSize: scaleFont(11),
    color: '#d97706',
    marginLeft: 'auto'
  },
  voteChoiceTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  voteChoices: {
    gap: 12,
    marginBottom: 20
  },
  voteChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  voteChoiceBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  voteChoiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  voteChoiceRadioActive: {
    borderColor: '#3b82f6'
  },
  voteChoiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6'
  },
  voteChoiceContent: {
    flex: 1,
    marginLeft: 12
  },
  voteChoiceLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  voteChoiceLabelActive: {
    color: '#3b82f6'
  },
  voteChoiceDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  voteReasonInputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10
  },
  voteReasonInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20
  },
  voteModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  submitVoteBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  submitVoteBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  submitVoteBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  cancelVoteBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelVoteBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  }
});

