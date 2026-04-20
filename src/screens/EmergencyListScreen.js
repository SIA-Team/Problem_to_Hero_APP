import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import RegionSelector from '../components/RegionSelector';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
import { useEmergency } from '../contexts/EmergencyContext';
import emergencyApi from '../services/api/emergencyApi';

const isSuccessResponse = (response) => response && (response.code === 200 || response.code === 0);

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;

  return `${date.getMonth() + 1}-${date.getDate()}`;
};

const normalizeEmergencyItem = (item = {}, index = 0) => {
  const id = item?.id ?? item?.helpId ?? item?.emergencyId ?? `emergency-${index}`;
  const rescuerCount = Math.max(0, Math.round(toSafeNumber(item?.neededHelperCount ?? item?.rescuerCount)));
  const respondedCount = Math.max(0, Math.round(toSafeNumber(item?.respondedHelperCount ?? item?.respondedCount ?? item?.currentHelperCount)));
  const rawTime = item?.createTime ?? item?.publishTime ?? item?.gmtCreate ?? item?.createdAt ?? item?.timestamp;

  return {
    id: String(id),
    avatar: item?.avatar || item?.avatarUrl || item?.userAvatar || '',
    name: item?.nickname || item?.userName || item?.username || item?.name || `User ${id}`,
    title: item?.title || item?.description || '紧急求助',
    location: item?.regionDisplay || item?.addressText || item?.location || item?.locationText || '閺堫亞鐓℃担宥囩枂',
    distance: formatDistanceLabel(item?.distanceMeters, item?.distanceText || item?.distance),
    rescuerCount,
    respondedCount,
    time: formatRelativeTime(rawTime),
    status: item?.status || '',
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
    name: item?.nickName || item?.nickname || item?.name || '閸栧灝鎮曢悽銊﹀煕',
    avatar: item?.avatar || item?.avatarUrl || '',
    joinTime: item?.joinTime || '',
  };
};

const formatCurrencyFromCents = (value) => {
  const cents = Math.max(0, Math.round(toSafeNumber(value, 0)));
  return `妤?{(cents / 100).toFixed(2)}`;
};

const normalizeEmergencyDetail = (detail = {}, fallbackItem = null) => {
  const neededHelperCount = Math.max(0, Math.round(toSafeNumber(detail?.neededHelperCount, fallbackItem?.rescuerCount || 0)));
  const responderCount = Math.max(0, Math.round(toSafeNumber(detail?.responderCount, fallbackItem?.respondedCount || 0)));
  const responders = Array.isArray(detail?.responders)
    ? detail.responders.map((item, index) => normalizeResponderItem(item, index))
    : (fallbackItem?.responders || []).map((item, index) => normalizeResponderItem(item, index));

  const locationParts = [detail?.regionDisplay, detail?.detailAddress].filter(Boolean);
  const fallbackLocation = fallbackItem?.location || '閺堫亞鐓℃担宥囩枂';

  return {
    id: String(detail?.id ?? fallbackItem?.id ?? ''),
    name: detail?.seekerNickName || fallbackItem?.name || '閸栧灝鎮曢悽銊﹀煕',
    avatar: detail?.seekerAvatar || fallbackItem?.avatar || '',
    title: detail?.title || fallbackItem?.title || '紧急求助',
    description: detail?.description || detail?.descriptionSummary || '',
    location: locationParts.length > 0 ? locationParts.join(' ') : fallbackLocation,
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
    name: comment?.nickName || comment?.nickname || comment?.name || '閸栧灝鎮曢悽銊﹀煕',
    avatar: comment?.avatar || comment?.avatarUrl || '',
    content: comment?.content || '',
    parentId: comment?.parentId,
    createTime: comment?.createTime || '',
  };
};

