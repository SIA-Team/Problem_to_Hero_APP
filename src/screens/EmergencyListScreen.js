import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import EmergencyReceivedCard from '../components/EmergencyReceivedCard';
import RegionSelector from '../components/RegionSelector';
import { modalTokens } from '../components/modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
import { useEmergency } from '../contexts/EmergencyContext';
import emergencyApi from '../services/api/emergencyApi';
import authApi from '../services/api/authApi';

const isSuccessResponse = (response) => response && (response.code === 200 || response.code === 0);

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isTruthyFlag = (value) => {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;

  const normalizedValue = String(value).trim().toLowerCase();
  return normalizedValue === '1' || normalizedValue === 'true' || normalizedValue === 'yes';
};

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

  return '--';
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '\u521a\u521a';
  if (diffMinutes < 60) return `${diffMinutes}\u5206\u949f\u524d`; 

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}\u5c0f\u65f6\u524d`; 

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}\u5929\u524d`; 

  return `${date.getMonth() + 1}-${date.getDate()}`;
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

const inferEmergencyCompleted = (item = {}) => {
  if (
    isTruthyFlag(item?.isCompleted) ||
    isTruthyFlag(item?.completed) ||
    isTruthyFlag(item?.isResolved) ||
    isTruthyFlag(item?.resolved) ||
    isTruthyFlag(item?.finished) ||
    isTruthyFlag(item?.closed)
  ) {
    return true;
  }

  const rescuerCount = Math.max(0, toSafeNumber(item?.rescuerCount ?? item?.neededHelperCount));
  const respondedCount = Math.max(0, toSafeNumber(item?.respondedCount ?? item?.responseCount ?? item?.responderCount));
  return rescuerCount > 0 && respondedCount >= rescuerCount;
};

const resolveBackendEmergencyState = (item = {}) => {
  if (
    isTruthyFlag(item?.isIgnored) ||
    isTruthyFlag(item?.ignored) ||
    isTruthyFlag(item?.ignoreFlag)
  ) {
    return 'ignored';
  }

  if (inferEmergencyCompleted(item)) {
    return 'completed';
  }

  const statusCandidates = [
    item?.currentUserStatus,
    item?.userStatus,
    item?.helpStatus,
    item?.emergencyStatus,
    item?.rescueStatus,
    item?.status,
  ];

  for (const candidate of statusCandidates) {
    const normalizedValue = String(candidate || '').trim().toLowerCase();
    if (!normalizedValue) {
      continue;
    }

    if (
      normalizedValue.includes('ignore') ||
      normalizedValue.includes('ignored') ||
      normalizedValue.includes('已忽略')
    ) {
      return 'ignored';
    }

    if (
      normalizedValue.includes('complete') ||
      normalizedValue.includes('completed') ||
      normalizedValue.includes('finish') ||
      normalizedValue.includes('finished') ||
      normalizedValue.includes('resolve') ||
      normalizedValue.includes('resolved') ||
      normalizedValue.includes('close') ||
      normalizedValue.includes('closed') ||
      normalizedValue.includes('done') ||
      normalizedValue.includes('已完成') ||
      normalizedValue.includes('已解决')
    ) {
      return 'completed';
    }

    if (
      normalizedValue.includes('responding') ||
      normalizedValue.includes('pending') ||
      normalizedValue.includes('active') ||
      normalizedValue.includes('open') ||
      normalizedValue.includes('processing') ||
      normalizedValue.includes('救援中') ||
      normalizedValue.includes('响应中')
    ) {
      return 'responding';
    }
  }

  return null;
};

const resolveReceivedEmergencyCardState = (item, { isIgnored = false, userResponded = false } = {}) => {
  const backendState = resolveBackendEmergencyState(item);

  if (isIgnored || backendState === 'ignored') {
    return 'ignored';
  }

  if (backendState === 'completed' || inferEmergencyCompleted(item)) {
    return 'completed';
  }

  if (userResponded || isTruthyFlag(item?.isRescuerJoined)) {
    return 'responded';
  }

  return 'pending';
};

const getReceivedEmergencyBadgeType = (cardState) => {
  if (cardState === 'ignored') return 'ignored';
  if (cardState === 'completed') return 'completed';
  return 'responding';
};

const getReceivedEmergencyCompletedActionLabel = (item, userResponded) => (
  userResponded || isTruthyFlag(item?.isRescuerJoined) ? '我已响应' : '已完成'
);

const getReceivedEmergencySortRank = (cardState) => {
  if (cardState === 'ignored') return 2;
  if (cardState === 'completed') return 1;
  return 0;
};

const normalizeEmergencyItem = (item = {}, index = 0) => {
  const id = item?.id ?? item?.helpId ?? item?.emergencyId ?? `emergency-${index}`;
  const rescuerCount = Math.max(0, Math.round(toSafeNumber(item?.neededHelperCount ?? item?.rescuerCount)));
  const respondedCount = Math.max(0, Math.round(toSafeNumber(
    item?.responderCount ??
    item?.responseCount ??
    item?.respondedHelperCount ??
    item?.respondedCount ??
    item?.currentHelperCount
  )));
  const rawTime = item?.createTime ?? item?.publishTime ?? item?.gmtCreate ?? item?.createdAt ?? item?.timestamp;

  return {
    id: String(id),
    ownerUserId: String(
      item?.appUserId ??
      item?.seekerUserId ??
      item?.authorId ??
      item?.creatorId ??
      item?.userId ??
      ''
    ),
    regionDisplay: sanitizeDisplayText(item?.regionDisplay || item?.locationText || item?.location, ''),
    countryName: sanitizeDisplayText(item?.countryName || item?.country, ''),
    cityName: sanitizeDisplayText(item?.cityName || item?.city, ''),
    stateName: sanitizeDisplayText(item?.stateName || item?.state || item?.provinceName || item?.province, ''),
    districtName: sanitizeDisplayText(item?.districtName || item?.district || item?.areaName || item?.area, ''),
    avatar: item?.avatar || item?.avatarUrl || item?.userAvatar || '',
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
    distance: formatDistanceLabel(item?.distanceMeters, item?.distanceText || item?.distance),
    rescuerCount,
    respondedCount,
    time: formatRelativeTime(rawTime),
    status: item?.status || item?.helpStatus || item?.emergencyStatus || item?.rescueStatus || item?.userStatus || item?.currentUserStatus || '',
    isCompleted: inferEmergencyCompleted(item),
    isIgnored: isTruthyFlag(item?.isIgnored) || isTruthyFlag(item?.ignored) || isTruthyFlag(item?.ignoreFlag),
    isRescuerJoined: isTruthyFlag(item?.isRescuerJoined) || isTruthyFlag(item?.joined) || isTruthyFlag(item?.hasJoined) || isTruthyFlag(item?.hasResponded) || isTruthyFlag(item?.responded) || isTruthyFlag(item?.userResponded),
    urgencyLevel: item?.urgencyLevel,
    responseCount: respondedCount,
    responders: Array.isArray(item?.responders) ? item.responders : [],
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

const normalizeResponderItem = (item = {}, index = 0) => {
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

const normalizeEmergencyDetail = (detail = {}, fallbackItem = null) => {
  const neededHelperCount = Math.max(0, Math.round(toSafeNumber(detail?.neededHelperCount, fallbackItem?.rescuerCount || 0)));
  const responderCount = Math.max(0, Math.round(toSafeNumber(detail?.responderCount, fallbackItem?.respondedCount || 0)));
  const responders = Array.isArray(detail?.responders)
    ? detail.responders.map((item, index) => normalizeResponderItem(item, index))
    : (fallbackItem?.responders || []).map((item, index) => normalizeResponderItem(item, index));

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
    canMarkResolved: Boolean(detail?.canMarkResolved),
    isRescuerJoined: Boolean(detail?.isRescuerJoined),
    pendingReview: Math.max(0, Math.round(toSafeNumber(detail?.pendingReview, 0))),
    commentCount: Math.max(0, Math.round(toSafeNumber(detail?.commentCount, 0))),
    publishFeeCents: Math.max(0, Math.round(toSafeNumber(detail?.publishFeeCents, 0))),
    helperOverageFeeCents: Math.max(0, Math.round(toSafeNumber(detail?.helperOverageFeeCents, 0))),
    responders,
  };
};

const extractEmergencyContactPayload = (response) => {
  const rootData = response?.data;
  const candidates = [rootData, rootData?.data];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate;
    }
  }

  return {};
};

