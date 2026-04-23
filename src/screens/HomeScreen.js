import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, InteractionManager, View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, Dimensions, TextInput, FlatList, Platform, ActivityIndicator, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import Avatar from '../components/Avatar';
import ShareModal from '../components/ShareModal';
import EditTextModal from '../components/EditTextModal';
import InitialCredentialsModal from '../components/InitialCredentialsModal';
import WriteCommentModal from '../components/WriteCommentModal';
import KeyboardDismissView from '../components/KeyboardDismissView';
import RootErrorBoundary from '../components/RootErrorBoundary';
import RegionSelector from '../components/RegionSelector';
import SkeletonBlock from '../components/SkeletonBlock';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/useTranslation';
import { getRegionData } from '../data/regionData';
import { useOptimizedQuestions } from '../hooks/useOptimizedQuestions';
import { showToast } from '../utils/toast';
import { showAppAlert } from '../utils/appAlert';
import { buildTwitterShareText, openTwitterShare } from '../utils/shareService';
import { formatTime } from '../utils/timeFormatter';
import { getLastLocationLevel } from '../utils/locationFormatter';
import { shouldRequirePaidQuestionAccess } from '../utils/questionAccessRules';
import { openOfficialRechargePage } from '../utils/externalLinks';
import { applyMockRecharge, applyMockWalletExpense, getWalletBalanceWithMock } from '../utils/walletMock';
import { markQuestionAsPaid } from '../utils/paidQuestionAccess';
import { navigateToPublicProfile, resolvePublicUserId } from '../utils/publicProfileNavigation';
import questionApi from '../services/api/questionApi';
import userApi from '../services/api/userApi';
import { getBlockedUserIds, subscribeBlockedUsers } from '../services/blacklistState';
import { loadComboChannels } from '../services/channelSubscriptionService';

import { scaleFont } from '../utils/responsive';
const { width: screenWidth } = Dimensions.get('window');
const INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY = '@initial_credentials_notice';
const MOCK_RECHARGE_RETURN_AMOUNT = 100;
const HOME_WALLET_REFRESH_DEBOUNCE_MS = 15000;

// tabs array will be moved inside component to use translation

// 话题数据
const topicsData = [
  { id: 1, name: '#Python学习', icon: 'code-slash', color: '#3b82f6', followers: '25.6万', questions: '12.3万', description: '分享Python学习经验和技巧', isFollowed: true },
  { id: 2, name: '#家常菜谱', icon: 'restaurant', color: '#f97316', followers: '18.9万', questions: '8.6万', description: '美味家常菜做法分享', isFollowed: false },
  { id: 3, name: '#职业发展', icon: 'briefcase', color: '#8b5cf6', followers: '32.1万', questions: '15.8万', description: '职场经验与职业规划', isFollowed: true },
  { id: 4, name: '#健康养生', icon: 'fitness', color: '#22c55e', followers: '45.2万', questions: '21.3万', description: '健康生活方式分享', isFollowed: false },
  { id: 5, name: '#数码科技', icon: 'phone-portrait', color: '#06b6d4', followers: '28.7万', questions: '13.5万', description: '数码产品评测与讨论', isFollowed: true },
  { id: 6, name: '#旅游攻略', icon: 'airplane', color: '#ec4899', followers: '22.4万', questions: '10.2万', description: '旅游经验与攻略分享', isFollowed: false },
  { id: 7, name: '#理财投资', icon: 'cash', color: '#f59e0b', followers: '19.8万', questions: '9.5万', description: '理财知识与投资经验', isFollowed: true },
  { id: 8, name: '#摄影技巧', icon: 'camera', color: '#6366f1', followers: '16.3万', questions: '7.8万', description: '摄影技术交流与作品分享', isFollowed: false },
  { id: 9, name: '#读书笔记', icon: 'book', color: '#14b8a6', followers: '14.7万', questions: '6.9万', description: '读书心得与好书推荐', isFollowed: true },
  { id: 10, name: '#运动健身', icon: 'barbell', color: '#ef4444', followers: '38.5万', questions: '18.6万', description: '健身经验与运动技巧', isFollowed: false },
];

