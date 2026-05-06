import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Share, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Pressable, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import ImagePickerSheet from '../components/ImagePickerSheet';
import SuperLikeBalance from '../components/SuperLikeBalance';
import LogoutConfirmModal from '../components/LogoutConfirmModal';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import UserCacheService from '../services/UserCacheService';
import { DEFAULT_MY_GROUPS } from '../data/profileMenuMockData';
import authApi from '../services/api/authApi';
import activityApi from '../services/api/activityApi';
import teamApi from '../services/api/teamApi';
import userApi from '../services/api/userApi';
import walletApi from '../services/api/walletApi';
import questionApi from '../services/api/questionApi';
import uploadApi from '../services/api/uploadApi';
import { loadOwnProfileAnswersPage } from '../services/profileAnswers';
import { showAppAlert } from '../utils/appAlert';
import { getOfficialWebsiteUrl } from '../utils/externalLinks';
import { resolveComposerTopInset } from '../utils/composerLayout';
import { formatTime } from '../utils/timeFormatter';
import { formatNumber } from '../utils/numberFormatter';
import { formatRewardPointsValue } from '../utils/rewardPointsDisplay';
import { isVisibleMyTeam, normalizeMyTeam } from '../utils/teamTransforms';
import { showToast } from '../utils/toast';
import {
  extractWalletTransactionRows,
  getWalletTransactionUniqueKey,
  normalizeWalletPointsOverview,
  WALLET_POINTS_DEFAULT_CURRENCY,
  summarizeWalletTransactions,
} from '../utils/walletPoints';
import ServerSwitcher from '../components/ServerSwitcher';

import { scaleFont } from '../utils/responsive';
const HISTORY_PAGE_SIZE = 10;
const ANSWERS_PAGE_SIZE = 10;
const WALLET_TXN_PAGE_SIZE = 100;
const WALLET_TXN_MAX_PAGES = 10;
const VERIFICATION_FILE_TYPES = [
  'application/pdf',
  'image/*',
];
const VERIFICATION_FILE_UPLOAD_ENABLED = false;

const getVerificationAssetName = asset => asset?.name || asset?.fileName || '';
const isVerificationAssetImage = asset => String(asset?.mimeType || asset?.type || '').toLowerCase().startsWith('image/');
const isUploadedVerificationAsset = asset => !!asset?.remoteUrl && !asset?.uploading;
const createVerificationAssetRecord = ({
  uri = '',
  remoteUrl = '',
  name = '',
  mimeType = '',
  size = null,
  uploading = false,
  error = '',
} = {}) => ({
  uri,
  remoteUrl,
  name,
  mimeType,
  size,
  uploading,
  error,
});
const isVerificationUploadSuccess = response => {
  const code = Number(response?.code ?? response?.data?.code);
  return code === 200 || code === 0;
};
const extractVerificationUploadPayload = response => {
  const payload = response?.data;

  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    payload.data !== undefined
  ) {
    return payload.data;
  }

  return payload;
};
const getVerificationResponseMessage = response => {
  const candidates = [
    response?.msg,
    response?.message,
    response?.data?.msg,
    response?.data?.message,
  ];

  const matchedMessage = candidates.find(
    candidate => typeof candidate === 'string' && candidate.trim()
  );

  return matchedMessage ? matchedMessage.trim() : '';
};
const stripUriQuery = value => String(value || '').split('?')[0];
const getUriExtension = value => {
  const normalizedValue = stripUriQuery(value);
  const segments = normalizedValue.split('.');
  return segments.length > 1 ? segments.pop().toLowerCase() : '';
};
const IMAGE_EXTENSION_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};
const inferVerificationImageMimeType = asset => {
  const directMimeType = String(asset?.mimeType || asset?.type || '').toLowerCase();
  if (directMimeType.startsWith('image/')) {
    return directMimeType;
  }

  const extensionMimeType = IMAGE_EXTENSION_TO_MIME[getUriExtension(asset?.fileName || asset?.name || asset?.uri)];
  return extensionMimeType || 'image/jpeg';
};
const ensureFileNameHasExtension = (fileName, extension = 'jpg') => {
  const normalizedFileName = String(fileName || '').trim();
  if (!normalizedFileName) {
    return `verification_${Date.now()}.${extension}`;
  }

  return /\.[a-z0-9]+$/i.test(normalizedFileName) ? normalizedFileName : `${normalizedFileName}.${extension}`;
};
const getVerificationLocalFileSize = async uri => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return Number(blob?.size) || 0;
  } catch (error) {
    console.warn('Failed to inspect local verification image size:', error);
    return 0;
  }
};

let clipboardModule;
let clipboardResolved = false;
let documentPickerModule;
let documentPickerResolved = false;
let imageManipulatorModule;
let imageManipulatorResolved = false;

const getClipboardModule = () => {
  if (clipboardResolved) {
    return clipboardModule;
  }

  clipboardResolved = true;

  try {
    const requiredModule = require('@react-native-clipboard/clipboard');
    clipboardModule = requiredModule?.default || requiredModule;
  } catch (error) {
    console.warn('Clipboard module is not available in the current native build.', error);
    clipboardModule = null;
  }

  return clipboardModule;
};

const getDocumentPickerModule = () => {
  if (documentPickerResolved) {
    return documentPickerModule;
  }

  documentPickerResolved = true;

  try {
    const requiredModule = require('expo-document-picker');
    documentPickerModule = requiredModule?.default || requiredModule;
  } catch (error) {
    console.warn('Document picker module is not available in the current native build.', error);
    documentPickerModule = null;
  }

  return documentPickerModule;
};

const getImageManipulatorModule = () => {
  if (imageManipulatorResolved) {
    return imageManipulatorModule;
  }

  imageManipulatorResolved = true;

  try {
    const requiredModule = require('expo-image-manipulator');
    imageManipulatorModule = requiredModule?.default || requiredModule;
  } catch (error) {
    console.warn('Image manipulator module is not available in the current native build.', error);
    imageManipulatorModule = null;
  }

  return imageManipulatorModule;
};

const copyTextSafely = async text => {
  const Clipboard = getClipboardModule();

  if (Clipboard?.setString) {
    Clipboard.setString(text);
    return 'copied';
  }

  try {
    await Share.share({ message: text });
    return 'shared';
  } catch (error) {
    console.error('Failed to share text without clipboard module.', error);
    return 'failed';
  }
};

const getFirstNonEmptyValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');

const normalizeProfileCount = (...values) => {
  for (const value of values) {
    const normalizedValue = Number(value);
    if (Number.isFinite(normalizedValue) && normalizedValue >= 0) {
      return normalizedValue;
    }
  }

  return 0;
};

const extractBrowseHistoryRows = response => {
  const rawData = response?.data;
  const payload = rawData?.data && typeof rawData?.data === 'object' ? rawData.data : rawData;

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      total: payload.length
    };
  }

  const rows = payload?.rows || payload?.list || payload?.records || payload?.items || [];
  const total = Number(payload?.total ?? payload?.count ?? payload?.totalCount ?? rows.length) || rows.length;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total
  };
};

const extractDraftRowsAndTotal = response => {
  const rawData = response?.data;
  const payload = rawData?.data && typeof rawData?.data === 'object' ? rawData.data : rawData;
  const rows = payload?.rows || payload?.list || payload?.records || payload?.items || [];
  const total = Number(payload?.total ?? payload?.count ?? payload?.totalCount ?? rows.length) || rows.length;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total
  };
};

const extractMyActivitiesRowsAndTotal = response => {
  const rawData = response?.data;
  const payload = rawData?.data && typeof rawData?.data === 'object' ? rawData.data : rawData;

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      total: payload.length
    };
  }

  const rows = payload?.rows || payload?.list || payload?.records || payload?.items || [];
  const total = Number(payload?.total ?? payload?.count ?? payload?.totalCount ?? rows.length) || rows.length;

  return {
    rows: Array.isArray(rows) ? rows : [],
    total
  };
};

const formatBrowseHistoryTime = rawTime => {
  if (!rawTime) return '';

  const parsedTime = new Date(rawTime);
  if (Number.isNaN(parsedTime.getTime())) {
    return String(rawTime);
  }

  return formatTime(rawTime) || String(rawTime);
};

const normalizeBrowseHistoryItem = item => {
  const targetId = getFirstNonEmptyValue(item?.questionId, item?.contentId, item?.targetId, item?.businessId, item?.bizId, item?.id);
  const recordId = getFirstNonEmptyValue(item?.id, item?.browseId, item?.recordId, targetId);
  const rawTime = getFirstNonEmptyValue(item?.browseTime, item?.browsedAt, item?.viewTime, item?.createTime, item?.createdAt, item?.updateTime, item?.updatedAt);
  const title = getFirstNonEmptyValue(item?.title, item?.questionTitle, item?.contentTitle, item?.targetTitle, item?.name, '');
  const author = getFirstNonEmptyValue(item?.authorNickName, item?.authorNickname, item?.authorName, item?.nickName, item?.nickname, item?.userName, item?.username, '');

  return {
    ...item,
    id: recordId,
    targetId,
    title: String(title || ''),
    author: String(author || ''),
    time: formatBrowseHistoryTime(rawTime)
  };
};