const extractEmergencyCommentsRows = (response) => {
  const rootData = response?.data;
  const candidates = [
    rootData,
    rootData?.data,
    rootData?.rows,
    rootData?.list,
    rootData?.records,
    rootData?.items,
    rootData?.content,
    rootData?.data?.rows,
    rootData?.data?.list,
    rootData?.page?.rows,
    rootData?.page?.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeEmergencyComment = (comment = {}, index = 0) => {
  const id = comment?.id ?? `comment-${index}`;
  return {
    id: String(id),
    appUserId: comment?.appUserId ?? comment?.userId ?? '',
    name: sanitizeDisplayText(comment?.nickName || comment?.nickname || comment?.name, '\u533f\u540d\u7528\u6237'),
    avatar: comment?.avatar || comment?.avatarUrl || '',
    content: sanitizeDisplayText(comment?.content, ''),
    parentId: comment?.parentId,
    createTime: comment?.createTime || '',
  };
};

const getContactTypeLabel = (contactType) => {
  switch (Number(contactType)) {
    case 1:
      return '\u7535\u8bdd';
    case 2:
      return '\u5fae\u4fe1';
    case 3:
      return 'Telegram';
    case 4:
      return '\u5176\u4ed6';
    default:
      return '\u8054\u7cfb\u65b9\u5f0f';
  }
};

const detailColors = {
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  background: '#F8F9FB',
  card: '#FFFFFF',
  danger: '#EF4444',
  success: '#16A34A',
  successSoft: '#ECFDF5',
  successBorder: '#BBF7D0',
  warningBg: '#FFF7ED',
  warningBorder: '#FDBA74',
  warningText: '#C2410C',
  blueBg: '#EFF6FF',
  blueBorder: '#BFDBFE',
  blueText: '#2563EB',
};

const detailFontSize = {
  title: 20,
  sectionTitle: 17,
  body: 15,
  label: 13,
  small: 12,
};

const detailSpacing = {
  page: 16,
  card: 14,
  section: 18,
  item: 12,
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

const normalizeRegionKeyword = (value) => String(value || '').trim().toLowerCase();

const getSelectedRegionKeywords = (region = {}) => {
  const values = [region.country, region.city, region.state, region.district]
    .map(normalizeRegionKeyword)
    .filter(Boolean);

  return Array.from(new Set(values));
};

const matchesEmergencyRegion = (item, selectedRegion) => {
  const regionKeywords = getSelectedRegionKeywords(selectedRegion);
  if (regionKeywords.length === 0) {
    return true;
  }

  const searchableText = [
    item?.location,
    item?.regionDisplay,
    item?.countryName,
    item?.cityName,
    item?.stateName,
    item?.districtName,
  ]
    .map(normalizeRegionKeyword)
    .filter(Boolean)
    .join(' ');

  if (!searchableText) {
    return false;
  }

  return regionKeywords.every((keyword) => searchableText.includes(keyword));
};

export default function EmergencyListScreen({ navigation, route }) {
  const initialTab = route?.params?.initialTab === 'mine' ? 'mine' : 'received';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showRespondersModal, setShowRespondersModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [respondersLoading, setRespondersLoading] = useState(false);
  const [respondersError, setRespondersError] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedEmergencyDetail, setSelectedEmergencyDetail] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [emergencyComments, setEmergencyComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [maskedContactInfo, setMaskedContactInfo] = useState(null);
  const [joinLoadingId, setJoinLoadingId] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const { respondedEmergencies, ignoredEmergencies, respondToEmergency, cancelEmergencyResponse, ignoreEmergency } = useEmergency();

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  const [searchText, setSearchText] = useState('');

  const [emergencyItems, setEmergencyItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserLoaded, setCurrentUserLoaded] = useState(false);
  const bottomSafeInset = useBottomSafeInset(16);
  const respondedEmergencyIdSet = React.useMemo(() => new Set(respondedEmergencies.map(id => String(id))), [respondedEmergencies]);
  const ignoredEmergencyIdSet = React.useMemo(() => new Set(ignoredEmergencies.map(id => String(id))), [ignoredEmergencies]);

  const getDisplayRegion = () => {
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    if (parts.length === 0) return '\u5168\u90e8';
    return parts[parts.length - 1];
  };

  useEffect(() => {
    if (route?.params?.initialTab === 'mine' || route?.params?.initialTab === 'received') {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

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
        console.error('Failed to load current user for emergency list:', error);
        if (mounted) {
          setCurrentUserId('');
        }
      } finally {
        if (mounted) {
          setCurrentUserLoaded(true);
        }
      }
    };

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadEmergencyList = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const tab = activeTab === 'mine' ? 'mine' : 'received';
        const response = await emergencyApi.getList({ tab, pageNum: 1, pageSize: 20 });
        if (!isSuccessResponse(response)) {
          throw new Error(response?.msg || '\u52a0\u8f7d\u7d27\u6025\u6c42\u52a9\u5931\u8d25');
        }

        const rows = extractEmergencyListRows(response)
          .map((item, index) => normalizeEmergencyItem(item, index));

        setEmergencyItems(rows);
      } catch (error) {
        console.error('Failed to load emergency list:', error);
        setEmergencyItems([]);
        setLoadError(error?.message || '\u52a0\u8f7d\u7d27\u6025\u6c42\u52a9\u5931\u8d25');
      } finally {
        setLoading(false);
      }
    };

    loadEmergencyList();
  }, [activeTab]);

  const filteredEmergencies = useMemo(() => {
    const baseItems = activeTab === 'received'
      ? emergencyItems.filter(item => {
          if (!currentUserLoaded || !currentUserId) {
            return true;
          }

          return String(item?.ownerUserId || '').trim() !== currentUserId;
        })
      : emergencyItems;

    const regionFilteredItems = activeTab === 'received'
      ? baseItems.filter(item => matchesEmergencyRegion(item, selectedRegion))
      : baseItems;

    const keyword = searchText.trim().toLowerCase();
    const searchedItems = !searchText.trim()
      ? regionFilteredItems
      : regionFilteredItems.filter(item =>
      String(item?.name || '').toLowerCase().includes(keyword) ||
      String(item?.title || '').toLowerCase().includes(keyword) ||
      String(item?.location || '').toLowerCase().includes(keyword)
    );

    if (activeTab !== 'received') {
      return searchedItems;
    }

    return [...searchedItems].sort((left, right) => {
      const leftId = String(left?.id || '');
      const rightId = String(right?.id || '');
      const leftState = resolveReceivedEmergencyCardState(left, {
        isIgnored: ignoredEmergencyIdSet.has(leftId),
        userResponded: respondedEmergencyIdSet.has(leftId) || isTruthyFlag(left?.isRescuerJoined),
      });
      const rightState = resolveReceivedEmergencyCardState(right, {
        isIgnored: ignoredEmergencyIdSet.has(rightId),
        userResponded: respondedEmergencyIdSet.has(rightId) || isTruthyFlag(right?.isRescuerJoined),
      });

      return getReceivedEmergencySortRank(leftState) - getReceivedEmergencySortRank(rightState);
    });
  }, [activeTab, currentUserId, currentUserLoaded, emergencyItems, ignoredEmergencyIdSet, respondedEmergencyIdSet, searchText, selectedRegion]);

  const handleIgnoreEmergency = (item) => {
    const normalizedId = String(item?.id || '').trim();
    if (!normalizedId) {
      return;
    }

    const cardState = resolveReceivedEmergencyCardState(item, {
      isIgnored: ignoredEmergencyIdSet.has(normalizedId),
      userResponded: respondedEmergencyIdSet.has(normalizedId) || isTruthyFlag(item?.isRescuerJoined),
    });
    if (cardState !== 'pending') {
      return;
    }

    ignoreEmergency(normalizedId);
  };

  const handleShowResponders = async (emergency) => {
    setSelectedEmergency(emergency);
    setRespondersError('');
    setShowRespondersModal(true);

    const emergencyId = emergency?.id;
    if (!emergencyId || String(emergencyId).startsWith('emergency-')) {
      return;
    }

    setRespondersLoading(true);
    try {
      const response = await emergencyApi.getDetail(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u52a0\u8f7d\u54cd\u5e94\u8005\u5931\u8d25');
      }

      const detailPayload = extractEmergencyDetailPayload(response);
      const normalizedDetail = normalizeEmergencyDetail(detailPayload, emergency);
      setSelectedEmergency((prev) => ({
        ...(prev || emergency || {}),
        responders: normalizedDetail.responders,
        responseCount: normalizedDetail.responderCount,
        name: normalizedDetail.name,
        avatar: normalizedDetail.avatar,
      }));
      setEmergencyItems((prev) => prev.map((item) => {
        if (String(item.id) !== String(emergencyId)) {
          return item;
        }

        return {
          ...item,
          responders: normalizedDetail.responders,
          responseCount: normalizedDetail.responderCount,
          respondedCount: normalizedDetail.responderCount,
          name: normalizedDetail.name,
          avatar: normalizedDetail.avatar,
        };
      }));
    } catch (error) {
      console.error('Failed to load emergency responders:', error);
      setRespondersError(error?.message || '\u52a0\u8f7d\u54cd\u5e94\u8005\u5931\u8d25');
    } finally {
      setRespondersLoading(false);
    }
  };

  const fetchEmergencyComments = async (emergencyId) => {
    const response = await emergencyApi.getComments(emergencyId);
    if (!isSuccessResponse(response)) {
      throw new Error(response?.msg || '\u52a0\u8f7d\u7559\u8a00\u5931\u8d25');
    }

    const commentsRows = extractEmergencyCommentsRows(response)
      .map((comment, index) => normalizeEmergencyComment(comment, index));
    setEmergencyComments(commentsRows);
    return commentsRows;
  };

  const handleShowDetail = async (item) => {
    const id = item?.id;
    if (!id || String(id).startsWith('emergency-')) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9\u7f3a\u5c11\u6709\u6548 ID\uff0c\u6682\u65f6\u65e0\u6cd5\u67e5\u770b\u8be6\u60c5');
      return;
    }

    setShowDetailModal(true);
    setDetailLoading(true);
    setCommentsLoading(true);
    setDetailError('');
    setCommentsError('');
    setEmergencyComments([]);
    setCommentDraft('');
    setCommentSubmitting(false);
    setContactLoading(false);
    setContactError('');
    setMaskedContactInfo(null);
    setJoinLoadingId('');
    setResolveLoading(false);
    setLeaveLoading(false);
    setSelectedEmergencyDetail(normalizeEmergencyDetail({}, item));

    try {
      const [detailResult, commentsResult] = await Promise.allSettled([
        emergencyApi.getDetail(id),
        fetchEmergencyComments(id),
      ]);

      if (detailResult.status === 'fulfilled') {
        const detailResponse = detailResult.value;
        if (!isSuccessResponse(detailResponse)) {
          setDetailError(detailResponse?.msg || '\u52a0\u8f7d\u8be6\u60c5\u5931\u8d25');
        } else {
          const detailPayload = extractEmergencyDetailPayload(detailResponse);
          setSelectedEmergencyDetail(normalizeEmergencyDetail(detailPayload, item));
        }
      } else {
        console.error('Failed to load emergency detail:', detailResult.reason);
        setDetailError(detailResult?.reason?.message || '\u52a0\u8f7d\u8be6\u60c5\u5931\u8d25');
      }

      if (commentsResult.status === 'rejected') {
        console.error('Failed to load emergency comments:', commentsResult.reason);
        setCommentsError(commentsResult?.reason?.message || '\u52a0\u8f7d\u7559\u8a00\u5931\u8d25');
      }
    } catch (error) {
      console.error('Failed to load emergency detail or comments:', error);
      setDetailError(error?.message || '\u52a0\u8f7d\u8be6\u60c5\u5931\u8d25');
      setCommentsError((prev) => prev || '\u52a0\u8f7d\u7559\u8a00\u5931\u8d25');
    } finally {
      setDetailLoading(false);
      setCommentsLoading(false);
    }
  };

  const handleLoadMaskedContact = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      setContactError('\u5f53\u524d\u6c42\u52a9 ID \u65e0\u6548\uff0c\u6682\u65f6\u65e0\u6cd5\u83b7\u53d6\u8054\u7cfb\u65b9\u5f0f');
      return;
    }

    setContactLoading(true);
    setContactError('');

    try {
      const response = await emergencyApi.getMaskedContact(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u83b7\u53d6\u8054\u7cfb\u65b9\u5f0f\u5931\u8d25');
      }

      const payload = extractEmergencyContactPayload(response);
      setMaskedContactInfo({
        maskedContact: payload?.maskedContact || '',
        contactType: payload?.contactType,
      });
    } catch (error) {
      console.error('Failed to load emergency masked contact:', error);
      setMaskedContactInfo(null);
      setContactError(error?.message || '\u83b7\u53d6\u8054\u7cfb\u65b9\u5f0f\u5931\u8d25');
    } finally {
      setContactLoading(false);
    }
  };

  const submitComment = async () => {
    const emergencyId = String(selectedEmergencyDetail?.id || '');
    if (!emergencyId) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9 ID \u65e0\u6548\uff0c\u6682\u65f6\u65e0\u6cd5\u53d1\u9001\u7559\u8a00');
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      showAppAlert('\u63d0\u793a', '\u8bf7\u8f93\u5165\u7559\u8a00\u5185\u5bb9');
      return;
    }

    setCommentSubmitting(true);
    try {
      const response = await emergencyApi.createComment(emergencyId, {
        content,
        parentId: 0,
      });
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u53d1\u9001\u7559\u8a00\u5931\u8d25');
      }

      setCommentDraft('');
      setCommentsError('');
      setCommentsLoading(true);
      try {
        await fetchEmergencyComments(emergencyId);
      } finally {
        setCommentsLoading(false);
      }
      setSelectedEmergencyDetail((prev) => ({
        ...(prev || {}),
        commentCount: Math.max(0, toSafeNumber(prev?.commentCount, 0)) + 1,
      }));
      showAppAlert('\u6210\u529f', '\u7559\u8a00\u53d1\u9001\u6210\u529f');
    } catch (error) {
      showAppAlert('\u5931\u8d25', error?.message || '\u7559\u8a00\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitJoinRescue = async (emergencyId) => {
    if (!emergencyId || String(emergencyId).startsWith('emergency-')) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9 ID \u65e0\u6548\uff0c\u6682\u65f6\u65e0\u6cd5\u54cd\u5e94');
      return;
    }

    const normalizedId = String(emergencyId);
    if (joinLoadingId === normalizedId) {
      return;
    }

    const matchedItem = emergencyItems.find((item) => String(item?.id) === normalizedId);
    if (matchedItem) {
      const cardState = resolveReceivedEmergencyCardState(matchedItem, {
        isIgnored: ignoredEmergencyIdSet.has(normalizedId),
        userResponded: respondedEmergencyIdSet.has(normalizedId) || isTruthyFlag(matchedItem?.isRescuerJoined),
      });
      if (cardState !== 'pending') {
        return;
      }
    }

    setJoinLoadingId(normalizedId);
    try {
      const response = await emergencyApi.joinHelp(normalizedId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u54cd\u5e94\u6c42\u52a9\u5931\u8d25');
      }

      respondToEmergency(normalizedId);
      setEmergencyItems((prev) => prev.map((item) => {
        if (String(item.id) !== normalizedId) {
          return item;
        }

        const nextCount = Math.max(0, toSafeNumber(item.respondedCount)) + 1;
        return {
          ...item,
          respondedCount: nextCount,
          responseCount: nextCount,
          isRescuerJoined: true,
        };
      }));
      setSelectedEmergencyDetail((prev) => {
        if (String(prev?.id || '') !== normalizedId) {
          return prev;
        }

        return {
          ...(prev || {}),
          isRescuerJoined: true,
          responderCount: Math.max(0, toSafeNumber(prev?.responderCount)) + 1,
        };
      });
      showAppAlert('\u6210\u529f', '\u5df2\u54cd\u5e94\u8fd9\u6761\u7d27\u6025\u6c42\u52a9\uff0c\u8bf7\u5c3d\u5feb\u8054\u7cfb\u5bf9\u65b9');
    } catch (error) {
      console.error('Failed to join emergency help:', error);
      showAppAlert('\u5931\u8d25', error?.message || '\u54cd\u5e94\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5');
    } finally {
      setJoinLoadingId('');
    }
  };

  const handleJoinRescue = (item) => {
    showAppAlert('\u786e\u8ba4\u54cd\u5e94', `\u786e\u8ba4\u8981\u54cd\u5e94 ${item?.name || ''} \u7684\u7d27\u6025\u6c42\u52a9\u5417\uff1f`, [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u7acb\u5373\u54cd\u5e94', onPress: () => { void submitJoinRescue(item?.id); } },
    ]);
  };

  const submitMarkResolved = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9 ID \u65e0\u6548\uff0c\u6682\u65f6\u65e0\u6cd5\u6807\u8bb0\u5df2\u89e3\u51b3');
      return;
    }

    setResolveLoading(true);
    try {
      const response = await emergencyApi.resolveHelp(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u6807\u8bb0\u5df2\u89e3\u51b3\u5931\u8d25');
      }

      setSelectedEmergencyDetail((prev) => ({
        ...(prev || {}),
        canMarkResolved: false,
      }));
      setEmergencyItems((prev) => prev.map((item) => {
        if (String(item.id) !== String(emergencyId)) {
          return item;
        }

        return {
          ...item,
          isCompleted: true,
          status: item?.status || 'completed',
        };
      }));
      showAppAlert('\u6210\u529f', '\u5df2\u6807\u8bb0\u4e3a\u5df2\u89e3\u51b3');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to resolve emergency help:', error);
      showAppAlert('\u5931\u8d25', error?.message || '\u6807\u8bb0\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleMarkResolved = () => {
    showAppAlert('\u786e\u8ba4', '\u786e\u8ba4\u5c06\u8fd9\u6761\u7d27\u6025\u6c42\u52a9\u6807\u8bb0\u4e3a\u5df2\u89e3\u51b3\u5417\uff1f', [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u786e\u8ba4', onPress: () => { void submitMarkResolved(); } },
    ]);
  };

  const submitLeaveRescue = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6c42\u52a9 ID \u65e0\u6548\uff0c\u6682\u65f6\u65e0\u6cd5\u9000\u51fa\u6551\u63f4');
      return;
    }

    setLeaveLoading(true);
    try {
      const response = await emergencyApi.leaveHelp(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '\u9000\u51fa\u6551\u63f4\u5931\u8d25');
      }

      setSelectedEmergencyDetail((prev) => ({
        ...(prev || {}),
        isRescuerJoined: false,
        responderCount: Math.max(0, toSafeNumber(prev?.responderCount) - 1),
      }));
      setMaskedContactInfo(null);
      setContactError('');
      setEmergencyItems((prev) => prev.map((item) => {
        if (String(item.id) !== String(emergencyId)) {
          return item;
        }

        const nextCount = Math.max(0, toSafeNumber(item.respondedCount) - 1);
        return {
          ...item,
          respondedCount: nextCount,
          responseCount: nextCount,
        };
      }));
      cancelEmergencyResponse(String(emergencyId));
      showAppAlert('\u6210\u529f', '\u5df2\u9000\u51fa\u6551\u63f4');
    } catch (error) {
      console.error('Failed to leave emergency help:', error);
      showAppAlert('\u5931\u8d25', error?.message || '\u9000\u51fa\u6551\u63f4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLeaveRescue = () => {
    showAppAlert('\u786e\u8ba4', '\u786e\u8ba4\u8981\u9000\u51fa\u5f53\u524d\u6551\u63f4\u5417\uff1f', [
      { text: '\u53d6\u6d88', style: 'cancel' },
      { text: '\u786e\u8ba4', onPress: () => { void submitLeaveRescue(); } },
    ]);
  };
  const renderEmergencyCard = (item) => {
    const normalizedId = String(item?.id || '');
    const isCompleted = inferEmergencyCompleted(item);
    const isIgnoredEmergency = ignoredEmergencyIdSet.has(normalizedId);
    const userResponded = respondedEmergencyIdSet.has(normalizedId) || isTruthyFlag(item?.isRescuerJoined);
    const showMineAction = activeTab === 'mine';
    const receivedCardState = resolveReceivedEmergencyCardState(item, {
      isIgnored: isIgnoredEmergency,
      userResponded,
    });
    const headerStatus = showMineAction ? (isCompleted ? 'completed' : null) : receivedCardState;

    if (activeTab === 'received') {
      return (
        <EmergencyReceivedCard
          key={item.id}
          item={item}
          highlight={item.urgencyLevel === 'high'}
          statusType={getReceivedEmergencyBadgeType(receivedCardState)}
          footerMode={receivedCardState}
          completedActionLabel={getReceivedEmergencyCompletedActionLabel(item, userResponded)}
          isActionLoading={joinLoadingId === normalizedId}
          showViewDetailInPending={false}
          onPressResponders={() => handleShowResponders(item)}
          onPressViewDetail={() => handleShowDetail(item)}
          onPressIgnore={receivedCardState === 'pending' ? () => handleIgnoreEmergency(item) : undefined}
          onPressRespond={receivedCardState === 'pending' ? () => handleJoinRescue(item) : undefined}
        />
      );
    }

    return (
      <View
        key={item.id}
        style={[
          styles.emergencyItem,
          item.urgencyLevel === 'high' && styles.emergencyItemHigh,
        ]}
      >
        <View style={styles.emergencyHeader}>
          <Avatar uri={item.avatar} name={item.name} size={44} />
          <View style={styles.emergencyHeaderContent}>
            <Text style={styles.emergencyName}>{item.name}</Text>
            <Text style={styles.emergencyTime}>{item.time}</Text>
          </View>
          {headerStatus === 'completed' ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#6b7280" />
              <Text style={styles.completedBadgeText}>{'\u5df2\u5b8c\u6210'}</Text>
            </View>
          ) : null}
          {headerStatus === 'ignored' ? (
            <View style={styles.ignoredBadge}>
              <Ionicons name="remove-circle" size={14} color="#6b7280" />
              <Text style={styles.ignoredBadgeText}>{'\u5df2\u5ffd\u7565'}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.emergencyTitle} numberOfLines={2}>{item.title}</Text>

        <View style={styles.emergencyInfo}>
          <View style={styles.emergencyInfoItem}>
            <Ionicons name="location" size={14} color="#ef4444" />
            <Text style={styles.emergencyLocation} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.emergencyDistance}>
            <Ionicons name="navigate" size={12} color="#f59e0b" />
            <Text style={styles.emergencyDistanceText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.emergencyFooter}>
          <View style={styles.emergencyFooterLeft}>
            <View style={styles.emergencyRescuerInfo}>
              <Ionicons name="people-outline" size={16} color="#6b7280" />
              <Text style={styles.emergencyRescuerText}>{`\u9700 ${item.rescuerCount} \u4eba`}</Text>
            </View>
            <TouchableOpacity style={styles.detailBtn} onPress={() => handleShowDetail(item)}>
              <Ionicons name="document-text-outline" size={14} color="#6b7280" />
              <Text style={styles.detailBtnText}>{'\u67e5\u770b\u8be6\u60c5'}</Text>
            </TouchableOpacity>
          </View>

          {showMineAction ? (
            <View style={styles.emergencyFooterRight}>
              <TouchableOpacity style={styles.responseCountBtn} onPress={() => handleShowResponders(item)}>
                <Ionicons name="people" size={16} color="#3b82f6" />
                <Text style={styles.responseCountText}>{`${item.responseCount} \u4eba\u54cd\u5e94`}</Text>
                <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : isIgnoredEmergency || isCompleted || userResponded ? (
            <View style={styles.emergencyFooterRight}>
              <TouchableOpacity style={styles.responseCountBtn} onPress={() => handleShowResponders(item)}>
                <Ionicons name="people" size={16} color="#3b82f6" />
                <Text style={styles.responseCountText}>{`${item.responseCount} \u4eba\u54cd\u5e94`}</Text>
                <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.respondBtn}
              onPress={() => handleJoinRescue(item)}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.respondBtnText}>{'\u7acb\u5373\u54cd\u5e94'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const canViewMaskedContact = Boolean(
    selectedEmergencyDetail?.isRescuerJoined || selectedEmergencyDetail?.canMarkResolved
  );
  const showEmergencyFee = canViewEmergencyFee(selectedEmergencyDetail, currentUserId);
  const showInitialReceivedLoading = activeTab === 'received' && !currentUserLoaded;
  const showListLoading = loading || showInitialReceivedLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.headerTitle}>{'\u7d27\u6025\u6c42\u52a9'}</Text>
        </View>
        <TouchableOpacity style={styles.regionBtn} onPress={() => setShowRegionModal(true)} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={16} color="#ef4444" />
          <Text style={styles.regionText}>{getDisplayRegion()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'received' && styles.tabActive]} onPress={() => setActiveTab('received')}>
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>{'\u6536\u5230\u7684'}</Text>
          {activeTab === 'received' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'mine' && styles.tabActive]} onPress={() => setActiveTab('mine')}>
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>{'\u6211\u7684'}</Text>
          {activeTab === 'mine' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={'\u641c\u7d22\u6c42\u52a9\u6807\u9898\u3001\u5730\u70b9\u6216\u53d1\u5e03\u8005'}
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {showListLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color="#ef4444" />
              <Text style={styles.emptyText}>{'\u6682\u65e0\u54cd\u5e94\u8005'}</Text>
            </View>
          ) : filteredEmergencies.length > 0 ? (
            filteredEmergencies.map((item) => renderEmergencyCard(item))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{loadError || '\u6682\u65e0\u76f8\u5173\u6c42\u52a9\u4fe1\u606f'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showRespondersModal} transparent animationType="slide" onRequestClose={() => setShowRespondersModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRespondersModal(false)} />
          <View style={styles.respondersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'\u54cd\u5e94\u8005\u5217\u8868'}</Text>
              <TouchableOpacity onPress={() => setShowRespondersModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubTitle}>{'\u5171 ' + (selectedEmergency?.responseCount || 0) + ' \u4eba\u54cd\u5e94'}</Text>
            </View>

            <ScrollView style={styles.respondersList}>
              {respondersLoading ? (
                <View style={styles.detailLoadingRow}>
                  <ActivityIndicator color="#ef4444" size="small" />
                  <Text style={styles.detailLoadingText}>{'\u54cd\u5e94\u8005\u52a0\u8f7d\u4e2d...'}</Text>
                </View>
              ) : respondersError ? (
                <Text style={styles.commentsErrorText}>{respondersError}</Text>
              ) : selectedEmergency?.responders?.length ? selectedEmergency.responders.map((responder) => (
                <View key={responder.id || responder.userId || responder.name} style={styles.responderItem}>
                  <Avatar uri={responder.avatar || responder.avatarUrl} name={responder.name || responder.nickname} size={40} />
                  <Text style={styles.responderName}>{responder.name || responder.nickname || '\u533f\u540d\u7528\u6237'}</Text>
                </View>
              )) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{'\u6682\u65e0\u54cd\u5e94\u8005'}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDetailModal(false)} />
          <View style={[styles.detailModal, {
            paddingBottom: bottomSafeInset
          }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{'\u6c42\u52a9\u8be6\u60c5'}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator color="#ef4444" />
                <Text style={styles.emptyText}>{'详情加载中...'}</Text>
              </View>
            ) : (
              <ScrollView style={styles.detailScroll} contentContainerStyle={[styles.detailScrollContent, {
                paddingBottom: bottomSafeInset
              }]} showsVerticalScrollIndicator={false}>
                <View style={[styles.detailSection, styles.detailSummarySection]}>
                  <View style={styles.detailHeaderRow}>
                    <Avatar uri={selectedEmergencyDetail?.avatar} name={selectedEmergencyDetail?.name} size={44} />
                    <View style={styles.detailHeaderMeta}>
                      <View style={styles.detailHeaderTopRow}>
                        <Text style={styles.detailName}>{selectedEmergencyDetail?.name || '\u533f\u540d\u7528\u6237'}</Text>
                        {selectedEmergencyDetail?.canMarkResolved ? (
                          <View style={styles.detailTagNeutral}>
                            <Text style={styles.detailTagNeutralText}>{'\u53ef\u6807\u8bb0\u5df2\u89e3\u51b3'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.detailTime}>{selectedEmergencyDetail?.relativeTime || '--'}</Text>
                    </View>
                  </View>

                  <Text style={styles.detailTitle}>{selectedEmergencyDetail?.title || '\u7d27\u6025\u6c42\u52a9'}</Text>
                  <Text style={styles.detailDescription}>
                    {selectedEmergencyDetail?.description || '\u6682\u65e0\u8be6\u7ec6\u63cf\u8ff0'}
                  </Text>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'\u4f4d\u7f6e'}</Text>
                      <Text style={[styles.detailInfoValue, styles.detailInfoValueMultiline]}>{selectedEmergencyDetail?.location || '--'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'\u8ddd\u79bb'}</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.distanceLabel || '--'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'\u6551\u63f4\u4eba\u6570'}</Text>
                      <Text style={styles.detailInfoValue}>
                        {selectedEmergencyDetail?.responderCount || 0}/{selectedEmergencyDetail?.neededHelperCount || 0}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>{'\u8bc4\u8bba\u6570'}</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.commentCount || 0}</Text>
                    </View>
                  </View>

                  {showEmergencyFee ? (
                    <View style={styles.detailFeeBox}>
                      <Text style={styles.detailFeeText}>{'\u53d1\u5e03\u8d85\u989d\u8d39\uff1a' + formatCurrencyFromCents(selectedEmergencyDetail?.publishFeeCents)}</Text>
                      <Text style={styles.detailFeeText}>{'\u6551\u63f4\u8d85\u989d\u8d39\uff1a' + formatCurrencyFromCents(selectedEmergencyDetail?.helperOverageFeeCents)}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailTagsRow}>
                    {selectedEmergencyDetail?.isRescuerJoined ? (
                      <View style={styles.detailTagSuccess}>
                        <Text style={styles.detailTagSuccessText}>{'\u5df2\u54cd\u5e94'}</Text>
                      </View>
                    ) : null}
                    {selectedEmergencyDetail?.pendingReview > 0 ? (
                      <View style={styles.detailTagWarning}>
                        <Text style={styles.detailTagWarningText}>{'\u5f85\u5904\u7406 ' + selectedEmergencyDetail.pendingReview}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.detailActionStack}>
                    {selectedEmergencyDetail?.canMarkResolved ? (
                      <TouchableOpacity
                        style={[styles.resolveBtn, resolveLoading && styles.resolveBtnDisabled]}
                        onPress={handleMarkResolved}
                        disabled={resolveLoading}
                      >
                        {resolveLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-circle-outline" size={16} color="#fff" />
                            <Text style={styles.resolveBtnText}>{'\u6807\u8bb0\u4e3a\u5df2\u89e3\u51b3'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {!selectedEmergencyDetail?.isRescuerJoined && !selectedEmergencyDetail?.canMarkResolved ? (
                      <TouchableOpacity
                        style={[styles.joinBtn, joinLoadingId === String(selectedEmergencyDetail?.id || '') && styles.joinBtnDisabled]}
                        onPress={() => handleJoinRescue(selectedEmergencyDetail)}
                        disabled={joinLoadingId === String(selectedEmergencyDetail?.id || '')}
                      >
                        {joinLoadingId === String(selectedEmergencyDetail?.id || '') ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="flash" size={16} color="#fff" />
                            <Text style={styles.joinBtnText}>{'\u7acb\u5373\u54cd\u5e94'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {selectedEmergencyDetail?.isRescuerJoined ? (
                      <TouchableOpacity
                        style={[styles.leaveBtn, leaveLoading && styles.leaveBtnDisabled]}
                        onPress={handleLeaveRescue}
                        disabled={leaveLoading}
                      >
                        {leaveLoading ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="log-out-outline" size={16} color="#fff" />
                            <Text style={styles.leaveBtnText}>{'\u9000\u51fa\u6551\u63f4'}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.contactCard}>
                    <Text style={styles.contactCardTitle}>{'\u8131\u654f\u8054\u7cfb\u65b9\u5f0f'}</Text>
                    {canViewMaskedContact ? (
                      <>
                        {maskedContactInfo?.maskedContact ? (
                          <View style={styles.contactValueRow}>
                            <Text style={styles.contactTypeText}>{getContactTypeLabel(maskedContactInfo?.contactType)}</Text>
                            <Text style={styles.contactValueText}>{maskedContactInfo.maskedContact}</Text>
                          </View>
                        ) : (
                          <Text style={styles.contactHintText}>{'\u70b9\u51fb\u6309\u94ae\u540e\u53ef\u67e5\u770b\u8131\u654f\u8054\u7cfb\u65b9\u5f0f'}</Text>
                        )}
                        <TouchableOpacity
                          style={[styles.contactBtn, contactLoading && styles.contactBtnDisabled]}
                          onPress={handleLoadMaskedContact}
                          disabled={contactLoading}
                        >
                          {contactLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="call-outline" size={15} color="#fff" />
                              <Text style={styles.contactBtnText}>
                                {maskedContactInfo?.maskedContact ? '\u5237\u65b0\u8054\u7cfb\u65b9\u5f0f' : '\u67e5\u770b\u8054\u7cfb\u65b9\u5f0f'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.contactPermissionText}>{'\u52a0\u5165\u6551\u63f4\u6216\u7531\u53d1\u5e03\u8005\u672c\u4eba\u64cd\u4f5c\u540e\uff0c\u624d\u53ef\u67e5\u770b\u8131\u654f\u8054\u7cfb\u65b9\u5f0f'}</Text>
                    )}
                    {contactError ? <Text style={styles.contactErrorText}>{contactError}</Text> : null}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{'\u7559\u8a00\u5217\u8868'}</Text>
                  <View style={styles.commentComposer}>
                    <TextInput
                      style={styles.commentInput}
                      value={commentDraft}
                      onChangeText={setCommentDraft}
                      placeholder={'\u5199\u4e0b\u4f60\u7684\u7559\u8a00...'}
                      placeholderTextColor="#9ca3af"
                      multiline
                      maxLength={200}
                      editable={!commentSubmitting}
                    />
                    <TouchableOpacity
                      style={[styles.commentSubmitBtn, commentSubmitting && styles.commentSubmitBtnDisabled]}
                      onPress={submitComment}
                      disabled={commentSubmitting}
                    >
                      {commentSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.commentSubmitText}>{'\u53d1\u9001'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {commentsLoading ? (
                    <View style={styles.detailLoadingRow}>
                      <ActivityIndicator color="#ef4444" size="small" />
                      <Text style={styles.detailLoadingText}>{'\u7559\u8a00\u52a0\u8f7d\u4e2d...'}</Text>
                    </View>
                  ) : commentsError ? (
                    <Text style={styles.commentsErrorText}>{commentsError}</Text>
                  ) : emergencyComments.length ? (
                    emergencyComments.map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <Avatar uri={comment.avatar} name={comment.name} size={36} />
                        <View style={styles.commentMeta}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentName}>{comment.name || '\u533f\u540d\u7528\u6237'}</Text>
                            <Text style={styles.commentTime}>
                              {formatRelativeTime(comment.createTime) || comment.createTime || '--'}
                            </Text>
                          </View>
                          <Text style={styles.commentContent}>{comment.content || '\u6682\u65e0\u7559\u8a00\u5185\u5bb9'}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailEmptyText}>{'\u6682\u65e0\u7559\u8a00'}</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{'\u54cd\u5e94\u8005'}</Text>
                  {selectedEmergencyDetail?.responders?.length ? selectedEmergencyDetail.responders.map((responder) => (
                    <View key={responder.id || responder.userId} style={styles.responderItem}>
                      <Avatar uri={responder.avatar} name={responder.name} size={42} />
                      <View style={styles.responderMeta}>
                        <Text style={styles.responderName}>{responder.name || '\u533f\u540d\u7528\u6237'}</Text>
                        <Text style={styles.responderJoinTime}>{formatRelativeTime(responder.joinTime) || responder.joinTime || ''}</Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.detailEmptyText}>{'\u6682\u65e0\u54cd\u5e94\u8005'}</Text>
                  )}
                </View>

                {detailError ? <Text style={styles.detailErrorText}>{detailError}</Text> : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <RegionSelector
        visible={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  backBtn: { padding: 4 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: scaleFont(18), fontWeight: '700', color: '#1f2937' },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 18,
    backgroundColor: '#fff7f7',
  },
  regionText: { fontSize: scaleFont(14), color: '#ef4444', fontWeight: '500' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: {},
  tabText: { fontSize: scaleFont(16), color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#ef4444', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1,
  },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 36,
  },
  searchInput: { flex: 1, fontSize: scaleFont(14), color: '#374151', paddingVertical: 0 },
  content: { flex: 1 },
  listContainer: { paddingHorizontal: 14, paddingBottom: 18 },
  emergencyItem: {
    backgroundColor: '#f9f2f2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  emergencyItemHigh: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  emergencyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  emergencyHeaderContent: { marginLeft: 10, flex: 1 },
  emergencyName: { fontSize: scaleFont(15), fontWeight: '700', color: '#1f2937' },
  emergencyTime: { fontSize: scaleFont(12), color: '#9ca3af', marginTop: 2 },
  emergencyTitle: { fontSize: scaleFont(16), color: '#111827', fontWeight: '700', lineHeight: scaleFont(22), marginBottom: 10 },
  emergencyInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  emergencyInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    marginRight: 10,
  },
  emergencyLocation: { flex: 1, fontSize: scaleFont(13), color: '#4b5563' },
  emergencyDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emergencyDistanceText: { fontSize: scaleFont(12), color: '#f59e0b', fontWeight: '700' },
  emergencyFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  emergencyFooterLeft: { flex: 1, gap: 8, marginRight: 10 },
  emergencyFooterRight: { alignItems: 'flex-end', gap: 8 },
  emergencyFooterActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  emergencyRescuerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergencyRescuerText: { fontSize: scaleFont(13), color: '#4b5563' },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  detailBtnText: { fontSize: scaleFont(13), color: '#6b7280', fontWeight: '600' },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ef4444',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  respondBtnText: { fontSize: scaleFont(13), color: '#fff', fontWeight: '700' },
  ignoreBtn: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ignoreBtnText: { fontSize: scaleFont(13), color: '#6b7280', fontWeight: '600' },
  respondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  respondedBadgeText: { fontSize: scaleFont(13), color: '#16a34a', fontWeight: '600' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  completedBadgeText: { fontSize: scaleFont(13), color: '#6b7280', fontWeight: '600' },
  ignoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ignoredBadgeText: { fontSize: scaleFont(13), color: '#6b7280', fontWeight: '600' },
  responseCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  responseCountText: { fontSize: scaleFont(12), color: '#2563eb', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: scaleFont(14), color: '#9ca3af', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: modalTokens.overlay },
  respondersModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '65%',
    paddingBottom: 24,
  },
  detailModal: {
    backgroundColor: detailColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  detailScroll: { maxHeight: 680 },
  detailScrollContent: {
    paddingTop: detailSpacing.page,
  },
  detailSection: {
    backgroundColor: detailColors.card,
    borderWidth: 1,
    borderColor: detailColors.border,
    borderRadius: 18,
    marginHorizontal: detailSpacing.page,
    marginBottom: detailSpacing.section,
    paddingHorizontal: detailSpacing.page,
    paddingVertical: detailSpacing.page,
    gap: detailSpacing.item,
  },
  detailSummarySection: {
    marginTop: 0,
  },
  detailSectionTitle: { fontSize: scaleFont(detailFontSize.sectionTitle), fontWeight: '700', color: detailColors.textPrimary },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailHeaderMeta: { flex: 1 },
  detailHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailName: { flex: 1, fontSize: scaleFont(16), color: detailColors.textPrimary, fontWeight: '600' },
  detailTime: { fontSize: scaleFont(detailFontSize.small), color: detailColors.textTertiary, marginTop: 3 },
  detailTitle: { fontSize: scaleFont(21), color: detailColors.textPrimary, fontWeight: '700', lineHeight: scaleFont(28), marginTop: 2 },
  detailDescription: { fontSize: scaleFont(15), color: detailColors.textSecondary, lineHeight: scaleFont(23) },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 2,
  },
  detailInfoItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  detailInfoLabel: { fontSize: scaleFont(detailFontSize.label), color: detailColors.textTertiary, marginBottom: 6 },
  detailInfoValue: { fontSize: scaleFont(15), color: detailColors.textPrimary, fontWeight: '500', lineHeight: scaleFont(22) },
  detailInfoValueMultiline: {
    flexShrink: 1,
  },
  detailFeeBox: {
    backgroundColor: detailColors.warningBg,
    borderColor: detailColors.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  detailFeeText: { fontSize: scaleFont(14), color: detailColors.warningText, fontWeight: '600' },
  detailTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTagSuccess: {
    backgroundColor: detailColors.successSoft,
    borderColor: detailColors.successBorder,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailTagSuccessText: { fontSize: scaleFont(13), color: detailColors.success, fontWeight: '600' },
  detailTagNeutral: {
    backgroundColor: detailColors.blueBg,
    borderColor: detailColors.blueBorder,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailTagNeutralText: { fontSize: scaleFont(13), color: detailColors.blueText, fontWeight: '600' },
  detailTagWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailTagWarningText: { fontSize: scaleFont(13), color: '#D97706', fontWeight: '600' },
  detailActionStack: {
    gap: 10,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: detailColors.success,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  resolveBtnDisabled: { opacity: 0.7 },
  resolveBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: detailColors.danger,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  leaveBtnDisabled: { opacity: 0.7 },
  leaveBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
  contactCard: {
    backgroundColor: detailColors.card,
    borderWidth: 1,
    borderColor: detailColors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactCardTitle: { fontSize: scaleFont(16), color: detailColors.textPrimary, fontWeight: '700' },
  contactHintText: { fontSize: scaleFont(13), color: detailColors.textSecondary, lineHeight: scaleFont(20) },
  contactPermissionText: { fontSize: scaleFont(13), color: detailColors.textTertiary, lineHeight: scaleFont(20) },
  contactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: detailColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactTypeText: { fontSize: scaleFont(13), color: detailColors.textSecondary, fontWeight: '600' },
  contactValueText: { fontSize: scaleFont(15), color: detailColors.textPrimary, fontWeight: '700', flex: 1, textAlign: 'right' },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: detailColors.danger,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contactBtnDisabled: { opacity: 0.7 },
  contactBtnText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  contactErrorText: { fontSize: scaleFont(13), color: detailColors.danger, lineHeight: scaleFont(18) },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: detailSpacing.page,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  modalTitle: { fontSize: scaleFont(18), fontWeight: '700', color: detailColors.textPrimary },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  modalSubTitle: { fontSize: scaleFont(15), color: detailColors.textSecondary },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  detailLoadingText: { fontSize: scaleFont(14), color: detailColors.textSecondary },
  commentsErrorText: { fontSize: scaleFont(14), color: detailColors.danger, lineHeight: scaleFont(20), textAlign: 'center' },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentMeta: { flex: 1, gap: 6 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentName: { fontSize: scaleFont(15), color: detailColors.textPrimary, fontWeight: '600' },
  commentTime: { fontSize: scaleFont(12), color: detailColors.textTertiary },
  commentContent: { fontSize: scaleFont(15), color: '#374151', lineHeight: scaleFont(22) },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 112,
    fontSize: scaleFont(14),
    color: detailColors.textPrimary,
    backgroundColor: detailColors.background,
    borderWidth: 1,
    borderColor: detailColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    textAlignVertical: 'top',
  },
  commentSubmitBtn: {
    width: 62,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: detailColors.danger,
    paddingHorizontal: 12,
  },
  commentSubmitBtnDisabled: { opacity: 0.7 },
  commentSubmitText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600',
  },
  respondersList: { maxHeight: 320 },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  responderMeta: { flex: 1, gap: 4 },
  responderName: { fontSize: scaleFont(15), color: detailColors.textPrimary, fontWeight: '600' },
  responderJoinTime: { fontSize: scaleFont(12), color: detailColors.textTertiary },
  detailEmptyText: { fontSize: scaleFont(14), color: detailColors.textTertiary, textAlign: 'center' },
  detailErrorText: {
    marginTop: 2,
    marginHorizontal: detailSpacing.page,
    marginBottom: detailSpacing.section,
    fontSize: scaleFont(14),
    color: detailColors.danger,
    lineHeight: scaleFont(20),
  },
});