export default function HomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const locale = i18n?.locale || 'en';
  const insets = useSafeAreaInsets();
  
  // 获取多语言区域数据 - 使用 useMemo 避免重复计算
  const regionData = useMemo(() => getRegionData(), []);
  
  // 添加调试信息 - 显示检测到的语言
  
  const [comboTabs, setComboTabs] = useState([]);

  // Tabs array using translation with useMemo
  const baseTabs = useMemo(() => [
    t('home.follow'),
    t('home.topics'),
    t('home.recommend'),
    t('home.hotList'),
    // t('home.incomeRanking'), // 暂时隐藏收入榜，后期再启用
    t('home.rewardRanking'), // 悬赏榜
    t('home.questionRanking'),
    t('home.heroRanking'), // 英雄榜
    t('home.sameCity'),
    t('home.country'),
    t('home.industry'),
    t('home.personal'),
    t('home.workplace'),
    t('home.education')
  ], [locale]);

  const tabs = useMemo(() => [
    ...baseTabs,
    ...comboTabs.filter(tab => !baseTabs.includes(tab))
  ], [baseTabs, comboTabs]);

  const questionFeedTabs = useMemo(() => {
    const excludedTabs = new Set([
      t('home.follow'),
      t('home.topics'),
      t('home.hotList'),
      t('home.rewardRanking'),
      t('home.questionRanking'),
      t('home.heroRanking'),
    ]);

    return tabs.filter(tab => !excludedTabs.has(tab));
  }, [tabs, locale]);
  
  const [activeTab, setActiveTab] = useState('');

  const syncComboTabs = React.useCallback(async () => {
    const savedComboTabs = await loadComboChannels();
    setComboTabs(prevTabs => {
      if (JSON.stringify(prevTabs) === JSON.stringify(savedComboTabs)) {
        return prevTabs;
      }
      return savedComboTabs;
    });
  }, []);
  
  // Initialize activeTab with translated value
  useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('home.recommend'));
    }
  }, [locale, activeTab]);

  useEffect(() => {
    syncComboTabs();
  }, [syncComboTabs]);

  useFocusEffect(React.useCallback(() => {
    syncComboTabs();
  }, [syncComboTabs]));

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadInitialCredentialsNotice = async () => {
        try {
          const storedNotice = await AsyncStorage.getItem(INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY);
          if (!storedNotice || !isActive) {
            return;
          }

          const parsedNotice = JSON.parse(storedNotice);
          const username = typeof parsedNotice?.username === 'string' ? parsedNotice.username.trim() : '';
          const password = typeof parsedNotice?.password === 'string' ? parsedNotice.password.trim() : '';

          if (!username || !password) {
            await AsyncStorage.removeItem(INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY);
            return;
          }

          setInitialCredentials({ username, password });
          setShowInitialCredentialsModal(true);
        } catch (error) {
          console.error('Failed to load initial credentials notice:', error);
        }
      };

      loadInitialCredentialsNotice();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    if (activeTab && !tabs.includes(activeTab)) {
      setActiveTab(t('home.recommend'));
    }
  }, [activeTab, tabs, locale]);
  
  // Tab 切换监听 - 触发优化加载
  
  
  const [likedItems, setLikedItems] = useState({});
  const [dislikedItems, setDislikedItems] = useState({});
  const [bookmarkedItems, setBookmarkedItems] = useState({});
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState('');
  const [socialSearchText, setSocialSearchText] = useState('');
  const [showTwitterInviteEditor, setShowTwitterInviteEditor] = useState(false);
  const [twitterInviteDraftText, setTwitterInviteDraftText] = useState('');
  const [pendingSocialInvitePlatform, setPendingSocialInvitePlatform] = useState(null);
  const [selectedSocialInviteUser, setSelectedSocialInviteUser] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [currentShareData, setCurrentShareData] = useState(null);
  const [showPaidAlertModal, setShowPaidAlertModal] = useState(false);
  const [paidAlertAmount, setPaidAlertAmount] = useState(null);
  const [selectedPaidQuestion, setSelectedPaidQuestion] = useState(null);
  const [pendingPaidQuestionRouteParams, setPendingPaidQuestionRouteParams] = useState({});
  const [isUnlockingPaidQuestion, setIsUnlockingPaidQuestion] = useState(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    currency: 'usd',
  });
  const [currentUserProfile, setCurrentUserProfile] = useState({
    userId: '',
    username: '',
  });
  const pendingRechargeSimulationRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const handleRechargeReturnRef = useRef(async () => {});
  const lastWalletRefreshAtRef = useRef(0);
  const walletRefreshTaskRef = useRef(null);
  const [showInitialCredentialsModal, setShowInitialCredentialsModal] = useState(false);
  const [initialCredentials, setInitialCredentials] = useState({ username: '', password: '' });
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  const hasFocusedHomeOnceRef = useRef(false);
  
  // 话题关注状态
  const [topicFollowState, setTopicFollowState] = useState({});
  
  // 评论弹窗状态
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentQuestionForComment, setCurrentQuestionForComment] = useState(null);
  
  // 列表状态 - 使用优化 Hook（今日头条式优化）
  const {
    questionList,
    loading: optimizedLoading,
    refreshing,
    loadingMore,
    hasMore,
    hasNewContent,
    onRefresh,
    onLoadMore,
    setQuestionList,
  } = useOptimizedQuestions(activeTab, questionFeedTabs);
  const safeQuestionList = useMemo(
    () => (Array.isArray(questionList) ? questionList.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []),
    [questionList]
  );

  
  // 问题标题展开/折叠状态
  const [expandedTitles, setExpandedTitles] = useState({});
  
  // 记录哪些标题需要折叠（超过3行）
  const [needsExpand, setNeedsExpand] = useState({});
  
  // 记录标题的完整行数
  const [titleLineCount, setTitleLineCount] = useState({});
  const measuredTitleIdsRef = useRef(new Set());
  
  // 时间格式化函数 - 使用工具函数
  // 已从 ../utils/timeFormatter 导入
  
  // 根据选择的区域层级显示地区信息
  const getLocationDisplay = (item) => {
    const normalizedFullLocation = (item?.location || '').toString().replace(/\s+/g, ' ').trim();
    // 始终根据问题本身的地区数据来显示
    // 如果没有选择任何区域，只显示国家
    if (!selectedRegion.country) {
      return getLastLocationLevel(normalizedFullLocation || item.country || item.city || '未知');
    }
    
    // 如果只选择了国家，显示城市（省份/州）
    if (selectedRegion.country && !selectedRegion.city) {
      return getLastLocationLevel(item.city || normalizedFullLocation || item.country || '未知');
    }
    
    // 如果选择了城市（省份/州），显示州/区（如果有的话）
    if (selectedRegion.city && !selectedRegion.state) {
      return getLastLocationLevel(item.state || item.city || normalizedFullLocation || item.country || '未知');
    }
    
    // 如果选择了州/区，显示最后一层（区）
    if (selectedRegion.state && !selectedRegion.district) {
      return getLastLocationLevel(item.district || item.state || item.city || normalizedFullLocation || '未知');
    }
    
    // 如果选择了最后一层，显示最后一层的名字
    if (selectedRegion.district) {
      return getLastLocationLevel(item.district || item.state || item.city || normalizedFullLocation || '未知');
    }
    
    // 默认显示国家
    return getLastLocationLevel(normalizedFullLocation || item.country || item.city || '未知');
  };



  // 同城筛选状态
  const [localCity, setLocalCity] = useState('北京');
  const [localFilter, setLocalFilter] = useState('latest');
  const [showCityModal, setShowCityModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [nearbyDistance, setNearbyDistance] = useState('3公里');
  const [citySelectStep, setCitySelectStep] = useState(0); // 0:国家 1:省份 2:城市
  const [selectedCityRegion, setSelectedCityRegion] = useState({ country: '中国', state: '北京市', city: '北京' });
  const handleConfirmInitialCredentials = React.useCallback(async () => {
    try {
      await AsyncStorage.removeItem(INITIAL_CREDENTIALS_NOTICE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear initial credentials notice:', error);
    } finally {
      setShowInitialCredentialsModal(false);
      setInitialCredentials({ username: '', password: '' });
    }
  }, []);

  // 同城地区数据 - 使用与主区域选择器相同的多语言数据
  const cityRegionData = regionData;

  const filterBlockedQuestions = React.useCallback((items, blockedIds) => {
    if (!Array.isArray(items) || !blockedIds?.size) {
      return items;
    }

    const filteredItems = items.filter((item) => {
      const candidateUserId = resolvePublicUserId(item);
      return !candidateUserId || !blockedIds.has(String(candidateUserId));
    });

    return filteredItems.length === items.length ? items : filteredItems;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeBlockedUsers((blockedIds) => {
      setQuestionList((prevList) => filterBlockedQuestions(prevList, blockedIds));
    });

    return unsubscribe;
  }, [filterBlockedQuestions, setQuestionList]);

  useEffect(() => {
    const blockedIds = getBlockedUserIds();
    if (!blockedIds.size) {
      return;
    }

    setQuestionList((prevList) => filterBlockedQuestions(prevList, blockedIds));
  }, [questionList, filterBlockedQuestions, setQuestionList]);

  useFocusEffect(
    React.useCallback(() => {
      if (
        hasFocusedHomeOnceRef.current &&
        activeTab &&
        activeTab !== t('home.topics') &&
        !optimizedLoading &&
        !refreshing &&
        safeQuestionList.length === 0
      ) {
        onRefresh();
      }

      hasFocusedHomeOnceRef.current = true;
    }, [activeTab, optimizedLoading, onRefresh, safeQuestionList.length, refreshing, locale])
  );



  // 同城功能
  const getCitySelectOptions = () => {
    if (citySelectStep === 0) return cityRegionData.countries;
    if (citySelectStep === 1) {
      // 使用 cities 对象，键是国家名
      return cityRegionData.cities[selectedCityRegion.country] || [];
    }
    if (citySelectStep === 2) {
      // 使用 states 对象，键是城市名
      return cityRegionData.states[selectedCityRegion.state] || [];
    }
    return [];
  };

  const getCitySelectTitle = () => [t('home.selectCountry'), t('home.selectState'), t('home.selectCity')][citySelectStep];

  const selectCityRegion = (value) => {
    if (citySelectStep === 0) {
      setSelectedCityRegion({ ...selectedCityRegion, country: value, state: '', city: '' });
      setCitySelectStep(1);
    } else if (citySelectStep === 1) {
      setSelectedCityRegion({ ...selectedCityRegion, state: value, city: '' });
      setCitySelectStep(2);
    } else {
      setSelectedCityRegion({ ...selectedCityRegion, city: value });
      setLocalCity(value);
      setShowCityModal(false);
      setCitySelectStep(0);
    }
  };

  const closeCityModal = () => {
    setShowCityModal(false);
    setCitySelectStep(0);
  };

  // 紧急求助状态
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({ title: '', description: '', location: '', contact: '' });
  const freeCount = 3; // 每日免费次数
  const usedCount = 0; // 已使用次数
  const remainingFree = freeCount - usedCount;


  // 渲染底部组件
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={styles.footerText}>{t('home.loading')}</Text>
        </View>
      );
    }
    
    if (!hasMore) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>{t('home.noMoreContent')}</Text>
        </View>
      );
    }
    
    return null;
  };

  const renderEmptyList = React.useCallback(() => {
    if (optimizedLoading) {
      return (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((item) => (
            <View key={`skeleton-${item}`} style={styles.skeletonCard}>
              <SkeletonBlock width="42%" height={18} style={styles.skeletonTitleShort} />
              <SkeletonBlock width="100%" height={72} style={styles.skeletonBanner} />
              <View style={styles.skeletonMetaRow}>
                <SkeletonBlock width={32} height={32} style={styles.skeletonAvatar} />
                <View style={styles.skeletonMetaTextGroup}>
                  <SkeletonBlock width="46%" height={12} style={styles.skeletonMetaPrimary} />
                  <SkeletonBlock width="28%" height={10} style={styles.skeletonMetaSecondary} />
                </View>
                <View style={styles.skeletonStatGroup}>
                  <SkeletonBlock width={20} height={12} style={styles.skeletonStatItem} />
                  <SkeletonBlock width={20} height={12} style={styles.skeletonStatItem} />
                  <SkeletonBlock width={16} height={12} style={styles.skeletonMenuDot} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.listStateContainer}>
        <Ionicons name="document-text-outline" size={30} color="#9ca3af" />
        <Text style={styles.listStateTitle}>{t('common.noData')}</Text>
        <TouchableOpacity style={styles.listRetryBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={styles.listRetryBtnText}>{t('common.refresh')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [onRefresh, optimizedLoading, t]);

  // 问题类型和类别数据
  const questionTypes = ['国家问题', '行业问题', '个人问题'];
  const categoryData = {
    '国家问题': ['政策法规', '社会民生', '经济发展', '教育医疗', '环境保护', '基础设施'],
    '行业问题': ['互联网', '金融', '制造业', '医疗健康', '教育培训', '房地产', '餐饮服务'],
    '个人问题': ['职业发展', '情感生活', '健康养生', '理财投资', '学习成长', '家庭关系']
  };

  // 社交平台用户数据
  const socialUsers = {
    twitter: [
      { id: 1, name: 'Python大神', handle: '@python_master', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw1', followers: '12.5万' },
      { id: 2, name: '技术博主', handle: '@tech_blogger', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw2', followers: '8.3万' },
      { id: 3, name: '编程达人', handle: '@code_expert', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw3', followers: '5.6万' },
      { id: 4, name: '数据分析师', handle: '@data_analyst', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw4', followers: '3.2万' },
    ],
    facebook: [
      { id: 1, name: 'Python学习组', handle: 'Python Learning', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb1', followers: '25万' },
      { id: 2, name: '程序员社区', handle: 'Dev Community', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb2', followers: '18万' },
      { id: 3, name: '技术问答', handle: 'Tech Q&A', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb3', followers: '9.8万' },
      { id: 4, name: '编程入门', handle: 'Coding Beginner', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb4', followers: '6.5万' },
    ]
  };

  const openSocialModal = (platform) => {
    setSocialPlatform(platform);
    setSocialSearchText('');
    setShowActionModal(false);
    setShowSocialModal(true);
  };

  const openTwitterInviteEditor = (user) => {
    const sharePayload = buildQuestionSharePayload(selectedQuestion);
    const defaultShareText = buildTwitterShareText(sharePayload || {});
    const normalizedHandle = typeof user?.handle === 'string' ? user.handle.trim() : '';
    const prefixedHandle = normalizedHandle
      ? (normalizedHandle.startsWith('@') ? normalizedHandle : `@${normalizedHandle}`)
      : '';

    setSelectedSocialInviteUser(user);
    setTwitterInviteDraftText(
      prefixedHandle ? `${prefixedHandle} ${defaultShareText}` : defaultShareText
    );
    setShowTwitterInviteEditor(true);
  };

  const handleTwitterInviteShare = async (customShareText) => {
    const sharePayload = buildQuestionSharePayload(selectedQuestion);
    if (!sharePayload) {
      showToast(t('home.shareQuestionMissing'), 'warning');
      return;
    }

    setPendingSocialInvitePlatform('twitter');

    try {
      const result = await openTwitterShare({
        ...sharePayload,
        shareText: customShareText,
      });

      if (result?.openedVia === 'browser') {
        showToast(t('home.twitterOpenedInBrowser'), 'info');
      }

      setShowTwitterInviteEditor(false);
      setTwitterInviteDraftText('');
      setSelectedSocialInviteUser(null);
      setShowSocialModal(false);
    } catch (error) {
      console.error('Failed to invite via twitter:', error);
      showToast(t('home.twitterOpenFailed'), 'error');
    } finally {
      setPendingSocialInvitePlatform(null);
    }
  };

  const sendSocialMessage = (user) => {
    if (socialPlatform === 'twitter') {
      openTwitterInviteEditor(user);
      return;
    }

    showToast(
      t('home.socialInviteSent')
        .replace('{name}', user.name)
        .replace('{title}', selectedQuestion?.title?.substring(0, 30) || ''),
      'success'
    );
    setShowSocialModal(false);
  };

  const filteredSocialUsers = socialUsers[socialPlatform]?.filter(user =>
    user.name.toLowerCase().includes(socialSearchText.toLowerCase()) ||
    user.handle.toLowerCase().includes(socialSearchText.toLowerCase())
  ) || [];

  // 点赞问题
  const getQuestionById = (id) => questionList.find(item => String(item.id) === String(id));

  const getQuestionLikeState = (id) => {
    if (likedItems[id] !== undefined) {
      return likedItems[id];
    }

    return !!getQuestionById(id)?.liked;
  };

  const getQuestionDislikeState = (id) => {
    if (dislikedItems[id] !== undefined) {
      return dislikedItems[id];
    }

    return !!getQuestionById(id)?.disliked;
  };

  const toggleLike = async (id) => {
    const currentState = getQuestionLikeState(id);
    const currentDislikedState = getQuestionDislikeState(id);

    if (!currentState && currentDislikedState) {
      return;
    }

    const newState = !currentState;
    
    // 乐观更新UI
    setLikedItems(prev => ({ ...prev, [id]: newState }));
    
    // 更新问题列表中的点赞数
    setQuestionList(prevList => 
      prevList.map(item => 
        item.id === id 
          ? { ...item, likeCount: (item.likeCount || 0) + (newState ? 1 : -1) }
          : item
      )
    );
    
    try {
      if (newState) {
        // 点赞
        await questionApi.likeQuestion(id);
        showToast(t('home.likeSuccess'), 'success');
      } else {
        // 取消点赞
        await questionApi.unlikeQuestion(id);
        showToast(t('home.unlikeSuccess'), 'success');
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      // 失败时回滚UI
      setLikedItems(prev => ({ ...prev, [id]: currentState }));
      setQuestionList(prevList => 
        prevList.map(item => 
          item.id === id 
            ? { ...item, likeCount: (item.likeCount || 0) + (currentState ? 1 : -1) }
            : item
        )
      );
      showToast(t('home.likeFailed'), 'error');
    }
  };

  // 收藏问题
  const toggleBookmark = async (id) => {
    const currentState = bookmarkedItems[id];
    const newState = !currentState;
    
    // 乐观更新UI
    setBookmarkedItems(prev => ({ ...prev, [id]: newState }));
    
    // 更新问题列表中的收藏数
    setQuestionList(prevList => 
      prevList.map(item => 
        item.id === id 
          ? { ...item, collectCount: (item.collectCount || 0) + (newState ? 1 : -1) }
          : item
      )
    );
    
    try {
      if (newState) {
        // 收藏
        await questionApi.collectQuestion(id);
        showToast(t('home.collectSuccess'), 'success');
      } else {
        // 取消收藏
        await questionApi.uncollectQuestion(id);
        showToast(t('home.uncollectSuccess'), 'success');
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      // 失败时回滚UI
      setBookmarkedItems(prev => ({ ...prev, [id]: currentState }));
      setQuestionList(prevList => 
        prevList.map(item => 
          item.id === id 
            ? { ...item, collectCount: (item.collectCount || 0) + (currentState ? 1 : -1) }
            : item
        )
      );
      showToast(t('home.collectFailed'), 'error');
    }
  };

  // 点踩问题
  const toggleDislike = async (id) => {
    const currentState = getQuestionDislikeState(id);
    const currentLikedState = getQuestionLikeState(id);

    if (!currentState && currentLikedState) {
      return;
    }

    const newState = !currentState;
    
    // 乐观更新UI
    setDislikedItems(prev => ({ ...prev, [id]: newState }));
    
    // 更新问题列表中的点踩数
    setQuestionList(prevList => 
      prevList.map(item => 
        item.id === id 
          ? { ...item, dislikeCount: (item.dislikeCount || 0) + (newState ? 1 : -1) }
          : item
      )
    );
    
    try {
      if (newState) {
        // 点踩
        await questionApi.dislikeQuestion(id);
        showToast(t('home.dislikeSuccess'), 'success');
      } else {
        // 取消点踩
        await questionApi.undislikeQuestion(id);
        showToast(t('home.undislikeSuccess'), 'success');
      }
      // 点踩成功后关闭弹窗
      setShowActionModal(false);
    } catch (error) {
      console.error('点踩操作失败:', error);
      // 失败时回滚UI
      setDislikedItems(prev => ({ ...prev, [id]: currentState }));
      setQuestionList(prevList => 
        prevList.map(item => 
          item.id === id 
            ? { ...item, dislikeCount: (item.dislikeCount || 0) + (currentState ? 1 : -1) }
            : item
        )
      );
      showToast(t('home.dislikeFailed'), 'error');
    }
  };

  const toggleFollowTopic = (topicId) => setTopicFollowState(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  const formatNumber = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;

  const openActionModal = (item) => { setSelectedQuestion(item); setShowActionModal(true); };
  const closeShareModal = () => {
    setShowShareModal(false);
    setCurrentShareData(null);
  };
  const buildQuestionSharePayload = (item) => {
    if (!item) {
      return null;
    }

    const content =
      item.summary ||
      item.description ||
      item.content ||
      item.body ||
      '';

    return {
      title: item.title,
      content,
      type: 'sharequestion',
      qid: item.id,
      image: item.image || item.coverImage || item.images?.[0] || '',
    };
  };
  const openQuestionShareModal = (item) => {
    const sharePayload = buildQuestionSharePayload(item);
    if (!sharePayload) {
      return;
    }

    setShowActionModal(false);
    setCurrentShareData(sharePayload);
    setShowShareModal(true);
  };
  const handleShare = (platform, payload) => {
    console.log('Home question shared:', platform, payload);
  };
  const formatPaidAmount = useCallback((amount) => {
    const numericAmount = Number(amount) || 0;
    return Number.isInteger(numericAmount) ? `${numericAmount}` : numericAmount.toFixed(2);
  }, []);

  const loadWalletBalance = useCallback(async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const now = Date.now();

    if (
      !forceRefresh &&
      lastWalletRefreshAtRef.current > 0 &&
      now - lastWalletRefreshAtRef.current < HOME_WALLET_REFRESH_DEBOUNCE_MS
    ) {
      return;
    }

    const fallbackWalletBalance = await getWalletBalanceWithMock(0);

    setWalletData(prev => ({
      balance: fallbackWalletBalance.balance,
      currency: prev?.currency || 'usd',
    }));

    try {
      const response = await userApi.getWalletBalance();

      if (response.code === 0 || response.code === 200) {
        const nextCurrency = response?.data?.currency || 'usd';
        const walletBalance = await getWalletBalanceWithMock(response?.data?.balance);

        setWalletData({
          balance: walletBalance.balance,
          currency: nextCurrency,
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.log('HomeScreen wallet balance fallback applied:', error?.message || error);
      }
    } finally {
      lastWalletRefreshAtRef.current = Date.now();
    }
  }, []);

  const loadCurrentUserProfile = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      const profileData = response?.data || {};

      setCurrentUserProfile({
        userId: profileData.userId || '',
        username: profileData.username || '',
      });
    } catch (error) {
      if (__DEV__) {
        console.log('HomeScreen user profile load skipped:', error?.message || error);
      }
    }
  }, []);

  const handleMockRecharge = useCallback(async amount => {
    const numericAmount = Number(amount);

    await applyMockRecharge({
      amount: numericAmount,
      currency: walletData.currency,
    });

    setWalletData(prev => ({
      ...prev,
      balance: (Number(prev.balance) || 0) + (Number.isFinite(numericAmount) ? numericAmount : 0),
    }));

    await loadWalletBalance({ forceRefresh: true });
    showAppAlert(
      t('profile.rechargeSuccess'),
      `${t('profile.rechargeSuccess')} $${numericAmount.toFixed(2)} (${t('profile.mockRechargeTag')})`
    );
  }, [loadWalletBalance, t, walletData.currency]);

  const closePaidAlertModal = useCallback(() => {
    setShowPaidAlertModal(false);
    setPaidAlertAmount(null);
    setSelectedPaidQuestion(null);
    setPendingPaidQuestionRouteParams({});
    setIsUnlockingPaidQuestion(false);
  }, []);

  const navigateToQuestionDetail = useCallback((question, extraParams = {}) => {
    if (!question?.id) {
      return;
    }

    navigation.navigate('QuestionDetail', {
      id: question.id,
      ...extraParams,
    });
  }, [navigation]);

  const openPaidAlertModal = useCallback((question, extraParams = {}) => {
    if (!question) {
      return;
    }

    setSelectedPaidQuestion(question);
    setPendingPaidQuestionRouteParams(extraParams);
    setPaidAlertAmount(formatPaidAmount(question.paidAmount));
    setShowPaidAlertModal(true);
  }, [formatPaidAmount]);

  useEffect(() => {
    handleRechargeReturnRef.current = async () => {
      await handleMockRecharge(MOCK_RECHARGE_RETURN_AMOUNT);
    };
  }, [handleMockRecharge]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadCurrentUserProfile();
    });

    return () => {
      task.cancel();
    };
  }, [loadCurrentUserProfile]);

  useFocusEffect(useCallback(() => {
    walletRefreshTaskRef.current?.cancel?.();
    walletRefreshTaskRef.current = InteractionManager.runAfterInteractions(() => {
      loadWalletBalance();
    });

    return () => {
      walletRefreshTaskRef.current?.cancel?.();
      walletRefreshTaskRef.current = null;
    };
  }, [loadWalletBalance]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const isReturningToForeground =
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active';

      if (isReturningToForeground && pendingRechargeSimulationRef.current) {
        pendingRechargeSimulationRef.current = false;
        handleRechargeReturnRef.current().catch(error => {
          console.error('Failed to simulate recharge after returning to HomeScreen:', error);
        });
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRechargeForPaidQuestion = useCallback(async () => {
    const result = await openOfficialRechargePage({
      userId: currentUserProfile.userId,
      username: currentUserProfile.username,
    });

    if (result?.ok) {
      pendingRechargeSimulationRef.current = true;
      return;
    }

    const reasonKey = `profile.${result?.reason}`;
    const reasonMessage = t(reasonKey);

    showAppAlert(
      t('profile.rechargeUnavailableTitle'),
      reasonMessage === reasonKey ? t('profile.rechargeUnavailableMessage') : reasonMessage
    );
  }, [currentUserProfile.userId, currentUserProfile.username, t]);

  const handlePaidQuestionPress = useCallback((question, extraParams = {}) => {
    if (!question) {
      return;
    }

    if (shouldRequirePaidQuestionAccess(question) && !question.isPaid) {
      openPaidAlertModal(question, extraParams);
      return;
    }

    navigateToQuestionDetail(question, extraParams);
  }, [navigateToQuestionDetail, openPaidAlertModal]);

  const handlePaidQuestionUnlock = useCallback(async () => {
    if (!selectedPaidQuestion?.id || isUnlockingPaidQuestion) {
      return;
    }

    const amount = Number(selectedPaidQuestion.paidAmount) || 0;

    if (amount <= 0) {
      closePaidAlertModal();
      navigateToQuestionDetail(selectedPaidQuestion, pendingPaidQuestionRouteParams);
      return;
    }

    setIsUnlockingPaidQuestion(true);

    let walletBalance = 0;
    let walletCurrency = 'usd';

    try {
      const response = await userApi.getWalletBalance();
      const walletInfo = await getWalletBalanceWithMock(response?.data?.balance);
      walletBalance = Number(walletInfo?.balance) || 0;
      walletCurrency = String(response?.data?.currency || 'usd').toLowerCase();
    } catch (error) {
      console.error('Failed to load wallet balance for paid question unlock:', error);
      const fallbackWalletInfo = await getWalletBalanceWithMock(0);
      walletBalance = Number(fallbackWalletInfo?.balance) || 0;
    }

    if (walletBalance < amount) {
      setIsUnlockingPaidQuestion(false);
      showAppAlert(
        t('home.insufficientBalanceTitle'),
        t('home.insufficientBalanceMessage')
          .replace('{balance}', formatPaidAmount(walletBalance))
          .replace('{amount}', formatPaidAmount(amount)),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('profile.recharge'),
            onPress: () => {
              handleRechargeForPaidQuestion().catch(error => {
                console.error('Failed to open recharge page for paid question:', error);
              });
            },
          },
        ]
      );
      return;
    }

    try {
      await applyMockWalletExpense({
        amount,
        currency: walletCurrency,
        type: '付费查看',
      });
      await markQuestionAsPaid({
        questionId: selectedPaidQuestion.id,
        paidAmount: amount,
      });

      setQuestionList(prev =>
        prev.map(item =>
          item?.id === selectedPaidQuestion.id
            ? { ...item, isPaid: true }
            : item
        )
      );

      const unlockedQuestion = {
        ...selectedPaidQuestion,
        isPaid: true,
      };

      closePaidAlertModal();
      showToast(
        t('home.payToViewSuccess').replace('{amount}', formatPaidAmount(amount)),
        'success'
      );
      navigateToQuestionDetail(unlockedQuestion, pendingPaidQuestionRouteParams);
    } catch (error) {
      console.error('Failed to unlock paid question:', error);
      setIsUnlockingPaidQuestion(false);
      showAppAlert(t('home.payToViewFailedTitle'), t('home.payToViewFailedMessage'));
    }
  }, [
    closePaidAlertModal,
    formatPaidAmount,
    handleRechargeForPaidQuestion,
    isUnlockingPaidQuestion,
    navigateToQuestionDetail,
    pendingPaidQuestionRouteParams,
    selectedPaidQuestion,
    setQuestionList,
    t,
  ]);

  const getDisplayRegion = () => {
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    // 只显示最后一级，如果没有选择则显示"全球"
    if (parts.length === 0) return t('home.global');
    return parts[parts.length - 1];
  };

  const getSelectedRegionId = () => {
    const regionIds = [
      selectedRegion.districtId,
      selectedRegion.stateId,
      selectedRegion.cityId,
      selectedRegion.countryId,
    ];
    const matchedRegionId = regionIds.find(regionId => {
      if (regionId === undefined || regionId === null) {
        return false;
      }

      return String(regionId).trim() !== '';
    });

    const parsedRegionId = Number(matchedRegionId);
    return Number.isFinite(parsedRegionId) ? parsedRegionId : 0;
  };

  return (
    <RootErrorBoundary>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部搜索栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.regionBtn}
          onPress={() => setShowRegionModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color="#ef4444" />
          <Text style={styles.regionText} numberOfLines={1} ellipsizeMode="tail">{getDisplayRegion()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={16} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>{t('home.search')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.teamBtn}
          onPress={() => navigation.navigate('MyTeams')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={22} color="#4b5563" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.notifyBtn}
          onPress={() => navigation.navigate('Messages')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#4b5563" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
          directionalLockEnabled
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => {
                if (tab === t('home.follow')) {
                  navigation.navigate('Follow');
                } else if (tab === t('home.hotList')) {
                  navigation.navigate('HotList');
                // } else if (tab === t('home.incomeRanking')) {
                //   navigation.navigate('IncomeRanking'); // 暂时隐藏收入榜
                } else if (tab === t('home.rewardRanking')) {
                  navigation.navigate('RewardRanking');
                } else if (tab === t('home.questionRanking')) {
                  navigation.navigate('QuestionRanking', {
                    regionId: getSelectedRegionId(),
                    selectedRegion,
                  });
                } else if (tab === t('home.heroRanking')) {
                  navigation.navigate('HeroRanking');
                } else {
                  setActiveTab(tab);
                }
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.tabMenuBtn} onPress={() => navigation.navigate('ChannelManage')}>
          <Ionicons name="menu" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* 社交媒体按钮 - 显示在关注tab下方 */}
      <View style={[styles.socialButtonsBar, { display: activeTab === t('home.follow') ? 'flex' : 'none' }]}>
        <TouchableOpacity style={styles.socialButton} onPress={() => openSocialModal('twitter')}>
          <FontAwesome5 name="twitter" size={16} color="#1DA1F2" />
          <Text style={styles.socialButtonText}>@推特</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} onPress={() => openSocialModal('facebook')}>
          <FontAwesome5 name="facebook" size={16} color="#4267B2" />
          <Text style={styles.socialButtonText}>@Facebook</Text>
        </TouchableOpacity>
      </View>

      {/* 问题卡片列表 */}
      {activeTab !== t('home.topics') ? (
        <View style={styles.listContainer}>
          <FlashList
            data={safeQuestionList}
            estimatedItemSize={300}
            keyExtractor={(item, index) => String(item?.id ?? item?.questionId ?? `question-${index}`)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing && safeQuestionList.length === 0}
                onRefresh={onRefresh}
                colors={['#ef4444']}
                tintColor="#ef4444"
              />
            }
            ListEmptyComponent={renderEmptyList}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={() => (
              <>
                {/* 新内容提示 - 今日头条式优化 */}
                {hasNewContent && (
                  <TouchableOpacity
                    style={styles.newContentBanner}
                    onPress={onRefresh}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-up-circle" size={16} color="#ef4444" />
                    <Text style={styles.newContentText}>{t('home.hasNewContent') || '有新内容，点击刷新'}</Text>
                  </TouchableOpacity>
                )}
                
                {/* 同城筛选条 */}
                <View style={[styles.localFilterBar, { display: activeTab === t('home.sameCity') ? 'flex' : 'none' }]}>
                  <View style={styles.localFilterRow}>
                    <TouchableOpacity style={styles.localFilterItem} onPress={() => setShowCityModal(true)}>
                    <View style={[styles.localFilterIcon, { backgroundColor: '#e0f2fe' }]}>
                      <Ionicons name="navigate" size={22} color="#0ea5e9" />
                    </View>
                    <Text style={styles.localFilterLabel}>{t('home.switchLocation')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.localFilterItem}
                    onPress={() => setLocalFilter('latest')}
                  >
                    <View style={[styles.localFilterIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="time" size={22} color="#f59e0b" />
                    </View>
                    <Text style={[styles.localFilterLabel, localFilter === 'latest' && styles.localFilterLabelActive]}>{t('home.latest')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.localFilterItem}
                    onPress={() => setLocalFilter('hottest')}
                  >
                    <View style={[styles.localFilterIcon, { backgroundColor: '#fef3c7' }]}>
                      <Ionicons name="flame" size={22} color="#f59e0b" />
                    </View>
                    <Text style={[styles.localFilterLabel, localFilter === 'hottest' && styles.localFilterLabelActive]}>{t('home.hottest')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.localFilterItem}
                    onPress={() => { setLocalFilter('nearby'); setShowNearbyModal(true); }}
                  >
                    <View style={[styles.localFilterIcon, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="location" size={22} color="#ef4444" />
                    </View>
                    <Text style={[styles.localFilterLabel, localFilter === 'nearby' && styles.localFilterLabelActive]}>{t('home.nearby')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.localFilterItem}
                    onPress={() => navigation.navigate('Emergency')}
                  >
                    <View style={[styles.localFilterIcon, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="alert-circle" size={22} color="#ef4444" />
                    </View>
                    <Text style={styles.localFilterLabel}>{t('emergency.title')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </>
            )}
          ListFooterComponent={renderFooter}
          renderItem={({ item, index }) => {
            if (!item || typeof item !== 'object') {
              return null;
            }
            const isLiked = getQuestionLikeState(item.id);
            const isDisliked = getQuestionDislikeState(item.id);
            const isLikeDisabled = !isLiked && isDisliked;
            const requiresPaidView = item.requiresPaidView ?? shouldRequirePaidQuestionAccess(item);
            const isFirstItem = index === 0;
            const isLastItem = index === safeQuestionList.length - 1;
            return (
              <TouchableOpacity 
                style={[styles.questionCard, isFirstItem && styles.firstQuestionCard]} 
                onPress={() => {
                  // 所有问题都可以跳转
                  handlePaidQuestionPress(item);
                }}
              >
                <View style={[styles.questionCardInner, isLastItem && styles.lastQuestionCardInner]}>
                  {/* 问题标题和标签 */}
                  <View style={styles.questionTitleWrapper}>
                    {/* 实际显示的文本 */}
                    <View style={styles.titleContainer}>
                      <Text
                        style={styles.questionTitle}
                        numberOfLines={3}
                        onTextLayout={(e) => {
                          if (measuredTitleIdsRef.current.has(item.id)) {
                            return;
                          }

                          measuredTitleIdsRef.current.add(item.id);
                          const lineCount = e.nativeEvent.lines.length;

                          if (lineCount > 3) {
                            setTitleLineCount(prev => prev[item.id] === lineCount ? prev : ({ ...prev, [item.id]: lineCount }));
                            setNeedsExpand(prev => prev[item.id] ? prev : ({ ...prev, [item.id]: true }));
                          }
                        }}
                      >
                        {(item.type === 'reward' && item.reward) || (item.type === 'targeted' && item.reward) || requiresPaidView ? (
                          <>
                            {item.type === 'reward' && item.reward && (
                              <Text style={styles.rewardTagInline}> ${item.reward} </Text>
                            )}
                            {item.type === 'targeted' && (
                              <>
                                {item.reward && item.reward > 0 ? (
                                  <Text style={styles.targetedTagInline}> ${item.reward} </Text>
                                ) : (
                                <Text style={styles.targetedTagInline}> {t('home.targeted')} </Text>
                              )}
                            </>
                          )}
                            {requiresPaidView && (
                              <Text style={styles.paidTagInline}> </Text>
                            )}
                            {'  '}
                          </>
                        ) : null}
                        {item.title}
                        {item.status === 2 && (
                          <Text style={styles.solvedTagInline}> {t('home.solved')}</Text>
                        )}
                      </Text>
                    </View>
                    
                    {/* 全文按钮 */}
                    {needsExpand[item.id] && (
                      <TouchableOpacity 
                        style={styles.fullTextBtnBottom}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePaidQuestionPress(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.fullTextBtnText}>...{t('home.fullText')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 付费查看按钮 */}
                  {requiresPaidView && !item.isPaid && (
                    <TouchableOpacity 
                      style={styles.paidViewButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        openPaidAlertModal(item);
                      }}
                    >
                      <View style={styles.paidViewContent}>
                        <Ionicons name="lock-closed-outline" size={20} color="#f59e0b" />
                        <Text style={styles.paidViewText}>{t('home.paidViewContent')}</Text>
                      </View>
                      <View style={styles.paidViewPrice}>
                        <Text style={styles.paidViewPriceText}>${item.paidAmount}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* 图片 */}
                  {item.image && <Image source={{ uri: item.image }} style={styles.singleImage} resizeMode="cover" />}
                  {item.images && item.images.length > 0 && (
                    <View style={styles.imagesContainer}>
                      {/* 1张图片：大图显示 */}
                      {item.images.length === 1 && (
                        <Image source={{ uri: item.images[0] }} style={styles.singleImage} resizeMode="cover" />
                      )}
                      
                      {/* 2张图片：左右各一张 */}
                      {item.images.length === 2 && (
                        <View style={styles.twoImagesGrid}>
                          <Image source={{ uri: item.images[0] }} style={styles.twoImageItem} resizeMode="cover" />
                          <Image source={{ uri: item.images[1] }} style={styles.twoImageItem} resizeMode="cover" />
                        </View>
                      )}
                      
                      {/* 3张图片：横向三张 */}
                      {item.images.length === 3 && (
                        <View style={styles.threeImagesGrid}>
                          <Image source={{ uri: item.images[0] }} style={styles.threeImageItem} resizeMode="cover" />
                          <Image source={{ uri: item.images[1] }} style={styles.threeImageItem} resizeMode="cover" />
                          <Image source={{ uri: item.images[2] }} style={styles.threeImageItem} resizeMode="cover" />
                        </View>
                      )}
                      
                      {/* 4张图片：2x2网格 */}
                      {item.images.length === 4 && (
                        <View style={styles.fourImagesGrid}>
                          {item.images.map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.fourImageItem} resizeMode="cover" />
                          ))}
                        </View>
                      )}
                      
                      {/* 5-6张图片：3列布局 */}
                      {item.images.length >= 5 && item.images.length <= 6 && (
                        <View style={styles.multiImagesGrid}>
                          {item.images.map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.multiImageItem} resizeMode="cover" />
                          ))}
                        </View>
                      )}
                      
                      {/* 7-9张图片：3x3网格 */}
                      {item.images.length >= 7 && item.images.length <= 9 && (
                        <View style={styles.nineImagesGrid}>
                          {item.images.slice(0, 9).map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.nineImageItem} resizeMode="cover" />
                          ))}
                        </View>
                      )}
                      
                      {/* 超过9张：显示前9张，最后一张显示+N */}
                      {item.images.length > 9 && (
                        <View style={styles.nineImagesGrid}>
                          {item.images.slice(0, 8).map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.nineImageItem} resizeMode="cover" />
                          ))}
                          <View style={styles.moreImagesWrapper}>
                            <Image source={{ uri: item.images[8] }} style={styles.nineImageItem} resizeMode="cover" />
                            <View style={styles.moreImagesOverlay}>
                              <Text style={styles.moreImagesText}>+{item.images.length - 8}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* 用户信息区域 - 分为两行显示 */}
                  <View style={styles.cardHeader}>
                    {/* 第一行：头像、用户名、认证标识 + 右侧操作按钮 */}
                    <View style={styles.cardHeaderRow}>
                      <TouchableOpacity
                        style={styles.cardHeaderLeft}
                        activeOpacity={0.7}
                        onPress={e => {
                          e.stopPropagation();
                          navigateToPublicProfile(navigation, item, { allowAnonymous: false });
                        }}
                      >
                        <Avatar 
                          uri={item.authorAvatar} 
                          name={item.authorNickName || t('home.anonymous')} 
                          size={17} 
                        />
                        <Text style={styles.authorName} numberOfLines={1}>
                          {item.authorNickName || t('home.anonymous')}
                        </Text>
                        {item.verified && <Ionicons name="checkmark-circle" size={10} color="#3b82f6" style={{ marginLeft: 2 }} />}
                      </TouchableOpacity>
                      <View style={styles.cardHeaderRight}>
                        <TouchableOpacity
                          style={[styles.headerActionBtn, isLikeDisabled && styles.headerActionBtnDisabled]}
                          onPress={() => toggleLike(item.id)}
                          disabled={isLikeDisabled}
                        >
                          <Ionicons name={isLiked ? "thumbs-up" : "thumbs-up-outline"} size={14} color={isLiked ? "#ef4444" : isLikeDisabled ? "#d1d5db" : "#9ca3af"} />
                          <Text style={[styles.headerActionText, isLiked && { color: '#ef4444' }, isLikeDisabled && styles.headerActionTextDisabled]}>{formatNumber(item.likeCount || 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.headerActionBtn} 
                          onPress={() => {
                            setCurrentQuestionForComment(item);
                            setShowCommentModal(true);
                          }}
                        >
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.headerActionText}>{item.answerCount || 0}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerMoreBtn} onPress={() => openActionModal(item)}>
                          <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {/* 第二行：时间和地区信息 */}
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.postTime}>{formatTime(item.time)}</Text>
                      <Text style={styles.metaSeparator}>·</Text>
                      <View style={styles.locationMeta}>
                        <Ionicons name="location-outline" size={9} color="#9ca3af" />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {getLocationDisplay(item)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      ) : (
        /* 话题列表 */
        <ScrollView style={styles.topicsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.topicsSection}>
            {topicsData.map(topic => {
              const isFollowed = topic.isFollowed !== undefined ? topic.isFollowed : false;
              const currentFollowState = topicFollowState[topic.id];
              const displayFollowed = currentFollowState !== undefined ? currentFollowState : isFollowed;
              
              return (
                <TouchableOpacity key={topic.id} style={styles.topicCard}>
                  <View style={[styles.topicIcon, { backgroundColor: topic.color + '20' }]}>
                    <Ionicons name={topic.icon} size={24} color={topic.color} />
                  </View>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicName}>{topic.name}</Text>
                    <Text style={styles.topicDesc}>{topic.description}</Text>
                    <Text style={styles.topicStats}>{topic.followers} {t('home.followers')} · {topic.questions} {t('home.questions')}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.topicFollowBtn, displayFollowed && styles.topicFollowBtnActive]}
                    onPress={() => toggleFollowTopic(topic.id)}
                  >
                    <Text style={[styles.topicFollowBtnText, displayFollowed && styles.topicFollowBtnTextActive]}>
                      {displayFollowed ? t('home.unfollowTopic') : `+ ${t('home.followTopic')}`}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* 区域选择弹窗 */}
      <RegionSelector
        visible={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        t={t}
      />

      {/* 三个点操作弹窗 */}
      <Modal visible={showActionModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionModal(false)}>
          <View style={[styles.actionModal, {
          paddingBottom: Math.max(insets.bottom, 16) + 14
        }]}>
            <View style={styles.actionModalHandle} />
            <TouchableOpacity
              style={[
                styles.actionItem,
                selectedQuestion && !getQuestionDislikeState(selectedQuestion.id) && getQuestionLikeState(selectedQuestion.id) && styles.actionItemDisabled
              ]}
              onPress={() => { if (selectedQuestion) toggleDislike(selectedQuestion.id); }}
              disabled={selectedQuestion && !getQuestionDislikeState(selectedQuestion.id) && getQuestionLikeState(selectedQuestion.id)}
            >
              <Ionicons name={selectedQuestion && getQuestionDislikeState(selectedQuestion.id) ? "thumbs-down" : "thumbs-down-outline"} size={22} color={selectedQuestion && !getQuestionDislikeState(selectedQuestion.id) && getQuestionLikeState(selectedQuestion.id) ? "#d1d5db" : "#6b7280"} />
              <Text style={[styles.actionItemText, selectedQuestion && !getQuestionDislikeState(selectedQuestion.id) && getQuestionLikeState(selectedQuestion.id) && styles.actionItemTextDisabled]}>
                {selectedQuestion && getQuestionDislikeState(selectedQuestion.id) ? '已踩' : '踩一下'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => openQuestionShareModal(selectedQuestion)}
            >
              <Ionicons name="arrow-redo-outline" size={22} color="#1f2937" />
              <Text style={styles.actionItemText}>分享 ({formatNumber(selectedQuestion?.shareCount || 0)})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => { if (selectedQuestion) toggleBookmark(selectedQuestion.id); setShowActionModal(false); }}>
              <Ionicons name={selectedQuestion && bookmarkedItems[selectedQuestion.id] ? "star" : "star-outline"} size={22} color={selectedQuestion && bookmarkedItems[selectedQuestion.id] ? "#f59e0b" : "#1f2937"} />
              <Text style={[styles.actionItemText, selectedQuestion && bookmarkedItems[selectedQuestion.id] && { color: '#f59e0b' }]}>
                {selectedQuestion && bookmarkedItems[selectedQuestion.id] ? t('home.bookmarked') : t('home.bookmark')} ({formatNumber(selectedQuestion?.collectCount || 0)})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionModal(false); showToast(t('home.joinTeamFeature'), 'info'); }}>
              <Ionicons name="people-circle-outline" size={22} color="#1f2937" />
              <Text style={styles.actionItemText}>{t('home.joinTeam')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => { 
                setShowActionModal(false); 
                // 所有问题都可以跳转
                handlePaidQuestionPress(selectedQuestion, {
                  openAnswerModal: true,
                  defaultTab: 'answers'
                });
              }}
            >
              <Ionicons name="create-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionItemText, { color: '#ef4444' }]}>{t('home.writeAnswer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionModal(false); handlePaidQuestionPress(selectedQuestion, { defaultTab: 'supplements', openSupplementModal: true }); }}>
              <Ionicons name="add-circle-outline" size={22} color="#1f2937" />
              <Text style={styles.actionItemText}>{t('home.supplementQuestion')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setShowActionModal(false); navigation.navigate('QuestionActivityList', { questionId: selectedQuestion?.id, questionTitle: selectedQuestion?.title, openCreateModal: true }); }}>
              <Ionicons name="calendar-outline" size={22} color="#22c55e" />
              <Text style={styles.actionItemText}>{t('home.startActivity')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => openSocialModal('twitter')}>
              <FontAwesome5 name="twitter" size={20} color="#1DA1F2" />
              <Text style={styles.actionItemText}>@推特</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, styles.reportItem]}>
              <Ionicons name="flag-outline" size={22} color="#ef4444" />
              <Text style={[styles.actionItemText, { color: '#ef4444' }]}>{t('common.report')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowActionModal(false)}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 社交平台用户选择弹窗 */}
      <Modal visible={showSocialModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardDismissView>
          <View style={[styles.socialModal, {
          paddingBottom: Math.max(insets.bottom, 16) + 14
        }]}>
            <View style={styles.socialHeader}>
              <TouchableOpacity onPress={() => setShowSocialModal(false)}>
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>
              <View style={styles.socialTitleRow}>
                {socialPlatform === 'twitter' ? (
                  <FontAwesome5 name="twitter" size={20} color="#1DA1F2" />
                ) : (
                  <FontAwesome5 name="facebook" size={20} color="#4267B2" />
                )}
                <Text style={styles.socialTitle}>
                  {socialPlatform === 'twitter' ? '推特用户' : 'Facebook用户'}
                </Text>
              </View>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.socialSearchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.socialSearchInput}
                placeholder={t('home.socialSearchPlaceholder')}
                value={socialSearchText}
                onChangeText={setSocialSearchText}
              />
            </View>

            <Text style={styles.socialRecommendTitle}>{t('home.socialRecommendedUsers')}</Text>

            <FlatList
              data={filteredSocialUsers}
              keyExtractor={item => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.socialUserItem} onPress={() => sendSocialMessage(item)}>
                  <Avatar uri={item.avatar} name={item.name} size={40} />
                  <View style={styles.socialUserInfo}>
                    <Text style={styles.socialUserName}>{item.name}</Text>
                    <Text style={styles.socialUserHandle}>{item.handle}</Text>
                  </View>
                  <View style={styles.socialUserMeta}>
                    <Text style={styles.socialUserFollowers}>{item.followers} {t('home.socialFollowers')}</Text>
                    <TouchableOpacity style={styles.inviteBtn} onPress={() => sendSocialMessage(item)}>
                      <Text style={styles.inviteBtnText}>{t('home.socialInviteAnswer')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.socialUserList}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 12)
              }}
            />
          </View>
            </KeyboardDismissView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <EditTextModal
        visible={showTwitterInviteEditor}
        onClose={() => {
          setShowTwitterInviteEditor(false);
          setSelectedSocialInviteUser(null);
        }}
        title={t('home.twitterInviteEditorTitle')}
        currentValue={twitterInviteDraftText}
        onSave={handleTwitterInviteShare}
        placeholder={t('home.twitterInviteEditorPlaceholder').replace('{handle}', selectedSocialInviteUser?.handle || '@username')}
        maxLength={220}
        multiline
        hint={t('home.twitterInviteEditorHint')}
        loading={pendingSocialInvitePlatform === 'twitter'}
      />

      <Modal
        visible={showPaidAlertModal}
        transparent
        animationType="fade"
        onRequestClose={closePaidAlertModal}
      >
        <View style={styles.paidAlertOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closePaidAlertModal}
          />
          <View style={styles.paidAlertModal}>
            <View style={styles.paidAlertHeader}>
              <Ionicons name="lock-closed-outline" size={18} color={modalTokens.danger} />
              <Text style={styles.paidAlertTitle}>{t('home.paidViewContent')}</Text>
            </View>
            <Text style={styles.paidAlertDesc}>
              {t('home.payToView').replace('${amount}', paidAlertAmount)}
            </Text>
            <View style={styles.paidAlertTips}>
              <Text style={styles.paidAlertTip}>{t('home.payToViewExtraLine1')}</Text>
              <Text style={styles.paidAlertTip}>{t('home.payToViewExtraLine2')}</Text>
              <Text style={styles.paidAlertTip}>{t('home.payToViewExtraLine3')}</Text>
            </View>
            <View style={styles.paidAlertActions}>
              <TouchableOpacity
                style={styles.paidAlertCancelBtn}
                onPress={closePaidAlertModal}
                disabled={isUnlockingPaidQuestion}
              >
                <Text style={styles.paidAlertCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.paidAlertConfirmBtn}
                onPress={handlePaidQuestionUnlock}
                disabled={isUnlockingPaidQuestion}
              >
                {isUnlockingPaidQuestion ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.paidAlertConfirmText}>支付</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <InitialCredentialsModal
        visible={showInitialCredentialsModal}
        username={initialCredentials.username}
        password={initialCredentials.password}
        onConfirm={handleConfirmInitialCredentials}
      />

      <ShareModal
        visible={showShareModal}
        onClose={closeShareModal}
        shareData={currentShareData || buildQuestionSharePayload(selectedQuestion)}
        onShare={handleShare}
      />

      {/* 评论弹窗 */}
      <WriteCommentModal
        visible={showCommentModal}
        onClose={() => {
        setShowCommentModal(false);
        setCurrentQuestionForComment(null);
      }}
        onPublish={async (text, asTeam, images = []) => {
          console.log('发布评论:', { text, asTeam, images });
          showToast(t('home.commentPublishSuccess'), 'success');
          setShowCommentModal(false);
          setCurrentQuestionForComment(null);
        }}
        placeholder={t('home.commentPlaceholder')}
        title={t('home.commentTitle')}
      />
    </SafeAreaView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  regionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fef2f2', borderRadius: 16, marginRight: 8, maxWidth: 80 },
  regionText: { fontSize: scaleFont(12), color: '#ef4444', marginLeft: 4, fontWeight: '500', lineHeight: scaleFont(16), includeFontPadding: false, maxWidth: 56 },
  searchBar: { flex: 1, height: 36, backgroundColor: '#f5f5f5', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginHorizontal: 8 },
  searchPlaceholder: { fontSize: scaleFont(13), color: '#999999', marginLeft: 6, flexShrink: 1 },
  teamBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, marginLeft: 4 },
  notifyBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, marginLeft: 4, position: 'relative' },
  badge: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4 },
  tabBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', height: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ebebeb' },
  tabBar: { flex: 1 },
  tabBarContent: { paddingRight: 8 },
  tabItem: { paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tabText: { fontSize: scaleFont(16), color: '#505050', fontWeight: '400', paddingBottom: 4 },
  tabTextActive: { color: '#ef4444', fontWeight: '600' },
  tabIndicator: { position: 'absolute', bottom: 0, width: 16, height: 2.5, borderRadius: 2, backgroundColor: '#f04444' },
  tabMenuBtn: { flexDirection: 'row', alignItems: 'center', height: '100%', backgroundColor: '#ffffff', paddingHorizontal: 12 },
  socialButtonsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  socialButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  socialButtonText: { fontSize: scaleFont(13), color: '#4b5563', fontWeight: '500' },
  listContainer: { flex: 1, backgroundColor: '#ffffff' },
  list: { flex: 1, paddingTop: 0, paddingHorizontal: 0 },
  skeletonContainer: { paddingTop: 8, paddingBottom: 20 },
  skeletonCard: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  skeletonTitleShort: { borderRadius: 6, marginBottom: 16 },
  skeletonBanner: { borderRadius: 14, backgroundColor: '#faf5e8', borderWidth: 1, borderColor: '#f8e7b4', marginBottom: 16 },
  skeletonMetaRow: { flexDirection: 'row', alignItems: 'center' },
  skeletonAvatar: { borderRadius: 16, marginRight: 10 },
  skeletonMetaTextGroup: { flex: 1, gap: 6 },
  skeletonMetaPrimary: { borderRadius: 6 },
  skeletonMetaSecondary: { borderRadius: 5 },
  skeletonStatGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  skeletonStatItem: { borderRadius: 6 },
  skeletonMenuDot: { borderRadius: 6 },
  listStateContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 72, gap: 12 },
  listStateText: { fontSize: scaleFont(14), color: '#9ca3af' },
  listStateTitle: { fontSize: scaleFont(15), color: '#6b7280', fontWeight: '500' },
  listRetryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  listRetryBtnText: { fontSize: scaleFont(13), color: '#ef4444', fontWeight: '600' },
  footerLoading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  footerText: { marginLeft: 8, fontSize: scaleFont(14), color: '#9ca3af' },
  footerEnd: { paddingVertical: 20, alignItems: 'center' },
  footerEndText: { fontSize: scaleFont(14), color: '#9ca3af' },
  questionCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
  },
  firstQuestionCard: {
    paddingTop: 0,
  },
  questionCardInner: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  lastQuestionCardInner: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0,
  },
  questionTitleWrapper: {
    marginBottom: 12,
  },
  cardHeader: {
    marginTop: 0
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  cardHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    minWidth: 0,
    marginRight: 8
  },
  cardHeaderRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flexShrink: 0
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 21
  },
  avatar: { width: 16, height: 16, borderRadius: 8 },
  authorName: { 
    fontSize: scaleFont(14), 
    fontWeight: '400', 
    color: '#999999', 
    marginLeft: 4, 
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif', 
    flexShrink: 1,
    maxWidth: '70%'
  },
  metaSeparator: { 
    fontSize: scaleFont(14), 
    color: '#999999', 
    marginHorizontal: 3, 
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif' 
  },
  postTime: { 
    fontSize: scaleFont(12), 
    fontWeight: '400', 
    color: '#999999', 
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif' 
  },
  locationMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
    minWidth: 0
  },
  locationText: { 
    fontSize: scaleFont(12), 
    fontWeight: '400', 
    color: '#999999', 
    marginLeft: 3, 
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif', 
    flex: 1
  },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 16 },
  headerActionBtnDisabled: { opacity: 0.45 },
  headerActionText: { fontSize: scaleFont(12), color: '#666666', marginLeft: 4 },
  headerActionTextDisabled: { color: '#d1d5db' },
  headerMoreBtn: { padding: 2, marginLeft: 16 },
  rewardTagInline: { 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0, 
    paddingVertical: 0, 
    borderRadius: 0,
    fontSize: scaleFont(19), 
    color: '#ef4444', 
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(22),
  },
  targetedTagInline: { 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0, 
    paddingVertical: 0, 
    borderRadius: 0,
    fontSize: scaleFont(19), 
    color: '#8b5cf6', 
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(22),
  },
  paidTagInline: { 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0, 
    paddingVertical: 0, 
    borderRadius: 0,
    fontSize: scaleFont(18), 
    color: '#f59e0b', 
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(22),
  },
  solvedTagInline: { 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0, 
    paddingVertical: 0, 
    borderRadius: 0,
    fontSize: scaleFont(16), 
    color: '#22c55e', 
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: scaleFont(22),
  },
  paidTagText: { fontSize: scaleFont(10), color: '#fff', fontWeight: '700', textTransform: 'uppercase', includeFontPadding: false },
  paidViewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 6, borderStyle: 'dashed' },
  paidViewContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paidViewText: { fontSize: scaleFont(14), color: '#92400e', fontWeight: '500' },
  paidViewPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidViewPriceText: { fontSize: scaleFont(16), color: '#f59e0b', fontWeight: '700' },
  questionTitle: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
    fontWeight: '400',
    color: '#1a1a1a',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'left',
  },
  titleContainer: {
    position: 'relative',
  },
  expandHintHome: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  expandHintTextHome: { fontSize: scaleFont(13), color: '#3b82f6', fontWeight: '500' },
  expandHintInline: { fontSize: scaleFont(13), color: '#3b82f6', fontWeight: '500' },
  fullTextInline: { 
    fontSize: scaleFont(17),
    color: '#1a1a1a',
  },
  fullTextBtnBottom: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  fullTextBtnText: { fontSize: scaleFont(14), color: '#3b82f6', fontWeight: '500' },
  imagesContainer: {
    marginBottom: 6,
  },
  singleImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 8,
    marginBottom: 6,
  },
  twoImagesGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  twoImageItem: {
    flex: 1,
    height: 180,
    borderRadius: 6,
  },
  threeImagesGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  threeImageItem: {
    flex: 1,
    height: 120,
    borderRadius: 6,
  },
  fourImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  fourImageItem: {
    width: '49%',
    height: 120,
    borderRadius: 6,
  },
  multiImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  multiImageItem: {
    width: '32.5%',
    height: 100,
    borderRadius: 6,
  },
  nineImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  nineImageItem: {
    width: '32.5%',
    height: 100,
    borderRadius: 6,
  },
  moreImagesWrapper: {
    width: '32.5%',
    height: 100,
    position: 'relative',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  imageGrid: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  gridImage: { width: 100, height: 100, borderRadius: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: modalTokens.overlay },
  modalKeyboardView: { flex: 1, justifyContent: 'flex-end' },
  regionModal: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  modalTitle: { fontSize: scaleFont(16), fontWeight: '600', color: modalTokens.textPrimary },
  confirmText: { fontSize: scaleFont(14), color: '#ef4444', fontWeight: '600' },
  // 面包屑导航样式
  breadcrumbContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  breadcrumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  breadcrumbItem: { 
    paddingHorizontal: 4, 
    paddingVertical: 4,
    justifyContent: 'center'
  },
  breadcrumbItemActive: { 
    // 不需要了，保留以防万一
  },
  breadcrumbText: { 
    fontSize: scaleFont(15), 
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: scaleFont(20)
  },
  breadcrumbTextActive: { 
    color: '#ef4444',
    fontWeight: '500'
  },
  breadcrumbIndicator: {
    display: 'none'
  },
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  breadcrumbSeparator: { 
    marginHorizontal: 6,
    marginTop: 5
  },
  regionList: { padding: 8 },
  regionOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  regionOptionText: { fontSize: scaleFont(15), color: modalTokens.textPrimary },
  actionModal: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, paddingBottom: 30 },
  actionModalHandle: { width: 40, height: 4, backgroundColor: modalTokens.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  actionItemDisabled: { opacity: 0.45 },
  actionItemText: { fontSize: scaleFont(15), color: modalTokens.textPrimary, marginLeft: 14 },
  actionItemTextDisabled: { color: '#d1d5db' },
  reportItem: { borderBottomWidth: 0 },
  cancelBtn: { marginTop: 8, marginHorizontal: 16, backgroundColor: modalTokens.surfaceMuted, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: scaleFont(15), color: modalTokens.textSecondary, fontWeight: '500' },
  channelModalOverlay: { flex: 1, backgroundColor: modalTokens.overlay },
  channelModal: { flex: 1, backgroundColor: modalTokens.surface, marginTop: 60, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border },
  channelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  channelScrollView: { flex: 1, padding: 16 },
  channelTitle: { fontSize: scaleFont(18), fontWeight: '600', color: modalTokens.textPrimary },
  closeBtn: { padding: 4 },
  channelTabs: { flexDirection: 'row', backgroundColor: modalTokens.surface, borderBottomWidth: 1, borderBottomColor: modalTokens.border, paddingHorizontal: 8 },
  channelTabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  channelTabItemActive: { borderBottomColor: '#ef4444' },
  channelTabText: { fontSize: scaleFont(14), color: modalTokens.textSecondary },
  channelTabTextActive: { color: '#ef4444', fontWeight: '600' },
  channelSection: { marginBottom: 0 },
  channelCategoryTitle: { fontSize: scaleFont(16), fontWeight: '600', color: modalTokens.textPrimary, marginBottom: 8, marginTop: 4 },
  channelSectionTitle: { fontSize: scaleFont(13), fontWeight: '600', color: modalTokens.textSecondary, marginBottom: 8, marginTop: 4 },
  channelDivider: { height: 8, backgroundColor: modalTokens.surfaceMuted, marginVertical: 12 },
  channelSectionDesc: { fontSize: scaleFont(13), color: modalTokens.textMuted, marginBottom: 12, lineHeight: scaleFont(18) },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  myChannelItem: { position: 'relative' },
  channelTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceMuted, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  channelTagAdded: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#22c55e' },
  channelTagText: { fontSize: scaleFont(14), color: modalTokens.textPrimary },
  channelTagTextAdded: { color: '#16a34a', fontWeight: '500' },
  removeChannelBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: modalTokens.surface, borderRadius: 10 },
  categoryMainBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceSoft, padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: modalTokens.border },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryMainText: { flex: 1, fontSize: scaleFont(15), fontWeight: '500', color: modalTokens.textPrimary },
  createComboBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#fecaca' },
  createComboBtnText: { fontSize: scaleFont(15), fontWeight: '500', color: '#ef4444', marginLeft: 8 },
  comboCreatorModal: { flex: 1, backgroundColor: modalTokens.surface, marginTop: 100, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border },
  comboCreatorContent: { flex: 1, padding: 16 },
  comboSummary: { backgroundColor: modalTokens.surfaceSoft, padding: 12, borderRadius: 8, marginBottom: 16 },
  comboSummaryLabel: { fontSize: scaleFont(12), color: modalTokens.textSecondary, marginBottom: 4 },
  comboSummaryValue: { fontSize: scaleFont(14), fontWeight: '500', color: modalTokens.textPrimary },
  categorySelectItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: modalTokens.surfaceSoft, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: modalTokens.border },
  categorySelectItemActive: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  categorySelectText: { flex: 1, fontSize: scaleFont(14), color: modalTokens.textPrimary, marginLeft: 12 },
  comboCreateBtn: { backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  comboCreateBtnDisabled: { backgroundColor: '#fca5a5' },
  comboCreateBtnText: { fontSize: scaleFont(15), fontWeight: '600', color: '#fff' },
  socialModal: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, maxHeight: '80%', paddingBottom: 30 },
  socialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  socialTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialTitle: { fontSize: scaleFont(16), fontWeight: '600', color: modalTokens.textPrimary },
  socialSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: modalTokens.surfaceSoft, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: modalTokens.border },
  socialSearchInput: { flex: 1, marginLeft: 8, fontSize: scaleFont(14) },
  socialRecommendTitle: { fontSize: scaleFont(14), fontWeight: '500', color: modalTokens.textSecondary, marginHorizontal: 16, marginBottom: 8 },
  socialUserList: { maxHeight: 400 },
  socialUserItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  socialUserAvatar: { width: 48, height: 48, borderRadius: 24 },
  socialUserInfo: { flex: 1, marginLeft: 12 },
  socialUserName: { fontSize: scaleFont(15), fontWeight: '500', color: '#1f2937' },
  socialUserHandle: { fontSize: scaleFont(13), color: '#9ca3af', marginTop: 2 },
  socialUserMeta: { alignItems: 'flex-end' },
  socialUserFollowers: { fontSize: scaleFont(12), color: '#9ca3af', marginBottom: 6 },
  inviteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  inviteBtnText: { fontSize: scaleFont(12), color: '#fff', fontWeight: '500' },
  paidAlertOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  paidAlertModal: {
    backgroundColor: modalTokens.surface,
    borderRadius: modalTokens.cardRadius,
    borderWidth: 1,
    borderColor: modalTokens.border,
    padding: 20,
    shadowColor: modalTokens.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  paidAlertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  paidAlertTitle: { fontSize: scaleFont(20), fontWeight: '700', color: modalTokens.textPrimary },
  paidAlertDesc: { fontSize: scaleFont(17), color: modalTokens.textSecondary, lineHeight: scaleFont(26), marginBottom: 20 },
  paidAlertTips: { marginBottom: 20, gap: 6 },
  paidAlertTip: { fontSize: scaleFont(14), color: modalTokens.textSecondary, lineHeight: scaleFont(21) },
  paidAlertActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  paidAlertCancelBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius,
  },
  paidAlertCancelText: { fontSize: scaleFont(15), color: '#6b7280', fontWeight: '600' },
  paidAlertConfirmBtn: {
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius,
  },
  paidAlertConfirmText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
  localFilterBar: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 8 },
  localFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  localFilterItem: { alignItems: 'center', flex: 1 },
  localFilterIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  localFilterLabel: { fontSize: scaleFont(12), color: '#4b5563' },
  localFilterLabelActive: { color: '#ef4444', fontWeight: '500' },
  
  // 话题列表样式
  topicsContainer: { flex: 1, backgroundColor: '#f3f4f6' },
  topicsSection: { backgroundColor: '#fff', marginTop: 8, padding: 12 },
  topicCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  topicIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  topicInfo: { flex: 1, marginLeft: 12 },
  topicName: { fontSize: scaleFont(15), fontWeight: '500', color: '#1f2937' },
  topicDesc: { fontSize: scaleFont(12), color: '#6b7280', marginTop: 2 },
  topicStats: { fontSize: scaleFont(11), color: '#9ca3af', marginTop: 4 },
  topicFollowBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  topicFollowBtnText: { fontSize: scaleFont(12), color: '#6b7280', fontWeight: '500' },
  topicFollowBtnActive: { backgroundColor: '#fef2f2' },
  topicFollowBtnTextActive: { color: '#ef4444' },
  
  // 新内容提示样式 - 今日头条式优化
  newContentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newContentText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    fontWeight: '500',
  },
});