export default function ProfileScreen({
  navigation,
  onLogout
}) {
  const {
    t,
    i18n,
  } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset(20);
  const initialTopInset = initialWindowMetrics?.insets?.top ?? 0;
  const profileModalTopSafeInset = resolveComposerTopInset({
    platform: Platform.OS,
    topInset: insets.top,
    initialTopInset,
    statusBarHeight: 0
  });
  
  /**
   * 获取所在地的显示文本（只显示最后一级）
   */
  const getLocationDisplay = (location) => {
    if (!location) return '';
    
    // 按空格分割
    const parts = location.split(' ').filter(Boolean);
    
    // 如果有多级，只返回最后一级
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
    
    // 如果只有一级，返回原值
    return location;
  };
  
  const [walletData, setWalletData] = useState({
    balance: 0,
    withdrawableBalance: 0,
    lockedBalance: 0,
    frozenBalance: 0,
    incomeAmount: 0,
    expenseAmount: 0,
    currency: WALLET_POINTS_DEFAULT_CURRENCY
  });
  const [showWalletNoticeModal, setShowWalletNoticeModal] = useState(false);
  const officialFundingUrl = React.useMemo(() => getOfficialWebsiteUrl() || 'https://problemvshero.com/', []);
  const getCurrencySymbol = React.useCallback(currency => {
    switch (String(currency || 'usd').toLowerCase()) {
      case 'usd':
        return '$';
      case 'cny':
      case 'rmb':
        return '¥';
      case 'eur':
        return 'EUR ';
      case 'gbp':
        return '£';
      default:
        return '$';
    }
  }, []);
  const formattedWalletBalance = React.useMemo(
    () => formatRewardPointsValue(walletData.balance, { locale: i18n?.locale }),
    [i18n?.locale, walletData.balance]
  );
  const formatWalletAmount = React.useCallback(
    amount => formatRewardPointsValue(amount, { locale: i18n?.locale }),
    [i18n?.locale]
  );
  const formattedWalletIncome = React.useMemo(() => formatWalletAmount(walletData.incomeAmount), [formatWalletAmount, walletData.incomeAmount]);
  const formattedWalletExpense = React.useMemo(() => formatWalletAmount(walletData.expenseAmount), [formatWalletAmount, walletData.expenseAmount]);
  const formattedWithdrawableBalance = React.useMemo(() => formatWalletAmount(walletData.withdrawableBalance), [formatWalletAmount, walletData.withdrawableBalance]);
  const walletFundingTips = React.useMemo(() => [
    t('profile.fundingNoticeTipBalance'),
    t('profile.fundingNoticeTipRecords'),
    t('profile.fundingNoticeTipRisk'),
  ], [t]);

  // 用户信息状态
  const [userProfile, setUserProfile] = useState({
    nickname: '',
    userId: '',
    username: '',
    avatar: null,
    bio: '',
    location: '',
    occupation: '',
    likeCount: 0,
    followersCount: 0,
    followingCount: 0,
    friendCount: 0,
    passwordChanged: false // 是否修改过密码（默认 false，表示未修改，会显示默认密码）
  });
  const [draftsTotalCount, setDraftsTotalCount] = useState(0);
  const [myTeamsCount, setMyTeamsCount] = useState(0);
  const [myActivitiesCount, setMyActivitiesCount] = useState(0);

  // 加载用户信息
  const loadUserProfile = React.useCallback(async () => {
    // 读取密码修改标记
    const passwordChangedFlag = await AsyncStorage.getItem('passwordChanged');
    const hasChangedPassword = passwordChangedFlag === 'true';
    await UserCacheService.loadUserProfileWithCache(
    // 缓存加载完成回调（立即显示）
    cachedProfile => {
      console.log('ProfileScreen: loaded cached profile', cachedProfile);
      setUserProfile(prev => ({
        ...prev,
        nickname: cachedProfile.nickName || '',
        userId: cachedProfile.userId || '',
        username: cachedProfile.username || '',
        avatar: cachedProfile.avatar || null,
        bio: cachedProfile.signature || '',
        location: cachedProfile.location || '',
        occupation: cachedProfile.profession || '',
        likeCount: normalizeProfileCount(
          cachedProfile.likeCount,
          cachedProfile.likesCount,
          cachedProfile.likedCount
        ),
        followersCount: normalizeProfileCount(
          cachedProfile.fanCount,
          cachedProfile.fansCount,
          cachedProfile.followersCount,
          cachedProfile.followerCount
        ),
        followingCount: normalizeProfileCount(
          cachedProfile.followCount,
          cachedProfile.followingCount
        ),
        friendCount: normalizeProfileCount(
          cachedProfile.friendCount,
          cachedProfile.friendsCount
        ),
        passwordChanged: cachedProfile.passwordChanged === true || hasChangedPassword
      }));
    },
    // 最新数据加载完成回调（静默更新）
    freshProfile => {
      console.log('ProfileScreen: 从服务器更新用户信息', freshProfile);
      setUserProfile(prev => ({
        ...prev,
        nickname: freshProfile.nickName || '',
        userId: freshProfile.userId || '',
        username: freshProfile.username || '',
        avatar: freshProfile.avatar || null,
        bio: freshProfile.signature || '',
        location: freshProfile.location || '',
        occupation: freshProfile.profession || '',
        likeCount: normalizeProfileCount(
          freshProfile.likeCount,
          freshProfile.likesCount,
          freshProfile.likedCount
        ),
        followersCount: normalizeProfileCount(
          freshProfile.fanCount,
          freshProfile.fansCount,
          freshProfile.followersCount,
          freshProfile.followerCount
        ),
        followingCount: normalizeProfileCount(
          freshProfile.followCount,
          freshProfile.followingCount
        ),
        friendCount: normalizeProfileCount(
          freshProfile.friendCount,
          freshProfile.friendsCount
        ),
        passwordChanged: freshProfile.passwordChanged === true || hasChangedPassword
      }));
    });
  }, []);

  // 首次加载
  const loadWalletBalance = React.useCallback(async () => {
    try {
      const [overviewResult, transactionsResult] = await Promise.allSettled([
        walletApi.getPointsOverview(),
        walletApi.getPointsTransactionList({
          pageNum: 1,
          pageSize: WALLET_TXN_PAGE_SIZE
        })
      ]);

      if (overviewResult.status !== 'fulfilled') {
        throw overviewResult.reason || new Error('Failed to load wallet overview');
      }

      const overviewResponse = overviewResult.value;

      if (overviewResponse?.code !== 0 && overviewResponse?.code !== 200) {
        throw new Error(overviewResponse?.msg || 'Failed to load wallet overview');
      }

      const overviewData = normalizeWalletPointsOverview(overviewResponse?.data);
      let walletSummary = {
        income: 0,
        expense: 0
      };

      if (transactionsResult.status === 'fulfilled') {
        const firstPage = extractWalletTransactionRows(transactionsResult.value);
        let transactionRows = [...firstPage.rows];
        let currentPage = 1;
        let lastPageSize = firstPage.rows.length;
        const seenPageSignatures = new Set([
          JSON.stringify(firstPage.rows.map(getWalletTransactionUniqueKey))
        ]);

        while (
          firstPage.total > transactionRows.length &&
          currentPage < WALLET_TXN_MAX_PAGES &&
          lastPageSize >= WALLET_TXN_PAGE_SIZE
        ) {
          currentPage += 1;
          const nextResponse = await walletApi.getPointsTransactionList({
            pageNum: currentPage,
            pageSize: WALLET_TXN_PAGE_SIZE
          });
          const nextPage = extractWalletTransactionRows(nextResponse);
          const nextSignature = JSON.stringify(nextPage.rows.map(getWalletTransactionUniqueKey));

          if (!nextPage.rows.length || seenPageSignatures.has(nextSignature)) {
            break;
          }

          seenPageSignatures.add(nextSignature);
          transactionRows = transactionRows.concat(nextPage.rows);
          lastPageSize = nextPage.rows.length;

          if (nextPage.rows.length < WALLET_TXN_PAGE_SIZE) {
            break;
          }
        }

        walletSummary = summarizeWalletTransactions(transactionRows);
      }

      setWalletData({
        balance: Number(overviewData?.balance) || 0,
        withdrawableBalance: Number(overviewData?.withdrawableBalance) || 0,
        lockedBalance: Number(overviewData?.lockedBalance) || 0,
        frozenBalance: Number(overviewData?.frozenBalance) || 0,
        incomeAmount: walletSummary.income,
        expenseAmount: walletSummary.expense,
        currency: overviewData?.currency || WALLET_POINTS_DEFAULT_CURRENCY
      });
    } catch (error) {
      console.log('Failed to load wallet balance:', error?.message || error);
    }
  }, []);

  const loadMyTeamsCount = React.useCallback(async () => {
    try {
      const response = await teamApi.getMyTeams();
      const isSuccess = response?.code === 0 || response?.code === 200;

      if (!isSuccess) {
        throw new Error(response?.msg || 'Failed to fetch my teams');
      }

      const teamList = Array.isArray(response?.data) ? response.data : [];
      const visibleTeamCount = teamList
        .map(team => normalizeMyTeam(team))
        .filter(isVisibleMyTeam)
        .length;

      setMyTeamsCount(visibleTeamCount);
    } catch (error) {
      console.log('Failed to load my teams count:', error?.message || error);
      setMyTeamsCount(0);
    }
  }, []);

  const loadMyActivitiesCount = React.useCallback(async () => {
    try {
      const response = await activityApi.getMyActivities();
      const isSuccess = response?.code === 0 || response?.code === 200 || Array.isArray(response?.data);

      if (!isSuccess) {
        throw new Error(response?.msg || 'Failed to fetch my activities');
      }

      const { total } = extractMyActivitiesRowsAndTotal(response);
      setMyActivitiesCount(total);
    } catch (error) {
      console.log('Failed to load my activities count:', error?.message || error);
      setMyActivitiesCount(0);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
    loadWalletBalance();
    loadMyTeamsCount();
    loadMyActivitiesCount();
  }, [loadMyActivitiesCount, loadMyTeamsCount, loadUserProfile, loadWalletBalance]);

  // 每次页面获得焦点时重新加载（从设置页面返回时会触发）
  useFocusEffect(React.useCallback(() => {
    console.log('ProfileScreen: screen focused, reloading user profile');
    loadUserProfile();
    loadWalletBalance();
    loadMyTeamsCount();
    loadMyActivitiesCount();
  }, [loadMyActivitiesCount, loadMyTeamsCount, loadUserProfile, loadWalletBalance]));
  const stats = React.useMemo(() => [{
    label: t('profile.likes'),
    value: formatNumber(userProfile.likeCount),
    screen: 'Likes'
  }, {
    label: t('profile.followers'),
    value: formatNumber(userProfile.followersCount),
    screen: 'Fans'
  }, {
    label: t('profile.following'),
    value: formatNumber(userProfile.followingCount),
    screen: 'Follow'
  }, {
    label: t('profile.friends'),
    value: formatNumber(userProfile.friendCount),
    screen: 'Friends'
  }], [t, userProfile.followersCount, userProfile.followingCount, userProfile.friendCount, userProfile.likeCount]);
  const menuItems = React.useMemo(() => [{
    icon: 'document-text',
    label: t('profile.myDrafts'),
    value: String(draftsTotalCount),
    color: '#22c55e'
  }, {
    icon: 'people',
    label: t('profile.myGroups'),
    value: String(DEFAULT_MY_GROUPS.length),
    color: '#a855f7'
  }, {
    icon: 'people-circle',
    label: t('profile.myTeams'),
    value: String(myTeamsCount),
    color: '#f59e0b'
  }, {
    icon: 'calendar',
    label: t('profile.myActivities'),
    value: String(myActivitiesCount),
    color: '#ef4444'
  }, {
    icon: 'eye',
    label: t('profile.viewPublicProfile'),
    value: '',
    color: '#8b5cf6'
  }, {
    icon: 'shield-checkmark',
    label: t('profile.verification'),
    value: '',
    color: '#3b82f6'
  }], [draftsTotalCount, myActivitiesCount, myTeamsCount, t]);
  const superLikeQuickActions = React.useMemo(() => [{
    key: 'purchase',
    icon: 'sparkles',
    iconColor: '#f59e0b',
    iconBackground: '#fff7ed',
    borderColor: '#fed7aa',
    title: t('screens.settings.wallet.purchaseSuperLike'),
    description: t('profile.superLikePurchaseDescription'),
    screen: 'SuperLikePurchase'
  }, {
    key: 'history',
    icon: 'time-outline',
    iconColor: '#475569',
    iconBackground: '#f8fafc',
    borderColor: '#e2e8f0',
    title: t('screens.settings.wallet.superLikeHistory'),
    description: t('profile.superLikeHistoryDescription'),
    screen: 'SuperLikeHistory'
  }], [t]);
  const myQuestions = React.useMemo(() => [{
    id: 1,
    title: 'How to learn Python in three months?',
    type: 'reward',
    reward: 50,
    views: '1.2k',
    comments: 56,
    likes: 128,
    shares: 34,
    collects: 89,
    dislikes: 5,
    time: t('profile.time.hoursAgo').replace('{hours}', '2')
  }, {
    id: 2,
    title: '第一次养猫需要准备什么？',
    type: 'free',
    solved: true,
    views: '2.5k',
    comments: 89,
    likes: 256,
    shares: 67,
    collects: 145,
    dislikes: 8,
    time: t('profile.time.yesterday')
  }, {
    id: 3,
    title: 'How should a 35-year-old programmer plan career growth?',
    type: 'reward',
    reward: 100,
    views: '5.6k',
    comments: 456,
    likes: 1200,
    shares: 234,
    collects: 567,
    dislikes: 23,
    time: t('profile.time.daysAgo').replace('{days}', '3')
  }], [t]);
  const myAnswers = React.useMemo(() => [{
    id: 1,
    questionTitle: '如何高效学习一门新技能？',
    content: '作为一个自学了多门技能的人，我来分享一下我的经验...',
    likes: 256,
    comments: 23,
    shares: 45,
    collects: 78,
    dislikes: 3,
    adopted: true,
    time: t('profile.time.hoursAgo').replace('{hours}', '1')
  }, {
    id: 2,
    questionTitle: 'Python数据分析入门需要学什么？',
    content: '首先需要掌握Python基础语法，然后学习NumPy和Pandas...',
    likes: 189,
    comments: 15,
    shares: 28,
    collects: 56,
    dislikes: 2,
    adopted: false,
    time: t('profile.time.hoursAgo').replace('{hours}', '3')
  }, {
    id: 3,
    questionTitle: 'Is it too late to switch into programming at 35?',
    content: '完全来得及！我就是35岁转行的，现在已经工作3年了...',
    likes: 512,
    comments: 45,
    shares: 89,
    collects: 167,
    dislikes: 7,
    adopted: true,
    time: t('profile.time.yesterday')
  }, {
    id: 4,
    questionTitle: '如何克服拖延症？',
    content: '拖延症的根本原因是对任务的恐惧，可以尝试番茄工作法...',
    likes: 98,
    comments: 8,
    adopted: false,
    time: t('profile.time.daysAgo').replace('{days}', '2')
  }], [t]);
  const contentTabs = React.useMemo(() => [t('profile.contentTabs.questions'), t('profile.contentTabs.answers'), t('profile.contentTabs.likes'), t('profile.contentTabs.favorites'), t('profile.contentTabs.history')], [t]);

  // 收藏数据
  const favoritesData = React.useMemo(() => ({
    questions: [{
      id: 1,
      title: '如何高效学习一门新技能？',
      author: '学习达人',
      time: '2天前'
    }, {
      id: 2,
      title: 'Python数据分析入门指南',
      author: 'Data Analyst',
      time: '3天前'
    }],
    answers: [{
      id: 1,
      title: '关于职场新人如何快速成长的回答',
      author: '职场导师',
      time: '1周前'
    }, {
      id: 2,
      title: '关于如何克服拖延症的回答',
      author: 'Counselor',
      time: '2周前'
    }],
    comments: [{
      id: 1,
      title: '"这个方法真的很有用！"',
      author: '小明',
      time: '3天前'
    }, {
      id: 2,
      title: '"感谢分享，学到了很多"',
      author: '小红',
      time: '5天前'
    }]
  }), []);

  // 点赞数据（包含普通点赞和超级赞）
  const likesData = React.useMemo(() => ([
    {
      id: 1,
      type: 'question',
      title: '如何高效学习一门新技能？',
      author: '学习达人',
      time: '2 hours ago',
      isSuperLike: true,
      likes: 256
    },
    {
      id: 2,
      type: 'answer',
      questionTitle: 'Python数据分析入门需要学什么？',
      content: '首先需要掌握Python基础语法，然后学习NumPy和Pandas...',
      author: 'Data Analyst',
      time: '5 hours ago',
      isSuperLike: false,
      likes: 189
    },
    {
      id: 3,
      type: 'supplement',
      questionTitle: 'Is it too late to switch into programming at 35?',
      content: '补充一下，我当时转行时还参加了培训...',
      author: '职场导师',
      time: '1天前',
      isSuperLike: true,
      likes: 128
    },
    {
      id: 4,
      type: 'comment',
      content: '这个方法真的很有用！感谢分享',
      author: '小明',
      time: '2天前',
      isSuperLike: false,
      likes: 45
    },
    {
      id: 5,
      type: 'supplementAnswer',
      questionTitle: '如何克服拖延症？',
      content: '补充回答：除了番茄工作法，还可以尝试时间块管理...',
      author: 'Counselor',
      time: '3天前',
      isSuperLike: true,
      likes: 234
    }
  ]), []);

  // 获取草稿列表
  const loadDraftsList = async (isLoadMore = false) => {
    if (draftsLoading) return;
    try {
      setDraftsLoading(true);
      const pageNum = isLoadMore ? draftsPageNum + 1 : 1;
      const response = await questionApi.getDraftsList({
        pageNum,
        pageSize: 10
      });
      if (response.code === 200 || response.code === 0) {
        const {
          rows,
          total
        } = extractDraftRowsAndTotal(response);
        setDraftsTotalCount(total);
        if (isLoadMore) {
          setDraftsList(prev => [...prev, ...rows]);
          setDraftsPageNum(pageNum);
        } else {
          setDraftsList(rows);
          setDraftsPageNum(1);
        }

        // 检查是否还有更多数据
        const currentTotal = isLoadMore ? draftsList.length + rows.length : rows.length;
        setDraftsHasMore(currentTotal < total);
      }
    } catch (error) {
      console.error('获取草稿列表失败:', error);
    } finally {
      setDraftsLoading(false);
    }
  };
  const loadDraftsCount = React.useCallback(async () => {
    try {
      const response = await questionApi.getDraftsList({
        pageNum: 1,
        pageSize: 1
      });
      if (response.code === 200 || response.code === 0) {
        const { total } = extractDraftRowsAndTotal(response);
        setDraftsTotalCount(total);
      }
    } catch (error) {
      console.error('鑾峰彇鑽夌鏁伴噺澶辫触:', error);
    }
  }, []);
  const [activeTab, setActiveTab] = useState('');

  // 退出登录确认弹窗状态
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [draftsModalAlert, setDraftsModalAlert] = useState(null);

  // Initialize activeTab with translated value
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('profile.contentTabs.questions'));
    }
  }, [t, activeTab]);

  // 草稿数据状态
  const [draftsList, setDraftsList] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsPageNum, setDraftsPageNum] = useState(1);
  const [draftsHasMore, setDraftsHasMore] = useState(true);
  const [answersList, setAnswersList] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersPageNum, setAnswersPageNum] = useState(1);
  const [answersHasMore, setAnswersHasMore] = useState(true);
  const [answersLoaded, setAnswersLoaded] = useState(false);
  const [answersError, setAnswersError] = useState('');
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPageNum, setHistoryPageNum] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [favoritesTab, setFavoritesTab] = useState('questions');
  const [likesTab, setLikesTab] = useState('questions');
  const previewAnswersList = React.useMemo(() => answersList.slice(0, 3), [answersList]);
  const previewHistoryList = React.useMemo(() => historyList.slice(0, 3), [historyList]);

  const loadMyAnswersList = React.useCallback(async (isLoadMore = false) => {
    if (answersLoading || (isLoadMore && !answersHasMore)) return;

    try {
      setAnswersLoading(true);
      setAnswersError('');
      const pageNum = isLoadMore ? answersPageNum + 1 : 1;
      const {
        rows: normalizedRows = [],
        total = 0
      } = await loadOwnProfileAnswersPage({
        pageNum,
        pageSize: ANSWERS_PAGE_SIZE
      });

      if (isLoadMore) {
        const nextList = [...answersList, ...normalizedRows];
        setAnswersList(nextList);
        setAnswersPageNum(pageNum);
        setAnswersHasMore(nextList.length < total);
      } else {
        setAnswersList(normalizedRows);
        setAnswersPageNum(1);
        setAnswersHasMore(normalizedRows.length < total);
      }

      setAnswersLoaded(true);
      return;
    } catch (error) {
      console.error('获取我的回答列表失败:', error);
      setAnswersError(error?.message || '获取我的回答失败');
      setAnswersLoaded(true);
    } finally {
      setAnswersLoading(false);
    }
  }, [answersHasMore, answersList, answersLoading, answersPageNum]);

  const loadBrowseHistoryList = React.useCallback(async (isLoadMore = false) => {
    if (historyLoading || (isLoadMore && !historyHasMore)) return;

    try {
      setHistoryLoading(true);
      const pageNum = isLoadMore ? historyPageNum + 1 : 1;
      const response = await questionApi.getBrowseHistoryList({
        pageNum,
        pageSize: HISTORY_PAGE_SIZE
      });

      if (response.code === 200 || response.code === 0) {
        const {
          rows = [],
          total = 0
        } = extractBrowseHistoryRows(response);
        const normalizedRows = rows.map(normalizeBrowseHistoryItem);

        if (isLoadMore) {
          const nextList = [...historyList, ...normalizedRows];
          setHistoryList(nextList);
          setHistoryPageNum(pageNum);
          setHistoryHasMore(nextList.length < total);
        } else {
          setHistoryList(normalizedRows);
          setHistoryPageNum(1);
          setHistoryHasMore(normalizedRows.length < total);
        }

        setHistoryLoaded(true);
      }
    } catch (error) {
      console.error('获取浏览历史列表失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyHasMore, historyList, historyLoading, historyPageNum]);

  React.useEffect(() => {
    if (activeTab === t('profile.contentTabs.answers') && !answersLoaded && !answersLoading) {
      loadMyAnswersList();
    }
  }, [activeTab, answersLoaded, answersLoading, loadMyAnswersList, t]);

  React.useEffect(() => {
    if (activeTab === t('profile.contentTabs.history') && !historyLoaded && !historyLoading) {
      loadBrowseHistoryList();
    }
  }, [activeTab, historyLoaded, historyLoading, loadBrowseHistoryList, t]);

  React.useEffect(() => {
    loadDraftsCount();
  }, [loadDraftsCount]);

  React.useEffect(() => {
    if (showHistoryModal && !historyLoaded && !historyLoading) {
      loadBrowseHistoryList();
    }
  }, [historyLoaded, historyLoading, loadBrowseHistoryList, showHistoryModal]);

  useFocusEffect(React.useCallback(() => {
    loadDraftsCount();
  }, [loadDraftsCount]));

  // 认证状态 'none' | 'personal' | 'enterprise' | 'government'
  const [verificationType, setVerificationType] = useState('none'); // 示例：未认证（显示“去认证”按钮）

  // 认证弹窗状态
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0); // 0: 选择类型, 1: 填写信息, 2: 确认信息
  const [selectedVerificationType, setSelectedVerificationType] = useState(''); // 'personal' | 'enterprise' | 'government'
  const [verificationImagePickerState, setVerificationImagePickerState] = useState({
    visible: false,
    field: null,
  });
  const [verificationData, setVerificationData] = useState({
    personal: {
      name: '',
      idType: 'idCard',
      idNumber: '',
      idFront: null,
      idBack: null,
      idHold: null,
      qualifications: [] // 专业资质证书列表
    },
    enterprise: {
      name: '',
      creditCode: '',
      registrationNumber: '',
      taxNumber: '',
      address: '',
      license: null,
      legalName: '',
      legalIdNumber: '',
      contactPerson: '',
      // 企业联系人（必填）
      contactPhone: '',
      // 联系电话
      contactEmail: '' // 联系邮箱
    },
    government: {
      name: '',
      creditCode: '',
      type: '',
      department: '',
      address: '',
      certificate: null,
      authorization: null,
      authorizerName: '',
      authorizerPosition: '',
      authorizerIdNumber: '',
      authorizerIdFront: null,
      // 授权人身份证正面
      authorizerIdBack: null,
      // 授权人身份证反面
      contactPhone: '',
      // 联系电话
      contactEmail: '' // 联系邮箱
    }
  });
  const updateVerificationData = updater => {
    setVerificationData(previous => updater(previous));
  };
  const updateSelectedVerificationAsset = (field, asset) => {
    updateVerificationData(previous => ({
      ...previous,
      [selectedVerificationType]: {
        ...previous[selectedVerificationType],
        [field]: asset,
      },
    }));
  };
  const updateVerificationAssetByType = (verificationKind, field, asset) => {
    updateVerificationData(previous => ({
      ...previous,
      [verificationKind]: {
        ...previous[verificationKind],
        [field]: asset,
      },
    }));
  };
  const openVerificationImagePicker = field => {
    setVerificationImagePickerState({
      visible: true,
      field,
    });
  };
  const closeVerificationImagePicker = () => {
    setVerificationImagePickerState(previous => ({
      ...previous,
      visible: false,
    }));
  };
  const getVerificationAssetPreviewUri = asset => asset?.uri || asset?.remoteUrl || '';
  const extractVerificationUploadUrl = response => {
    const payload = extractVerificationUploadPayload(response);

    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      return payload.url || payload.fileUrl || payload.link || payload.path || payload.data || '';
    }

    return '';
  };
  const normalizeVerificationImageAsset = asset => {
    if (!asset?.uri) {
      return null;
    }

    const mimeType = inferVerificationImageMimeType(asset);
    const preferredExtension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : mimeType.includes('heic') ? 'heic' : mimeType.includes('heif') ? 'heif' : 'jpg';
    const fallbackName = ensureFileNameHasExtension(asset.fileName || asset.name, preferredExtension);

    return {
      uri: asset.uri,
      name: fallbackName,
      mimeType,
      type: mimeType,
      size: asset.fileSize ?? asset.file?.size ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      source: asset.source || '',
    };
  };
  const normalizeVerificationDocumentAsset = asset => {
    if (!asset?.uri) {
      return null;
    }

    const assetName = asset.name || `verification_${Date.now()}`;
    const mimeType = asset.mimeType || asset.type || (assetName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    return {
      uri: asset.uri,
      name: assetName,
      mimeType,
      type: mimeType,
      size: asset.size ?? asset.file?.size ?? null,
    };
  };
  const createPendingVerificationAsset = file => createVerificationAssetRecord({
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType || file.type,
    size: file.size,
    uploading: true,
    error: '',
  });
  const isVerificationUploadBlocked = React.useMemo(() => {
    const directAssets = [
      verificationData.personal.idFront,
      verificationData.personal.idBack,
      verificationData.enterprise.license,
      verificationData.government.authorizerIdFront,
      verificationData.government.authorizerIdBack,
      verificationData.government.certificate,
    ];

    const qualificationAssets = verificationData.personal.qualifications.map(item => item.asset);
    return [...directAssets, ...qualificationAssets].some(asset => asset?.uploading);
  }, [verificationData]);
  const hasVerificationUploadErrors = React.useMemo(() => {
    const directAssets = [
      verificationData.personal.idFront,
      verificationData.personal.idBack,
      verificationData.enterprise.license,
      verificationData.government.authorizerIdFront,
      verificationData.government.authorizerIdBack,
      verificationData.government.certificate,
    ];

    const qualificationAssets = verificationData.personal.qualifications.map(item => item.asset);
    return [...directAssets, ...qualificationAssets].some(asset => !!asset?.error);
  }, [verificationData]);

  // 获取认证图标和文字信息
  const getVerificationInfo = () => {
    switch (verificationType) {
      case 'personal':
        return {
          color: '#f59e0b',
          icon: 'checkmark',
          text: t('profile.personalVerification'),
          verified: true
        };
      // 黄色 V - 个人认证
      case 'enterprise':
        return {
          color: '#3b82f6',
          icon: 'checkmark',
          text: t('profile.enterpriseVerification'),
          verified: true
        };
      // 蓝色 V - 企业认证
      case 'government':
        return {
          color: '#ef4444',
          icon: 'checkmark',
          text: t('profile.governmentVerification'),
          verified: true
        };
      // 红色 V - 政府认证
      case 'none':
      default:
        return {
          color: '#9ca3af',
          icon: 'close',
          text: t('profile.notVerified'),
          verified: false
        };
      // 未认证 - 灰色 X
    }
  };
  const verificationInfo = getVerificationInfo();

  // 处理认证标识点击
  const handleVerificationPress = () => {
    if (!verificationInfo.verified) {
      // 未认证，打开认证弹窗
      setShowVerificationModal(true);
      setVerificationStep(0);
    } else {
      // 已认证，显示认证详情
      showAppAlert(t('profile.verificationInfo'), `${t('profile.verified')}${verificationInfo.text}\n${t('profile.verificationTime')}2025-12-15\n${t('profile.verificationOrg')}`);
    }
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: t('profile.shareProfile') + t('profile.shareUrl'),
        title: t('profile.share')
      });
    } catch (error) {
      showAppAlert(t('profile.shareFailed'), error.message);
    }
  };
  const handleStatPress = stat => {
    switch (stat.label) {
      case t('profile.followers'):
        navigation.navigate('Fans', {
          isOwnList: true,
          userId: String(userProfile.userId || ''),
        });
        break;
      case t('profile.following'):
        navigation.navigate('Follow');
        break;
      case t('profile.likes'):
        showAppAlert(t('profile.likesStats').replace('{count}', formatNumber(userProfile.likeCount)));
        break;
      case t('profile.friends'):
        showAppAlert(
          t('profile.myFriends'),
          t('profile.youHaveFriends').replace('{count}', formatNumber(userProfile.friendCount))
        );
        break;
      default:
        break;
    }
  };
  const handleMenuPress = item => {
    const rootNavigation = navigation.getParent ? navigation.getParent() || navigation : navigation;

    if (item.label === t('profile.myActivities')) {
      rootNavigation.navigate('MyActivities');
      return;
    }

    switch (item.label) {
      case t('profile.browsingHistory'):
        setShowHistoryModal(true);
        loadBrowseHistoryList();
        break;
      case t('profile.myDrafts'):
        setShowDraftsModal(true);
        loadDraftsList(); // 加载草稿数据
        break;
      case t('profile.myGroups'):
        rootNavigation.navigate('MyGroups');
        break;
      case t('profile.myTeams'):
        rootNavigation.navigate('MyTeams');
        break;
      case t('profile.myActivities'):
        // 使用jumpTo跳转到活动Tab
        navigation.navigate('活动', {
          fromProfile: true
        });
        break;
      case t('profile.viewPublicProfile'):
        // 导航到公开主页（使用当前用户 ID）
        navigation.navigate('PublicProfile', {
          userId: String(userProfile.userId || '')
        });
        break;
      case t('profile.verification'):
        // 打开认证弹窗
        setShowVerificationModal(true);
        setVerificationStep(0);
        break;
      default:
        break;
    }
  };
  const handleQuestionPress = question => {
    navigation.navigate('QuestionDetail', {
      id: question.id
    });
  };
  const handleCopyOfficialFundingUrl = React.useCallback(async () => {
    const result = await copyTextSafely(officialFundingUrl);

    if (result === 'copied') {
      showToast(t('profile.fundingNoticeCopySuccess'), 'success');
      return;
    }

    if (result === 'shared') {
      showToast(t('profile.fundingNoticeCopyFallback'), 'info');
      return;
    }

    showToast(t('profile.fundingNoticeCopyFailed'), 'warning');
  }, [officialFundingUrl, t]);
  const handleWalletAction = React.useCallback(action => {
    switch (action) {
      case 'expense':
        showAppAlert(t('profile.pointsExpense'), `${t('profile.pointsExpense')}: ${formattedWalletExpense}`);
        break;
      case 'income':
        showAppAlert(t('profile.pointsIncome'), `${t('profile.pointsIncome')}: ${formattedWalletIncome}`);
        break;
      case 'withdrawable':
        showAppAlert(
          t('profile.withdrawableBalance'),
          `${t('profile.withdrawableBalance')}: ${formattedWithdrawableBalance}\n\n${t('profile.lockedBalance')}: ${formatWalletAmount(walletData.lockedBalance)}\n${t('profile.frozenBalance')}: ${formatWalletAmount(walletData.frozenBalance)}`
        );
        break;
      default:
        break;
    }
  }, [formatWalletAmount, formattedWalletExpense, formattedWalletIncome, formattedWithdrawableBalance, t, walletData.frozenBalance, walletData.lockedBalance]);
  const handleFavoritePress = item => {
    setShowFavoritesModal(false);
    navigation.navigate('QuestionDetail', {
      id: item.id
    });
  };
  const handleHistoryPress = item => {
    setShowHistoryModal(false);
    const questionId = item?.targetId ?? item?.id;
    if (!questionId) {
      return;
    }
    navigation.navigate('QuestionDetail', {
      id: questionId
    });
  };
  const handleDraftPress = async item => {
    try {
      console.log('----------------------------------------');
      console.log('📝 点击草稿，ID:', item.id);
      console.log('----------------------------------------');

      // 显示加载提示
      setDraftsModalAlert(null);
      setShowDraftsModal(false);

      // 调用接口获取草稿完整数据
      const response = await questionApi.getDraftDetail(item.id);
      console.log('----------------------------------------');
      console.log('📋 草稿详情接口响应');
      console.log('----------------------------------------');
      console.log('完整响应:', JSON.stringify(response, null, 2));
      console.log('----------------------------------------');
      if (response && response.code === 200 && response.data) {
        const draftData = response.data;
        console.log('----------------------------------------');
        console.log('📦 草稿数据详情');
        console.log('----------------------------------------');
        console.log('ID:', draftData.id);
        console.log('标题:', draftData.title);
        console.log('描述:', draftData.description);
        console.log('类型:', draftData.type);
        console.log('分类ID:', draftData.categoryId);
        console.log('分类名称:', draftData.categoryName);
        console.log('图片URLs:', draftData.imageUrls);
        console.log('图片URLs类型:', typeof draftData.imageUrls);
        console.log('图片URLs是否为数组', Array.isArray(draftData.imageUrls));
        console.log('图片URLs长度:', draftData.imageUrls?.length);
        if (Array.isArray(draftData.imageUrls)) {
          draftData.imageUrls.forEach((url, index) => {
            console.log(`  图片${index + 1}: "${url}" (类型: ${typeof url}, 长度: ${url?.length})`);
          });
        }
        console.log('话题:', draftData.topics);
        console.log('专家:', draftData.experts);
        console.log('----------------------------------------');

        // 跳转到发布页面，传递完整的草稿数据
        navigation.navigate('Publish', {
          draftData
        });
      } else {
        console.error('获取草稿失败:', response);
        showAppAlert(t('profile.draftLoadFailedTitle'), response?.msg || t('profile.draftLoadFailedMessage'));
      }
    } catch (error) {
      console.error('获取草稿详情失败:', error);
      showAppAlert(t('profile.draftLoadFailedTitle'), t('profile.draftLoadFailedNetwork'));
    }
  };
  const closeDraftsModal = React.useCallback(() => {
    setDraftsModalAlert(null);
    setShowDraftsModal(false);
  }, []);
  const showDraftsModalAlert = React.useCallback((title, message = '', buttons = [], options = {}) => {
    const normalizedButtons = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{
      text: t('common.ok')
    }];
    setDraftsModalAlert({
      title,
      message: typeof message === 'string' ? message : '',
      buttons: normalizedButtons,
      options: options || {}
    });
  }, [t]);
  const handleDraftsModalAlertClose = React.useCallback(() => {
    setDraftsModalAlert(null);
  }, []);
  const handleDraftsModalAlertButtonPress = React.useCallback(button => {
    setDraftsModalAlert(null);
    if (typeof button?.onPress === 'function') {
      requestAnimationFrame(() => {
        try {
          button.onPress();
        } catch (error) {
          console.error('Drafts modal alert button onPress error:', error);
        }
      });
    }
  }, []);
  const handleDeleteDraft = item => {
    showDraftsModalAlert(t('profile.deleteDraft'), t('profile.deleteDraftConfirm'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.delete'),
      style: 'destructive',
      onPress: () => showDraftsModalAlert(t('profile.draftDeleted'), t('profile.draftDeleted'))
    }]);
  };
  const handleLogout = () => {
    setShowLogoutModal(true);
  };
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 调用退出登录 API
      const response = await authApi.logout();
      if (response.code === 200) {
        console.log('Logout succeeded');
        // 调用父组件的 onLogout 回调
        if (onLogout) {
          onLogout();
        }
      } else {
        console.error('退出登录失败:', response.msg);
        showAppAlert('Logout failed', response.msg || 'Logout failed, please try again');
      }
    } catch (error) {
      console.error('退出登录异常:', error);
      showAppAlert('Logout failed', 'Network error, please check connection and try again');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };
  const getFavoritesData = () => {
    switch (favoritesTab) {
      case 'questions':
        return favoritesData.questions;
      case 'answers':
        return favoritesData.answers;
      case 'comments':
        return favoritesData.comments;
      default:
        return [];
    }
  };

  const getLikesData = () => {
    switch (likesTab) {
      case 'questions':
        return likesData.filter(item => item.type === 'question' || item.type === 'supplement');
      case 'answers':
        return likesData.filter(item => item.type === 'answer' || item.type === 'supplementAnswer');
      case 'comments':
        return likesData.filter(item => item.type === 'comment');
      default:
        return [];
    }
  };

  // 认证弹窗处理函数
  const handleSelectVerificationType = type => {
    setSelectedVerificationType(type);
    setVerificationStep(1);
  };
  const handleVerificationBack = () => {
    if (verificationStep === 0) {
      setShowVerificationModal(false);
    } else {
      setVerificationStep(verificationStep - 1);
    }
  };
  const showVerificationFileUploadPendingNotice = () => {
    showAppAlert(t('common.confirm'), t('profile.verificationModal.fileUploadPendingNotice'));
  };
  const handleVerificationSubmit = () => {
    // 验证数据
    const data = verificationData[selectedVerificationType];
    if (isVerificationUploadBlocked) {
      showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.uploadingInProgress'));
      return;
    }
    if (hasVerificationUploadErrors) {
      showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.uploadFailedRetry'));
      return;
    }
    if (selectedVerificationType === 'personal') {
      if (!data.idNumber) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.idNumberRequired'));
        return;
      }
      if (!isUploadedVerificationAsset(data.idFront) || !isUploadedVerificationAsset(data.idBack)) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.idPhotosRequired'));
        return;
      }
      // 专业资质认证改为可选，不再验证
      // 如果用户上传了资质，检查是否所有资质都填写了名称
      if (data.qualifications && data.qualifications.length > 0) {
        const invalidQualification = data.qualifications.find(q => !isUploadedVerificationAsset(q.asset));
        if (invalidQualification) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.qualificationUploadIncomplete'));
          return;
        }
        const unnamedQualification = data.qualifications.find(q => !q.name || q.name.trim() === '');
        if (unnamedQualification) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.qualificationNameRequired'));
          return;
        }
      }
    } else if (selectedVerificationType === 'enterprise') {
      if (!data.name || !data.taxNumber || !data.address) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.enterpriseInfoRequired'));
        return;
      }
      if (!VERIFICATION_FILE_UPLOAD_ENABLED) {
        showVerificationFileUploadPendingNotice();
        return;
      }
      if (!isUploadedVerificationAsset(data.license)) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.licenseRequired'));
        return;
      }
      if (!data.contactPerson || data.contactPerson.trim() === '') {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactPersonRequired'));
        return;
      }
      // 验证联系方式：邮箱或电话至少填写一项
      if ((!data.contactPhone || data.contactPhone.trim() === '') && (!data.contactEmail || data.contactEmail.trim() === '')) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactMethodRequired'));
        return;
      }
      // 验证电话格式（如果填写了）
      if (data.contactPhone && data.contactPhone.trim() !== '') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.contactPhone.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.phoneFormatError'));
          return;
        }
      }
      // 验证邮箱格式（如果填写了）
      if (data.contactEmail && data.contactEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.emailFormatError'));
          return;
        }
      }
    } else if (selectedVerificationType === 'government') {
      if (!data.name || !data.department || !data.authorizerName || !data.authorizerPosition) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.governmentInfoRequired'));
        return;
      }
      if (!isUploadedVerificationAsset(data.authorizerIdFront) || !isUploadedVerificationAsset(data.authorizerIdBack)) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.authorizerIdRequired'));
        return;
      }
      if (!VERIFICATION_FILE_UPLOAD_ENABLED) {
        showVerificationFileUploadPendingNotice();
        return;
      }
      if (!isUploadedVerificationAsset(data.certificate)) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.certificateRequired'));
        return;
      }
      // 验证联系方式：邮箱或电话至少填写一项
      if ((!data.contactPhone || data.contactPhone.trim() === '') && (!data.contactEmail || data.contactEmail.trim() === '')) {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.contactMethodRequired'));
        return;
      }
      // 验证电话格式（如果填写了）
      if (data.contactPhone && data.contactPhone.trim() !== '') {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(data.contactPhone.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.phoneFormatError'));
          return;
        }
      }
      // 验证邮箱格式（如果填写了）
      if (data.contactEmail && data.contactEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail.trim())) {
          showAppAlert(t('common.confirm'), t('profile.verificationModal.validationErrors.emailFormatError'));
          return;
        }
      }
    }

    // 当前仓库未提供认证申请提交接口，这里先保证上传链路真实可用。
    showAppAlert(t('profile.verificationModal.submitReadyTitle'), t('profile.verificationModal.submitReadyMessage'), [{
      text: t('common.ok'),
      onPress: () => {
        setShowVerificationModal(false);
        setVerificationStep(0);
        setSelectedVerificationType('');
      }
    }]);
  };
  const uploadVerificationAsset = async ({ file, onPending, onSuccess, onFailure }) => {
    const pendingAsset = createPendingVerificationAsset(file);
    onPending(pendingAsset);
    let preparedFile = file;

    try {
      let preparedLocalSize = Number(file?.size) || 0;
      if (isVerificationAssetImage({ mimeType: file.mimeType, type: file.type })) {
        const originalMimeType = String(file.mimeType || file.type || '').toLowerCase();
        const shouldNormalizeIosCameraImage =
          Platform.OS === 'ios' && file.source === 'camera';
        const shouldConvertToJpeg =
          shouldNormalizeIosCameraImage ||
          originalMimeType.includes('heic') ||
          originalMimeType.includes('heif') ||
          originalMimeType === 'image';

        if (shouldConvertToJpeg) {
          const ImageManipulator = getImageManipulatorModule();
          const manipulateAsync = ImageManipulator?.manipulateAsync;
          const SaveFormat = ImageManipulator?.SaveFormat;

          if (typeof manipulateAsync === 'function' && SaveFormat?.JPEG) {
            try {
              const resizeActions = [];
              const originalWidth = Number(file.width) || 0;
              if (originalWidth > 1600) {
                resizeActions.push({
                  resize: {
                    width: 1600,
                  },
                });
              }

              const manipulatedResult = await manipulateAsync(
                file.uri,
                resizeActions,
                {
                  compress: shouldNormalizeIosCameraImage ? 0.68 : 0.8,
                  format: SaveFormat.JPEG,
                }
              );

              let normalizedResult = manipulatedResult;
              const normalizedSize = await getVerificationLocalFileSize(manipulatedResult?.uri || file.uri);

              if (shouldNormalizeIosCameraImage && normalizedSize > 4.5 * 1024 * 1024) {
                const secondaryActions = originalWidth > 1280 ? [{
                  resize: {
                    width: 1280,
                  },
                }] : [];
                normalizedResult = await manipulateAsync(
                  manipulatedResult?.uri || file.uri,
                  secondaryActions,
                  {
                    compress: 0.52,
                    format: SaveFormat.JPEG,
                  }
                );
              }

              preparedLocalSize = await getVerificationLocalFileSize(
                normalizedResult?.uri || manipulatedResult?.uri || file.uri
              );

              preparedFile = {
                ...file,
                uri: normalizedResult?.uri || manipulatedResult?.uri || file.uri,
                mimeType: 'image/jpeg',
                type: 'image/jpeg',
                name: ensureFileNameHasExtension(
                  String(file.name || '').replace(/\.(heic|heif|png|webp)$/i, ''),
                  'jpg'
                ),
                width: normalizedResult?.width || manipulatedResult?.width || file.width,
                height: normalizedResult?.height || manipulatedResult?.height || file.height,
                size: preparedLocalSize || file.size || null,
              };
            } catch (manipulateError) {
              console.warn('Failed to normalize camera image format before upload:', manipulateError);
              preparedFile = {
                ...file,
                mimeType: 'image/jpeg',
                type: 'image/jpeg',
                name: ensureFileNameHasExtension(
                  String(file.name || '').replace(/\.(heic|heif|png|webp)$/i, ''),
                  'jpg'
                ),
              };
            }
          } else {
            preparedFile = {
              ...file,
              mimeType: 'image/jpeg',
              type: 'image/jpeg',
              name: ensureFileNameHasExtension(
                String(file.name || '').replace(/\.(heic|heif|png|webp)$/i, ''),
                'jpg'
              ),
            };
          }
        }
      }

      const uploadMethod = isVerificationAssetImage({ mimeType: preparedFile.mimeType, type: preparedFile.type }) ? uploadApi.uploadImage : uploadApi.uploadFile;
      const result = await uploadMethod({
        uri: preparedFile.uri,
        name: preparedFile.name,
        type: preparedFile.mimeType || preparedFile.type,
      });
      const responseMessage = getVerificationResponseMessage(result);

      if (!isVerificationUploadSuccess(result)) {
        throw new Error(responseMessage || t('profile.verificationModal.uploadFailed'));
      }

      const remoteUrl = extractVerificationUploadUrl(result);

      if (!remoteUrl) {
        const payload = extractVerificationUploadPayload(result);
        let payloadHint = '';

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          payloadHint = Object.keys(payload).slice(0, 6).join(', ');
        } else if (payload !== undefined && payload !== null && payload !== '') {
          payloadHint = String(payload);
        }

        const invalidMessage = payloadHint
          ? `${t('profile.verificationModal.invalidUploadResponse')} (${payloadHint})`
          : t('profile.verificationModal.invalidUploadResponse');
        throw new Error(responseMessage || invalidMessage);
      }

      onSuccess(createVerificationAssetRecord({
        uri: preparedFile.uri || pendingAsset.uri,
        remoteUrl,
        name: preparedFile.name || pendingAsset.name,
        mimeType: preparedFile.mimeType || preparedFile.type || pendingAsset.mimeType,
        size: preparedFile.size ?? pendingAsset.size,
        uploading: false,
        error: '',
      }));
    } catch (error) {
      const failedAsset = createVerificationAssetRecord({
        ...pendingAsset,
        uploading: false,
        error: error?.message || t('profile.verificationModal.uploadFailed'),
      });
      onFailure(failedAsset);
      showToast(failedAsset.error, 'error');
    }
  };
  const pickVerificationImage = async source => {
    if (source === 'album') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        showAppAlert(t('common.confirm'), t('profile.verificationModal.albumPermissionRequired'));
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) {
        return null;
      }

      return normalizeVerificationImageAsset({
        ...result.assets[0],
        source: 'album',
      });
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      showAppAlert(t('common.confirm'), t('profile.verificationModal.cameraPermissionRequired'));
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) {
      return null;
    }

    return normalizeVerificationImageAsset({
      ...result.assets[0],
      source: 'camera',
    });
  };
  const pickVerificationDocument = async () => {
    const DocumentPicker = getDocumentPickerModule();

    if (!DocumentPicker?.getDocumentAsync) {
      showAppAlert(
        t('common.confirm'),
        t('profile.verificationModal.documentPickerUnavailable')
      );
      return null;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: VERIFICATION_FILE_TYPES,
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    return normalizeVerificationDocumentAsset(result.assets[0]);
  };
  const handleVerificationImagePicked = async (imageUri, details = {}) => {
    const targetField = verificationImagePickerState.field;
    const normalizedFile = normalizeVerificationImageAsset({
      ...(details?.asset || {}),
      uri: imageUri,
      source: details?.source || '',
    });

    if (!targetField || !normalizedFile) {
      setVerificationImagePickerState({
        visible: false,
        field: null,
      });
      return;
    }

    await uploadVerificationAsset({
      file: normalizedFile,
      onPending: asset => updateSelectedVerificationAsset(targetField, asset),
      onSuccess: asset => updateSelectedVerificationAsset(targetField, asset),
      onFailure: asset => updateSelectedVerificationAsset(targetField, asset),
    });

    setVerificationImagePickerState({
      visible: false,
      field: null,
    });
  };
  const runVerificationPickerAction = callback => {
    setTimeout(() => {
      callback?.();
    }, 260);
  };
  const handleImageUpload = field => {
    if (Platform.OS === 'android') {
      openVerificationImagePicker(field);
      return;
    }

    const startUpload = source => {
      runVerificationPickerAction(async () => {
        const file = await pickVerificationImage(source);
        if (!file) {
          return;
        }

        await uploadVerificationAsset({
          file,
          onPending: asset => updateSelectedVerificationAsset(field, asset),
          onSuccess: asset => updateSelectedVerificationAsset(field, asset),
          onFailure: asset => updateSelectedVerificationAsset(field, asset),
        });
      });
    };

    if (Platform.OS === 'ios') {
      Alert.alert(t('profile.verificationModal.selectImage'), t('profile.verificationModal.selectImageSource'), [{
        text: t('profile.verificationModal.camera'),
        onPress: () => startUpload('camera')
      }, {
        text: t('profile.verificationModal.album'),
        onPress: () => startUpload('album')
      }, {
        text: t('common.cancel'),
        style: 'cancel'
      }]);
      return;
    }

    showAppAlert(t('profile.verificationModal.selectImage'), t('profile.verificationModal.selectImageSource'), [{
      text: t('profile.verificationModal.album'),
      onPress: () => startUpload('album')
    }, {
      text: t('profile.verificationModal.camera'),
      onPress: () => startUpload('camera')
    }, {
      text: t('common.cancel'),
      style: 'cancel'
    }]);
  };
  const handleFileUpload = field => {
    if (!VERIFICATION_FILE_UPLOAD_ENABLED) {
      showVerificationFileUploadPendingNotice();
      return;
    }

    const startImageUpload = source => {
      runVerificationPickerAction(async () => {
        const file = await pickVerificationImage(source);
        if (!file) {
          return;
        }

        await uploadVerificationAsset({
          file,
          onPending: asset => updateSelectedVerificationAsset(field, asset),
          onSuccess: asset => updateSelectedVerificationAsset(field, asset),
          onFailure: asset => updateSelectedVerificationAsset(field, asset),
        });
      });
    };
    const startDocumentUpload = () => {
      runVerificationPickerAction(async () => {
        const file = await pickVerificationDocument();
        if (!file) {
          return;
        }

        await uploadVerificationAsset({
          file,
          onPending: asset => updateSelectedVerificationAsset(field, asset),
          onSuccess: asset => updateSelectedVerificationAsset(field, asset),
          onFailure: asset => updateSelectedVerificationAsset(field, asset),
        });
      });
    };

    if (Platform.OS === 'ios') {
      Alert.alert(t('profile.verificationModal.selectFile'), t('profile.verificationModal.selectFileSource'), [{
        text: t('profile.verificationModal.camera'),
        onPress: () => startImageUpload('camera')
      }, {
        text: t('profile.verificationModal.album'),
        onPress: () => startImageUpload('album')
      }, {
        text: t('profile.verificationModal.chooseFile'),
        onPress: () => startDocumentUpload()
      }, {
        text: t('common.cancel'),
        style: 'cancel'
      }]);
      return;
    }

    showAppAlert(t('profile.verificationModal.selectFile'), t('profile.verificationModal.selectFileSource'), [{
      text: t('profile.verificationModal.album'),
      onPress: () => startImageUpload('album')
    }, {
      text: t('profile.verificationModal.camera'),
      onPress: () => startImageUpload('camera')
    }, {
      text: t('profile.verificationModal.chooseFile'),
      onPress: () => startDocumentUpload()
    }, {
      text: t('common.cancel'),
      style: 'cancel'
    }]);
  };

  // 添加资质证书
  const addQualification = async () => {
    if (!VERIFICATION_FILE_UPLOAD_ENABLED) {
      showVerificationFileUploadPendingNotice();
      return;
    }

    const appendQualificationAndUpload = file => {
      const qualificationId = Date.now();
      const emptyQualification = {
        id: qualificationId,
        name: '',
        asset: null,
      };

      updateVerificationData(previous => ({
        ...previous,
        personal: {
          ...previous.personal,
          qualifications: [...previous.personal.qualifications, emptyQualification],
        },
      }));

      return uploadVerificationAsset({
        file,
        onPending: asset => updateVerificationData(previous => ({
          ...previous,
          personal: {
            ...previous.personal,
            qualifications: previous.personal.qualifications.map(item => item.id === qualificationId ? {
              ...item,
              asset,
            } : item),
          },
        })),
        onSuccess: asset => updateVerificationData(previous => ({
          ...previous,
          personal: {
            ...previous.personal,
            qualifications: previous.personal.qualifications.map(item => item.id === qualificationId ? {
              ...item,
              asset,
            } : item),
          },
        })),
        onFailure: asset => updateVerificationData(previous => ({
          ...previous,
          personal: {
            ...previous.personal,
            qualifications: previous.personal.qualifications.map(item => item.id === qualificationId ? {
              ...item,
              asset,
            } : item),
          },
        })),
      });
    };
    const startQualificationImageUpload = source => {
      runVerificationPickerAction(async () => {
        const file = await pickVerificationImage(source);
        if (!file) {
          return;
        }
        await appendQualificationAndUpload(file);
      });
    };
    const startQualificationDocumentUpload = () => {
      runVerificationPickerAction(async () => {
        const file = await pickVerificationDocument();
        if (!file) {
          return;
        }
        await appendQualificationAndUpload(file);
      });
    };

    if (Platform.OS === 'ios') {
      Alert.alert(t('profile.verificationModal.selectFile'), t('profile.verificationModal.selectFileSource'), [{
        text: t('profile.verificationModal.camera'),
        onPress: () => startQualificationImageUpload('camera')
      }, {
        text: t('profile.verificationModal.album'),
        onPress: () => startQualificationImageUpload('album')
      }, {
        text: t('profile.verificationModal.chooseFile'),
        onPress: () => startQualificationDocumentUpload()
      }, {
        text: t('common.cancel'),
        style: 'cancel'
      }]);
      return;
    }

    showAppAlert(t('profile.verificationModal.selectFile'), t('profile.verificationModal.selectFileSource'), [{
      text: t('profile.verificationModal.album'),
      onPress: () => startQualificationImageUpload('album')
    }, {
      text: t('profile.verificationModal.camera'),
      onPress: () => startQualificationImageUpload('camera')
    }, {
      text: t('profile.verificationModal.chooseFile'),
      onPress: () => startQualificationDocumentUpload()
    }, {
      text: t('common.cancel'),
      style: 'cancel'
    }]);
  };

  // 删除资质证书
  const removeQualification = id => {
    showAppAlert(t('profile.verificationModal.deleteQualification'), t('profile.verificationModal.deleteQualificationConfirm'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.delete'),
      style: 'destructive',
      onPress: () => {
        updateVerificationData(previous => ({
          ...previous,
          personal: {
            ...previous.personal,
            qualifications: previous.personal.qualifications.filter(q => q.id !== id)
          }
        }));
      }
    }]);
  };

  // 更新资质证书名称
  const updateQualificationName = (id, name) => {
    updateVerificationData(previous => ({
      ...previous,
      personal: {
        ...previous.personal,
        qualifications: previous.personal.qualifications.map(q => q.id === id ? {
          ...q,
          name
        } : q)
      }
    }));
  };
  const updateVerificationField = (field, value) => {
    updateVerificationData(previous => ({
      ...previous,
      [selectedVerificationType]: {
        ...previous[selectedVerificationType],
        [field]: value
      }
    }));
  };
  const renderVerificationUploadStatus = asset => {
    if (!asset) {
      return null;
    }

    if (asset.uploading) {
      return <View style={styles.verificationAssetStatusRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.verificationAssetStatusText}>{t('profile.verificationModal.uploading')}</Text>
        </View>;
    }

    if (asset.error) {
      return <View style={styles.verificationAssetStatusRow}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={[styles.verificationAssetStatusText, styles.verificationAssetStatusError]}>{asset.error}</Text>
        </View>;
    }

    if (asset.remoteUrl) {
      return <View style={styles.verificationAssetStatusRow}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={[styles.verificationAssetStatusText, styles.verificationAssetStatusSuccess]}>{t('profile.verificationModal.uploadSuccess')}</Text>
        </View>;
    }

    return null;
  };
  const renderVerificationUploadBox = ({ asset, onPress, large = false, mode = 'image', disabled = false }) => {
    const boxStyle = large ? styles.uploadBoxLarge : styles.uploadBox;
    const hasAsset = !!asset;
    const placeholderIconColor = disabled ? '#cbd5e1' : '#d1d5db';

    return <TouchableOpacity style={[boxStyle, disabled ? styles.uploadBoxDisabled : null, asset?.error ? styles.uploadBoxError : null]} onPress={onPress} disabled={asset?.uploading || disabled} activeOpacity={disabled ? 1 : 0.88}>
        {hasAsset ? <View style={styles.verificationAssetContent}>
            {isVerificationAssetImage(asset) ? <>
                <Image source={{
              uri: getVerificationAssetPreviewUri(asset)
            }} style={styles.uploadedImage} />
                {asset.uploading ? <View style={styles.verificationAssetOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.verificationAssetOverlayText}>{t('profile.verificationModal.uploading')}</Text>
                  </View> : null}
                {asset.error ? <View style={[styles.verificationAssetOverlay, styles.verificationAssetOverlayError]}>
                    <Ionicons name="alert-circle" size={18} color="#fff" />
                    <Text style={styles.verificationAssetOverlayText}>{t('common.retry')}</Text>
                  </View> : null}
              </> : <View style={[styles.verificationFileCard, disabled ? styles.verificationFileCardDisabled : null]}>
                <Ionicons name="document-text-outline" size={36} color={asset.error ? '#ef4444' : disabled ? '#94a3b8' : '#2563eb'} />
                <Text style={[styles.verificationFileName, disabled ? styles.verificationFileNameDisabled : null]} numberOfLines={2}>{getVerificationAssetName(asset) || t('profile.verificationModal.selectedFile')}</Text>
                <Text style={[styles.verificationFileMeta, disabled ? styles.verificationFileMetaDisabled : null]}>{asset.mimeType || t('profile.verificationModal.file')}</Text>
                {renderVerificationUploadStatus(asset)}
              </View>}
          </View> : <View style={[styles.uploadPlaceholder, disabled ? styles.uploadPlaceholderDisabled : null]}>
            <Ionicons name={mode === 'file' ? 'document-attach-outline' : 'camera-outline'} size={40} color={placeholderIconColor} />
            <Text style={[styles.uploadPlaceholderText, disabled ? styles.uploadPlaceholderTextDisabled : null]}>{t(mode === 'file' ? 'profile.verificationModal.clickUploadFile' : 'profile.verificationModal.clickUpload')}</Text>
          </View>}
      </TouchableOpacity>;
  };
  const renderVerificationUploadActions = ({ asset, onReplace, onRemove, disabled = false }) => {
    if (!asset || disabled) {
      return null;
    }

    return <View style={styles.verificationAssetActions}>
        <TouchableOpacity style={styles.verificationAssetActionBtn} onPress={onReplace} disabled={asset.uploading}>
          <Ionicons name={asset.error ? 'refresh-outline' : 'cloud-upload-outline'} size={16} color="#2563eb" />
          <Text style={styles.verificationAssetActionText}>{asset.error ? t('common.retry') : t('profile.verificationModal.replaceUpload')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.verificationAssetActionBtn} onPress={onRemove} disabled={asset.uploading}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={[styles.verificationAssetActionText, styles.verificationAssetDeleteText]}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>;
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 顶部背景 */}
        <View style={styles.headerBg}>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }} activeOpacity={0.7}>
              <Ionicons name="arrow-redo-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={{
            marginLeft: 16
          }} onPress={() => (navigation.getParent ? navigation.getParent() || navigation : navigation).navigate('Settings')} hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 用户信息卡片 */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar uri={userProfile.avatar} name={userProfile.nickname} size={64} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{userProfile.nickname}</Text>
                
                {/* 认证标识 */}
                {verificationInfo.verified ?
              // 已认证：显示图标 + 认证类型
              <TouchableOpacity style={styles.verificationContainer} onPress={handleVerificationPress} activeOpacity={0.7}>
                    <View style={[styles.verificationIcon, {
                  backgroundColor: verificationInfo.color
                }]}>
                      <Ionicons name={verificationInfo.icon} size={12} color="#fff" />
                    </View>
                    <Text style={[styles.verificationText, {
                  color: verificationInfo.color
                }]}>
                      {verificationInfo.text}
                    </Text>
                  </TouchableOpacity> :
              // 未认证：显示"去认证"按钮
              <TouchableOpacity style={styles.verifyButton} onPress={handleVerificationPress} activeOpacity={0.7}>
                    <Text style={styles.verifyButtonText}>{t('profile.goVerify')}</Text>
                  </TouchableOpacity>}
              </View>
              <Text style={styles.userId}>ID: {userProfile.userId}</Text>
            </View>
          </View>
          {userProfile.bio ? <Text style={styles.userBio}>{userProfile.bio}</Text> : null}
          <View style={styles.userMeta}>
            {userProfile.location ? <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>{getLocationDisplay(userProfile.location)}</Text>
              </View> : null}
            {userProfile.occupation ? <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={14} color="#9ca3af" />
                <Text style={styles.metaText}>{userProfile.occupation}</Text>
              </View> : null}
          </View>
          
          {/* 影响力和智慧指数 */}
          {/* <View style={styles.indexRow}>
            <View style={styles.indexItem}>
              <View style={styles.indexIconWrapper}>
                <Ionicons name="flame" size={18} color="#ef4444" />
              </View>
              <View style={styles.indexInfo}>
                <Text style={styles.indexLabel}>{t('profile.influence')}</Text>
                <Text style={styles.indexValue}>8,567</Text>
              </View>
            </View>
            <View style={styles.indexDivider} />
            <TouchableOpacity style={styles.indexItem} onPress={() => navigation.navigate('WisdomIndex')}>
              <View style={styles.indexIconWrapper}>
                <Ionicons name="bulb" size={18} color="#f59e0b" />
              </View>
              <View style={styles.indexInfo}>
                <Text style={styles.indexLabel}>{t('profile.wisdomIndex')}</Text>
                <Text style={styles.indexValue}>92.5</Text>
              </View>
            </TouchableOpacity>
          </View> */}
          
          <View style={styles.statsRow}>
            {stats.map((stat, idx) => <TouchableOpacity key={idx} style={styles.statItem} onPress={() => handleStatPress(stat)}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 钱包卡片 */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIcon}><Ionicons name="wallet" size={20} color="#f59e0b" /></View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>{t('profile.myWallet')}</Text>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => navigation.navigate('WalletDetail', { 
                  balance: walletData.balance, 
                  currency: walletData.currency 
                })}
              >
                <Text style={styles.walletBalance}>{formattedWalletBalance}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.walletNoticeEntryButton} onPress={() => setShowWalletNoticeModal(true)}>
              <Ionicons name="information-circle-outline" size={15} color="#6b7280" />
              <Text style={styles.walletNoticeEntryButtonText}>{t('profile.fundingNoticeEntry')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.walletStats}>
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('income')}>
              <Text style={[styles.walletStatValue, {
              color: '#22c55e'
            }]}>{formattedWalletIncome}</Text>
              <Text style={styles.walletStatLabel}>{t('profile.pointsIncome')}</Text>
            </TouchableOpacity>
            <View style={styles.walletStatDivider} />
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('expense')}>
              <Text style={styles.walletStatValue}>{formattedWalletExpense}</Text>
              <Text style={styles.walletStatLabel}>{t('profile.pointsExpense')}</Text>
            </TouchableOpacity>
            <View style={styles.walletStatDivider} />
            <TouchableOpacity style={styles.walletStatItem} onPress={() => handleWalletAction('withdrawable')}>
              <Text style={styles.walletStatValue}>{formattedWithdrawableBalance}</Text>
              <Text style={styles.walletStatLabel}>{t('profile.withdrawableBalance')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 超级赞余额卡片 - 已隐藏 */}
        {/* <View style={styles.superLikeCard}>
          <View style={styles.superLikeHeader}>
            <View style={styles.superLikeTitle}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={styles.superLikeTitleText}>{t('profile.superLike')}</Text>
            </View>
            <SuperLikeBalance size="medium" showLabel={false} onPress={() => navigation.navigate('SuperLikePurchase')} />
          </View>
          <View style={styles.superLikeActions}>
            <TouchableOpacity style={styles.superLikeBtn} onPress={() => navigation.navigate('SuperLikePurchase')}>
              <Ionicons name="add-circle" size={18} color="#f59e0b" />
              <Text style={styles.superLikeBtnText}>{t('profile.purchase')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.superLikeBtn, styles.superLikeBtnSecondary]} onPress={() => navigation.navigate('SuperLikeHistory')}>
              <Ionicons name="time-outline" size={18} color="#6b7280" />
              <Text style={[styles.superLikeBtnText, styles.superLikeBtnTextSecondary]}>{t('profile.history')}</Text>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* 超级赞入口 */}
        <View style={styles.superLikeHubCard}>
          <View style={styles.superLikeHubHeader}>
            <View style={styles.superLikeHubTitleWrap}>
              <View style={styles.superLikeHubIconBadge}>
                <Ionicons name="sparkles" size={16} color="#b45309" />
              </View>
              <View style={styles.superLikeHubTitleBlock}>
                <Text style={styles.superLikeHubEyebrow}>{t('profile.superLike')}</Text>
                <Text style={styles.superLikeHubTitle}>{t('profile.superLikeHubTitle')}</Text>
              </View>
            </View>
            <SuperLikeBalance
              size="medium"
              showLabel={false}
              onPress={() => navigation.navigate('SuperLikePurchase')}
              style={styles.superLikeHubBalance}
            />
          </View>
          <Text style={styles.superLikeHubSubtitle}>{t('profile.superLikeHubSubtitle')}</Text>
          <View style={styles.superLikeHubTags}>
            <View style={styles.superLikeHubTag}>
              <Ionicons name="trending-up-outline" size={14} color="#b45309" />
              <Text style={styles.superLikeHubTagText}>{t('profile.superLikeTagBoost')}</Text>
            </View>
            <View style={styles.superLikeHubTag}>
              <Ionicons name="flash-outline" size={14} color="#b45309" />
              <Text style={styles.superLikeHubTagText}>{t('profile.superLikeTagExposure')}</Text>
            </View>
          </View>
          <View style={styles.superLikeActionList}>
            {superLikeQuickActions.map(action => <TouchableOpacity key={action.key} style={[styles.superLikeActionItem, {
            borderColor: action.borderColor
          }]} onPress={() => navigation.navigate(action.screen)} activeOpacity={0.86}>
                <View style={[styles.superLikeActionIconWrap, {
              backgroundColor: action.iconBackground
            }]}>
                  <Ionicons name={action.icon} size={18} color={action.iconColor} />
                </View>
                <View style={styles.superLikeActionContent}>
                  <Text style={styles.superLikeActionTitle}>{action.title}</Text>
                  <Text style={styles.superLikeActionDescription}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 功能菜单 */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => <TouchableOpacity key={idx} style={styles.menuItem} onPress={() => handleMenuPress(item)}>
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {Boolean(item.value) ? <Text style={styles.menuValue}>{item.value}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </View>
            </TouchableOpacity>)}
        </View>

        {/* 服务器切换 */}
        <ServerSwitcher />

        {/* 我的内容 */}
        <View style={styles.contentSection}>
          <View style={styles.contentTabs}>
            {contentTabs.map(tab => <TouchableOpacity key={tab} style={styles.contentTabItem} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.contentTabText, activeTab === tab && styles.contentTabTextActive]}>{tab}</Text>
                {activeTab === tab && <View style={styles.contentTabIndicator} />}
              </TouchableOpacity>)}
          </View>
          
          {/* 提问列表 */}
          <View style={{
          display: activeTab === t('profile.contentTabs.questions') ? 'flex' : 'none'
        }}>
            {myQuestions.map(q => <TouchableOpacity key={q.id} style={styles.questionItem} onPress={() => handleQuestionPress(q)}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionTime}>{formatTime(q.time)}</Text>
                </View>
                <Text style={styles.questionTitle}>
                  {q.type === 'reward' && <Text style={styles.rewardTagInline}>
                      <Text style={styles.rewardTagInlineText}>{formatRewardPointsValue(q.reward, { locale: i18n?.locale })}</Text>
                    </Text>}
                  {q.solved && <Text style={styles.solvedTagInline}>
                      <Text style={styles.solvedTagInlineText}>{t('profile.solved')}</Text>
                    </Text>}
                  {' '}{q.title}
                </Text>
                <View style={styles.questionStats}>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(q.likes)}</Text>
                  </View>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(q.comments)}</Text>
                  </View>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.shareFeatureTitle'), t('profile.shareFeatureMessage'));
                  }}>
                    <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(q.shares)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.bookmarkFeatureTitle'), t('profile.bookmarkFeatureMessage'));
                  }}>
                    <Ionicons name="star-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(q.collects)}</Text>
                  </TouchableOpacity>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="eye-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{q.views}</Text>
                  </View>
                  <View style={{flex: 1}} />
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.dislikeFeatureTitle'), t('profile.dislikeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-down-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(q.dislikes)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Report', {
                      type: 'question',
                      targetType: 1,
                      targetId: q.id
                    });
                  }}>
                    <Ionicons name="flag-outline" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>)}
          </View>

          {/* 回答列表 */}
          <View style={{
          display: activeTab === t('profile.contentTabs.answers') ? 'flex' : 'none'
        }}>
            {answersLoading && answersList.length === 0 ? <View style={styles.emptyContainer}>
                <ActivityIndicator size="small" color="#ef4444" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View> : answersError && answersList.length === 0 ? <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{answersError}</Text>
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => loadMyAnswersList(false)}>
                  <Text style={styles.viewAllText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View> : answersList.length === 0 ? <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('common.noData')}</Text>
              </View> : previewAnswersList.map(a => <TouchableOpacity key={a.id} style={styles.answerItem} onPress={() => navigation.navigate('AnswerDetail', {
            answerId: a.id,
            answer: a,
            defaultTab: 'supplements'
          })}>
                <View style={styles.answerHeader}>
                  <Text style={styles.answerTime}>{formatTime(a.time)}</Text>
                </View>
                <Text style={styles.answerQuestion} numberOfLines={1}>
                  {a.adopted && <Text style={styles.adoptedTagInline}>
                      <Text style={styles.adoptedTagInlineText}>{t('profile.adopted')}</Text>
                    </Text>}
                  {' '}{a.questionTitle}
                </Text>
                <Text style={styles.answerContent} numberOfLines={2}>{a.content}</Text>
                <View style={styles.answerStats}>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(a.likes)}</Text>
                  </View>
                  <View style={styles.questionStatItem}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(a.comments)}</Text>
                  </View>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.shareFeatureTitle'), t('profile.shareFeatureMessage'));
                  }}>
                    <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(a.shares)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.bookmarkFeatureTitle'), t('profile.bookmarkFeatureMessage'));
                  }}>
                    <Ionicons name="star-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(a.collects)}</Text>
                  </TouchableOpacity>
                  <View style={{flex: 1}} />
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.dislikeFeatureTitle'), t('profile.dislikeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-down-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>{formatNumber(a.dislikes)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Report', {
                      type: 'answer',
                      targetType: 2,
                      targetId: a.id
                    });
                  }}>
                    <Ionicons name="flag-outline" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>)}
          </View>

          {/* 点赞列表 */}
          <View style={{
          display: activeTab === t('profile.contentTabs.likes') ? 'flex' : 'none'
        }}>
            {/* 点赞分类标签 */}
            <View style={styles.favoriteTabsInline}>
              <TouchableOpacity style={[styles.favoriteTabInline, likesTab === 'questions' && styles.favoriteTabInlineActive]} onPress={() => setLikesTab('questions')}>
                <Text style={[styles.favoriteTabInlineText, likesTab === 'questions' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.questions')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.favoriteTabInline, likesTab === 'answers' && styles.favoriteTabInlineActive]} onPress={() => setLikesTab('answers')}>
                <Text style={[styles.favoriteTabInlineText, likesTab === 'answers' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.answers')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.favoriteTabInline, likesTab === 'comments' && styles.favoriteTabInlineActive]} onPress={() => setLikesTab('comments')}>
                <Text style={[styles.favoriteTabInlineText, likesTab === 'comments' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.comments')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* 点赞内容列表 */}
            {getLikesData().map(item => <TouchableOpacity key={item.id} style={styles.likeItem} onPress={() => {
              if (item.type === 'question' || item.type === 'supplement') {
                navigation.navigate('QuestionDetail', { questionId: item.id });
              } else if (item.type === 'answer' || item.type === 'supplementAnswer') {
                navigation.navigate('AnswerDetail', { answerId: item.id });
              } else if (item.type === 'comment') {
                showAppAlert(t('profile.commentDetailTitle'), t('profile.commentDetailMessage'));
              }
            }}>
                <View style={styles.likeItemHeader}>
                  {item.isSuperLike && <Ionicons name="star" size={14} color="#f59e0b" style={{marginRight: 6}} />}
                  <Text style={styles.likeItemTime}>{formatTime(item.time)}</Text>
                </View>
                {(item.type === 'question' || item.type === 'supplement') && <>
                    <Text style={styles.likeItemTitle}>{item.title}</Text>
                    <View style={styles.likeItemMeta}>
                      <Text style={styles.likeItemAuthor}>{item.author}</Text>
                    </View>
                  </>}
                {(item.type === 'answer' || item.type === 'supplementAnswer') && <>
                    <Text style={styles.likeItemQuestion} numberOfLines={1}>{item.questionTitle}</Text>
                    <Text style={styles.likeItemContent} numberOfLines={2}>{item.content}</Text>
                    <View style={styles.likeItemMeta}>
                      <Text style={styles.likeItemAuthor}>{item.author}</Text>
                    </View>
                  </>}
                {item.type === 'comment' && <>
                    <Text style={styles.likeItemContent} numberOfLines={2}>{item.content}</Text>
                    <View style={styles.likeItemMeta}>
                      <Text style={styles.likeItemAuthor}>{item.author}</Text>
                    </View>
                  </>}
                <View style={styles.answerStats}>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.likeFeatureTitle'), t('profile.likeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-up" size={12} color="#ef4444" />
                    <Text style={[styles.questionStatText, {color: '#ef4444'}]}>{formatNumber(item.likes)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.replyFeatureTitle'), t('profile.replyFeatureMessage'));
                  }}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.shareFeatureTitle'), t('profile.shareFeatureMessage'));
                  }}>
                    <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.bookmarkFeatureTitle'), t('profile.bookmarkFeatureMessage'));
                  }}>
                    <Ionicons name="star-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <View style={{flex: 1}} />
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.dislikeFeatureTitle'), t('profile.dislikeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-down-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Report', {
                      type: likesTab === 'questions' ? 'question' : likesTab === 'answers' ? 'answer' : 'comment',
                      targetType: likesTab === 'questions' ? 1 : likesTab === 'answers' ? 2 : 5,
                      targetId: item.id
                    });
                  }}>
                    <Ionicons name="flag-outline" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>)}
          </View>

          {/* 收藏列表 */}
          <View style={{
          display: activeTab === t('profile.contentTabs.favorites') ? 'flex' : 'none'
        }}>
            {/* 收藏分类标签 */}
            <View style={styles.favoriteTabsInline}>
              <TouchableOpacity style={[styles.favoriteTabInline, favoritesTab === 'questions' && styles.favoriteTabInlineActive]} onPress={() => setFavoritesTab('questions')}>
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'questions' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.questions')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.favoriteTabInline, favoritesTab === 'answers' && styles.favoriteTabInlineActive]} onPress={() => setFavoritesTab('answers')}>
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'answers' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.answers')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.favoriteTabInline, favoritesTab === 'comments' && styles.favoriteTabInlineActive]} onPress={() => setFavoritesTab('comments')}>
                <Text style={[styles.favoriteTabInlineText, favoritesTab === 'comments' && styles.favoriteTabInlineTextActive]}>
                  {t('profile.favoriteCategories.comments')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* 收藏内容列表 */}
            {getFavoritesData().map(item => <TouchableOpacity key={item.id} style={styles.favoriteItem} onPress={() => handleFavoritePress(item)}>
                <View style={styles.favoriteItemHeader}>
                  <Text style={styles.favoriteItemTime}>{formatTime(item.time)}</Text>
                </View>
                <Text style={styles.favoriteItemTitle}>{item.title}</Text>
                <View style={styles.favoriteItemMeta}>
                  <Text style={styles.favoriteItemAuthor}>{item.author}</Text>
                </View>
                <View style={styles.answerStats}>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.likeFeatureTitle'), t('profile.likeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.replyFeatureTitle'), t('profile.replyFeatureMessage'));
                  }}>
                    <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.shareFeatureTitle'), t('profile.shareFeatureMessage'));
                  }}>
                    <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.removeBookmarkFeatureTitle'), t('profile.removeBookmarkFeatureMessage'));
                  }}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={[styles.questionStatText, {color: '#f59e0b'}]}>1</Text>
                  </TouchableOpacity>
                  <View style={{flex: 1}} />
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    showAppAlert(t('profile.dislikeFeatureTitle'), t('profile.dislikeFeatureMessage'));
                  }}>
                    <Ionicons name="thumbs-down-outline" size={12} color="#9ca3af" />
                    <Text style={styles.questionStatText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.questionStatItem} onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Report', {
                      type: favoritesTab === 'questions' ? 'question' : favoritesTab === 'answers' ? 'answer' : 'comment',
                      targetType: favoritesTab === 'questions' ? 1 : favoritesTab === 'answers' ? 2 : 5,
                      targetId: item.id
                    });
                  }}>
                    <Ionicons name="flag-outline" size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>)}
          </View>

          {/* 浏览历史列表 */}
          <View style={{
          display: activeTab === t('profile.contentTabs.history') ? 'flex' : 'none'
        }}>
            {previewHistoryList.map(item => <TouchableOpacity key={item.id} style={styles.historyItem} onPress={() => handleHistoryPress(item)}>
                <View style={styles.historyItemContent}>
                  <Text style={styles.historyItemTitle}>{item.title}</Text>
                  <View style={styles.historyItemMeta}>
                    <Text style={styles.historyItemAuthor}>{item.author}</Text>
                    <Text style={styles.historyItemTime}>{t('profile.viewedAt')} {item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>)}
          </View>
          
          {activeTab === t('profile.contentTabs.answers') ? answersList.length > 3 ? <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAnswersModal(true)}><Text style={styles.viewAllText}>{t('profile.viewAll')}</Text><Ionicons name="chevron-forward" size={16} color="#ef4444" /></TouchableOpacity> : null : activeTab === t('profile.contentTabs.history') ? historyList.length > 3 ? <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowHistoryModal(true)}><Text style={styles.viewAllText}>{t('profile.viewAll')}</Text><Ionicons name="chevron-forward" size={16} color="#ef4444" /></TouchableOpacity> : null : <TouchableOpacity style={styles.viewAllBtn} onPress={() => showAppAlert(t('profile.viewAll'), `${t('profile.viewAll')}${activeTab}`)}><Text style={styles.viewAllText}>{t('profile.viewAll')}</Text><Ionicons name="chevron-forward" size={16} color="#ef4444" /></TouchableOpacity>}
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>

        <View style={{
        height: 20
      }} />
      </ScrollView>

      {/* 我的收藏弹窗 */}
      <Modal visible={showAnswersModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowAnswersModal(false)}>
        <View style={styles.listModal}>
          <View style={[styles.listModalHeader, {
            paddingTop: profileModalTopSafeInset + 8
          }]}>
            <TouchableOpacity onPress={() => setShowAnswersModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.contentTabs.answers')}</Text>
            <View style={{
            width: 24
          }} />
          </View>
          <ScrollView style={styles.listModalContent} contentContainerStyle={[styles.listModalContentContainer, {
          paddingBottom: bottomSafeInset
        }]}>
            {answersLoading && answersList.length === 0 ? <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
              </View> : answersError && answersList.length === 0 ? <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{answersError}</Text>
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => loadMyAnswersList(false)}>
                  <Text style={styles.viewAllText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View> : answersList.length === 0 ? <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('common.noData')}</Text>
              </View> : <>
                {answersList.map(a => <TouchableOpacity key={a.id} style={styles.answerItem} onPress={() => {
              setShowAnswersModal(false);
              navigation.navigate('AnswerDetail', {
                answerId: a.id,
                answer: a,
                defaultTab: 'supplements'
              });
            }}>
                    <View style={styles.answerHeader}>
                      <Text style={styles.answerTime}>{formatTime(a.time)}</Text>
                    </View>
                    <Text style={styles.answerQuestion} numberOfLines={1}>
                      {a.adopted && <Text style={styles.adoptedTagInline}>
                          <Text style={styles.adoptedTagInlineText}>{t('profile.adopted')}</Text>
                        </Text>}
                      {' '}{a.questionTitle}
                    </Text>
                    <Text style={styles.answerContent} numberOfLines={2}>{a.content}</Text>
                    <View style={styles.answerStats}>
                      <View style={styles.questionStatItem}>
                        <Ionicons name="thumbs-up-outline" size={12} color="#9ca3af" />
                        <Text style={styles.questionStatText}>{formatNumber(a.likes)}</Text>
                      </View>
                      <View style={styles.questionStatItem}>
                        <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" />
                        <Text style={styles.questionStatText}>{formatNumber(a.comments)}</Text>
                      </View>
                      <TouchableOpacity style={styles.questionStatItem} onPress={e => {
                    e.stopPropagation();
                    showAppAlert(t('profile.shareFeatureTitle'), t('profile.shareFeatureMessage'));
                  }}>
                        <Ionicons name="arrow-redo-outline" size={12} color="#9ca3af" />
                        <Text style={styles.questionStatText}>{formatNumber(a.shares)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.questionStatItem} onPress={e => {
                    e.stopPropagation();
                    showAppAlert(t('profile.bookmarkFeatureTitle'), t('profile.bookmarkFeatureMessage'));
                  }}>
                        <Ionicons name="star-outline" size={12} color="#9ca3af" />
                        <Text style={styles.questionStatText}>{formatNumber(a.collects)}</Text>
                      </TouchableOpacity>
                      <View style={{flex: 1}} />
                      <TouchableOpacity style={styles.questionStatItem} onPress={e => {
                    e.stopPropagation();
                    showAppAlert(t('profile.dislikeFeatureTitle'), t('profile.dislikeFeatureMessage'));
                  }}>
                        <Ionicons name="thumbs-down-outline" size={12} color="#9ca3af" />
                        <Text style={styles.questionStatText}>{formatNumber(a.dislikes)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.questionStatItem} onPress={e => {
                    e.stopPropagation();
                    navigation.navigate('Report', {
                      type: 'answer',
                      targetType: 2,
                      targetId: a.id
                    });
                  }}>
                        <Ionicons name="flag-outline" size={12} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>)}
                {answersLoading || answersHasMore ? <TouchableOpacity style={styles.viewAllBtn} disabled={answersLoading || !answersHasMore} onPress={() => loadMyAnswersList(true)}>
                    <Text style={styles.viewAllText}>{answersLoading ? t('common.loading') : t('profile.viewAll')}</Text>
                    {answersHasMore && !answersLoading ? <Ionicons name="chevron-forward" size={16} color="#ef4444" /> : null}
                  </TouchableOpacity> : null}
              </>}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showWalletNoticeModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowWalletNoticeModal(false)}
      >
        <Pressable style={styles.walletNoticeModalOverlay} onPress={() => setShowWalletNoticeModal(false)}>
          <Pressable style={styles.walletNoticeModalCard} onPress={() => {}}>
            <View style={styles.walletNoticeModalHandle} />
            <View style={styles.walletNoticeModalHeader}>
              <Text style={styles.walletNoticeModalTitle}>{t('profile.fundingNoticeModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowWalletNoticeModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.walletNoticeModalContent}>
              <Text style={styles.walletNoticeModalLead}>{t('profile.fundingNoticeTitle')}</Text>
              <Text style={styles.walletNoticeModalText}>{t('profile.fundingNoticeDescription')}</Text>
              <Text style={styles.walletNoticeModalText}>{t('profile.fundingNoticeSync')}</Text>

              <View style={styles.walletNoticeModalUrlBox}>
                <Text style={styles.walletNoticeUrlLabel}>{t('profile.fundingNoticeOfficialChannel')}</Text>
                <Text selectable selectionColor="#ef4444" style={styles.walletNoticeModalUrlText}>
                  {officialFundingUrl}
                </Text>
              </View>

              <Text style={styles.walletNoticeTipsTitle}>{t('profile.fundingNoticeTipsTitle')}</Text>
              {walletFundingTips.map(tip => (
                <View key={`modal-${tip}`} style={styles.walletNoticeTipRow}>
                  <View style={styles.walletNoticeTipDot} />
                  <Text style={styles.walletNoticeTipText}>{tip}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.walletNoticeModalActions}>
              <TouchableOpacity style={styles.walletNoticeModalPrimaryButton} onPress={handleCopyOfficialFundingUrl}>
                <Ionicons name="copy-outline" size={16} color="#fff" />
                <Text style={styles.walletNoticeModalPrimaryButtonText}>{t('profile.fundingNoticeCopyAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.walletNoticeModalSecondaryButton} onPress={() => setShowWalletNoticeModal(false)}>
                <Text style={styles.walletNoticeModalSecondaryButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showFavoritesModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowFavoritesModal(false)}>
        <View style={styles.listModal}>
          <View style={[styles.listModalHeader, {
            paddingTop: profileModalTopSafeInset + 8
          }]}>
            <TouchableOpacity onPress={() => setShowFavoritesModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.myFavorites')}</Text>
            <View style={{
            width: 24
          }} />
          </View>
          {/* 收藏分类标签 */}
          <View style={styles.favoriteTabs}>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'questions' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('questions')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'questions' && styles.favoriteTabTextActive]}>{t('profile.favoriteQuestions')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'answers' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('answers')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'answers' && styles.favoriteTabTextActive]}>{t('profile.favoriteAnswers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.favoriteTab, favoritesTab === 'comments' && styles.favoriteTabActive]} onPress={() => setFavoritesTab('comments')}>
              <Text style={[styles.favoriteTabText, favoritesTab === 'comments' && styles.favoriteTabTextActive]}>{t('profile.favoriteComments')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listModalContent} contentContainerStyle={[styles.listModalContentContainer, {
          paddingBottom: bottomSafeInset
        }]}>
            {getFavoritesData().map(item => <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => handleFavoritePress(item)}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemAuthor}>{item.author}</Text>
                    <Text style={styles.listItemTime}>{item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>)}
          </ScrollView>
        </View>
      </Modal>

      {/* 浏览历史弹窗 */}
      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.listModal}>
          <View style={[styles.listModalHeader, {
            paddingTop: profileModalTopSafeInset + 8
          }]}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.browsingHistory')}</Text>
            <TouchableOpacity onPress={() => showAppAlert(t('profile.clearHistory'), t('profile.clearHistoryConfirm'), [{
            text: t('common.cancel'),
            style: 'cancel'
          }, {
            text: t('profile.clear'),
            style: 'destructive'
          }])}>
              <Text style={styles.clearText}>{t('profile.clear')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listModalContent} contentContainerStyle={[styles.listModalContentContainer, {
          paddingBottom: bottomSafeInset
        }]}>
            {historyList.map(item => <TouchableOpacity key={item.id} style={styles.listItem} onPress={() => handleHistoryPress(item)}>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <View style={styles.listItemMeta}>
                    <Text style={styles.listItemAuthor}>{item.author}</Text>
                    <Text style={styles.listItemTime}>{item.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
              </TouchableOpacity>)}
            {historyLoading || historyHasMore ? <TouchableOpacity style={styles.viewAllBtn} disabled={historyLoading || !historyHasMore} onPress={() => loadBrowseHistoryList(true)}>
                <Text style={styles.viewAllText}>{historyLoading ? t('common.loading') : t('profile.viewAll')}</Text>
                {historyHasMore && !historyLoading ? <Ionicons name="chevron-forward" size={16} color="#ef4444" /> : null}
              </TouchableOpacity> : null}
          </ScrollView>
        </View>
      </Modal>

      {/* 我的草稿弹窗 */}
      <Modal visible={showDraftsModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={closeDraftsModal}>
        <View style={styles.listModal}>
          <View style={[styles.listModalHeader, {
            paddingTop: profileModalTopSafeInset + 8
          }]}>
            <TouchableOpacity onPress={closeDraftsModal}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.listModalTitle}>{t('profile.myDrafts')}</Text>
            <View style={{
            width: 24
          }} />
          </View>
          <ScrollView style={styles.listModalContent} contentContainerStyle={[styles.listModalContentContainer, {
          paddingBottom: bottomSafeInset
        }]}>
            {draftsLoading && draftsList.length === 0 ? <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loadingText}>{t('profile.draftLoading')}</Text>
              </View> : draftsList.length === 0 ? <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>{t('profile.noDrafts')}</Text>
                <Text style={styles.emptyHint}>{t('profile.noDraftsHint')}</Text>
              </View> : draftsList.map(item => <View key={item.id} style={styles.draftItem}>
                  <TouchableOpacity style={styles.draftContent} onPress={() => handleDraftPress(item)}>
                    <View style={styles.draftTypeTag}>
                      <Text style={styles.draftTypeText}>
                        {item.type === 0 ? '公开问题' : item.type === 1 ? '悬赏问题' : '定向问题'}
                      </Text>
                    </View>
                    <View style={styles.draftInfo}>
                      <Text style={styles.draftTitle} numberOfLines={1}>
                        {item.title && item.title !== 'Untitled draft' ? item.title : item.description ? item.description.substring(0, 20) + '...' : 'Untitled'}
                      </Text>
                      <Text style={styles.draftTime}>
                        {item.createTime ? new Date(item.createTime).toLocaleString() : '未知时间'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.draftDeleteBtn} onPress={() => handleDeleteDraft(item)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>)}
          </ScrollView>
          {draftsModalAlert ? <View style={styles.inlineAlertOverlay}>
              {draftsModalAlert.options?.cancelable !== false ? <Pressable style={StyleSheet.absoluteFill} onPress={handleDraftsModalAlertClose} /> : null}
              <View style={styles.inlineAlertCard}>
                <Text style={styles.inlineAlertTitle}>{draftsModalAlert.title || t('common.confirm')}</Text>
                {draftsModalAlert.message ? <Text style={styles.inlineAlertMessage}>{draftsModalAlert.message}</Text> : null}
                <View style={[styles.inlineAlertButtons, draftsModalAlert.buttons.length > 2 && styles.inlineAlertButtonsVertical]}>
                  {draftsModalAlert.buttons.map((button, index) => {
                const isCancel = button?.style === 'cancel';
                const isDestructive = button?.style === 'destructive';
                return <TouchableOpacity key={`${button?.text || 'button'}-${index}`} style={[styles.inlineAlertButton, draftsModalAlert.buttons.length > 2 && styles.inlineAlertButtonVertical, isCancel && styles.inlineAlertButtonCancel, isDestructive && styles.inlineAlertButtonDestructive]} onPress={() => handleDraftsModalAlertButtonPress(button)} activeOpacity={0.85}>
                        <Text style={[styles.inlineAlertButtonText, isCancel && styles.inlineAlertButtonTextCancel, isDestructive && styles.inlineAlertButtonTextDestructive]}>
                          {button?.text || t('common.ok')}
                        </Text>
                      </TouchableOpacity>;
              })}
                </View>
              </View>
            </View> : null}
        </View>
      </Modal>

      {/* 认证弹窗 */}
      <Modal visible={showVerificationModal} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={handleVerificationBack}>
        <KeyboardAvoidingView
          style={styles.verificationKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.verificationModal}>
          {/* 头部 */}
          <View style={[styles.verificationHeader, {
            paddingTop: profileModalTopSafeInset + 8
          }]}>
            <TouchableOpacity onPress={handleVerificationBack}>
              <Ionicons name={verificationStep === 0 ? "close" : "arrow-back"} size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.verificationTitle}>
              {verificationStep === 0 ? t('profile.verificationModal.title') : verificationStep === 1 ? `${selectedVerificationType === 'personal' ? t('profile.personalVerification') : selectedVerificationType === 'enterprise' ? t('profile.enterpriseVerification') : t('profile.governmentVerification')}` : t('common.confirm')}
            </Text>
            <View style={{
            width: 24
          }} />
          </View>

          {/* 进度条 - 移除，不再需要 */}

          <ScrollView style={styles.verificationContent} contentContainerStyle={[styles.verificationContentContainer, {
          paddingBottom: bottomSafeInset + 28
        }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'} onScrollBeginDrag={Platform.OS === 'ios' ? Keyboard.dismiss : undefined}>
            {/* 步骤0: 选择认证类型 */}
            {verificationStep === 0 && <View style={styles.typeSelectionContainer}>
                <Text style={styles.typeSelectionTitle}>{t('profile.verificationModal.selectType')}</Text>
                
                <TouchableOpacity style={styles.typeCard} onPress={() => handleSelectVerificationType('personal')}>
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, {
                  backgroundColor: '#fef3c7'
                }]}>
                      <Ionicons name="person" size={24} color="#f59e0b" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.personal.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.personal.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.typeCard} onPress={() => handleSelectVerificationType('enterprise')}>
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, {
                  backgroundColor: '#dbeafe'
                }]}>
                      <Ionicons name="business" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.enterprise.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.enterprise.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.typeCard} onPress={() => handleSelectVerificationType('government')}>
                  <View style={styles.typeCardLeft}>
                    <View style={[styles.typeIcon, {
                  backgroundColor: '#fee2e2'
                }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#ef4444" />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={styles.typeTitle}>{t('profile.verificationModal.government.title')}</Text>
                      <Text style={styles.typeDesc}>{t('profile.verificationModal.government.desc')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </View>}

            {/* 步骤1: 填写信息 - 个人认证 */}
            {verificationStep === 1 && selectedVerificationType === 'personal' && <View style={styles.formContainer}>
                {/* 证件类型 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.idType')} <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity style={styles.fieldInput}>
                    <Text style={styles.fieldInputText}>{t('profile.verificationModal.idCard')}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {/* 证件号码 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.idNumber')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.idNumberPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.personal.idNumber} onChangeText={text => updateVerificationField('idNumber', text)} />
                </View>

                {/* 上传证件照片 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>{t('profile.verificationModal.uploadIdPhotos')}</Text>
                  
                  <View style={styles.uploadGrid}>
                    {/* 证件正面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>{t('profile.verificationModal.idFront')} <Text style={styles.required}>*</Text></Text>
                      {renderVerificationUploadBox({
                      asset: verificationData.personal.idFront,
                      onPress: () => handleImageUpload('idFront')
                    })}
                      {renderVerificationUploadActions({
                      asset: verificationData.personal.idFront,
                      onReplace: () => handleImageUpload('idFront'),
                      onRemove: () => updateVerificationAssetByType('personal', 'idFront', null)
                    })}
                    </View>

                    {/* 证件反面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>{t('profile.verificationModal.idBack')} <Text style={styles.required}>*</Text></Text>
                      {renderVerificationUploadBox({
                      asset: verificationData.personal.idBack,
                      onPress: () => handleImageUpload('idBack')
                    })}
                      {renderVerificationUploadActions({
                      asset: verificationData.personal.idBack,
                      onReplace: () => handleImageUpload('idBack'),
                      onRemove: () => updateVerificationAssetByType('personal', 'idBack', null)
                    })}
                    </View>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>{t('profile.verificationModal.uploadTip')}</Text>
                  </View>
                </View>

                {/* 专业资质认证（可选） */}
                <View style={styles.uploadSection}>
                  <View style={styles.qualificationHeader}>
                    <Text style={styles.uploadSectionTitle}>{t('profile.verificationModal.qualifications')}</Text>
                  </View>
                  <Text style={styles.qualificationDesc}>{t('profile.verificationModal.qualificationsDesc')}</Text>
                  
                  {/* 已上传的资质列表 */}
                  {verificationData.personal.qualifications.map(qual => <View key={qual.id} style={styles.qualificationItem}>
                      <View style={styles.qualificationContent}>
                        <View style={styles.qualificationPreview}>
                          {qual.asset && isVerificationAssetImage(qual.asset) ? <Image source={{
                        uri: getVerificationAssetPreviewUri(qual.asset)
                      }} style={styles.qualificationImage} /> : <View style={styles.qualificationFileFallback}>
                              <Ionicons name="document-text-outline" size={26} color={qual.asset?.error ? '#ef4444' : '#2563eb'} />
                            </View>}
                        </View>
                        <View style={styles.qualificationInfo}>
                          <TextInput style={styles.qualificationNameInput} placeholder={t('profile.verificationModal.qualificationName')} placeholderTextColor="#9ca3af" value={qual.name} onChangeText={text => updateQualificationName(qual.id, text)} />
                          {qual.asset ? <Text style={styles.qualificationMeta} numberOfLines={1}>{getVerificationAssetName(qual.asset)}</Text> : null}
                          {renderVerificationUploadStatus(qual.asset)}
                        </View>
                      </View>
                      <TouchableOpacity style={styles.qualificationDelete} onPress={() => removeQualification(qual.id)}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>)}

                  {/* 添加资质按钮 */}
                  <TouchableOpacity style={[styles.addQualificationBtn, !VERIFICATION_FILE_UPLOAD_ENABLED ? styles.addQualificationBtnDisabled : null]} onPress={addQualification} disabled={!VERIFICATION_FILE_UPLOAD_ENABLED}>
                    <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                    <Text style={[styles.addQualificationText, !VERIFICATION_FILE_UPLOAD_ENABLED ? styles.addQualificationTextDisabled : null]}>{t('profile.verificationModal.addQualification')}</Text>
                  </TouchableOpacity>

                  {!VERIFICATION_FILE_UPLOAD_ENABLED ? <Text style={styles.fileUploadPendingHint}>{t('profile.verificationModal.fileUploadPendingNotice')}</Text> : null}

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>{t('profile.verificationModal.qualificationTip')}</Text>
                  </View>
                </View>

              </View>}

            {/* 步骤1: 填写信息 - 企业认证 */}
            {verificationStep === 1 && selectedVerificationType === 'enterprise' && <View style={styles.formContainer}>
                {/* 企业名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.enterpriseName')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.enterpriseNamePlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.enterprise.name} onChangeText={text => updateVerificationField('name', text)} />
                </View>

                {/* 注册号 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.registrationNumber')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.registrationNumberPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.enterprise.registrationNumber} onChangeText={text => updateVerificationField('registrationNumber', text)} />
                </View>

                {/* 税号 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.taxNumber')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.taxNumberPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.enterprise.taxNumber} onChangeText={text => updateVerificationField('taxNumber', text)} />
                </View>

                {/* 企业地址 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.address')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.addressPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.enterprise.address} onChangeText={text => updateVerificationField('address', text)} />
                </View>

                {/* 企业联系人 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.contactPerson')}<Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.contactPersonPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.enterprise.contactPerson} onChangeText={text => updateVerificationField('contactPerson', text)} />
                </View>

                {/* 联系方式说明 */}
                <View style={styles.contactMethodSection}>
                  <Text style={styles.contactMethodTitle}>{t('profile.verificationModal.contactMethod')} <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.contactMethodDesc}>{t('profile.verificationModal.contactMethodDesc')}</Text>
                </View>

                {/* 联系电话 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.contactPhone')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.contactPhonePlaceholder')} placeholderTextColor="#9ca3af" keyboardType="phone-pad" maxLength={11} value={verificationData.enterprise.contactPhone} onChangeText={text => updateVerificationField('contactPhone', text)} />
                </View>

                {/* 联系邮箱 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.contactEmail')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.contactEmailPlaceholder')} placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" value={verificationData.enterprise.contactEmail} onChangeText={text => updateVerificationField('contactEmail', text)} />
                </View>

                {/* 上传注册文件 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>{t('profile.verificationModal.uploadLicense')}</Text>
                  
                  <View style={styles.uploadSingleWrapper}>
                    <Text style={styles.uploadLabel}>{t('profile.verificationModal.license')} <Text style={styles.required}>*</Text></Text>
                    {renderVerificationUploadBox({
                    asset: verificationData.enterprise.license,
                    onPress: () => handleFileUpload('license'),
                    large: true,
                    mode: 'file',
                    disabled: !VERIFICATION_FILE_UPLOAD_ENABLED
                  })}
                    {renderVerificationUploadActions({
                    asset: verificationData.enterprise.license,
                    onReplace: () => handleFileUpload('license'),
                    onRemove: () => updateVerificationAssetByType('enterprise', 'license', null),
                    disabled: !VERIFICATION_FILE_UPLOAD_ENABLED
                  })}
                    {!VERIFICATION_FILE_UPLOAD_ENABLED ? <Text style={styles.fileUploadPendingHint}>{t('profile.verificationModal.fileUploadPendingNotice')}</Text> : null}
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>{t('profile.verificationModal.licenseTip')}</Text>
                  </View>
                </View>
              </View>}

            {/* 步骤1: 填写信息 - 政府认证 */}
            {verificationStep === 1 && selectedVerificationType === 'government' && <View style={styles.formContainer}>
                {/* 机构名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.governmentName')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.governmentNamePlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.government.name} onChangeText={text => updateVerificationField('name', text)} />
                </View>

                {/* 机构ID */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.governmentId')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.governmentIdPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.government.creditCode} onChangeText={text => updateVerificationField('creditCode', text)} />
                </View>

                {/* 部门名称 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.department')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.departmentPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.government.department} onChangeText={text => updateVerificationField('department', text)} />
                </View>

                {/* 授权人 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.authorizer')}<Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.authorizerPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.government.authorizerName} onChangeText={text => updateVerificationField('authorizerName', text)} />
                </View>

                {/* 上传授权人身份证 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>{t('profile.verificationModal.authorizerIdPhotos')} <Text style={styles.required}>*</Text></Text>
                  
                  <View style={styles.uploadGrid}>
                    {/* 身份证正面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>{t('profile.verificationModal.authorizerIdFront')}<Text style={styles.required}>*</Text></Text>
                      {renderVerificationUploadBox({
                      asset: verificationData.government.authorizerIdFront,
                      onPress: () => handleImageUpload('authorizerIdFront')
                    })}
                      {renderVerificationUploadActions({
                      asset: verificationData.government.authorizerIdFront,
                      onReplace: () => handleImageUpload('authorizerIdFront'),
                      onRemove: () => updateVerificationAssetByType('government', 'authorizerIdFront', null)
                    })}
                    </View>

                    {/* 身份证反面 */}
                    <View style={styles.uploadItemWrapper}>
                      <Text style={styles.uploadLabel}>{t('profile.verificationModal.authorizerIdBack')}<Text style={styles.required}>*</Text></Text>
                      {renderVerificationUploadBox({
                      asset: verificationData.government.authorizerIdBack,
                      onPress: () => handleImageUpload('authorizerIdBack')
                    })}
                      {renderVerificationUploadActions({
                      asset: verificationData.government.authorizerIdBack,
                      onReplace: () => handleImageUpload('authorizerIdBack'),
                      onRemove: () => updateVerificationAssetByType('government', 'authorizerIdBack', null)
                    })}
                    </View>
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>{t('profile.verificationModal.authorizerIdTip')}</Text>
                  </View>
                </View>

                {/* 职位 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.position')} <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.positionPlaceholder')} placeholderTextColor="#9ca3af" value={verificationData.government.authorizerPosition} onChangeText={text => updateVerificationField('authorizerPosition', text)} />
                </View>

                {/* 联系方式说明 */}
                <View style={styles.contactMethodSection}>
                  <Text style={styles.contactMethodTitle}>{t('profile.verificationModal.contactMethod')} <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.contactMethodDesc}>{t('profile.verificationModal.contactMethodDesc')}</Text>
                </View>

                {/* 联系电话 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.contactPhone')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.contactPhonePlaceholder')} placeholderTextColor="#9ca3af" keyboardType="phone-pad" maxLength={11} value={verificationData.government.contactPhone} onChangeText={text => updateVerificationField('contactPhone', text)} />
                </View>

                {/* 联系邮箱 */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t('profile.verificationModal.contactEmail')}</Text>
                  <TextInput style={styles.fieldInput} placeholder={t('profile.verificationModal.contactEmailPlaceholder')} placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" value={verificationData.government.contactEmail} onChangeText={text => updateVerificationField('contactEmail', text)} />
                </View>

                {/* 上传官方文件 */}
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadSectionTitle}>{t('profile.verificationModal.uploadCertificate')}</Text>
                  
                  <View style={styles.uploadSingleWrapper}>
                    <Text style={styles.uploadLabel}>{t('profile.verificationModal.certificate')} <Text style={styles.required}>*</Text></Text>
                    {renderVerificationUploadBox({
                    asset: verificationData.government.certificate,
                    onPress: () => handleFileUpload('certificate'),
                    large: true,
                    mode: 'file',
                    disabled: !VERIFICATION_FILE_UPLOAD_ENABLED
                  })}
                    {renderVerificationUploadActions({
                    asset: verificationData.government.certificate,
                    onReplace: () => handleFileUpload('certificate'),
                    onRemove: () => updateVerificationAssetByType('government', 'certificate', null),
                    disabled: !VERIFICATION_FILE_UPLOAD_ENABLED
                  })}
                    {!VERIFICATION_FILE_UPLOAD_ENABLED ? <Text style={styles.fileUploadPendingHint}>{t('profile.verificationModal.fileUploadPendingNotice')}</Text> : null}
                  </View>

                  <View style={styles.uploadTip}>
                    <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                    <Text style={styles.uploadTipText}>{t('profile.verificationModal.certificateTip')}</Text>
                  </View>
                </View>
              </View>}



            <View style={{
            height: 40
          }} />
          </ScrollView>

          <ImagePickerSheet
            visible={verificationImagePickerState.visible}
            onClose={closeVerificationImagePicker}
            onImageSelected={handleVerificationImagePicked}
            title={t('profile.verificationModal.selectImage')}
            renderInPlace
          />

          {/* 底部按钮 */}
          {verificationStep > 0 && <View style={[styles.verificationFooter, {
          paddingBottom: bottomSafeInset
        }]}>
              <TouchableOpacity style={[styles.verificationSubmitBtn, isVerificationUploadBlocked ? styles.verificationSubmitBtnDisabled : null]} onPress={handleVerificationSubmit} disabled={isVerificationUploadBlocked}>
                <Text style={styles.verificationSubmitText}>{isVerificationUploadBlocked ? t('profile.verificationModal.uploading') : t('profile.verificationModal.submit')}</Text>
              </TouchableOpacity>
            </View>}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 退出登录确认弹窗 */}
      <LogoutConfirmModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleConfirmLogout} username={userProfile.username || userProfile.nickname} isLoading={isLoggingOut} showDefaultPassword={!userProfile.passwordChanged} />
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  headerBg: {
    height: 120,
    backgroundColor: '#ef4444',
    paddingTop: 20
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: -60,
    borderRadius: 16,
    padding: 16
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    marginTop: -40
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    marginTop: 8
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  userName: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937'
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4
  },
  verificationIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  verificationText: {
    fontSize: scaleFont(11),
    fontWeight: '500'
  },
  verifyButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 4
  },
  verifyButtonText: {
    fontSize: scaleFont(11),
    color: '#3b82f6',
    fontWeight: '500'
  },
  userId: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#9ca3af',
    marginTop: 4
  },
  userBio: {
    fontSize: scaleFont(14),
    color: '#4b5563',
    marginTop: 12,
    lineHeight: scaleFont(18)
  },
  userMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    fontSize: scaleFont(14),
    color: '#9ca3af'
  },
  indexRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    gap: 16
  },
  indexItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  indexIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  indexInfo: {
    flex: 1
  },
  indexLabel: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginBottom: 2
  },
  indexValue: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#1f2937'
  },
  indexDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e5e7eb'
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#9ca3af',
    marginTop: 2
  },
  walletCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 16
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  walletInfo: {
    flex: 1,
    marginLeft: 12
  },
  walletNoticeEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  walletNoticeEntryButtonText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    color: '#6b7280'
  },
  walletLabel: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  walletBalance: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#1f2937'
  },
  walletStats: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  walletStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  walletStatDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4
  },
  walletStatValue: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  walletStatLabel: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center'
  },
  walletNoticeUrlLabel: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6
  },
  walletNoticeTipsTitle: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    color: '#7c2d12',
    marginTop: 20,
    marginBottom: 8
  },
  walletNoticeTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6
  },
  walletNoticeTipDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#f97316',
    marginTop: 7,
    marginRight: 8
  },
  walletNoticeTipText: {
    flex: 1,
    fontSize: scaleFont(12),
    lineHeight: 18,
    color: '#9a3412'
  },
  walletNoticeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end'
  },
  walletNoticeModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '78%'
  },
  walletNoticeModalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 14
  },
  walletNoticeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  walletNoticeModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: '#111827'
  },
  walletNoticeModalContent: {
    paddingBottom: 8
  },
  walletNoticeModalLead: {
    fontSize: scaleFont(16),
    lineHeight: 24,
    fontWeight: '700',
    color: '#7c2d12'
  },
  walletNoticeModalText: {
    marginTop: 10,
    fontSize: scaleFont(14),
    lineHeight: 22,
    color: '#374151'
  },
  walletNoticeModalUrlBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74'
  },
  walletNoticeModalUrlText: {
    fontSize: scaleFont(14),
    lineHeight: 22,
    color: '#111827'
  },
  walletNoticeModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  walletNoticeModalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 12
  },
  walletNoticeModalPrimaryButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    color: '#fff'
  },
  walletNoticeModalSecondaryButton: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6'
  },
  walletNoticeModalSecondaryButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151'
  },
  superLikeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 16
  },
  superLikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  superLikeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  superLikeTitleText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  superLikeActions: {
    flexDirection: 'row',
    gap: 12
  },
  superLikeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  superLikeBtnSecondary: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb'
  },
  superLikeBtnText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#f59e0b'
  },
  superLikeBtnTextSecondary: {
    color: '#6b7280'
  },
  superLikeHubCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  superLikeHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  superLikeHubTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  superLikeHubIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa'
  },
  superLikeHubTitleBlock: {
    flex: 1,
    marginLeft: 10
  },
  superLikeHubEyebrow: {
    fontSize: scaleFont(10),
    fontWeight: '600',
    color: '#9ca3af'
  },
  superLikeHubTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2
  },
  superLikeHubBalance: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb'
  },
  superLikeHubSubtitle: {
    fontSize: scaleFont(12),
    lineHeight: 18,
    color: '#6b7280'
  },
  superLikeHubTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10
  },
  superLikeHubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  superLikeHubTagText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
    color: '#64748b'
  },
  superLikeActionList: {
    marginTop: 12,
    gap: 8
  },
  superLikeActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fcfcfd',
    borderWidth: 1
  },
  superLikeActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  superLikeActionContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10
  },
  superLikeActionTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  superLikeActionDescription: {
    fontSize: scaleFont(11),
    lineHeight: 16,
    color: '#6b7280',
    marginTop: 2
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuValue: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginRight: 4
  },
  contentSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16
  },
  contentTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  contentTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative'
  },
  contentTabText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  contentTabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  contentTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1
  },
  questionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  questionTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginLeft: 'auto'
  },
  rewardTagInline: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  rewardTagInlineText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  solvedTagInline: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4
  },
  solvedTagInlineText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  questionTitle: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    lineHeight: scaleFont(20)
  },
  questionStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  questionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  questionStatText: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  viewAllBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  viewAllText: {
    fontSize: scaleFont(13),
    color: '#ef4444'
  },
  answerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  adoptedTagInline: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  adoptedTagInlineText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  answerTime: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginLeft: 'auto'
  },
  answerQuestion: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4
  },
  answerContent: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  answerStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  logoutBtn: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  logoutText: {
    fontSize: scaleFont(15),
    color: '#ef4444',
    fontWeight: '500'
  },
  listModal: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  listModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  listModalTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  clearText: {
    fontSize: scaleFont(14),
    color: '#ef4444'
  },
  listModalContent: {
    flex: 1
  },
  listModalContentContainer: {
    flexGrow: 1
  },
  inlineAlertOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: modalTokens.backdrop
  },
  inlineAlertCard: {
    borderRadius: 18,
    backgroundColor: modalTokens.surface,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowRadius: 18,
    elevation: 10
  },
  inlineAlertTitle: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(24),
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 8
  },
  inlineAlertMessage: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    color: modalTokens.textSecondary,
    marginBottom: 16
  },
  inlineAlertButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end'
  },
  inlineAlertButtonsVertical: {
    flexDirection: 'column'
  },
  inlineAlertButton: {
    minWidth: 84,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444'
  },
  inlineAlertButtonVertical: {
    width: '100%'
  },
  inlineAlertButtonCancel: {
    backgroundColor: '#f3f4f6'
  },
  inlineAlertButtonDestructive: {
    backgroundColor: '#dc2626'
  },
  inlineAlertButtonText: {
    color: '#ffffff',
    fontSize: scaleFont(14),
    fontWeight: '600'
  },
  inlineAlertButtonTextCancel: {
    color: '#374151'
  },
  inlineAlertButtonTextDestructive: {
    color: '#ffffff'
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  listItemContent: {
    flex: 1
  },
  listItemTitle: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    lineHeight: scaleFont(22)
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12
  },
  listItemAuthor: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  listItemTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  favoriteTabs: {
    flexDirection: 'row',
    backgroundColor: modalTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  favoriteTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  favoriteTabActive: {
    borderBottomColor: '#ef4444'
  },
  favoriteTabText: {
    fontSize: scaleFont(14),
    color: '#6b7280'
  },
  favoriteTabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  draftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  draftTypeTag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  draftTypeText: {
    fontSize: scaleFont(11),
    color: '#ef4444',
    fontWeight: '500'
  },
  draftInfo: {
    flex: 1,
    marginLeft: 12
  },
  draftTitle: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    marginBottom: 4
  },
  draftTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  draftDeleteBtn: {
    padding: 8
  },
  // 内嵌收藏标签样式
  favoriteTabsInline: {
    flexDirection: 'row',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 8,
    padding: 4,
    margin: 12
  },
  favoriteTabInline: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  favoriteTabInlineActive: {
    backgroundColor: modalTokens.surface,
    shadowColor: modalTokens.shadow,
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  favoriteTabInlineText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  favoriteTabInlineTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  favoriteItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  favoriteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8
  },
  // 点赞列表样式
  likeItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  likeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8
  },
  likeItemContent: {
    flex: 1
  },
  superLikeIcon: {
    marginBottom: 6
  },
  likeItemTitle: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 6,
    fontWeight: '500'
  },
  likeItemQuestion: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18),
    marginBottom: 4
  },
  likeItemContent: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 6
  },
  likeItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  likeItemAuthor: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  likeItemTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  favoriteItemContent: {
    flex: 1
  },
  favoriteItemTitle: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 6
  },
  favoriteItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  favoriteItemAuthor: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  favoriteItemTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  // 浏览历史样式
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  historyItemContent: {
    flex: 1
  },
  historyItemTitle: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    lineHeight: scaleFont(20),
    marginBottom: 6
  },
  historyItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  historyItemAuthor: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  historyItemTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  favoriteItemAuthor: {
    fontSize: scaleFont(12),
    color: '#6b7280'
  },
  favoriteItemTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  // 认证弹窗样式
  verificationModal: {
    flex: 1,
    backgroundColor: modalTokens.surfaceSoft
  },
  verificationKeyboardView: {
    flex: 1
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: modalTokens.surface,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  verificationTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: modalTokens.textPrimary
  },
  progressContainer: {
    backgroundColor: modalTokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  progressBar: {
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2
  },
  progressText: {
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    marginTop: 8
  },
  verificationContent: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  verificationContentContainer: {
    flexGrow: 1
  },
  // 类型选择
  typeSelectionContainer: {
    padding: 16
  },
  typeSelectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center'
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  typeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  typeInfo: {
    flex: 1
  },
  typeTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  typeDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  // 表单样式
  formContainer: {
    backgroundColor: '#fff'
  },
  // 字段容器（每个输入项）
  fieldContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  fieldLabel: {
    fontSize: scaleFont(14),
    color: '#333',
    marginBottom: 10,
    fontWeight: '500'
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 48
  },
  fieldInputText: {
    fontSize: scaleFont(15),
    color: '#1f2937'
  },
  // 联系方式区域
  contactMethodSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  contactMethodTitle: {
    fontSize: scaleFont(14),
    color: '#333',
    fontWeight: '600',
    marginBottom: 4
  },
  contactMethodDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  // 上传区域
  uploadSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20
  },
  uploadSectionTitle: {
    fontSize: scaleFont(15),
    color: '#333',
    fontWeight: '600',
    marginBottom: 16
  },
  uploadGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  uploadItemWrapper: {
    flex: 1
  },
  uploadSingleWrapper: {
    marginBottom: 12
  },
  uploadLabel: {
    fontSize: scaleFont(13),
    color: '#666',
    marginBottom: 8,
    fontWeight: '500'
  },
  uploadBox: {
    aspectRatio: 1.4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  uploadBoxLarge: {
    aspectRatio: 1.5,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  uploadBoxError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2'
  },
  uploadBoxDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ee'
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadPlaceholderDisabled: {
    opacity: 0.72
  },
  uploadPlaceholderText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginTop: 8
  },
  uploadPlaceholderTextDisabled: {
    color: '#94a3b8'
  },
  uploadedImage: {
    width: '100%',
    height: '100%'
  },
  verificationAssetContent: {
    flex: 1
  },
  verificationAssetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  verificationAssetOverlayError: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)'
  },
  verificationAssetOverlayText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '500'
  },
  verificationFileCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18
  },
  verificationFileCardDisabled: {
    opacity: 0.8
  },
  verificationFileName: {
    marginTop: 10,
    fontSize: scaleFont(13),
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center'
  },
  verificationFileNameDisabled: {
    color: '#64748b'
  },
  verificationFileMeta: {
    marginTop: 4,
    fontSize: scaleFont(11),
    color: '#64748b',
    textAlign: 'center'
  },
  verificationFileMetaDisabled: {
    color: '#94a3b8'
  },
  verificationAssetStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  verificationAssetStatusText: {
    fontSize: scaleFont(11),
    color: '#64748b',
    textAlign: 'center'
  },
  verificationAssetStatusSuccess: {
    color: '#15803d'
  },
  verificationAssetStatusError: {
    color: '#dc2626'
  },
  verificationAssetActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  verificationAssetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verificationAssetActionText: {
    fontSize: scaleFont(12),
    color: '#2563eb',
    fontWeight: '500'
  },
  verificationAssetDeleteText: {
    color: '#ef4444'
  },
  uploadTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  uploadTipText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18)
  },
  // 专业资质认证
  qualificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  optionalTag: {
    fontSize: scaleFont(12),
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  qualificationDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: scaleFont(18)
  },
  qualificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  qualificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  qualificationPreview: {
    width: 80,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb'
  },
  qualificationImage: {
    width: 80,
    height: 60,
    borderRadius: 6,
    backgroundColor: '#e5e7eb'
  },
  qualificationFileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff'
  },
  qualificationInfo: {
    flex: 1
  },
  qualificationNameInput: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  qualificationMeta: {
    marginTop: 8,
    fontSize: scaleFont(12),
    color: '#64748b'
  },
  qualificationDelete: {
    paddingLeft: 8,
    paddingTop: 4
  },
  addQualificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed'
  },
  addQualificationBtnDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ee'
  },
  addQualificationText: {
    fontSize: scaleFont(14),
    color: '#3b82f6',
    fontWeight: '500'
  },
  addQualificationTextDisabled: {
    color: '#94a3b8'
  },
  fileUploadPendingHint: {
    marginTop: 8,
    fontSize: scaleFont(12),
    color: '#94a3b8',
    lineHeight: scaleFont(18)
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  required: {
    color: '#ef4444'
  },
  verificationSubmitBtnDisabled: {
    opacity: 0.7
  },
  // 确认信息
  confirmContainer: {
    padding: 16
  },
  confirmSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  confirmTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  confirmItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  confirmLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 4
  },
  confirmValue: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    fontWeight: '500'
  },
  uploadedImagesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  uploadedImageThumb: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  uploadedImageLabel: {
    fontSize: scaleFont(12),
    color: '#3b82f6',
    fontWeight: '500'
  },
  warningSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  warningTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8
  },
  warningText: {
    fontSize: scaleFont(13),
    color: '#78350f',
    marginBottom: 4
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12
  },
  agreementText: {
    fontSize: scaleFont(13),
    color: '#374151'
  },
  // 底部按钮
  verificationFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0
  },
  verificationSubmitBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  verificationSubmitText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#fff'
  },
  // 加载和空状态样式
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loadingText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginTop: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500'
  },
  emptyHint: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    marginTop: 4
  }
});
