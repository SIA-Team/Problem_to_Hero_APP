import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Modal, Alert, RefreshControl, ActivityIndicator, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import IdentitySelector from '../components/IdentitySelector';
import ImagePickerSheet from '../components/ImagePickerSheet';
import KeyboardDismissView from '../components/KeyboardDismissView';
import ModalSafeAreaView from '../components/ModalSafeAreaView';
import WriteAnswerModal from '../components/WriteAnswerModal';
import WriteCommentModal from '../components/WriteCommentModal';
import QuestionDetailSkeleton from '../components/QuestionDetailSkeleton';
import ShareModal from '../components/ShareModal';
import EditTextModal from '../components/EditTextModal';
import superLikeCreditService from '../services/SuperLikeCreditService';
import { useTranslation } from '../i18n/withTranslation';
import questionApi from '../services/api/questionApi';
import answerApi from '../services/api/answerApi';
import commentApi from '../services/api/commentApi';
import uploadApi from '../services/api/uploadApi';
import { loadQuestionSupplements } from '../utils/dataLoader';
import { showToast } from '../utils/toast';
import { formatNumber } from '../utils/numberFormatter';
import { formatTime } from '../utils/timeFormatter';
import { normalizeEntityId } from '../utils/jsonLongId';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { scaleFont } from '../utils/responsive';
import { buildTwitterShareText, openTwitterShare } from '../utils/shareService';
const answers = [{
  id: 1,
  author: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
  verified: true,
  adopted: true,
  title: '资深Python开发 · 10年经验',
  content: '作为一个从零开始学Python的过来人，我来分享一下我的经验：\n\n1. 学习时间：如果每天能保证2-3小时的学习时间，3个月完全可以入门并做一些简单的项目。\n\n2. 学习路线：\n- 第1个月：Python基础语法、数据类型、函数、面向对象\n- 第2个月：常用库（NumPy、Pandas）、数据处理\n- 第3个月：实战项目、数据可视化\n\n3. 推荐资源：廖雪峰的Python教程（免费）、《Python编程从入门到实践》',
  likes: 256,
  dislikes: 3,
  comments: 23,
  time: '1小时前',
  invitedBy: {
    name: '张三丰',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=inviter1'
  },
  superLikes: 5,
  // 超级赞数量
  isMyAnswer: false // 是否是我的回答
}, {
  id: 2,
  author: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer2',
  verified: false,
  adopted: false,
  adoptedCount: 3,
  // 被采纳的次数
  title: '数据分析师 · 3年经验',
  content: '我也是文科转行的，现在在做数据分析。给你几点建议：\n\n1. 不要一开始就啃书，先跟着视频教程敲代码\n2. 多做项目，边学边练\n3. 加入一些学习群，有问题可以随时问',
  likes: 89,
  dislikes: 1,
  comments: 12,
  time: '30分钟前',
  // 添加仲裁信息
  hasArbitration: true,
  arbitrationResult: 'completed',
  // 'completed': 仲裁已完成
  arbitrationData: {
    status: 'rejected',
    // 'approved': 推翻, 'rejected': 维持
    votes: {
      agree: 1,
      disagree: 2,
      total: 3
    },
    experts: [{
      id: 1,
      name: '李明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert1',
      title: 'Python架构师',
      vote: 'agree',
      reason: '答案过于简单，缺少具体的学习方法和资源推荐，建议推翻。',
      time: '2小时前'
    }, {
      id: 2,
      name: '王芳',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert2',
      title: '数据科学家',
      vote: 'disagree',
      reason: '答案虽然简短，但给出了实用的建议，适合初学者，建议维持。',
      time: '1小时前'
    }, {
      id: 3,
      name: '赵强',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert3',
      title: '技术总监',
      vote: 'disagree',
      reason: '答案简洁明了，重点突出，对于文科转行者来说很有参考价值。',
      time: '30分钟前'
    }]
  },
  superLikes: 12,
  // 超级赞数量
  isMyAnswer: true // 是我的回答，可以购买超级赞
}, {
  id: 3,
  author: '编程新手',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer3',
  verified: false,
  adopted: false,
  title: '学生',
  content: '同问！我也想学Python，坐等大佬回答~',
  likes: 5,
  dislikes: 2,
  comments: 0,
  time: '10分钟前',
  superLikes: 0,
  isMyAnswer: false
}];

// 评论数据
const commentsData = [{
  id: 1,
  author: '技术爱好者',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=comment1',
  content: '这个问题问得好，我也想知道答案！',
  likes: 23,
  time: '2小时前',
  replies: 3,
  superLikes: 5
}, {
  id: 2,
  author: '编程小白',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=comment2',
  content: '同问，坐等大佬回复',
  likes: 15,
  time: '1小时前',
  replies: 1,
  superLikes: 2
}, {
  id: 3,
  author: '数据分析师',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=comment3',
  content: 'Python确实是入门数据分析的好选择，加油！',
  likes: 45,
  time: '30分钟前',
  replies: 5,
  superLikes: 15
}, {
  id: 4,
  author: '前端开发者',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=comment4',
  content: '建议先从基础语法开始，不要急于求成',
  likes: 32,
  time: '20分钟前',
  replies: 2,
  superLikes: 0
}];

// 回复数据
const repliesData = {
  1: [{
    id: 101,
    author: '回复者A',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply1',
    content: '我也是这么想的！',
    likes: 5,
    time: '1小时前'
  }, {
    id: 102,
    author: '回复者B',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply2',
    content: '确实是个好问题',
    likes: 3,
    time: '50分钟前'
  }, {
    id: 103,
    author: '回复者C',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply3',
    content: '期待大佬解答',
    likes: 8,
    time: '40分钟前'
  }],
  2: [{
    id: 201,
    author: '回复者D',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply4',
    content: '一起等',
    likes: 2,
    time: '30分钟前'
  }],
  3: [{
    id: 301,
    author: '回复者E',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply5',
    content: '说得对！',
    likes: 10,
    time: '25分钟前'
  }, {
    id: 302,
    author: '回复者F',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply6',
    content: '我也在学Python',
    likes: 7,
    time: '20分钟前'
  }, {
    id: 303,
    author: '回复者G',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply7',
    content: '加油加油！',
    likes: 4,
    time: '15分钟前'
  }, {
    id: 304,
    author: '回复者H',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply8',
    content: '一起进步',
    likes: 6,
    time: '10分钟前'
  }, {
    id: 305,
    author: '回复者I',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply9',
    content: '有问题可以互相交流',
    likes: 9,
    time: '5分钟前'
  }],
  4: [{
    id: 401,
    author: '回复者J',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply10',
    content: '同意这个观点',
    likes: 12,
    time: '15分钟前'
  }, {
    id: 402,
    author: '回复者K',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reply11',
    content: '基础很重要',
    likes: 8,
    time: '10分钟前'
  }]
};

// 活动数据
const activitiesData = [{
  id: 1,
  title: 'Python学习交流会',
  type: '线上活动',
  date: '2026-01-20',
  time: '19:00-21:00',
  location: '腾讯会议',
  participants: 45,
  maxParticipants: 100,
  organizer: '张三丰',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  status: '报名中'
}, {
  id: 2,
  title: 'Python实战项目分享',
  type: '线下活动',
  date: '2026-01-25',
  time: '14:00-17:00',
  location: '北京市海淀区中关村创业大街',
  participants: 28,
  maxParticipants: 50,
  organizer: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
  status: '报名中'
}, {
  id: 3,
  title: '数据分析入门讲座',
  type: '线上活动',
  date: '2026-01-18',
  time: '20:00-21:30',
  location: 'Zoom会议',
  participants: 120,
  maxParticipants: 200,
  organizer: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer2',
  status: '即将开始'
}];

// 补充问题数据
const supplementQuestions = [{
  id: 1,
  author: '学习者小李',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supp1',
  location: '上海',
  content: '请问学Python需要先学什么数学基础吗？我高中数学不太好，会不会影响学习？',
  likes: 45,
  dislikes: 2,
  comments: 8,
  shares: 12,
  bookmarks: 23,
  superLikes: 8
}, {
  id: 2,
  author: '转行程序员',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supp2',
  location: '深圳',
  content: '想问一下，学完Python基础后，做数据分析还需要学哪些工具？比如SQL、Excel这些需要吗？',
  likes: 32,
  dislikes: 1,
  comments: 5,
  shares: 8,
  bookmarks: 15,
  superLikes: 3
}, {
  id: 3,
  author: '大学生小张',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supp3',
  location: '广州',
  content: '有没有推荐的Python练手项目？最好是那种能写进简历的',
  likes: 28,
  dislikes: 0,
  comments: 12,
  shares: 18,
  bookmarks: 34,
  superLikes: 12
}, {
  id: 4,
  author: '职场新人',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=supp4',
  location: '杭州',
  content: '自学和报班哪个更好？有没有性价比高的网课推荐？',
  likes: 19,
  dislikes: 3,
  comments: 6,
  shares: 5,
  bookmarks: 11,
  superLikes: 0
}];
export default function QuestionDetailScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();

  // 淡入动画
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // 问题详情数据状态
  const [questionData, setQuestionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailReloadVersion, setDetailReloadVersion] = useState(0);

  // 补充列表状态 - 优化为分排序方式缓存
  const [supplementsCache, setSupplementsCache] = useState({
    featured: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    },
    newest: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    }
  });
  const [supplementsLoading, setSupplementsLoading] = useState(false);
  const [supplementsRefreshing, setSupplementsRefreshing] = useState(false);
  const [supplementsLoadingMore, setSupplementsLoadingMore] = useState(false);
  const [supplementsSortBy, setSupplementsSortBy] = useState('featured');

  // 从缓存中获取当前排序的补充数据
  const currentSupplementsData = supplementsCache[supplementsSortBy];
  const supplementsList = currentSupplementsData.list;
  const supplementsPage = currentSupplementsData.pageNum;
  const supplementsHasMore = currentSupplementsData.hasMore;

  // 回答列表状态 - 优化为分排序方式缓存
  const [answersCache, setAnswersCache] = useState({
    featured: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    },
    newest: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    }
  });
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersRefreshing, setAnswersRefreshing] = useState(false);
  const [answersLoadingMore, setAnswersLoadingMore] = useState(false);
  const [answersSortBy, setAnswersSortBy] = useState('featured');

  // 评论列表状态 - 按排序方式缓存
  const [commentsCache, setCommentsCache] = useState({
    likes: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    },
    newest: {
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      lastUpdated: null
    }
  });
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsSortBy, setCommentsSortBy] = useState('likes');

  // 缓存配置
  const CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟缓存过期时间
  const AUTO_REFRESH_INTERVAL = 30 * 1000; // 30秒自动检查间隔

  // 从缓存中获取当前排序的数据
  const currentAnswersData = answersCache[answersSortBy];
  const answersList = currentAnswersData.list;
  const answersTotal = currentAnswersData.total;
  const answersPageNum = currentAnswersData.pageNum;
  const answersHasMore = currentAnswersData.hasMore;
  const currentCommentsData = commentsCache[commentsSortBy];
  const commentsList = currentCommentsData.list;
  const commentsTotal = currentCommentsData.total;
  const commentsPageNum = currentCommentsData.pageNum;
  const commentsHasMore = currentCommentsData.hasMore;
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState(''); // 初始为空字符串
  const [suppLiked, setSuppLiked] = useState({});
  const [suppDisliked, setSuppDisliked] = useState({});
  const [suppBookmarked, setSuppBookmarked] = useState({});
  const [liked, setLiked] = useState({});
  const [bookmarked, setBookmarked] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementPublishBlockedMessage, setSupplementPublishBlockedMessage] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImages, setAnswerImages] = useState([]); // 回答图片
  const [supplementText, setSupplementText] = useState('');
  const [supplementImages, setSupplementImages] = useState([]);
  const [showSupplementImagePicker, setShowSupplementImagePicker] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    maxParticipants: '',
    contact: '',
    activityType: 'online',
    organizerType: 'personal',
    images: []
  });
  const [commentLiked, setCommentLiked] = useState({});
  const [commentLikeLoading, setCommentLikeLoading] = useState({});
  const [commentCollected, setCommentCollected] = useState({});
  const [commentCollectLoading, setCommentCollectLoading] = useState({});
  const [commentBookmarked, setCommentBookmarked] = useState({});
  const [commentDisliked, setCommentDisliked] = useState({});
  const [commentDislikeLoading, setCommentDislikeLoading] = useState({});
  const [sortFilter, setSortFilter] = useState('精选'); // 精选 or 最新
  const [showSuppMoreModal, setShowSuppMoreModal] = useState(false);
  const [currentSuppId, setCurrentSuppId] = useState(null);
  const [suppCommentListState, setSuppCommentListState] = useState({
    list: [],
    total: 0,
    pageNum: 1,
    hasMore: true,
    loaded: false,
    loading: false,
    refreshing: false,
    loadingMore: false,
    targetId: null
  });
  const [suppCommentRepliesMap, setSuppCommentRepliesMap] = useState({});
  const [expandedSuppCommentReplies, setExpandedSuppCommentReplies] = useState({});
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentTarget, setCommentTarget] = useState({
    targetType: 1,
    targetId: null,
    parentId: 0,
    replyToCommentId: 0,
    replyToUserId: null,
    replyToUserName: '',
    originalComment: null
  });
  const [currentAnswerId, setCurrentAnswerId] = useState(null);
  const [answerLiked, setAnswerLiked] = useState({});
  const [answerDisliked, setAnswerDisliked] = useState({});
  const [answerBookmarked, setAnswerBookmarked] = useState({});
  const [answerCollectLoading, setAnswerCollectLoading] = useState({}); // 收藏请求中状态
  const [answerCollectDebounce, setAnswerCollectDebounce] = useState({}); // 收藏防抖定时器
  const [answerDislikeLoading, setAnswerDislikeLoading] = useState({}); // 点踩请求中状态
  const [answerDislikeDebounce, setAnswerDislikeDebounce] = useState({}); // 点踩防抖定时器
  const [answerLikeLoading, setAnswerLikeLoading] = useState({}); // 点赞请求中状态
  const [answerLikeDebounce, setAnswerLikeDebounce] = useState({}); // 点赞防抖定时器
  const [answerAdopted, setAnswerAdopted] = useState({}); // 记录每个回答的采纳状态
  const [answerAdoptLoading, setAnswerAdoptLoading] = useState({}); // 采纳请求中状态
  const [showAnswerCommentListModal, setShowAnswerCommentListModal] = useState(false);
  const [answerCommentListState, setAnswerCommentListState] = useState({
    list: [],
    total: 0,
    pageNum: 1,
    hasMore: true,
    loaded: false,
    loading: false,
    refreshing: false,
    loadingMore: false,
    targetId: null
  });
  const [questionCommentRepliesMap, setQuestionCommentRepliesMap] = useState({});
  const [answerCommentRepliesMap, setAnswerCommentRepliesMap] = useState({});
  const [showSuppCommentListModal, setShowSuppCommentListModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const answerCommentsList = answerCommentListState.list;
  const answerCommentsHasMore = answerCommentListState.hasMore;
  const suppCommentsList = suppCommentListState.list;
  const suppCommentsTotal = suppCommentListState.total;
  const suppCommentsHasMore = suppCommentListState.hasMore;
  const [showCommentReplyModal, setShowCommentReplyModal] = useState(false);
  const [showAnswerCommentReplyModal, setShowAnswerCommentReplyModal] = useState(false);
  const [showSuppCommentReplyModal, setShowSuppCommentReplyModal] = useState(false);
  const [currentCommentId, setCurrentCommentId] = useState(null);
  const [currentAnswerCommentId, setCurrentAnswerCommentId] = useState(null);
  const [currentSuppCommentId, setCurrentSuppCommentId] = useState(null);
  const [expandedQuestionReplyChildren, setExpandedQuestionReplyChildren] = useState({});
  const [expandedAnswerReplyChildren, setExpandedAnswerReplyChildren] = useState({});
  const [expandedSuppReplyChildren, setExpandedSuppReplyChildren] = useState({});
  const [isTeamMember, setIsTeamMember] = useState(false); // 是否已加入团队
  const [showProgressBar, setShowProgressBar] = useState(false); // 是否显示进度条
  const [solvedPercentage, setSolvedPercentage] = useState(65); // 已解决的百分比
  const [communitySolveVoteSummary, setCommunitySolveVoteSummary] = useState({
    applicable: false,
    solvedCount: 0,
    unsolvedCount: 0,
    myChoice: null
  });
  const [communitySolveVoteSubmitting, setCommunitySolveVoteSubmitting] = useState(false);
  const isSolvedChoiceSelected = communitySolveVoteSummary.myChoice === 'SOLVED';
  const isUnsolvedChoiceSelected = communitySolveVoteSummary.myChoice === 'UNSOLVED';
  const [currentSupplement, setCurrentSupplement] = useState(null); // 当前要回答的补充问题
  const [showSupplementAnswerModal, setShowSupplementAnswerModal] = useState(false); // 补充回答弹窗
  const [showSupplementAnswerSuccessModal, setShowSupplementAnswerSuccessModal] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState(null); // 当前要补充回答的答案
  const [supplementAnswerText, setSupplementAnswerText] = useState(''); // 补充回答内容

  // 身份选择
  const [answerIdentity, setAnswerIdentity] = useState('personal'); // 回答身份

  // 转发分享状态
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareData, setCurrentShareData] = useState(null);
  const [showTwitterInviteEditor, setShowTwitterInviteEditor] = useState(false);
  const [twitterInviteDraftText, setTwitterInviteDraftText] = useState('');
  const [selectedTwitterInviteUser, setSelectedTwitterInviteUser] = useState(null);
  const [pendingTwitterInvitePlatform, setPendingTwitterInvitePlatform] = useState(null);
  const [answerSelectedTeams, setAnswerSelectedTeams] = useState([]); // 回答选中的团队
  const [supplementQuestionIdentity, setSupplementQuestionIdentity] = useState('personal'); // 补充问题身份
  const [supplementQuestionSelectedTeams, setSupplementQuestionSelectedTeams] = useState([]); // 补充问题选中的团队
  const [supplementIdentity, setSupplementIdentity] = useState('personal'); // 补充回答身份
  const [supplementSelectedTeams, setSupplementSelectedTeams] = useState([]); // 补充回答选中的团队
  const [commentIdentity, setCommentIdentity] = useState('personal'); // 评论身份
  const [commentSelectedTeams, setCommentSelectedTeams] = useState([]); // 评论选中的团队

  // 无限滚动状态
  const [showAllInvited, setShowAllInvited] = useState(false); // 是否显示全部已邀请用户
  const [showAllSupplements, setShowAllSupplements] = useState(false); // 是否显示全部补充
  const [showAllAnswers, setShowAllAnswers] = useState(false); // 是否显示全部回答
  const [showAllComments, setShowAllComments] = useState(false); // 是否显示全部评论

  const [invitedPage, setInvitedPage] = useState(1);
  const [answersPage, setAnswersPage] = useState(1);

  // 邀请标签页状态
  const [inviteTab, setInviteTab] = useState('本站'); // '本站' or '推特'
  const [searchLocalUser, setSearchLocalUser] = useState(''); // 本站用户搜索
  const [searchTwitterUser, setSearchTwitterUser] = useState(''); // 推特用户搜索

  // 获取安全区域
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset(20);
  const commentSheetBottomSpacing = Math.max(insets.bottom, 16) + 12;
  const [commentsPage, setCommentsPage] = useState(1);
  const [loadingInvited, setLoadingInvited] = useState(false);
  const [loadingSupplements, setLoadingSupplements] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // 增加悬赏相关状态
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [rewardContributors, setRewardContributors] = useState(3); // 追加悬赏的人数
  const [addRewardAmount, setAddRewardAmount] = useState('');
  const [selectedAddRewardAmount, setSelectedAddRewardAmount] = useState(null);
  const [showRewardContributorsModal, setShowRewardContributorsModal] = useState(false); // 显示追加悬赏人员名单

  // 当前悬赏金额 - 从问题数据中获取
  const currentReward = questionData ? (Number(questionData.bountyAmount || 0) / 100) : 0;
  const formatCompactRewardAmount = React.useCallback(amount => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return '$0';
    }

    if (numericAmount < 1000) {
      return `$${numericAmount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}`;
    }

    if (numericAmount >= 1000000000) {
      return `$${(numericAmount / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
    }

    if (numericAmount >= 1000000) {
      return `$${(numericAmount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }

    return `$${(numericAmount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }, []);
  const rewardAmountDisplayText = formatCompactRewardAmount(currentReward);
  const syncCommunitySolveVoteSummary = React.useCallback(summaryResponse => {
    const normalizedSummary = summaryResponse?.code === 200 ? normalizeCommunitySolveVoteSummary(summaryResponse.data) : normalizeCommunitySolveVoteSummary(null);
    setCommunitySolveVoteSummary(normalizedSummary);
    setSolvedPercentage(getCommunitySolveVoteSolvedPercentage(normalizedSummary));
    setShowProgressBar(Boolean(normalizedSummary.applicable));
    return normalizedSummary;
  }, []);
  const refreshCommunitySolveVoteSummary = React.useCallback(async questionId => {
    if (!questionId) {
      return normalizeCommunitySolveVoteSummary(null);
    }
    const summaryResponse = await questionApi.getCommunitySolveVoteSummary(questionId);
    return syncCommunitySolveVoteSummary(summaryResponse);
  }, [syncCommunitySolveVoteSummary]);
  const handleCommunitySolveVote = React.useCallback(async choice => {
    const questionId = route?.params?.id ?? questionData?.id ?? questionData?.questionId;
    if (!questionId) {
      showToast('问题ID不存在', 'error');
      return;
    }
    if (!communitySolveVoteSummary.applicable) {
      showToast('当前问题不适用社区投票', 'warning');
      return;
    }
    if (communitySolveVoteSubmitting) {
      return;
    }
    try {
      setCommunitySolveVoteSubmitting(true);
      const normalizedChoice = `${choice || ''}`.trim().toUpperCase();
      const response = await questionApi.submitCommunitySolveVote(questionId, normalizedChoice);
      if (response?.code !== 200) {
        showToast(response?.msg || '投票失败', 'error');
        return;
      }
      await refreshCommunitySolveVoteSummary(questionId);
      setShowProgressBar(true);
    } catch (error) {
      console.error('❌ 社区已解决投票失败:', error);
      showToast(error?.response?.data?.msg || error?.message || '投票失败，请稍后重试', 'error');
    } finally {
      setCommunitySolveVoteSubmitting(false);
    }
  }, [communitySolveVoteSubmitting, communitySolveVoteSummary.applicable, route?.params?.id, questionData?.id, questionData?.questionId, refreshCommunitySolveVoteSummary]);

  // 超级赞相关状态
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false); // 显示购买超级赞弹窗
  const [currentAnswerForSuperLike, setCurrentAnswerForSuperLike] = useState(null); // 当前要购买超级赞的回答
  const [superLikeAmount, setSuperLikeAmount] = useState(''); // 购买超级赞的数量
  const [selectedSuperLikeAmount, setSelectedSuperLikeAmount] = useState(null); // 快速选择的超级赞数量
  const [answerSuperLikes, setAnswerSuperLikes] = useState({}); // 记录每个回答的超级赞数量
  const [supplementSuperLikes, setSupplementSuperLikes] = useState({}); // 记录每个补充的超级赞数量
  const [commentSuperLikes, setCommentSuperLikes] = useState({}); // 记录每个评论的超级赞数量

  // 追加悬赏人员名单数据
  const rewardContributorsList = [{
    id: 1,
    name: '张三丰',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    amount: 20,
    time: '2小时前'
  }, {
    id: 2,
    name: 'Python老司机',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
    amount: 15,
    time: '1小时前'
  }, {
    id: 3,
    name: '数据分析师小王',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer2',
    amount: 15,
    time: '30分钟前'
  }];

  // 仲裁相关状态
  const [showArbitrationModal, setShowArbitrationModal] = useState(false);
  const [showArbitrationStatusModal, setShowArbitrationStatusModal] = useState(false);
  const [showArbitrationResultModal, setShowArbitrationResultModal] = useState(false);

  // 回答展开/收起状态
  const [answerExpanded, setAnswerExpanded] = useState({});
  const [answerNeedsExpand, setAnswerNeedsExpand] = useState({});
  const [currentArbitrationResult, setCurrentArbitrationResult] = useState(null);
  const [arbitrationReason, setArbitrationReason] = useState('');
  const [selectedExperts, setSelectedExperts] = useState([]);
  const [arbitrationStatus, setArbitrationStatus] = useState(null); // null: 未申请, 'pending': 投票中, 'rejected': 维持原判, 'approved': 推翻采纳
  const [arbitrationVotes, setArbitrationVotes] = useState({
    agree: 0,
    disagree: 0,
    total: 0
  });
  const [expertSearchText, setExpertSearchText] = useState(''); // 专家搜索文本

  // 可邀请的专家列表
  const expertsList = [{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert1',
    title: 'Python架构师',
    verified: true,
    expertise: 'Python开发',
    votes: 0
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert2',
    title: '数据科学家',
    verified: true,
    expertise: '数据分析',
    votes: 0
  }, {
    id: 3,
    name: '赵强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert3',
    title: '技术总监',
    verified: true,
    expertise: '技术管理',
    votes: 0
  }, {
    id: 4,
    name: '刘洋',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert4',
    title: 'AI工程师',
    verified: true,
    expertise: '机器学习',
    votes: 0
  }, {
    id: 5,
    name: '陈静',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert5',
    title: '全栈开发',
    verified: true,
    expertise: 'Web开发',
    votes: 0
  }];

  // 专家投票详情数据（模拟已完成投票的情况）
  const [expertVoteDetails, setExpertVoteDetails] = useState([{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert1',
    title: 'Python架构师',
    vote: 'agree',
    reason: '原答案中关于学习时间的估计不够准确，对于零基础学习者来说，3个月时间过于乐观。建议重新评估。',
    time: '2小时前'
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert2',
    title: '数据科学家',
    vote: 'agree',
    reason: '同意推翻。答案缺少对数据分析实际工作场景的介绍，学习路线过于理论化。',
    time: '1小时前'
  }, {
    id: 3,
    name: '赵强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert3',
    title: '技术总监',
    vote: 'disagree',
    reason: '我认为原答案基本合理，学习路线清晰，资源推荐也很实用。建议维持原判。',
    time: '30分钟前'
  }]);

  // 格式化数量显示，超过 999 显示 "999+"
  const formatCount = (count) => {
    const num = Number(count);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num > 999 ? '999+' : num;
  };

  const recommendedTwitterUsers = React.useMemo(
    () =>
      [1, 2, 3, 4, 5].map(i => ({
        id: i,
        name: `@user${i}`,
        followers: `${i}k粉丝`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=rectwitter${i}`
      })),
    []
  );

  // 使用 useMemo 创建 answerTabs，避免在模块加载时调用 t()
  // 优化：只在初始数据加载完成后才显示数量，彻底避免闪烁
  const answerTabs = React.useMemo(() => {
    // 检查初始数据是否已加载（featured排序的数据）
    const initialDataLoaded = supplementsCache.featured.loaded && answersCache.featured.loaded;

    // 如果初始数据未加载，不显示任何数量
    if (!initialDataLoaded) {
      return [t('screens.questionDetail.tabs.supplements'), t('screens.questionDetail.tabs.answers'), t('screens.questionDetail.tabs.comments'), t('screens.questionDetail.tabs.invite')];
    }

    // 初始数据已加载，显示实际数量（格式化后）
    return [`${t('screens.questionDetail.tabs.supplements')} (${formatCount(supplementsList.length)})`, `${t('screens.questionDetail.tabs.answers')} (${formatCount(answersTotal)})`, `${t('screens.questionDetail.tabs.comments')} (${formatCount(commentsTotal || questionData?.commentCount || 0)})`, t('screens.questionDetail.tabs.invite')];
  }, [t, supplementsList.length, answersTotal, commentsTotal, questionData?.commentCount, supplementsCache.featured.loaded, answersCache.featured.loaded]);

  const getTabBaseLabel = React.useCallback(tabLabel => {
    if (!tabLabel) {
      return '';
    }
    return `${tabLabel}`.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }, []);

  const activeTabType = React.useMemo(() => {
    const normalizedActiveTab = getTabBaseLabel(activeTab);
    if (!normalizedActiveTab) {
      return '';
    }

    if (normalizedActiveTab === getTabBaseLabel(t('screens.questionDetail.tabs.supplements'))) {
      return 'supplements';
    }
    if (normalizedActiveTab === getTabBaseLabel(t('screens.questionDetail.tabs.answers'))) {
      return 'answers';
    }
    if (normalizedActiveTab === getTabBaseLabel(t('screens.questionDetail.tabs.comments'))) {
      return 'comments';
    }
    if (normalizedActiveTab === getTabBaseLabel(t('screens.questionDetail.tabs.invite'))) {
      return 'invite';
    }

    return '';
  }, [activeTab, getTabBaseLabel, t]);

  const preferredInitialTabIndex = React.useMemo(() => {
    if (route?.params?.defaultTab === 'answers') {
      return 1;
    }
    return 0;
  }, [route?.params?.defaultTab]);

  // 设置默认选中的标签页 - 使用 useLayoutEffect 确保在渲染前执行
  React.useLayoutEffect(() => {
    if (!activeTab && answerTabs.length > 0) {
      setActiveTab(answerTabs[preferredInitialTabIndex] || answerTabs[0]);
    }
  }, [activeTab, answerTabs, preferredInitialTabIndex]);

  // 当标签文本变化时，更新 activeTab 以保持同步
  useEffect(() => {
    if (activeTab && answerTabs.length > 0) {
      // 检查当前 activeTab 是否还在 answerTabs 中
      const currentTabIndex = answerTabs.findIndex(tab => {
        // 提取标签类型（去掉数量部分）
        const activeType = activeTab.split(' (')[0].trim();
        const tabType = tab.split(' (')[0].trim();
        return activeType === tabType;
      });

      // 如果找到匹配的标签，平滑更新为新的文本（包含最新数量）
      if (currentTabIndex !== -1 && answerTabs[currentTabIndex] !== activeTab) {
        // 使用 requestAnimationFrame 确保在下一帧更新，避免闪烁
        requestAnimationFrame(() => {
          setActiveTab(answerTabs[currentTabIndex]);
        });
      }
    }
  }, [answerTabs]);
  useEffect(() => {
    const questionId = route?.params?.id;
    const isSupplementsTab = activeTabType === 'supplements';
    if (!questionId || !isSupplementsTab || supplementsLoading || supplementsRefreshing || supplementsLoadingMore) {
      return;
    }
    const currentCache = supplementsCache[supplementsSortBy];
    if (!currentCache.loaded || isCacheExpired(currentCache)) {
      loadSupplementsList(questionId, true, supplementsSortBy);
    }
  }, [activeTabType, supplementsSortBy, supplementsCache, supplementsLoading, supplementsRefreshing, supplementsLoadingMore, route?.params?.id]);
  useEffect(() => {
    const questionId = route?.params?.id;
    const isAnswersTab = activeTabType === 'answers';
    if (!questionId || !isAnswersTab || answersLoading || answersRefreshing || answersLoadingMore) {
      return;
    }
    const currentCache = answersCache[answersSortBy];
    if (!currentCache.loaded || isCacheExpired(currentCache)) {
      loadAnswersList(questionId, true, answersSortBy);
    }
  }, [activeTabType, answersSortBy, answersCache, answersLoading, answersRefreshing, answersLoadingMore, route?.params?.id]);
  useEffect(() => {
    const questionId = route?.params?.id;
    const isCommentsTab = activeTabType === 'comments';
    if (!questionId || !isCommentsTab) {
      return;
    }
    const currentCache = commentsCache[commentsSortBy];
    if (!currentCache.loaded || isCacheExpired(currentCache)) {
      loadCommentsList(questionId, true, commentsSortBy);
    }
  }, [activeTabType, commentsSortBy, commentsCache, route?.params?.id]);
  useEffect(() => {
    if (!showAnswerCommentListModal || !currentAnswerId) {
      return;
    }
    setAnswerCommentListState(prevState => ({
      ...prevState,
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      loading: true,
      refreshing: false,
      loadingMore: false,
      targetId: Number(currentAnswerId)
    }));
    setAnswerCommentRepliesMap({});
    setCurrentAnswerCommentId(null);
    loadAnswerComments(currentAnswerId, {
      isRefresh: true
    });
  }, [showAnswerCommentListModal, currentAnswerId]);
  useEffect(() => {
    if (!showCommentReplyModal || !currentCommentId) {
      return;
    }
    const currentReplyEntry = questionCommentRepliesMap[currentCommentId];
    if (currentReplyEntry?.loaded || currentReplyEntry?.loading) {
      return;
    }
    loadQuestionCommentReplies(currentCommentId);
  }, [showCommentReplyModal, currentCommentId, questionCommentRepliesMap]);
  useEffect(() => {
    if (!showCommentReplyModal) {
      setExpandedQuestionReplyChildren({});
    }
  }, [showCommentReplyModal]);
  useEffect(() => {
    if (!showAnswerCommentReplyModal || !currentAnswerId || !currentAnswerCommentId) {
      return;
    }
    const currentReplyEntry = answerCommentRepliesMap[currentAnswerCommentId];
    if (currentReplyEntry?.loaded || currentReplyEntry?.loading) {
      return;
    }
    loadAnswerCommentReplies(currentAnswerCommentId);
  }, [showAnswerCommentReplyModal, currentAnswerId, currentAnswerCommentId, answerCommentRepliesMap]);
  useEffect(() => {
    if (!showAnswerCommentReplyModal) {
      setExpandedAnswerReplyChildren({});
    }
  }, [showAnswerCommentReplyModal]);
  useEffect(() => {
    if (!showSuppCommentListModal || !currentSuppId) {
      return;
    }
    
    // 如果已经加载过该补充的评论数据，则不重新请求
    if (suppCommentListState.loaded && suppCommentListState.targetId === Number(currentSuppId)) {
      return;
    }
    
    setSuppCommentListState(prevState => ({
      ...prevState,
      list: [],
      total: 0,
      pageNum: 1,
      hasMore: true,
      loaded: false,
      loading: true,
      refreshing: false,
      loadingMore: false,
      targetId: Number(currentSuppId)
    }));
    setExpandedSuppCommentReplies({});
    setSuppCommentRepliesMap({});
    loadSupplementComments(currentSuppId, {
      isRefresh: true
    });
  }, [showSuppCommentListModal, currentSuppId]);
  useEffect(() => {
    if (!showSuppCommentReplyModal || !currentSuppId || !currentSuppCommentId) {
      return;
    }
    const currentReplyEntry = suppCommentRepliesMap[currentSuppCommentId];
    if (currentReplyEntry?.loaded || currentReplyEntry?.loading) {
      return;
    }
    loadSupplementCommentReplies(currentSuppCommentId);
  }, [showSuppCommentReplyModal, currentSuppId, currentSuppCommentId, suppCommentRepliesMap]);
  useEffect(() => {
    if (!showSuppCommentReplyModal) {
      setExpandedSuppReplyChildren({});
    }
  }, [showSuppCommentReplyModal]);

  // 当前问题数据 - 使用真实数据或默认值
  const currentQuestion = questionData ? {
    id: questionData.id,
    title: questionData.title || '无标题',
    author: questionData.author || '匿名用户',
    avatar: questionData.userAvatar || questionData.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${questionData.userId}`,
    displayType: questionData.displayType || 'free',
    reward: questionData.reward || 0
  } : {
    id: route?.params?.id || 1,
    title: '加载中...',
    author: '加载中...',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    displayType: 'free',
    reward: 0
  };
  const currentReplyComment = commentsList.find(comment => String(comment.id) === String(currentCommentId)) || Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(currentCommentId)) || suppCommentsList.find(comment => String(comment.id) === String(currentCommentId)) || commentsData.find(comment => String(comment.id) === String(currentCommentId)) || null;
  const currentAnswerReplyComment = answerCommentsList.find(comment => String(comment.id) === String(currentAnswerCommentId)) || Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(currentAnswerCommentId)) || null;
  const currentSuppReplyComment = suppCommentsList.find(comment => String(comment.id) === String(currentSuppCommentId)) || null;
  const currentComposerOriginalComment = (() => {
    if (commentTarget?.originalComment) {
      return commentTarget.originalComment;
    }
    if (!(commentTarget?.parentId && commentTarget.parentId !== 0)) {
      return null;
    }
    if (commentTarget.targetType === 3) {
      return suppCommentsList.find(c => String(c.id) === String(commentTarget.parentId)) || Object.values(suppCommentRepliesMap).flatMap(entry => entry?.list || []).find(c => String(c.id) === String(commentTarget.parentId)) || null;
    }
    if (commentTarget.targetType === 1) {
      return commentsList.find(c => String(c.id) === String(commentTarget.parentId)) || Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(c => String(c.id) === String(commentTarget.parentId)) || commentsData.find(c => String(c.id) === String(commentTarget.parentId)) || null;
    }
    if (commentTarget.targetType === 2) {
      return answerCommentsList.find(c => String(c.id) === String(commentTarget.parentId)) || Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(c => String(c.id) === String(commentTarget.parentId)) || null;
    }
    return null;
  })();
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
  const normalizeQuestionDetail = question => {
    if (!question || typeof question !== 'object') {
      return question;
    }
    const normalizedPublicUserId = question.publicUserId ?? question.authorUserId ?? question.authorId ?? question.author_id ?? question.userId ?? question.user_id ?? question.createBy ?? question.create_by ?? question.creatorId ?? question.creator_id ?? question.uid ?? null;
    const hasLikeCountField = hasCountValue(question.likeCount, question.likes);
    const hasCollectCountField = hasCountValue(question.collectCount, question.bookmarkCount, question.bookmarks);
    const hasDislikeCountField = hasCountValue(question.dislikeCount, question.dislikes);
    const normalizedAuthorName = question.userName ?? question.userNickname ?? question.authorNickName ?? question.author ?? '匿名用户';
    const normalizedAuthorAvatar = question.userAvatar ?? question.authorAvatar ?? question.avatar ?? null;
    const normalizedImageUrls = Array.isArray(question.imageUrls) ? question.imageUrls : Array.isArray(question.images) ? question.images : [];
    const normalizedTopicNames = Array.isArray(question.topicNames) ? question.topicNames.filter(Boolean) : Array.isArray(question.topics) ? question.topics.map(topic => typeof topic === 'string' ? topic : topic?.name).filter(Boolean) : [];
    const normalizedStatus = question.questionStatus ?? question.status ?? null;
    const normalizedRawType = question.type ?? question.questionType ?? question.originalType ?? null;
    const normalizedIsAnonymous = Number(question.isAnonymous ?? 0);
    const normalizedBountyAmount = Number(question.bountyAmount ?? question.rewardAmount ?? 0) || 0;
    const normalizedPayViewAmount = Number(question.payViewAmount ?? question.price ?? 0) || 0;
    const normalizedViewCount = Number(question.viewCount ?? question.views ?? 0) || 0;
    const normalizedLikeCount = Number(question.likeCount ?? question.likes ?? 0) || 0;
    const normalizedCollectCount = Number(question.collectCount ?? question.bookmarkCount ?? question.bookmarks ?? 0) || 0;
    const normalizedCommentCount = Number(question.commentCount ?? question.comments ?? 0) || 0;
    const normalizedAnswerCount = Number(question.answerCount ?? question.answers ?? 0) || 0;
    const normalizedAdoptRate = Number(question.adoptRate ?? question.solvedPercent ?? 0) || 0;
    const normalizedCreateTime = question.createTime ?? question.createdAt ?? null;
    const normalizedLiked = !!(question.liked ?? question.isLiked);
    const normalizedCollected = !!(question.collected ?? question.isCollected ?? question.bookmarked ?? question.isBookmarked);
    const normalizedDisliked = !!(question.disliked ?? question.isDisliked);
    const normalizedDisplayType = normalizedPayViewAmount > 0 ? 'paid' : normalizedRawType === 1 || normalizedRawType === '1' || normalizedRawType === 'reward' ? normalizedBountyAmount > 0 ? 'reward' : 'free' : normalizedRawType === 2 || normalizedRawType === '2' || normalizedRawType === 'targeted' ? 'targeted' : 'free';
    const normalizedReward = normalizedBountyAmount > 0 ? Math.floor(normalizedBountyAmount / 100) : 0;
    return {
      ...question,
      questionId: question.questionId ?? question.id ?? null,
      title: question.title ?? question.questionTitle ?? '无标题',
      description: question.description ?? question.content ?? question.questionDescription ?? '',
      publicUserId: normalizedPublicUserId,
      authorId: question.authorId ?? question.author_id ?? normalizedPublicUserId,
      userName: normalizedAuthorName,
      userNickname: question.userNickname ?? question.authorNickName ?? normalizedAuthorName,
      authorNickName: question.authorNickName ?? normalizedAuthorName,
      author: normalizedIsAnonymous === 1 ? '匿名用户' : normalizedAuthorName,
      userAvatar: normalizedAuthorAvatar,
      authorAvatar: normalizedAuthorAvatar,
      avatar: normalizedAuthorAvatar,
      isAnonymous: normalizedIsAnonymous,
      imageUrls: normalizedImageUrls,
      topicNames: normalizedTopicNames,
      questionStatus: normalizedStatus,
      status: normalizedStatus,
      bountyAmount: normalizedBountyAmount,
      payViewAmount: normalizedPayViewAmount,
      displayType: normalizedDisplayType,
      reward: normalizedReward,
      viewCount: normalizedViewCount,
      likeCount: normalizedLikeCount,
      likes: normalizedLikeCount,
      collectCount: normalizedCollectCount,
      bookmarkCount: normalizedCollectCount,
      bookmarks: normalizedCollectCount,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount,
      answerCount: normalizedAnswerCount,
      answers: normalizedAnswerCount,
      adoptRate: normalizedAdoptRate,
      solvedPercent: normalizedAdoptRate,
      createTime: normalizedCreateTime,
      createdAt: normalizedCreateTime,
      liked: normalizedLiked,
      isLiked: normalizedLiked,
      collected: normalizedCollected,
      isCollected: normalizedCollected,
      disliked: normalizedDisliked,
      isDisliked: normalizedDisliked,
      __likeCountResolved: question.__likeCountResolved ?? hasLikeCountField,
      __collectCountResolved: question.__collectCountResolved ?? hasCollectCountField,
      __dislikeCountResolved: question.__dislikeCountResolved ?? hasDislikeCountField,
      isResolved: question.isResolved ?? question.resolved ?? normalizedStatus === 2
    };
  };
  const normalizeCommunitySolveVoteSummary = summary => {
    const normalizedSolvedCount = Math.max(Number(summary?.solvedCount ?? 0) || 0, 0);
    const normalizedUnsolvedCount = Math.max(Number(summary?.unsolvedCount ?? 0) || 0, 0);
    const normalizedChoice = summary?.myChoice === null || summary?.myChoice === undefined ? null : `${summary.myChoice}`.trim().toUpperCase();
    return {
      applicable: !!summary?.applicable,
      solvedCount: normalizedSolvedCount,
      unsolvedCount: normalizedUnsolvedCount,
      myChoice: normalizedChoice === 'SOLVED' || normalizedChoice === 'UNSOLVED' ? normalizedChoice : null
    };
  };
  const getCommunitySolveVoteSolvedPercentage = summary => {
    const solvedCount = Math.max(Number(summary?.solvedCount ?? 0) || 0, 0);
    const unsolvedCount = Math.max(Number(summary?.unsolvedCount ?? 0) || 0, 0);
    const totalCount = solvedCount + unsolvedCount;
    if (totalCount <= 0) {
      return 0;
    }
    return Math.round(solvedCount / totalCount * 100);
  };
  const handleCreateActivity = () => {
    if (!activityForm.title.trim()) {
      alert('请输入活动标题');
      return;
    }
    if (!activityForm.description.trim()) {
      alert('请输入活动内容');
      return;
    }
    if (!activityForm.startTime || !activityForm.endTime) {
      alert('请选择活动时间');
      return;
    }
    if (activityForm.activityType === 'offline' && !activityForm.location.trim()) {
      alert('线下活动请填写活动地址');
      return;
    }
    alert('活动创建成功！');
    setShowActivityModal(false);
    setActivityForm({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      maxParticipants: '',
      contact: '',
      activityType: 'online',
      organizerType: 'personal',
      images: []
    });
  };
  const addActivityImage = () => {
    if (activityForm.images.length < 9) {
      setActivityForm({
        ...activityForm,
        images: [...activityForm.images, `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`]
      });
    } else {
      alert('最多只能上传9张图片');
    }
  };
  const removeActivityImage = index => {
    setActivityForm({
      ...activityForm,
      images: activityForm.images.filter((_, i) => i !== index)
    });
  };

  // 时间格式化函数 - 使用工具函数
  // 已从 ../utils/timeFormatter 导入
  
  const resolveEntityTimestamp = entity => entity?.createTime ?? entity?.createdAt ?? entity?.publishTime ?? entity?.gmtCreate ?? entity?.updateTime ?? entity?.updatedAt ?? null;
  const resolveIpLocation = entity => {
    if (!entity || typeof entity !== 'object') {
      return null;
    }

    const normalizedIpLocation = entity.ipLocation ??
      entity.ip_location ??
      entity.ipAddress ??
      entity.ip_address ??
      entity.userIp ??
      entity.user_ip ??
      entity.ip ??
      null;

    if (typeof normalizedIpLocation !== 'string') {
      return normalizedIpLocation ?? null;
    }

    const trimmedIpLocation = normalizedIpLocation.trim();
    return trimmedIpLocation || null;
  };
  const resolveDisplayTime = value => {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return '';
      }
      if (trimmedValue === '刚刚' || trimmedValue === 'just now' || trimmedValue === 'Yesterday' || trimmedValue === '昨天' || trimmedValue.includes('分钟前') || trimmedValue.includes('小时前') || trimmedValue.includes('天前') || trimmedValue.includes('ago')) {
        return trimmedValue;
      }
      if (/^\d+$/.test(trimmedValue)) {
        const timestamp = Number(trimmedValue);
        return formatTime(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
      }
    }
    if (typeof value === 'number') {
      return formatTime(value > 1000000000000 ? value : value * 1000);
    }
    return formatTime(value);
  };
  const extractBusinessResponse = response => {
    if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data) && (response.data.code !== undefined || response.data.msg !== undefined || response.data.message !== undefined)) {
      return response.data;
    }
    return response;
  };
  const isSupplementPublishBlockedMessage = message => typeof message === 'string' && message.includes('不允许') && message.includes('问题补充');
  const getSupplementPublishBlockedReason = (question = questionData) => {
    if (supplementPublishBlockedMessage) {
      return supplementPublishBlockedMessage;
    }
    if (question?.isResolved || Number(question?.questionStatus ?? question?.status) === 2) {
      return '当前问题已解决，暂不支持补充问题';
    }
    return '';
  };
  const openSupplementComposer = () => {
    const blockedReason = getSupplementPublishBlockedReason();
    if (blockedReason) {
      showToast(blockedReason, 'warning');
      return;
    }
    setShowSupplementModal(true);
  };

  useEffect(() => {
    setSupplementPublishBlockedMessage('');
  }, [route?.params?.id]);

  useEffect(() => {
    if (!route?.params?.openSupplementModal) {
      return;
    }

    const blockedReason = getSupplementPublishBlockedReason();
    if (blockedReason) {
      showToast(blockedReason, 'warning');
    } else {
      setShowSupplementModal(true);
    }
    navigation.setParams({
      openSupplementModal: undefined
    });
  }, [navigation, route?.params?.openSupplementModal]);

  useEffect(() => {
    if (!route?.params?.openAnswerModal) {
      return;
    }

    setCurrentSupplement(null);
    setShowAnswerModal(true);
    navigation.setParams({
      openAnswerModal: undefined
    });
  }, [navigation, route?.params?.openAnswerModal]);

  // 获取问题详情数据
  useEffect(() => {
    let isCancelled = false;
    const fetchQuestionDetail = async () => {
      const questionId = route?.params?.id;
      try {
        fadeAnim.setValue(0);
        setLoading(true);
        setError(null);
        if (!questionId) {
          setQuestionData(null);
          setError('问题ID不存在');
          return;
        }
        console.log('📋 开始加载问题详情，ID:', questionId);

        const detailResponse = await questionApi.getQuestionDetail(questionId);
        if (isCancelled) {
          return;
        }

        if (!detailResponse || detailResponse.code !== 200 || !detailResponse.data) {
          console.error('❌ 问题详情获取失败:', detailResponse);
          setQuestionData(null);
          setError('获取问题详情失败');
          return;
        }

        const normalizedQuestionDetail = normalizeQuestionDetail(detailResponse.data);
        setQuestionData(normalizedQuestionDetail);
        setLiked(prev => ({
          ...prev,
          main: !!normalizedQuestionDetail.liked,
          dislike: !!normalizedQuestionDetail.disliked
        }));
        setBookmarked(!!normalizedQuestionDetail.collected);
        setLoading(false);

        setTimeout(() => {
          if (isCancelled) {
            return;
          }
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }).start();
        }, 0);

        void refreshCommunitySolveVoteSummary(questionId);
      } catch (error) {
        if (!isCancelled) {
          console.error('❌ 问题详情获取异常:', error);
          setQuestionData(null);
          setError('网络错误，请稍后重试');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchQuestionDetail();
    return () => {
      isCancelled = true;
    };
  }, [route?.params?.id, detailReloadVersion, refreshCommunitySolveVoteSummary]);

  // 补充列表静默刷新缓存
  const silentRefreshSupplementsCache = async (questionId, sortBy) => {
    try {
      console.log(`🔄 静默刷新补充缓存: sortBy=${sortBy}`);
      const {
        data
      } = await loadQuestionSupplements(questionId, sortBy, 1, true);
      const newSupplements = mergeInteractionCounts(normalizeSupplementCacheList(data || []), cacheData.list);
      syncSupplementInteractionStates(newSupplements);

      // 检查数据是否有变化
      const currentCache = supplementsCache[sortBy];
      const hasChanges = newSupplements.length !== currentCache.list.length || JSON.stringify(newSupplements.slice(0, Math.min(newSupplements.length, currentCache.list.length))) !== JSON.stringify(currentCache.list.slice(0, Math.min(newSupplements.length, currentCache.list.length)));
      if (hasChanges) {
        console.log(`📱 检测到补充数据变化，更新缓存: sortBy=${sortBy}`);

        // 更新缓存
        setSupplementsCache(prevCache => ({
          ...prevCache,
          [sortBy]: {
            list: newSupplements,
            total: newSupplements.length,
            pageNum: newSupplements.length < 10 ? 1 : 2,
            hasMore: newSupplements.length >= 10,
            loaded: true,
            lastUpdated: Date.now()
          }
        }));
        hydrateSupplementCommentCounts(newSupplements);

        // 可选：显示数据更新提示
        if (sortBy === supplementsSortBy) {
          showToast('补充列表已更新', 'info');
        }
      } else {
        console.log(`✅ 补充数据无变化: sortBy=${sortBy}`);

        // 更新时间戳，重置过期时间
        setSupplementsCache(prevCache => ({
          ...prevCache,
          [sortBy]: {
            ...prevCache[sortBy],
            lastUpdated: Date.now()
          }
        }));
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.log(`⚠️ 补充列表静默刷新已跳过: ${errorMessage || '未知错误'}`);
      touchSupplementCacheTimestamp(sortBy);
    }
  };

  // 补充列表自动刷新定时器
  useEffect(() => {
    const questionId = route?.params?.id;
    if (!questionId) return;
    const interval = setInterval(() => {
      // 检查当前排序的补充缓存是否过期
      const currentCache = supplementsCache[supplementsSortBy];
      if (currentCache.loaded && isCacheExpired(currentCache)) {
        console.log(`⏰ 补充缓存过期，自动刷新: sortBy=${supplementsSortBy}`);
        silentRefreshSupplementsCache(questionId, supplementsSortBy);
      }
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [supplementsSortBy, supplementsCache, route?.params?.id]);

  // 补充列表页面焦点检查
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const questionId = route?.params?.id;
      if (!questionId) return;

      // 检查所有已加载的补充缓存是否过期
      Object.keys(supplementsCache).forEach(sortBy => {
        const cacheData = supplementsCache[sortBy];
        if (cacheData.loaded && isCacheExpired(cacheData)) {
          console.log(`🎯 页面焦点检查，补充缓存过期: sortBy=${sortBy}`);
          silentRefreshSupplementsCache(questionId, sortBy);
        }
      });
    });
    return unsubscribe;
  }, [navigation, supplementsCache, route?.params?.id]);

  // 加载补充列表 - 优化缓存版本
  const loadSupplementsList = async (questionId, isRefresh = false, sortBy = supplementsSortBy) => {
    if (!questionId) return;

    // 检查缓存，如果已加载且不是刷新操作且未过期，则不重复请求
    const cacheData = supplementsCache[sortBy];
    if (!isRefresh && cacheData.loaded && cacheData.list.length > 0 && !isCacheExpired(cacheData)) {
      console.log(`📋 使用补充缓存数据: sortBy=${sortBy}, 数量=${cacheData.list.length}`);
      return;
    }
    try {
      if (isRefresh) {
        if (cacheData.list.length === 0) {
          setSupplementsLoading(true);
        }
        setSupplementsRefreshing(true);
      } else {
        setSupplementsLoadingMore(true);
      }
      const currentPage = isRefresh ? 1 : cacheData.pageNum;
      console.log(`📋 加载补充列表: questionId=${questionId}, page=${currentPage}, sortBy=${sortBy}`);
      const {
        data,
        fromCache
      } = await loadQuestionSupplements(questionId, sortBy, currentPage, isRefresh);
      const newSupplements = normalizeSupplementCacheList(data || []);
      const otherSortBy = sortBy === 'featured' ? 'newest' : 'featured';
      logSortPreview({
        scope: 'supplements',
        sortBy,
        total: newSupplements.length,
        items: newSupplements,
        source: isRefresh ? 'refresh-request' : 'load-more-request',
        cacheState: fromCache ? 'dataLoader-cache' : 'network',
        otherSortBy,
        otherItems: supplementsCache[otherSortBy]?.list || []
      });
      syncSupplementInteractionStates(newSupplements);

      // 更新对应排序方式的缓存
      setSupplementsCache(prevCache => {
        const updatedCache = {
          ...prevCache
        };
        const currentData = updatedCache[sortBy];
        if (isRefresh) {
          // 刷新时替换数据
          updatedCache[sortBy] = {
            list: newSupplements,
            total: newSupplements.length,
            pageNum: newSupplements.length < 10 ? currentPage : currentPage + 1,
            hasMore: newSupplements.length >= 10,
            loaded: true,
            lastUpdated: Date.now()
          };
        } else {
          // 加载更多时追加数据
          updatedCache[sortBy] = {
            list: [...currentData.list, ...newSupplements],
            total: currentData.list.length + newSupplements.length,
            pageNum: newSupplements.length < 10 ? currentPage : currentPage + 1,
            hasMore: newSupplements.length >= 10,
            loaded: true,
            lastUpdated: Date.now()
          };
        }
        return updatedCache;
      });
      hydrateSupplementCommentCounts(newSupplements);
    } catch (error) {
      console.error('❌ 加载补充列表失败:', error);
      if (isRefresh && cacheData.list.length === 0) {
        Alert.alert('加载失败', '获取补充列表失败，请稍后重试');
      }
    } finally {
      setSupplementsLoading(false);
      setSupplementsRefreshing(false);
      setSupplementsLoadingMore(false);
    }
  };

  // 补充列表下拉刷新 - 优化缓存版本
  const onSupplementsRefresh = () => {
    const questionId = route?.params?.id;
    if (questionId) {
      console.log(`🔄 刷新补充列表: sortBy=${supplementsSortBy}`);
      loadSupplementsList(questionId, true, supplementsSortBy);
    }
  };

  // 补充列表上拉加载更多 - 优化缓存版本
  const onSupplementsLoadMore = () => {
    const questionId = route?.params?.id;
    const currentData = supplementsCache[supplementsSortBy];
    if (questionId && currentData.hasMore && !supplementsLoadingMore) {
      console.log(`📋 加载更多补充: sortBy=${supplementsSortBy}, page=${currentData.pageNum}`);
      loadSupplementsList(questionId, false, supplementsSortBy);
    }
  };

  // 切换补充列表排序方式 - 优化缓存版本
  const handleSupplementsSortChange = newSortBy => {
    if (newSortBy !== supplementsSortBy) {
      console.log(`🔄 切换补充排序方式: ${supplementsSortBy} → ${newSortBy}`);
      setSupplementsSortBy(newSortBy);
      const questionId = route?.params?.id;
      if (questionId) {
        // 检查新排序方式是否已有缓存数据
        const newSortCache = supplementsCache[newSortBy];
        if (!newSortCache.loaded || newSortCache.list.length === 0) {
          // 没有缓存数据，需要加载
          console.log(`📋 ${newSortBy} 补充排序无缓存，开始加载...`);
          loadSupplementsList(questionId, true, newSortBy);
        } else {
          // 有缓存数据，直接使用
          console.log(`📋 ${newSortBy} 补充排序使用缓存，数量: ${newSortCache.list.length}`);
          logSortPreview({
            scope: 'supplements',
            sortBy: newSortBy,
            total: newSortCache.total ?? newSortCache.list.length,
            items: newSortCache.list,
            source: 'cache-switch',
            cacheState: 'screen-cache',
            otherSortBy: newSortBy === 'featured' ? 'newest' : 'featured',
            otherItems: supplementsCache[newSortBy === 'featured' ? 'newest' : 'featured']?.list || []
          });
        }
      }
    }
  };

  // 检查缓存是否过期
  const isCacheExpired = cacheData => {
    if (!cacheData.lastUpdated) return true;
    return Date.now() - cacheData.lastUpdated > CACHE_EXPIRE_TIME;
  };
  const getListPreviewIds = (items = [], scope = 'generic') => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    return items.slice(0, 5).map(item => {
      if (scope === 'answers') {
        return item?.id ?? item?.answerId ?? item?.answer_id ?? null;
      }
      if (scope === 'supplements') {
        return item?.id ?? item?.supplementId ?? item?.supplement_id ?? null;
      }
      return item?.id ?? null;
    }).filter(id => id !== null && id !== undefined);
  };
  const getListPreviewTimes = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    return items.slice(0, 5).map(item => item?.createTime ?? item?.createdAt ?? item?.publishTime ?? item?.gmtCreate ?? item?.time ?? 'unknown');
  };
  const logSortPreview = ({
    scope,
    sortBy,
    total,
    items = [],
    source = 'request',
    cacheState,
    otherSortBy,
    otherItems = []
  }) => {
    const previewIds = getListPreviewIds(items, scope);
    const previewTimes = getListPreviewTimes(items);
    console.log(`[SortDebug:${scope}] source=${source} sortBy=${sortBy} total=${total} cache=${cacheState || 'n/a'} firstIds=${previewIds.length ? previewIds.join(',') : 'empty'} firstTimes=${previewTimes.length ? previewTimes.join(' | ') : 'empty'}`);
    if (otherSortBy) {
      const otherPreviewIds = getListPreviewIds(otherItems, scope);
      if (otherPreviewIds.length > 0) {
        const otherPreviewTimes = getListPreviewTimes(otherItems);
        const sameFirstIds = JSON.stringify(previewIds) === JSON.stringify(otherPreviewIds);
        console.log(`[SortDebug:${scope}] compare ${sortBy} vs ${otherSortBy} sameFirstIds=${sameFirstIds} current=${previewIds.length ? previewIds.join(',') : 'empty'} other=${otherPreviewIds.join(',')} currentTimes=${previewTimes.length ? previewTimes.join(' | ') : 'empty'} otherTimes=${otherPreviewTimes.length ? otherPreviewTimes.join(' | ') : 'empty'}`);
      }
    }
  };
  const normalizeAnswerItem = answer => {
    if (!answer || typeof answer !== 'object') {
      return answer;
    }
    const hasLikeCountField = hasCountValue(answer.likeCount, answer.like_count, answer.likes);
    const hasDislikeCountField = hasCountValue(answer.dislikeCount, answer.dislike_count, answer.dislikes);
    const hasCollectCountField = hasCountValue(answer.collectCount, answer.bookmarkCount, answer.bookmark_count, answer.bookmarks);
    const primaryId = answer.answerId ?? answer.answer_id ?? answer.id ?? null;
    const normalizedQuestionId = answer.questionId ?? answer.question_id ?? answer.question?.id ?? null;
    const normalizedAuthorName = answer.userName ?? answer.userNickname ?? answer.authorNickName ?? answer.author ?? '匿名用户';
    const normalizedAuthorAvatar = answer.userAvatar ?? answer.authorAvatar ?? answer.avatar ?? null;
    const normalizedCollected = normalizeFlag(answer.collected, answer.isCollected, answer.bookmarked, answer.isBookmarked);
    const normalizedLiked = normalizeFlag(answer.liked, answer.isLiked);
    const normalizedDisliked = normalizeFlag(answer.disliked, answer.isDisliked);
    const normalizedAdopted = normalizeFlag(answer.adopted, answer.isAccepted, answer.isAdopted);
    const normalizedCollectCount = answer.collectCount ?? answer.bookmarkCount ?? answer.bookmark_count ?? answer.bookmarks ?? 0;
    const normalizedSuperLikeCount = answer.superLikeCount ?? answer.superLikes ?? 0;
    const normalizedCreateTime = resolveEntityTimestamp(answer);
    const normalizedTime = resolveDisplayTime(answer.time ?? normalizedCreateTime);
    const normalizedIpLocation = resolveIpLocation(answer);
    return {
      ...answer,
      id: primaryId,
      answerId: primaryId,
      answer_id: answer.answer_id ?? primaryId,
      questionId: normalizedQuestionId,
      question_id: answer.question_id ?? normalizedQuestionId,
      userName: normalizedAuthorName,
      userNickname: answer.userNickname ?? answer.authorNickName ?? normalizedAuthorName,
      author: answer.author ?? answer.authorNickName ?? normalizedAuthorName,
      userAvatar: normalizedAuthorAvatar,
      authorAvatar: normalizedAuthorAvatar,
      avatar: normalizedAuthorAvatar,
      adopted: normalizedAdopted,
      isAccepted: answer.isAccepted ?? (normalizedAdopted ? 1 : 0),
      liked: normalizedLiked,
      disliked: normalizedDisliked,
      collected: normalizedCollected,
      isCollected: normalizedCollected,
      bookmarked: normalizedCollected,
      isBookmarked: normalizedCollected,
      likeCount: answer.likeCount ?? answer.likes ?? 0,
      dislikeCount: answer.dislikeCount ?? answer.dislikes ?? 0,
      commentCount: answer.commentCount ?? answer.comments ?? 0,
      shareCount: answer.shareCount ?? answer.shares ?? 0,
      collectCount: normalizedCollectCount,
      bookmarkCount: normalizedCollectCount,
      bookmark_count: normalizedCollectCount,
      bookmarks: normalizedCollectCount,
      superLikeCount: normalizedSuperLikeCount,
      superLikes: normalizedSuperLikeCount,
      createTime: normalizedCreateTime,
      createdAt: answer.createdAt ?? normalizedCreateTime,
      ipLocation: normalizedIpLocation,
      ip_location: normalizedIpLocation,
      time: normalizedTime,
      __likeCountResolved: answer.__likeCountResolved ?? hasLikeCountField,
      __dislikeCountResolved: answer.__dislikeCountResolved ?? hasDislikeCountField,
      __collectCountResolved: answer.__collectCountResolved ?? hasCollectCountField,
      canAdopt: normalizeFlag(answer.canAdopt),
      canEdit: normalizeFlag(answer.canEdit)
    };
  };
  const normalizeAnswers = (rows = []) => rows.map(normalizeAnswerItem);
  const extractAnswerRows = response => response?.data?.rows ?? response?.data?.list ?? response?.data?.records ?? [];
  const extractAnswerTotal = (response, fallback = 0) => response?.data?.total ?? response?.data?.count ?? response?.data?.recordsTotal ?? fallback;
  const shouldFallbackToNewestAnswers = (sortBy, items = [], total = 0) => sortBy === 'featured' && Array.isArray(items) && items.length === 0 && Number(total) > 0;
  const buildAnswerFromMutationResponse = (currentAnswer, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : null;
    return normalizeAnswerItem({
      ...currentAnswer,
      ...(payload || {}),
      id: payload?.id ?? payload?.answerId ?? payload?.answer_id ?? currentAnswer?.id,
      answerId: payload?.answerId ?? payload?.answer_id ?? payload?.id ?? currentAnswer?.answerId ?? currentAnswer?.id,
      answer_id: payload?.answer_id ?? payload?.answerId ?? payload?.id ?? currentAnswer?.answer_id ?? currentAnswer?.id,
      liked: payload?.liked ?? payload?.isLiked ?? fallbackValues.liked ?? currentAnswer?.liked,
      disliked: payload?.disliked ?? payload?.isDisliked ?? fallbackValues.disliked ?? currentAnswer?.disliked,
      collected: payload?.collected ?? payload?.isCollected ?? payload?.bookmarked ?? payload?.isBookmarked ?? fallbackValues.collected ?? currentAnswer?.collected,
      likeCount: payload?.likeCount ?? payload?.likes ?? fallbackValues.likeCount ?? currentAnswer?.likeCount ?? currentAnswer?.likes,
      dislikeCount: payload?.dislikeCount ?? payload?.dislikes ?? fallbackValues.dislikeCount ?? currentAnswer?.dislikeCount ?? currentAnswer?.dislikes,
      collectCount: payload?.collectCount ?? payload?.bookmarkCount ?? payload?.bookmarks ?? fallbackValues.collectCount ?? currentAnswer?.collectCount ?? currentAnswer?.bookmarkCount ?? currentAnswer?.bookmarks,
      commentCount: payload?.commentCount ?? payload?.comments ?? fallbackValues.commentCount ?? currentAnswer?.commentCount ?? currentAnswer?.comments,
      shareCount: payload?.shareCount ?? payload?.shares ?? fallbackValues.shareCount ?? currentAnswer?.shareCount ?? currentAnswer?.shares,
      __likeCountResolved: fallbackValues.likeCount !== undefined ? true : currentAnswer?.__likeCountResolved,
      __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentAnswer?.__dislikeCountResolved,
      __collectCountResolved: fallbackValues.collectCount !== undefined ? true : currentAnswer?.__collectCountResolved
    });
  };
  const mergeUpdatedAnswerIntoCaches = updatedAnswer => {
    if (!updatedAnswer) {
      return;
    }
    const normalizedAnswer = normalizeAnswerItem(updatedAnswer);
    const targetId = normalizedAnswer.id ?? normalizedAnswer.answerId ?? normalizedAnswer.answer_id;
    if (targetId === null || targetId === undefined) {
      return;
    }
    setAnswersCache(prevCache => {
      let hasChanges = false;
      const nextCache = {
        ...prevCache
      };
      Object.keys(prevCache).forEach(sortBy => {
        const cacheData = prevCache[sortBy];
        if (!cacheData?.list?.length) {
          return;
        }
        let updated = false;
        const nextList = cacheData.list.map(item => {
          const candidateIds = [item?.id, item?.answerId, item?.answer_id].filter(value => value !== null && value !== undefined).map(value => String(value));
          if (!candidateIds.includes(String(targetId))) {
            return item;
          }
          updated = true;
          return normalizeAnswerItem({
            ...item,
            ...normalizedAnswer
          });
        });
        if (updated) {
          hasChanges = true;
          nextCache[sortBy] = {
            ...cacheData,
            list: nextList,
            lastUpdated: Date.now()
          };
        }
      });
      return hasChanges ? nextCache : prevCache;
    });
    syncAnswerInteractionStates([normalizedAnswer]);
  };
  const mergeUpdatedSupplementIntoCaches = updatedSupplement => {
    if (!updatedSupplement) {
      return;
    }
    const normalizedSupplement = normalizeSupplementCacheItem(updatedSupplement);
    const targetId = normalizedSupplement.id ?? normalizedSupplement.supplementId ?? normalizedSupplement.supplement_id;
    if (targetId === null || targetId === undefined) {
      return;
    }
    updateSupplementInCaches(targetId, previousItem => ({
      ...previousItem,
      liked: !!normalizedSupplement.liked,
      isLiked: !!normalizedSupplement.liked,
      disliked: !!normalizedSupplement.disliked,
      isDisliked: !!normalizedSupplement.disliked,
      collected: !!normalizedSupplement.collected,
      isCollected: !!normalizedSupplement.collected,
      bookmarked: !!normalizedSupplement.collected,
      isBookmarked: !!normalizedSupplement.collected,
      likeCount: normalizedSupplement.likeCount ?? normalizedSupplement.likes ?? previousItem?.likeCount ?? previousItem?.likes ?? 0,
      likes: normalizedSupplement.likeCount ?? normalizedSupplement.likes ?? previousItem?.likeCount ?? previousItem?.likes ?? 0,
      dislikeCount: normalizedSupplement.dislikeCount ?? normalizedSupplement.dislikes ?? previousItem?.dislikeCount ?? previousItem?.dislikes ?? 0,
      dislikes: normalizedSupplement.dislikeCount ?? normalizedSupplement.dislikes ?? previousItem?.dislikeCount ?? previousItem?.dislikes ?? 0,
      collectCount: normalizedSupplement.collectCount ?? normalizedSupplement.bookmarkCount ?? normalizedSupplement.bookmarks ?? previousItem?.collectCount ?? previousItem?.bookmarkCount ?? previousItem?.bookmarks ?? 0,
      bookmarkCount: normalizedSupplement.collectCount ?? normalizedSupplement.bookmarkCount ?? normalizedSupplement.bookmarks ?? previousItem?.collectCount ?? previousItem?.bookmarkCount ?? previousItem?.bookmarks ?? 0,
      bookmarks: normalizedSupplement.collectCount ?? normalizedSupplement.bookmarkCount ?? normalizedSupplement.bookmarks ?? previousItem?.collectCount ?? previousItem?.bookmarkCount ?? previousItem?.bookmarks ?? 0,
      __likeCountResolved: normalizedSupplement.__likeCountResolved ?? previousItem?.__likeCountResolved,
      __dislikeCountResolved: normalizedSupplement.__dislikeCountResolved ?? previousItem?.__dislikeCountResolved,
      __collectCountResolved: normalizedSupplement.__collectCountResolved ?? previousItem?.__collectCountResolved
    }));
    syncSupplementInteractionStates([normalizedSupplement]);
  };
  const syncAnswerInteractionStates = (answers = []) => {
    if (!answers.length) {
      return;
    }
    const likedState = {};
    const dislikedState = {};
    const collectedState = {};
    answers.forEach(answer => {
      if (!answer?.id) {
        return;
      }
      likedState[answer.id] = !!answer.liked;
      dislikedState[answer.id] = !!answer.disliked;
      collectedState[answer.id] = !!answer.collected;
    });
    setAnswerLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setAnswerDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
    setAnswerBookmarked(prev => ({
      ...prev,
      ...collectedState
    }));
  };
  useEffect(() => {
    const updatedAnswer = route?.params?.updatedAnswer;
    if (!updatedAnswer?.id) {
      return;
    }
    mergeUpdatedAnswerIntoCaches(updatedAnswer);
    navigation.setParams({
      updatedAnswer: undefined
    });
  }, [route?.params?.updatedAnswer]);
  useEffect(() => {
    const updatedSupplement = route?.params?.updatedSupplement;
    if (!updatedSupplement?.id) {
      return;
    }
    mergeUpdatedSupplementIntoCaches(updatedSupplement);
    navigation.setParams({
      updatedSupplement: undefined
    });
  }, [route?.params?.updatedSupplement]);
  useEffect(() => {
    const addedRewardResult = route?.params?.addedRewardResult;
    if (!addedRewardResult) {
      return;
    }

    const totalReward = Number(addedRewardResult.totalReward);
    const nextRewardContributors = Number(addedRewardResult.rewardContributors);

    if (Number.isFinite(totalReward) && totalReward >= 0) {
      const normalizedTotalReward = Math.round(totalReward * 100) / 100;
      setQuestionData(prevQuestion => {
        if (!prevQuestion) {
          return prevQuestion;
        }

        return {
          ...prevQuestion,
          bountyAmount: Math.round(normalizedTotalReward * 100),
          reward: normalizedTotalReward,
        };
      });
    }

    if (Number.isFinite(nextRewardContributors) && nextRewardContributors >= 0) {
      setRewardContributors(nextRewardContributors);
    }

    navigation.setParams({
      addedRewardResult: undefined
    });
  }, [navigation, route?.params?.addedRewardResult]);
  const resolveCommentUserId = comment => normalizeEntityId(comment?.userId ?? comment?.user_id ?? comment?.authorId ?? comment?.author_id ?? comment?.createBy ?? comment?.create_by ?? comment?.creatorId ?? comment?.creator_id ?? comment?.uid ?? comment?.user?.id);
  const openPublicProfile = (target, options = {}) => navigateToPublicProfile(navigation, target, options);
  const normalizeCommentItem = (comment, defaults = {}) => {
    if (!comment || typeof comment !== 'object') {
      return comment;
    }
    const hasLikeCountField = hasCountValue(comment.likeCount, comment.likes);
    const hasDislikeCountField = hasCountValue(comment.dislikeCount, comment.dislikes);
    const hasCollectCountField = hasCountValue(comment.collectCount, comment.bookmarkCount, comment.bookmarks);
    const normalizedId = comment.commentId ?? comment.comment_id ?? comment.id ?? null;
    const normalizedAuthor = comment.userName ?? comment.userNickname ?? comment.authorNickName ?? comment.author ?? '匿名用户';
    const normalizedAvatar = comment.userAvatar ?? comment.authorAvatar ?? comment.avatar ?? null;
    const normalizedContent = comment.content ?? comment.commentContent ?? comment.contentText ?? comment.commentText ?? comment.text ?? '';
    const normalizedReplyToUserName = comment.replyToUserName ?? comment.replyUserName ?? comment.toUserName ?? comment.parentUserName ?? comment.replyNickName ?? '';
    const normalizedReplyToCommentId = comment.replyToCommentId ?? comment.replyCommentId ?? comment.toCommentId ?? comment.parentCommentId ?? comment.parentId ?? 0;
    const normalizedLikeCount = comment.likeCount ?? comment.likes ?? 0;
    const normalizedDislikeCount = comment.dislikeCount ?? comment.dislikes ?? 0;
    const normalizedReplyCount = comment.replyCount ?? comment.replies ?? comment.childCount ?? comment.childrenCount ?? 0;
    const normalizedShareCount = comment.shareCount ?? comment.shares ?? 0;
    const normalizedCollectCount = comment.collectCount ?? comment.bookmarkCount ?? comment.bookmarks ?? 0;
    const normalizedSuperLikeCount = comment.superLikeCount ?? comment.superLikes ?? 0;
    const normalizedCreateTime = comment.createTime ?? comment.createdAt ?? comment.gmtCreate ?? comment.publishTime ?? null;
    const normalizedTime = comment.time ?? formatTime(normalizedCreateTime);
    const normalizedIpLocation = resolveIpLocation(comment);
    const normalizedTargetType = Number(comment.targetType ?? comment.target_type ?? defaults.targetType ?? 0) || 0;
    const normalizedTargetId = Number(comment.targetId ?? comment.target_id ?? defaults.targetId ?? 0) || 0;
    const normalizedParentId = Number(comment.parentId ?? comment.parent_id ?? defaults.parentId ?? 0) || 0;
    const normalizedUserId = resolveCommentUserId(comment);
    const normalizedReplyToUserId = normalizeEntityId(comment.replyToUserId ?? comment.reply_user_id ?? comment.toUserId ?? comment.parentUserId ?? comment.replyUserId ?? comment.to_user_id);
    return {
      ...comment,
      id: normalizedId,
      commentId: normalizedId,
      comment_id: comment.comment_id ?? normalizedId,
      targetType: normalizedTargetType,
      targetId: normalizedTargetId,
      parentId: normalizedParentId,
      author: normalizedAuthor,
      userName: normalizedAuthor,
      userNickname: comment.userNickname ?? comment.authorNickName ?? normalizedAuthor,
      userId: normalizedUserId,
      user_id: comment.user_id ?? normalizedUserId,
      avatar: normalizedAvatar,
      userAvatar: normalizedAvatar,
      content: normalizedContent,
      commentContent: comment.commentContent ?? normalizedContent,
      replyToUserName: normalizedReplyToUserName,
      replyToUserId: normalizedReplyToUserId,
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
      superLikeCount: normalizedSuperLikeCount,
      superLikes: normalizedSuperLikeCount,
      liked: !!(comment.liked ?? comment.isLiked),
      disliked: !!(comment.disliked ?? comment.isDisliked),
      collected: !!(comment.collected ?? comment.isCollected),
      createTime: normalizedCreateTime,
      createdAt: comment.createdAt ?? normalizedCreateTime,
      ipLocation: normalizedIpLocation,
      ip_location: normalizedIpLocation,
      __likeCountResolved: comment.__likeCountResolved ?? hasLikeCountField,
      __dislikeCountResolved: comment.__dislikeCountResolved ?? hasDislikeCountField,
      __collectCountResolved: comment.__collectCountResolved ?? hasCollectCountField,
      time: normalizedTime
    };
  };
  const normalizeComments = (rows = [], defaults = {}) => rows.map(row => normalizeCommentItem(row, defaults));
  const extractCommentRows = response => response?.data?.rows || response?.data?.list || response?.data?.records || [];
  const extractCommentTotal = (response, fallback = 0) => response?.data?.total ?? response?.data?.count ?? response?.data?.recordsTotal ?? fallback;
  const shouldFallbackToNewestComments = (sortBy, items = [], total = 0) => sortBy === 'likes' && Array.isArray(items) && items.length === 0 && Number(total) > 0;
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
  const inheritInteractionCounts = (item, previousItem) => {
    if (!item || !previousItem) {
      return item;
    }
    const nextItem = {
      ...item
    };
    if (!item.__likeCountResolved && previousItem.__likeCountResolved) {
      const previousLikeCount = Number(previousItem.likeCount ?? previousItem.like_count ?? previousItem.likes);
      if (!Number.isNaN(previousLikeCount)) {
        nextItem.likeCount = previousLikeCount;
        nextItem.likes = previousLikeCount;
        nextItem.__likeCountResolved = true;
      }
    }
    if (!item.__dislikeCountResolved && previousItem.__dislikeCountResolved) {
      const previousDislikeCount = Number(previousItem.dislikeCount ?? previousItem.dislike_count ?? previousItem.dislikes);
      if (!Number.isNaN(previousDislikeCount)) {
        nextItem.dislikeCount = previousDislikeCount;
        nextItem.dislikes = previousDislikeCount;
        nextItem.__dislikeCountResolved = true;
      }
    }
    if (!item.__collectCountResolved && previousItem.__collectCountResolved) {
      const previousCollectCount = Number(previousItem.collectCount ?? previousItem.bookmarkCount ?? previousItem.bookmark_count ?? previousItem.bookmarks);
      if (!Number.isNaN(previousCollectCount)) {
        nextItem.collectCount = previousCollectCount;
        nextItem.bookmarkCount = previousCollectCount;
        nextItem.bookmarks = previousCollectCount;
        nextItem.__collectCountResolved = true;
      }
    }
    return nextItem;
  };
  const mergeInteractionCounts = (items = [], previousItems = []) => {
    if (!items.length || !previousItems.length) {
      return items;
    }
    const previousMap = new Map(previousItems.filter(Boolean).map(previousItem => [String(previousItem.id), previousItem]));
    return items.map(item => inheritInteractionCounts(item, previousMap.get(String(item?.id))));
  };
  const syncCommentInteractionStates = (comments = []) => {
    if (!comments.length) {
      return;
    }
    const likedState = {};
    const collectedState = {};
    const dislikedState = {};
    comments.forEach(comment => {
      if (!comment?.id) {
        return;
      }
      likedState[comment.id] = !!comment.liked;
      collectedState[comment.id] = !!comment.collected;
      dislikedState[comment.id] = !!comment.disliked;
    });
    setCommentLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setCommentCollected(prev => ({
      ...prev,
      ...collectedState
    }));
    setCommentDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
  };
  const updateCommentInCaches = (commentId, updater) => {
    setCommentsCache(prevCache => {
      const nextCache = {
        ...prevCache
      };
      Object.keys(nextCache).forEach(sortKey => {
        const currentEntry = nextCache[sortKey];
        if (!currentEntry?.list?.length) {
          return;
        }
        nextCache[sortKey] = {
          ...currentEntry,
          list: currentEntry.list.map(comment => String(comment.id) === String(commentId) ? normalizeCommentItem(updater(comment)) : comment)
        };
      });
      return nextCache;
    });
    setQuestionCommentRepliesMap(prevMap => {
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
          return normalizeCommentItem(updater(comment));
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
  const updateSupplementCommentStates = (commentId, updater) => {
    if (!commentId) {
      return;
    }
    setSuppCommentListState(prevState => {
      if (!prevState.list?.length) {
        return prevState;
      }
      let changed = false;
      const nextList = prevState.list.map(comment => {
        if (String(comment.id) !== String(commentId)) {
          return comment;
        }
        changed = true;
        return normalizeCommentItem(updater(comment));
      });
      return changed ? {
        ...prevState,
        list: nextList
      } : prevState;
    });
    setSuppCommentRepliesMap(prevMap => {
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
          return normalizeCommentItem(updater(comment));
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
        return normalizeCommentItem(updater(comment));
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
          return normalizeCommentItem(updater(comment));
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
  const findAnswerCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return answerCommentsList.find(comment => String(comment.id) === String(commentId)) || Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId)) || null;
  };
  const findQuestionCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return commentsList.find(comment => String(comment.id) === String(commentId)) || Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId)) || commentsData.find(comment => String(comment.id) === String(commentId)) || null;
  };
  const findSupplementCommentById = commentId => {
    if (!commentId) {
      return null;
    }
    return suppCommentsList.find(comment => String(comment.id) === String(commentId)) || Object.values(suppCommentRepliesMap).flatMap(entry => entry?.list || []).find(comment => String(comment.id) === String(commentId)) || null;
  };
  const buildCommentFromMutationResponse = (currentComment, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : null;
    return normalizeCommentItem({
      ...currentComment,
      ...(payload || {}),
      id: payload?.id ?? payload?.commentId ?? payload?.comment_id ?? currentComment.id,
      liked: payload?.liked ?? payload?.isLiked ?? fallbackValues.liked ?? currentComment.liked,
      disliked: payload?.disliked ?? payload?.isDisliked ?? fallbackValues.disliked ?? currentComment.disliked,
      collected: payload?.collected ?? payload?.isCollected ?? fallbackValues.collected ?? currentComment.collected,
      likeCount: fallbackValues.likeCount ?? payload?.likeCount ?? payload?.likes ?? currentComment.likeCount ?? currentComment.likes,
      dislikeCount: fallbackValues.dislikeCount ?? payload?.dislikeCount ?? payload?.dislikes ?? currentComment.dislikeCount ?? currentComment.dislikes,
      collectCount: fallbackValues.collectCount ?? payload?.collectCount ?? payload?.bookmarkCount ?? payload?.bookmarks ?? currentComment.collectCount,
      replyCount: payload?.replyCount ?? payload?.replies ?? payload?.childCount ?? payload?.childrenCount ?? fallbackValues.replyCount ?? currentComment.replyCount,
      shareCount: payload?.shareCount ?? payload?.shares ?? fallbackValues.shareCount ?? currentComment.shareCount,
      __likeCountResolved: fallbackValues.likeCount !== undefined ? true : currentComment.__likeCountResolved,
      __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentComment.__dislikeCountResolved,
      __collectCountResolved: fallbackValues.collectCount !== undefined ? true : currentComment.__collectCountResolved
    });
  };
  const getInteractionDisplayCount = (baseCount, serverState, localState) => {
    const normalizedBaseCount = Number(baseCount) || 0;
    if (localState === undefined) {
      return normalizedBaseCount;
    }
    if (!!localState === !!serverState) {
      return normalizedBaseCount;
    }
    return Math.max(normalizedBaseCount + (localState ? 1 : -1), 0);
  };
  const normalizeSupplementCacheItem = supplement => {
    if (!supplement || typeof supplement !== 'object') {
      return supplement;
    }
    const hasLikeCountField = hasCountValue(supplement.likeCount, supplement.likes);
    const hasDislikeCountField = hasCountValue(supplement.dislikeCount, supplement.dislikes);
    const hasCollectCountField = hasCountValue(supplement.collectCount, supplement.bookmarkCount, supplement.bookmarks);
    const normalizedCommentCount = Number(
      supplement.commentCount ??
      supplement.comments ??
      supplement.comment_count
    ) || 0;
    const normalizedCreateTime = resolveEntityTimestamp(supplement);
    const normalizedTime = resolveDisplayTime(supplement.time ?? normalizedCreateTime);
    const normalizedIpLocation = resolveIpLocation(supplement);
    return {
      ...supplement,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount,
      createTime: normalizedCreateTime,
      createdAt: supplement.createdAt ?? normalizedCreateTime,
      ipLocation: normalizedIpLocation,
      ip_location: normalizedIpLocation,
      time: normalizedTime,
      __likeCountResolved: supplement.__likeCountResolved ?? hasLikeCountField,
      __dislikeCountResolved: supplement.__dislikeCountResolved ?? hasDislikeCountField,
      __collectCountResolved: supplement.__collectCountResolved ?? hasCollectCountField
    };
  };
  const normalizeSupplementCacheList = (supplements = []) => supplements.map(normalizeSupplementCacheItem);
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
  const getCommentLikeDisplayCount = (comment, localState) => formatNumber(getResolvedInteractionDisplayCount(comment?.likeCount ?? comment?.likes, comment?.liked, localState, comment?.__likeCountResolved));
  const getCommentCollectDisplayCount = (comment, localState) => formatNumber(getResolvedInteractionDisplayCount(comment?.collectCount ?? comment?.bookmarkCount ?? comment?.bookmarks, comment?.collected, localState, comment?.__collectCountResolved));
  const getCommentDislikeDisplayCount = (comment, localState) => formatNumber(getResolvedInteractionDisplayCount(comment?.dislikeCount ?? comment?.dislikes, comment?.disliked, localState, comment?.__dislikeCountResolved));
  const getQuestionLikeDisplayCount = (question, localState) => formatNumber(getResolvedInteractionDisplayCount(question?.likeCount ?? question?.likes, question?.liked, localState, question?.__likeCountResolved));
  const getQuestionCollectDisplayCount = (question, localState) => formatNumber(getResolvedInteractionDisplayCount(question?.collectCount ?? question?.bookmarkCount ?? question?.bookmarks, question?.collected, localState, question?.__collectCountResolved));
  const getQuestionDislikeDisplayCount = (question, localState) => formatNumber(getResolvedInteractionDisplayCount(question?.dislikeCount ?? question?.dislikes, question?.disliked, localState, question?.__dislikeCountResolved));
  const getAnswerLikeDisplayCount = (answer, localState) => formatNumber(getResolvedInteractionDisplayCount(answer?.likeCount ?? answer?.like_count ?? answer?.likes, answer?.liked, localState, answer?.__likeCountResolved));
  const getAnswerCollectDisplayCount = (answer, localState) => formatNumber(getResolvedInteractionDisplayCount(answer?.collectCount ?? answer?.bookmarkCount ?? answer?.bookmark_count ?? answer?.bookmarks, answer?.collected, localState, answer?.__collectCountResolved));
  const getAnswerDislikeDisplayCount = (answer, localState) => formatNumber(getResolvedInteractionDisplayCount(answer?.dislikeCount ?? answer?.dislike_count ?? answer?.dislikes, answer?.disliked, localState, answer?.__dislikeCountResolved));
  const getSupplementLikeDisplayCount = (supplement, localState) => formatNumber(getResolvedInteractionDisplayCount(supplement?.likeCount ?? supplement?.likes, supplement?.liked, localState, supplement?.__likeCountResolved));
  const getSupplementCollectDisplayCount = (supplement, localState) => formatNumber(getResolvedInteractionDisplayCount(supplement?.collectCount ?? supplement?.bookmarkCount ?? supplement?.bookmarks, supplement?.collected, localState, supplement?.__collectCountResolved));
  const getSupplementDislikeDisplayCount = (supplement, localState) => formatNumber(getResolvedInteractionDisplayCount(supplement?.dislikeCount ?? supplement?.dislikes, supplement?.disliked, localState, supplement?.__dislikeCountResolved));
  const syncSupplementInteractionStates = (supplements = []) => {
    if (!supplements.length) {
      return;
    }
    const likedState = {};
    const dislikedState = {};
    const collectedState = {};
    supplements.forEach(supplement => {
      if (!supplement?.id) {
        return;
      }
      likedState[supplement.id] = !!(supplement.liked ?? supplement.isLiked);
      dislikedState[supplement.id] = !!(supplement.disliked ?? supplement.isDisliked);
      collectedState[supplement.id] = !!(supplement.collected ?? supplement.isCollected ?? supplement.bookmarked ?? supplement.isBookmarked);
    });
    setSuppLiked(prev => ({
      ...prev,
      ...likedState
    }));
    setSuppDisliked(prev => ({
      ...prev,
      ...dislikedState
    }));
    setSuppBookmarked(prev => ({
      ...prev,
      ...collectedState
    }));
  };
  const updateSupplementInCaches = (supplementId, updater) => {
    setSupplementsCache(prevCache => {
      const nextCache = {
        ...prevCache
      };
      Object.keys(nextCache).forEach(sortKey => {
        const currentEntry = nextCache[sortKey];
        if (!currentEntry?.list?.length) {
          return;
        }
        let changed = false;
        const nextList = currentEntry.list.map(item => {
          if (String(item?.id) !== String(supplementId)) {
            return item;
          }
          changed = true;
          return normalizeSupplementCacheItem(updater(item));
        });
        if (changed) {
          nextCache[sortKey] = {
            ...currentEntry,
            list: nextList
          };
        }
      });
      return nextCache;
    });
  };
  const getSupplementById = supplementId => {
    if (!supplementId) {
      return null;
    }
    return supplementsCache[supplementsSortBy]?.list?.find(item => String(item?.id) === String(supplementId)) || Object.values(supplementsCache).flatMap(entry => entry?.list || []).find(item => String(item?.id) === String(supplementId)) || null;
  };
  const isLikeInteractionDisabled = (likedState, dislikedState) => !likedState && !!dislikedState;
  const isDislikeInteractionDisabled = (likedState, dislikedState) => !dislikedState && !!likedState;
  const getQuestionLikedState = () => liked.main ?? questionData?.liked ?? false;
  const getQuestionDislikedState = () => liked.dislike ?? questionData?.disliked ?? false;
  const getAnswerLikedState = (answerId, answer = null) => answerLiked[answerId] !== undefined ? answerLiked[answerId] : !!(answer ?? findAnswerByAnyId(answerId))?.liked;
  const getAnswerDislikedState = (answerId, answer = null) => answerDisliked[answerId] !== undefined ? answerDisliked[answerId] : !!(answer ?? findAnswerByAnyId(answerId))?.disliked;
  const getSupplementLikedState = (supplementId, supplement = null) => suppLiked[supplementId] !== undefined ? suppLiked[supplementId] : !!(supplement ?? getSupplementById(supplementId))?.liked;
  const getSupplementDislikedState = (supplementId, supplement = null) => suppDisliked[supplementId] !== undefined ? suppDisliked[supplementId] : !!(supplement ?? getSupplementById(supplementId))?.disliked;
  const getCommentLikedState = comment => commentLiked[comment?.id] !== undefined ? commentLiked[comment.id] : !!comment?.liked;
  const getCommentDislikedState = comment => commentDisliked[comment?.id] !== undefined ? commentDisliked[comment.id] : !!comment?.disliked;
  const buildSupplementNavigationItem = supplement => {
    if (!supplement || typeof supplement !== 'object') {
      return supplement;
    }
    const likedState = suppLiked[supplement.id] ?? supplement.liked ?? supplement.isLiked ?? false;
    const dislikedState = suppDisliked[supplement.id] ?? supplement.disliked ?? supplement.isDisliked ?? false;
    const collectedState = suppBookmarked[supplement.id] ?? supplement.collected ?? supplement.isCollected ?? supplement.bookmarked ?? supplement.isBookmarked ?? false;
    const likeCount = getSupplementLikeDisplayCount(supplement, suppLiked[supplement.id]);
    const dislikeCount = getSupplementDislikeDisplayCount(supplement, suppDisliked[supplement.id]);
    const collectCount = getSupplementCollectDisplayCount(supplement, suppBookmarked[supplement.id]);
    const commentCount = Number(supplement.commentCount ?? supplement.comments ?? supplement.comment_count ?? 0);
    const shareCount = Number(supplement.shareCount ?? supplement.shares ?? 0);
    const viewCount = Number(supplement.viewCount ?? supplement.views ?? 0);

    return {
      ...supplement,
      liked: !!likedState,
      isLiked: !!likedState,
      disliked: !!dislikedState,
      isDisliked: !!dislikedState,
      collected: !!collectedState,
      isCollected: !!collectedState,
      bookmarked: !!collectedState,
      isBookmarked: !!collectedState,
      likeCount,
      likes: likeCount,
      dislikeCount,
      dislikes: dislikeCount,
      collectCount,
      bookmarkCount: collectCount,
      bookmarks: collectCount,
      commentCount,
      comments: commentCount,
      shareCount,
      shares: shareCount,
      viewCount,
      views: viewCount,
      __likeCountResolved: true,
      __dislikeCountResolved: true,
      __collectCountResolved: true
    };
  };
  const getSupplementTargetId = supplement => {
    if (!supplement || typeof supplement !== 'object') {
      return null;
    }
    return Number(supplement.supplementId ?? supplement.supplement_id ?? supplement.id ?? 0) || null;
  };
  const syncSupplementCommentCount = (supplementId, commentCount) => {
    if (!supplementId) {
      return;
    }
    const normalizedCommentCount = Math.max(Number(commentCount) || 0, 0);
    updateSupplementInCaches(supplementId, previousItem => ({
      ...previousItem,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount
    }));
  };
  const syncAnswerCommentCount = (answerId, commentCount) => {
    if (!answerId) {
      return;
    }
    const normalizedCommentCount = Math.max(Number(commentCount) || 0, 0);
    mergeUpdatedAnswerIntoCaches({
      id: Number(answerId) || answerId,
      answerId: Number(answerId) || answerId,
      commentCount: normalizedCommentCount,
      comments: normalizedCommentCount
    });
  };
  const buildCommentReplyTarget = (comment, fallbackTarget = {}) => {
    if (!comment || typeof comment !== 'object') {
      return {
        targetType: fallbackTarget.targetType ?? 1,
        targetId: fallbackTarget.targetId ?? null,
        parentId: fallbackTarget.parentId ?? 0,
        replyToCommentId: 0,
        replyToUserId: null,
        replyToUserName: '',
        originalComment: null
      };
    }
    const resolvedTargetType = Number(fallbackTarget.targetType ?? comment.targetType ?? comment.target_type ?? 1) || 1;
    const resolvedTargetId = Number(fallbackTarget.targetId ?? comment.targetId ?? comment.target_id ?? null) || null;
    const resolvedCommentId = Number(comment.id ?? comment.commentId ?? comment.comment_id ?? 0) || 0;
    const replyToUserName = comment.userName ?? comment.userNickname ?? comment.authorNickName ?? comment.author ?? '';
    return {
      targetType: resolvedTargetType,
      targetId: resolvedTargetId,
      parentId: resolvedCommentId,
      replyToCommentId: resolvedCommentId,
      replyToUserId: resolveCommentUserId(comment),
      replyToUserName,
      originalComment: normalizeCommentItem(comment, {
        targetType: resolvedTargetType,
        targetId: resolvedTargetId,
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
  const getQuestionCommentThreadRootId = commentId => {
    if (!commentId) {
      return null;
    }

    let currentComment = findQuestionCommentById(commentId);
    let safetyCount = 0;

    while (currentComment && Number(currentComment.parentId ?? 0) > 0 && safetyCount < 50) {
      const parentComment = findQuestionCommentById(currentComment.parentId);
      if (!parentComment || String(parentComment.id) === String(currentComment.id)) {
        break;
      }
      currentComment = parentComment;
      safetyCount += 1;
    }

    return currentComment?.id ?? commentId;
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
  const renderAnswerReplyCard = (reply, options = {}) => {
    const beforeOpenReply = typeof options.beforeOpenReply === 'function' ? options.beforeOpenReply : () => {};
    const beforeReport = typeof options.beforeReport === 'function' ? options.beforeReport : () => {};
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findAnswerCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    const isReplyLiked = getCommentLikedState(reply);
    const isReplyDisliked = getCommentDislikedState(reply);
    const isReplyLikeDisabled = isLikeInteractionDisabled(isReplyLiked, isReplyDisliked);
    const isReplyDislikeDisabled = isDislikeInteractionDisabled(isReplyLiked, isReplyDisliked);
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
          <View style={{flex: 1}} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={[styles.replyActionBtn, isReplyLikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(reply.id)} disabled={commentLikeLoading[reply.id] || isReplyLikeDisabled}>
            <Ionicons name={isReplyLiked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={isReplyLiked ? "#ef4444" : isReplyLikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyLiked && {
          color: '#ef4444'
        }, isReplyLikeDisabled && styles.interactionTextDisabled]}>{getCommentLikeDisplayCount(reply, commentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeOpenReply();
          openCommentModal(buildCommentReplyTarget(reply, {
            targetType: 2,
            targetId: currentAnswerId
          }));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => openShareModalWithData(buildAnswerCommentSharePayload(reply))}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{Number(reply.shareCount ?? reply.shares ?? 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentCollect(reply.id)} disabled={commentCollectLoading[reply.id]}>
            <Ionicons name={commentCollected[reply.id] ?? reply.collected ? "star" : "star-outline"} size={12} color={commentCollected[reply.id] ?? reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (commentCollected[reply.id] ?? reply.collected) && {
          color: '#f59e0b'
        }]}>{getCommentCollectDisplayCount(reply, commentCollected[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.replyActionBtn, isReplyDislikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(reply.id)} disabled={commentDislikeLoading[reply.id] || isReplyDislikeDisabled}>
            <Ionicons name={isReplyDisliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={isReplyDisliked ? "#6b7280" : isReplyDislikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyDisliked && {
          color: '#6b7280'
        }, isReplyDislikeDisabled && styles.interactionTextDisabled]}>{getCommentDislikeDisplayCount(reply, commentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeReport();
          navigation.navigate('Report', {
            type: 'comment',
            targetType: 5,
            targetId: Number(reply.id) || 0
          });
        }}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderQuestionReplyCard = (reply, options = {}) => {
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findQuestionCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    const isReplyLiked = getCommentLikedState(reply);
    const isReplyDisliked = getCommentDislikedState(reply);
    const isReplyLikeDisabled = isLikeInteractionDisabled(isReplyLiked, isReplyDisliked);
    const isReplyDislikeDisabled = isDislikeInteractionDisabled(isReplyLiked, isReplyDisliked);
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
          <View style={{flex: 1}} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={[styles.replyActionBtn, isReplyLikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(reply.id)} disabled={commentLikeLoading[reply.id] || isReplyLikeDisabled}>
            <Ionicons name={isReplyLiked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={isReplyLiked ? "#ef4444" : isReplyLikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyLiked && {
          color: '#ef4444'
        }, isReplyLikeDisabled && styles.interactionTextDisabled]}>{getCommentLikeDisplayCount(reply, commentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          openCommentModal(buildCommentReplyTarget(reply, {
            targetType: 1,
            targetId: route?.params?.id ?? questionData?.id
          }));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => openShareModalWithData(buildQuestionCommentSharePayload(reply))}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{Number(reply.shareCount ?? reply.shares ?? 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentCollect(reply.id)} disabled={commentCollectLoading[reply.id]}>
            <Ionicons name={commentCollected[reply.id] ?? reply.collected ? "star" : "star-outline"} size={12} color={commentCollected[reply.id] ?? reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (commentCollected[reply.id] ?? reply.collected) && {
          color: '#f59e0b'
        }]}>{getCommentCollectDisplayCount(reply, commentCollected[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.replyActionBtn, isReplyDislikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(reply.id)} disabled={commentDislikeLoading[reply.id] || isReplyDislikeDisabled}>
            <Ionicons name={isReplyDisliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={isReplyDisliked ? "#6b7280" : isReplyDislikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyDisliked && {
          color: '#6b7280'
        }, isReplyDislikeDisabled && styles.interactionTextDisabled]}>{getCommentDislikeDisplayCount(reply, commentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          navigation.navigate('Report', {
            type: 'comment',
            targetType: 5,
            targetId: Number(reply.id) || 0
          });
        }}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderQuestionReplyTreeNodes = (nodes = [], level = 0, options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedQuestionReplyChildren[reply.id] !== undefined ? expandedQuestionReplyChildren[reply.id] : true;

    return <View key={reply.id}>
        {renderQuestionReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedQuestionReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderQuestionReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });
  const renderAnswerReplyTreeNodes = (nodes = [], level = 0, options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedAnswerReplyChildren[reply.id] !== undefined ? expandedAnswerReplyChildren[reply.id] : true;

    return <View key={reply.id}>
        {renderAnswerReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedAnswerReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderAnswerReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });
  const renderSupplementReplyCard = (reply, options = {}) => {
    const beforeOpenReply = typeof options.beforeOpenReply === 'function' ? options.beforeOpenReply : () => {};
    const beforeReport = typeof options.beforeReport === 'function' ? options.beforeReport : () => {};
    const rootCommentId = options.rootCommentId ?? null;
    const contextReplyId = options.contextReplyId ?? null;
    const relationCommentId = Number(reply.replyToCommentId ?? reply.parentId ?? 0) || 0;
    const relationComment = relationCommentId ? findSupplementCommentById(relationCommentId) : null;
    const relationUserName = reply.replyToUserName || relationComment?.userName || relationComment?.userNickname || relationComment?.author || '';
    const shouldHideContextRelation = contextReplyId !== null && String(relationCommentId) === String(contextReplyId);
    const shouldShowReplyRelation = !!relationUserName && !shouldHideContextRelation && rootCommentId !== null && String(relationCommentId) !== String(rootCommentId) && String(relationCommentId) !== String(reply.id);
    const isReplyLiked = getCommentLikedState(reply);
    const isReplyDisliked = getCommentDislikedState(reply);
    const isReplyLikeDisabled = isLikeInteractionDisabled(isReplyLiked, isReplyDisliked);
    const isReplyDislikeDisabled = isDislikeInteractionDisabled(isReplyLiked, isReplyDisliked);
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
          <View style={{flex: 1}} />
          <Text style={styles.replyTime}>{reply.time}</Text>
        </TouchableOpacity>
        <Text style={styles.replyText}>{reply.content}</Text>
        <View style={styles.replyActions}>
          <TouchableOpacity style={[styles.replyActionBtn, isReplyLikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(reply.id)} disabled={commentLikeLoading[reply.id] || isReplyLikeDisabled}>
            <Ionicons name={isReplyLiked ? "thumbs-up" : "thumbs-up-outline"} size={12} color={isReplyLiked ? "#ef4444" : isReplyLikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyLiked && {
          color: '#ef4444'
        }, isReplyLikeDisabled && styles.interactionTextDisabled]}>{getCommentLikeDisplayCount(reply, commentLiked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeOpenReply();
          openCommentModal(buildCommentReplyTarget(reply, {
            targetType: 3,
            targetId: currentSuppId
          }));
        }}>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{reply.replies || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => openShareModalWithData(buildSupplementCommentSharePayload(reply))}>
            <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
            <Text style={styles.replyActionText}>{Number(reply.shareCount ?? reply.shares ?? 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => handleCommentCollect(reply.id)} disabled={commentCollectLoading[reply.id]}>
            <Ionicons name={commentCollected[reply.id] ?? reply.collected ? "star" : "star-outline"} size={12} color={commentCollected[reply.id] ?? reply.collected ? "#f59e0b" : "#9ca3af"} />
            <Text style={[styles.replyActionText, (commentCollected[reply.id] ?? reply.collected) && {
          color: '#f59e0b'
        }]}>{getCommentCollectDisplayCount(reply, commentCollected[reply.id])}</Text>
          </TouchableOpacity>
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.replyActionBtn, isReplyDislikeDisabled && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(reply.id)} disabled={commentDislikeLoading[reply.id] || isReplyDislikeDisabled}>
            <Ionicons name={isReplyDisliked ? "thumbs-down" : "thumbs-down-outline"} size={12} color={isReplyDisliked ? "#6b7280" : isReplyDislikeDisabled ? "#d1d5db" : "#9ca3af"} />
            <Text style={[styles.replyActionText, isReplyDisliked && {
          color: '#6b7280'
        }, isReplyDislikeDisabled && styles.interactionTextDisabled]}>{getCommentDislikeDisplayCount(reply, commentDisliked[reply.id])}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyActionBtn} onPress={() => {
          beforeReport();
          navigation.navigate('Report', {
            type: 'comment',
            targetType: 5,
            targetId: Number(reply.id) || 0
          });
        }}>
            <Ionicons name="flag-outline" size={12} color="#ef4444" />
            <Text style={styles.replyActionText}>{reply.reports || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>;
  };
  const renderSupplementReplyTreeNodes = (nodes = [], level = 0, options = {}) => nodes.map(reply => {
    const childNodes = Array.isArray(reply.children) ? reply.children : [];
    const hasChildren = childNodes.length > 0;
    const descendantReplies = hasChildren ? flattenCommentReplyTree(childNodes) : [];
    const isExpanded = expandedSuppReplyChildren[reply.id] !== undefined ? expandedSuppReplyChildren[reply.id] : true;

    return <View key={reply.id}>
        {renderSupplementReplyCard(reply, options)}
        {hasChildren ? <View style={styles.replyChildrenSection}>
            <TouchableOpacity style={styles.replyChildrenToggle} onPress={() => setExpandedSuppReplyChildren(prev => ({
          ...prev,
          [reply.id]: !isExpanded
        }))}>
              <Text style={styles.replyChildrenToggleText}>{isExpanded ? `收起回复 (${descendantReplies.length})` : `展开回复 (${descendantReplies.length})`}</Text>
            </TouchableOpacity>
            {isExpanded ? descendantReplies.map(childReply => renderSupplementReplyCard(childReply, {
          ...options,
          contextReplyId: reply.id
        })) : null}
          </View> : null}
      </View>;
  });
  const fetchSupplementInteractionCount = async supplementId => {
    if (!supplementId) {
      return 0;
    }
    const pageSize = 100;
    let pageNum = 1;
    let totalTopLevelComments = 0;
    let fetchedTopLevelComments = 0;
    while (true) {
      const response = await commentApi.getComments({
        targetType: 3,
        targetId: Number(supplementId),
        parentId: 0,
        pageNum,
        pageSize
      });
      if (!(response && response.code === 200)) {
        break;
      }
      const comments = normalizeComments(extractCommentRows(response));
      const pageTopLevelTotal = extractCommentTotal(response, comments.length);
      totalTopLevelComments = Math.max(Number(pageTopLevelTotal) || 0, totalTopLevelComments, comments.length);
      fetchedTopLevelComments += comments.length;
      if (comments.length === 0 || comments.length < pageSize || fetchedTopLevelComments >= totalTopLevelComments) {
        break;
      }
      pageNum += 1;
    }
    return Math.max(totalTopLevelComments, fetchedTopLevelComments);
  };
  const hydrateSupplementCommentCounts = async (supplements = []) => {
    const supplementsToSync = supplements.filter(item => {
      if (!item?.id) {
        return false;
      }
      return true;
    });
    if (!supplementsToSync.length) {
      return;
    }
    try {
      const commentCountResults = await Promise.all(supplementsToSync.map(async item => {
        try {
          return {
            id: item.id,
            commentCount: await fetchSupplementInteractionCount(item.id)
          };
        } catch (error) {
          console.log(`⚠️ 补充评论数校准失败: supplementId=${item.id}`, error);
          return null;
        }
      }));
      const nextCommentCountMap = commentCountResults.reduce((accumulator, result) => {
        if (!result?.id) {
          return accumulator;
        }
        accumulator[String(result.id)] = result.commentCount;
        return accumulator;
      }, {});
      if (!Object.keys(nextCommentCountMap).length) {
        return;
      }
      setSupplementsCache(prevCache => {
        const nextCache = {
          ...prevCache
        };
        Object.keys(nextCache).forEach(sortKey => {
          const currentEntry = nextCache[sortKey];
          if (!currentEntry?.list?.length) {
            return;
          }
          let changed = false;
          const nextList = currentEntry.list.map(item => {
            const nextCommentCount = nextCommentCountMap[String(item?.id)];
            if (nextCommentCount === undefined) {
              return item;
            }
            const currentCommentCount = Number(item.commentCount ?? item.comments ?? item.comment_count) || 0;
            if (currentCommentCount === nextCommentCount) {
              return item;
            }
            changed = true;
            return normalizeSupplementCacheItem({
              ...item,
              commentCount: nextCommentCount,
              comments: nextCommentCount
            });
          });
          if (changed) {
            nextCache[sortKey] = {
              ...currentEntry,
              list: nextList
            };
          }
        });
        return nextCache;
      });
    } catch (error) {
      console.log('⚠️ 补充评论数批量校准失败', error);
    }
  };
  const buildSupplementMutationResult = (currentSupplement = {}, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
    const liked = typeof responseData === 'boolean' ? responseData : payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentSupplement.liked ?? false;
    const disliked = typeof responseData === 'boolean' && fallbackValues.disliked !== undefined ? responseData : payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentSupplement.disliked ?? false;
    const collected = payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentSupplement.collected ?? false;
    const likeCount = Number(fallbackValues.likeCount ?? payload.likeCount ?? payload.likes ?? currentSupplement.likeCount ?? currentSupplement.likes) || 0;
    const dislikeCount = Number(fallbackValues.dislikeCount ?? payload.dislikeCount ?? payload.dislikes ?? currentSupplement.dislikeCount ?? currentSupplement.dislikes) || 0;
    const collectCount = Number(payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? fallbackValues.collectCount ?? currentSupplement.collectCount ?? currentSupplement.bookmarkCount ?? currentSupplement.bookmarks) || 0;
    return normalizeSupplementCacheItem({
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
      __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentSupplement.__dislikeCountResolved
    });
  };
  const buildQuestionMutationResult = (currentQuestionDetail = {}, responseData, fallbackValues = {}) => {
    const payload = responseData && typeof responseData === 'object' && !Array.isArray(responseData) ? responseData : {};
    const liked = typeof responseData === 'boolean' && fallbackValues.liked !== undefined ? responseData : payload.liked ?? payload.isLiked ?? fallbackValues.liked ?? currentQuestionDetail.liked ?? false;
    const collected = typeof responseData === 'boolean' && fallbackValues.collected !== undefined ? responseData : payload.collected ?? payload.isCollected ?? payload.bookmarked ?? payload.isBookmarked ?? fallbackValues.collected ?? currentQuestionDetail.collected ?? false;
    const disliked = typeof responseData === 'boolean' && fallbackValues.disliked !== undefined ? responseData : payload.disliked ?? payload.isDisliked ?? fallbackValues.disliked ?? currentQuestionDetail.disliked ?? false;
    const likeCount = Number(payload.likeCount ?? payload.likes ?? fallbackValues.likeCount ?? currentQuestionDetail.likeCount ?? currentQuestionDetail.likes) || 0;
    const collectCount = Number(payload.collectCount ?? payload.bookmarkCount ?? payload.bookmarks ?? fallbackValues.collectCount ?? currentQuestionDetail.collectCount ?? currentQuestionDetail.bookmarkCount ?? currentQuestionDetail.bookmarks) || 0;
    const dislikeCount = Number(payload.dislikeCount ?? payload.dislikes ?? fallbackValues.dislikeCount ?? currentQuestionDetail.dislikeCount ?? currentQuestionDetail.dislikes) || 0;
    return normalizeQuestionDetail({
      ...currentQuestionDetail,
      ...payload,
      liked: !!liked,
      collected: !!collected,
      disliked: !!disliked,
      likeCount,
      collectCount,
      dislikeCount,
      __likeCountResolved: fallbackValues.likeCount !== undefined ? true : currentQuestionDetail.__likeCountResolved,
      __collectCountResolved: fallbackValues.collectCount !== undefined ? true : currentQuestionDetail.__collectCountResolved,
      __dislikeCountResolved: fallbackValues.dislikeCount !== undefined ? true : currentQuestionDetail.__dislikeCountResolved
    });
  };
  const getErrorMessage = error => {
    if (!error) {
      return '';
    }
    if (typeof error === 'string') {
      return error;
    }
    return error.message || error.msg || String(error);
  };
  const touchAnswerCacheTimestamp = sortBy => {
    setAnswersCache(prevCache => ({
      ...prevCache,
      [sortBy]: {
        ...prevCache[sortBy],
        lastUpdated: Date.now()
      }
    }));
  };
  const touchSupplementCacheTimestamp = sortBy => {
    setSupplementsCache(prevCache => ({
      ...prevCache,
      [sortBy]: {
        ...prevCache[sortBy],
        lastUpdated: Date.now()
      }
    }));
  };

  // 静默刷新缓存（后台更新，不显示loading）
  const silentRefreshCache = async (questionId, sortBy) => {
    try {
      console.log(`🔄 静默刷新缓存: sortBy=${sortBy}`);
      const response = await answerApi.getAnswers(questionId, {
        sortBy: sortBy,
        pageNum: 1,
        pageSize: 10
      });
      if (response && response.code === 200 && response.data) {
        const newAnswers = normalizeAnswers(extractAnswerRows(response));
        const total = extractAnswerTotal(response, newAnswers.length);
        syncAnswerInteractionStates(newAnswers);

        // 检查数据是否有变化
        const currentCache = answersCache[sortBy];
        const hasChanges = total !== currentCache.total || JSON.stringify(newAnswers.slice(0, Math.min(newAnswers.length, currentCache.list.length))) !== JSON.stringify(currentCache.list.slice(0, Math.min(newAnswers.length, currentCache.list.length)));
        if (hasChanges) {
          console.log(`📱 检测到数据变化，更新缓存: sortBy=${sortBy}`);

          // 更新缓存
          setAnswersCache(prevCache => ({
            ...prevCache,
            [sortBy]: {
              list: newAnswers,
              total: total,
              pageNum: newAnswers.length < 10 ? 1 : 2,
              hasMore: newAnswers.length >= 10 && newAnswers.length < total,
              loaded: true,
              lastUpdated: Date.now()
            }
          }));

          // 可选：显示数据更新提示
          if (sortBy === answersSortBy) {
            showToast('回答列表已更新', 'info');
          }
        } else {
          console.log(`✅ 数据无变化: sortBy=${sortBy}`);

          // 更新时间戳，重置过期时间
          setAnswersCache(prevCache => ({
            ...prevCache,
            [sortBy]: {
              ...prevCache[sortBy],
              lastUpdated: Date.now()
            }
          }));
        }
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.log(`⚠️ 静默刷新已跳过: ${errorMessage || '未知错误'}`);
      touchAnswerCacheTimestamp(sortBy);
    }
  };

  // 自动刷新定时器
  useEffect(() => {
    const questionId = route?.params?.id;
    if (!questionId) return;
    const interval = setInterval(() => {
      // 检查当前排序的缓存是否过期
      const currentCache = answersCache[answersSortBy];
      if (currentCache.loaded && isCacheExpired(currentCache)) {
        console.log(`⏰ 缓存过期，自动刷新: sortBy=${answersSortBy}`);
        silentRefreshCache(questionId, answersSortBy);
      }
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [answersSortBy, answersCache, route?.params?.id]);

  // 页面获得焦点时检查缓存
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const questionId = route?.params?.id;
      if (!questionId) return;

      // 检查所有已加载的缓存是否过期
      Object.keys(answersCache).forEach(sortBy => {
        const cacheData = answersCache[sortBy];
        if (cacheData.loaded && isCacheExpired(cacheData)) {
          console.log(`🎯 页面焦点检查，缓存过期: sortBy=${sortBy}`);
          silentRefreshCache(questionId, sortBy);
        }
      });
    });
    return unsubscribe;
  }, [navigation, answersCache, route?.params?.id]);

  // 加载回答列表 - 优化缓存版本
  const loadAnswersList = async (questionId, isRefresh = false, sortBy = answersSortBy) => {
    if (!questionId) return;

    // 检查缓存，如果已加载且不是刷新操作且未过期，则不重复请求
    const cacheData = answersCache[sortBy];
    if (!isRefresh && cacheData.loaded && cacheData.list.length > 0 && !isCacheExpired(cacheData)) {
      console.log(`📋 使用缓存数据: sortBy=${sortBy}, 数量=${cacheData.list.length}`);
      return;
    }
    try {
      if (isRefresh) {
        if (cacheData.list.length === 0) {
          setAnswersLoading(true);
        }
        setAnswersRefreshing(true);
      } else {
        setAnswersLoadingMore(true);
      }
      const currentPage = isRefresh ? 1 : cacheData.pageNum;
      console.log(`📋 加载回答列表: questionId=${questionId}, page=${currentPage}, sortBy=${sortBy}`);
      const response = await answerApi.getAnswers(questionId, {
        sortBy: sortBy,
        pageNum: currentPage,
        pageSize: 10
      });
      console.log('📥 回答列表响应:', response);
      if (response && response.code === 200 && response.data) {
        const newAnswers = normalizeAnswers(extractAnswerRows(response));
        const total = extractAnswerTotal(response, newAnswers.length);
        const otherSortBy = sortBy === 'featured' ? 'newest' : 'featured';
        logSortPreview({
          scope: 'answers',
          sortBy,
          total,
          items: newAnswers,
          source: isRefresh ? 'refresh-request' : 'load-more-request',
          cacheState: 'network',
          otherSortBy,
          otherItems: answersCache[otherSortBy]?.list || []
        });
        syncAnswerInteractionStates(newAnswers);

        // 更新对应排序方式的缓存
        setAnswersCache(prevCache => {
          const updatedCache = {
            ...prevCache
          };
          const currentData = updatedCache[sortBy];
          if (isRefresh) {
            // 刷新时替换数据
            updatedCache[sortBy] = {
              list: newAnswers,
              total: total,
              pageNum: newAnswers.length < 10 ? currentPage : currentPage + 1,
              hasMore: newAnswers.length >= 10 && newAnswers.length < total,
              loaded: true,
              lastUpdated: Date.now()
            };
          } else {
            // 加载更多时追加数据
            updatedCache[sortBy] = {
              list: [...currentData.list, ...newAnswers],
              total: total,
              pageNum: newAnswers.length < 10 ? currentPage : currentPage + 1,
              hasMore: newAnswers.length >= 10 && currentData.list.length + newAnswers.length < total,
              loaded: true,
              lastUpdated: Date.now()
            };
          }
          return updatedCache;
        });

        if (shouldFallbackToNewestAnswers(sortBy, newAnswers, total)) {
          console.log('ℹ️ 当前精选回答为空但总数大于 0，自动切换到最新回答');
          const newestResponse = await answerApi.getAnswers(questionId, {
            sortBy: 'newest',
            pageNum: 1,
            pageSize: 10
          });
          if (newestResponse && newestResponse.code === 200 && newestResponse.data) {
            const newestAnswers = normalizeAnswers(extractAnswerRows(newestResponse));
            const newestTotal = extractAnswerTotal(newestResponse, newestAnswers.length);
            if (newestAnswers.length > 0) {
              syncAnswerInteractionStates(newestAnswers);
              setAnswersCache(prevCache => ({
                ...prevCache,
                newest: {
                  list: newestAnswers,
                  total: newestTotal,
                  pageNum: newestAnswers.length < 10 ? 1 : 2,
                  hasMore: newestAnswers.length >= 10 && newestAnswers.length < newestTotal,
                  loaded: true,
                  lastUpdated: Date.now()
                }
              }));
              setAnswersSortBy('newest');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 加载回答列表失败:', error);
      if (isRefresh && cacheData.list.length === 0) {
        Alert.alert('加载失败', '获取回答列表失败，请稍后重试');
      }
    } finally {
      setAnswersLoading(false);
      setAnswersRefreshing(false);
      setAnswersLoadingMore(false);
    }
  };
  const loadCommentsList = async (questionId, isRefresh = false, sortBy = commentsSortBy) => {
    if (!questionId) return;
    const cacheData = commentsCache[sortBy];
    if (!isRefresh && cacheData.loaded && !isCacheExpired(cacheData)) {
      console.log(`📋 使用评论缓存数据: sortBy=${sortBy}, 数量=${cacheData.list.length}`);
      return;
    }
    try {
      if (isRefresh) {
        setCommentsRefreshing(true);
      } else {
        setLoadingComments(true);
      }
      const pageNum = isRefresh ? 1 : cacheData.pageNum;
      console.log(`📋 加载评论列表: questionId=${questionId}, page=${pageNum}, sortBy=${sortBy}`);
      const response = await commentApi.getComments({
        targetType: 1,
        targetId: Number(questionId),
        parentId: 0,
        sortBy,
        pageNum,
        pageSize: 10
      });
      console.log('📥 评论列表响应:', response);
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = mergeInteractionCounts(normalizeComments(rawRows, {
          targetType: 1,
          targetId: Number(questionId),
          parentId: 0
        }), cacheData.list);
        const total = extractCommentTotal(response, newComments.length);
        syncCommentInteractionStates(newComments);
        setCommentsCache(prevCache => {
          const updatedCache = {
            ...prevCache
          };
          const currentData = updatedCache[sortBy];
          if (isRefresh) {
            updatedCache[sortBy] = {
              list: newComments,
              total,
              pageNum: newComments.length < 10 ? 1 : 2,
              hasMore: newComments.length >= 10 && newComments.length < total,
              loaded: true,
              lastUpdated: Date.now()
            };
          } else {
            updatedCache[sortBy] = {
              list: [...currentData.list, ...newComments],
              total,
              pageNum: newComments.length < 10 ? pageNum : pageNum + 1,
              hasMore: newComments.length >= 10 && currentData.list.length + newComments.length < total,
              loaded: true,
              lastUpdated: Date.now()
            };
          }
          return updatedCache;
        });

        if (shouldFallbackToNewestComments(sortBy, newComments, total)) {
          console.log('ℹ️ 当前精选评论为空但总数大于 0，自动切换到最新评论');
          const newestResponse = await commentApi.getComments({
            targetType: 1,
            targetId: Number(questionId),
            parentId: 0,
            sortBy: 'newest',
            pageNum: 1,
            pageSize: 10
          });
          if (newestResponse && newestResponse.code === 200 && newestResponse.data) {
            const newestRows = extractCommentRows(newestResponse);
            const newestComments = normalizeComments(newestRows, {
              targetType: 1,
              targetId: Number(questionId),
              parentId: 0
            });
            const newestTotal = extractCommentTotal(newestResponse, newestComments.length);
            if (newestComments.length > 0) {
              syncCommentInteractionStates(newestComments);
              setCommentsCache(prevCache => ({
                ...prevCache,
                newest: {
                  list: newestComments,
                  total: newestTotal,
                  pageNum: newestComments.length < 10 ? 1 : 2,
                  hasMore: newestComments.length >= 10 && newestComments.length < newestTotal,
                  loaded: true,
                  lastUpdated: Date.now()
                }
              }));
              setCommentsSortBy('newest');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 加载评论列表失败:', error);
      if (isRefresh && cacheData.list.length === 0) {
        showToast('获取评论列表失败', 'error');
      }
    } finally {
      setLoadingComments(false);
      setCommentsRefreshing(false);
    }
  };
  const handleCommentsSortChange = newSortBy => {
    if (newSortBy !== commentsSortBy) {
      console.log(`🔄 切换评论排序方式: ${commentsSortBy} → ${newSortBy}`);
      setCommentsSortBy(newSortBy);
      const questionId = route?.params?.id;
      if (questionId) {
        const newSortCache = commentsCache[newSortBy];
        if (!newSortCache.loaded || isCacheExpired(newSortCache)) {
          console.log(`📋 ${newSortBy} 评论排序无缓存或已过期，开始加载...`);
          loadCommentsList(questionId, true, newSortBy);
        } else {
          console.log(`📋 ${newSortBy} 评论排序使用缓存，数量: ${newSortCache.list.length}`);
        }
      }
    }
  };
  const onCommentsRefresh = () => {
    const questionId = route?.params?.id;
    if (questionId) {
      console.log(`🔄 刷新评论列表: sortBy=${commentsSortBy}`);
      loadCommentsList(questionId, true, commentsSortBy);
    }
  };
  const onCommentsLoadMore = async () => {
    const questionId = route?.params?.id;
    const currentData = commentsCache[commentsSortBy];
    if (!questionId || !currentData.loaded || !currentData.hasMore || commentsLoadingMore || loadingComments) {
      return;
    }
    try {
      setCommentsLoadingMore(true);
      const pageNum = currentData.pageNum;
      console.log(`📋 加载更多评论: sortBy=${commentsSortBy}, page=${pageNum}`);
      const response = await commentApi.getComments({
        targetType: 1,
        targetId: Number(questionId),
        parentId: 0,
        sortBy: commentsSortBy,
        pageNum,
        pageSize: 10
      });
      console.log('📥 评论列表更多响应:', response);
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = mergeInteractionCounts(normalizeComments(rawRows, {
          targetType: 1,
          targetId: Number(questionId),
          parentId: 0
        }), currentData.list);
        const total = extractCommentTotal(response, currentData.total);
        syncCommentInteractionStates(newComments);
        setCommentsCache(prevCache => ({
          ...prevCache,
          [commentsSortBy]: {
            ...prevCache[commentsSortBy],
            list: [...prevCache[commentsSortBy].list, ...newComments],
            total,
            pageNum: newComments.length < 10 ? pageNum : pageNum + 1,
            hasMore: newComments.length >= 10 && prevCache[commentsSortBy].list.length + newComments.length < total,
            loaded: true,
            lastUpdated: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('❌ 加载更多评论失败:', error);
      showToast('加载更多评论失败', 'error');
    } finally {
      setCommentsLoadingMore(false);
    }
  };
  const loadSupplementComments = async (supplementId, options = {}) => {
    const {
      isRefresh = false,
      isLoadMore = false
    } = options;
    if (!supplementId) {
      return;
    }
    const pageNum = isLoadMore ? suppCommentListState.pageNum : 1;
    try {
      setSuppCommentListState(prevState => ({
        ...prevState,
        loading: !isRefresh && !isLoadMore,
        refreshing: isRefresh,
        loadingMore: isLoadMore,
        targetId: Number(supplementId)
      }));
      const response = await commentApi.getComments({
        targetType: 3,
        targetId: Number(supplementId),
        parentId: 0,
        pageNum,
        pageSize: 10
      });
      console.log('📥 补充评论列表响应:', response);
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = mergeInteractionCounts(normalizeComments(rawRows, {
          targetType: 3,
          targetId: Number(supplementId),
          parentId: 0
        }), suppCommentListState.list);
        const total = extractCommentTotal(response, newComments.length);
        syncCommentInteractionStates(newComments);
        setSuppCommentListState(prevState => {
          const nextList = isLoadMore ? [...prevState.list, ...newComments] : newComments;
          return {
            ...prevState,
            list: nextList,
            total,
            pageNum: newComments.length < 10 ? pageNum : pageNum + 1,
            hasMore: newComments.length >= 10 && nextList.length < total,
            loaded: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            targetId: Number(supplementId)
          };
        });
        const interactionCount = await fetchSupplementInteractionCount(supplementId);
        syncSupplementCommentCount(supplementId, interactionCount);
      } else {
        setSuppCommentListState(prevState => ({
          ...prevState,
          loading: false,
          refreshing: false,
          loadingMore: false
        }));
        showToast(response?.msg || '加载补充评论失败', 'error');
      }
    } catch (error) {
      console.error('❌ 加载补充评论失败:', error);
      setSuppCommentListState(prevState => ({
        ...prevState,
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
      showToast('加载补充评论失败', 'error');
    }
  };
  const loadAnswerComments = async (answerId, options = {}) => {
    const {
      isRefresh = false,
      isLoadMore = false
    } = options;
    if (!answerId) {
      return;
    }
    const pageNum = isLoadMore ? answerCommentListState.pageNum : 1;
    try {
      setAnswerCommentListState(prevState => ({
        ...prevState,
        loading: !isRefresh && !isLoadMore,
        refreshing: isRefresh,
        loadingMore: isLoadMore,
        targetId: Number(answerId)
      }));
      const response = await commentApi.getComments({
        targetType: 2,
        targetId: Number(answerId),
        parentId: 0,
        pageNum,
        pageSize: 10
      });
      console.log('📥 回答评论列表响应:', response);
      if (response && response.code === 200 && response.data) {
        const rawRows = extractCommentRows(response);
        const newComments = mergeInteractionCounts(normalizeComments(rawRows, {
          targetType: 2,
          targetId: Number(answerId),
          parentId: 0
        }), answerCommentListState.list);
        const total = extractCommentTotal(response, newComments.length);
        syncCommentInteractionStates(newComments);
        setAnswerCommentListState(prevState => {
          const nextList = isLoadMore ? [...prevState.list, ...newComments] : newComments;
          return {
            ...prevState,
            list: nextList,
            total,
            pageNum: newComments.length < 10 ? pageNum : pageNum + 1,
            hasMore: newComments.length >= 10 && nextList.length < total,
            loaded: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            targetId: Number(answerId)
          };
        });
      } else {
        setAnswerCommentListState(prevState => ({
          ...prevState,
          loading: false,
          refreshing: false,
          loadingMore: false
        }));
        showToast(response?.msg || '加载回答评论失败', 'error');
      }
    } catch (error) {
      console.error('❌ 加载回答评论失败:', error);
      setAnswerCommentListState(prevState => ({
        ...prevState,
        loading: false,
        refreshing: false,
        loadingMore: false
      }));
      showToast('加载回答评论失败', 'error');
    }
  };
  const loadQuestionCommentReplies = async parentCommentId => {
    const questionId = Number(route?.params?.id ?? questionData?.id) || 0;
    if (!questionId || !parentCommentId) {
      return;
    }
    setQuestionCommentRepliesMap(prevMap => ({
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
              targetType: 1,
              targetId: questionId,
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });
            console.log(`📥 问题评论回复响应: parentId=${currentParentId}, pageNum=${pageNum}`, response);

            if (!(response && response.code === 200 && response.data)) {
              break;
            }

            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetType: 1,
              targetId: questionId
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
      const replies = mergeInteractionCounts(rawReplies, questionCommentRepliesMap[parentCommentId]?.list || []);
      const total = replies.length;

      if (replies.length > 0) {
        syncCommentInteractionStates(replies);
        setQuestionCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            list: replies,
            total,
            loaded: true,
            loading: false
          }
        }));
      } else {
        setQuestionCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            ...(prevMap[parentCommentId] || {}),
            list: [],
            total: 0,
            loaded: true,
            loading: false
          }
        }));
      }
    } catch (error) {
      console.error('❌ 加载问题评论回复失败:', error);
      setQuestionCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          ...(prevMap[parentCommentId] || {}),
          loading: false,
          loaded: true
        }
      }));
      showToast('加载回复失败', 'error');
    }
  };
  const loadAnswerCommentReplies = async parentCommentId => {
    if (!currentAnswerId || !parentCommentId) {
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
              targetId: Number(currentAnswerId),
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });
            console.log(`📥 回答评论回复响应: parentId=${currentParentId}, pageNum=${pageNum}`, response);

            if (!(response && response.code === 200 && response.data)) {
              break;
            }

            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetType: 2,
              targetId: Number(currentAnswerId)
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
      const replies = mergeInteractionCounts(rawReplies, answerCommentRepliesMap[parentCommentId]?.list || []);
      const total = replies.length;

      if (replies.length > 0) {
        syncCommentInteractionStates(replies);
        setAnswerCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            list: replies,
            total,
            loaded: true,
            loading: false
          }
        }));
      } else {
        setAnswerCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            ...(prevMap[parentCommentId] || {}),
            list: [],
            total: 0,
            loaded: true,
            loading: false
          }
        }));
      }
    } catch (error) {
      console.error('❌ 加载回答评论回复失败:', error);
      setAnswerCommentRepliesMap(prevMap => ({
        ...prevMap,
        [parentCommentId]: {
          ...(prevMap[parentCommentId] || {}),
          loading: false,
          loaded: true
        }
      }));
      showToast('加载回复失败', 'error');
    }
  };
  const loadSupplementCommentReplies = async parentCommentId => {
    if (!currentSuppId || !parentCommentId) {
      return;
    }
    setSuppCommentRepliesMap(prevMap => ({
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
              targetId: Number(currentSuppId),
              parentId: Number(currentParentId),
              pageNum,
              pageSize
            });
            console.log(`📥 补充评论回复响应: parentId=${currentParentId}, pageNum=${pageNum}`, response);

            if (!(response && response.code === 200 && response.data)) {
              break;
            }

            const rawRows = extractCommentRows(response);
            const normalizedRows = normalizeComments(rawRows, {
              targetType: 3,
              targetId: Number(currentSuppId)
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
      const replies = mergeInteractionCounts(rawReplies, suppCommentRepliesMap[parentCommentId]?.list || []);
      const total = replies.length;

      if (replies.length > 0) {
        syncCommentInteractionStates(replies);
        setSuppCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            list: replies,
            total,
            loaded: true,
            loading: false
          }
        }));
      } else {
        setSuppCommentRepliesMap(prevMap => ({
          ...prevMap,
          [parentCommentId]: {
            ...(prevMap[parentCommentId] || {}),
            list: [],
            total: 0,
            loaded: true,
            loading: false
          }
        }));
      }
    } catch (error) {
      console.error('❌ 加载补充评论回复失败:', error);
      setSuppCommentRepliesMap(prevMap => ({
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
  const toggleSupplementCommentReplies = async commentId => {
    const willExpand = !expandedSuppCommentReplies[commentId];
    setExpandedSuppCommentReplies(prevState => ({
      ...prevState,
      [commentId]: willExpand
    }));
    if (willExpand && !suppCommentRepliesMap[commentId]?.loaded && !suppCommentRepliesMap[commentId]?.loading) {
      await loadSupplementCommentReplies(commentId);
    }
  };
  const handleAnswerCommentsLoadMore = () => {
    if (!currentAnswerId || !answerCommentListState.loaded || !answerCommentListState.hasMore || answerCommentListState.loadingMore || answerCommentListState.loading) {
      return;
    }
    loadAnswerComments(currentAnswerId, {
      isLoadMore: true
    });
  };
  const handleSupplementCommentsLoadMore = () => {
    if (!currentSuppId || !suppCommentListState.loaded || !suppCommentListState.hasMore || suppCommentListState.loadingMore || suppCommentListState.loading) {
      return;
    }
    loadSupplementComments(currentSuppId, {
      isLoadMore: true
    });
  };
  const closeCommentModal = () => {
    setShowCommentModal(false);
    setCommentText('');
    setCommentIdentity('personal');
    setCommentSelectedTeams([]);
    setCommentTarget({
      targetType: 1,
      targetId: null,
      parentId: 0,
      replyToCommentId: 0,
      replyToUserId: null,
      replyToUserName: '',
      originalComment: null
    });
  };
  const openCommentModal = (target = {}) => {
    const defaultTargetId = route?.params?.id ? Number(route.params.id) : null;
    setCommentTarget({
      targetType: target.targetType ?? 1,
      targetId: target.targetId !== undefined && target.targetId !== null ? Number(target.targetId) : defaultTargetId,
      parentId: target.parentId ?? 0,
      replyToCommentId: Number(target.replyToCommentId ?? 0) || 0,
      replyToUserId: normalizeEntityId(target.replyToUserId),
      replyToUserName: target.replyToUserName ?? '',
      originalComment: target.originalComment ? normalizeCommentItem(target.originalComment, {
        targetType: target.targetType ?? 1,
        targetId: target.targetId !== undefined && target.targetId !== null ? Number(target.targetId) : defaultTargetId,
        parentId: target.parentId ?? 0
      }) : null
    });
    setShowCommentModal(true);
  };
  const restoreCommentComposerContext = (target = commentTarget) => {
    const normalizedTargetType = Number(target?.targetType ?? 1) || 1;
    const normalizedParentId = Number(target?.parentId ?? 0) || 0;
    const isQuestionComment = normalizedTargetType === 1;
    const isSupplementComment = normalizedTargetType === 3;
    const isAnswerComment = normalizedTargetType === 2;
    const isReplyToQuestionComment = isQuestionComment && normalizedParentId !== 0;
    const isReplyToSupplementComment = isSupplementComment && normalizedParentId !== 0;
    const isReplyToAnswerComment = isAnswerComment && normalizedParentId !== 0;

    closeCommentModal();

    if (isReplyToQuestionComment) {
      setShowCommentReplyModal(true);
      return;
    }
    if (isReplyToSupplementComment) {
      setShowSuppCommentReplyModal(true);
      return;
    }
    if (isReplyToAnswerComment) {
      setShowAnswerCommentReplyModal(true);
      return;
    }
    if (isSupplementComment) {
      setShowSuppCommentListModal(true);
      return;
    }
    if (isAnswerComment) {
      setShowAnswerCommentListModal(true);
    }
  };
  const handleCloseCommentComposer = () => {
    restoreCommentComposerContext(commentTarget);
  };
  const handleSubmitComment = async (submittedText = '', _isTeam = false, _selectedImages = []) => {
    const normalizedCommentText = typeof submittedText === 'string' ? submittedText.trim() : typeof commentText === 'string' ? commentText.trim() : '';
    const questionId = route?.params?.id;
    const composerTarget = {
      ...commentTarget
    };
    let targetType = Number(composerTarget?.targetType ?? 1) || 1;
    let targetId = Number(composerTarget?.targetId ?? questionId) || 0;
    let parentId = Number(composerTarget?.parentId ?? 0) || 0;
    if (targetType === 3 && parentId > 0) {
      const supplementParentComment = findSupplementCommentById(parentId);
      if (supplementParentComment) {
        targetId = Number(currentSuppId ?? supplementParentComment.targetId ?? targetId) || targetId;
      }
    }
    const isQuestionRootComment = targetType === 1 && parentId === 0 && String(targetId) === String(questionId);
    if (!normalizedCommentText) {
      return;
    }
    if (!targetId) {
      showToast('评论目标不存在', 'error');
      return;
    }
    if (commentSubmitting) {
      return;
    }
    try {
      setCommentSubmitting(true);
      const parentComment = parentId > 0 ? targetType === 3 ? findSupplementCommentById(parentId) : targetType === 2 ? findAnswerCommentById(parentId) : findQuestionCommentById(parentId) : null;
      const resolvedReplyToUserId = normalizeEntityId(commentTarget?.replyToUserId ?? parentComment?.replyToUserId ?? resolveCommentUserId(parentComment));
      const resolvedReplyToUserName = commentTarget?.replyToUserName ?? parentComment?.replyToUserName ?? parentComment?.userName ?? parentComment?.userNickname ?? parentComment?.author ?? '';
      const payload = {
        targetType,
        targetId,
        parentId,
        content: normalizedCommentText
      };
      if (composerTarget?.replyToCommentId) {
        payload.replyToCommentId = Number(composerTarget.replyToCommentId) || 0;
      }
      if (resolvedReplyToUserId) {
        payload.replyToUserId = resolvedReplyToUserId;
      }
      if (resolvedReplyToUserName) {
        payload.replyToUserName = resolvedReplyToUserName;
      }
      const response = await commentApi.createComment(payload);
      console.log('📥 评论发布响应:', response);
      if (response && response.code === 200) {
        showToast('评论发布成功', 'success');
        restoreCommentComposerContext(composerTarget);
        
        if (isQuestionRootComment) {
          setQuestionData(prevQuestion => {
            if (!prevQuestion) {
              return prevQuestion;
            }
            const nextCommentCount = (Number(prevQuestion.commentCount ?? prevQuestion.comments ?? 0) || 0) + 1;
            return normalizeQuestionDetail({
              ...prevQuestion,
              commentCount: nextCommentCount,
              comments: nextCommentCount
            });
          });
          setCommentsCache(prevCache => ({
            ...prevCache,
            likes: {
              ...prevCache.likes,
              loaded: false,
              lastUpdated: null
            },
            newest: {
              ...prevCache.newest,
              loaded: false,
              lastUpdated: null
            }
          }));
          setCommentsSortBy('newest');
          await loadCommentsList(targetId, true, 'newest');
        } else if (targetType === 1) {
          await loadCommentsList(targetId, true, commentsSortBy);
          if (parentId > 0) {
            const threadRootId = getQuestionCommentThreadRootId(parentId);
            if (threadRootId) {
              await loadQuestionCommentReplies(threadRootId);
            }
          }
        } else if (targetType === 3) {
          const currentSupplement = getSupplementById(targetId);
          const currentSupplementCommentCount = Number(currentSupplement?.commentCount ?? currentSupplement?.comments ?? 0) || 0;
          syncSupplementCommentCount(targetId, currentSupplementCommentCount + 1);

          if (String(currentSuppId) === String(targetId)) {
            await loadSupplementComments(targetId, {
              isRefresh: true
            });
            if (parentId > 0) {
              const threadRootId = getSupplementCommentThreadRootId(parentId);
              if (threadRootId) {
                await loadSupplementCommentReplies(threadRootId);
              }
            }
          }
        } else if (targetType === 2) {
          const currentAnswer = answersList.find(item => String(getAnswerPrimaryId(item) ?? item.id) === String(targetId)) || Object.values(answersCache).flatMap(entry => entry?.list || []).find(item => String(getAnswerPrimaryId(item) ?? item.id) === String(targetId)) || null;
          const currentAnswerCommentCount = Number(currentAnswer?.commentCount ?? currentAnswer?.comments ?? 0) || 0;
          syncAnswerCommentCount(targetId, currentAnswerCommentCount + 1);

          if (String(currentAnswerId) === String(targetId)) {
            await loadAnswerComments(targetId, {
              isRefresh: true
            });
            if (parentId > 0) {
              const threadRootId = getAnswerCommentThreadRootId(parentId);
              if (threadRootId) {
                await loadAnswerCommentReplies(threadRootId);
              }
            }
          }
        }
      } else {
        showToast(response?.msg || '评论发布失败', 'error');
        restoreCommentComposerContext(composerTarget);
      }
    } catch (error) {
      console.error('❌ 评论发布失败:', error);
      showToast(error?.message || '网络错误，请稍后重试', 'error');
      restoreCommentComposerContext(composerTarget);
    } finally {
      setCommentSubmitting(false);
    }
  };
  const handleCommentDislike = async commentId => {
    const questionComment = commentsList.find(item => String(item.id) === String(commentId));
    const questionReplyComment = Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const answerComment = answerCommentsList.find(item => String(item.id) === String(commentId));
    const answerReplyComment = Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const supplementRootComment = suppCommentsList.find(item => String(item.id) === String(commentId));
    const supplementReplyComment = Object.values(suppCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const comment = questionComment || questionReplyComment || answerComment || answerReplyComment || supplementRootComment || supplementReplyComment;
    if (!commentId) {
      showToast('操作失败：评论ID不存在', 'error');
      return;
    }
    if (commentDislikeLoading[commentId]) {
      return;
    }
    const currentState = getCommentDislikedState(comment);
    const currentLikedState = getCommentLikedState(comment);
    if (isDislikeInteractionDisabled(currentLikedState, currentState)) {
      return;
    }
    const newState = !currentState;
    setCommentDisliked(prev => ({
      ...prev,
      [commentId]: newState
    }));
    try {
      setCommentDislikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = newState ? await commentApi.dislikeComment(commentId) : await commentApi.undislikeComment(commentId);
      if (response && response.code === 200) {
        showToast(newState ? '已踩' : '已取消踩', 'success');
        const applyDislikeUpdate = currentComment => {
          const currentDislikeCount = getCommentDislikeDisplayCount(currentComment, currentState);
          const fallbackDislikeCount = Math.max(0, currentDislikeCount + (newState ? 1 : -1));
          return buildCommentFromMutationResponse(currentComment, response.data, {
            disliked: newState,
            dislikeCount: fallbackDislikeCount
          });
        };
        if (questionComment || questionReplyComment) {
          updateCommentInCaches(commentId, applyDislikeUpdate);
        }
        if (answerComment || answerReplyComment) {
          updateAnswerCommentStates(commentId, applyDislikeUpdate);
        }
        if (supplementRootComment || supplementReplyComment) {
          updateSupplementCommentStates(commentId, applyDislikeUpdate);
        }
      } else {
        setCommentDisliked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('❌ 评论点踩请求异常:', error);
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
  const handleCommentLike = async commentId => {
    const questionComment = commentsList.find(item => String(item.id) === String(commentId));
    const questionReplyComment = Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const answerComment = answerCommentsList.find(item => String(item.id) === String(commentId));
    const answerReplyComment = Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const supplementRootComment = suppCommentsList.find(item => String(item.id) === String(commentId));
    const supplementReplyComment = Object.values(suppCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const comment = questionComment || questionReplyComment || answerComment || answerReplyComment || supplementRootComment || supplementReplyComment;
    if (!commentId) {
      showToast('操作失败：评论ID不存在', 'error');
      return;
    }
    if (commentLikeLoading[commentId]) {
      return;
    }
    const currentState = getCommentLikedState(comment);
    const currentDislikedState = getCommentDislikedState(comment);
    if (isLikeInteractionDisabled(currentState, currentDislikedState)) {
      return;
    }
    const newState = !currentState;
    setCommentLiked(prev => ({
      ...prev,
      [commentId]: newState
    }));
    try {
      setCommentLikeLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = newState ? await commentApi.likeComment(commentId) : await commentApi.unlikeComment(commentId);
      if (response && response.code === 200) {
        showToast(newState ? '已点赞' : '已取消点赞', 'success');
        const applyLikeUpdate = currentComment => {
          const currentLikeCount = getCommentLikeDisplayCount(currentComment, currentState);
          const fallbackLikeCount = Math.max(0, currentLikeCount + (newState ? 1 : -1));
          return buildCommentFromMutationResponse(currentComment, response.data, {
            liked: newState,
            likeCount: fallbackLikeCount
          });
        };
        if (questionComment || questionReplyComment) {
          updateCommentInCaches(commentId, applyLikeUpdate);
        }
        if (answerComment || answerReplyComment) {
          updateAnswerCommentStates(commentId, applyLikeUpdate);
        }
        if (supplementRootComment || supplementReplyComment) {
          updateSupplementCommentStates(commentId, applyLikeUpdate);
        }
      } else {
        setCommentLiked(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('❌ 评论点赞请求异常:', error);
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
    const questionComment = commentsList.find(item => String(item.id) === String(commentId));
    const questionReplyComment = Object.values(questionCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const answerComment = answerCommentsList.find(item => String(item.id) === String(commentId));
    const answerReplyComment = Object.values(answerCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const supplementRootComment = suppCommentsList.find(item => String(item.id) === String(commentId));
    const supplementReplyComment = Object.values(suppCommentRepliesMap).flatMap(entry => entry?.list || []).find(item => String(item.id) === String(commentId));
    const comment = questionComment || questionReplyComment || answerComment || answerReplyComment || supplementRootComment || supplementReplyComment;
    if (!commentId) {
      showToast('操作失败：评论ID不存在', 'error');
      return;
    }
    if (commentCollectLoading[commentId]) {
      return;
    }
    const currentState = commentCollected[commentId] !== undefined ? commentCollected[commentId] : !!comment?.collected;
    const newState = !currentState;
    const collectPayload = {
      targetType: Number(comment?.targetType ?? 0) || undefined,
      targetId: Number(comment?.targetId ?? 0) || undefined,
      parentId: Number(comment?.parentId ?? 0) || 0
    };
    setCommentCollected(prev => ({
      ...prev,
      [commentId]: newState
    }));
    try {
      setCommentCollectLoading(prev => ({
        ...prev,
        [commentId]: true
      }));
      const response = newState ? await commentApi.collectComment(commentId, collectPayload) : await commentApi.uncollectComment(commentId, collectPayload);
      if (response && response.code === 200) {
        showToast(newState ? '已收藏' : '已取消收藏', 'success');
        const applyCollectUpdate = currentComment => {
          const currentCollectCount = getCommentCollectDisplayCount(currentComment, currentState);
          const fallbackCollectCount = Math.max(0, currentCollectCount + (newState ? 1 : -1));
          return buildCommentFromMutationResponse(currentComment, response.data, {
            collected: newState,
            collectCount: fallbackCollectCount
          });
        };
        if (questionComment || questionReplyComment) {
          updateCommentInCaches(commentId, applyCollectUpdate);
        }
        if (answerComment || answerReplyComment) {
          updateAnswerCommentStates(commentId, applyCollectUpdate);
        }
        if (supplementRootComment || supplementReplyComment) {
          updateSupplementCommentStates(commentId, applyCollectUpdate);
        }
      } else {
        setCommentCollected(prev => ({
          ...prev,
          [commentId]: currentState
        }));
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('❌ 评论收藏请求异常:', error);
      setCommentCollected(prev => ({
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

  // 回答列表下拉刷新 - 优化缓存版本
  const onAnswersRefresh = () => {
    const questionId = route?.params?.id;
    if (questionId) {
      console.log(`🔄 刷新回答列表: sortBy=${answersSortBy}`);
      loadAnswersList(questionId, true, answersSortBy);
    }
  };

  // 回答列表上拉加载更多 - 优化缓存版本
  const onAnswersLoadMore = () => {
    const questionId = route?.params?.id;
    const currentData = answersCache[answersSortBy];
    if (questionId && currentData.hasMore && !answersLoadingMore) {
      console.log(`📋 加载更多回答: sortBy=${answersSortBy}, page=${currentData.pageNum}`);
      loadAnswersList(questionId, false, answersSortBy);
    }
  };

  // 切换回答列表排序方式 - 优化缓存版本
  const handleAnswersSortChange = newSortBy => {
    if (newSortBy !== answersSortBy) {
      console.log(`🔄 切换排序方式: ${answersSortBy} → ${newSortBy}`);
      setAnswersSortBy(newSortBy);
      const questionId = route?.params?.id;
      if (questionId) {
        // 检查新排序方式是否已有缓存数据
        const newSortCache = answersCache[newSortBy];
        if (!newSortCache.loaded || newSortCache.list.length === 0) {
          // 没有缓存数据，需要加载
          console.log(`📋 ${newSortBy} 排序无缓存，开始加载...`);
          loadAnswersList(questionId, true, newSortBy);
        } else {
          // 有缓存数据，直接使用
          console.log(`📋 ${newSortBy} 排序使用缓存，数量: ${newSortCache.list.length}`);
          logSortPreview({
            scope: 'answers',
            sortBy: newSortBy,
            total: newSortCache.total ?? newSortCache.list.length,
            items: newSortCache.list,
            source: 'cache-switch',
            cacheState: 'screen-cache',
            otherSortBy: newSortBy === 'featured' ? 'newest' : 'featured',
            otherItems: answersCache[newSortBy === 'featured' ? 'newest' : 'featured']?.list || []
          });
        }
      }
    }
  };

  // 处理回答收藏/取消收藏 - 带防抖和请求去重
  const handleAnswerCollect = async answerId => {
    const answer = findAnswerByAnyId(answerId);
    console.log('🔍 收藏操作:');
    console.log('  answerId:', answerId);
    if (!answerId) {
      console.error('❌ 回答ID不存在');
      showToast('操作失败：回答ID不存在', 'error');
      return;
    }

    // 防止重复请求
    if (answerCollectLoading[answerId]) {
      console.log('🚫 收藏请求进行中，忽略重复点击:', answerId);
      return;
    }

    // 清除之前的防抖定时器
    if (answerCollectDebounce[answerId]) {
      clearTimeout(answerCollectDebounce[answerId]);
    }

    // 立即更新UI状态，提供即时反馈
    const currentState = answerBookmarked[answerId] !== undefined ? answerBookmarked[answerId] : !!answer?.collected;
    const newState = !currentState;
    setAnswerBookmarked(prev => ({
      ...prev,
      [answerId]: newState
    }));

    // 设置防抖定时器
    const debounceTimer = setTimeout(async () => {
      try {
        // 设置加载状态，防止重复请求
        setAnswerCollectLoading(prev => ({
          ...prev,
          [answerId]: true
        }));
        console.log(`📤 ${newState ? '收藏' : '取消收藏'}回答: id=${answerId}`);

        // 根据当前状态调用不同的接口
        const response = newState ? await answerApi.collectAnswer(answerId) : await answerApi.uncollectAnswer(answerId);
        console.log('📥 收藏响应:', response);
        if (response && response.code === 200) {
          const currentCollectCount = Number(answer?.collectCount ?? answer?.bookmarkCount ?? answer?.bookmark_count ?? answer?.bookmarks ?? 0) || 0;
          const fallbackCollectCount = Math.max(0, currentCollectCount + (newState ? 1 : -1));
          const updatedAnswer = buildAnswerFromMutationResponse(answer || {
            id: answerId
          }, response.data, {
            collected: newState,
            collectCount: fallbackCollectCount
          });
          mergeUpdatedAnswerIntoCaches(updatedAnswer);
          showToast(updatedAnswer.collected ? '已收藏' : '已取消收藏', 'success');
        } else {
          const duplicateCollectError = newState && typeof response?.msg === 'string' && response.msg.includes('content_collect.uk_user_question');
          if (duplicateCollectError) {
            const answerQuestionId = getAnswerQuestionId(answer) ?? route?.params?.id;
            setAnswerBookmarked(prev => ({
              ...prev,
              [answerId]: currentState
            }));
            if (answerQuestionId) {
              loadAnswersList(answerQuestionId, true, answersSortBy);
            }
            showToast('当前问题下已存在收藏记录，需后端修复收藏唯一键限制', 'error');
            return;
          }

          // 服务器返回失败，回滚UI状态
          console.error('❌ 收藏操作失败:', response);
          setAnswerBookmarked(prev => ({
            ...prev,
            [answerId]: currentState // 回滚到原状态
          }));
          showToast(response?.msg || '操作失败', 'error');
        }
      } catch (error) {
        console.error('❌ 收藏请求异常:', error);

        // 网络错误，回滚UI状态
        setAnswerBookmarked(prev => ({
          ...prev,
          [answerId]: currentState // 回滚到原状态
        }));
        showToast('网络错误，请稍后重试', 'error');
      } finally {
        // 清除加载状态
        setAnswerCollectLoading(prev => ({
          ...prev,
          [answerId]: false
        }));

        // 清除防抖定时器引用
        setAnswerCollectDebounce(prev => {
          const newState = {
            ...prev
          };
          delete newState[answerId];
          return newState;
        });
      }
    }, 300); // 300ms防抖延迟

    // 保存防抖定时器引用
    setAnswerCollectDebounce(prev => ({
      ...prev,
      [answerId]: debounceTimer
    }));
  };

  // 处理回答点赞/取消点赞 - 带防抖和请求去重
  const handleAnswerLike = async answerId => {
    const answer = findAnswerByAnyId(answerId);
    console.log('🔍 点赞操作:');
    console.log('  answerId:', answerId);
    if (!answerId) {
      console.error('❌ 回答ID不存在');
      showToast('操作失败：回答ID不存在', 'error');
      return;
    }

    // 防止重复请求
    if (answerLikeLoading[answerId]) {
      console.log('🚫 点赞请求进行中，忽略重复点击:', answerId);
      return;
    }

    // 清除之前的防抖定时器
    if (answerLikeDebounce[answerId]) {
      clearTimeout(answerLikeDebounce[answerId]);
    }

    // 立即更新UI状态，提供即时反馈
    const currentState = getAnswerLikedState(answerId, answer);
    const currentDislikedState = getAnswerDislikedState(answerId, answer);
    if (isLikeInteractionDisabled(currentState, currentDislikedState)) {
      return;
    }
    const newState = !currentState;
    setAnswerLiked(prev => ({
      ...prev,
      [answerId]: newState
    }));

    // 设置防抖定时器
    const debounceTimer = setTimeout(async () => {
      try {
        // 设置加载状态，防止重复请求
        setAnswerLikeLoading(prev => ({
          ...prev,
          [answerId]: true
        }));
        console.log(`📤 ${newState ? '点赞' : '取消点赞'}回答: id=${answerId}`);

        // 根据当前状态调用不同的接口
        const response = newState ? await answerApi.likeAnswer(answerId) : await answerApi.unlikeAnswer(answerId);
        console.log('📥 点赞响应:', response);
        if (response && response.code === 200) {
          // 服务器返回成功，保持UI状态
          showToast(newState ? '已点赞' : '已取消点赞', 'success');
        } else {
          // 服务器返回失败，回滚UI状态
          console.error('❌ 点赞操作失败:', response);
          setAnswerLiked(prev => ({
            ...prev,
            [answerId]: currentState // 回滚到原状态
          }));
          showToast(response?.msg || '操作失败', 'error');
        }
      } catch (error) {
        console.error('❌ 点赞请求异常:', error);

        // 网络错误，回滚UI状态
        setAnswerLiked(prev => ({
          ...prev,
          [answerId]: currentState // 回滚到原状态
        }));
        showToast('网络错误，请稍后重试', 'error');
      } finally {
        // 清除加载状态
        setAnswerLikeLoading(prev => ({
          ...prev,
          [answerId]: false
        }));

        // 清除防抖定时器引用
        setAnswerLikeDebounce(prev => {
          const newState = {
            ...prev
          };
          delete newState[answerId];
          return newState;
        });
      }
    }, 300); // 300ms防抖延迟

    // 保存防抖定时器引用
    setAnswerLikeDebounce(prev => ({
      ...prev,
      [answerId]: debounceTimer
    }));
  };

  // 处理回答点踩/取消点踩 - 带防抖和请求去重
  const handleAnswerDislike = async answerId => {
    const answer = findAnswerByAnyId(answerId);
    console.log('🔍 点踩操作:');
    console.log('  answerId:', answerId);
    if (!answerId) {
      console.error('❌ 回答ID不存在');
      showToast('操作失败：回答ID不存在', 'error');
      return;
    }

    // 防止重复请求
    if (answerDislikeLoading[answerId]) {
      console.log('🚫 点踩请求进行中，忽略重复点击:', answerId);
      return;
    }

    // 清除之前的防抖定时器
    if (answerDislikeDebounce[answerId]) {
      clearTimeout(answerDislikeDebounce[answerId]);
    }

    // 立即更新UI状态，提供即时反馈
    const currentState = getAnswerDislikedState(answerId, answer);
    const currentLikedState = getAnswerLikedState(answerId, answer);
    if (isDislikeInteractionDisabled(currentLikedState, currentState)) {
      return;
    }
    const newState = !currentState;
    setAnswerDisliked(prev => ({
      ...prev,
      [answerId]: newState
    }));

    // 设置防抖定时器
    const debounceTimer = setTimeout(async () => {
      try {
        // 设置加载状态，防止重复请求
        setAnswerDislikeLoading(prev => ({
          ...prev,
          [answerId]: true
        }));
        console.log(`📤 ${newState ? '点踩' : '取消踩'}回答: id=${answerId}`);

        // 根据当前状态调用不同的接口
        const response = newState ? await answerApi.dislikeAnswer(answerId) : await answerApi.undislikeAnswer(answerId);
        console.log('📥 点踩响应:', response);
        if (response && response.code === 200) {
          // 服务器返回成功，保持UI状态
          showToast(newState ? '已踩' : '已取消踩', 'success');
        } else {
          // 服务器返回失败，回滚UI状态
          console.error('❌ 点踩操作失败:', response);
          setAnswerDisliked(prev => ({
            ...prev,
            [answerId]: currentState // 回滚到原状态
          }));
          showToast(response?.msg || '操作失败', 'error');
        }
      } catch (error) {
        console.error('❌ 点踩请求异常:', error);

        // 网络错误，回滚UI状态
        setAnswerDisliked(prev => ({
          ...prev,
          [answerId]: currentState // 回滚到原状态
        }));
        showToast('网络错误，请稍后重试', 'error');
      } finally {
        // 清除加载状态
        setAnswerDislikeLoading(prev => ({
          ...prev,
          [answerId]: false
        }));

        // 清除防抖定时器引用
        setAnswerDislikeDebounce(prev => {
          const newState = {
            ...prev
          };
          delete newState[answerId];
          return newState;
        });
      }
    }, 300); // 300ms防抖延迟

    // 保存防抖定时器引用
    setAnswerDislikeDebounce(prev => ({
      ...prev,
      [answerId]: debounceTimer
    }));
  };
  const getAnswerPrimaryId = answer => {
    if (!answer || typeof answer !== 'object') {
      return null;
    }
    return answer.answerId ?? answer.answer_id ?? answer.id ?? null;
  };
  const getAnswerQuestionId = answer => {
    if (!answer || typeof answer !== 'object') {
      return null;
    }
    return answer.questionId ?? answer.question_id ?? answer.question?.id ?? null;
  };
  const getAnswerIdentityKey = answer => {
    const primaryId = getAnswerPrimaryId(answer);
    return primaryId !== null && primaryId !== undefined ? String(primaryId) : '';
  };
  const findAnswerByAnyId = targetId => {
    if (targetId === null || targetId === undefined) {
      return null;
    }
    return answersList.find(item => {
      const candidateIds = [item?.id, item?.answerId, item?.answer_id].filter(value => value !== null && value !== undefined).map(value => String(value));
      return candidateIds.includes(String(targetId));
    }) || null;
  };

  // 处理回答采纳/取消采纳
  const handleAnswerAdopt = async (questionId, answerId) => {
    const answer = findAnswerByAnyId(answerId);
    const answerStateKey = answer ? getAnswerIdentityKey(answer) : String(answerId);
    console.log('🔍 采纳操作:');
    console.log('  questionId:', questionId, typeof questionId);
    console.log('  answerId:', answerId, typeof answerId);
    console.log('  answer对象关键信息:', answer ? {
      id: answer.id,
      answerId: answer.answerId,
      answer_id: answer.answer_id,
      questionId: answer.questionId,
      question_id: answer.question_id
    } : null);
    if (!answerId) {
      console.error('❌ 回答ID不存在');
      showToast('操作失败：回答ID不存在', 'error');
      return;
    }
    const answerQuestionId = getAnswerQuestionId(answer);
    const routeQuestionId = route?.params?.id;
    console.log('  routeQuestionId:', routeQuestionId, typeof routeQuestionId);
    console.log('  answerQuestionId:', answerQuestionId, typeof answerQuestionId);
    if (!questionId) {
      console.error('❌ 问题ID不存在');
      showToast('操作失败：问题ID不存在', 'error');
      return;
    }
    if (answerQuestionId !== null && answerQuestionId !== undefined && routeQuestionId !== null && routeQuestionId !== undefined && String(answerQuestionId) !== String(routeQuestionId)) {
      console.error('❌ 回答所属问题与当前页面不一致:', {
        routeQuestionId,
        answerQuestionId,
        answerId
      });
      showToast('回答数据与当前问题不一致，请刷新后重试', 'error');
      return;
    }

    // 防止重复请求
    if (answerAdoptLoading[answerStateKey]) {
      console.log('🚫 采纳请求进行中，忽略重复点击:', answerId);
      return;
    }

    // 获取当前采纳状态
    const currentState = answerAdopted[answerStateKey] !== undefined ? answerAdopted[answerStateKey] : answer?.adopted || false;

    // 如果已经采纳，不允许取消采纳（根据需求，采纳后不能再次点击更改状态）
    if (currentState) {
      showToast('该回答已被采纳，无法更改状态', 'warning');
      return;
    }
    try {
      // 设置加载状态，防止重复请求
      setAnswerAdoptLoading(prev => ({
        ...prev,
        [answerStateKey]: true
      }));
      console.log(`📤 采纳回答: questionId=${questionId}, answerId=${answerId}`);
      console.log('  参数类型检查:', {
        questionId: typeof questionId,
        answerId: typeof answerId,
        questionIdValid: !isNaN(parseInt(questionId)),
        answerIdValid: !isNaN(parseInt(answerId))
      });
      const response = await answerApi.adoptAnswer(questionId, answerId);
      console.log('📥 采纳响应:', response);
      if (response && response.code === 200) {
        // 服务器返回成功，更新UI状态
        setAnswerAdopted(prev => ({
          ...prev,
          [answerStateKey]: true
        }));
        showToast('已采纳该回答', 'success');

        // 可选：刷新回答列表以获取最新状态
        if (questionId) {
          // 清除缓存，重新加载
          setAnswersCache(prevCache => ({
            ...prevCache,
            [answersSortBy]: {
              ...prevCache[answersSortBy],
              loaded: false
            }
          }));
          loadAnswersList(questionId, true, answersSortBy);
        }
      } else {
        console.error('❌ 采纳操作失败:', response);
        const errorMsg = response?.msg || '采纳失败';
        showToast(errorMsg, 'error');

        // 如果是"问题与回答不匹配"错误，提供更详细的信息
        if (errorMsg.includes('不匹配')) {
          console.error('🔍 详细错误信息:');
          console.error('  - 可能原因1: 问题ID或回答ID无效');
          console.error('  - 可能原因2: 该回答不属于当前问题');
          console.error('  - 可能原因3: 参数类型错误');
          console.error('  - 当前参数:', {
            questionId,
            answerId
          });
        }
      }
    } catch (error) {
      console.error('❌ 采纳请求异常:', error);
      console.error('  错误详情:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      let errorMessage = '网络错误，请稍后重试';

      // 根据具体错误提供更准确的提示
      if (error.response?.status === 500) {
        errorMessage = '服务器错误，请检查参数是否正确';
      } else if (error.response?.status === 404) {
        errorMessage = '接口不存在，请检查接口地址';
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      }
      showToast(errorMessage, 'error');
    } finally {
      // 清除加载状态
      setAnswerAdoptLoading(prev => ({
        ...prev,
        [answerStateKey]: false
      }));
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      Object.values(answerCollectDebounce).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      Object.values(answerDislikeDebounce).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      Object.values(answerLikeDebounce).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [answerCollectDebounce, answerDislikeDebounce, answerLikeDebounce]);
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      showToast('请输入回答内容', 'warning');
      return;
    }
    try {
      const questionId = route?.params?.id;
      if (!questionId) {
        showToast('问题ID不存在', 'error');
        return;
      }

      // 上传图片（如果有）
      let imageUrls = [];
      if (answerImages.length > 0) {
        try {
          console.log('📤 开始上传回答图片，共', answerImages.length, '张');
          for (let i = 0; i < answerImages.length; i++) {
            const imageUri = answerImages[i];
            console.log(`  上传第 ${i + 1} 张图片:`, imageUri);
            const result = await uploadApi.uploadImage({
              uri: imageUri,
              name: `answer_${Date.now()}_${i}.jpg`,
              type: 'image/jpeg'
            });
            console.log(`  第 ${i + 1} 张图片上传响应:`, result);
            if (result.code === 200 && result.data) {
              imageUrls.push(result.data);
              console.log(`  ✅ 第 ${i + 1} 张图片上传成功:`, result.data);
            } else {
              console.error(`  ❌ 第 ${i + 1} 张图片上传失败:`, result);
              showToast(`第 ${i + 1} 张图片上传失败`, 'error');
              return;
            }
          }
          console.log('✅ 所有图片上传成功，URLs:', imageUrls);
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          showToast('图片上传失败，请重试', 'error');
          return;
        }
      }

      // 构建请求参数
      const answerCreateRequest = {
        content: answerText.trim()
      };

      // 添加可选参数
      if (imageUrls.length > 0) {
        answerCreateRequest.imageUrls = imageUrls;
      }

      // 如果是回答补充问题，添加supplementId
      if (currentSupplement && currentSupplement.id) {
        answerCreateRequest.supplementId = currentSupplement.id;
      }

      // TODO: 如果有邀请人，添加invitedBy
      // answerCreateRequest.invitedBy = invitedByUserId;

      console.log('📤 提交回答:');
      console.log('  questionId:', questionId);
      console.log('  answerCreateRequest:', answerCreateRequest);
      const response = await answerApi.publishAnswer(questionId, answerCreateRequest);
      console.log('📥 回答发布响应:', response);
      if (response && response.code === 200) {
        showToast('回答发布成功', 'success');
        setAnswerText('');
        setAnswerImages([]);
        setShowAnswerModal(false);
        setCurrentSupplement(null);

        // 清除所有回答列表缓存，确保显示最新数据
        setAnswersCache({
          featured: {
            list: [],
            total: 0,
            pageNum: 1,
            hasMore: true,
            loaded: false,
            lastUpdated: null
          },
          newest: {
            list: [],
            total: 0,
            pageNum: 1,
            hasMore: true,
            loaded: false,
            lastUpdated: null
          }
        });

        // 新发布的回答更可能先出现在“最新”排序里，优先切过去避免数量有但列表空
        setAnswersSortBy('newest');
        loadAnswersList(questionId, true, 'newest');
      } else {
        showToast(response?.msg || '发布失败', 'error');
      }
    } catch (error) {
      console.error('发布回答失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };
  const handleSubmitSupplement = async () => {
    if (!supplementText.trim()) {
      showToast('请输入补充内容', 'warning');
      return;
    }
    const blockedReason = getSupplementPublishBlockedReason();
    if (blockedReason) {
      showToast(blockedReason, 'warning');
      return;
    }
    try {
      const questionId = route?.params?.id;
      if (!questionId) {
        showToast('问题ID不存在', 'error');
        return;
      }

      // 上传图片（如果有）
      let imageUrls = [];
      if (supplementImages.length > 0) {
        try {
          console.log('📤 开始上传补充问题图片，共', supplementImages.length, '张');
          for (let i = 0; i < supplementImages.length; i++) {
            const imageUri = supplementImages[i];
            console.log(`  上传第 ${i + 1} 张图片:`, imageUri);
            const result = await uploadApi.uploadImage({
              uri: imageUri,
              name: `supplement_${Date.now()}_${i}.jpg`,
              type: 'image/jpeg'
            });
            console.log(`  第 ${i + 1} 张图片上传响应:`, result);
            if (result.code === 200 && result.data) {
              imageUrls.push(result.data);
              console.log(`  ✅ 第 ${i + 1} 张图片上传成功:`, result.data);
            } else {
              console.error(`  ❌ 第 ${i + 1} 张图片上传失败:`, result);
              showToast(`第 ${i + 1} 张图片上传失败`, 'error');
              return;
            }
          }
          console.log('✅ 所有图片上传成功，URLs:', imageUrls);
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          showToast('图片上传失败，请重试', 'error');
          return;
        }
      }
      const supplementCreateRequest = {
        content: supplementText.trim(),
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      };
      console.log('📤 提交补充问题:');
      console.log('  questionId:', questionId);
      console.log('  supplementCreateRequest:', supplementCreateRequest);
      const rawResponse = await questionApi.publishSupplement(questionId, supplementCreateRequest);
      const response = extractBusinessResponse(rawResponse);
      console.log('📥 补充问题发布响应:', rawResponse);
      console.log('📥 补充问题发布业务响应:', response);
      if (response && response.code === 200) {
        showToast('补充问题发布成功', 'success');
        setSupplementText('');
        setSupplementImages([]);
        setShowSupplementModal(false);

        // 清除所有补充列表缓存，确保显示最新数据
        setSupplementsCache({
          featured: {
            list: [],
            total: 0,
            pageNum: 1,
            hasMore: true,
            loaded: false,
            lastUpdated: null
          },
          newest: {
            list: [],
            total: 0,
            pageNum: 1,
            hasMore: true,
            loaded: false,
            lastUpdated: null
          }
        });

        // 新发布的补充优先在“最新”排序下可见
        setSupplementsSortBy('newest');
        loadSupplementsList(questionId, true, 'newest');
      } else {
        const responseMessage = response?.msg || response?.message || rawResponse?.msg || rawResponse?.message || '发布失败';
        if (isSupplementPublishBlockedMessage(responseMessage)) {
          setSupplementPublishBlockedMessage(responseMessage);
        }
        showToast(responseMessage, 'error');
      }
    } catch (error) {
      console.error('发布补充问题失败:', error);
      const errorMessage = error?.data?.msg || error?.response?.data?.msg || error?.message || '网络错误，请稍后重试';
      if (isSupplementPublishBlockedMessage(errorMessage)) {
        setSupplementPublishBlockedMessage(errorMessage);
      }
      showToast(errorMessage, 'error');
    }
  };
  const handleSubmitSupplementAnswer = () => {
    if (!supplementAnswerText.trim()) return;
    setSupplementAnswerText('');
    setShowSupplementAnswerModal(false);
    setCurrentAnswer(null);
    setShowSupplementAnswerSuccessModal(true);
  };

  // 处理补充问题的踩一下/取消踩一下
  const handleSupplementDislike = async supplementId => {
    try {
      console.log('👎 处理补充问题踩一下: id=', supplementId);
      const currentSupplement = getSupplementById(supplementId);
      const currentDisliked = getSupplementDislikedState(supplementId, currentSupplement);
      const currentLiked = getSupplementLikedState(supplementId, currentSupplement);
      if (isDislikeInteractionDisabled(currentLiked, currentDisliked)) {
        return;
      }
      const baseDislikeCount = getSupplementDislikeDisplayCount(currentSupplement, currentDisliked);
      const nextDisliked = !currentDisliked;
      const fallbackDislikeCount = Math.max(baseDislikeCount + (nextDisliked ? 1 : -1), 0);
      const response = currentDisliked ? await questionApi.undislikeSupplement(supplementId) : await questionApi.dislikeSupplement(supplementId);
      console.log('📥 踩一下响应:', response);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          disliked: nextDisliked,
          dislikeCount: fallbackDislikeCount
        });
        setSuppDisliked(prev => ({
          ...prev,
          [supplementId]: !!updatedSupplement.disliked
        }));
        updateSupplementInCaches(supplementId, previousItem => ({
          ...previousItem,
          ...updatedSupplement
        }));

        // 显示提示
        showToast(updatedSupplement.disliked ? '已踩' : '已取消踩', 'success');

        // 关闭弹窗
        setShowSuppMoreModal(false);
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('踩一下补充问题失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };

  // 处理补充问题的点赞/取消点赞
  const handleSupplementLike = async supplementId => {
    try {
      console.log('👍 处理补充问题点赞: id=', supplementId);
      const currentSupplement = supplementsCache[supplementsSortBy]?.list?.find(item => String(item?.id) === String(supplementId)) || Object.values(supplementsCache).flatMap(entry => entry?.list || []).find(item => String(item?.id) === String(supplementId));
      const currentLiked = getSupplementLikedState(supplementId, currentSupplement);
      const currentDisliked = getSupplementDislikedState(supplementId, currentSupplement);
      if (isLikeInteractionDisabled(currentLiked, currentDisliked)) {
        return;
      }
      const baseLikeCount = getSupplementLikeDisplayCount(currentSupplement, currentLiked);
      const nextLiked = !currentLiked;
      const fallbackLikeCount = Math.max(baseLikeCount + (nextLiked ? 1 : -1), 0);
      const response = currentLiked ? await questionApi.unlikeSupplement(supplementId) : await questionApi.likeSupplement(supplementId);
      console.log('📥 点赞响应:', response);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          liked: nextLiked,
          likeCount: fallbackLikeCount
        });
        setSuppLiked(prev => ({
          ...prev,
          [supplementId]: !!updatedSupplement.liked
        }));
        updateSupplementInCaches(supplementId, previousItem => ({
          ...previousItem,
          ...updatedSupplement
        }));

        // 显示提示
        showToast(updatedSupplement.liked ? '已点赞' : '已取消点赞', 'success');
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('点赞补充问题失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };
  const handleSupplementCollect = async supplementId => {
    try {
      console.log('⭐ 处理补充问题收藏: id=', supplementId);
      const currentSupplement = getSupplementById(supplementId);
      const supplementQuestionId = currentSupplement?.questionId ?? null;

      // 后端当前会依赖补充记录上的 questionId；缺失时继续请求只会得到 500。
      if (!supplementQuestionId) {
        console.warn('⚠️ 补充收藏缺少 questionId，已阻止请求:', currentSupplement);
        showToast('当前补充数据异常，暂时无法收藏', 'error');
        return;
      }
      const currentCollected = suppBookmarked[supplementId] ?? currentSupplement?.collected ?? false;
      const baseCollectCount = Number(currentSupplement?.collectCount ?? currentSupplement?.bookmarkCount ?? currentSupplement?.bookmarks) || 0;
      const nextCollected = !currentCollected;
      const fallbackCollectCount = Math.max(baseCollectCount + (nextCollected ? 1 : -1), 0);
      const response = currentCollected ? await questionApi.uncollectSupplement(supplementId) : await questionApi.collectSupplement(supplementId);
      console.log('📥 收藏响应:', response);
      if (response && response.code === 200) {
        const updatedSupplement = buildSupplementMutationResult(currentSupplement, response.data, {
          collected: nextCollected,
          collectCount: fallbackCollectCount
        });
        setSuppBookmarked(prev => ({
          ...prev,
          [supplementId]: !!updatedSupplement.collected
        }));
        updateSupplementInCaches(supplementId, previousItem => ({
          ...previousItem,
          ...updatedSupplement
        }));
        showToast(updatedSupplement.collected ? '已收藏' : '已取消收藏', 'success');
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('收藏补充问题失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };

  // 处理分享功能
  const handleShare = (platform, shareData) => {
    console.log('分享到:', platform, shareData);
    
    switch (platform) {
      case 'twitter':
      case 'link':
        console.log('分享链接:', shareData?.url);
        break;
      default:
        break;
    }
  };
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
  const buildQuestionSharePayload = () => ({
    title: questionData?.title || '',
    content: questionData?.content || '',
    type: 'sharequestion',
    qid: Number(route?.params?.id ?? questionData?.id) || null
  });
  const openTwitterInviteEditor = user => {
    const sharePayload = buildQuestionSharePayload();
    const defaultShareText = buildTwitterShareText(sharePayload);
    const normalizedHandle = typeof user?.name === 'string' ? user.name.trim() : '';
    const prefixedHandle = normalizedHandle
      ? normalizedHandle.startsWith('@')
        ? normalizedHandle
        : `@${normalizedHandle}`
      : '';

    setSelectedTwitterInviteUser(user);
    setTwitterInviteDraftText(
      prefixedHandle ? `${prefixedHandle} ${defaultShareText}` : defaultShareText
    );
    setShowTwitterInviteEditor(true);
  };
  const handleTwitterInviteShare = async customShareText => {
    setPendingTwitterInvitePlatform('twitter');

    try {
      const result = await openTwitterShare({
        ...buildQuestionSharePayload(),
        shareText: customShareText
      });

      if (result?.openedVia === 'browser') {
        showToast('Twitter app not installed, opened web share', 'info');
      }

      setShowTwitterInviteEditor(false);
      setTwitterInviteDraftText('');
      setSelectedTwitterInviteUser(null);
    } catch (error) {
      console.error('Failed to invite via twitter:', error);
      showToast('Unable to open Twitter', 'error');
    } finally {
      setPendingTwitterInvitePlatform(null);
    }
  };
  const resolveShareTargetId = (...values) => {
    for (const value of values) {
      const normalizedValue = Number(value);
      if (normalizedValue) {
        return normalizedValue;
      }
    }
    return null;
  };
  const buildAnswerSharePayload = answer => ({
    title: questionData?.title || '',
    content: answer?.content || questionData?.content || '',
    type: 'shareanswer',
    qid: Number(route?.params?.id ?? questionData?.id) || null,
    aid: resolveShareTargetId(getAnswerPrimaryId(answer), answer?.id, answer?.answerId, answer?.answer_id)
  });
  const buildSupplementSharePayload = supplement => ({
    title: questionData?.title || '',
    content: supplement?.content || questionData?.content || '',
    type: 'sharesupplement',
    qid: Number(route?.params?.id ?? questionData?.id) || null,
    sid: resolveShareTargetId(getSupplementTargetId(supplement), supplement?.id, supplement?.supplementId, supplement?.supplement_id)
  });
  const buildQuestionCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getQuestionCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    return {
      title: questionData?.title || '',
      content: comment?.content || questionData?.content || '',
      type: 'sharecomment',
      qid: Number(route?.params?.id ?? questionData?.id) || null,
      cid: commentId,
      rootCid
    };
  };
  const buildAnswerCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getAnswerCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    const relationCommentId = Number(comment?.replyToCommentId ?? comment?.parentId ?? 0) || null;
    const relationComment = relationCommentId ? findAnswerCommentById(relationCommentId) : null;
    const answerId = resolveShareTargetId(comment?.targetId, comment?.target_id, comment?.answerId, comment?.answer_id, relationComment?.targetId, relationComment?.target_id, currentAnswerId);
    return {
      title: questionData?.title || '',
      content: comment?.content || questionData?.content || '',
      type: 'sharecomment',
      qid: Number(route?.params?.id ?? questionData?.id) || null,
      aid: answerId,
      cid: commentId,
      rootCid
    };
  };
  const buildSupplementCommentSharePayload = comment => {
    const commentId = Number(comment?.id ?? comment?.commentId ?? comment?.comment_id ?? 0) || null;
    const rootCid = commentId ? Number(getSupplementCommentThreadRootId(commentId) ?? commentId) || commentId : null;
    const relationCommentId = Number(comment?.replyToCommentId ?? comment?.parentId ?? 0) || null;
    const relationComment = relationCommentId ? findSupplementCommentById(relationCommentId) : null;
    const supplementId = resolveShareTargetId(comment?.targetId, comment?.target_id, comment?.supplementId, comment?.supplement_id, relationComment?.targetId, relationComment?.target_id, currentSuppId);
    return {
      title: questionData?.title || '',
      content: comment?.content || questionData?.content || '',
      type: 'sharecomment',
      qid: Number(route?.params?.id ?? questionData?.id) || null,
      sid: supplementId,
      cid: commentId,
      rootCid
    };
  };

  const handleQuestionLike = async () => {
    if (!questionData?.id) {
      showToast('问题ID不存在', 'error');
      return;
    }
    try {
      const currentLiked = getQuestionLikedState();
      const currentDisliked = getQuestionDislikedState();
      if (isLikeInteractionDisabled(currentLiked, currentDisliked)) {
        return;
      }
      const baseLikeCount = Number(questionData.likeCount ?? questionData.likes) || 0;
      const nextLiked = !currentLiked;
      const fallbackLikeCount = Math.max(baseLikeCount + (nextLiked ? 1 : -1), 0);
      const response = currentLiked ? await questionApi.unlikeQuestion(questionData.id) : await questionApi.likeQuestion(questionData.id);
      console.log('📥 问题点赞响应:', response);
      if (response && response.code === 200) {
        const updatedQuestion = buildQuestionMutationResult(questionData, response.data, {
          liked: nextLiked,
          likeCount: fallbackLikeCount
        });
        setLiked(prev => ({
          ...prev,
          main: !!updatedQuestion.liked
        }));
        setQuestionData(updatedQuestion);
        showToast(updatedQuestion.liked ? '已点赞' : '已取消点赞', 'success');
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('问题点赞失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };
  const handleQuestionCollect = async () => {
    if (!questionData?.id) {
      showToast('问题ID不存在', 'error');
      return;
    }
    try {
      const currentCollected = bookmarked ?? questionData.collected ?? false;
      const baseCollectCount = Number(questionData.collectCount ?? questionData.bookmarkCount ?? questionData.bookmarks) || 0;
      const nextCollected = !currentCollected;
      const fallbackCollectCount = Math.max(baseCollectCount + (nextCollected ? 1 : -1), 0);
      const response = currentCollected ? await questionApi.uncollectQuestion(questionData.id) : await questionApi.collectQuestion(questionData.id);
      console.log('📥 问题收藏响应:', response);
      if (response && response.code === 200) {
        const updatedQuestion = buildQuestionMutationResult(questionData, response.data, {
          collected: nextCollected,
          collectCount: fallbackCollectCount
        });
        setBookmarked(!!updatedQuestion.collected);
        setQuestionData(updatedQuestion);
        showToast(updatedQuestion.collected ? '已收藏' : '已取消收藏', 'success');
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('问题收藏失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };
  const handleQuestionDislike = async () => {
    if (!questionData?.id) {
      showToast('问题ID不存在', 'error');
      return;
    }
    try {
      const currentDisliked = getQuestionDislikedState();
      const currentLiked = getQuestionLikedState();
      if (isDislikeInteractionDisabled(currentLiked, currentDisliked)) {
        return;
      }
      const baseDislikeCount = Number(questionData.dislikeCount ?? questionData.dislikes) || 0;
      const nextDisliked = !currentDisliked;
      const fallbackDislikeCount = Math.max(baseDislikeCount + (nextDisliked ? 1 : -1), 0);
      const response = currentDisliked ? await questionApi.undislikeQuestion(questionData.id) : await questionApi.dislikeQuestion(questionData.id);
      console.log('📥 问题点踩响应:', response);
      if (response && response.code === 200) {
        const updatedQuestion = buildQuestionMutationResult(questionData, response.data, {
          disliked: nextDisliked,
          dislikeCount: fallbackDislikeCount
        });
        setLiked(prev => ({
          ...prev,
          dislike: !!updatedQuestion.disliked
        }));
        setQuestionData(updatedQuestion);
        showToast(updatedQuestion.disliked ? '已踩' : '已取消踩', 'success');
      } else {
        showToast(response?.msg || '操作失败', 'error');
      }
    } catch (error) {
      console.error('问题点踩失败:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };

  // 处理追加悬赏
  const handleAddReward = () => {
    const amount = selectedAddRewardAmount || parseFloat(addRewardAmount);
    if (!amount || amount <= 0) {
      alert('请输入有效的悬赏金额');
      return;
    }
    if (amount < 5) {
      alert('最低追加金额为 $5');
      return;
    }
    if (amount > 1000) {
      alert('单次追加金额不能超过 $1000');
      return;
    }
    setCurrentReward(currentReward + amount);
    setRewardContributors(rewardContributors + 1);
    alert(`成功追加 $${amount} 悬赏！`);
    setShowAddRewardModal(false);
    setAddRewardAmount('');
    setSelectedAddRewardAmount(null);
  };

  // 处理购买超级赞
  const handleBuySuperLike = () => {
    const amount = selectedSuperLikeAmount || parseInt(superLikeAmount);
    if (!amount || amount <= 0) {
      alert('请输入有效的超级赞数量');
      return;
    }
    if (amount < 1) {
      alert('最少购买 1 个超级赞');
      return;
    }
    if (amount > 100) {
      alert('单次最多购买 100 个超级赞');
      return;
    }
    const answerId = currentAnswerForSuperLike.id;
    const currentCount = answerSuperLikes[answerId] || currentAnswerForSuperLike.superLikes || 0;
    setAnswerSuperLikes({
      ...answerSuperLikes,
      [answerId]: currentCount + amount
    });
    const totalCost = amount * 2; // 每个超级赞 $2
    alert(`成功购买 ${amount} 个超级赞！\n花费：$${totalCost}\n您的回答排名将会提升！`);
    setShowSuperLikeModal(false);
    setSuperLikeAmount('');
    setSelectedSuperLikeAmount(null);
    setCurrentAnswerForSuperLike(null);
  };

  // 处理仲裁申请
  const handleSubmitArbitration = () => {
    if (!arbitrationReason.trim()) {
      alert('请说明申请仲裁的理由');
      return;
    }
    if (selectedExperts.length < 3) {
      alert('至少需要邀请 3 位专家参与仲裁');
      return;
    }
    if (selectedExperts.length > 5) {
      alert('最多只能邀请 5 位专家');
      return;
    }

    // 提交仲裁申请
    setArbitrationStatus('pending');
    setArbitrationVotes({
      agree: 0,
      disagree: 0,
      total: selectedExperts.length
    });
    alert('仲裁申请已提交，等待专家投票中...');
    setShowArbitrationModal(false);
    setArbitrationReason('');
  };

  // 切换专家选择
  const toggleExpertSelection = expertId => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter(id => id !== expertId));
    } else {
      if (selectedExperts.length >= 5) {
        alert('最多只能邀请 5 位专家');
        return;
      }
      setSelectedExperts([...selectedExperts, expertId]);
    }
  };

  // 模拟专家投票（实际应该由专家操作）
  const simulateVoting = () => {
    // 随机生成投票结果
    const agreeVotes = Math.floor(Math.random() * (selectedExperts.length + 1));
    const disagreeVotes = selectedExperts.length - agreeVotes;
    const agreePercentage = agreeVotes / selectedExperts.length * 100;
    setArbitrationVotes({
      agree: agreeVotes,
      disagree: disagreeVotes,
      total: selectedExperts.length
    });
    if (agreePercentage > 50) {
      setArbitrationStatus('approved');
      setShowProgressBar(false); // 回到PK状态
      alert('仲裁通过！问题状态已回到PK状态');
    } else {
      setArbitrationStatus('rejected');
      alert('仲裁未通过，维持原采纳答案');
    }
  };

  // 加载更多数据的函数
  const loadMoreInvited = () => {
    if (loadingInvited) return;
    setLoadingInvited(true);
    setTimeout(() => {
      setInvitedPage(invitedPage + 1);
      setLoadingInvited(false);
    }, 1000);
  };
  const loadMoreSupplements = () => {
    if (loadingSupplements) return;
    setLoadingSupplements(true);
    setTimeout(() => {
      setSupplementsPage(supplementsPage + 1);
      setLoadingSupplements(false);
    }, 1000);
  };
  const loadMoreAnswers = () => {
    onAnswersLoadMore();
  };
  const loadMoreComments = () => {
    onCommentsLoadMore();
  };

  // 滚动监听处理
  const handleScroll = ({
    nativeEvent
  }) => {
    const {
      layoutMeasurement,
      contentOffset,
      contentSize
    } = nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isCloseToBottom && activeTab) {
      if (activeTabType === 'invite' && showAllInvited) {
        loadMoreInvited();
      } else if (activeTabType === 'supplements' && showAllSupplements) {
        loadMoreSupplements();
      } else if (activeTabType === 'answers' && showAllAnswers) {
        loadMoreAnswers();
      } else if (activeTabType === 'comments') {
        loadMoreComments();
      }
    }
  };
  const openQuestionGroupChat = React.useCallback(() => {
    const normalizedQuestionId = normalizeEntityId(
      route?.params?.id ?? questionData?.id ?? questionData?.questionId
    );

    if (!normalizedQuestionId) {
      showToast('问题ID不存在', 'error');
      return;
    }

    navigation.navigate('GroupChat', {
      questionId: normalizedQuestionId,
      groupId: normalizeEntityId(
        questionData?.groupId ??
          questionData?.publicGroupId ??
          questionData?.questionGroupId ??
          null
      ),
      question: {
        id: normalizedQuestionId,
        userId: normalizeEntityId(questionData?.userId),
        title: questionData?.title || '',
        author:
          questionData?.isAnonymous === 1
            ? '匿名用户'
            : questionData?.userName || questionData?.userNickname || '匿名用户',
        avatar:
          questionData?.userAvatar ||
          questionData?.authorAvatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=user${questionData?.userId || 'question'}`,
        groupId: normalizeEntityId(questionData?.groupId),
        publicGroupId: normalizeEntityId(questionData?.publicGroupId),
        questionGroupId: normalizeEntityId(questionData?.questionGroupId),
      },
    });
  }, [
    navigation,
    questionData?.authorAvatar,
    questionData?.groupId,
    questionData?.id,
    questionData?.isAnonymous,
    questionData?.publicGroupId,
    questionData?.questionGroupId,
    questionData?.questionId,
    questionData?.title,
    questionData?.userAvatar,
    questionData?.userId,
    questionData?.userName,
    questionData?.userNickname,
    route?.params?.id,
  ]);
  return <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.questionDetail.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => openShareModalWithData(buildQuestionSharePayload())} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Ionicons name="arrow-redo-outline" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Report', {
          type: 'question',
          targetType: 1,
          targetId: Number(route?.params?.id ?? questionData?.id) || 0
        })}>
            <Ionicons name="flag-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingBottom: bottomSafeInset + 76
    }}>
        {/* 骨架屏加载状态 */}
        {Boolean(loading && !questionData) && <QuestionDetailSkeleton />}

        {/* 错误状态 */}
        {Boolean(error && !loading) && <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => {
          const questionId = route?.params?.id;
          if (questionId) {
            setError(null);
            setQuestionData(null);
            setDetailReloadVersion(prev => prev + 1);
          }
        }}>
              <Text style={styles.retryBtnText}>重试</Text>
            </TouchableOpacity>
          </View>}

        {/* 问题内容 - 使用淡入动画 */}
        {Boolean(questionData) && <Animated.View style={{
        opacity: fadeAnim
      }}>
        <View style={styles.questionSection}>
          {/* 问题标题 - 使用真实数据 */}
          <Text style={styles.questionTitle}>
            {(currentQuestion.displayType === 'reward' || currentQuestion.displayType === 'targeted') && currentQuestion.reward > 0 && <Text style={styles.rewardTagInline}>${currentQuestion.reward} </Text>}
            {currentQuestion.title}
            {currentQuestion.status === 2 && (
              <Text style={styles.solvedTagInline}> {t('questionDetail.solved')}</Text>
            )}
          </Text>
          
          {/* 作者信息和操作按钮行 - 紧跟标题 */}
          <View style={styles.authorActionsRow}>
            <TouchableOpacity style={styles.authorInfoLeft} activeOpacity={0.7} onPress={() => openPublicProfile(questionData, {
            userId: questionData.publicUserId ?? questionData.authorId ?? questionData.userId,
            allowAnonymous: false
          })}>
              <Avatar uri={questionData.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${questionData.publicUserId ?? questionData.userId}`} name={questionData.userName || questionData.userNickname || '匿名用户'} size={32} />
              <View style={styles.authorMetaInfo}>
                <View style={styles.authorNameRow}>
                  <Text style={styles.smallAuthorName}>
                    {questionData.isAnonymous === 1 ? '匿名用户' : questionData.userName || questionData.userNickname || '匿名用户'}
                  </Text>
                  <TouchableOpacity style={styles.followBtnSmall}>
                    <Ionicons name="add" size={12} color="#ef4444" />
                    <Text style={styles.followBtnSmallText}>
                      {t('common.follow')}
                    </Text>
                    <Text style={styles.followCountText}>(1.2k)</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.smallPostTime}>
                  {formatTime(questionData.createTime || questionData.createdAt)} · {questionData.location || '未知'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.actionButtonsRight}>
              <TouchableOpacity style={styles.smallActionBtn} onPress={() => navigation.navigate('InviteAnswer')}>
                <Ionicons name="at" size={18} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionBtn} onPress={openQuestionGroupChat}>
                <Ionicons name="chatbubbles-outline" size={18} color="#8b5cf6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionBtn} onPress={() => navigation.navigate('QuestionTeams', {
                questionId: questionData.id,
                questionTitle: questionData.title
              })}>
                <Ionicons name="person-add-outline" size={18} color="#f59e0b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionBtn} onPress={() => navigation.navigate('QuestionActivityList', {
                questionId: questionData.id,
                questionTitle: questionData.title
              })}>
                <Ionicons name="calendar-outline" size={18} color="#22c55e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 问题描述 - 在用户信息栏下面，作为独立的内容块 */}
          {Boolean(questionData.description) && <Text style={styles.questionContent}>{questionData.description}</Text>}
          
          {/* 问题图片 */}
          {Boolean(questionData.imageUrls && questionData.imageUrls.length > 0) && <View style={styles.questionImagesContainer}>
              {questionData.imageUrls.map((imageUrl, index) => <Image key={index} source={{
              uri: imageUrl
            }} style={styles.questionImage} />)}
            </View>}
          
          {/* 悬赏信息卡片 - 只在有悬赏时显示 */}
          {questionData.bountyAmount > 0 && <View style={styles.rewardInfoCard}>
            <View style={styles.rewardInfoLeft}>
              {/* 金额 */}
              <Text style={styles.rewardAmountText} numberOfLines={1}>
                {rewardAmountDisplayText}
              </Text>
              
              {/* 追加按钮 */}
              <TouchableOpacity style={styles.addRewardBtn} onPress={() => navigation.navigate('AddReward', {
                currentReward,
                rewardContributors,
                sourceRouteKey: route.key
              })}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addRewardBtnText}>{t('screens.questionDetail.reward.add')}</Text>
              </TouchableOpacity>

              {/* 采纳进度 */}
              <View style={styles.adoptionProgressContainer}>
                <Text style={styles.adoptionProgressText}>
                  已采纳 {questionData.adoptRate !== undefined && questionData.adoptRate !== null ? `${questionData.adoptRate}%` : '0%'}
                </Text>
              </View>
            </View>

            {/* 追加人数 - 移到右侧 */}
            <TouchableOpacity style={styles.rewardContributorsRow} onPress={() => navigation.navigate('Contributors', {
              currentReward,
              rewardContributors
            })}>
              <Ionicons name="people-outline" size={12} color="#9ca3af" />
              <Text style={styles.rewardContributorsText}>{rewardContributors} {t('screens.questionDetail.reward.contributors')}</Text>
              <Ionicons name="chevron-forward" size={12} color="#9ca3af" />
            </TouchableOpacity>
          </View>}
          
          {/* 付费明细入口 - 只在付费问题中显示 */}
          {questionData.payViewAmount > 0 && (
            <TouchableOpacity 
              style={styles.paidDetailsCard}
              onPress={() => navigation.navigate('PaidUsersList', {
                questionId: questionData.id,
                totalAmount: Math.floor(questionData.payViewAmount / 100) * 3, // 示例：单价 * 人数
                paidCount: 3 // 示例数据
              })}
            >
              <View style={styles.paidDetailsLeft}>
                <Ionicons name="wallet-outline" size={20} color="#22c55e" />
                <Text style={styles.paidDetailsTitle}>查看付费明细</Text>
              </View>
              <View style={styles.paidDetailsRight}>
                <Text style={styles.paidDetailsCount}>3人已付费</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          )}
          
          <View style={styles.viewsAndTags}>
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={14} color="#9ca3af" />
              <Text style={styles.viewsText}>{formatNumber(questionData.viewCount || 0)} {t('screens.questionDetail.stats.views')}</Text>
            </View>
            {/* 话题标签 */}
            {Boolean(questionData.topicNames && questionData.topicNames.length > 0) && <View style={styles.topicTags}>
                {questionData.topicNames.map((topic, index) => <Text key={index} style={styles.topicTag}>#{topic}</Text>)}
              </View>}
          </View>
          {/* PK进度条 */}
          <View style={styles.pkSection}>
            {!showProgressBar ?
            // 初始按钮样式
            <View style={styles.pkRow}>
                <View style={styles.pkBarWrapper}>
                  <View style={styles.pkBar}>
                    <TouchableOpacity style={[styles.pkSolvedBar, isSolvedChoiceSelected && styles.pkSolvedBarSelected]} onPress={() => handleCommunitySolveVote('SOLVED')} activeOpacity={0.8}>
                      <Text style={[styles.pkSolvedText, isSolvedChoiceSelected && styles.pkChoiceTextSelected]}>{t('screens.questionDetail.pk.solved')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pkUnsolvedBar, isUnsolvedChoiceSelected && styles.pkUnsolvedBarSelected]} onPress={() => handleCommunitySolveVote('UNSOLVED')} activeOpacity={0.8}>
                      <Text style={[styles.pkUnsolvedText, isUnsolvedChoiceSelected && styles.pkChoiceTextSelected]}>{t('screens.questionDetail.pk.unsolved')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.pkCenterBadge}>
                    <Text style={styles.pkCenterText}>{t('screens.questionDetail.pk.pk')}</Text>
                  </View>
                </View>
              </View> :
            // 点击后显示进度条样式
            <View style={styles.pkProgressRow}>
                <View style={[styles.progressSolvedLabel, isSolvedChoiceSelected && styles.progressSolvedLabelActive]}>
                  <Text style={[styles.progressLabelText, isSolvedChoiceSelected && styles.progressSolvedLabelTextActive]}>已解决</Text>
                </View>
                <View style={styles.progressBarWrapper}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressSolvedFill, {
                    width: `${solvedPercentage}%`
                  }]} />
                    <View style={[styles.progressUnsolvedFill, {
                    width: `${100 - solvedPercentage}%`
                  }]} />
                  </View>
                  <View style={[styles.progressPercentLabel, {
                  left: `${solvedPercentage}%`
                }]}>
                    <Text style={styles.progressPercentText}>{solvedPercentage}%</Text>
                  </View>
                </View>
                <View style={[styles.progressUnsolvedLabel, isUnsolvedChoiceSelected && styles.progressUnsolvedLabelActive]}>
                  <Text style={[styles.progressLabelText, isUnsolvedChoiceSelected && styles.progressUnsolvedLabelTextActive]}>未解决</Text>
                </View>
              </View>}
          </View>
        </View>
        </Animated.View>}

        {/* 回答区域 */}
        <View style={styles.answersSection}>
          <View style={styles.answerTabs}>
            {answerTabs.map(tab => <TouchableOpacity key={tab} style={styles.answerTabItem} onPress={() => {
            setActiveTab(tab);
            setSortFilter('精选');
          }}>
                <Text style={[styles.answerTabText, activeTab === tab && styles.answerTabTextActive]}>{tab}</Text>
                {activeTab === tab && <View style={styles.answerTabIndicator} />}
              </TouchableOpacity>)}
          </View>

          {/* 筛选条 - 仅在补充、回答、评论时显示 */}
          <View style={[styles.sortFilterBar, {
          display: activeTabType && activeTabType !== 'invite' ? 'flex' : 'none'
        }]}>
            <View style={styles.sortFilterLeft}>
              {activeTabType === 'supplements' ? (
            // 补充问题的排序按钮
            <>
                  <TouchableOpacity style={[styles.sortFilterBtn, supplementsSortBy === 'featured' && styles.sortFilterBtnActive]} onPress={() => handleSupplementsSortChange('featured')}>
                    <Ionicons name="star" size={14} color={supplementsSortBy === 'featured' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, supplementsSortBy === 'featured' && styles.sortFilterTextActive]}>精选</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortFilterBtn, supplementsSortBy === 'newest' && styles.sortFilterBtnActive]} onPress={() => handleSupplementsSortChange('newest')}>
                    <Ionicons name="time" size={14} color={supplementsSortBy === 'newest' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, supplementsSortBy === 'newest' && styles.sortFilterTextActive]}>最新</Text>
                  </TouchableOpacity>
                </>
          ) : activeTabType === 'answers' ? (
            // 回答列表的排序按钮
            <>
                  <TouchableOpacity style={[styles.sortFilterBtn, answersSortBy === 'featured' && styles.sortFilterBtnActive]} onPress={() => handleAnswersSortChange('featured')}>
                    <Ionicons name="star" size={14} color={answersSortBy === 'featured' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, answersSortBy === 'featured' && styles.sortFilterTextActive]}>精选</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortFilterBtn, answersSortBy === 'newest' && styles.sortFilterBtnActive]} onPress={() => handleAnswersSortChange('newest')}>
                    <Ionicons name="time" size={14} color={answersSortBy === 'newest' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, answersSortBy === 'newest' && styles.sortFilterTextActive]}>最新</Text>
                  </TouchableOpacity>
                </>
          ) : (
            // 评论的排序按钮（保持原有逻辑）
            <>
                  <TouchableOpacity style={[styles.sortFilterBtn, commentsSortBy === 'likes' && styles.sortFilterBtnActive]} onPress={() => handleCommentsSortChange('likes')}>
                    <Ionicons name="star" size={14} color={commentsSortBy === 'likes' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, commentsSortBy === 'likes' && styles.sortFilterTextActive]}>精选</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortFilterBtn, commentsSortBy === 'newest' && styles.sortFilterBtnActive]} onPress={() => handleCommentsSortChange('newest')}>
                    <Ionicons name="time" size={14} color={commentsSortBy === 'newest' ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.sortFilterText, commentsSortBy === 'newest' && styles.sortFilterTextActive]}>最新</Text>
                  </TouchableOpacity>
                </>
          )}
            </View>
            <Text style={styles.sortFilterCount}>
              {activeTabType === 'supplements' ? `共 ${supplementsList.length} 条补充` : activeTabType === 'answers' ? `共 ${answersTotal} 条回答` : `共 ${commentsTotal || questionData?.commentCount || 0} 条评论`}
            </Text>
          </View>

          {/* 超级赞购买横幅 - 在补充、回答、评论标签页显示 */}
          {Boolean(activeTabType && ['supplements', 'answers', 'comments'].includes(activeTabType)) && <TouchableOpacity style={styles.superLikePurchaseBanner} onPress={() => navigation.navigate('SuperLikePurchase')} activeOpacity={0.8}>
              <View style={styles.superLikePurchaseBannerLeft}>
                <Ionicons name="star" size={18} color="#f59e0b" />
                <Text style={styles.superLikePurchaseBannerText}>购买超级赞提升排名</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
            </TouchableOpacity>}

          {activeTabType === 'supplements' ? (
        // 补充问题列表
        <ScrollView style={styles.supplementsScrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={supplementsRefreshing} onRefresh={onSupplementsRefresh} colors={['#ef4444']} tintColor="#ef4444" />} onScroll={({
          nativeEvent
        }) => {
          const {
            layoutMeasurement,
            contentOffset,
            contentSize
          } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
          if (isCloseToBottom && supplementsHasMore && !supplementsLoadingMore) {
            onSupplementsLoadMore();
          }
        }} scrollEventThrottle={400}>
              {supplementsLoading && supplementsList.length === 0 ?
          // 初次加载状态
          <View style={styles.supplementsLoadingContainer}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.supplementsLoadingText}>加载补充中...</Text>
                </View> : supplementsList.length === 0 ?
          // 空状态
          <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无补充问题</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个提出补充问题的人</Text>
                </View> :
          // 补充列表
          <>
                  {supplementsList.map(item => {
              const supplementIpLocation = resolveIpLocation(item);
              return <TouchableOpacity key={item.id} style={styles.suppCard} onPress={() => {
              console.log('=== 点击补充问题 ===');
              console.log('补充问题ID:', item.id);
              console.log('补充问题作者:', item.author);
              console.log('导航对象存在:', !!navigation);
              console.log('准备导航到 SupplementDetail');
              const navigationSupplement = buildSupplementNavigationItem(item);
              navigation.navigate('SupplementDetail', {
                supplement: navigationSupplement,
                sourceRouteKey: route.key,
                parentQuestionId: questionData?.id ?? route?.params?.id ?? null,
                originalQuestion: {
                  id: questionData?.id ?? route?.params?.id ?? null,
                  title: questionData?.title || '',
                  author: questionData?.author || questionData?.userName || questionData?.userNickname || '匿名用户',
                  avatar: questionData?.userAvatar || questionData?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user${questionData?.userId ?? route?.params?.id ?? 'question'}`,
                  time: formatTime(questionData?.createTime || questionData?.createdAt),
                  location: questionData?.location || '未知'
                }
              });
            }} activeOpacity={0.7}>
                  <View style={styles.suppHeader}>
                    <TouchableOpacity style={styles.suppAuthorInfoRow} activeOpacity={0.7} onPress={e => {
                    e.stopPropagation();
                    openPublicProfile(item);
                  }}>
                    <Avatar uri={item.avatar} name={item.author} size={24} />
                    <View style={styles.suppAuthorInfo}>
                      <View style={styles.suppAuthorRow}>
                        <Text style={styles.suppAuthor}>{item.author}</Text>
                        
                        <View style={styles.suppLocationRow}>
                          <Ionicons name="location-outline" size={12} color="#9ca3af" />
                          <Text style={styles.suppLocation}>{item.location}</Text>
                        </View>
                        
                        {/* 超级赞按钮 - 在IP属地后面 */}
                        <TouchableOpacity style={[styles.superLikeBadge, (supplementSuperLikes[item.id] || item.superLikes || 0) === 0 && styles.superLikeBadgeInactive]} onPress={async e => {
                      e.stopPropagation();

                      // 检查余额
                      const balance = await superLikeCreditService.getBalance();
                      if (balance <= 0) {
                        Alert.alert('超级赞次数不足', '您的超级赞次数不足，是否购买？', [{
                          text: '取消',
                          style: 'cancel'
                        }, {
                          text: '去购买',
                          onPress: () => navigation.navigate('SuperLikePurchase')
                        }]);
                        return;
                      }

                      // 使用超级赞
                      const result = await superLikeCreditService.use(`supp-${item.id}`, item.content.substring(0, 50));
                      if (result.success) {
                        // 更新本地显示的超级赞数量
                        const currentCount = supplementSuperLikes[item.id] || item.superLikes || 0;
                        setSupplementSuperLikes({
                          ...supplementSuperLikes,
                          [item.id]: currentCount + 1
                        });
                      }
                    }}>
                          <Ionicons name="star" size={14} color={(supplementSuperLikes[item.id] || item.superLikes || 0) === 0 ? "#d1d5db" : "#f59e0b"} />
                          <Text style={[styles.superLikeBadgeText, (supplementSuperLikes[item.id] || item.superLikes || 0) === 0 && styles.superLikeBadgeTextInactive]}>
                            {t('screens.questionDetail.answer.superLike')} x{supplementSuperLikes[item.id] || item.superLikes || 0}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.suppAnswerBtnTop} onPress={e => {
                  e.stopPropagation();
                  setCurrentSupplement(item);
                  setShowAnswerModal(true);
                }}>
                      <Ionicons name="create-outline" size={14} color="#fff" />
                      <Text style={styles.suppAnswerTextTop}>回答 ({Number(item.answerCount ?? 0)})</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.suppContentContainer}>
                    <Text style={styles.suppContent}>{item.content}</Text>
                    <View style={styles.suppMetaBottom}>
                      {Boolean(supplementIpLocation) && (
                        <Text style={styles.suppIpBottom}>
                          {supplementIpLocation}
                        </Text>
                      )}
                      {Boolean(item.time) && <Text style={styles.suppTimeBottom}>{item.time}</Text>}
                    </View>
                  </View>
                  
                  <View style={styles.suppFooter}>
                    <View style={styles.suppFooterLeft}>
                      <TouchableOpacity style={[styles.suppActionBtn, isLikeInteractionDisabled(getSupplementLikedState(item.id, item), getSupplementDislikedState(item.id, item)) && styles.interactionBtnDisabled]} onPress={e => {
                    e.stopPropagation();
                    handleSupplementLike(item.id);
                  }} disabled={isLikeInteractionDisabled(getSupplementLikedState(item.id, item), getSupplementDislikedState(item.id, item))}>
                        <Ionicons name={getSupplementLikedState(item.id, item) ? "thumbs-up" : "thumbs-up-outline"} size={16} color={getSupplementLikedState(item.id, item) ? "#ef4444" : isLikeInteractionDisabled(getSupplementLikedState(item.id, item), getSupplementDislikedState(item.id, item)) ? "#d1d5db" : "#6b7280"} />
                        <Text style={[styles.suppActionText, getSupplementLikedState(item.id, item) && {
                      color: '#ef4444'
                    }, isLikeInteractionDisabled(getSupplementLikedState(item.id, item), getSupplementDislikedState(item.id, item)) && styles.interactionTextDisabled]}>
                          {getSupplementLikeDisplayCount(item, suppLiked[item.id])}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.suppActionBtn} onPress={e => {
                    e.stopPropagation();
                    setCurrentSuppId(getSupplementTargetId(item) ?? item.id);
                    setShowSuppCommentListModal(true);
                  }}>
                        <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                    <Text style={styles.suppActionText}>{formatNumber(Number(item.commentCount ?? item.comments ?? item.comment_count ?? 0))}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.suppActionBtn} onPress={e => {
                    e.stopPropagation();
                    openShareModalWithData(buildSupplementSharePayload(item));
                  }}>
                        <Ionicons name="arrow-redo-outline" size={16} color="#6b7280" />
                        <Text style={styles.suppActionText}>{formatNumber(Number(item.shareCount ?? item.shares ?? 0))}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.suppActionBtn} onPress={e => {
                    e.stopPropagation();
                    handleSupplementCollect(item.id);
                  }}>
                        <Ionicons name={suppBookmarked[item.id] ?? item.collected ? "star" : "star-outline"} size={16} color={suppBookmarked[item.id] ?? item.collected ? "#f59e0b" : "#6b7280"} />
                        <Text style={[styles.suppActionText, (suppBookmarked[item.id] ?? item.collected) && {
                      color: '#f59e0b'
                    }]}>
                          {getSupplementCollectDisplayCount(item, suppBookmarked[item.id])}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.suppActionBtn} onPress={e => {
                    e.stopPropagation();
                    openQuestionGroupChat();
                  }}>
                        <Ionicons name="chatbubbles-outline" size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.suppFooterRight}>
                      <TouchableOpacity style={styles.suppMoreBtn} onPress={e => {
                    e.stopPropagation();
                    setCurrentSuppId(getSupplementTargetId(item) ?? item.id);
                    setShowSuppMoreModal(true);
                  }}>
                        <Ionicons key={`more-${item.id}`} name="ellipsis-horizontal-outline" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>;
            })}
                  
                  {/* 加载更多指示器 */}
                  {Boolean(supplementsLoadingMore) && <View style={styles.supplementsLoadingMore}>
                      <ActivityIndicator size="small" color="#ef4444" />
                      <Text style={styles.supplementsLoadingMoreText}>加载更多...</Text>
                    </View>}
                  
                  {Boolean(supplementsHasMore && !supplementsLoadingMore && supplementsList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={onSupplementsLoadMore}>
                      <Text style={styles.loadMoreText}>加载更多补充</Text>
                      <Ionicons name="chevron-down" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                  
                  {/* 没有更多数据提示 */}
                  {!supplementsHasMore && supplementsList.length > 0 && <View style={styles.supplementsNoMore}>
                      <Text style={styles.supplementsNoMoreText}>没有更多补充了</Text>
                    </View>}
                </>}
            </ScrollView>
          ) : activeTabType === 'comments' ? (
        // 评论列表
        <>
              {loadingComments && commentsList.length === 0 ? <View style={styles.supplementsLoadingContainer}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.supplementsLoadingText}>加载评论中...</Text>
                </View> : commentsList.length === 0 ? <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无评论</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个评论的人</Text>
                </View> : <>
              {commentsList.map(comment => {
              const isCommentLiked = commentLiked[comment.id] !== undefined ? commentLiked[comment.id] : !!comment.liked;
              const isCommentCollected = commentCollected[comment.id] !== undefined ? commentCollected[comment.id] : !!comment.collected;
              const isCommentDisliked = commentDisliked[comment.id] !== undefined ? commentDisliked[comment.id] : !!comment.disliked;
              const commentLikeCount = getCommentLikeDisplayCount(comment, commentLiked[comment.id]);
              const commentCollectCount = getCommentCollectDisplayCount(comment, commentCollected[comment.id]);
              const commentDislikeCount = getCommentDislikeDisplayCount(comment, commentDisliked[comment.id]);
              const commentIpLocation = resolveIpLocation(comment);
              return <View key={comment.id} style={styles.commentCard}>
                  <TouchableOpacity style={styles.commentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                    <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={24} />
                    <Text style={styles.commentAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                    
                    {/* 超级赞按钮 - 在用户名后面 */}
                    <TouchableOpacity style={[styles.superLikeBadge, (commentSuperLikes[comment.id] || comment.superLikes || 0) === 0 && styles.superLikeBadgeInactive]} onPress={async e => {
                    e.stopPropagation();

                    // 检查余额
                    const balance = await superLikeCreditService.getBalance();
                    if (balance <= 0) {
                      Alert.alert('超级赞次数不足', '您的超级赞次数不足，是否购买？', [{
                        text: '取消',
                        style: 'cancel'
                      }, {
                        text: '去购买',
                        onPress: () => navigation.navigate('SuperLikePurchase')
                      }]);
                      return;
                    }

                    // 使用超级赞
                    const result = await superLikeCreditService.use(`comment-${comment.id}`, comment.content.substring(0, 50));
                    if (result.success) {
                      // 更新本地显示的超级赞数量
                      const currentCount = commentSuperLikes[comment.id] || comment.superLikes || 0;
                      setCommentSuperLikes({
                        ...commentSuperLikes,
                        [comment.id]: currentCount + 1
                      });
                    }
                  }}>
                      <Ionicons name="star" size={14} color={(commentSuperLikes[comment.id] || comment.superLikes || 0) === 0 ? "#d1d5db" : "#f59e0b"} />
                      <Text style={[styles.superLikeBadgeText, (commentSuperLikes[comment.id] || comment.superLikes || 0) === 0 && styles.superLikeBadgeTextInactive]}>
                        {t('screens.questionDetail.answer.superLike')} x{commentSuperLikes[comment.id] || comment.superLikes || 0}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={{
                    flex: 1
                  }} />
                    {Boolean(commentIpLocation) && <Text style={styles.commentTime}>{commentIpLocation}</Text>}
                    <Text style={styles.commentTime}>{comment.time}</Text>
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    
                    <View style={styles.commentFooter}>
                      <View style={styles.commentFooterLeft}>
                        <TouchableOpacity style={[styles.commentActionBtn, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(comment.id)} disabled={commentLikeLoading[comment.id] || isLikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                          <Ionicons name={isCommentLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isCommentLiked ? "#ef4444" : isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                          <Text style={[styles.commentActionText, isCommentLiked && {
                          color: '#ef4444'
                        }, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionTextDisabled]}>{commentLikeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => {
                        setCurrentCommentId(comment.id);
                        setShowCommentReplyModal(true);
                      }}>
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{formatNumber(comment.replyCount || comment.replies || 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => openShareModalWithData(buildQuestionCommentSharePayload(comment))}>
                          <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{formatNumber(comment.shareCount || comment.shares || 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentCollect(comment.id)} disabled={commentCollectLoading[comment.id]}>
                          <Ionicons name={isCommentCollected ? "star" : "star-outline"} size={14} color={isCommentCollected ? "#f59e0b" : "#9ca3af"} />
                          <Text style={[styles.commentActionText, isCommentCollected && {
                          color: '#f59e0b'
                        }]}>{commentCollectCount}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.commentFooterRight}>
                        <TouchableOpacity style={[styles.commentActionBtn, isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(comment.id)} disabled={commentDislikeLoading[comment.id] || isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                          <Ionicons name={isCommentDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={isCommentDisliked ? "#6b7280" : isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                          <Text style={[styles.commentActionText, isCommentDisliked && {
                          color: '#6b7280'
                        }, isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionTextDisabled]}>{commentDislikeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn} onPress={() => navigation.navigate('Report', {
                        type: 'comment',
                        targetType: 5,
                        targetId: Number(comment.id) || 0
                      })}>
                          <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>;
            })}
              {Boolean(commentsLoadingMore) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>{t('screens.questionDetail.loading')}</Text>
                </View>}
              {Boolean(commentsHasMore && !commentsLoadingMore) && <TouchableOpacity style={styles.loadMoreBtn} onPress={onCommentsLoadMore}>
                  <Text style={styles.loadMoreText}>{t('screens.questionDetail.loadMoreComments')}</Text>
                  <Ionicons name="chevron-down" size={16} color="#ef4444" />
                </TouchableOpacity>}
              {!commentsHasMore && commentsList.length > 0 && <View style={styles.supplementsNoMore}>
                  <Text style={styles.supplementsNoMoreText}>没有更多评论了</Text>
                </View>}
                </>}
            </>
          ) : activeTabType === 'invite' ? (
        // 邀请列表 - 二级tab标签
        <View style={styles.inviteContainer}>
              {/* 二级tab标签 */}
              <View style={styles.inviteSubTabs}>
                <TouchableOpacity style={[styles.inviteSubTabItem, inviteTab === '本站' && styles.inviteSubTabItemActive]} onPress={() => setInviteTab('本站')}>
                  <Text style={[styles.inviteSubTabText, inviteTab === '本站' && styles.inviteSubTabTextActive]}>{t('screens.questionDetail.invite.local')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.inviteSubTabItem, inviteTab === '推特' && styles.inviteSubTabItemActive]} onPress={() => setInviteTab('推特')}>
                  <Ionicons name="logo-twitter" size={14} color={inviteTab === '推特' ? '#1DA1F2' : '#9ca3af'} />
                  <Text style={[styles.inviteSubTabText, inviteTab === '推特' && styles.inviteSubTabTextActive]}>{t('screens.questionDetail.invite.twitter')}</Text>
                </TouchableOpacity>
              </View>

              {/* 搜索框 */}
              <View style={styles.inviteSearchContainer}>
                <View style={styles.inviteSearchBox}>
                  <Ionicons name="search" size={14} color="#9ca3af" />
                  <TextInput style={styles.inviteSearchInput} placeholder={inviteTab === '本站' ? t('screens.questionDetail.invite.searchUser') : t('screens.questionDetail.invite.searchTwitterUser')} placeholderTextColor="#9ca3af" value={inviteTab === '本站' ? searchLocalUser : searchTwitterUser} onChangeText={text => {
                if (inviteTab === '本站') setSearchLocalUser(text);else setSearchTwitterUser(text);
              }} />
                </View>
              </View>

              {/* 本站用户内容 */}
              {inviteTab === '本站' && <View style={styles.inviteTabContent}>
                  {/* 推荐邀请用户 - 横向滚动 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
                    {[1, 2, 3, 4, 5].map(i => <View key={`rec-local-${i}`} style={styles.recommendUserCard}>
                        <Image source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=reclocal${i}`
                }} style={styles.recommendUserAvatar} />
                        <View style={styles.recommendUserTextContainer}>
                          <Text style={styles.recommendUserName} numberOfLines={1}>推荐用户{i}</Text>
                          <Text style={styles.recommendUserDesc} numberOfLines={1}>{i * 20}回答</Text>
                        </View>
                        <TouchableOpacity style={styles.recommendInviteBtn}>
                          <Ionicons name="add" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>)}
                  </ScrollView>

                  {/* 已邀请用户列表 */}
                  <Text style={styles.invitedListTitle}>已邀请</Text>
                  {[1, 2, 3, 4, 5, 6, 7, 8].slice(0, showAllInvited ? 8 : 3).map(i => <View key={`invited-local-${i}`} style={styles.inviteUserCard}>
                      <Avatar uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=local${i}`} name={`用户${i}`} size={40} />
                      <View style={styles.inviteUserInfo}>
                        <Text style={styles.inviteUserName}>用户{i}</Text>
                        <Text style={styles.inviteUserDesc}>Python开发者 · 回答过 {i * 10} 个问题</Text>
                      </View>
                      <View style={styles.invitedTag}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.invitedTagText}>已邀请</Text>
                      </View>
                    </View>)}
                  {Boolean(loadingInvited) && <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>加载中...</Text>
                    </View>}
                  {!showAllInvited && <TouchableOpacity style={styles.loadMoreInvitedBtn} onPress={() => setShowAllInvited(true)}>
                      <Text style={styles.loadMoreInvitedText}>{t('screens.questionDetail.loadMoreInvites')} (5)</Text>
                      <Ionicons name="chevron-down" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                  {Boolean(showAllInvited) && <TouchableOpacity style={styles.collapseBtn} onPress={() => {
              setShowAllInvited(false);
              setInvitedPage(1);
            }}>
                      <Text style={styles.collapseBtnText}>收起</Text>
                      <Ionicons name="chevron-up" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                </View>}

              {/* 推特用户内容 */}
              {inviteTab === '推特' && <View style={styles.inviteTabContent}>
                  {/* 推荐邀请用户 - 横向滚动 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
                    {recommendedTwitterUsers.map(user => <View key={`rec-twitter-${user.id}`} style={styles.recommendUserCard}>
                        <Image source={{
                  uri: user.avatar
                }} style={styles.recommendUserAvatar} />
                        <View style={styles.recommendUserTextContainer}>
                          <Text style={styles.recommendUserName} numberOfLines={1}>{user.name}</Text>
                          <Text style={styles.recommendUserDesc} numberOfLines={1}>{user.followers}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.recommendInviteBtn, styles.recommendInviteBtnTwitter]}
                          onPress={() => openTwitterInviteEditor(user)}
                          disabled={pendingTwitterInvitePlatform === 'twitter'}
                        >
                          {pendingTwitterInvitePlatform === 'twitter' && selectedTwitterInviteUser?.id === user.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Ionicons name="logo-twitter" size={12} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </View>)}
                  </ScrollView>

                  {/* 已邀请用户列表 */}
                  <Text style={styles.invitedListTitle}>已邀请</Text>
                  {[1, 2, 3, 4, 5, 6].slice(0, showAllInvited ? 6 : 3).map(i => <View key={`invited-twitter-${i}`} style={styles.inviteUserCard}>
                      <Avatar uri={`https://api.dicebear.com/7.x/avataaars/svg?seed=twitter${i}`} name={`@twitter_user${i}`} size={40} />
                      <View style={styles.inviteUserInfo}>
                        <Text style={styles.inviteUserName}>@twitter_user{i}</Text>
                        <Text style={styles.inviteUserDesc}>{i * 1000} 关注者</Text>
                      </View>
                      <View style={styles.invitedTag}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.invitedTagText}>已邀请</Text>
                      </View>
                    </View>)}
                  {Boolean(loadingInvited) && <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>加载中...</Text>
                    </View>}
                  {!showAllInvited && <TouchableOpacity style={styles.loadMoreInvitedBtn} onPress={() => setShowAllInvited(true)}>
                      <Text style={styles.loadMoreInvitedText}>查看更多邀请 (3)</Text>
                      <Ionicons name="chevron-down" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                  {Boolean(showAllInvited) && <TouchableOpacity style={styles.collapseBtn} onPress={() => {
              setShowAllInvited(false);
              setInvitedPage(1);
            }}>
                      <Text style={styles.collapseBtnText}>收起</Text>
                      <Ionicons name="chevron-up" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                </View>}
            </View>
          ) : activeTabType === 'answers' ? (
        // 回答列表
        <>
              {answersLoading && answersList.length === 0 ?
          // 初次加载状态
          <View style={styles.supplementsLoadingContainer}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.supplementsLoadingText}>加载回答中...</Text>
                </View> : answersList.length === 0 ?
          // 空状态
          <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无回答，快来抢沙发吧~</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个回答问题的人</Text>
                </View> : <>
                  {answersList.map(answer => {
              const answerStateKey = getAnswerIdentityKey(answer) || String(answer.id);
              const isAdopted = answerAdopted[answerStateKey] !== undefined ? answerAdopted[answerStateKey] : normalizeFlag(answer.adopted, answer.isAccepted, answer.isAdopted);
              const isAdoptLoading = !!answerAdoptLoading[answerStateKey];
              const currentQuestionId = getAnswerQuestionId(answer) ?? questionData?.id ?? route?.params?.id;
              const currentAnswerId = getAnswerPrimaryId(answer) ?? answer.id;
              const isLiked = answerLiked[answer.id] !== undefined ? answerLiked[answer.id] : !!answer.liked;
              const isCollected = answerBookmarked[answer.id] !== undefined ? answerBookmarked[answer.id] : !!answer.collected;
              const isDisliked = answerDisliked[answer.id] !== undefined ? answerDisliked[answer.id] : !!answer.disliked;
              const canAdopt = normalizeFlag(answer.canAdopt);
              const likeCount = getAnswerLikeDisplayCount(answer, answerLiked[answer.id]);
              const collectCount = getAnswerCollectDisplayCount(answer, answerBookmarked[answer.id]);
              const dislikeCount = getAnswerDislikeDisplayCount(answer, answerDisliked[answer.id]);
              const answerIpLocation = resolveIpLocation(answer);
              return <TouchableOpacity key={answerStateKey} style={[styles.answerCard, isAdopted && styles.answerCardAdopted]} onPress={() => navigation.navigate('AnswerDetail', {
                answer,
                defaultTab: 'supplements'
              })}>
              <View style={styles.answerHeader}>
                <TouchableOpacity style={styles.answerHeaderMain} activeOpacity={0.7} onPress={e => {
                  e.stopPropagation();
                  openPublicProfile(answer);
                }}>
                <Avatar uri={answer.userAvatar || answer.avatar} name={answer.userName || answer.userNickname || answer.author || '匿名用户'} size={24} />
                <View style={styles.answerAuthorInfo}>
                  <View style={styles.answerAuthorRow}>
                    <Text style={styles.answerAuthor}>{answer.userName || answer.userNickname || answer.author || '匿名用户'}</Text>
                    {Boolean(answer.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                    
                    {Boolean(canAdopt || isAdopted) && <TouchableOpacity style={[styles.adoptAnswerBtn, isAdopted && styles.adoptAnswerBtnActive, isAdoptLoading && styles.adoptAnswerBtnLoading]} onPress={e => {
                        e.stopPropagation();
                        handleAnswerAdopt(currentQuestionId, currentAnswerId);
                      }} disabled={!canAdopt || isAdoptLoading || isAdopted}>
                        <Text style={[styles.adoptAnswerBtnText, isAdopted && styles.adoptAnswerBtnTextActive]}>
                          {isAdopted ? t('screens.questionDetail.answer.adopted') : t('screens.questionDetail.answer.adopt')}
                        </Text>
                      </TouchableOpacity>}
                  </View>
                  <View style={styles.answerMetaRow}>
                    {Boolean(answer.title) && <Text style={styles.answerAuthorTitle}>{answer.title}</Text>}
                  </View>
                </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.answerSupplementBtnTop} onPress={e => {
                    e.stopPropagation();
                    setCurrentAnswer(answer);
                    setShowSupplementAnswerModal(true);
                  }}>
                  <Ionicons name="add-circle-outline" size={14} color="#fff" />
                  <Text style={styles.answerSupplementTextTop}>{t('screens.questionDetail.answer.supplement')} (2)</Text>
                </TouchableOpacity>
              </View>

              {/* 标签区域 - 优化布局 */}
              <View style={styles.answerTagsSection}>
                {/* 超级赞按钮 - 可点击增加 */}
                <TouchableOpacity style={[styles.superLikeBadge, (answerSuperLikes[answer.id] || answer.superLikes || 0) === 0 && styles.superLikeBadgeInactive]} onPress={async e => {
                    e.stopPropagation();

                    // 检查余额
                    const balance = await superLikeCreditService.getBalance();
                    if (balance <= 0) {
                      Alert.alert('超级赞次数不足', '您的超级赞次数不足，是否购买？', [{
                        text: '取消',
                        style: 'cancel'
                      }, {
                        text: '去购买',
                        onPress: () => navigation.navigate('SuperLikePurchase')
                      }]);
                      return;
                    }

                    // 使用超级赞
                    const result = await superLikeCreditService.use(answer.id.toString(), answer.content.substring(0, 50));
                    if (result.success) {
                      // 更新本地显示的超级赞数量
                      const currentCount = answerSuperLikes[answer.id] || answer.superLikes || 0;
                      setAnswerSuperLikes({
                        ...answerSuperLikes,
                        [answer.id]: currentCount + 1
                      });
                      // 不显示成功提示，直接更新数字
                    }
                  }}>
                  <Ionicons name="star" size={14} color={(answerSuperLikes[answer.id] || answer.superLikes || 0) === 0 ? "#d1d5db" : "#f59e0b"} />
                  <Text style={[styles.superLikeBadgeText, (answerSuperLikes[answer.id] || answer.superLikes || 0) === 0 && styles.superLikeBadgeTextInactive]}>
                    {t('screens.questionDetail.answer.superLike')} x{answerSuperLikes[answer.id] || answer.superLikes || 0}
                  </Text>
                </TouchableOpacity>
                
                {/* 作者已采纳标签 */}
                {Boolean(isAdopted) && <View style={styles.authorAdoptedBadge}>
                    <Text style={styles.authorAdoptedBadgeText}>{t('screens.questionDetail.answer.authorAdopted')}</Text>
                  </View>}
                
                {/* 已采纳数量标签 - 显示其他采纳数 */}
                {Boolean(answer.adoptedCount && answer.adoptedCount > 0) && <View style={styles.adoptedCountBadge}>
                    <Text style={styles.adoptedCountBadgeText}>{t('screens.questionDetail.answer.adoptedCount')} x{answer.adoptedCount}</Text>
                  </View>}
                
                {/* 邀请者标签 */}
                {Boolean(answer.invitedBy) && <View style={styles.inviterBadgeCompact}>
                    <Avatar uri={answer.invitedBy.avatar} name={answer.invitedBy.name} size={14} />
                    <Text style={styles.inviterTextCompact}>{t('screens.questionDetail.answer.invitedBy')} {answer.invitedBy.name} {t('screens.questionDetail.answer.invited')}</Text>
                  </View>}

                {/* 仲裁结果标签 - 暂时隐藏 */}
                {Boolean(false && answer.hasArbitration && answer.arbitrationResult === 'completed') && <View style={[styles.arbitrationResultBadge, answer.arbitrationData.status === 'approved' ? styles.arbitrationResultApproved : styles.arbitrationResultRejected]}>
                    <Ionicons name={answer.arbitrationData.status === 'approved' ? "close-circle" : "shield-checkmark"} size={12} color={answer.arbitrationData.status === 'approved' ? "#ef4444" : "#22c55e"} />
                    <Text style={[styles.arbitrationResultText, answer.arbitrationData.status === 'approved' ? styles.arbitrationResultTextApproved : styles.arbitrationResultTextRejected]}>
                      {answer.arbitrationData.status === 'approved' ? '仲裁推翻' : '仲裁维持'}
                    </Text>
                  </View>}

                {/* 仲裁状态标签 - 暂时隐藏 */}
                {Boolean(false && answer.adopted && arbitrationStatus === 'pending') && <View style={styles.arbitrationPendingBadgeCompact}>
                    <Ionicons name="time-outline" size={12} color="#f59e0b" />
                    <Text style={styles.arbitrationPendingTextCompact}>投票中</Text>
                  </View>}
                
                {Boolean(false && answer.adopted && arbitrationStatus === 'approved') && <View style={styles.arbitrationApprovedBadgeCompact}>
                    <Ionicons name="close-circle" size={12} color="#ef4444" />
                    <Text style={styles.arbitrationApprovedTextCompact}>已推翻</Text>
                  </View>}

                {/* 右侧操作按钮 */}
                <View style={styles.answerTagsActions}>
                  {/* 查看仲裁结果按钮 - 暂时隐藏 */}
                  {Boolean(false && answer.hasArbitration && answer.arbitrationResult === 'completed') && <TouchableOpacity style={styles.viewArbitrationResultBtn} onPress={e => {
                      e.stopPropagation();
                      setCurrentArbitrationResult(answer.arbitrationData);
                      setShowArbitrationResultModal(true);
                    }}>
                      <Ionicons name="document-text-outline" size={12} color="#6b7280" />
                      <Text style={styles.viewArbitrationResultBtnText}>查看仲裁</Text>
                    </TouchableOpacity>}
                  
                  {/* 申请仲裁按钮 - 暂时隐藏 */}
                  {Boolean(false && answer.adopted && !arbitrationStatus) && <TouchableOpacity style={styles.arbitrationBtnCompact} onPress={e => {
                      e.stopPropagation();
                      setShowArbitrationModal(true);
                    }}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#6b7280" />
                      <Text style={styles.arbitrationBtnTextCompact}>仲裁</Text>
                    </TouchableOpacity>}
                  
                  {/* 查看仲裁详情按钮 - 暂时隐藏 */}
                  {Boolean(false && answer.adopted && arbitrationStatus) && <TouchableOpacity style={styles.viewArbitrationBtnCompact} onPress={e => {
                      e.stopPropagation();
                      setShowArbitrationStatusModal(true);
                    }}>
                      <Text style={styles.viewArbitrationBtnTextCompact}>详情</Text>
                      <Ionicons name="chevron-forward" size={12} color="#6b7280" />
                    </TouchableOpacity>}
                </View>
              </View>
              
              {/* 隐藏的完整文本用于检测行数 */}
              <Text style={[styles.answerContent, {
                  position: 'absolute',
                  opacity: 0,
                  zIndex: -1
                }]} onTextLayout={e => {
                  const lineCount = e.nativeEvent.lines.length;
                  if (lineCount > 5 && !answerNeedsExpand[answer.id]) {
                    setAnswerNeedsExpand(prev => ({
                      ...prev,
                      [answer.id]: true
                    }));
                  }
                }}>
                {answer.content}
              </Text>
              
              {/* 回答内容 - 可展开/收起 */}
              <View style={styles.answerContentContainer}>
                <Text style={styles.answerContent} numberOfLines={answerExpanded[answer.id] ? undefined : 5}>
                  {answer.content}
                </Text>
                
                {Boolean(answerNeedsExpand[answer.id]) && <TouchableOpacity style={styles.answerExpandBtnInline} onPress={e => {
                    e.stopPropagation();
                    setAnswerExpanded(prev => ({
                      ...prev,
                      [answer.id]: !prev[answer.id]
                    }));
                  }} activeOpacity={0.7}>
                    <Text style={styles.expandHintText}>
                      {answerExpanded[answer.id] ? t('screens.questionDetail.answer.collapse') : `...${t('screens.questionDetail.answer.expand')}`}
                    </Text>
                  </TouchableOpacity>}
                
                <View style={styles.answerMetaBottom}>
                  {Boolean(answerIpLocation) && (
                    <Text style={styles.answerIpBottom}>
                      {answerIpLocation}
                    </Text>
                  )}
                  {Boolean(answer.time) && <Text style={styles.answerTimeBottom}>{answer.time}</Text>}
                </View>
              </View>
              
              <View style={styles.answerFooter}>
                <View style={styles.answerFooterLeft}>
                  <TouchableOpacity style={[styles.answerActionBtn, isLikeInteractionDisabled(isLiked, isDisliked) && styles.interactionBtnDisabled]} onPress={e => {
                      e.stopPropagation();
                      handleAnswerLike(answer.id);
                    }} disabled={isLikeInteractionDisabled(isLiked, isDisliked)}>
                    <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={16} color={isLiked ? "#ef4444" : isLikeInteractionDisabled(isLiked, isDisliked) ? "#d1d5db" : "#6b7280"} />
                    <Text style={[styles.answerActionText, isLiked && {
                        color: '#ef4444'
                      }, isLikeInteractionDisabled(isLiked, isDisliked) && styles.interactionTextDisabled]}>
                      {likeCount}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.answerActionBtn} onPress={e => {
                      e.stopPropagation();
                      setCurrentAnswerId(currentAnswerId);
                      setShowAnswerCommentListModal(true);
                    }}>
                    <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                    <Text style={styles.answerActionText}>{formatNumber(answer.commentCount || answer.comment_count || answer.comments || 0)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.answerActionBtn} onPress={e => {
                      e.stopPropagation();
                      openShareModalWithData(buildAnswerSharePayload(answer));
                    }}>
                    <Ionicons name="arrow-redo-outline" size={16} color="#6b7280" />
                    <Text style={styles.answerActionText}>{formatNumber(answer.shareCount || answer.share_count || answer.shares || 0)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.answerActionBtn, answerCollectLoading[answer.id] && styles.answerActionBtnLoading]} onPress={e => {
                      e.stopPropagation();
                      handleAnswerCollect(answer.id);
                    }} disabled={answerCollectLoading[answer.id]}>
                    <Ionicons name={isCollected ? "star" : "star-outline"} size={16} color={isCollected ? "#f59e0b" : "#6b7280"} />
                    <Text style={[styles.answerActionText, isCollected && {
                        color: '#f59e0b'
                      }]}>
                      {collectCount}
                    </Text>
                    {Boolean(answerCollectLoading[answer.id]) && <ActivityIndicator size="small" color="#f59e0b" style={styles.answerActionLoader} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.answerFooterRight}>
                  <TouchableOpacity style={[styles.answerActionBtn, isDislikeInteractionDisabled(isLiked, isDisliked) && styles.interactionBtnDisabled]} onPress={e => {
                      e.stopPropagation();
                      handleAnswerDislike(answer.id);
                    }} disabled={isDislikeInteractionDisabled(isLiked, isDisliked)}>
                    <Ionicons name={isDisliked ? "thumbs-down" : "thumbs-down-outline"} size={16} color={isDisliked ? "#6b7280" : isDislikeInteractionDisabled(isLiked, isDisliked) ? "#d1d5db" : "#6b7280"} />
                    <Text style={[styles.answerActionText, isDisliked && {
                        color: '#6b7280'
                      }, isDislikeInteractionDisabled(isLiked, isDisliked) && styles.interactionTextDisabled]}>
                      {dislikeCount}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.answerActionBtn} onPress={e => {
                      e.stopPropagation();
                      navigation.navigate('Report', {
                        type: 'answer',
                        targetType: 2,
                        targetId: Number(answer.id) || 0
                      });
                    }}>
                    <Ionicons name="flag-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>;
            })}
              
                  {/* 加载更多指示器 */}
                  {Boolean(answersLoadingMore) && <View style={styles.supplementsLoadingMore}>
                      <ActivityIndicator size="small" color="#ef4444" />
                      <Text style={styles.supplementsLoadingMoreText}>加载更多...</Text>
                    </View>}
                  
                  {Boolean(answersHasMore && !answersLoadingMore && answersList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={onAnswersLoadMore}>
                      <Text style={styles.loadMoreText}>加载更多回答</Text>
                      <Ionicons name="chevron-down" size={16} color="#ef4444" />
                    </TouchableOpacity>}
                  
                  {/* 没有更多数据提示 */}
                  {!answersHasMore && answersList.length > 0 && <View style={styles.supplementsNoMore}>
                      <Text style={styles.supplementsNoMoreText}>没有更多回答了</Text>
                    </View>}
                </>}
            </>
          ) : null}
        </View>

        {/* 推荐相关问题 - 仅在列表未展开时显示 */}
        {/* 暂时隐藏推荐问题模块，保留代码和样式以便后续接入接口时使用 */}
        {false && !showAllSupplements && !showAllAnswers && !showAllComments && !showAllInvited && <View style={styles.recommendedSection}>
          <View style={styles.recommendedHeader}>
            <View style={styles.recommendedHeaderLeft}>
              <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
              <Text style={styles.recommendedTitle}>{t('screens.questionDetail.recommended.title')}</Text>
            </View>
            <Text style={styles.recommendedSubtitle}>{t('screens.questionDetail.recommended.subtitle')}</Text>
          </View>

          {/* 推荐问题卡片 */}
          <TouchableOpacity style={styles.recommendedQuestionCard} onPress={() => navigation.push('QuestionDetail', {
          id: 2
        })} activeOpacity={0.95}>
            <Text style={styles.recommendedQuestionTitle}>
              <Text style={styles.rewardTagInline}>$30 </Text>
              <View style={styles.recommendedHotTagInline}>
                <Ionicons name="flame" size={10} color="#ef4444" />
                <Text style={styles.recommendedHotTextInline}>{t('screens.questionDetail.recommended.hot')}</Text>
              </View>
              {' '}React Native开发中如何优化长列表性能？FlatList和ScrollView该如何选择？
            </Text>
            
            <Text style={styles.recommendedQuestionContent} numberOfLines={3}>
              我在开发一个新闻类APP，列表有上千条数据，使用ScrollView会很卡顿。听说FlatList性能更好，但不知道具体该怎么优化。请问有经验的开发者能分享一下最佳实践吗？
            </Text>

            <View style={styles.recommendedQuestionMeta}>
              <View style={styles.recommendedAuthorInfo}>
                <Avatar uri="https://api.dicebear.com/7.x/avataaars/svg?seed=user2" name="前端小白" size={24} />
                <Text style={styles.recommendedAuthorName}>前端小白</Text>
                <Text style={styles.recommendedQuestionTime}>· 3小时前</Text>
              </View>
              <View style={styles.recommendedQuestionStats}>
                <View style={styles.recommendedStatItem}>
                  <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                  <Text style={styles.recommendedStatText}>89</Text>
                </View>
                <View style={styles.recommendedStatItem}>
                  <Ionicons name="eye-outline" size={14} color="#9ca3af" />
                  <Text style={styles.recommendedStatText}>2.3k</Text>
                </View>
              </View>
            </View>

            <View style={styles.recommendedTopicTags}>
              <Text style={styles.recommendedTopicTag}>#ReactNative</Text>
              <Text style={styles.recommendedTopicTag}>#性能优化</Text>
              <Text style={styles.recommendedTopicTag}>#移动开发</Text>
            </View>
          </TouchableOpacity>

          {/* 第二个推荐问题 */}
          <TouchableOpacity style={styles.recommendedQuestionCard} onPress={() => navigation.push('QuestionDetail', {
          id: 3
        })} activeOpacity={0.95}>
            <Text style={styles.recommendedQuestionTitle}>
              <Text style={styles.rewardTagInline}>$20 </Text>
              如何系统学习JavaScript？从入门到精通需要掌握哪些核心知识点？
            </Text>
            
            <Text style={styles.recommendedQuestionContent} numberOfLines={3}>
              想转行做前端开发，JavaScript是必备技能。但是网上资料太多太杂，不知道该从哪里开始学。希望有经验的前辈能给一个系统的学习路线图。
            </Text>

            <View style={styles.recommendedQuestionMeta}>
              <View style={styles.recommendedAuthorInfo}>
                <Avatar uri="https://api.dicebear.com/7.x/avataaars/svg?seed=user3" name="转行者" size={24} />
                <Text style={styles.recommendedAuthorName}>转行者</Text>
                <Text style={styles.recommendedQuestionTime}>· 5小时前</Text>
              </View>
              <View style={styles.recommendedQuestionStats}>
                <View style={styles.recommendedStatItem}>
                  <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                  <Text style={styles.recommendedStatText}>156</Text>
                </View>
                <View style={styles.recommendedStatItem}>
                  <Ionicons name="eye-outline" size={14} color="#9ca3af" />
                  <Text style={styles.recommendedStatText}>4.5k</Text>
                </View>
              </View>
            </View>

            <View style={styles.recommendedTopicTags}>
              <Text style={styles.recommendedTopicTag}>#JavaScript</Text>
              <Text style={styles.recommendedTopicTag}>#前端开发</Text>
              <Text style={styles.recommendedTopicTag}>#学习路线</Text>
            </View>
          </TouchableOpacity>
        </View>}
      </ScrollView>

      {/* 底部固定栏 - 主要互动按钮 */}
      <View style={[styles.bottomBar, {
      paddingBottom: bottomSafeInset
    }]}>
        <TouchableOpacity style={[styles.bottomActionBtn, isLikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) && styles.interactionBtnDisabled]} onPress={handleQuestionLike} disabled={isLikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState())}>
          <Ionicons name={getQuestionLikedState() ? "thumbs-up" : "thumbs-up-outline"} size={20} color={getQuestionLikedState() ? "#ef4444" : isLikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) ? "#d1d5db" : "#6b7280"} />
          <Text style={[styles.bottomActionText, getQuestionLikedState() && {
          color: '#ef4444'
        }, isLikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) && styles.interactionTextDisabled]}>
            {getQuestionLikeDisplayCount(questionData, liked.main)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomActionBtn} onPress={handleQuestionCollect}>
          <Ionicons name={bookmarked ?? questionData?.collected ? "star" : "star-outline"} size={20} color={bookmarked ?? questionData?.collected ? "#f59e0b" : "#6b7280"} />
          <Text style={[styles.bottomActionText, (bookmarked ?? questionData?.collected) && {
          color: '#f59e0b'
        }]}>
            {getQuestionCollectDisplayCount(questionData, bookmarked)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionBtn, isDislikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) && styles.interactionBtnDisabled]} onPress={handleQuestionDislike} disabled={isDislikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState())}>
          <Ionicons name={getQuestionDislikedState() ? "thumbs-down" : "thumbs-down-outline"} size={20} color={getQuestionDislikedState() ? "#6b7280" : isDislikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) ? "#d1d5db" : "#9ca3af"} />
          <Text style={[styles.bottomActionText, getQuestionDislikedState() && {
          color: '#6b7280'
        }, isDislikeInteractionDisabled(getQuestionLikedState(), getQuestionDislikedState()) && styles.interactionTextDisabled]}>
            {getQuestionDislikeDisplayCount(questionData, liked.dislike)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.bottomInputBox} 
          onPress={() => {
            const activeTabType = activeTab?.split(' (')[0]?.trim();
            if (activeTabType === t('screens.questionDetail.tabs.supplements')) {
              openSupplementComposer();
            } else if (activeTabType === t('screens.questionDetail.tabs.answers')) {
              setShowAnswerModal(true);
            } else if (activeTabType === t('screens.questionDetail.tabs.comments')) {
              openCommentModal({
                targetType: 1,
                targetId: route?.params?.id,
                parentId: 0
              });
            }
          }}
        >
          <Text style={styles.bottomInputPlaceholder}>
            {(() => {
              const activeTabType = activeTab?.split(' (')[0]?.trim();
              if (activeTabType === t('screens.questionDetail.tabs.supplements')) {
                return '补充问题';
              } else if (activeTabType === t('screens.questionDetail.tabs.answers')) {
                return '写回答';
              } else if (activeTabType === t('screens.questionDetail.tabs.comments')) {
                return '写评论';
              }
              return '写评论';
            })()}
          </Text>
          <Ionicons name="create-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* 更多操作弹窗 */}
      <Modal visible={showActionModal} transparent animationType="slide" onRequestClose={() => setShowActionModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowActionModal(false)} />
          <View style={[styles.moreActionModal, {
          paddingBottom: Math.max(insets.bottom, 30)
        }]}>
            <View style={styles.moreActionModalHandle} />
            
            {/* 纵向操作按钮 */}
            <View style={styles.actionListSection}>
              <TouchableOpacity style={styles.moreActionItem}>
                <Ionicons name="thumbs-down-outline" size={22} color="#6b7280" />
                <Text style={styles.moreActionItemText}>踩一下 ({formatNumber(questionData?.dislikeCount || 0)})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreActionItem} onPress={() => {
              setShowActionModal(false);
              navigation.navigate('Report', {
              type: 'question',
              targetType: 1,
              targetId: Number(route?.params?.id ?? questionData?.id) || 0
            });
            }}>
                <Ionicons name="flag-outline" size={22} color="#ef4444" />
                <Text style={[styles.moreActionItemText, {
                color: '#ef4444'
              }]}>举报</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.moreActionCancelBtn} onPress={() => setShowActionModal(false)}>
              <Text style={styles.moreActionCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 举报弹窗 */}
      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowReportModal(false)} />
          <View style={[styles.reportModal, {
          paddingBottom: Math.max(insets.bottom, 30)
        }]}>
            <View style={styles.reportModalHandle} />
            <Text style={styles.reportModalTitle}>举报问题</Text>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：垃圾广告');
          }}>
              <Text style={styles.reportItemText}>垃圾广告</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：违法违规');
          }}>
              <Text style={styles.reportItemText}>违法违规</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：低俗色情');
          }}>
              <Text style={styles.reportItemText}>低俗色情</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：侵权');
          }}>
              <Text style={styles.reportItemText}>侵权</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：不实信息');
          }}>
              <Text style={styles.reportItemText}>不实信息</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportItem} onPress={() => {
            setShowReportModal(false);
            alert('已提交举报：其他');
          }}>
              <Text style={styles.reportItemText}>其他</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportCancelBtn} onPress={() => setShowReportModal(false)}>
              <Text style={styles.reportCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 补充问题评论列表弹窗 */}
      <Modal visible={showSuppCommentListModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSuppCommentListModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <View style={styles.commentListHeaderLeft} />
              <Text style={styles.commentListModalTitle}>全部评论</Text>
              <TouchableOpacity onPress={() => setShowSuppCommentListModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {(suppCommentListState.loading || suppCommentListState.refreshing) && suppCommentsList.length === 0 ? <View style={styles.supplementsLoadingContainer}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.supplementsLoadingText}>加载评论中...</Text>
                </View> : suppCommentsList.length === 0 ? <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无评论</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个评论的人</Text>
                </View> : suppCommentsList.map(comment => <View key={comment.id}>
                  <View style={styles.commentListCard}>
                    <TouchableOpacity style={styles.commentListHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                      <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={24} />
                      <Text style={styles.commentListAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                      <View style={{
                    flex: 1
                  }} />
                      <Text style={styles.commentListTime}>{comment.time}</Text>
                    </TouchableOpacity>
                    <View style={styles.commentListContent}>
                      <Text style={styles.commentListText}>{comment.content}</Text>
                      <View style={styles.commentListActions}>
                        <TouchableOpacity style={[styles.commentListActionBtn, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(comment.id)} disabled={commentLikeLoading[comment.id] || isLikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                          <Ionicons name={isCommentLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isCommentLiked ? "#ef4444" : isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                          <Text style={[styles.commentListActionText, isCommentLiked && {
                        color: '#ef4444'
                      }, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionTextDisabled]}>{getCommentLikeDisplayCount(comment, commentLiked[comment.id])}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                      setCurrentSuppCommentId(comment.id);
                      setShowSuppCommentListModal(false);
                      setShowSuppCommentReplyModal(true);
                    }}>
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentListActionText}>{Number(comment.replyCount ?? comment.replies ?? 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentListActionBtn} onPress={() => openShareModalWithData(buildSupplementCommentSharePayload(comment))}>
                          <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentListActionText}>{Number(comment.shareCount ?? comment.shares ?? 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentListActionBtn} onPress={() => handleCommentCollect(comment.id)} disabled={commentCollectLoading[comment.id]}>
                          <Ionicons name={commentCollected[comment.id] ?? comment.collected ? "star" : "star-outline"} size={14} color={commentCollected[comment.id] ?? comment.collected ? "#f59e0b" : "#9ca3af"} />
                          <Text style={[styles.commentListActionText, (commentCollected[comment.id] ?? comment.collected) && {
                        color: '#f59e0b'
                      }]}>{getCommentCollectDisplayCount(comment, commentCollected[comment.id])}</Text>
                        </TouchableOpacity>
                        <View style={{flex: 1}} />
                        <TouchableOpacity style={[styles.commentListActionBtn, isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(comment.id)} disabled={commentDislikeLoading[comment.id] || isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                          <Ionicons name={isCommentDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={isCommentDisliked ? "#6b7280" : isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                      setShowSuppCommentListModal(false);
                      navigation.navigate('Report', {
                        type: 'comment',
                        targetType: 5,
                        targetId: Number(comment.id) || 0
                      });
                    }}>
                          <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  
                  {/* 回复列表 */}
                  {Boolean(expandedSuppCommentReplies[comment.id]) && <View style={styles.repliesContainer}>
                      {Boolean(suppCommentRepliesMap[comment.id]?.loading) && <View style={styles.loadingIndicator}>
                          <Text style={styles.loadingText}>加载回复中...</Text>
                        </View>}
                      {!suppCommentRepliesMap[comment.id]?.loading && Boolean(suppCommentRepliesMap[comment.id]?.loaded && (!suppCommentRepliesMap[comment.id]?.list || suppCommentRepliesMap[comment.id]?.list.length === 0)) && <View style={styles.loadingIndicator}>
                          <Text style={styles.loadingText}>暂无回复</Text>
                        </View>}
                      {suppCommentRepliesMap[comment.id]?.list?.length ? renderSupplementReplyTreeNodes(buildCommentReplyTree(suppCommentRepliesMap[comment.id].list, comment.id), 0, {
                    rootCommentId: comment.id,
                    beforeOpenReply: () => setShowSuppCommentListModal(false),
                    beforeReport: () => setShowSuppCommentListModal(false)
                  }) : null}
                    </View>}
                </View>)}
              {Boolean(suppCommentListState.loadingMore) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>加载更多评论中...</Text>
                </View>}
              {Boolean(suppCommentsHasMore && !suppCommentListState.loadingMore && suppCommentsList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={handleSupplementCommentsLoadMore}>
                  <Text style={styles.loadMoreText}>加载更多评论</Text>
                  <Ionicons name="chevron-down" size={16} color="#ef4444" />
                </TouchableOpacity>}
              {!suppCommentsHasMore && suppCommentsList.length > 0 && <View style={styles.supplementsNoMore}>
                  <Text style={styles.supplementsNoMoreText}>没有更多评论了</Text>
                </View>}
            </ScrollView>

            <View style={[styles.commentListBottomBar, { paddingBottom: commentSheetBottomSpacing }]}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowSuppCommentListModal(false);
              openCommentModal({
                targetType: 3,
                targetId: currentSuppId,
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

      {/* 补充问题更多操作弹窗 */}
      <Modal visible={showSuppMoreModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSuppMoreModal(false)} />
          <View style={[styles.suppMoreModal, {
          paddingBottom: insets.bottom + 30
        }]}>
            <View style={styles.suppMoreModalHandle} />
            
            <View style={styles.suppMoreActionList}>
              <TouchableOpacity style={styles.suppMoreActionItem}>
                <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                <Text style={styles.suppMoreActionText}>@推特用户</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.suppMoreActionItem, isDislikeInteractionDisabled(getSupplementLikedState(currentSuppId), getSupplementDislikedState(currentSuppId)) && styles.interactionBtnDisabled]} onPress={() => handleSupplementDislike(currentSuppId)} disabled={isDislikeInteractionDisabled(getSupplementLikedState(currentSuppId), getSupplementDislikedState(currentSuppId))}>
                <Ionicons name={getSupplementDislikedState(currentSuppId) ? "thumbs-down" : "thumbs-down-outline"} size={22} color={getSupplementDislikedState(currentSuppId) ? "#ef4444" : isDislikeInteractionDisabled(getSupplementLikedState(currentSuppId), getSupplementDislikedState(currentSuppId)) ? "#d1d5db" : "#6b7280"} />
                <Text style={[styles.suppMoreActionText, getSupplementDislikedState(currentSuppId) && {
                color: '#ef4444'
              }, isDislikeInteractionDisabled(getSupplementLikedState(currentSuppId), getSupplementDislikedState(currentSuppId)) && styles.interactionTextDisabled]}>
                  {getSupplementDislikedState(currentSuppId) ? '取消踩' : '踩一下'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suppMoreActionItem} onPress={() => {
              setShowSuppMoreModal(false);
              navigation.navigate('Report', {
                type: 'supplement',
                targetType: 3,
                targetId: Number(currentSuppId) || 0
              });
            }}>
                <Ionicons name="flag-outline" size={22} color="#ef4444" />
                <Text style={[styles.suppMoreActionText, {
                color: '#ef4444'
              }]}>举报</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.suppMoreCancelBtn} onPress={() => setShowSuppMoreModal(false)}>
              <Text style={styles.suppMoreCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WriteCommentModal
        visible={showCommentModal}
        onClose={handleCloseCommentComposer}
        onPublish={handleSubmitComment}
        originalComment={currentComposerOriginalComment}
        publishInFooter
        closeOnRight
        title={commentTarget.parentId ? `写回复${commentTarget.replyToUserName ? ` @${commentTarget.replyToUserName}` : ''}` : '写评论'}
        placeholder={commentTarget.parentId ? '写下你的回复...' : '写下你的评论...'}
      />

      {/* 评论回复列表弹窗 - 今日头条风格 */}
      <Modal visible={showCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCommentReplyModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            
            {/* Header - 显示回复数量 */}
            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={() => setShowCommentReplyModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentListModalTitle}>
                {Number(currentReplyComment?.replyCount ?? currentReplyComment?.replies ?? questionCommentRepliesMap[currentCommentId]?.total ?? questionCommentRepliesMap[currentCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <View style={styles.commentListHeaderRight} />
            </View>
            
            {/* 原评论卡片 - 今日头条风格 */}
            {Boolean(currentReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentReplyComment)}>
                  <Avatar uri={currentReplyComment.userAvatar || currentReplyComment.avatar} name={currentReplyComment.userName || currentReplyComment.userNickname || currentReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentReplyComment.userName || currentReplyComment.userNickname || currentReplyComment.author}
                  </Text>
                  <View style={{
                flex: 1
                  }} />
                  <Text style={styles.originalCommentTime}>
                    {currentReplyComment.time}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>
                  {currentReplyComment.content}
                </Text>
              </View>}
            
            {/* 全部回复标题 */}
            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>
            
            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentCommentId && questionCommentRepliesMap[currentCommentId]?.list ? renderQuestionReplyTreeNodes(buildCommentReplyTree(questionCommentRepliesMap[currentCommentId].list, currentCommentId), 0, {
            rootCommentId: currentCommentId
          }) : null}
              {currentCommentId && questionCommentRepliesMap[currentCommentId]?.loaded && (!questionCommentRepliesMap[currentCommentId]?.list || questionCommentRepliesMap[currentCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={[styles.commentListBottomBar, { paddingBottom: commentSheetBottomSpacing }]}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              openCommentModal(buildCommentReplyTarget(currentReplyComment, {
                targetType: 1,
                targetId: route?.params?.id ?? questionData?.id
              }));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 回答评论回复列表弹窗 - 今日头条风格 */}
      <Modal visible={showAnswerCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => {
            setShowAnswerCommentListModal(true);
            setTimeout(() => setShowAnswerCommentReplyModal(false), 50);
          }} />

          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />

            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={() => {
              setShowAnswerCommentListModal(true);
              setTimeout(() => setShowAnswerCommentReplyModal(false), 50);
            }} style={[styles.commentListCloseBtn, {
              left: 16,
              right: 'auto'
            }]}>
                <Ionicons name="arrow-back" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentListModalTitle}>
                {Number(currentAnswerReplyComment?.replyCount ?? currentAnswerReplyComment?.replies ?? answerCommentRepliesMap[currentAnswerCommentId]?.total ?? answerCommentRepliesMap[currentAnswerCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <View style={styles.commentListHeaderRight} />
            </View>

            {Boolean(currentAnswerReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentAnswerReplyComment)}>
                  <Avatar uri={currentAnswerReplyComment.userAvatar || currentAnswerReplyComment.avatar} name={currentAnswerReplyComment.userName || currentAnswerReplyComment.userNickname || currentAnswerReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentAnswerReplyComment.userName || currentAnswerReplyComment.userNickname || currentAnswerReplyComment.author}
                  </Text>
                  <View style={{flex: 1}} />
                  <Text style={styles.originalCommentTime}>
                    {currentAnswerReplyComment.time}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>
                  {currentAnswerReplyComment.content}
                </Text>
              </View>}

            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>

            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentAnswerCommentId && answerCommentRepliesMap[currentAnswerCommentId]?.list ? renderAnswerReplyTreeNodes(buildCommentReplyTree(answerCommentRepliesMap[currentAnswerCommentId].list, currentAnswerCommentId), 0, {
            rootCommentId: currentAnswerCommentId,
            beforeOpenReply: () => setShowAnswerCommentReplyModal(false),
            beforeReport: () => setShowAnswerCommentReplyModal(false)
          }) : null}
              {currentAnswerCommentId && answerCommentRepliesMap[currentAnswerCommentId]?.loaded && (!answerCommentRepliesMap[currentAnswerCommentId]?.list || answerCommentRepliesMap[currentAnswerCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={[styles.commentListBottomBar, { paddingBottom: commentSheetBottomSpacing }]}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              const currentComment = answerCommentsList.find(c => String(c.id) === String(currentAnswerCommentId));
              setShowAnswerCommentReplyModal(false);
              openCommentModal(buildCommentReplyTarget(currentComment, {
                targetType: 2,
                targetId: currentAnswerId
              }));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 补充评论回复列表弹窗 - 今日头条风格 */}
      <Modal visible={showSuppCommentReplyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => {
            setShowSuppCommentListModal(true);
            setTimeout(() => setShowSuppCommentReplyModal(false), 50);
          }} />
          
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            
            {/* Header - 显示回复数量 */}
            <View style={styles.commentListModalHeader}>
              <TouchableOpacity onPress={() => {
                setShowSuppCommentListModal(true);
                setTimeout(() => setShowSuppCommentReplyModal(false), 50);
              }} style={[styles.commentListCloseBtn, {left: 16, right: 'auto'}]}>
                <Ionicons name="arrow-back" size={26} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.commentListModalTitle}>
                {Number(currentSuppReplyComment?.replyCount ?? currentSuppReplyComment?.replies ?? suppCommentRepliesMap[currentSuppCommentId]?.total ?? suppCommentRepliesMap[currentSuppCommentId]?.list?.length ?? 0)}条回复
              </Text>
              <View style={styles.commentListHeaderRight} />
            </View>
            
            {/* 原评论卡片 - 今日头条风格 */}
            {Boolean(currentSuppReplyComment) && <View style={styles.originalCommentCard}>
                <TouchableOpacity style={styles.originalCommentHeader} activeOpacity={0.7} onPress={() => openPublicProfile(currentSuppReplyComment)}>
                  <Avatar uri={currentSuppReplyComment.userAvatar || currentSuppReplyComment.avatar} name={currentSuppReplyComment.userName || currentSuppReplyComment.userNickname || currentSuppReplyComment.author} size={32} />
                  <Text style={styles.originalCommentAuthor}>
                    {currentSuppReplyComment.userName || currentSuppReplyComment.userNickname || currentSuppReplyComment.author}
                  </Text>
                  <View style={{flex: 1}} />
                  <Text style={styles.originalCommentTime}>
                    {currentSuppReplyComment.time}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.originalCommentText}>
                  {currentSuppReplyComment.content}
                </Text>
              </View>}
            
            {/* 全部回复标题 */}
            <View style={styles.repliesSectionHeader}>
              <Text style={styles.repliesSectionTitle}>全部回复</Text>
            </View>
            
            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {currentSuppCommentId && suppCommentRepliesMap[currentSuppCommentId]?.list ? renderSupplementReplyTreeNodes(buildCommentReplyTree(suppCommentRepliesMap[currentSuppCommentId].list, currentSuppCommentId), 0, {
            rootCommentId: currentSuppCommentId,
            beforeOpenReply: () => setShowSuppCommentReplyModal(false),
            beforeReport: () => setShowSuppCommentReplyModal(false)
          }) : null}
              {currentSuppCommentId && suppCommentRepliesMap[currentSuppCommentId]?.loaded && (!suppCommentRepliesMap[currentSuppCommentId]?.list || suppCommentRepliesMap[currentSuppCommentId].list.length === 0) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>暂无回复</Text>
                </View>}
            </ScrollView>

            <View style={[styles.commentListBottomBar, { paddingBottom: commentSheetBottomSpacing }]}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              const currentComment = suppCommentsList.find(c => String(c.id) === String(currentSuppCommentId));
              setShowSuppCommentReplyModal(false);
              openCommentModal(buildCommentReplyTarget(currentComment, {
                targetType: 3,
                targetId: currentSuppId
              }));
            }}>
                <Ionicons name="create-outline" size={18} color="#6b7280" />
                <Text style={styles.commentListWriteText}>写回复...</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <WriteAnswerModal
        visible={showAnswerModal}
        onClose={() => {
          setShowAnswerModal(false);
          setCurrentSupplement(null);
        }}
        onSubmit={handleSubmitAnswer}
        title="写回答"
        publishText="发布"
        questionTitle={currentQuestion.title}
        supplementText={currentSupplement?.content || ''}
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
      />

      {/* 发布补充问题弹窗 */}
      <Modal visible={showSupplementModal} animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <KeyboardDismissView>
            <ModalSafeAreaView style={styles.answerModal} edges={['top']}>
          <View style={styles.answerModalHeader}>
            <TouchableOpacity onPress={() => setShowSupplementModal(false)} style={styles.answerCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.answerHeaderCenter}>
              <Text style={styles.answerModalTitle}>补充问题</Text>
            </View>
            <TouchableOpacity style={[styles.answerPublishBtn, (!supplementText.trim() || !!getSupplementPublishBlockedReason()) && styles.answerPublishBtnDisabled]} onPress={handleSubmitSupplement} disabled={!supplementText.trim() || !!getSupplementPublishBlockedReason()}>
              <Text style={[styles.answerPublishText, (!supplementText.trim() || !!getSupplementPublishBlockedReason()) && styles.answerPublishTextDisabled]}>发布</Text>
            </TouchableOpacity>
          </View>
          {Boolean(getSupplementPublishBlockedReason()) && <View style={styles.supplementBlockedBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#b45309" />
              <Text style={styles.supplementBlockedBannerText}>{getSupplementPublishBlockedReason()}</Text>
            </View>}

          <View style={styles.answerQuestionCard}>
            <View style={styles.answerQuestionIcon}>
              <Ionicons name="help-circle" size={20} color="#ef4444" />
            </View>
            <View style={styles.answerQuestionContent}>
              <Text style={styles.answerQuestionText} numberOfLines={2}>{currentQuestion.title}</Text>
            </View>
          </View>

          <ScrollView style={styles.answerContentArea} contentContainerStyle={[styles.answerContentContainer, {
          paddingBottom: bottomSafeInset + 16
        }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <TextInput style={styles.answerTextInput} placeholder="对这个问题还有疑问？写下你的补充问题..." placeholderTextColor="#bbb" value={supplementText} onChangeText={setSupplementText} multiline autoFocus textAlignVertical="top" />
            
            {/* 图片预览区域 */}
            {supplementImages.length > 0 && <View style={styles.answerImagesPreview}>
                {supplementImages.map((imageUri, index) => <View key={index} style={styles.answerImagePreviewItem}>
                    <Image source={{
                uri: imageUri
              }} style={styles.answerImagePreview} />
                    <TouchableOpacity style={styles.answerImageRemoveBtn} onPress={() => {
                setSupplementImages(supplementImages.filter((_, i) => i !== index));
              }}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>)}
              </View>}
            
            {/* 身份选择器 */}
            <View style={styles.answerIdentitySection}>
              <IdentitySelector selectedIdentity={supplementQuestionIdentity} selectedTeams={supplementQuestionSelectedTeams} onIdentityChange={setSupplementQuestionIdentity} onTeamsChange={setSupplementQuestionSelectedTeams} />
            </View>
          </ScrollView>

          <View style={[styles.answerToolbar, {
          paddingBottom: bottomSafeInset
        }]}>
            <View style={styles.answerToolsLeft}>
              <TouchableOpacity style={styles.answerToolItem} onPress={() => {
              if (supplementImages.length >= 9) {
                showToast('最多只能添加9张图片', 'warning');
                return;
              }
              setShowSupplementImagePicker(true);
            }}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="at-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerWordCount}>{supplementText.length}/500</Text>
          </View>
            </ModalSafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 补充问题图片选择器 */}
      <ImagePickerSheet visible={showSupplementImagePicker} onClose={() => setShowSupplementImagePicker(false)} onImageSelected={imageUri => {
      setSupplementImages([...supplementImages, imageUri]);
      setShowSupplementImagePicker(false);
    }} />

      {/* 回答评论列表弹窗 */}
      <Modal visible={showAnswerCommentListModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAnswerCommentListModal(false)} />
          <View style={styles.commentListModal}>
            <View style={styles.commentListModalHandle} />
            <View style={styles.commentListModalHeader}>
              <View style={styles.commentListHeaderLeft} />
              <Text style={styles.commentListModalTitle}>全部评论</Text>
              <TouchableOpacity onPress={() => setShowAnswerCommentListModal(false)} style={styles.commentListCloseBtn}>
                <Ionicons name="close" size={26} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.commentListScroll} showsVerticalScrollIndicator={false}>
              {answerCommentListState.loading && answerCommentsList.length === 0 ? <View style={styles.supplementsLoadingContainer}>
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text style={styles.supplementsLoadingText}>加载评论中...</Text>
                </View> : answerCommentsList.length === 0 ? <View style={styles.supplementsEmptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
                  <Text style={styles.supplementsEmptyText}>暂无评论</Text>
                  <Text style={styles.supplementsEmptyDesc}>成为第一个评论的人</Text>
                </View> : answerCommentsList.map(comment => {
                const isCommentLiked = commentLiked[comment.id] !== undefined ? commentLiked[comment.id] : !!comment.liked;
                const isCommentCollected = commentCollected[comment.id] !== undefined ? commentCollected[comment.id] : !!comment.collected;
                const isCommentDisliked = commentDisliked[comment.id] !== undefined ? commentDisliked[comment.id] : !!comment.disliked;
                const commentLikeCount = getCommentLikeDisplayCount(comment, commentLiked[comment.id]);
                const commentCollectCount = getCommentCollectDisplayCount(comment, commentCollected[comment.id]);
                const commentDislikeCount = getCommentDislikeDisplayCount(comment, commentDisliked[comment.id]);
                return <View key={comment.id}>
                    <View style={styles.commentListCard}>
                      <TouchableOpacity style={styles.commentListHeader} activeOpacity={0.7} onPress={() => openPublicProfile(comment)}>
                        <Avatar uri={comment.userAvatar || comment.avatar} name={comment.userName || comment.userNickname || comment.author} size={24} />
                        <Text style={styles.commentListAuthor}>{comment.userName || comment.userNickname || comment.author}</Text>
                        <View style={{
                      flex: 1
                    }} />
                        <Text style={styles.commentListTime}>{comment.time}</Text>
                      </TouchableOpacity>
                      <View style={styles.commentListContent}>
                        <Text style={styles.commentListText}>{comment.content}</Text>
                        <View style={styles.commentListActions}>
                          <TouchableOpacity style={[styles.commentListActionBtn, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentLike(comment.id)} disabled={commentLikeLoading[comment.id] || isLikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                            <Ionicons name={isCommentLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isCommentLiked ? "#ef4444" : isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentLiked && {
                          color: '#ef4444'
                        }, isLikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionTextDisabled]}>{commentLikeCount}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                        setCurrentAnswerCommentId(comment.id);
                        setShowAnswerCommentListModal(false);
                        setShowAnswerCommentReplyModal(true);
                      }}>
                            <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentListActionText}>{Number(comment.replyCount ?? comment.replies ?? 0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => openShareModalWithData(buildAnswerCommentSharePayload(comment))}>
                            <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                            <Text style={styles.commentListActionText}>{Number(comment.shareCount ?? comment.shares ?? 0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => handleCommentCollect(comment.id)} disabled={commentCollectLoading[comment.id]}>
                            <Ionicons name={isCommentCollected ? "star" : "star-outline"} size={14} color={isCommentCollected ? "#f59e0b" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentCollected && {
                          color: '#f59e0b'
                        }]}>{commentCollectCount}</Text>
                          </TouchableOpacity>
                          <View style={{
                        flex: 1
                      }} />
                          <TouchableOpacity style={[styles.commentListActionBtn, isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionBtnDisabled]} onPress={() => handleCommentDislike(comment.id)} disabled={commentDislikeLoading[comment.id] || isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked)}>
                            <Ionicons name={isCommentDisliked ? "thumbs-down" : "thumbs-down-outline"} size={14} color={isCommentDisliked ? "#6b7280" : isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) ? "#d1d5db" : "#9ca3af"} />
                            <Text style={[styles.commentListActionText, isCommentDisliked && {
                          color: '#6b7280'
                        }, isDislikeInteractionDisabled(isCommentLiked, isCommentDisliked) && styles.interactionTextDisabled]}>{commentDislikeCount}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentListActionBtn} onPress={() => {
                        Alert.alert('举报', '确定要举报这条评论吗？', [{
                          text: '取消',
                          style: 'cancel'
                        }, {
                          text: '确定',
                          onPress: () => {
                            setShowAnswerCommentListModal(false);
                            navigation.navigate('Report', {
                              type: 'comment',
                              targetType: 5,
                              targetId: Number(comment.id) || 0
                            });
                          }
                        }]);
                      }}>
                            <Ionicons name="flag-outline" size={14} color="#ef4444" />
                            <Text style={styles.commentListActionText}>{formatNumber(comment.reports || 0)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>;
              })}
              {Boolean(answerCommentListState.loadingMore) && <View style={styles.loadingIndicator}>
                  <Text style={styles.loadingText}>加载更多评论中...</Text>
                </View>}
              {Boolean(answerCommentsHasMore && !answerCommentListState.loadingMore && answerCommentsList.length > 0) && <TouchableOpacity style={styles.loadMoreBtn} onPress={handleAnswerCommentsLoadMore}>
                  <Text style={styles.loadMoreText}>加载更多评论</Text>
                  <Ionicons name="chevron-down" size={16} color="#ef4444" />
                </TouchableOpacity>}
              {!answerCommentsHasMore && answerCommentsList.length > 0 && <View style={styles.supplementsNoMore}>
                  <Text style={styles.supplementsNoMoreText}>没有更多评论了</Text>
                </View>}
            </ScrollView>

            <View style={[styles.commentListBottomBar, { paddingBottom: commentSheetBottomSpacing }]}>
              <TouchableOpacity style={styles.commentListWriteBtn} onPress={() => {
              setShowAnswerCommentListModal(false);
              openCommentModal({
                targetType: 2,
                targetId: currentAnswerId,
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

      {/* 发起活动弹窗 */}
      <Modal visible={showActivityModal} animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <KeyboardDismissView>
            <SafeAreaView style={styles.activityModal} edges={['top']}>
          <View style={styles.activityModalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.activityCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.activityHeaderCenter}>
              <Text style={styles.activityModalTitle}>发起活动</Text>
            </View>
            <TouchableOpacity style={[styles.activityPublishBtn, !activityForm.title.trim() && styles.activityPublishBtnDisabled]} onPress={handleCreateActivity} disabled={!activityForm.title.trim()}>
              <Text style={[styles.activityPublishText, !activityForm.title.trim() && styles.activityPublishTextDisabled]}>发布</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.activityFormArea} contentContainerStyle={[styles.activityFormContent, {
          paddingBottom: bottomSafeInset + 28
        }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            {/* 绑定问题显示 */}
            <View style={styles.boundQuestionCard}>
              <View style={styles.boundQuestionHeader}>
                <Ionicons name="link" size={16} color="#22c55e" />
                <Text style={styles.boundQuestionLabel}>绑定问题</Text>
              </View>
              <Text style={styles.boundQuestionText} numberOfLines={2}>{currentQuestion.title}</Text>
            </View>

            {/* 发起身份选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>发起身份 <Text style={styles.required}>*</Text></Text>
              <View style={styles.organizerSelector}>
                <TouchableOpacity style={[styles.organizerOption, activityForm.organizerType === 'personal' && styles.organizerOptionActive]} onPress={() => setActivityForm({
                ...activityForm,
                organizerType: 'personal'
              })}>
                  <Ionicons name="person" size={20} color={activityForm.organizerType === 'personal' ? '#fff' : '#666'} />
                  <Text style={[styles.organizerOptionText, activityForm.organizerType === 'personal' && styles.organizerOptionTextActive]}>个人发起</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.organizerOption, activityForm.organizerType === 'team' && styles.organizerOptionActive]} onPress={() => setActivityForm({
                ...activityForm,
                organizerType: 'team'
              })}>
                  <Ionicons name="people" size={20} color={activityForm.organizerType === 'team' ? '#fff' : '#666'} />
                  <Text style={[styles.organizerOptionText, activityForm.organizerType === 'team' && styles.organizerOptionTextActive]}>团队发起</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 活动类型选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>活动类型</Text>
              <View style={styles.activityTypeSelector}>
                <TouchableOpacity style={[styles.activityTypeSelectorBtn, activityForm.activityType === 'online' && styles.activityTypeSelectorBtnActive]} onPress={() => setActivityForm({
                ...activityForm,
                activityType: 'online'
              })}>
                  <Ionicons name="globe-outline" size={20} color={activityForm.activityType === 'online' ? '#fff' : '#666'} />
                  <Text style={[styles.activityTypeSelectorText, activityForm.activityType === 'online' && styles.activityTypeSelectorTextActive]}>线上活动</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.activityTypeSelectorBtn, activityForm.activityType === 'offline' && styles.activityTypeSelectorBtnActive]} onPress={() => setActivityForm({
                ...activityForm,
                activityType: 'offline'
              })}>
                  <Ionicons name="location-outline" size={20} color={activityForm.activityType === 'offline' ? '#fff' : '#666'} />
                  <Text style={[styles.activityTypeSelectorText, activityForm.activityType === 'offline' && styles.activityTypeSelectorTextActive]}>线下活动</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>活动标题 <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} placeholder="请输入活动标题" placeholderTextColor="#bbb" value={activityForm.title} onChangeText={text => setActivityForm({
              ...activityForm,
              title: text
            })} maxLength={50} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>活动内容 <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.formInput, styles.formTextarea]} placeholder="请输入活动详细内容" placeholderTextColor="#bbb" value={activityForm.description} onChangeText={text => setActivityForm({
              ...activityForm,
              description: text
            })} multiline textAlignVertical="top" maxLength={500} />
            </View>

            {/* 活动时间 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>活动时间 <Text style={styles.required}>*</Text></Text>
              <View style={styles.timeContainer}>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeInputLabel}>开始日期</Text>
                  <TextInput style={styles.timeInputField} placeholder="2026-01-20" placeholderTextColor="#9ca3af" value={activityForm.startTime} onChangeText={text => setActivityForm({
                  ...activityForm,
                  startTime: text
                })} />
                </View>
                <View style={styles.timeSeparatorWrapper}>
                  <Text style={styles.timeSeparator}>至</Text>
                </View>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeInputLabel}>结束日期</Text>
                  <TextInput style={styles.timeInputField} placeholder="2026-01-25" placeholderTextColor="#9ca3af" value={activityForm.endTime} onChangeText={text => setActivityForm({
                  ...activityForm,
                  endTime: text
                })} />
                </View>
              </View>
            </View>

            {/* 活动地址 - 仅线下活动显示 */}
            {activityForm.activityType === 'offline' && <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  活动地址 <Text style={styles.required}>*</Text>
                </Text>
                <TextInput style={styles.formInput} placeholder="请输入活动地址" placeholderTextColor="#bbb" value={activityForm.location} onChangeText={text => setActivityForm({
              ...activityForm,
              location: text
            })} />
              </View>}

            {/* 活动图片 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>活动图片（最多9张）</Text>
              <View style={styles.imageGrid}>
                {activityForm.images.map((img, idx) => <View key={idx} style={styles.imageItem}>
                    <Image source={{
                  uri: img
                }} style={styles.uploadedImage} />
                    <TouchableOpacity style={styles.removeImage} onPress={() => removeActivityImage(idx)}>
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>)}
                {activityForm.images.length < 9 && <TouchableOpacity style={styles.addImageBtn} onPress={addActivityImage}>
                    <Ionicons name="add" size={24} color="#9ca3af" />
                    <Text style={styles.addImageText}>添加图片</Text>
                  </TouchableOpacity>}
              </View>
            </View>

            {/* 联系方式 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>联系方式</Text>
              <TextInput style={styles.formInput} placeholder="请输入联系方式（手机号/微信/邮箱）" placeholderTextColor="#bbb" value={activityForm.contact} onChangeText={text => setActivityForm({
              ...activityForm,
              contact: text
            })} />
            </View>

            <View style={{
            height: 40
          }} />
          </ScrollView>
            </SafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Modal>

      {/* 补充回答弹窗 */}
      <Modal visible={showSupplementAnswerModal} animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <KeyboardDismissView>
            <SafeAreaView style={styles.answerModal} edges={['top']}>
          <View style={styles.answerModalHeader}>
            <TouchableOpacity onPress={() => {
            setShowSupplementAnswerModal(false);
            setCurrentAnswer(null);
            setSupplementAnswerText('');
          }} style={styles.answerCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.answerHeaderCenter}>
              <Text style={styles.answerModalTitle}>补充回答</Text>
            </View>
            <TouchableOpacity style={[styles.answerPublishBtn, !supplementAnswerText.trim() && styles.answerPublishBtnDisabled]} onPress={handleSubmitSupplementAnswer} disabled={!supplementAnswerText.trim()}>
              <Text style={[styles.answerPublishText, !supplementAnswerText.trim() && styles.answerPublishTextDisabled]}>发布</Text>
            </TouchableOpacity>
          </View>

          {Boolean(currentAnswer) && <View style={styles.supplementAnswerContext}>
              <View style={styles.supplementAnswerHeader}>
                <Ionicons name="document-text" size={18} color="#3b82f6" />
                <Text style={styles.supplementAnswerLabel}>原回答</Text>
              </View>
              <View style={styles.supplementAnswerAuthor}>
                <Avatar uri={currentAnswer.avatar} name={currentAnswer.author} size={24} />
                <Text style={styles.supplementAnswerAuthorName}>{currentAnswer.author}</Text>
              </View>
              <Text style={styles.supplementAnswerContent} numberOfLines={3}>{currentAnswer.content}</Text>
            </View>}

          <ScrollView style={styles.answerContentArea} contentContainerStyle={[styles.answerContentContainer, {
          paddingBottom: bottomSafeInset + 16
        }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <TextInput style={styles.answerTextInput} placeholder="补充你的回答，提供更多信息..." placeholderTextColor="#bbb" value={supplementAnswerText} onChangeText={setSupplementAnswerText} multiline autoFocus textAlignVertical="top" />
            
            {/* 身份选择器 */}
            <View style={styles.answerIdentitySection}>
              <IdentitySelector selectedIdentity={supplementIdentity} selectedTeams={supplementSelectedTeams} onIdentityChange={setSupplementIdentity} onTeamsChange={setSupplementSelectedTeams} />
            </View>
          </ScrollView>

          <View style={[styles.answerToolbar, {
          paddingBottom: bottomSafeInset
        }]}>
            <View style={styles.answerToolsLeft}>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="at-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerWordCount}>{supplementAnswerText.length}/2000</Text>
          </View>
            </SafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showSupplementAnswerSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSupplementAnswerSuccessModal(false)}>
        <View style={styles.successModalOverlay}>
          <TouchableOpacity style={styles.successModalBackdrop} activeOpacity={1} onPress={() => setShowSupplementAnswerSuccessModal(false)} />
          <View style={styles.successModalCard}>
            <View style={styles.successModalTitleRow}>
              <View style={styles.successModalIconWrap}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#ff4d4f" />
              </View>
              <Text style={styles.successModalTitle}>补充回答提交成功</Text>
            </View>
            <Text style={styles.successModalDesc}>你的补充回答已成功发布</Text>
            <View style={styles.successModalFooter}>
              <TouchableOpacity style={styles.successModalConfirmBtn} onPress={() => setShowSupplementAnswerSuccessModal(false)}>
                <Text style={styles.successModalConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 追加悬赏弹窗 */}
      <Modal visible={showAddRewardModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.addRewardModal, {
          paddingBottom: insets.bottom + 30
        }]}>
            <View style={styles.addRewardModalHandle} />
            <Text style={styles.addRewardModalTitle}>追加悬赏</Text>
            
            <View style={styles.addRewardContent}>
              {/* 当前悬赏信息 */}
              <View style={styles.currentRewardInfo}>
                <View style={styles.currentRewardRow}>
                  <Text style={styles.currentRewardLabel}>当前悬赏</Text>
                  <Text style={styles.currentRewardAmount}>${currentReward}</Text>
                </View>
                <View style={styles.currentRewardRow}>
                  <Text style={styles.currentRewardDesc}>已有 {rewardContributors} 人追加悬赏</Text>
                </View>
              </View>

              {/* 快速选择金额 */}
              <Text style={styles.addRewardSectionTitle}>选择追加金额</Text>
              <View style={styles.quickAmountGrid}>
                {[10, 20, 50, 100, 200, 500].map(amount => <TouchableOpacity key={amount} style={[styles.quickAmountBtn, selectedAddRewardAmount === amount && styles.quickAmountBtnActive]} onPress={() => {
                setSelectedAddRewardAmount(amount);
                setAddRewardAmount('');
              }}>
                    <Text style={[styles.quickAmountText, selectedAddRewardAmount === amount && styles.quickAmountTextActive]}>${amount}</Text>
                  </TouchableOpacity>)}
              </View>

              {/* 自定义金额 */}
              <Text style={styles.addRewardSectionTitle}>或输入自定义金额</Text>
              <View style={styles.customAmountInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput style={styles.customAmountField} placeholder="最低 $5" placeholderTextColor="#9ca3af" value={addRewardAmount} onChangeText={text => {
                setAddRewardAmount(text);
                setSelectedAddRewardAmount(null);
              }} keyboardType="numeric" />
              </View>

              {/* 提示信息 */}
              <View style={styles.addRewardTips}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.addRewardTipsText}>
                  追加的悬赏将与原悬赏合并，吸引更多优质回答
                </Text>
              </View>

              {/* 确认按钮 */}
              <TouchableOpacity style={[styles.confirmAddRewardBtn, !selectedAddRewardAmount && !addRewardAmount && styles.confirmAddRewardBtnDisabled]} onPress={handleAddReward} disabled={!selectedAddRewardAmount && !addRewardAmount}>
                <Text style={styles.confirmAddRewardBtnText}>
                  确认追加 ${selectedAddRewardAmount || addRewardAmount || 0}
                </Text>
              </TouchableOpacity>

              {/* 取消按钮 */}
              <TouchableOpacity style={styles.cancelAddRewardBtn} onPress={() => {
              setShowAddRewardModal(false);
              setAddRewardAmount('');
              setSelectedAddRewardAmount(null);
            }}>
                <Text style={styles.cancelAddRewardBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 购买超级赞弹窗 */}
      <Modal visible={showSuperLikeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.superLikeModal}>
            <View style={styles.superLikeModalHandle} />
            <View style={styles.superLikeModalHeader}>
              <Ionicons name="star" size={24} color="#f59e0b" />
              <Text style={styles.superLikeModalTitle}>购买超级赞</Text>
            </View>
            
            <ScrollView style={styles.superLikeScrollContent} contentContainerStyle={styles.superLikeContentContainer} showsVerticalScrollIndicator={false}>
              {/* 当前超级赞信息 */}
              <View style={styles.currentSuperLikeInfo}>
                <View style={styles.superLikeInfoCard}>
                  <View style={styles.superLikeInfoRow}>
                    <Text style={styles.superLikeInfoLabel}>当前超级赞</Text>
                    <View style={styles.superLikeCountBadge}>
                      <Ionicons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.superLikeCountText}>
                        {answerSuperLikes[currentAnswerForSuperLike?.id] || currentAnswerForSuperLike?.superLikes || 0}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.superLikeInfoDesc}>
                    超级赞越多，您的回答排名越靠前，获得更多曝光
                  </Text>
                </View>
              </View>

              {/* 快速选择数量 */}
              <Text style={styles.superLikeSectionTitle}>选择购买数量</Text>
              <View style={styles.quickSuperLikeGrid}>
                {[5, 10, 20, 50, 100].map(amount => <TouchableOpacity key={amount} style={[styles.quickSuperLikeBtn, selectedSuperLikeAmount === amount && styles.quickSuperLikeBtnActive]} onPress={() => {
                setSelectedSuperLikeAmount(amount);
                setSuperLikeAmount('');
              }}>
                    <Ionicons name="star" size={18} color={selectedSuperLikeAmount === amount ? "#fff" : "#f59e0b"} />
                    <Text style={[styles.quickSuperLikeText, selectedSuperLikeAmount === amount && styles.quickSuperLikeTextActive]}>x{amount}</Text>
                    <Text style={[styles.quickSuperLikePrice, selectedSuperLikeAmount === amount && styles.quickSuperLikePriceActive]}>${amount * 2}</Text>
                  </TouchableOpacity>)}
              </View>

              {/* 自定义数量 */}
              <Text style={styles.superLikeSectionTitle}>或输入自定义数量</Text>
              <View style={styles.customSuperLikeInput}>
                <Ionicons name="star-outline" size={20} color="#f59e0b" />
                <TextInput style={styles.customSuperLikeField} placeholder="最少 1 个" placeholderTextColor="#9ca3af" value={superLikeAmount} onChangeText={text => {
                setSuperLikeAmount(text);
                setSelectedSuperLikeAmount(null);
              }} keyboardType="numeric" />
                <Text style={styles.superLikePriceHint}>
                  ${(parseInt(superLikeAmount) || 0) * 2}
                </Text>
              </View>

              {/* 价格说明 */}
              <View style={styles.superLikePriceInfo}>
                <View style={styles.priceInfoRow}>
                  <Text style={styles.priceInfoLabel}>单价</Text>
                  <Text style={styles.priceInfoValue}>$2 / 个</Text>
                </View>
                <View style={styles.priceInfoRow}>
                  <Text style={styles.priceInfoLabel}>购买数量</Text>
                  <Text style={styles.priceInfoValue}>
                    {selectedSuperLikeAmount || superLikeAmount || 0} 个
                  </Text>
                </View>
                <View style={[styles.priceInfoRow, styles.priceInfoTotal]}>
                  <Text style={styles.priceInfoTotalLabel}>总计</Text>
                  <Text style={styles.priceInfoTotalValue}>
                    ${(selectedSuperLikeAmount || parseInt(superLikeAmount) || 0) * 2}
                  </Text>
                </View>
              </View>

              {/* 提示信息 */}
              <View style={styles.superLikeTips}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.superLikeTipsText}>
                  购买超级赞后，您的回答将获得更高的排名权重，增加曝光机会
                </Text>
              </View>
            </ScrollView>

            {/* 底部按钮区域 - 固定在底部 */}
            <View style={[styles.superLikeFooter, {
            paddingBottom: insets.bottom + 20
          }]}>
              {/* 确认按钮 */}
              <TouchableOpacity style={[styles.confirmSuperLikeBtn, !selectedSuperLikeAmount && !superLikeAmount && styles.confirmSuperLikeBtnDisabled]} onPress={handleBuySuperLike} disabled={!selectedSuperLikeAmount && !superLikeAmount}>
                <Ionicons name="star" size={18} color="#fff" />
                <Text style={styles.confirmSuperLikeBtnText}>
                  立即购买 {selectedSuperLikeAmount || superLikeAmount || 0} 个超级赞
                </Text>
              </TouchableOpacity>

              {/* 取消按钮 */}
              <TouchableOpacity style={styles.cancelSuperLikeBtn} onPress={() => {
              setShowSuperLikeModal(false);
              setSuperLikeAmount('');
              setSelectedSuperLikeAmount(null);
              setCurrentAnswerForSuperLike(null);
            }}>
                <Text style={styles.cancelSuperLikeBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 追加悬赏人员名单弹窗 */}
      <Modal visible={showRewardContributorsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.contributorsModal, {
          paddingBottom: insets.bottom + 20
        }]}>
            <View style={styles.contributorsModalHandle} />
            <View style={styles.contributorsModalHeader}>
              <Text style={styles.contributorsModalTitle}>追加悬赏名单</Text>
              <TouchableOpacity onPress={() => setShowRewardContributorsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.contributorsTotalInfo}>
              <View style={styles.contributorsTotalRow}>
                <Text style={styles.contributorsTotalLabel}>当前总悬赏</Text>
                <Text style={styles.contributorsTotalAmount}>${currentReward}</Text>
              </View>
              <Text style={styles.contributorsTotalDesc}>共 {rewardContributors} 人追加悬赏</Text>
            </View>

            <ScrollView style={styles.contributorsList} showsVerticalScrollIndicator={false}>
              {rewardContributorsList.map((contributor, index) => <View key={contributor.id} style={styles.contributorItem}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.contributorRankText}>#{index + 1}</Text>
                  </View>
                  <Avatar uri={contributor.avatar} name={contributor.name} size={40} />
                  <View style={styles.contributorInfo}>
                    <Text style={styles.contributorName}>{contributor.name}</Text>
                    <Text style={styles.contributorTime}>{contributor.time}</Text>
                  </View>
                  <View style={styles.contributorAmountBadge}>
                    <Ionicons name="add" size={12} color="#ef4444" />
                    <Text style={styles.contributorAmountText}>${contributor.amount}</Text>
                  </View>
                </View>)}
            </ScrollView>

            <TouchableOpacity style={styles.contributorsCloseBtn} onPress={() => setShowRewardContributorsModal(false)}>
              <Text style={styles.contributorsCloseBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 申请仲裁弹窗 - 暂时隐藏 */}
      <Modal visible={false && showArbitrationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.arbitrationModal}>
            <View style={styles.arbitrationModalHandle} />
            <View style={styles.arbitrationModalHeader}>
              <Text style={styles.arbitrationModalTitle}>申请仲裁</Text>
              <TouchableOpacity onPress={() => setShowArbitrationModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.arbitrationContent} showsVerticalScrollIndicator={false}>
              {/* 说明 */}
              <View style={styles.arbitrationInfo}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.arbitrationInfoText}>
                  如果您对已采纳的答案持有不同意见，可以申请仲裁。邀请至少3位专家投票，超过50%同意则推翻采纳。
                </Text>
              </View>

              {/* 仲裁理由 */}
              <Text style={styles.arbitrationSectionTitle}>仲裁理由</Text>
              <TextInput style={styles.arbitrationReasonInput} placeholder="请详细说明您申请仲裁的理由..." placeholderTextColor="#9ca3af" value={arbitrationReason} onChangeText={setArbitrationReason} multiline numberOfLines={4} textAlignVertical="top" />

              {/* 邀请专家 */}
              <View style={styles.arbitrationExpertsHeader}>
                <Text style={styles.arbitrationSectionTitle}>邀请专家投票</Text>
                <Text style={styles.arbitrationExpertsCount}>
                  已选 {selectedExperts.length}/5 位
                </Text>
              </View>

              {/* 专家搜索框 */}
              <View style={styles.expertSearchBox}>
                <Ionicons name="search-outline" size={18} color="#9ca3af" />
                <TextInput style={styles.expertSearchInput} placeholder="搜索专家姓名、职称或领域..." placeholderTextColor="#9ca3af" value={expertSearchText} onChangeText={setExpertSearchText} />
                {expertSearchText.length > 0 && <TouchableOpacity onPress={() => setExpertSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>}
              </View>

              {/* 推荐专家标题 */}
              <View style={styles.recommendedExpertsHeader}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.recommendedExpertsTitle}>推荐专家</Text>
              </View>

              {expertsList.filter(expert => {
              if (!expertSearchText) return true;
              const searchLower = expertSearchText.toLowerCase();
              return expert.name.toLowerCase().includes(searchLower) || expert.title.toLowerCase().includes(searchLower) || expert.expertise.toLowerCase().includes(searchLower);
            }).map(expert => <TouchableOpacity key={expert.id} style={[styles.expertItem, selectedExperts.includes(expert.id) && styles.expertItemSelected]} onPress={() => toggleExpertSelection(expert.id)}>
                  <Avatar uri={expert.avatar} name={expert.name} size={44} />
                  <View style={styles.expertInfo}>
                    <View style={styles.expertNameRow}>
                      <Text style={styles.expertName}>{expert.name}</Text>
                      {Boolean(expert.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                    </View>
                    <Text style={styles.expertTitle}>{expert.title}</Text>
                    <Text style={styles.expertExpertise}>擅长：{expert.expertise}</Text>
                  </View>
                  <View style={[styles.expertCheckbox, selectedExperts.includes(expert.id) && styles.expertCheckboxSelected]}>
                    {selectedExperts.includes(expert.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>)}

              {/* 搜索无结果提示 */}
              {Boolean(expertSearchText && expertsList.filter(expert => {
              const searchLower = expertSearchText.toLowerCase();
              return expert.name.toLowerCase().includes(searchLower) || expert.title.toLowerCase().includes(searchLower) || expert.expertise.toLowerCase().includes(searchLower);
            }).length === 0) && <View style={styles.noExpertsFound}>
                  <Ionicons name="search-outline" size={32} color="#d1d5db" />
                  <Text style={styles.noExpertsFoundText}>未找到匹配的专家</Text>
                  <Text style={styles.noExpertsFoundDesc}>试试其他关键词</Text>
                </View>}

              <View style={{
              height: 20
            }} />
            </ScrollView>

            <View style={[styles.arbitrationModalFooter, {
            paddingBottom: insets.bottom + 16
          }]}>
              <TouchableOpacity style={[styles.submitArbitrationBtn, (!arbitrationReason.trim() || selectedExperts.length < 3) && styles.submitArbitrationBtnDisabled]} onPress={handleSubmitArbitration} disabled={!arbitrationReason.trim() || selectedExperts.length < 3}>
                <Text style={styles.submitArbitrationBtnText}>
                  提交仲裁申请
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelArbitrationBtn} onPress={() => {
              setShowArbitrationModal(false);
              setArbitrationReason('');
              setSelectedExperts([]);
            }}>
                <Text style={styles.cancelArbitrationBtnText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 仲裁状态弹窗 - 暂时隐藏 */}
      <Modal visible={false && showArbitrationStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.arbitrationStatusModal, {
          paddingBottom: insets.bottom + 30
        }]}>
            <View style={styles.arbitrationModalHandle} />
            <Text style={styles.arbitrationStatusTitle}>仲裁投票详情</Text>

            {/* 投票进度 */}
            <View style={styles.votingProgress}>
              <View style={styles.votingProgressBar}>
                <View style={[styles.votingAgreeBar, {
                width: `${arbitrationVotes.agree / arbitrationVotes.total * 100}%`
              }]} />
                <View style={[styles.votingDisagreeBar, {
                width: `${arbitrationVotes.disagree / arbitrationVotes.total * 100}%`
              }]} />
              </View>
              <View style={styles.votingStats}>
                <View style={styles.votingStatItem}>
                  <View style={styles.votingAgreeIndicator} />
                  <Text style={styles.votingStatText}>同意推翻：{arbitrationVotes.agree} 票</Text>
                </View>
                <View style={styles.votingStatItem}>
                  <View style={styles.votingDisagreeIndicator} />
                  <Text style={styles.votingStatText}>维持原判：{arbitrationVotes.disagree} 票</Text>
                </View>
              </View>
              <Text style={styles.votingPercentage}>
                {(arbitrationVotes.agree / arbitrationVotes.total * 100).toFixed(1)}% 同意推翻
              </Text>
            </View>

            {/* 投票结果 */}
            {arbitrationStatus === 'pending' && <View style={styles.arbitrationPendingInfo}>
                <Ionicons name="time-outline" size={24} color="#f59e0b" />
                <Text style={styles.arbitrationPendingInfoText}>
                  等待专家投票中...
                </Text>
                <TouchableOpacity style={styles.simulateVoteBtn} onPress={simulateVoting}>
                  <Text style={styles.simulateVoteBtnText}>模拟投票结果</Text>
                </TouchableOpacity>
              </View>}

            {arbitrationStatus === 'approved' && <View style={styles.arbitrationApprovedInfo}>
                <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                <Text style={styles.arbitrationResultTitle}>仲裁通过</Text>
                <Text style={styles.arbitrationResultDesc}>
                  超过50%的专家同意推翻原采纳答案，问题状态已回到PK状态
                </Text>
              </View>}

            {arbitrationStatus === 'rejected' && <View style={styles.arbitrationRejectedInfo}>
                <Ionicons name="close-circle" size={32} color="#ef4444" />
                <Text style={styles.arbitrationResultTitle}>仲裁未通过</Text>
                <Text style={styles.arbitrationResultDesc}>
                  未达到50%同意率，维持原采纳答案
                </Text>
              </View>}

            {/* 专家投票详情列表 */}
            {Boolean(arbitrationStatus) && <View style={styles.expertVotesSection}>
                <Text style={styles.expertVotesSectionTitle}>专家投票详情</Text>
                <ScrollView style={styles.expertVotesList} showsVerticalScrollIndicator={false}>
                  {expertVoteDetails.map(expert => <View key={expert.id} style={styles.expertVoteCard}>
                      <View style={styles.expertVoteHeader}>
                        <Avatar uri={expert.avatar} name={expert.name} size={40} />
                        <View style={styles.expertVoteInfo}>
                          <View style={styles.expertVoteNameRow}>
                            <Text style={styles.expertVoteName}>{expert.name}</Text>
                            <View style={[styles.expertVoteBadge, expert.vote === 'agree' ? styles.expertVoteAgreeBadge : styles.expertVoteDisagreeBadge]}>
                              <Ionicons name={expert.vote === 'agree' ? "checkmark" : "close"} size={12} color="#fff" />
                              <Text style={styles.expertVoteBadgeText}>
                                {expert.vote === 'agree' ? '同意推翻' : '维持原判'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.expertVoteTitle}>{expert.title}</Text>
                        </View>
                      </View>
                      <View style={styles.expertVoteReasonBox}>
                        <Text style={styles.expertVoteReasonLabel}>投票理由：</Text>
                        <Text style={styles.expertVoteReasonText}>{expert.reason}</Text>
                      </View>
                      <Text style={styles.expertVoteTime}>{expert.time}</Text>
                    </View>)}
                </ScrollView>
              </View>}

            <TouchableOpacity style={styles.closeArbitrationStatusBtn} onPress={() => setShowArbitrationStatusModal(false)}>
              <Text style={styles.closeArbitrationStatusBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 仲裁结果弹窗 - 暂时隐藏 */}
      <Modal visible={false && showArbitrationResultModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.arbitrationStatusModal, {
          paddingBottom: insets.bottom + 30
        }]}>
            <View style={styles.arbitrationModalHandle} />
            <Text style={styles.arbitrationStatusTitle}>仲裁结果</Text>

            {Boolean(currentArbitrationResult) && <>
                {/* 投票进度 */}
                <View style={styles.votingProgress}>
                  <View style={styles.votingProgressBar}>
                    <View style={[styles.votingAgreeBar, {
                  width: `${currentArbitrationResult.votes.agree / currentArbitrationResult.votes.total * 100}%`
                }]} />
                    <View style={[styles.votingDisagreeBar, {
                  width: `${currentArbitrationResult.votes.disagree / currentArbitrationResult.votes.total * 100}%`
                }]} />
                  </View>
                  <View style={styles.votingStats}>
                    <View style={styles.votingStatItem}>
                      <View style={styles.votingAgreeIndicator} />
                      <Text style={styles.votingStatText}>同意推翻：{currentArbitrationResult.votes.agree} 票</Text>
                    </View>
                    <View style={styles.votingStatItem}>
                      <View style={styles.votingDisagreeIndicator} />
                      <Text style={styles.votingStatText}>维持原判：{currentArbitrationResult.votes.disagree} 票</Text>
                    </View>
                  </View>
                  <Text style={styles.votingPercentage}>
                    {(currentArbitrationResult.votes.agree / currentArbitrationResult.votes.total * 100).toFixed(1)}% 同意推翻
                  </Text>
                </View>

                {/* 投票结果 */}
                {currentArbitrationResult.status === 'approved' ? <View style={styles.arbitrationApprovedInfo}>
                    <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
                    <Text style={styles.arbitrationResultTitle}>仲裁通过</Text>
                    <Text style={styles.arbitrationResultDesc}>
                      超过50%的专家同意推翻原采纳答案
                    </Text>
                  </View> : <View style={styles.arbitrationRejectedInfo}>
                    <Ionicons name="shield-checkmark" size={32} color="#22c55e" />
                    <Text style={styles.arbitrationResultTitle}>仲裁未通过</Text>
                    <Text style={styles.arbitrationResultDesc}>
                      未达到50%同意率，维持原答案
                    </Text>
                  </View>}

                {/* 专家投票详情列表 */}
                <View style={styles.expertVotesSection}>
                  <Text style={styles.expertVotesSectionTitle}>专家投票详情</Text>
                  <ScrollView style={styles.expertVotesList} showsVerticalScrollIndicator={false}>
                    {currentArbitrationResult.experts.map(expert => <View key={expert.id} style={styles.expertVoteCard}>
                        <View style={styles.expertVoteHeader}>
                          <Avatar uri={expert.avatar} name={expert.name} size={40} />
                          <View style={styles.expertVoteInfo}>
                            <View style={styles.expertVoteNameRow}>
                              <Text style={styles.expertVoteName}>{expert.name}</Text>
                              <View style={[styles.expertVoteBadge, expert.vote === 'agree' ? styles.expertVoteAgreeBadge : styles.expertVoteDisagreeBadge]}>
                                <Ionicons name={expert.vote === 'agree' ? "checkmark" : "close"} size={12} color="#fff" />
                                <Text style={styles.expertVoteBadgeText}>
                                  {expert.vote === 'agree' ? '同意推翻' : '维持原判'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.expertVoteTitle}>{expert.title}</Text>
                          </View>
                        </View>
                        <View style={styles.expertVoteReasonBox}>
                          <Text style={styles.expertVoteReasonLabel}>投票理由：</Text>
                          <Text style={styles.expertVoteReasonText}>{expert.reason}</Text>
                        </View>
                        <Text style={styles.expertVoteTime}>{expert.time}</Text>
                      </View>)}
                  </ScrollView>
                </View>
              </>}

            <TouchableOpacity style={styles.closeArbitrationStatusBtn} onPress={() => {
            setShowArbitrationResultModal(false);
            setCurrentArbitrationResult(null);
          }}>
              <Text style={styles.closeArbitrationStatusBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 转发分享弹窗 */}
      <ShareModal
        visible={showShareModal}
        onClose={closeShareModal}
        shareData={currentShareData || buildQuestionSharePayload()}
        onShare={handleShare}
      />
      <EditTextModal
        visible={showTwitterInviteEditor}
        onClose={() => {
          setShowTwitterInviteEditor(false);
          setSelectedTwitterInviteUser(null);
        }}
        title="编辑推特邀请文案"
        currentValue={twitterInviteDraftText}
        onSave={handleTwitterInviteShare}
        placeholder={`请输入要分享到推特的文案，可手动添加 ${selectedTwitterInviteUser?.name || '@用户名'}`}
        maxLength={220}
        multiline
        hint="链接会自动追加到文案后面"
        loading={pendingTwitterInvitePlatform === 'twitter'}
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
    gap: 12
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  shareBtnText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  content: {
    flex: 1
  },
  questionSection: {
    backgroundColor: '#fff',
    padding: 16
  },
  questionTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937',
    lineHeight: scaleFont(26),
    marginBottom: 8
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4
  },
  expandHintText: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '500'
  },
  expandHintInline: {
    fontSize: scaleFont(13),
    color: '#3b82f6',
    fontWeight: '500'
  },
  rewardTagInline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    fontSize: scaleFont(19),
    color: '#ef4444',
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(26)
  },
  paidTagInline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    fontSize: scaleFont(19),
    color: '#f59e0b',
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(26)
  },
  solvedTagInline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    fontSize: scaleFont(17),
    color: '#22c55e',
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(26)
  },
  // 加载和错误状态样式
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    fontSize: scaleFont(16),
    color: '#9ca3af'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20
  },
  errorText: {
    fontSize: scaleFont(16),
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  retryBtnText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600'
  },
  // 问题图片容器样式
  questionImagesContainer: {
    marginBottom: 12
  },
  // 悬赏信息卡片样式 - 缩小版
  rewardInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  rewardInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rewardAmountText: {
    fontSize: scaleFont(24),
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.5,
    maxWidth: 84
  },
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 76,
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  addRewardBtnText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  adoptionProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  adoptionProgressText: {
    fontSize: scaleFont(12),
    color: '#10b981',
    fontWeight: '600'
  },
  rewardContributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2
  },
  rewardContributorsText: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  // 付费明细卡片样式
  paidDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  paidDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  paidDetailsTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#166534'
  },
  paidDetailsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  paidDetailsCount: {
    fontSize: scaleFont(13),
    color: '#22c55e',
    fontWeight: '500'
  },
  questionContent: {
    fontSize: scaleFont(14),
    color: '#4b5563',
    lineHeight: scaleFont(22),
    marginTop: -3,
    marginBottom: 12
  },
  questionImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12
  },
  viewsAndTags: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  viewsText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  topicTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  topicTag: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 12,
    lineHeight: scaleFont(16),
    textAlignVertical: 'center',
    height: 20
  },
  // 作者信息和操作按钮行
  authorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12
  },
  authorInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  authorMetaInfo: {
    marginLeft: 8,
    flex: 1
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  smallAuthorName: {
    fontSize: scaleFont(13),
    fontWeight: '500',
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
  followCountText: {
    fontSize: scaleFont(10),
    color: '#ef4444',
    fontWeight: '400',
    marginLeft: 2
  },
  smallPostTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginTop: 2
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  pkSection: {
    marginTop: 6,
    marginBottom: 6
  },
  pkRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pkBarWrapper: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pkBar: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    width: '100%'
  },
  pkSolvedBar: {
    backgroundColor: '#3b82f6',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 15
  },
  pkSolvedBarSelected: {
    backgroundColor: '#2563eb'
  },
  pkUnsolvedBar: {
    backgroundColor: '#ef4444',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 15
  },
  pkUnsolvedBarSelected: {
    backgroundColor: '#dc2626'
  },
  pkSolvedText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  pkUnsolvedText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  pkChoiceTextSelected: {
    fontWeight: '700'
  },
  pkCenterBadge: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2
  },
  pkCenterText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '700'
  },
  // 进度条样式
  pkProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  progressSolvedLabel: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  progressSolvedLabelActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#60a5fa'
  },
  progressUnsolvedLabel: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  progressUnsolvedLabelActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#f87171'
  },
  progressLabelText: {
    fontSize: scaleFont(10),
    color: '#6b7280',
    fontWeight: '600'
  },
  progressSolvedLabelTextActive: {
    color: '#1d4ed8'
  },
  progressUnsolvedLabelTextActive: {
    color: '#dc2626'
  },
  progressBarWrapper: {
    flex: 1,
    position: 'relative'
  },
  progressBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  },
  progressSolvedFill: {
    backgroundColor: '#3b82f6',
    height: '100%'
  },
  progressUnsolvedFill: {
    backgroundColor: '#ef4444',
    height: '100%'
  },
  progressPercentLabel: {
    position: 'absolute',
    top: -18,
    transform: [{
      translateX: -12
    }]
  },
  progressPercentText: {
    fontSize: scaleFont(10),
    color: '#6b7280',
    fontWeight: '600'
  },
  // 补充列表样式
  supplementsScrollView: {
    maxHeight: 600
  },
  supplementsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  supplementsLoadingText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginTop: 12
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
  supplementsLoadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8
  },
  supplementsLoadingMoreText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  supplementsNoMore: {
    alignItems: 'center',
    paddingVertical: 20
  },
  supplementsNoMoreText: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  // 底部固定栏样式
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12
  },
  bottomActionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  interactionBtnDisabled: {
    opacity: 0.45
  },
  bottomActionText: {
    fontSize: scaleFont(11),
    color: '#6b7280',
    fontWeight: '500'
  },
  interactionTextDisabled: {
    color: '#d1d5db'
  },
  bottomInputBox: {
    flex: 0.95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  bottomInputPlaceholder: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  answersSection: {
    marginTop: 0,
    backgroundColor: '#fff'
  },
  answerTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  answerTabItem: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0, // 允许内容收缩
  },
  answerTabText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    textAlign: 'center',
    flexShrink: 1, // 允许文本收缩
    minWidth: 0, // 允许内容收缩
  },
  answerTabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  answerTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1
  },
  // 筛选条样式
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
  // 超级赞购买横幅样式
  superLikePurchaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7'
  },
  superLikePurchaseBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  superLikePurchaseBannerText: {
    fontSize: scaleFont(13),
    color: '#f59e0b',
    fontWeight: '600'
  },
  answerCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  answerCardAdopted: {
    backgroundColor: '#fef2f210'
  },
  // 答案标签区域 - 优化布局，禁止换行
  answerTagsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 10,
    overflow: 'hidden'
  },
  answerTagsActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  // 紧凑版标签样式
  adoptedBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  adoptedBadgeCompactText: {
    fontSize: scaleFont(11),
    color: '#22c55e',
    fontWeight: '600'
  },
  // 作者已采纳标签样式
  authorAdoptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  authorAdoptedBadgeText: {
    fontSize: scaleFont(11),
    color: '#22c55e',
    fontWeight: '600'
  },
  // 已采纳数量标签样式
  adoptedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  adoptedCountBadgeText: {
    fontSize: scaleFont(11),
    color: '#3b82f6',
    fontWeight: '600'
  },
  inviterBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  inviterTextCompact: {
    fontSize: scaleFont(10),
    color: '#3b82f6',
    fontWeight: '500'
  },
  arbitrationPendingBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  arbitrationPendingTextCompact: {
    fontSize: scaleFont(10),
    color: '#f59e0b',
    fontWeight: '600'
  },
  arbitrationApprovedBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  arbitrationApprovedTextCompact: {
    fontSize: scaleFont(10),
    color: '#ef4444',
    fontWeight: '600'
  },
  arbitrationResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1
  },
  arbitrationResultApproved: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  arbitrationResultRejected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  arbitrationResultText: {
    fontSize: scaleFont(10),
    fontWeight: '600'
  },
  arbitrationResultTextApproved: {
    color: '#ef4444'
  },
  arbitrationResultTextRejected: {
    color: '#22c55e'
  },
  viewArbitrationResultBtn: {
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
  viewArbitrationResultBtnText: {
    fontSize: scaleFont(10),
    color: '#6b7280',
    fontWeight: '500'
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
  viewArbitrationBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  viewArbitrationBtnTextCompact: {
    fontSize: scaleFont(10),
    color: '#6b7280'
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  answerHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  answerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  answerAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  answerAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  answerAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#1f2937'
  },
  // 采纳按钮样式 - 简洁设计，无图标
  adoptAnswerBtn: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    marginLeft: 6
  },
  adoptAnswerBtnActive: {
    backgroundColor: '#22c55e'
  },
  adoptAnswerBtnLoading: {
    opacity: 0.6
  },
  adoptAnswerBtnText: {
    fontSize: scaleFont(12),
    color: '#22c55e',
    fontWeight: '700',
    letterSpacing: 0.2
  },
  adoptAnswerBtnTextActive: {
    color: '#fff'
  },
  adoptedTag: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  adoptedTagText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '500'
  },
  answerAuthorTitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2
  },
  answerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2
  },
  answerSupplementBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  answerSupplementTextTop: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600'
  },
  answerContent: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(22)
  },
  answerContentContainer: {
    position: 'relative'
  },
  answerMetaBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8
  },
  answerIpBottom: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  answerTimeBottom: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  answerExpandBtnInline: {
    alignSelf: 'flex-start',
    marginTop: 4
  },
  answerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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
  answerActions: {
    flexDirection: 'row',
    gap: 20
  },
  answerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  answerActionBtnLoading: {
    opacity: 0.6
  },
  answerActionLoader: {
    marginLeft: 4
  },
  answerActionText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  answerSupplementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  answerSupplementText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '500'
  },
  answerCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  answerCommentText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500'
  },
  answerMoreBtn: {
    padding: 6
  },
  answerTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  loadMoreBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4
  },
  loadMoreText: {
    fontSize: scaleFont(14),
    color: '#ef4444'
  },
  // 补充问题样式
  suppCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  suppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  suppAuthorInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  suppAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  suppAuthorInfo: {
    flex: 1,
    marginLeft: 12
  },
  suppAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  suppAuthor: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#1f2937'
  },
  suppTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  suppLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  suppLocation: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  suppAnswerBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  suppAnswerTextTop: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '500'
  },
  suppContent: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(22)
  },
  suppContentContainer: {
    position: 'relative'
  },
  suppMetaBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8
  },
  suppIpBottom: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  suppTimeBottom: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  suppFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  suppFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  suppFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  suppActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  suppActionText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  suppAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  suppAnswerText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '500'
  },
  suppCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  suppCommentText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  suppMoreBtn: {
    padding: 6
  },
  // 补充问题更多弹窗
  suppMoreModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  suppMoreModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  suppMoreActionList: {
    paddingTop: 8
  },
  suppMoreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  suppMoreActionText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    marginLeft: 14
  },
  suppMoreCancelBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  suppMoreCancelText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 更多操作弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  moreActionModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  moreActionModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  actionListSection: {
    paddingTop: 8
  },
  moreActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  moreActionItemText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    marginLeft: 14
  },
  moreActionCancelBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  moreActionCancelText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 评论弹窗样式
  commentModal: {
    flex: 1,
    backgroundColor: '#fff'
  },
  commentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  commentCloseBtn: {
    padding: 4,
    zIndex: 10
  },
  commentHeaderCenter: {
    flex: 1,
    alignItems: 'center'
  },
  commentModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#222'
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
  commentContentArea: {
    flex: 1,
    backgroundColor: '#fff'
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
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(17, 24, 39, 0.28)'
  },
  successModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22
  },
  successModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  successModalIconWrap: {
    marginRight: 10
  },
  successModalTitle: {
    flex: 1,
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#1f2937'
  },
  successModalDesc: {
    fontSize: scaleFont(16),
    color: '#64748b',
    lineHeight: scaleFont(24),
    marginBottom: 24
  },
  successModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  successModalConfirmBtn: {
    minWidth: 96,
    backgroundColor: '#ff4d4f',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center'
  },
  successModalConfirmText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#fff'
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
  commentWordCount: {
    fontSize: scaleFont(13),
    color: '#999'
  },
  // 评论列表弹窗样式 - 今日头条风格
  commentListModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden'
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
  // 原评论卡片样式 - 今日头条风格
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
    lineHeight: scaleFont(24),
    marginBottom: 0
  },
  originalCommentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24
  },
  originalCommentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  originalCommentActionText: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  // 回复区域标题
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
    flexShrink: 1,
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
  commentListReplyBtn: {
    fontSize: scaleFont(12),
    color: '#ef4444'
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
  // 今日头条风格回答弹窗
  answerModal: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalKeyboardView: {
    flex: 1
  },
  answerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
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
    color: '#222'
  },
  answerPublishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    zIndex: 1
  },
  answerPublishBtnDisabled: {
    backgroundColor: '#ffcdd2'
  },
  answerPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  answerPublishTextDisabled: {
    color: '#fff'
  },
  supplementBlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef3c7'
  },
  supplementBlockedBannerText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#92400e',
    lineHeight: scaleFont(18)
  },
  answerQuestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  answerQuestionIcon: {
    marginRight: 8,
    marginTop: 2
  },
  answerQuestionContent: {
    flex: 1
  },
  answerQuestionLabel: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '600',
    marginBottom: 6
  },
  answerQuestionText: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#333',
    lineHeight: scaleFont(22),
    fontWeight: '500'
  },
  answerSupplementInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4
  },
  answerSupplementLabel: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '600'
  },
  answerSupplementText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  answerQuestionAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6
  },
  answerQuestionAuthorText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  answerContentArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  answerContentContainer: {
    flexGrow: 1
  },
  answerTextInput: {
    padding: 16,
    fontSize: scaleFont(16),
    color: '#333',
    lineHeight: scaleFont(26),
    minHeight: 300
  },
  answerIdentitySection: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  answerImagesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8
  },
  answerImagePreviewItem: {
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    position: 'relative'
  },
  answerImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8
  },
  answerImageRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10
  },
  answerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff'
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
    color: '#999'
  },
  // 补充回答弹窗样式
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
  // 发起活动弹窗样式
  activityModal: {
    flex: 1,
    backgroundColor: '#fff'
  },
  activityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  activityCloseBtn: {
    padding: 4,
    zIndex: 10
  },
  activityHeaderCenter: {
    flex: 1,
    alignItems: 'center'
  },
  activityModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#222'
  },
  activityPublishBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    zIndex: 1
  },
  activityPublishBtnDisabled: {
    backgroundColor: '#fecaca'
  },
  activityPublishText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  activityPublishTextDisabled: {
    color: '#fff'
  },
  boundQuestionCard: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  boundQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  boundQuestionLabel: {
    fontSize: scaleFont(12),
    color: '#22c55e',
    fontWeight: '500',
    marginLeft: 6
  },
  boundQuestionText: {
    fontSize: scaleFont(14),
    color: '#166534',
    lineHeight: scaleFont(20)
  },
  activityFormArea: {
    flex: 1,
    padding: 16
  },
  activityFormContent: {
    flexGrow: 1
  },
  formGroup: {
    marginBottom: 16
  },
  formLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: scaleFont(15),
    color: '#1f2937'
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  formRow: {
    flexDirection: 'row'
  },
  formSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8
  },
  formSelectText: {
    fontSize: scaleFont(15),
    color: '#6b7280'
  },
  formInputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8
  },
  formInputInner: {
    flex: 1,
    paddingVertical: 12,
    fontSize: scaleFont(15),
    color: '#1f2937'
  },
  // 评论样式 - 横向布局
  commentCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
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
  commentContent: {
    flex: 1
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
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 20
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
  commentReplyBtn: {
    fontSize: scaleFont(12),
    color: '#ef4444'
  },
  // 活动卡片样式
  activityCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  activityTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4
  },
  onlineTag: {
    backgroundColor: '#3b82f6'
  },
  offlineTag: {
    backgroundColor: '#22c55e'
  },
  activityTypeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '500'
  },
  activityStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusOpen: {
    backgroundColor: '#fef3c7'
  },
  statusSoon: {
    backgroundColor: '#dbeafe'
  },
  activityStatusText: {
    fontSize: scaleFont(11),
    color: '#92400e',
    fontWeight: '500'
  },
  activityTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10
  },
  activityInfo: {
    gap: 6
  },
  activityInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  activityInfoText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    flex: 1
  },
  activityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  activityOrganizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  activityOrganizerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  activityOrganizerName: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  activityJoinBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  activityJoinText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '500'
  },
  // 活动类型选择器
  activityTypeSelector: {
    flexDirection: 'row',
    gap: 12
  },
  activityTypeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 8
  },
  activityTypeSelectorBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  },
  activityTypeSelectorText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  activityTypeSelectorTextActive: {
    color: '#fff'
  },
  required: {
    color: '#ef4444'
  },
  organizerSelector: {
    flexDirection: 'row',
    gap: 12
  },
  organizerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6
  },
  organizerOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  organizerOptionText: {
    fontSize: scaleFont(14),
    color: '#666'
  },
  organizerOptionTextActive: {
    color: '#fff'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  timeInputWrapper: {
    flex: 1
  },
  timeInputLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 6
  },
  timeInputField: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937'
  },
  timeSeparatorWrapper: {
    paddingBottom: 12
  },
  timeSeparator: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden'
  },
  uploadedImage: {
    width: '100%',
    height: '100%'
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addImageText: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
    marginTop: 4
  },
  // 举报弹窗样式
  reportModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  reportModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  reportModalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  reportItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  reportItemText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    textAlign: 'center'
  },
  reportCancelBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  reportCancelText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 邀请列表样式
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
  // 推荐用户横向滚动
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
  recommendInviteBtnText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '500'
  },
  recommendInviteBtnTwitter: {
    backgroundColor: '#1DA1F2'
  },
  recommendInviteBtnFacebook: {
    backgroundColor: '#4267B2'
  },
  // 已邀请列表
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
  loadMoreInvitedBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
    marginTop: 8
  },
  loadMoreInvitedText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '500'
  },
  inviteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  inviteBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '500'
  },
  inviteBtnTwitter: {
    backgroundColor: '#1DA1F2'
  },
  inviteBtnFacebook: {
    backgroundColor: '#4267B2'
  },
  // 邀请回答弹窗样式
  inviteModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  inviteModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  inviteModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16
  },
  invitePlatformTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8
  },
  invitePlatformTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4
  },
  invitePlatformTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  invitePlatformTabText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  invitePlatformTabTextActive: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  inviteSearchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  inviteSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
    padding: 0
  },
  inviteUserList: {
    maxHeight: 400,
    paddingHorizontal: 16
  },
  inviteUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
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
  inviteUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4
  },
  inviteUserBtnText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600'
  },
  inviteUserBtnFacebook: {
    backgroundColor: '#4267B2'
  },
  inviteUserBtnTwitter: {
    backgroundColor: '#1DA1F2'
  },
  // 团队弹窗样式
  teamModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  teamModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  // 团队成员区域
  teamMembersSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamMembersTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  teamMembersScroll: {
    paddingHorizontal: 16
  },
  teamMemberItem: {
    alignItems: 'center',
    marginRight: 16
  },
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
    marginBottom: 2
  },
  teamMemberRole: {
    fontSize: scaleFont(10),
    color: '#f59e0b',
    fontWeight: '600'
  },
  // 团队聊天区域
  teamChatSection: {
    flex: 1,
    paddingTop: 16
  },
  teamChatTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  teamChatMessages: {
    maxHeight: 300,
    paddingHorizontal: 16
  },
  teamChatMessage: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  teamChatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  teamChatBubble: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10
  },
  teamChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  teamChatUser: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#1f2937'
  },
  teamChatTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  teamChatText: {
    fontSize: scaleFont(13),
    color: '#374151',
    lineHeight: scaleFont(18)
  },
  teamChatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
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
    color: '#1f2937'
  },
  teamChatSendBtn: {
    backgroundColor: '#f59e0b',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // 团队操作按钮
  teamActions: {
    paddingHorizontal: 16,
    paddingTop: 16
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
  // 回复样式 - 横向布局
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
  replyChildItem: {
    paddingVertical: 4
  },
  replyChildText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    color: '#374151'
  },
  replyChildAuthor: {
    color: '#111827',
    fontWeight: '600'
  },
  replyChildSeparator: {
    color: '#111827'
  },
  replyChildReplyPrefix: {
    color: '#6b7280'
  },
  replyActionText: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  replyReplyBtn: {
    fontSize: scaleFont(11),
    color: '#ef4444'
  },
  // 推荐问题样式
  recommendedSection: {
    backgroundColor: '#f9fafb',
    paddingTop: 16
  },
  recommendedHeader: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  recommendedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  recommendedTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  recommendedSubtitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginLeft: 28
  },
  recommendedQuestionCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  recommendedHotTagInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  recommendedHotTextInline: {
    fontSize: scaleFont(10),
    color: '#ef4444',
    fontWeight: '600'
  },
  recommendedQuestionTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: scaleFont(26),
    marginBottom: 12
  },
  recommendedQuestionContent: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    lineHeight: scaleFont(22),
    marginBottom: 12
  },
  recommendedQuestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  recommendedAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  recommendedAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  recommendedAuthorName: {
    fontSize: scaleFont(13),
    fontWeight: '500',
    color: '#374151'
  },
  recommendedQuestionTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  recommendedQuestionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  recommendedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  recommendedStatText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  recommendedTopicTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  recommendedTopicTag: {
    fontSize: scaleFont(12),
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  // 加载指示器样式
  loadingIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    fontSize: scaleFont(13),
    color: '#9ca3af'
  },
  // 收起按钮样式（在列表内部）
  collapseBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  collapseBtnText: {
    fontSize: scaleFont(15),
    color: '#ef4444',
    fontWeight: '600',
    marginRight: 4
  },
  // 追加悬赏弹窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  addRewardModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  addRewardModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  addRewardModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20
  },
  addRewardContent: {
    paddingHorizontal: 20
  },
  currentRewardInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  currentRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  currentRewardLabel: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  currentRewardAmount: {
    fontSize: scaleFont(28),
    fontWeight: '700',
    color: '#ef4444'
  },
  currentRewardDesc: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  addRewardSectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  quickAmountBtn: {
    width: '30%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickAmountBtnActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2
  },
  quickAmountText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#6b7280'
  },
  quickAmountTextActive: {
    color: '#ef4444'
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16
  },
  currencySymbol: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8
  },
  customAmountField: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#1f2937',
    padding: 0
  },
  addRewardTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  addRewardTipsText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  confirmAddRewardBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12
  },
  confirmAddRewardBtnDisabled: {
    backgroundColor: '#fca5a5'
  },
  confirmAddRewardBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  cancelAddRewardBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelAddRewardBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 追加悬赏人员名单弹窗样式
  contributorsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%'
  },
  contributorsModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  contributorsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  contributorsModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  contributorsTotalInfo: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  contributorsTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  contributorsTotalLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  contributorsTotalAmount: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#ef4444'
  },
  contributorsTotalDesc: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  contributorsList: {
    maxHeight: 300,
    paddingHorizontal: 20
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb'
  },
  contributorRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  contributorRankText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#9ca3af'
  },
  contributorInfo: {
    flex: 1,
    marginLeft: 10
  },
  contributorName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2
  },
  contributorTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  contributorAmountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  contributorAmountText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    color: '#ef4444'
  },
  contributorsCloseBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  contributorsCloseBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 超级赞徽章样式
  superLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    flexShrink: 0
  },
  superLikeBadgeInactive: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb'
  },
  superLikeBadgeText: {
    fontSize: scaleFont(11),
    color: '#f59e0b',
    fontWeight: '600',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  superLikeBadgeTextInactive: {
    color: '#9ca3af'
  },
  // 购买超级赞弹窗样式
  superLikeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  superLikeModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  superLikeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20
  },
  superLikeModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#1f2937'
  },
  superLikeScrollContent: {
    maxHeight: 450
  },
  superLikeContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  superLikeContent: {
    paddingHorizontal: 20
  },
  currentSuperLikeInfo: {
    marginBottom: 20
  },
  superLikeInfoCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fef3c7'
  },
  superLikeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  superLikeInfoLabel: {
    fontSize: scaleFont(14),
    color: '#92400e',
    fontWeight: '500'
  },
  superLikeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  superLikeCountText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#f59e0b'
  },
  superLikeInfoDesc: {
    fontSize: scaleFont(12),
    color: '#92400e',
    lineHeight: scaleFont(18)
  },
  superLikeSectionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  quickSuperLikeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20
  },
  quickSuperLikeBtn: {
    width: '30%',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  quickSuperLikeBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
    borderWidth: 2
  },
  quickSuperLikeText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#f59e0b'
  },
  quickSuperLikeTextActive: {
    color: '#fff'
  },
  quickSuperLikePrice: {
    fontSize: scaleFont(11),
    color: '#92400e'
  },
  quickSuperLikePriceActive: {
    color: '#fff'
  },
  customSuperLikeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10
  },
  customSuperLikeField: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#1f2937',
    padding: 0
  },
  superLikePriceHint: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#f59e0b'
  },
  superLikePriceInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  priceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  priceInfoLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  priceInfoValue: {
    fontSize: scaleFont(13),
    color: '#1f2937',
    fontWeight: '500'
  },
  priceInfoTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4
  },
  priceInfoTotalLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  priceInfoTotalValue: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#f59e0b'
  },
  superLikeTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  superLikeTipsText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  superLikeFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff'
  },
  confirmSuperLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12
  },
  confirmSuperLikeBtnDisabled: {
    backgroundColor: '#fcd34d'
  },
  confirmSuperLikeBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  cancelSuperLikeBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelSuperLikeBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 仲裁申请弹窗样式
  arbitrationModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%'
  },
  arbitrationModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
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
    borderBottomColor: '#f3f4f6'
  },
  arbitrationModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
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
    color: '#1f2937',
    marginBottom: 10
  },
  arbitrationReasonInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: '#1f2937',
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
    color: '#6b7280',
    fontWeight: '500'
  },
  // 专家搜索框样式
  expertSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8
  },
  expertSearchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
    padding: 0
  },
  // 推荐专家标题样式
  recommendedExpertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  recommendedExpertsTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  // 搜索无结果样式
  noExpertsFound: {
    alignItems: 'center',
    paddingVertical: 40
  },
  noExpertsFoundText: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12
  },
  noExpertsFoundDesc: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginTop: 4
  },
  expertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
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
    color: '#1f2937'
  },
  expertTitle: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 2
  },
  expertExpertise: {
    fontSize: scaleFont(11),
    color: '#9ca3af'
  },
  expertCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center'
  },
  expertCheckboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  arbitrationModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  submitArbitrationBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  submitArbitrationBtnDisabled: {
    backgroundColor: '#fca5a5'
  },
  submitArbitrationBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  },
  cancelArbitrationBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelArbitrationBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 仲裁状态弹窗样式
  arbitrationStatusModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20
  },
  arbitrationStatusTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  votingProgress: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  votingProgressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 12
  },
  votingAgreeBar: {
    backgroundColor: '#22c55e',
    height: '100%'
  },
  votingDisagreeBar: {
    backgroundColor: '#ef4444',
    height: '100%'
  },
  votingStats: {
    gap: 8,
    marginBottom: 12
  },
  votingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  votingAgreeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e'
  },
  votingDisagreeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444'
  },
  votingStatText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  votingPercentage: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center'
  },
  arbitrationPendingInfo: {
    alignItems: 'center',
    paddingVertical: 20
  },
  arbitrationPendingInfoText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginTop: 10,
    marginBottom: 16
  },
  simulateVoteBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12
  },
  simulateVoteBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  arbitrationApprovedInfo: {
    alignItems: 'center',
    paddingVertical: 20
  },
  arbitrationRejectedInfo: {
    alignItems: 'center',
    paddingVertical: 20
  },
  arbitrationResultTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8
  },
  arbitrationResultDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: scaleFont(20),
    paddingHorizontal: 20
  },
  closeArbitrationStatusBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  closeArbitrationStatusBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  // 专家投票详情样式
  expertVotesSection: {
    marginTop: 20,
    maxHeight: 400
  },
  expertVotesSectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    paddingHorizontal: 20
  },
  expertVotesList: {
    maxHeight: 350,
    paddingHorizontal: 20
  },
  expertVoteCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  expertVoteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  expertVoteInfo: {
    flex: 1,
    marginLeft: 12
  },
  expertVoteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  expertVoteName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  expertVoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  expertVoteAgreeBadge: {
    backgroundColor: '#22c55e'
  },
  expertVoteDisagreeBadge: {
    backgroundColor: '#ef4444'
  },
  expertVoteBadgeText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  expertVoteTitle: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  expertVoteReasonBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  expertVoteReasonLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4
  },
  expertVoteReasonText: {
    fontSize: scaleFont(13),
    color: '#374151',
    lineHeight: scaleFont(20)
  },
  expertVoteTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    textAlign: 'right'
  }
});