const getContactTypeLabel = (contactType) => {
  switch (Number(contactType)) {
    case 1:
      return '手机号';
    case 2:
      return '微信';
    case 3:
      return 'Telegram';
    case 4:
      return '邮箱';
    default:
      return '閼辨梻閮撮弬鐟扮础';
  }
};

export default function EmergencyListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('received');
  const [showRespondersModal, setShowRespondersModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
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
  const { isResponded, respondToEmergency, cancelEmergencyResponse } = useEmergency();

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  const [searchText, setSearchText] = useState('');

  const [emergencyItems, setEmergencyItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const getDisplayRegion = () => {
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    if (parts.length === 0) return '全球';
    return parts[parts.length - 1];
  };

  useEffect(() => {
    const loadEmergencyList = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const tab = activeTab === 'mine' ? 'mine' : 'all';
        const response = await emergencyApi.getList({ tab, pageNum: 1, pageSize: 20 });
        if (!isSuccessResponse(response)) {
          throw new Error(response?.msg || '閸旂姾娴囨径杈Е');
        }

        const rows = extractEmergencyListRows(response)
          .map((item, index) => normalizeEmergencyItem(item, index));

        setEmergencyItems(rows);
      } catch (error) {
        console.error('Failed to load emergency list:', error);
        setEmergencyItems([]);
        setLoadError(error?.message || '加载紧急求助失败');
      } finally {
        setLoading(false);
      }
    };

    loadEmergencyList();
  }, [activeTab]);

  const filteredEmergencies = useMemo(() => {
    if (!searchText.trim()) {
      return emergencyItems;
    }

    const keyword = searchText.trim().toLowerCase();
    return emergencyItems.filter(item =>
      String(item?.name || '').toLowerCase().includes(keyword) ||
      String(item?.title || '').toLowerCase().includes(keyword) ||
      String(item?.location || '').toLowerCase().includes(keyword)
    );
  }, [emergencyItems, searchText]);

  const handleShowResponders = (emergency) => {
    setSelectedEmergency(emergency);
    setShowRespondersModal(true);
  };

  const fetchEmergencyComments = async (emergencyId) => {
    const response = await emergencyApi.getComments(emergencyId);
    if (!isSuccessResponse(response)) {
      throw new Error(response?.msg || '鍔犺浇鐣欒█澶辫触');
    }

    const commentsRows = extractEmergencyCommentsRows(response)
      .map((comment, index) => normalizeEmergencyComment(comment, index));
    setEmergencyComments(commentsRows);
    return commentsRows;
  };

  const handleShowDetail = async (item) => {
    const id = item?.id;
    if (!id || String(id).startsWith('emergency-')) {
      showAppAlert('提示', '当前求助缺少有效ID，暂时无法加载详情');
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
          setDetailError(detailResponse?.msg || '鍔犺浇璇︽儏澶辫触');
        } else {
          const detailPayload = extractEmergencyDetailPayload(detailResponse);
          setSelectedEmergencyDetail(normalizeEmergencyDetail(detailPayload, item));
        }
      } else {
        console.error('Failed to load emergency detail:', detailResult.reason);
        setDetailError(detailResult?.reason?.message || '鍔犺浇璇︽儏澶辫触');
      }

      if (commentsResult.status === 'rejected') {
        console.error('Failed to load emergency comments:', commentsResult.reason);
        setCommentsError(commentsResult?.reason?.message || '鍔犺浇鐣欒█澶辫触');
      }
    } catch (error) {
      console.error('Failed to load emergency detail or comments:', error);
      setDetailError(error?.message || '鍔犺浇璇︽儏澶辫触');
      setCommentsError((prev) => prev || '鍔犺浇鐣欒█澶辫触');
    } finally {
      setDetailLoading(false);
      setCommentsLoading(false);
    }
  };

  const handleLoadMaskedContact = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      setContactError('当前求助ID无效，无法获取联系方式');
      return;
    }

    setContactLoading(true);
    setContactError('');

    try {
      const response = await emergencyApi.getMaskedContact(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '閼惧嘲褰囬懕鏃傞兇閺傜懓绱℃径杈Е');
      }

      const payload = extractEmergencyContactPayload(response);
      setMaskedContactInfo({
        maskedContact: payload?.maskedContact || '',
        contactType: payload?.contactType,
      });
    } catch (error) {
      console.error('Failed to load emergency masked contact:', error);
      setMaskedContactInfo(null);
      setContactError(error?.message || '閼惧嘲褰囬懕鏃傞兇閺傜懓绱℃径杈Е');
    } finally {
      setContactLoading(false);
    }
  };

  const submitComment = async () => {
    const emergencyId = String(selectedEmergencyDetail?.id || '');
    if (!emergencyId) {
      showAppAlert('提示', '当前求助ID无效，无法发表留言');
      return;
    }

    const content = commentDraft.trim();
    if (!content) {
      showAppAlert('提示', '请输入留言内容');
      return;
    }

    setCommentSubmitting(true);
    try {
      const response = await emergencyApi.createComment(emergencyId, {
        content,
        parentId: 0,
      });
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '发表留言失败');
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
      showAppAlert('成功', '留言已发表');
    } catch (error) {
      showAppAlert('失败', error?.message || '发表留言失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitJoinRescue = async (emergencyId) => {
    if (!emergencyId || String(emergencyId).startsWith('emergency-')) {
      showAppAlert('提示', '当前求助ID无效，无法加入救援');
      return;
    }

    const normalizedId = String(emergencyId);
    setJoinLoadingId(normalizedId);
    try {
      const response = await emergencyApi.joinHelp(normalizedId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '加入救援失败');
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
      showAppAlert('成功', '已加入救援，请尽快前往现场');
    } catch (error) {
      console.error('Failed to join emergency help:', error);
      showAppAlert('失败', error?.message || '标记失败，请稍后重试');
    } finally {
      setJoinLoadingId('');
    }
  };

  const handleJoinRescue = (item) => {
    showAppAlert('确认响应', `确定要响应 ${item?.name || ''} 的紧急求助吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '立即响应', onPress: () => { void submitJoinRescue(item?.id); } },
    ]);
  };

  const submitMarkResolved = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      showAppAlert('提示', '当前求助ID无效，无法标记');
      return;
    }

    setResolveLoading(true);
    try {
      const response = await emergencyApi.resolveHelp(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '标记失败');
      }

      setSelectedEmergencyDetail((prev) => ({
        ...(prev || {}),
        canMarkResolved: false,
      }));
      setEmergencyItems((prev) => prev.filter((item) => String(item.id) !== String(emergencyId)));
      showAppAlert('成功', '已标记为已解决');
      setShowDetailModal(false);
    } catch (error) {
      console.error('Failed to resolve emergency help:', error);
      showAppAlert('失败', error?.message || '标记失败，请稍后重试');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleMarkResolved = () => {
    showAppAlert('确认', '确定将该求助标记为已解决吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => { void submitMarkResolved(); } },
    ]);
  };

  const submitLeaveRescue = async () => {
    const emergencyId = selectedEmergencyDetail?.id;
    if (!emergencyId) {
      showAppAlert('提示', '当前求助ID无效，无法退出救援');
      return;
    }

    setLeaveLoading(true);
    try {
      const response = await emergencyApi.leaveHelp(emergencyId);
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '退出救援失败');
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
      showAppAlert('成功', '已退出救援');
    } catch (error) {
      console.error('Failed to leave emergency help:', error);
      showAppAlert('失败', error?.message || '退出救援失败，请稍后重试');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLeaveRescue = () => {
    showAppAlert('确认', '确定要退出当前救援吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: () => { void submitLeaveRescue(); } },
    ]);
  };

  const renderEmergencyCard = (item) => {
    const isCompleted = item.respondedCount >= item.rescuerCount && item.rescuerCount > 0;
    const userResponded = isResponded(item.id) || isResponded(String(item.id));
    const showMineAction = activeTab === 'mine';

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
              <Text style={styles.emergencyRescuerText}>闂団偓鐟?{item.rescuerCount} 娴滅儤鏅抽幓?</Text>
            </View>
            <TouchableOpacity style={styles.detailBtn} onPress={() => handleShowDetail(item)}>
              <Ionicons name="document-text-outline" size={14} color="#6b7280" />
              <Text style={styles.detailBtnText}>閺屻儳婀呯拠锔藉剰</Text>
            </TouchableOpacity>
          </View>

          {userResponded ? (
            <View style={styles.respondedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text style={styles.respondedBadgeText}>瀹告彃鎼锋惔?</Text>
            </View>
          ) : isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#6b7280" />
              <Text style={styles.completedBadgeText}>瀹稿弶寮ч崨?</Text>
            </View>
          ) : showMineAction ? (
            <TouchableOpacity style={styles.responseCountBtn} onPress={() => handleShowResponders(item)}>
              <Ionicons name="people" size={16} color="#3b82f6" />
              <Text style={styles.responseCountText}>{item.responseCount}娴滃搫鎼锋惔?</Text>
              <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.respondBtn}
              onPress={() => handleJoinRescue(item)}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.respondBtnText}>缁斿宓嗛崫宥呯安</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const canViewMaskedContact = Boolean(
    selectedEmergencyDetail?.isRescuerJoined || selectedEmergencyDetail?.canMarkResolved
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.headerTitle}>缁毖勨偓銉︾湴閸?</Text>
        </View>
        <TouchableOpacity style={styles.regionBtn} onPress={() => setShowRegionModal(true)} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={16} color="#ef4444" />
          <Text style={styles.regionText}>{getDisplayRegion()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'received' && styles.tabActive]} onPress={() => setActiveTab('received')}>
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>瀹稿弶甯撮弨?</Text>
          {activeTab === 'received' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'mine' && styles.tabActive]} onPress={() => setActiveTab('mine')}>
          <Text style={[styles.tabText, activeTab === 'mine' && styles.tabTextActive]}>我的</Text>
          {activeTab === 'mine' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="閹兼粎鍌ㄥЧ鍌氬И閺嶅洭顣介妴浣割潣閸氬秵鍨ㄩ崷鎵仯"
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
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color="#ef4444" />
              <Text style={styles.emptyText}>閸旂姾娴囨稉?..</Text>
            </View>
          ) : filteredEmergencies.length > 0 ? (
            filteredEmergencies.map((item) => renderEmergencyCard(item))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{loadError || '未找到相关求助信息'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showRespondersModal} transparent animationType="slide" onRequestClose={() => setShowRespondersModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowRespondersModal(false)} />
          <View style={styles.respondersModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>閸濆秴绨叉禍鍝勫灙鐞?</Text>
              <TouchableOpacity onPress={() => setShowRespondersModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubTitle}>閸?{selectedEmergency?.responseCount || 0} 娴滃搫鎼锋惔?</Text>
            </View>

            <ScrollView style={styles.respondersList}>
              {selectedEmergency?.responders?.length ? selectedEmergency.responders.map((responder) => (
                <View key={responder.id || responder.userId || responder.name} style={styles.responderItem}>
                  <Avatar uri={responder.avatar || responder.avatarUrl} name={responder.name || responder.nickname} size={40} />
                  <Text style={styles.responderName}>{responder.name || responder.nickname || '閸栧灝鎮曢悽銊﹀煕'}</Text>
                </View>
              )) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>閺嗗倹妫ら崫宥呯安娴滅儤妲戠紒?</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDetailModal(false)} />
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>濮瑰倸濮拠锔藉剰</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator color="#ef4444" />
                <Text style={styles.emptyText}>鐠囷附鍎忛崝鐘烘祰娑?..</Text>
              </View>
            ) : (
              <ScrollView style={styles.detailScroll}>
                <View style={styles.detailSection}>
                  <View style={styles.detailHeaderRow}>
                    <Avatar uri={selectedEmergencyDetail?.avatar} name={selectedEmergencyDetail?.name} size={42} />
                    <View style={styles.detailHeaderMeta}>
                      <Text style={styles.detailName}>{selectedEmergencyDetail?.name || '閸栧灝鎮曢悽銊﹀煕'}</Text>
                      <Text style={styles.detailTime}>{selectedEmergencyDetail?.relativeTime || '--'}</Text>
                    </View>
                  </View>

                  <Text style={styles.detailTitle}>{selectedEmergencyDetail?.title || '紧急求助'}</Text>
                  <Text style={styles.detailDescription}>
                    {selectedEmergencyDetail?.description || '暂无详细描述'}
                  </Text>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>位置</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.location || '--'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>距离</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.distanceLabel || '--'}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>閺佹垶褰烘禍鐑樻殶</Text>
                      <Text style={styles.detailInfoValue}>
                        {selectedEmergencyDetail?.responderCount || 0}/{selectedEmergencyDetail?.neededHelperCount || 0}
                      </Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>鐠囧嫯顔戦弫?</Text>
                      <Text style={styles.detailInfoValue}>{selectedEmergencyDetail?.commentCount || 0}</Text>
                    </View>
                  </View>

                  <View style={styles.detailFeeBox}>
                    <Text style={styles.detailFeeText}>发布超额费：{formatCurrencyFromCents(selectedEmergencyDetail?.publishFeeCents)}</Text>
                    <Text style={styles.detailFeeText}>救援超额费：{formatCurrencyFromCents(selectedEmergencyDetail?.helperOverageFeeCents)}</Text>
                  </View>

                  <View style={styles.detailTagsRow}>
                    {selectedEmergencyDetail?.isRescuerJoined ? (
                      <View style={styles.detailTagSuccess}>
                        <Text style={styles.detailTagSuccessText}>瀹告彃鎼锋惔?</Text>
                      </View>
                    ) : null}
                    {selectedEmergencyDetail?.canMarkResolved ? (
                      <View style={styles.detailTagNeutral}>
                        <Text style={styles.detailTagNeutralText}>閸欘垱鐖ｇ拋鏉跨暚閹?</Text>
                      </View>
                    ) : null}
                    {selectedEmergencyDetail?.pendingReview > 0 ? (
                      <View style={styles.detailTagWarning}>
                        <Text style={styles.detailTagWarningText}>瀵板懎顓搁弽?{selectedEmergencyDetail.pendingReview}</Text>
                      </View>
                    ) : null}
                  </View>

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
                          <Text style={styles.resolveBtnText}>标记为已解决</Text>
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
                          <Text style={styles.joinBtnText}>閸旂姴鍙嗛弫鎴炲胶</Text>
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
                          <Text style={styles.leaveBtnText}>闁偓閸戠儤鏅抽幓?</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.contactCard}>
                    <Text style={styles.contactCardTitle}>脱敏联系方式</Text>
                    {canViewMaskedContact ? (
                      <>
                        {maskedContactInfo?.maskedContact ? (
                          <View style={styles.contactValueRow}>
                            <Text style={styles.contactTypeText}>{getContactTypeLabel(maskedContactInfo?.contactType)}</Text>
                            <Text style={styles.contactValueText}>{maskedContactInfo.maskedContact}</Text>
                          </View>
                        ) : (
                          <Text style={styles.contactHintText}>点击按钮后可查看脱敏联系方式</Text>
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
                                {maskedContactInfo?.maskedContact ? '刷新联系方式' : '查看联系方式'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.contactPermissionText}>娴犲懏鐪伴崝鈺�姹夐幋鏍у嚒閸欏倷绗岄弫鎴炲胶閼板懎褰查弻銉ф箙閼辨梻閮撮弬鐟扮础</Text>
                    )}
                    {contactError ? <Text style={styles.contactErrorText}>{contactError}</Text> : null}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>鐣欒█鍒楄〃</Text>
                  <View style={styles.commentComposer}>
                    <TextInput
                      style={styles.commentInput}
                      value={commentDraft}
                      onChangeText={setCommentDraft}
                      placeholder="鍐欎笅浣犵殑鐣欒█..."
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
                        <Text style={styles.commentSubmitText}>发送</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {commentsLoading ? (
                    <View style={styles.detailLoadingRow}>
                      <ActivityIndicator color="#ef4444" size="small" />
                      <Text style={styles.detailLoadingText}>鐣欒█鍔犺浇涓?..</Text>
                    </View>
                  ) : commentsError ? (
                    <Text style={styles.commentsErrorText}>{commentsError}</Text>
                  ) : emergencyComments.length ? (
                    emergencyComments.map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <Avatar uri={comment.avatar} name={comment.name} size={34} />
                        <View style={styles.commentMeta}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentName}>{comment.name || '鍖垮悕鐢ㄦ埛'}</Text>
                            <Text style={styles.commentTime}>
                              {formatRelativeTime(comment.createTime) || comment.createTime || '--'}
                            </Text>
                          </View>
                          <Text style={styles.commentContent}>{comment.content || '鏆傛棤鐣欒█鍐呭'}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailEmptyText}>鏆傛棤鐣欒█</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>閸濆秴绨叉禍?</Text>
                  {selectedEmergencyDetail?.responders?.length ? selectedEmergencyDetail.responders.map((responder) => (
                    <View key={responder.id || responder.userId} style={styles.responderItem}>
                      <Avatar uri={responder.avatar} name={responder.name} size={38} />
                      <View style={styles.responderMeta}>
                        <Text style={styles.responderName}>{responder.name || '閸栧灝鎮曢悽銊﹀煕'}</Text>
                        <Text style={styles.responderJoinTime}>{formatRelativeTime(responder.joinTime) || responder.joinTime || ''}</Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.detailEmptyText}>閺嗗倹妫ら崫宥呯安娴?</Text>
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
  headerTitle: { fontSize: scaleFont(24), fontWeight: '700', color: '#1f2937' },
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
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  emergencyHeaderContent: { marginLeft: 10, flex: 1 },
  emergencyName: { fontSize: scaleFont(24), fontWeight: '700', color: '#1f2937' },
  emergencyTime: { fontSize: scaleFont(20), color: '#9ca3af', marginTop: 2 },
  emergencyTitle: { fontSize: scaleFont(28), color: '#111827', fontWeight: '700', lineHeight: scaleFont(34), marginBottom: 10 },
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
  emergencyLocation: { flex: 1, fontSize: scaleFont(20), color: '#4b5563' },
  emergencyDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emergencyDistanceText: { fontSize: scaleFont(20), color: '#f59e0b', fontWeight: '700' },
  emergencyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emergencyFooterLeft: { gap: 8 },
  emergencyRescuerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergencyRescuerText: { fontSize: scaleFont(20), color: '#4b5563' },
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
  detailBtnText: { fontSize: scaleFont(16), color: '#6b7280', fontWeight: '600' },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  respondBtnText: { fontSize: scaleFont(20), color: '#fff', fontWeight: '700' },
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
  respondedBadgeText: { fontSize: scaleFont(18), color: '#16a34a', fontWeight: '600' },
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
  completedBadgeText: { fontSize: scaleFont(18), color: '#6b7280', fontWeight: '600' },
  responseCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  responseCountText: { fontSize: scaleFont(18), color: '#2563eb', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: scaleFont(18), color: '#9ca3af', textAlign: 'center' },
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '82%',
    paddingBottom: 24,
  },
  detailScroll: { maxHeight: 560 },
  detailSection: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  detailSectionTitle: { fontSize: scaleFont(18), fontWeight: '700', color: '#111827' },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailHeaderMeta: { flex: 1 },
  detailName: { fontSize: scaleFont(18), color: '#111827', fontWeight: '700' },
  detailTime: { fontSize: scaleFont(14), color: '#9ca3af', marginTop: 2 },
  detailTitle: { fontSize: scaleFont(22), color: '#111827', fontWeight: '700', lineHeight: scaleFont(28) },
  detailDescription: { fontSize: scaleFont(16), color: '#4b5563', lineHeight: scaleFont(24) },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  detailInfoItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  detailInfoLabel: { fontSize: scaleFont(14), color: '#9ca3af', marginBottom: 4 },
  detailInfoValue: { fontSize: scaleFont(16), color: '#111827', fontWeight: '600' },
  detailFeeBox: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  detailFeeText: { fontSize: scaleFont(15), color: '#c2410c', fontWeight: '600' },
  detailTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTagSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailTagSuccessText: { fontSize: scaleFont(14), color: '#16a34a', fontWeight: '600' },
  detailTagNeutral: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailTagNeutralText: { fontSize: scaleFont(14), color: '#2563eb', fontWeight: '600' },
  detailTagWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  detailTagWarningText: { fontSize: scaleFont(14), color: '#d97706', fontWeight: '600' },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  resolveBtnDisabled: { opacity: 0.7 },
  resolveBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '700' },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '700' },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  leaveBtnDisabled: { opacity: 0.7 },
  leaveBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '700' },
  contactCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  contactCardTitle: { fontSize: scaleFont(16), color: '#111827', fontWeight: '700' },
  contactHintText: { fontSize: scaleFont(14), color: '#6b7280' },
  contactPermissionText: { fontSize: scaleFont(14), color: '#9ca3af' },
  contactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  contactTypeText: { fontSize: scaleFont(14), color: '#6b7280', fontWeight: '600' },
  contactValueText: { fontSize: scaleFont(15), color: '#111827', fontWeight: '700' },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactBtnDisabled: { opacity: 0.7 },
  contactBtnText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '700' },
  contactErrorText: { fontSize: scaleFont(13), color: '#ef4444', lineHeight: scaleFont(18) },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: scaleFont(20), fontWeight: '700', color: '#111827' },
  modalCloseBtn: { padding: 2 },
  modalSubHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  modalSubTitle: { fontSize: scaleFont(16), color: '#6b7280' },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  detailLoadingText: { fontSize: scaleFont(14), color: '#6b7280' },
  commentsErrorText: { fontSize: scaleFont(14), color: '#ef4444', lineHeight: scaleFont(20) },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  commentMeta: { flex: 1, gap: 4 },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentName: { fontSize: scaleFont(15), color: '#111827', fontWeight: '600' },
  commentTime: { fontSize: scaleFont(13), color: '#9ca3af' },
  commentContent: { fontSize: scaleFont(15), color: '#374151', lineHeight: scaleFont(22) },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 90,
    fontSize: scaleFont(14),
    color: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlignVertical: "top",
  },
  commentSubmitBtn: {
    minWidth: 58,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
  },
  commentSubmitBtnDisabled: { opacity: 0.7 },
  commentSubmitText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '700',
  },
  respondersList: { maxHeight: 320 },
  responderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  responderMeta: { flex: 1, gap: 2 },
  responderName: { fontSize: scaleFont(18), color: '#1f2937', fontWeight: '600' },
  responderJoinTime: { fontSize: scaleFont(14), color: '#9ca3af' },
  detailEmptyText: { fontSize: scaleFont(15), color: '#9ca3af' },
  detailErrorText: {
    marginTop: 10,
    marginHorizontal: 16,
    fontSize: scaleFont(14),
    color: '#ef4444',
    lineHeight: scaleFont(20),
  },
});


