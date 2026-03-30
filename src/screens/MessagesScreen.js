import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import notificationApi from '../services/api/notificationApi';
import userApi from '../services/api/userApi';
import { filterFriendUsers, normalizeFollowingResponse, sendPlainPrivateMessage } from '../utils/privateShareService';

import { scaleFont } from '../utils/responsive';
// 顶部快捷入口数据
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

const CATEGORY_CONFIGS = [{
  key: 'INTERACTION',
  title: '互动',
  icon: 'chatbubble-ellipses',
  iconBg: '#dcfce7',
  iconColor: '#22c55e'
}, {
  key: 'SYSTEM',
  title: '系统',
  icon: 'settings',
  iconBg: '#f3f4f6',
  iconColor: '#6b7280'
}, {
  key: 'ACTIVITY',
  title: '活动',
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
  title: '全部通知',
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
    return '刚刚';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}天前`;
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

// 邀请回答数据
const inviteAnswers = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite1',
  name: '张三丰',
  question: '如何在三个月内从零基础学会Python编程？',
  time: '10分钟前'
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite2',
  name: '李小龙',
  question: '35岁程序员如何规划职业发展？',
  time: '30分钟前'
}];

// 仲裁邀请数据
const arbitrationInvites = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  name: '张三丰',
  question: '如何在三个月内从零基础学会Python编程？',
  answer: 'Python老司机',
  reason: '原答案中关于学习时间的估计不够准确，对于零基础学习者来说，3个月时间过于乐观...',
  time: '5分钟前',
  status: 'pending' // pending: 待投票, voted: 已投票
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  name: '李四',
  question: 'React和Vue应该选择哪个？',
  answer: '前端专家',
  reason: '答案过于偏向React，没有客观分析两者的优劣...',
  time: '1小时前',
  status: 'voted'
}];

// 紧急求助数据
const emergencyRequests = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency1',
  name: '王小明',
  title: '车辆抛锚急需拖车救援',
  location: '北京市朝阳区建国路88号',
  distance: '2.3km',
  time: '3分钟前',
  rescuerCount: 3,
  status: 'urgent', // urgent: 紧急, responding: 响应中, completed: 已完成
  urgencyLevel: 'high' // high: 高, medium: 中, low: 低
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency2',
  name: '李华',
  title: '突发疾病需要紧急送医',
  location: '上海市浦东新区世纪大道1号',
  distance: '5.8km',
  time: '8分钟前',
  rescuerCount: 5,
  status: 'responding',
  urgencyLevel: 'high'
}, {
  id: 3,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emergency3',
  name: '张伟',
  title: '钥匙锁车内需要开锁服务',
  location: '广州市天河区珠江新城',
  distance: '1.2km',
  time: '15分钟前',
  rescuerCount: 2,
  status: 'urgent',
  urgencyLevel: 'medium'
}];

// 消息列表数据
const messageGroups = [{
  type: 'official',
  icon: 'megaphone',
  iconBg: '#dbeafe',
  iconColor: '#3b82f6',
  lastMessage: '平台新功能上线通知：现已支持视频回答...',
  time: '1小时前',
  unread: 2
}, {
  type: 'question',
  icon: 'help-circle',
  iconBg: '#dcfce7',
  iconColor: '#22c55e',
  lastMessage: '您关注的问题「如何学习Python」有3个新回答',
  time: '2小时前',
  unread: 3
}, {
  type: 'system',
  icon: 'settings',
  iconBg: '#f3f4f6',
  iconColor: '#6b7280',
  lastMessage: '您的账户安全设置已更新',
  time: '昨天',
  unread: 0
}];

// 私信用户数据
const privateMessages = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
  name: 'Python老司机',
  verified: true,
  lastMessage: '谢谢你的回答，帮了我很大的忙！',
  time: '30分钟前',
  unread: 2
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
  name: '数据分析师小王',
  lastMessage: '请问你有时间交流一下吗？',
  time: '1小时前',
  unread: 1
}, {
  id: 3,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
  name: '美食达人',
  lastMessage: '好的，我会试试你推荐的方法',
  time: '3小时前',
  unread: 0
}, {
  id: 4,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
  name: '编程新手',
  lastMessage: '太感谢了！',
  time: '昨天',
  unread: 0
}];

// 可发私信的用户列表
const allUsers = [{
  id: 1,
  name: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
  title: '资深Python开发',
  verified: true
}, {
  id: 2,
  name: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
  title: '数据分析师'
}, {
  id: 3,
  name: '美食达人',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
  title: '美食博主'
}, {
  id: 4,
  name: '编程新手',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
  title: '学生'
}, {
  id: 5,
  name: '王医生',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow2',
  title: '三甲医院主治医师',
  verified: true
}, {
  id: 6,
  name: '程序员小明',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow4',
  title: '全栈开发工程师'
}, {
  id: 7,
  name: '设计师小李',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow5',
  title: 'UI/UX设计师'
}];
export default function MessagesScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const isFocused = useIsFocused();
  const followingLoadRequestIdRef = React.useRef(0);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  const quickEntryLabels = {
    comment: t('screens.messagesScreen.quickEntries.commentForward'),
    like: t('screens.messagesScreen.quickEntries.likeAgree'),
    bookmark: t('screens.messagesScreen.quickEntries.bookmarked'),
    follow: t('screens.messagesScreen.quickEntries.followSubscribe')
  };
  const quickEntries = buildQuickEntries(notificationSummary);
  const notificationGroups = CATEGORY_CONFIGS.map(category => {
    const preview = categoryPreviewMap[category.key];
    return {
      ...category,
      unread: toSafeNumber(notificationSummary.byCategory?.[category.key]),
      lastMessage: preview?.summary || preview?.title || '暂无通知',
      time: formatRelativeTime(preview?.createTime)
    };
  });
  const currentFilterTitle = notificationFilter.title || '全部通知';
  const canLoadMoreNotifications = notificationFilter.mode !== 'bucket' && notificationItems.length < notificationTotal;

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
      console.error('加载通知汇总失败:', error);
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
      console.error('加载通知分类预览失败:', error);
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
      console.error('加载私信简表失败:', error);
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

      console.error('加载关注列表失败:', error);
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
        console.error('加载桶通知失败:', error);
        showAppAlert('提示', error.message || '加载通知失败，请稍后重试');
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
      console.error('加载通知列表失败:', error);
      if (pageNum === 1) {
        showAppAlert('提示', error.message || '加载通知失败，请稍后重试');
      }
    } finally {
      setNotificationLoading(false);
      setNotificationLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    loadNotificationSummary();
    loadCategoryPreviews();
    loadPrivateUnreadBrief();
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
      title: `${group.title}通知`,
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
        showAppAlert('提示', error.message || '标记已读失败，请稍后重试');
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
    showAppAlert(notification.title || '通知', notification.summary || '当前通知暂无可跳转的业务数据');
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
          showAppAlert('提示', error.message || '全部已读失败，请稍后重试');
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
  const handleLoadMoreNotifications = () => {
    if (!canLoadMoreNotifications || notificationLoadingMore) {
      return;
    }
    loadNotifications(notificationFilter, notificationPage + 1, true);
  };
  const filteredUsers = filterFriendUsers(followingUsers, searchText);
  return <SafeAreaView style={styles.container}>
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
        {/* 顶部快捷入口 */}
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

        {/* 邀请回答模块 */}
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

        {/* 紧急求助模块 */}
        <View style={styles.emergencySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>紧急求助</Text>
              <View style={styles.emergencyPulse}>
                <View style={styles.emergencyPulseDot} />
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Emergency')}>
              <Text style={styles.sectionMore}>查看全部</Text>
            </TouchableOpacity>
          </View>
          
          {emergencyRequests.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.emergencyItem,
                item.urgencyLevel === 'high' && styles.emergencyItemHigh
              ]}
              activeOpacity={0.7}
            >
              {/* 紧急标识条 */}
              {item.urgencyLevel === 'high' && (
                <View style={styles.emergencyIndicator} />
              )}
              
              <View style={styles.emergencyHeader}>
                <Avatar uri={item.avatar} name={item.name} size={44} />
                <View style={styles.emergencyHeaderContent}>
                  <View style={styles.emergencyNameRow}>
                    <Text style={styles.emergencyName}>{item.name}</Text>
                    {item.status === 'urgent' && (
                      <View style={styles.urgentBadge}>
                        <Ionicons name="warning" size={10} color="#fff" />
                        <Text style={styles.urgentBadgeText}>紧急</Text>
                      </View>
                    )}
                    {item.status === 'responding' && (
                      <View style={styles.respondingBadge}>
                        <Ionicons name="people" size={10} color="#fff" />
                        <Text style={styles.respondingBadgeText}>响应中</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.emergencyTime}>{item.time}</Text>
                </View>
              </View>

              <Text style={styles.emergencyTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <View style={styles.emergencyInfo}>
                <View style={styles.emergencyInfoItem}>
                  <Ionicons name="location" size={14} color="#ef4444" />
                  <Text style={styles.emergencyLocation} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
                <View style={styles.emergencyDistance}>
                  <Ionicons name="navigate" size={12} color="#f59e0b" />
                  <Text style={styles.emergencyDistanceText}>{item.distance}</Text>
                </View>
              </View>

              <View style={styles.emergencyFooter}>
                <View style={styles.emergencyRescuerInfo}>
                  <Ionicons name="people-outline" size={16} color="#6b7280" />
                  <Text style={styles.emergencyRescuerText}>
                    需要 {item.rescuerCount} 人救援
                  </Text>
                </View>
                
                {item.status === 'urgent' ? (
                  <TouchableOpacity 
                    style={styles.respondBtn}
                    onPress={() => {
                      showAppAlert('确认响应', `确定要响应 ${item.name} 的紧急求助吗？`, [
                        { text: '取消', style: 'cancel' },
                        { text: '立即响应', onPress: () => showAppAlert('成功', '已响应求助，请尽快前往现场') }
                      ]);
                    }}
                  >
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.respondBtnText}>立即响应</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.viewDetailBtn}>
                    <Text style={styles.viewDetailBtnText}>查看详情</Text>
                    <Ionicons name="chevron-forward" size={14} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 仲裁邀请 - 已隐藏 */}
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
                  {t('screens.messagesScreen.arbitration.question')}：{item.question}
                </Text>
                <Text style={styles.arbitrationAnswer} numberOfLines={1}>
                  {t('screens.messagesScreen.arbitration.answerAuthor')}：{item.answer}
                </Text>
                <Text style={styles.arbitrationReason} numberOfLines={2}>
                  {t('screens.messagesScreen.arbitration.reason')}：{item.reason}
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

        {/* 消息分组 */}
        <View style={styles.messageGroupSection}>
          {notificationGroups.map(group => <TouchableOpacity key={group.key} style={[styles.messageGroupItem, notificationFilter.mode === 'category' && notificationFilter.category === group.key && styles.messageGroupItemActive]} onPress={() => handleCategoryPress(group)}>
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

        {/* 私信列表 */}
        <View style={styles.notificationSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications-outline" size={18} color="#ef4444" />
              <Text style={styles.sectionTitle}>{currentFilterTitle}</Text>
            </View>
            {notificationFilter.mode !== 'all' && <TouchableOpacity onPress={() => setNotificationFilter(DEFAULT_NOTIFICATION_FILTER)}>
                <Text style={styles.sectionMore}>查看全部</Text>
              </TouchableOpacity>}
          </View>
          {notificationLoading ? <View style={styles.sectionLoading}>
              <ActivityIndicator color="#ef4444" />
            </View> : notificationItems.length === 0 ? <View style={styles.sectionEmpty}>
              <Text style={styles.sectionEmptyText}>暂无通知</Text>
            </View> : <>
              {notificationItems.map(item => <TouchableOpacity key={item.id} style={[styles.notificationItem, toSafeNumber(item.readFlag) !== 1 && styles.notificationItemUnread]} onPress={() => handleNotificationPress(item)}>
                  <View style={styles.notificationBody}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>{item.title || '站内通知'}</Text>
                      <Text style={styles.notificationTime}>{formatRelativeTime(item.createTime)}</Text>
                    </View>
                    <Text style={styles.notificationSummary} numberOfLines={2}>{item.summary || item.eventType || '暂无摘要'}</Text>
                  </View>
                  {toSafeNumber(item.readFlag) !== 1 && <View style={styles.notificationUnreadDot} />}
                </TouchableOpacity>)}
              {canLoadMoreNotifications && <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMoreNotifications} disabled={notificationLoadingMore}>
                  {notificationLoadingMore ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.loadMoreText}>加载更多</Text>}
                </TouchableOpacity>}
            </>}
        </View>

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
              <Text style={styles.sectionEmptyText}>暂无未读私信</Text>
            </View> : privateConversations.map(item => <TouchableOpacity key={item.conversationId} style={styles.privateItem} onPress={() => showAppAlert('私信', '当前版本暂未接入私信会话详情页')}>
              <Avatar uri={item.peerAvatar} name={item.peerNickName} size={48} />
              <View style={styles.privateContent}>
                <View style={styles.privateTitleRow}>
                  <Text style={styles.privateName}>{item.peerNickName || `用户${item.peerUserId}`}</Text>
                  <Text style={styles.privateTime}>{formatRelativeTime(item.lastMessageTime)}</Text>
                </View>
                <Text style={styles.privateMessage} numberOfLines={1}>{item.lastMessagePreview || '暂无消息内容'}</Text>
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

      {/* 发送私信弹窗 */}
      <Modal visible={showPrivateModal} animationType="slide">
        <SafeAreaView style={styles.privateModal}>
          <View style={styles.privateModalHeader}>
            <TouchableOpacity onPress={resetPrivateComposer}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.privateModalTitle}>{t('screens.messagesScreen.privateModal.title')}</Text>
            <TouchableOpacity style={[styles.sendBtn, (!selectedUser || !messageContent.trim() || privateSending) && styles.sendBtnDisabled]} onPress={handleSendMessage} disabled={!selectedUser || !messageContent.trim() || privateSending}>
              <Text style={[styles.sendBtnText, (!selectedUser || !messageContent.trim() || privateSending) && styles.sendBtnTextDisabled]}>{privateSending ? '发送中...' : t('screens.messagesScreen.privateModal.send')}</Text>
            </TouchableOpacity>
          </View>

          {/* 搜索用户 */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput style={styles.searchInput} placeholder={t('screens.messagesScreen.privateModal.searchPlaceholder')} value={searchText} onChangeText={setSearchText} />
              {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>}
            </View>
          </View>

          {/* 已选择的用户 */}
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

          {/* 用户列表 */}
          <View style={[styles.userListSection, {
          display: selectedUser ? 'none' : 'flex'
        }]}>
            <Text style={styles.userListTitle}>{t('screens.messagesScreen.privateModal.selectUser')}</Text>
            <ScrollView style={styles.userList}>
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

          {/* 私信内容 */}
          <View style={[styles.messageInputSection, {
          display: selectedUser ? 'flex' : 'none'
        }]}>
            <Text style={styles.messageInputLabel}>{t('screens.messagesScreen.privateModal.messageContent')}</Text>
            <TextInput style={styles.messageTextInput} placeholder={t('screens.messagesScreen.privateModal.messagePlaceholder')} placeholderTextColor="#bbb" value={messageContent} onChangeText={setMessageContent} multiline textAlignVertical="top" />
          </View>
        </SafeAreaView>
      </Modal>

      {/* 专家投票弹窗 */}
      <Modal visible={showVoteModal} animationType="slide" transparent>
        <View style={styles.voteModalOverlay}>
          <View style={styles.voteModal}>
            <View style={styles.voteModalHandle} />
            <Text style={styles.voteModalTitle}>{t('screens.messagesScreen.voteModal.title')}</Text>

            {Boolean(currentArbitration) && <ScrollView style={styles.voteModalContent} showsVerticalScrollIndicator={false}>
                {/* 问题信息 */}
                <View style={styles.voteQuestionCard}>
                  <Text style={styles.voteQuestionLabel}>{t('screens.messagesScreen.voteModal.questionLabel')}</Text>
                  <Text style={styles.voteQuestionText}>{currentArbitration.question}</Text>
                  <View style={styles.voteAnswerRow}>
                    <Text style={styles.voteAnswerLabel}>{t('screens.messagesScreen.voteModal.answerAuthorLabel')}</Text>
                    <Text style={styles.voteAnswerAuthor}>{currentArbitration.answer}</Text>
                  </View>
                </View>

                {/* 仲裁理由 */}
                <View style={styles.voteReasonCard}>
                  <Text style={styles.voteReasonLabel}>{t('screens.messagesScreen.voteModal.reasonLabel')}</Text>
                  <Text style={styles.voteReasonText}>{currentArbitration.reason}</Text>
                  <View style={styles.voteApplicantRow}>
                    <Avatar uri={currentArbitration.avatar} name={currentArbitration.name} size={20} />
                    <Text style={styles.voteApplicantName}>{currentArbitration.name}</Text>
                    <Text style={styles.voteApplicantTime}>{currentArbitration.time}</Text>
                  </View>
                </View>

                {/* 投票选项 */}
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

                {/* 投票理由 */}
                <Text style={styles.voteReasonInputLabel}>{t('screens.messagesScreen.voteModal.reasonInputLabel')}</Text>
                <TextInput style={styles.voteReasonInput} placeholder={t('screens.messagesScreen.voteModal.reasonPlaceholder')} placeholderTextColor="#9ca3af" value={voteReason} onChangeText={setVoteReason} multiline numberOfLines={4} textAlignVertical="top" />

                <View style={{
              height: 20
            }} />
              </ScrollView>}

            <View style={styles.voteModalFooter}>
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
  // 快捷入口样式
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
  // 邀请回答样式
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
  // 紧急求助样式
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
    fontSize: scaleFont(15),
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
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(22),
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
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  emergencyRescuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  emergencyRescuerText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  viewDetailBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 消息分组样式
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
  // 私信列表样式
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
  // 发送私信弹窗样式
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
  // 仲裁邀请样式
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
  // 专家投票弹窗样式
  voteModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  voteModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '90%'
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
    maxHeight: 500,
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
