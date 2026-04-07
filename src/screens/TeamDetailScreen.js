import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import IdentitySelector from '../components/IdentitySelector';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
const initialMessages = [{
  id: 1,
  author: '张三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
  content: '大家好，欢迎加入Python学习团队！',
  time: '2小时前',
  likes: 15,
  dislikes: 0,
  shares: 3,
  bookmarks: 8
}, {
  id: 2,
  author: '李四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
  content: '请问有人知道装饰器怎么用吗？',
  time: '1小时前',
  likes: 8,
  dislikes: 0,
  shares: 2,
  bookmarks: 5
}, {
  id: 3,
  author: '王五',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
  content: '我可以分享一下装饰器的用法，等会发个教程',
  time: '30分钟前',
  likes: 23,
  dislikes: 0,
  shares: 6,
  bookmarks: 12
}];

const initialDiscussionComments = {
  1: [{
    id: 1001,
    parentId: 0,
    rootCommentId: 1001,
    replyToCommentId: 0,
    replyToUserName: '',
    author: '李四',
    userName: '李四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
    content: '欢迎加入，后面我们可以一起整理学习资料。',
    time: '1小时前',
    likes: 2,
    dislikes: 0,
    shares: 0,
    bookmarks: 1,
    liked: false,
    disliked: false,
    collected: false,
    replyCount: 2,
    replies: 2,
    reports: 0
  }, {
    id: 1002,
    parentId: 1001,
    rootCommentId: 1001,
    replyToCommentId: 1001,
    replyToUserName: '李四',
    author: '王五',
    userName: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
    content: '我这边也可以补一份入门示例。',
    time: '45分钟前',
    likes: 1,
    dislikes: 0,
    shares: 0,
    bookmarks: 0,
    liked: false,
    disliked: false,
    collected: false,
    replyCount: 0,
    replies: 0,
    reports: 0
  }, {
    id: 1003,
    parentId: 1002,
    rootCommentId: 1001,
    replyToCommentId: 1002,
    replyToUserName: '王五',
    author: '张三',
    userName: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
    content: '可以，整理好后我帮你置顶。',
    time: '30分钟前',
    likes: 0,
    dislikes: 0,
    shares: 0,
    bookmarks: 0,
    liked: false,
    disliked: false,
    collected: false,
    replyCount: 0,
    replies: 0,
    reports: 0
  }],
  2: [{
    id: 2001,
    parentId: 0,
    rootCommentId: 2001,
    replyToCommentId: 0,
    replyToUserName: '',
    author: '张三',
    userName: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
    content: '可以先从最基础的语法和函数装饰器看起。',
    time: '50分钟前',
    likes: 3,
    dislikes: 0,
    shares: 0,
    bookmarks: 1,
    liked: false,
    disliked: false,
    collected: false,
    replyCount: 0,
    replies: 0,
    reports: 0
  }, {
    id: 2002,
    parentId: 0,
    rootCommentId: 2002,
    replyToCommentId: 0,
    replyToUserName: '',
    author: '王五',
    userName: '王五',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
    content: '我待会发一个简单示例，你可以跟着跑一遍。',
    time: '40分钟前',
    likes: 1,
    dislikes: 0,
    shares: 0,
    bookmarks: 0,
    liked: false,
    disliked: false,
    collected: false,
    replyCount: 0,
    replies: 0,
    reports: 0
  }],
  3: []
};

const buildDiscussionReplyTree = (rows = [], rootCommentId = null) => {
  const normalizedRootId = rootCommentId !== undefined && rootCommentId !== null ? String(rootCommentId) : null;
  const nodeMap = new Map();
  const roots = [];
  rows.forEach(row => {
    if (!row || String(row.id) === normalizedRootId) {
      return;
    }
    nodeMap.set(String(row.id), {
      ...row,
      children: []
    });
  });
  nodeMap.forEach(node => {
    const parentKey = String(node.parentId ?? '');
    if (!normalizedRootId || parentKey === normalizedRootId || !nodeMap.has(parentKey)) {
      roots.push(node);
      return;
    }
    nodeMap.get(parentKey).children.push(node);
  });
  return roots;
};

const flattenDiscussionReplyTree = (nodes = [], accumulator = []) => {
  nodes.forEach(node => {
    accumulator.push(node);
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenDiscussionReplyTree(node.children, accumulator);
    }
  });
  return accumulator;
};

// 团队公告数据
const WriteCommentModal = () => null;

const announcements = [{
  id: 1,
  title: '本周学习主题：Python装饰器',
  content: '欢迎大家加入团队！本周我们将重点学习Python装饰器的使用方法和应用场景。',
  author: '张三',
  time: '2天前',
  isPinned: true
}, {
  id: 2,
  title: '团队学习计划',
  content: '每周三晚上8点进行线上讨论，欢迎大家积极参与。',
  author: '张三',
  time: '5天前',
  isPinned: false
}, {
  id: 3,
  title: '资源分享',
  content: '推荐大家看一下廖雪峰的Python教程，非常适合入门学习。',
  author: '李四',
  time: '1周前',
  isPinned: false
}];

// 团队成员数据
const teamMembers = [{
  id: 1,
  name: '张三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
  role: '队长'
}, {
  id: 2,
  name: '李四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
  role: '成员'
}, {
  id: 3,
  name: '王五',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
  role: '成员'
}, {
  id: 4,
  name: '赵六',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member4',
  role: '成员'
}, {
  id: 5,
  name: '孙七',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member5',
  role: '成员'
}, {
  id: 6,
  name: '周八',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member6',
  role: '成员'
}, {
  id: 7,
  name: '吴九',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member7',
  role: '成员'
}, {
  id: 8,
  name: '郑十',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member8',
  role: '成员'
}, {
  id: 9,
  name: '钱十一',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member9',
  role: '成员'
}, {
  id: 10,
  name: '陈十二',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member10',
  role: '成员'
}, {
  id: 11,
  name: '林十三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member11',
  role: '成员'
}, {
  id: 12,
  name: '黄十四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member12',
  role: '成员'
}];

// 根据是否是管理员显示不同的tabs
const getTabsForRole = (isAdmin, t) => {
  if (isAdmin) {
    return [t('screens.teamDetail.tabs.discussion'), t('screens.teamDetail.tabs.announcement'), t('screens.teamDetail.tabs.approval')];
  }
  return [t('screens.teamDetail.tabs.discussion'), t('screens.teamDetail.tabs.announcement')];
};
export default function TeamDetailScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const team = route?.params?.team || {
    id: 1,
    name: 'Python学习互助团队',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=team1',
    role: '队长',
    members: 12,
    questions: 45,
    description: '专注Python学习，互帮互助，共同进步',
    createdAt: '2025-12-15',
    isActive: true,
    creatorId: 1,
    // 创建者ID
    currentUserId: 1,
    // 当前用户ID（模拟）
    isAdmin: true // 是否是管理员（队长或管理员）
  };

  // 限制访问模式：未加入的团队只能查看成员信息
  const restrictedView = route?.params?.restrictedView || false;
  const routeIsJoined = route?.params?.isJoined;
  const routeIsPending = route?.params?.isPending;
  const [activeTab, setActiveTab] = useState('');

  // Initialize activeTab with translated value
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('screens.teamDetail.tabs.discussion'));
    }
  }, [t, activeTab]);
  const [messages, setMessages] = useState(initialMessages);
  const [discussionCommentsMap, setDiscussionCommentsMap] = useState(initialDiscussionComments);
  const [inputText, setInputText] = useState('');
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [isJoined, setIsJoined] = useState(routeIsJoined !== undefined ? routeIsJoined : team.role === '队长' || team.role === '成员');
  const [isPending, setIsPending] = useState(routeIsPending || false);
  const [showDiscussionCommentListModal, setShowDiscussionCommentListModal] = useState(false);
  const [showDiscussionReplyModal, setShowDiscussionReplyModal] = useState(false);
  const [showDiscussionComposerModal, setShowDiscussionComposerModal] = useState(false);
  const [currentDiscussionMessageId, setCurrentDiscussionMessageId] = useState(null);
  const [currentDiscussionCommentId, setCurrentDiscussionCommentId] = useState(null);
  const [discussionCommentTarget, setDiscussionCommentTarget] = useState({
    messageId: null,
    parentId: 0,
    replyToCommentId: 0,
    replyToUserName: '',
    originalComment: null
  });
  const [discussionCommentText, setDiscussionCommentText] = useState('');
  const [discussionCommentIdentity, setDiscussionCommentIdentity] = useState('personal');
  const [discussionCommentSelectedTeams, setDiscussionCommentSelectedTeams] = useState([]);
  const [discussionComposerKey, setDiscussionComposerKey] = useState(0);
  const [discussionComposerMode, setDiscussionComposerMode] = useState('comment');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showPublishAnnouncementModal, setShowPublishAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const isLikeInteractionDisabled = (likedState, dislikedState) => !likedState && !!dislikedState;
  const isDislikeInteractionDisabled = (likedState, dislikedState) => !dislikedState && !!likedState;
  const getTeamMessageLikedState = message => liked[message?.id] !== undefined ? liked[message.id] : !!message?.liked;
  const getTeamMessageDislikedState = message => disliked[message?.id] !== undefined ? disliked[message.id] : !!message?.disliked;

  // 邀请功能相关状态
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState('platform'); // platform, twitter, facebook
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchText, setSearchText] = useState('');

  // 申请管理员相关状态
  const [showApplyAdminModal, setShowApplyAdminModal] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [hasApplied, setHasApplied] = useState(false);

  // 解散团队弹窗
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissConfirmText, setDismissConfirmText] = useState('');

  // 团队讨论排序方式
  const [discussionSortBy, setDiscussionSortBy] = useState('featured'); // featured or newest

  // 审批消息数据（管理员可见）
  const [joinRequests, setJoinRequests] = useState([{
    id: 1,
    user: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    reason: '我对Python很感兴趣，希望能加入团队一起学习',
    time: '2小时前',
    type: 'join',
    status: 'pending'
  }, {
    id: 2,
    user: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    reason: '想和大家一起交流学习经验',
    time: '5小时前',
    type: 'join',
    status: 'pending'
  }]);
  const [adminRequests, setAdminRequests] = useState([{
    id: 3,
    user: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    reason: '我有3年Python开发经验，可以帮助团队成员解决技术问题，组织学习活动',
    time: '1天前',
    type: 'admin',
    status: 'pending'
  }]);
  const tabs = getTabsForRole(team.isAdmin, t);
  const activeTabType = React.useMemo(() => {
    if (!activeTab) {
      return '';
    }
    if (activeTab === t('screens.teamDetail.tabs.discussion')) {
      return 'discussion';
    }
    if (activeTab === t('screens.teamDetail.tabs.announcement')) {
      return 'announcement';
    }
    if (activeTab === t('screens.teamDetail.tabs.approval')) {
      return 'approval';
    }
    return '';
  }, [activeTab, t]);

  // 可邀请的用户列表
  const platformUsers = [{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    title: 'Python开发者',
    verified: true
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    title: 'Web工程师',
    verified: false
  }, {
    id: 3,
    name: '刘强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    title: '全栈开发',
    verified: true
  }, {
    id: 4,
    name: '陈静',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4',
    title: '前端专家',
    verified: true
  }, {
    id: 5,
    name: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5',
    title: '后端工程师',
    verified: false
  }];
  const twitterUsers = [{
    id: 't1',
    name: '@pythondev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter1',
    followers: '10K',
    verified: true
  }, {
    id: 't2',
    name: '@webmaster',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter2',
    followers: '5K',
    verified: false
  }, {
    id: 't3',
    name: '@coder_life',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter3',
    followers: '8K',
    verified: true
  }];
  const facebookUsers = [{
    id: 'f1',
    name: 'Python Learning Group',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb1',
    members: '2K',
    verified: true
  }, {
    id: 'f2',
    name: 'Web Dev Community',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb2',
    members: '1.5K',
    verified: false
  }, {
    id: 'f3',
    name: 'Coding Together',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb3',
    members: '3K',
    verified: true
  }];

  // 已加入团队时只显示部分成员
  const maxVisibleMembers = 10;
  const visibleMembers = teamMembers.slice(0, maxVisibleMembers);
  const hasMoreMembers = teamMembers.length > maxVisibleMembers;
  const handleSend = () => {
    openDiscussionComposer({
      messageId: null,
      parentId: 0,
      replyToCommentId: 0,
      replyToUserName: '',
      originalComment: null
    }, 'message');
  };
  const getDiscussionComments = messageId => discussionCommentsMap[messageId] || [];
  const getDiscussionCommentCount = messageId => getDiscussionComments(messageId).length;
  const getDiscussionTopLevelComments = messageId => getDiscussionComments(messageId).filter(comment => Number(comment.parentId || 0) === 0);
  const findDiscussionCommentById = (messageId, commentId) => {
    if (!messageId || !commentId) {
      return null;
    }
    return getDiscussionComments(messageId).find(comment => String(comment.id) === String(commentId)) || null;
  };
  const getDiscussionThreadRootId = (messageId, commentId) => {
    if (!messageId || !commentId) {
      return null;
    }
    let currentComment = findDiscussionCommentById(messageId, commentId);
    let safetyCount = 0;
    while (currentComment && Number(currentComment.parentId || 0) > 0 && safetyCount < 50) {
      const parentComment = findDiscussionCommentById(messageId, currentComment.parentId);
      if (!parentComment || String(parentComment.id) === String(currentComment.id)) {
        break;
      }
      currentComment = parentComment;
      safetyCount += 1;
    }
    return currentComment?.id ?? commentId;
  };
  const buildDiscussionCommentReplyTarget = (comment, messageId) => {
    if (!comment) {
      return {
        messageId,
        parentId: 0,
        replyToCommentId: 0,
        replyToUserName: '',
        originalComment: null
      };
    }
    const resolvedCommentId = Number(comment.id) || 0;
    return {
      messageId,
      parentId: resolvedCommentId,
      replyToCommentId: resolvedCommentId,
      replyToUserName: comment.userName || comment.author || '',
      originalComment: comment
    };
  };
  const updateDiscussionComment = (messageId, commentId, updater) => {
    if (!messageId || !commentId) {
      return;
    }
    setDiscussionCommentsMap(prevMap => {
      const currentList = prevMap[messageId] || [];
      let changed = false;
      const nextList = currentList.map(comment => {
        if (String(comment.id) !== String(commentId)) {
          return comment;
        }
        changed = true;
        return updater(comment);
      });
      if (!changed) {
        return prevMap;
      }
      return {
        ...prevMap,
        [messageId]: nextList
      };
    });
  };
  const toggleDiscussionCommentLike = (messageId, commentId) => {
    updateDiscussionComment(messageId, commentId, comment => {
      if (isLikeInteractionDisabled(!!comment.liked, !!comment.disliked)) {
        return comment;
      }
      const nextLiked = !comment.liked;
      return {
        ...comment,
        liked: nextLiked,
        likes: Math.max((Number(comment.likes) || 0) + (nextLiked ? 1 : -1), 0)
      };
    });
  };
  const toggleDiscussionCommentCollect = (messageId, commentId) => {
    updateDiscussionComment(messageId, commentId, comment => {
      const nextCollected = !comment.collected;
      return {
        ...comment,
        collected: nextCollected,
        bookmarks: Math.max((Number(comment.bookmarks) || 0) + (nextCollected ? 1 : -1), 0)
      };
    });
  };
  const toggleDiscussionCommentDislike = (messageId, commentId) => {
    updateDiscussionComment(messageId, commentId, comment => {
      if (isDislikeInteractionDisabled(!!comment.liked, !!comment.disliked)) {
        return comment;
      }
      const nextDisliked = !comment.disliked;
      return {
        ...comment,
        disliked: nextDisliked,
        dislikes: Math.max((Number(comment.dislikes) || 0) + (nextDisliked ? 1 : -1), 0)
      };
    });
  };
  const openDiscussionCommentList = messageId => {
    setCurrentDiscussionMessageId(messageId);
    setCurrentDiscussionCommentId(null);
    setShowDiscussionReplyModal(false);
    setShowDiscussionCommentListModal(true);
  };
  const openDiscussionComposer = (target, mode = 'comment') => {
    setDiscussionCommentTarget({
      messageId: target?.messageId ?? currentDiscussionMessageId,
      parentId: Number(target?.parentId ?? 0) || 0,
      replyToCommentId: Number(target?.replyToCommentId ?? 0) || 0,
      replyToUserName: target?.replyToUserName ?? '',
      originalComment: target?.originalComment || null
    });
    setDiscussionComposerMode(mode);
    setDiscussionCommentText('');
    setDiscussionCommentIdentity('personal');
    setDiscussionCommentSelectedTeams([]);
    setDiscussionComposerKey(prev => prev + 1);
    setShowDiscussionComposerModal(true);
  };
  const closeDiscussionComposer = () => {
    setShowDiscussionComposerModal(false);
    setDiscussionComposerMode('comment');
    setDiscussionCommentText('');
    setDiscussionCommentIdentity('personal');
    setDiscussionCommentSelectedTeams([]);
    setDiscussionCommentTarget({
      messageId: null,
      parentId: 0,
      replyToCommentId: 0,
      replyToUserName: '',
      originalComment: null
    });
  };
  const handleSubmitDiscussionComment = () => {
    const messageId = discussionCommentTarget.messageId ?? currentDiscussionMessageId;
    const normalizedText = discussionCommentText.trim();
    const content = normalizedText;
    if (!content) {
      return;
    }
    const isTeamIdentity = discussionCommentIdentity === 'team';
    const authorName = isTeamIdentity ? team.name : '我';
    const authorAvatar = isTeamIdentity ? team.avatar : 'https://api.dicebear.com/7.x/avataaars/svg?seed=me';
    if (discussionComposerMode === 'message') {
      const newMessage = {
        id: Date.now(),
        author: authorName,
        avatar: authorAvatar,
        content,
        time: t('screens.teamDetail.chat.justNow'),
        likes: 0,
        dislikes: 0,
        shares: 0,
        bookmarks: 0
      };
      setMessages(prevMessages => [newMessage, ...prevMessages]);
      closeDiscussionComposer();
      return;
    }
    if (!messageId) {
      closeDiscussionComposer();
      return;
    }
    const directParentId = Number(discussionCommentTarget.replyToCommentId || discussionCommentTarget.parentId || 0) || 0;
    const rootCommentId = directParentId ? getDiscussionThreadRootId(messageId, directParentId) : null;
    const newCommentId = Date.now();
    const newComment = {
      id: newCommentId,
      parentId: directParentId,
      rootCommentId: rootCommentId || newCommentId,
      replyToCommentId: directParentId,
      replyToUserName: discussionCommentTarget.replyToUserName || '',
      author: authorName,
      userName: authorName,
      avatar: authorAvatar,
      userAvatar: authorAvatar,
      content,
      time: t('screens.teamDetail.chat.justNow'),
      likes: 0,
      dislikes: 0,
      shares: 0,
      bookmarks: 0,
      liked: false,
      disliked: false,
      collected: false,
      replyCount: 0,
      replies: 0,
      reports: 0
    };
    setDiscussionCommentsMap(prevMap => {
      const currentList = prevMap[messageId] || [];
      const nextList = [...currentList, newComment];
      if (rootCommentId) {
        return {
          ...prevMap,
          [messageId]: nextList.map(comment => String(comment.id) === String(rootCommentId) ? {
            ...comment,
            replyCount: (Number(comment.replyCount) || 0) + 1,
            replies: (Number(comment.replies) || 0) + 1
          } : comment)
        };
      }
      return {
        ...prevMap,
        [messageId]: nextList
      };
    });
    closeDiscussionComposer();
    if (rootCommentId) {
      setCurrentDiscussionMessageId(messageId);
      setCurrentDiscussionCommentId(rootCommentId);
      setShowDiscussionReplyModal(true);
    } else {
      setCurrentDiscussionMessageId(messageId);
      setShowDiscussionCommentListModal(true);
    }
  };
  const handleDiscussionCommentReport = () => {
    showAppAlert(t('screens.teamDetail.report.title'), t('screens.teamDetail.report.message'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.report.submitted'))
    }]);
  };
  const currentDiscussionComments = currentDiscussionMessageId ? getDiscussionComments(currentDiscussionMessageId) : [];
  const currentDiscussionTopLevelComments = currentDiscussionMessageId ? getDiscussionTopLevelComments(currentDiscussionMessageId) : [];
  const currentDiscussionRootComment = currentDiscussionMessageId && currentDiscussionCommentId ? findDiscussionCommentById(currentDiscussionMessageId, currentDiscussionCommentId) : null;
  const currentDiscussionReplyNodes = currentDiscussionRootComment ? buildDiscussionReplyTree(currentDiscussionComments.filter(comment => Number(comment.parentId || 0) > 0 && String(comment.rootCommentId) === String(currentDiscussionRootComment.id)), currentDiscussionRootComment.id) : [];

  // 邀请用户处理
  const handleToggleUser = user => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  const handleSendInvite = () => {
    if (selectedUsers.length === 0) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.invite.selectUser'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.invite.sent').replace('{count}', selectedUsers.length));
    setShowInviteModal(false);
    setSelectedUsers([]);
    setSearchText('');
  };

  // 申请管理员处理
  const handleApplyAdmin = () => {
    if (!applyReason.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.applyAdmin.fillReason'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.applicationSubmitted'));
    setShowApplyAdminModal(false);
    setHasApplied(true);
    setApplyReason('');
  };

  // 审批加入团队申请
  const handleApproveJoin = (requestId, approve) => {
    const request = joinRequests.find(r => r.id === requestId);
    if (approve) {
      showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.joinApproved').replace('{user}', request.user));
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
    } else {
      showAppAlert(t('screens.teamDetail.alerts.rejected'), t('screens.teamDetail.alerts.joinRejected').replace('{user}', request.user));
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
    }
  };

  // 审批管理员申请
  const handleApproveAdmin = (requestId, approve) => {
    const request = adminRequests.find(r => r.id === requestId);
    if (approve) {
      showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.adminApproved').replace('{user}', request.user));
      setAdminRequests(adminRequests.filter(r => r.id !== requestId));
    } else {
      showAppAlert(t('screens.teamDetail.alerts.rejected'), t('screens.teamDetail.alerts.adminRejected').replace('{user}', request.user));
      setAdminRequests(adminRequests.filter(r => r.id !== requestId));
    }
  };

  // 获取当前标签页的用户列表
  const getCurrentUserList = () => {
    let users = [];
    switch (inviteTab) {
      case 'platform':
        users = platformUsers;
        break;
      case 'twitter':
        users = twitterUsers;
        break;
      case 'facebook':
        users = facebookUsers;
        break;
    }
    if (searchText.trim()) {
      return users.filter(u => u.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    return users;
  };
  // 转让团长相关状态
  const [showTransferLeaderModal, setShowTransferLeaderModal] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState(null);

  const handleExitTeam = () => {
    // 如果是团长，需要先转让团长
    if (team.isAdmin && team.currentUserId === team.creatorId) {
      showAppAlert(
        t('screens.teamDetail.exit.title'),
        t('screens.teamDetail.exit.leaderMessage'),
        [{
          text: t('common.cancel'),
          style: 'cancel'
        }, {
          text: t('common.confirm'),
          onPress: () => {
            setShowTransferLeaderModal(true);
          }
        }]
      );
    } else {
      // 普通成员退出
      showAppAlert(
        t('screens.teamDetail.exit.title'),
        t('screens.teamDetail.exit.memberMessage'),
        [{
          text: t('common.cancel'),
          style: 'cancel'
        }, {
          text: t('screens.teamDetail.exit.confirmButton'),
          style: 'destructive',
          onPress: () => {
            showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.teamExited'));
            navigation.goBack();
          }
        }]
      );
    }
  };

  const handleConfirmTransferLeader = () => {
    if (!selectedNewLeader) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.transfer.selectMember'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.leaderTransferred'));
    setShowTransferLeaderModal(false);
    setSelectedNewLeader(null);
    navigation.goBack();
  };
  const handleDismissTeam = () => {
    setShowDismissModal(true);
  };
  const handleConfirmDismiss = () => {
    if (dismissConfirmText !== team.name) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.dismiss.incorrectName'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.teamDismissed'));
    setShowDismissModal(false);
    setDismissConfirmText('');
    navigation.goBack();
  };

  // 切换团队讨论排序方式
  const handleDiscussionSortChange = newSortBy => {
    if (newSortBy !== discussionSortBy) {
      setDiscussionSortBy(newSortBy);
      // 这里不改动数据和接口，只是切换状态
    }
  };
  const handleOpenCreateActivity = () => {
    navigation.navigate('CreateActivity', {
      teamId: team.id,
      teamName: team.name,
      fromTeamDetail: true
    });
  };
  const handleJoinTeam = () => {
    showAppAlert(t('screens.teamDetail.join.applyTitle'), t('screens.teamDetail.join.applyMessage'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => {
        setIsPending(true);
        setShowPendingModal(true);
      }
    }]);
  };
  const renderDiscussionReplyCard = (reply, options = {}) => {
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = findDiscussionCommentById(currentDiscussionMessageId, relationCommentId);
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.author || '';
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    return <View key={reply.id} style={styles.replyCard}>
        <TouchableOpacity style={styles.replyHeader} activeOpacity={0.7}>
          <Avatar uri={reply.userAvatar || reply.avatar} name={reply.userName || reply.author} size={24} />
          <View style={styles.replyAuthorMeta}>
            <View style={styles.replyAuthorLine}>
              <Text style={styles.replyAuthor}>{reply.userName || reply.author}</Text>
              {shouldShowReplyRelation ? <>
                  <Text style={styles.replyAuthorRelation}> 回复 </Text>
                  <Text style={styles.replyReplyTarget}>{relationUserName}</Text>
                </> : null}
            </View>
          </View>
          <View style={{
          flex: 1
        }} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={[styles.replyActionBtn, isLikeInteractionDisabled(!!reply.liked, !!reply.disliked) && styles.interactionBtnDisabled]} onPress={() => toggleDiscussionCommentLike(currentDiscussionMessageId, reply.id)} disabled={isLikeInteractionDisabled(!!reply.liked, !!reply.disliked)}>
            <Ionicons name={reply.liked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={reply.liked ? "#ef4444" : isLikeInteractionDisabled(!!reply.liked, !!reply.disliked) ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, reply.liked && {
            color: '#ef4444'
          }, isLikeInteractionDisabled(!!reply.liked, !!reply.disliked) && styles.interactionTextDisabled]}>{Number(reply.likes || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          setShowDiscussionReplyModal(false);
          openDiscussionComposer(buildDiscussionCommentReplyTarget(reply, currentDiscussionMessageId));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{Number(reply.replies || reply.replyCount || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{Number(reply.shares || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => toggleDiscussionCommentCollect(currentDiscussionMessageId, reply.id)}>
            <Ionicons name={reply.collected ? "star" : "star-outline"} size={12} color={reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, reply.collected && {
            color: '#f59e0b'
          }]}>{Number(reply.bookmarks || 0)}</Text>
          </TouchableOpacity>
          <View style={{
          flex: 1
        }} />
          <TouchableOpacity style={[styles.replyActionBtn, isDislikeInteractionDisabled(!!reply.liked, !!reply.disliked) && styles.interactionBtnDisabled]} onPress={() => toggleDiscussionCommentDislike(currentDiscussionMessageId, reply.id)} disabled={isDislikeInteractionDisabled(!!reply.liked, !!reply.disliked)}>
            <Ionicons name={reply.disliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={reply.disliked ? "#6b7280" : isDislikeInteractionDisabled(!!reply.liked, !!reply.disliked) ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, reply.disliked && {
            color: '#6b7280'
          }, isDislikeInteractionDisabled(!!reply.liked, !!reply.disliked) && styles.interactionTextDisabled]}>{Number(reply.dislikes || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={handleDiscussionCommentReport}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{Number(reply.reports || 0)}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderDiscussionReplyTreeNodes = (nodes = [], options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenDiscussionReplyTree(childNodes) : [];
    return <View key={reply.id}>
        {renderDiscussionReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <View style={styles.replyChildrenToggle}>
              <Text style={styles.replyChildrenToggleText}>{`展开回复 (${descendantReplies.length})`}</Text>
            </View>
            {descendantReplies.map(childReply => renderDiscussionReplyCard(childReply, {
            ...options,
            contextReplyId: reply.id
          }))}
          </View> : null}
      </View>;
  });
  const openReplyModal = msg => {
    setReplyTarget(msg);
    setReplyText('');
    setShowReplyModal(true);
  };
  const handleReply = () => {
    if (!replyText.trim()) return;
    const newMessage = {
      id: Date.now(),
      author: '我',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      content: `回复 @${replyTarget.author}：${replyText}`,
      time: t('screens.teamDetail.chat.justNow'),
      likes: 0,
      dislikes: 0,
      shares: 0,
      bookmarks: 0
    };
    setMessages([newMessage, ...messages]);
    setReplyText('');
    setShowReplyModal(false);
    setReplyTarget(null);
  };
  const handleReport = msg => {
    navigation.navigate('Report', {
      type: 'answer',
      targetType: 2,
      targetId: Number(msg?.id) || 0
    });
  };
  const handlePublishAnnouncement = () => {
    if (!announcementTitle.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.alerts.enterTitle'));
      return;
    }
    if (!announcementContent.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.alerts.enterContent'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.announcementPublished'));
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setIsPinned(false);
    setShowPublishAnnouncementModal(false);
  };
  return <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{restrictedView ? t('screens.teamDetail.teamMembers') : t('screens.teamDetail.title')}</Text>
        </View>
        {!restrictedView && <View style={styles.headerActions}>
            {/* 管理员显示：邀请、发起活动、发布公告 */}
            {Boolean(team.isAdmin) && <>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('InviteTeamMember', {
            teamName: team.name
          })}>
                  <Ionicons name="person-add" size={22} color="#22c55e" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={handleOpenCreateActivity}>
                  <Ionicons name="calendar" size={22} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPublishAnnouncementModal(true)}>
                  <Ionicons name="megaphone" size={22} color="#f59e0b" />
                </TouchableOpacity>
              </>}
          </View>}
        {Boolean(restrictedView) && <View style={{
        width: 24
      }} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 限制访问提示 */}
        {Boolean(restrictedView) && <View style={styles.restrictedNotice}>
            <Ionicons name="lock-closed" size={20} color="#f59e0b" />
            <Text style={styles.restrictedNoticeText}>{t('screens.teamDetail.restrictedNotice')}</Text>
          </View>}

        {/* 团队信息卡片 - 限制访问模式下不显示 */}
        {!restrictedView && <View style={styles.teamInfoCard}>
            <View style={styles.teamTitleRow}>
              <Text style={styles.teamName}>{team.name}</Text>
              {/* 管理员：显示退出团队按钮 */}
              {Boolean(team.isAdmin) && <TouchableOpacity style={styles.compactDismissBtn} onPress={handleExitTeam}>
                  <Ionicons name="exit-outline" size={14} color="#ef4444" />
                  <Text style={styles.compactDismissBtnText}>{t('screens.teamDetail.actions.exit')}</Text>
                </TouchableOpacity>}
              {/* 普通成员：显示三个操作按钮 */}
              {!team.isAdmin && team.currentUserId !== team.creatorId && <View style={styles.compactActionsRow}>
                  <TouchableOpacity style={styles.compactActionBtn} onPress={handleOpenCreateActivity}>
                    <Ionicons name="calendar" size={14} color="#3b82f6" />
                    <Text style={styles.compactActionBtnText}>{t('screens.teamDetail.actions.activity')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compactActionBtn, styles.compactActionBtnPurple, hasApplied && styles.compactActionBtnDisabled]} onPress={() => !hasApplied && setShowApplyAdminModal(true)} disabled={hasApplied}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={hasApplied ? '#9ca3af' : '#8b5cf6'} />
                    <Text style={[styles.compactActionBtnText, styles.compactActionBtnTextPurple, hasApplied && styles.compactActionBtnTextDisabled]}>
                      {hasApplied ? t('screens.teamDetail.actions.applied') : t('screens.teamDetail.actions.admin')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compactActionBtn, styles.compactActionBtnRed]} onPress={handleExitTeam}>
                    <Ionicons name="exit-outline" size={14} color="#ef4444" />
                    <Text style={[styles.compactActionBtnText, styles.compactActionBtnTextRed]}>{t('screens.teamDetail.actions.exit')}</Text>
                  </TouchableOpacity>
                </View>}
            </View>
            <Text style={styles.teamDesc} numberOfLines={2}>{team.description}</Text>
            <View style={styles.teamStats}>
              <View style={styles.teamStatItem}>
                <Ionicons name="people" size={14} color="#9ca3af" />
                <Text style={styles.teamStatText}>{team.members} {t('screens.teamDetail.stats.members')}</Text>
              </View>
              <View style={styles.teamStatItem}>
                <Ionicons name="chatbubbles" size={14} color="#9ca3af" />
                <Text style={styles.teamStatText}>{team.questions} {t('screens.teamDetail.stats.questions')}</Text>
              </View>
            </View>
          </View>}

        {/* 团队成员区域 - 根据是否加入显示不同样式 */}
        <View style={styles.teamMembersSection}>
          <View style={styles.membersSectionHeader}>
            <Text style={styles.teamMembersTitle}>{t('screens.teamDetail.teamMembers')} ({teamMembers.length})</Text>
            {Boolean(!restrictedView && hasMoreMembers) && <TouchableOpacity onPress={() => setShowMembersModal(true)}>
                <Text style={styles.viewAllText}>{t('screens.teamDetail.actions.viewAll')}</Text>
              </TouchableOpacity>}
          </View>
          
          {/* 限制访问模式：网格显示全部成员 */}
          {restrictedView ? <View style={styles.teamMembersGrid}>
              {teamMembers.map(member => <View key={member.id} style={styles.teamMemberGridItem}>
                  <View style={styles.teamMemberAvatarWrapper}>
                    <Avatar uri={member.avatar} name={member.name} size={56} />
                    {member.role === '队长' && <View style={styles.teamLeaderBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>}
                  </View>
                  <Text style={styles.teamMemberName} numberOfLines={1}>{member.name}</Text>
                  {member.role === '队长' && <Text style={styles.teamMemberRole}>队长</Text>}
                </View>)}
            </View> : (/* 已加入模式：横向滚动显示部分成员 */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamMembersScroll}>
              {visibleMembers.map(member => <View key={member.id} style={styles.teamMemberItem}>
                  <View style={styles.teamMemberAvatarWrapper}>
                    <Avatar uri={member.avatar} name={member.name} size={56} />
                    {member.role === '队长' && <View style={styles.teamLeaderBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>}
                  </View>
                  <Text style={styles.teamMemberName} numberOfLines={1}>{member.name}</Text>
                  {member.role === '队长' && <Text style={styles.teamMemberRole}>队长</Text>}
                </View>)}
            </ScrollView>)}
        </View>

        {/* Tab标签和内容区域 - 限制访问模式下不显示 */}
        {!restrictedView && <>
            {/* Tab标签 */}
            <View style={styles.tabsSection}>
              <View style={styles.tabs}>
                {tabs.map(tab => <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    {activeTab === tab && <View style={styles.tabIndicator} />}
                    {/* 审批消息显示未读数量 */}
                    {tab === t('screens.teamDetail.tabs.approval') && joinRequests.length + adminRequests.length > 0 && <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{joinRequests.length + adminRequests.length}</Text>
                      </View>}
                  </TouchableOpacity>)}
              </View>
            </View>

            {/* 内容区域 */}
            {activeTabType === 'discussion' ? (
              <>
                {/* 团队讨论排序过滤器 */}
                <View style={styles.sortFilterContainer}>
                  <View style={styles.sortFilterLeft}>
                    <TouchableOpacity style={[styles.sortFilterBtn, discussionSortBy === 'featured' && styles.sortFilterBtnActive]} onPress={() => handleDiscussionSortChange('featured')}>
                      <Ionicons name="star" size={14} color={discussionSortBy === 'featured' ? '#ef4444' : '#9ca3af'} />
                      <Text style={[styles.sortFilterText, discussionSortBy === 'featured' && styles.sortFilterTextActive]}>精选</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.sortFilterBtn, discussionSortBy === 'newest' && styles.sortFilterBtnActive]} onPress={() => handleDiscussionSortChange('newest')}>
                      <Ionicons name="time" size={14} color={discussionSortBy === 'newest' ? '#ef4444' : '#9ca3af'} />
                      <Text style={[styles.sortFilterText, discussionSortBy === 'newest' && styles.sortFilterTextActive]}>最新</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.sortFilterCount}>共 {messages.length} 条讨论</Text>
                </View>
                
                <View style={styles.teamChatSection}>
                {messages.map(msg => <View key={msg.id} style={styles.teamChatMessage}>
                    <View style={styles.teamChatBubble}>
                      <View style={styles.teamChatHeader}>
                        <Avatar uri={msg.avatar} name={msg.author} size={24} />
                        <Text style={styles.teamChatUser}>{msg.author}</Text>
                        <Text style={styles.teamChatTime}>{msg.time}</Text>
                      </View>
                      <View style={styles.teamChatContent}>
                        <Text style={styles.teamChatText}>{msg.content}</Text>
                        
                        <View style={styles.teamChatFooter}>
                          <View style={styles.teamChatFooterLeft}>
                            <TouchableOpacity style={[styles.teamChatActionBtn, isLikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) && styles.interactionBtnDisabled]} onPress={() => setLiked({
                      ...liked,
                      [msg.id]: !getTeamMessageLikedState(msg)
                    })} disabled={isLikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg))}>
                              <Ionicons name={getTeamMessageLikedState(msg) ? "thumbs-up" : "thumbs-up-outline"} size={14} color={getTeamMessageLikedState(msg) ? "#ef4444" : isLikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) ? "#d1d5db" : "#9ca3af"} />
                              <Text style={[styles.teamChatActionText, getTeamMessageLikedState(msg) && {
                        color: '#ef4444'
                      }, isLikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) && styles.interactionTextDisabled]}>
                                {msg.likes + (getTeamMessageLikedState(msg) ? 1 : 0)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.teamChatActionBtn} onPress={() => openDiscussionCommentList(msg.id)}>
                              <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                              <Text style={styles.teamChatActionText}>{getDiscussionCommentCount(msg.id)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.teamChatActionBtn} onPress={() => {
                      // 转发功能
                    }}>
                              <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                              <Text style={styles.teamChatActionText}>{msg.shares || 0}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.teamChatActionBtn} onPress={() => setBookmarked({
                      ...bookmarked,
                      [msg.id]: !bookmarked[msg.id]
                    })}>
                              <Ionicons name={bookmarked[msg.id] ? "star" : "star-outline"} size={14} color={bookmarked[msg.id] ? "#f59e0b" : "#9ca3af"} />
                              <Text style={[styles.teamChatActionText, bookmarked[msg.id] && {
                        color: '#f59e0b'
                      }]}>
                                {msg.bookmarks + (bookmarked[msg.id] ? 1 : 0)}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.teamChatFooterRight}>
                            <TouchableOpacity style={[styles.teamChatActionBtn, isDislikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) && styles.interactionBtnDisabled]} onPress={() => setDisliked({
                      ...disliked,
                      [msg.id]: !getTeamMessageDislikedState(msg)
                    })} disabled={isDislikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg))}>
                              <Ionicons name={getTeamMessageDislikedState(msg) ? "thumbs-down" : "thumbs-down-outline"} size={14} color={getTeamMessageDislikedState(msg) ? "#6b7280" : isDislikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) ? "#d1d5db" : "#9ca3af"} />
                              <Text style={[styles.teamChatActionText, getTeamMessageDislikedState(msg) && {
                        color: '#6b7280'
                      }, isDislikeInteractionDisabled(getTeamMessageLikedState(msg), getTeamMessageDislikedState(msg)) && styles.interactionTextDisabled]}>
                                {msg.dislikes + (getTeamMessageDislikedState(msg) ? 1 : 0)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.teamChatActionBtn} onPress={() => handleReport(msg)}>
                              <Ionicons name="flag-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>)}
              </View>
              </>
            ) : activeTabType === 'announcement' ? (/* 团队公告列表 */
        <View style={styles.announcementList}>
                {announcements.map(announcement => <View key={announcement.id} style={styles.announcementItem}>
                    {Boolean(announcement.isPinned) && <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color="#ef4444" />
                        <Text style={styles.pinnedText}>{t('screens.teamDetail.announcement.pinned')}</Text>
                      </View>}
                    <Text style={styles.announcementTitle}>{announcement.title}</Text>
                    <Text style={styles.announcementContent}>{announcement.content}</Text>
                    <View style={styles.announcementFooter}>
                      <View style={styles.announcementAuthor}>
                        <Ionicons name="person-circle-outline" size={14} color="#9ca3af" />
                        <Text style={styles.announcementAuthorText}>{announcement.author}</Text>
                      </View>
                      <Text style={styles.announcementTime}>{announcement.time}</Text>
                    </View>
                  </View>)}
              </View>) : (/* 审批消息列表 - 仅管理员可见 */
        <ScrollView style={styles.approvalList} showsVerticalScrollIndicator={false}>
                {/* 加入团队申请 */}
                {joinRequests.length > 0 && <View style={styles.approvalSection}>
                    <Text style={styles.approvalSectionTitle}>{t('screens.teamDetail.approval.joinRequests')} ({joinRequests.length})</Text>
                    {joinRequests.map(request => <View key={request.id} style={styles.approvalItem}>
                        <View style={styles.approvalHeader}>
                          <Avatar uri={request.avatar} name={request.user} size={40} />
                          <View style={styles.approvalUserInfo}>
                            <Text style={styles.approvalUserName}>{request.user}</Text>
                            <Text style={styles.approvalTime}>{request.time}</Text>
                          </View>
                          {/* 按钮移到用户信息行右侧 */}
                          <View style={styles.approvalActionsInline}>
                            <TouchableOpacity style={styles.approvalRejectBtnSmall} onPress={() => handleApproveJoin(request.id, false)}>
                              <Ionicons name="close-circle" size={16} color="#ef4444" />
                              <Text style={styles.approvalRejectTextSmall}>{t('screens.teamDetail.approval.reject')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.approvalApproveBtnSmall} onPress={() => handleApproveJoin(request.id, true)}>
                              <Ionicons name="checkmark-circle" size={16} color="#fff" />
                              <Text style={styles.approvalApproveTextSmall}>{t('screens.teamDetail.approval.approve')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.approvalReasonBox}>
                          <Text style={styles.approvalReasonLabel}>{t('screens.teamDetail.approval.reasonLabel')}</Text>
                          <Text style={styles.approvalReasonText}>{request.reason}</Text>
                        </View>
                      </View>)}
                  </View>}

                {/* 管理员申请 */}
                {adminRequests.length > 0 && <View style={styles.approvalSection}>
                    <Text style={styles.approvalSectionTitle}>{t('screens.teamDetail.approval.adminRequests')} ({adminRequests.length})</Text>
                    {adminRequests.map(request => <View key={request.id} style={styles.approvalItem}>
                        <View style={styles.approvalHeader}>
                          <Avatar uri={request.avatar} name={request.user} size={40} />
                          <View style={styles.approvalUserInfo}>
                            <View style={styles.approvalUserNameRow}>
                              <Text style={styles.approvalUserName}>{request.user}</Text>
                              <View style={styles.adminApplyBadge}>
                                <Ionicons name="shield-checkmark" size={12} color="#8b5cf6" />
                                <Text style={styles.adminApplyBadgeText}>{t('screens.teamDetail.approval.applyAdmin')}</Text>
                              </View>
                            </View>
                            <Text style={styles.approvalTime}>{request.time}</Text>
                          </View>
                          {/* 按钮移到用户信息行右侧 */}
                          <View style={styles.approvalActionsInline}>
                            <TouchableOpacity style={styles.approvalRejectBtnSmall} onPress={() => handleApproveAdmin(request.id, false)}>
                              <Ionicons name="close-circle" size={16} color="#ef4444" />
                              <Text style={styles.approvalRejectTextSmall}>{t('screens.teamDetail.approval.reject')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.approvalApproveBtnSmall} onPress={() => handleApproveAdmin(request.id, true)}>
                              <Ionicons name="checkmark-circle" size={16} color="#fff" />
                              <Text style={styles.approvalApproveTextSmall}>{t('screens.teamDetail.approval.approve')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.approvalReasonBox}>
                          <Text style={styles.approvalReasonLabel}>{t('screens.teamDetail.approval.reasonLabel')}</Text>
                          <Text style={styles.approvalReasonText}>{request.reason}</Text>
                        </View>
                      </View>)}
                  </View>}

                {/* 空状态 */}
                {joinRequests.length === 0 && adminRequests.length === 0 && <View style={styles.approvalEmpty}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color="#d1d5db" />
                    <Text style={styles.approvalEmptyText}>{t('screens.teamDetail.approval.empty')}</Text>
                    <Text style={styles.approvalEmptyHint}>{t('screens.teamDetail.approval.emptyHint')}</Text>
                  </View>}
              </ScrollView>)}
          </>}
      </ScrollView>

      {/* 底部输入栏 - 限制访问模式下不显示 */}
      {Boolean(!restrictedView && isJoined && activeTabType === 'discussion') && <View style={styles.teamChatInputContainer}>
          <TouchableOpacity style={styles.teamChatInput} activeOpacity={0.85} onPress={handleSend}>
            <Text style={styles.teamChatInputPlaceholder}>{t('screens.teamDetail.chat.inputPlaceholder')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.teamChatSendBtn} onPress={handleSend}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>}

      {/* 加入团队按钮 - 限制访问模式下显示 */}
      {Boolean(restrictedView) && <View style={styles.teamActions}>
          {isPending ? <View style={styles.pendingNotice}>
              <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
              <Text style={styles.pendingNoticeText}>{t('screens.teamDetail.join.pendingNotice')}</Text>
            </View> : <TouchableOpacity style={styles.teamJoinBtn} onPress={handleJoinTeam}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.teamJoinBtnText}>{t('screens.teamDetail.join.applyButton')}</Text>
            </TouchableOpacity>}
        </View>}

      {/* 回复弹窗 */}
      <Modal visible={showReplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.replyModal}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>{t('screens.teamDetail.reply.title')} {replyTarget?.author}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.replyInput} placeholder={t('screens.teamDetail.reply.placeholder')} placeholderTextColor="#9ca3af" value={replyText} onChangeText={setReplyText} multiline autoFocus />
            <TouchableOpacity style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]} onPress={handleReply} disabled={!replyText.trim()}>
              <Text style={styles.replySubmitText}>{t('screens.teamDetail.reply.submitButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 成员列表弹窗 - 仅在已加入模式下使用 */}
      <Modal visible={showDiscussionCommentListModal} transparent animationType="slide" onRequestClose={() => setShowDiscussionCommentListModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDiscussionCommentListModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <View style={styles.commentListHeaderLeft} />
              <Text style={styles.commentListModalTitle}>全部评论</Text>
              <TouchableOpacity onPress={() => setShowDiscussionCommentListModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentDiscussionTopLevelComments.length === 0 ? <View style={styles.approvalEmpty}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.approvalEmptyText}>暂无评论</Text>
                  <Text style={styles.approvalEmptyHint}>成为第一个评论的人</Text>
                </View> : currentDiscussionTopLevelComments.map(comment => <View key={comment.id} style={styles.commentListCard}>
                  <TouchableOpacity style={styles.commentListHeader} activeOpacity={0.7}>
                    <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.author} size={24} />
                    <Text style={styles.commentListAuthor}>{comment.userName || comment.author}</Text>
                    <View style={{
                  flex: 1
                }} />
                    <Text style={styles.commentListTime}>{comment.time}</Text>
                  </TouchableOpacity>
                  <View style={styles.commentListContent}>
                    <Text style={styles.commentListText}>{comment.content}</Text>
                    <View style={styles.commentListActions}>
                      <TouchableOpacity style={[styles.commentListActionBtn, isLikeInteractionDisabled(!!comment.liked, !!comment.disliked) && styles.interactionBtnDisabled]} onPress={() => toggleDiscussionCommentLike(currentDiscussionMessageId, comment.id)} disabled={isLikeInteractionDisabled(!!comment.liked, !!comment.disliked)}>
                        <Ionicons name={comment.liked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={comment.liked ? "#ef4444" : isLikeInteractionDisabled(!!comment.liked, !!comment.disliked) ? "#d1d5db" : "#9ca3af"} />
                        <Text style={[styles.commentListActionText, comment.liked && {
                      color: '#ef4444'
                    }, isLikeInteractionDisabled(!!comment.liked, !!comment.disliked) && styles.interactionTextDisabled]}>{Number(comment.likes || 0)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                    setCurrentDiscussionCommentId(comment.id);
                    setShowDiscussionCommentListModal(false);
                    setTimeout(() => setShowDiscussionReplyModal(true), 50);
                  }}>
                        <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                        <Text style={styles.commentListActionText}>{Number(comment.replyCount ?? comment.replies ?? 0)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.commentListActionBtn}>
                        <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                        <Text style={styles.commentListActionText}>{Number(comment.shares || 0)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.commentListActionBtn} onPress={() => toggleDiscussionCommentCollect(currentDiscussionMessageId, comment.id)}>
                        <Ionicons name={comment.collected ? "star" : "star-outline"} size={14} color={comment.collected ? "#f59e0b" : "#9ca3af"} />
                        <Text style={[styles.commentListActionText, comment.collected && {
                      color: '#f59e0b'
                    }]}>{Number(comment.bookmarks || 0)}</Text>
                      </TouchableOpacity>
                      <View style={{
                    flex: 1
                  }} />
                      <TouchableOpacity style={[styles.commentListActionBtn, isDislikeInteractionDisabled(!!comment.liked, !!comment.disliked) && styles.interactionBtnDisabled]} onPress={() => toggleDiscussionCommentDislike(currentDiscussionMessageId, comment.id)} disabled={isDislikeInteractionDisabled(!!comment.liked, !!comment.disliked)}>
                        <Ionicons name={comment.disliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={comment.disliked ? "#6b7280" : isDislikeInteractionDisabled(!!comment.liked, !!comment.disliked) ? "#d1d5db" : "#9ca3af"} />
                        <Text style={[styles.commentListActionText, comment.disliked && {
                      color: '#6b7280'
                    }, isDislikeInteractionDisabled(!!comment.liked, !!comment.disliked) && styles.interactionTextDisabled]}>{Number(comment.dislikes || 0)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.commentListActionBtn} onPress={handleDiscussionCommentReport}>
                        <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        <Text style={styles.commentListActionText}>{Number(comment.reports || 0)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>)}
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setCurrentDiscussionCommentId(null);
              setShowDiscussionCommentListModal(false);
              openDiscussionComposer({
                messageId: currentDiscussionMessageId,
                parentId: 0,
                replyToCommentId: 0,
                replyToUserName: '',
                originalComment: null
              });
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写评论...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDiscussionReplyModal} transparent animationType="slide" onRequestClose={() => {
      setShowDiscussionCommentListModal(true);
      setTimeout(() => setShowDiscussionReplyModal(false), 50);
    }}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => {
          setShowDiscussionCommentListModal(true);
          setTimeout(() => setShowDiscussionReplyModal(false), 50);
        }} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={() => {
              setShowDiscussionCommentListModal(true);
              setTimeout(() => setShowDiscussionReplyModal(false), 50);
            }} style={[styles.commentListCloseBtn, {
              left: 16,
              right: 'auto'
            }]}>
                <Ionicons name="arrow-back" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentListModalTitle}>{Number(currentDiscussionRootComment?.replyCount ?? currentDiscussionRootComment?.replies ?? 0)}条回复</Text>
              <View style={styles.commentListHeaderRight} />
            </View>

            {Boolean(currentDiscussionRootComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7}>
                  <Avatar uri={currentDiscussionRootComment.userAvatar || currentDiscussionRootComment.avatar} name={currentDiscussionRootComment.userName || currentDiscussionRootComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>{currentDiscussionRootComment.userName || currentDiscussionRootComment.author}</Text>
                  <View style={{
                flex: 1
              }} />
                  <Text style={styles.originalCommentTime}>{currentDiscussionRootComment.time}</Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>{currentDiscussionRootComment.content}</Text>
              </View>}

            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentDiscussionReplyNodes.length > 0 ? renderDiscussionReplyTreeNodes(currentDiscussionReplyNodes, {
              rootCommentId: currentDiscussionRootComment?.id ?? null
            }) : <View style={styles.approvalEmpty}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.approvalEmptyText}>暂无回复</Text>
                  <Text style={styles.approvalEmptyHint}>来留下第一条回复吧</Text>
                </View>}
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowDiscussionReplyModal(false);
              openDiscussionComposer(buildDiscussionCommentReplyTarget(currentDiscussionRootComment, currentDiscussionMessageId));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WriteCommentModal visible={showDiscussionComposerModal} onClose={closeDiscussionComposer} onPublish={handleSubmitDiscussionComment} originalComment={discussionCommentTarget.originalComment} publishInFooter placeholder={discussionComposerMode === 'message' ? '说点什么...' : '写下你的评论...'} title={discussionComposerMode === 'message' ? '' : '写评论'} />

      <Modal visible={showDiscussionComposerModal} transparent animationType="slide" onRequestClose={closeDiscussionComposer}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDiscussionComposer} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={closeDiscussionComposer} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
              {discussionComposerMode !== 'message' && <Text style={styles.commentListModalTitle}>写评论</Text>}
              <View style={styles.commentListHeaderRight} />
            </View>

            {Boolean(discussionCommentTarget.originalComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7}>
                  <Avatar uri={discussionCommentTarget.originalComment.userAvatar || discussionCommentTarget.originalComment.avatar} name={discussionCommentTarget.originalComment.userName || discussionCommentTarget.originalComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>{discussionCommentTarget.originalComment.userName || discussionCommentTarget.originalComment.author}</Text>
                  <View style={{
                flex: 1
              }} />
                  <Text style={styles.originalCommentTime}>{discussionCommentTarget.originalComment.time}</Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>{discussionCommentTarget.originalComment.content}</Text>
              </View>}

            <ScrollView style={styles.commentListScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View>
                <TextInput style={styles.commentTextInput} placeholder={discussionComposerMode === 'message' ? '说点什么...' : '写下你的评论...'} placeholderTextColor="#bbb" value={discussionCommentText} onChangeText={setDiscussionCommentText} multiline autoFocus textAlignVertical="top" />
                {discussionComposerMode !== 'message' && <View style={styles.commentIdentitySection}>
                    <IdentitySelector key={`discussion-composer-${discussionComposerKey}`} selectedIdentity={discussionCommentIdentity} selectedTeams={discussionCommentSelectedTeams} onIdentityChange={setDiscussionCommentIdentity} onTeamsChange={setDiscussionCommentSelectedTeams} />
                  </View>}
              </View>
            </ScrollView>

            <View style={styles.commentListBottomBar}>
              <View style={styles.commentToolbar}>
                <View style={styles.commentToolsLeft}>
                  <TouchableOpacity style={styles.commentToolItem}>
                    <Ionicons name="image-outline" size={24} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentToolItem}>
                    <Ionicons name="at-outline" size={24} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentToolItem}>
                    <Ionicons name="happy-outline" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.commentPublishBtn, !discussionCommentText.trim() && styles.commentPublishBtnDisabled]} onPress={handleSubmitDiscussionComment} disabled={!discussionCommentText.trim()}>
                  <Text style={[styles.commentPublishText, !discussionCommentText.trim() && styles.commentPublishTextDisabled]}>发布</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {!restrictedView && <Modal visible={showMembersModal} animationType="slide" transparent onRequestClose={() => setShowMembersModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.membersModal}>
              <View style={styles.membersModalHeader}>
                <Text style={styles.membersModalTitle}>{t('screens.teamDetail.members.title')} {t('screens.teamDetail.members.count').replace('{count}', teamMembers.length)}</Text>
                <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.membersModalContent}>
                <ScrollView style={styles.membersModalList} contentContainerStyle={styles.membersModalListContent} showsVerticalScrollIndicator={false}>
                {teamMembers.map(member => <View key={member.id} style={styles.memberModalItem}>
                    <Avatar uri={member.avatar} name={member.name} size={48} />
                    <View style={styles.memberModalInfo}>
                      <View style={styles.memberModalNameRow}>
                        <Text style={styles.memberModalName}>{member.name}</Text>
                        {member.role === '队长' && <View style={styles.leaderBadgeLarge}>
                            <Ionicons name="star" size={10} color="#f59e0b" />
                            <Text style={styles.leaderBadgeText}>{t('screens.teamDetail.roles.leader')}</Text>
                          </View>}
                      </View>
                      <Text style={styles.memberModalRole}>{member.role}</Text>
                    </View>
                  </View>)}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>}

      {/* 发布公告弹窗 */}
      <Modal visible={showPublishAnnouncementModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.publishAnnouncementModal}>
            <View style={styles.publishAnnouncementHeader}>
              <Text style={styles.publishAnnouncementTitle}>{t('screens.teamDetail.announcement.publishTitle')}</Text>
              <TouchableOpacity onPress={() => setShowPublishAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.publishAnnouncementForm}>
                <Text style={styles.formLabel}>{t('screens.teamDetail.announcement.titleLabel')}</Text>
                <TextInput style={styles.formInput} placeholder={t('screens.teamDetail.announcement.titlePlaceholder')} placeholderTextColor="#9ca3af" value={announcementTitle} onChangeText={setAnnouncementTitle} />
                <Text style={styles.formLabel}>{t('screens.teamDetail.announcement.contentLabel')}</Text>
                <TextInput style={[styles.formInput, styles.formTextarea]} placeholder={t('screens.teamDetail.announcement.contentPlaceholder')} placeholderTextColor="#9ca3af" value={announcementContent} onChangeText={setAnnouncementContent} multiline numberOfLines={6} textAlignVertical="top" />
                <TouchableOpacity style={styles.pinnedCheckbox} onPress={() => setIsPinned(!isPinned)}>
                  <Ionicons name={isPinned ? "checkbox" : "square-outline"} size={20} color={isPinned ? "#f59e0b" : "#9ca3af"} />
                  <Text style={styles.pinnedCheckboxText}>{t('screens.teamDetail.announcement.pinnedCheckbox')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.publishAnnouncementSubmitBtn} onPress={handlePublishAnnouncement}>
              <Text style={styles.publishAnnouncementSubmitText}>{t('screens.teamDetail.announcement.publishButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 等待审核弹窗 */}
      <Modal visible={showPendingModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pendingModal}>
            <View style={styles.pendingModalIcon}>
              <Ionicons name="hourglass" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.pendingModalTitle}>{t('screens.teamDetail.join.pendingModalTitle')}</Text>
            <Text style={styles.pendingModalDesc}>
              {t('screens.teamDetail.join.pendingModalDesc')}
            </Text>
            <TouchableOpacity style={styles.pendingModalBtn} onPress={() => setShowPendingModal(false)}>
              <Text style={styles.pendingModalBtnText}>{t('screens.teamDetail.join.pendingModalButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 申请管理员弹窗 */}
      <Modal visible={showApplyAdminModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.applyAdminModal}>
            <View style={styles.applyAdminModalHandle} />
            
            <View style={styles.applyAdminModalHeader}>
              <Text style={styles.applyAdminModalTitle}>{t('screens.teamDetail.applyAdmin.title')}</Text>
              <Text style={styles.applyAdminModalSubtitle}>
                {t('screens.teamDetail.applyAdmin.subtitle')}
              </Text>
            </View>

            <ScrollView style={styles.applyAdminModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.applyAdminSection}>
                <Text style={styles.applyAdminLabel}>{t('screens.teamDetail.applyAdmin.reasonLabel')} <Text style={{
                  color: '#ef4444'
                }}>{t('screens.teamDetail.applyAdmin.reasonRequired')}</Text></Text>
                <TextInput style={styles.applyAdminTextarea} placeholder={t('screens.teamDetail.applyAdmin.reasonPlaceholder')} placeholderTextColor="#9ca3af" value={applyReason} onChangeText={setApplyReason} multiline textAlignVertical="top" />
              </View>

              <View style={styles.applyAdminTips}>
                <Text style={styles.applyAdminTipsTitle}>{t('screens.teamDetail.applyAdmin.tipsTitle')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip1')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip2')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip3')}</Text>
              </View>
            </ScrollView>

            <View style={styles.applyAdminModalFooter}>
              <TouchableOpacity style={styles.cancelApplyBtn} onPress={() => {
              setShowApplyAdminModal(false);
              setApplyReason('');
            }}>
                <Text style={styles.cancelApplyBtnText}>{t('screens.teamDetail.applyAdmin.cancelButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitApplyBtn, !applyReason.trim() && styles.submitApplyBtnDisabled]} onPress={handleApplyAdmin} disabled={!applyReason.trim()}>
                <Text style={styles.submitApplyBtnText}>{t('screens.teamDetail.applyAdmin.submitButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 解散团队弹窗 */}
      <Modal visible={showDismissModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dismissModal}>
            <View style={styles.dismissModalHandle} />
            
            <View style={styles.dismissModalHeader}>
              <View style={styles.dismissModalIconWrapper}>
                <Ionicons name="warning" size={48} color="#ef4444" />
              </View>
              <Text style={styles.dismissModalTitle}>{t('screens.teamDetail.dismiss.title')}</Text>
              <Text style={styles.dismissModalSubtitle}>
                {t('screens.teamDetail.dismiss.subtitle')}
              </Text>
            </View>

            <View style={styles.dismissModalContent}>
              <View style={styles.dismissWarningBox}>
                <Text style={styles.dismissWarningTitle}>{t('screens.teamDetail.dismiss.warningTitle')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning1')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning2')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning3')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning4')}</Text>
              </View>

              <View style={styles.dismissConfirmSection}>
                <Text style={styles.dismissConfirmLabel}>
                  {t('screens.teamDetail.dismiss.confirmLabel')} <Text style={styles.dismissTeamNameHighlight}>"{team.name}"</Text> {t('screens.teamDetail.dismiss.confirmHighlight')}
                </Text>
                <TextInput style={styles.dismissConfirmInput} placeholder={t('screens.teamDetail.dismiss.confirmPlaceholder')} placeholderTextColor="#9ca3af" value={dismissConfirmText} onChangeText={setDismissConfirmText} />
              </View>
            </View>

            <View style={styles.dismissModalFooter}>
              <TouchableOpacity style={styles.cancelDismissBtn} onPress={() => {
              setShowDismissModal(false);
              setDismissConfirmText('');
            }}>
                <Text style={styles.cancelDismissBtnText}>{t('screens.teamDetail.dismiss.cancelButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDismissBtn, dismissConfirmText !== team.name && styles.confirmDismissBtnDisabled]} onPress={handleConfirmDismiss} disabled={dismissConfirmText !== team.name}>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.confirmDismissBtnText}>{t('screens.teamDetail.dismiss.confirmButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 转让团长弹窗 */}
      <Modal visible={showTransferLeaderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.transferLeaderModal}>
            <View style={styles.transferLeaderHeader}>
              <TouchableOpacity onPress={() => {
                setShowTransferLeaderModal(false);
                setSelectedNewLeader(null);
              }}>
                <Text style={styles.transferLeaderCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.transferLeaderTitle}>{t('screens.teamDetail.transfer.title')}</Text>
              <TouchableOpacity 
                onPress={handleConfirmTransferLeader}
                disabled={!selectedNewLeader}
              >
                <Text style={[
                  styles.transferLeaderConfirmText,
                  !selectedNewLeader && styles.transferLeaderConfirmTextDisabled
                ]}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.transferLeaderList} 
              contentContainerStyle={styles.transferLeaderListContent}
              showsVerticalScrollIndicator={false}
            >
              {teamMembers
                .filter(member => member.role !== '队长')
                .map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.transferLeaderItem}
                    onPress={() => setSelectedNewLeader(member.id)}
                  >
                    <View style={styles.transferLeaderRadio}>
                      {selectedNewLeader === member.id && (
                        <View style={styles.transferLeaderRadioInner} />
                      )}
                    </View>
                    <Avatar uri={member.avatar} name={member.name} size={40} />
                    <View style={styles.transferLeaderInfo}>
                      <Text style={styles.transferLeaderName}>{member.name}</Text>
                      <Text style={styles.transferLeaderRole}>{member.role}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f9fafb'
  },
  moreActionsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f9fafb'
  },
  content: {
    flex: 1
  },
  teamInfoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  teamName: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8
  },
  // 紧凑型操作按钮（放在标题右侧）
  compactActionsRow: {
    flexDirection: 'row',
    gap: 6
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  compactActionBtnPurple: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  compactActionBtnRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  compactActionBtnDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb'
  },
  compactActionBtnText: {
    fontSize: scaleFont(11),
    color: '#3b82f6',
    fontWeight: '600'
  },
  compactActionBtnTextPurple: {
    color: '#8b5cf6'
  },
  compactActionBtnTextRed: {
    color: '#ef4444'
  },
  compactActionBtnTextDisabled: {
    color: '#9ca3af'
  },
  compactDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  compactDismissBtnText: {
    fontSize: scaleFont(11),
    color: '#ef4444',
    fontWeight: '600'
  },
  teamDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
    marginBottom: 8
  },
  teamStats: {
    flexDirection: 'row',
    gap: 16
  },
  teamStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  teamStatText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  // 团队成员区域 - 支持两种显示模式
  teamMembersSection: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  teamMembersTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#6b7280'
  },
  viewAllText: {
    fontSize: scaleFont(13),
    color: '#f59e0b',
    fontWeight: '500'
  },
  // 横向滚动模式（已加入团队）
  teamMembersScroll: {
    paddingHorizontal: 16
  },
  teamMemberItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 64
  },
  // 网格模式（未加入团队）
  teamMembersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8
  },
  teamMemberGridItem: {
    alignItems: 'center',
    width: '20%',
    marginBottom: 16
  },
  // 通用样式
  teamMemberAvatarWrapper: {
    position: 'relative',
    marginBottom: 6
  },
  teamMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f59e0b'
  },
  teamLeaderBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  teamMemberName: {
    fontSize: scaleFont(12),
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2
  },
  teamMemberRole: {
    fontSize: scaleFont(10),
    color: '#f59e0b',
    fontWeight: '600'
  },
  // Tab标签
  tabsSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tabs: {
    flexDirection: 'row'
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
    color: '#f59e0b',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#f59e0b'
  },
  tabBadge: {
    position: 'absolute',
    top: 6,
    right: '25%',
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  tabBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  // 团队聊天区域 - 参照团队弹窗样式
  teamChatSection: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: '#fff'
  },
  // 排序过滤器容器（团队讨论）
  sortFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  teamChatMessage: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamChatBubble: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0
  },
  teamChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  teamChatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  teamChatUser: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af',
    flex: 1
  },
  teamChatTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  teamChatText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10,
    paddingLeft: 0
  },
  teamChatContent: {
    flex: 1
  },
  teamChatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  teamChatFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  teamChatFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  teamChatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  interactionBtnDisabled: {
    opacity: 0.45
  },
  teamChatActionText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  interactionTextDisabled: {
    color: '#d1d5db'
  },
  // 团队聊天输入栏 - 参照团队弹窗样式
  teamChatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8
  },
  teamChatInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: '#1f2937',
    maxHeight: 100
  },
  teamChatInputPlaceholder: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  teamChatSendBtn: {
    backgroundColor: '#f59e0b',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // 团队操作按钮 - 参照团队弹窗样式
  teamActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  teamJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  teamJoinBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  teamLeaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  teamLeaveBtnText: {
    fontSize: scaleFont(15),
    color: '#ef4444',
    fontWeight: '600'
  },
  // 限制访问提示
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a'
  },
  restrictedNoticeText: {
    fontSize: scaleFont(13),
    color: '#92400e',
    fontWeight: '500',
    flex: 1
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  pendingNoticeText: {
    fontSize: scaleFont(14),
    color: '#92400e',
    fontWeight: '500'
  },
  // 公告列表
  announcementList: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  announcementItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  pinnedText: {
    fontSize: scaleFont(11),
    color: '#ef4444',
    fontWeight: '600'
  },
  announcementTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: scaleFont(22)
  },
  announcementContent: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(20),
    marginBottom: 12
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  announcementAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  announcementAuthorText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  announcementTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  // 审批消息列表
  approvalList: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  approvalSection: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  approvalSectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  approvalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  approvalUserInfo: {
    flex: 1,
    marginLeft: 12
  },
  approvalUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  approvalUserName: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  approvalTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  adminApplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  adminApplyBadgeText: {
    fontSize: scaleFont(11),
    color: '#8b5cf6',
    fontWeight: '500'
  },
  approvalReasonBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 0
  },
  approvalReasonLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4
  },
  approvalReasonText: {
    fontSize: scaleFont(13),
    color: '#374151',
    lineHeight: scaleFont(20)
  },
  // 内联按钮容器（在用户信息行右侧）
  approvalActionsInline: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8
  },
  // 小尺寸拒绝按钮
  approvalRejectBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  approvalRejectTextSmall: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '600'
  },
  // 小尺寸同意按钮
  approvalApproveBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#22c55e',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  approvalApproveTextSmall: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600'
  },
  // 保留原有样式以防其他地方使用
  approvalActions: {
    flexDirection: 'row',
    gap: 12
  },
  approvalRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  approvalRejectText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '600'
  },
  approvalApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8
  },
  approvalApproveText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  approvalEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  approvalEmptyText: {
    fontSize: scaleFont(16),
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16
  },
  approvalEmptyHint: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginTop: 8
  },
  // 回复弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    flex: 1
  },
  commentListModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  commentListModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  commentListModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentListHeaderLeft: {
    width: 40
  },
  commentListHeaderRight: {
    width: 40
  },
  commentListCloseBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
    zIndex: 10
  },
  commentListModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937'
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
  commentListScroll: {
    maxHeight: 500,
    backgroundColor: '#fff'
  },
  commentListCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  commentListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  commentListAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#9ca3af'
  },
  commentListTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  commentListContent: {
    flex: 1
  },
  commentListText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22),
    marginBottom: 10
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
    borderTopColor: '#f3f4f6'
  },
  commentListWriteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20
  },
  commentListWriteText: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
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
  commentToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  commentToolsLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  commentToolItem: {
    padding: 10
  },
  commentPublishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    zIndex: 1
  },
  commentPublishBtnDisabled: {
    backgroundColor: '#ffcdd2'
  },
  commentPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  commentPublishTextDisabled: {
    color: '#fff'
  },
  commentTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: '#333',
    lineHeight: scaleFont(26),
    minHeight: 200
  },
  commentIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16
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
    marginBottom: 16
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
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  replySubmitBtnDisabled: {
    backgroundColor: '#fcd34d'
  },
  replySubmitText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 成员列表弹窗
  membersModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    height: '70%',
    minHeight: 320
  },
  membersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  membersModalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  membersModalContent: {
    flex: 1
  },
  membersModalList: {
    flex: 1
  },
  membersModalListContent: {
    paddingBottom: 12
  },
  memberModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  memberModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: modalTokens.surfaceMuted
  },
  memberModalInfo: {
    flex: 1,
    marginLeft: 12
  },
  memberModalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  memberModalName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: modalTokens.textPrimary
  },
  memberModalRole: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted
  },
  leaderBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  leaderBadgeText: {
    fontSize: scaleFont(11),
    color: '#f59e0b',
    fontWeight: '600'
  },
  // 发布公告弹窗
  publishAnnouncementModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    maxHeight: '80%'
  },
  publishAnnouncementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  publishAnnouncementTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  publishAnnouncementForm: {
    marginBottom: 16
  },
  formLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  formInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    marginBottom: 16
  },
  formTextarea: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  pinnedCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pinnedCheckboxText: {
    fontSize: scaleFont(14),
    color: '#374151'
  },
  publishAnnouncementSubmitBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  publishAnnouncementSubmitText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 等待审核弹窗
  pendingModal: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center'
  },
  pendingModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  pendingModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginBottom: 12
  },
  pendingModalDesc: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    lineHeight: scaleFont(22),
    textAlign: 'center',
    marginBottom: 24
  },
  pendingModalBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  pendingModalBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 申请管理员按钮
  applyAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  applyAdminBtnDisabled: {
    backgroundColor: '#f3f4f6'
  },
  applyAdminBtnText: {
    fontSize: scaleFont(13),
    color: '#8b5cf6',
    fontWeight: '500'
  },
  applyAdminBtnTextDisabled: {
    color: '#9ca3af'
  },
  // 邀请弹窗
  inviteModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '85%',
    paddingBottom: 20
  },
  inviteModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  inviteModalHeader: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  inviteModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 4
  },
  inviteModalSubtitle: {
    fontSize: scaleFont(13),
    color: modalTokens.textSecondary
  },
  inviteTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8
  },
  inviteTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  inviteTabActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  inviteTabText: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted,
    fontWeight: '500'
  },
  inviteTabTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  inviteSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 12
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary
  },
  selectedCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    alignSelf: 'flex-start'
  },
  selectedCountText: {
    fontSize: scaleFont(12),
    color: '#3b82f6',
    fontWeight: '600'
  },
  inviteUserList: {
    maxHeight: 350,
    paddingHorizontal: 20
  },
  inviteUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  inviteUserItemSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  inviteUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  inviteUserInfo: {
    flex: 1
  },
  inviteUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  inviteUserName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: modalTokens.textPrimary
  },
  inviteUserMeta: {
    fontSize: scaleFont(12),
    color: modalTokens.textMuted
  },
  inviteCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: modalTokens.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  inviteCheckboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  inviteModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelInviteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelInviteBtnText: {
    fontSize: scaleFont(15),
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  sendInviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 12
  },
  sendInviteBtnDisabled: {
    backgroundColor: '#d1d5db'
  },
  sendInviteBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 申请管理员弹窗
  applyAdminModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '70%',
    paddingBottom: 20
  },
  applyAdminModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  applyAdminModalHeader: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  applyAdminModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 4
  },
  applyAdminModalSubtitle: {
    fontSize: scaleFont(13),
    color: modalTokens.textSecondary
  },
  applyAdminModalContent: {
    maxHeight: 300,
    paddingHorizontal: 20
  },
  applyAdminSection: {
    marginBottom: 16
  },
  applyAdminLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  applyAdminTextarea: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top'
  },
  applyAdminTips: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  applyAdminTipsTitle: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#166534',
    marginBottom: 8
  },
  applyAdminTipsText: {
    fontSize: scaleFont(12),
    color: '#15803d',
    lineHeight: scaleFont(20)
  },
  applyAdminModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelApplyBtnText: {
    fontSize: scaleFont(15),
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  submitApplyBtn: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitApplyBtnDisabled: {
    backgroundColor: '#d1d5db'
  },
  submitApplyBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 解散团队弹窗
  dismissModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '80%',
    paddingBottom: 20
  },
  dismissModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  dismissModalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  dismissModalIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  dismissModalTitle: {
    fontSize: scaleFont(22),
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 8
  },
  dismissModalSubtitle: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    textAlign: 'center'
  },
  dismissModalContent: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  dismissWarningBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  dismissWarningTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 12
  },
  dismissWarningText: {
    fontSize: scaleFont(13),
    color: '#dc2626',
    lineHeight: scaleFont(22),
    marginBottom: 4
  },
  dismissConfirmSection: {
    marginTop: 8
  },
  dismissConfirmLabel: {
    fontSize: scaleFont(14),
    color: '#374151',
    marginBottom: 12,
    lineHeight: scaleFont(20)
  },
  dismissTeamNameHighlight: {
    fontWeight: '600',
    color: '#ef4444'
  },
  dismissConfirmInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary
  },
  dismissModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelDismissBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelDismissBtnText: {
    fontSize: scaleFont(15),
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  confirmDismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12
  },
  confirmDismissBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  confirmDismissBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  // 转让团长弹窗
  transferLeaderModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    height: '70%',
    paddingBottom: 20
  },
  transferLeaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  transferLeaderCancelText: {
    fontSize: scaleFont(16),
    color: '#6b7280',
    fontWeight: '500',
    width: 60
  },
  transferLeaderTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: modalTokens.textPrimary,
    flex: 1,
    textAlign: 'center'
  },
  transferLeaderConfirmText: {
    fontSize: scaleFont(16),
    color: '#f59e0b',
    fontWeight: '600',
    width: 60,
    textAlign: 'right'
  },
  transferLeaderConfirmTextDisabled: {
    color: '#d1d5db'
  },
  transferLeaderList: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  transferLeaderListContent: {
    paddingBottom: 20
  },
  transferLeaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  transferLeaderRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  transferLeaderRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b'
  },
  transferLeaderInfo: {
    flex: 1,
    marginLeft: 12
  },
  transferLeaderName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: modalTokens.textPrimary,
    marginBottom: 2
  },
  transferLeaderRole: {
    fontSize: scaleFont(13),
    color: modalTokens.textMuted
  }
});
