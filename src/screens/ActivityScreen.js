import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
import activityApi from '../services/api/activityApi';
import {
  applyActivityJoinOverrides,
  loadActivityJoinOverrides,
  markActivityJoinedOverride,
  removeActivityJoinedOverride,
} from '../utils/activityJoinState';
import {
  getActivityImages,
  getActivityOwnerUserId,
  getKnownJoinedActivityState,
  getJoinedActivityStateFromResponse,
  getQuitActivityState,
  getQuitActivityStateFromResponse,
  isActivityOwnedByCurrentUser,
  isActivityJoined,
  normalizeActivityItem,
  normalizeActivityList,
} from '../utils/activityUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ACTIVITY_INTERNAL_ERROR_PATTERN =
  /SQLSyntaxErrorException|Error querying database|bad SQL grammar|doesn't exist|app_active/i;
const ACTIVITY_ALREADY_JOINED_PATTERN = /已[参与参]加|您以参与该活动|already\s*(joined|participated?)/i;
const DEFAULT_ACTIVITY_TAB = 'all';
const ACTIVITY_CACHE_TTL = 60 * 1000;
const ACTIVITY_TABS = ['all', 'hot', 'new', 'ended', 'my', 'history'];
const ACTIVITY_DEBUG_TITLE = '\u7167\u7247\u662f\u5426\u6b63\u5e38';
const ACTIVITY_DEBUG_KEYWORDS = ['\u7167\u7247', '\u6b63\u5e38'];
const ACTIVITY_CANCEL_LABEL = '\u53d6\u6d88\u62a5\u540d';
const ACTIVITY_CANCELLING_LABEL = '\u53d6\u6d88\u4e2d...';
const ACTIVITY_OWNER_BADGE_LABEL = '\u53d1\u8d77\u4eba';

const normalizeIdentityValue = value => String(value ?? '').trim();

const getCurrentUserIdCandidates = userInfo =>
  Array.from(
    new Set(
      [
        userInfo?.userId,
        userInfo?.appUserId,
        userInfo?.app_user_id,
        userInfo?.id,
        userInfo?.uid,
        userInfo?.user?.id,
        userInfo?.userBaseInfo?.userId,
        userInfo?.userBaseInfo?.appUserId,
        userInfo?.userBaseInfo?.id,
        userInfo?.userBaseInfo?.uid,
      ]
        .map(normalizeIdentityValue)
        .filter(Boolean)
    )
  );

const isActivitySponsorMatchedToCurrentUser = (activity, currentUserIds = []) => {
  const sponsorId = normalizeIdentityValue(activity?.sponsor?.id ?? activity?.sponsorId);
  if (!sponsorId || !Array.isArray(currentUserIds)) {
    return false;
  }

  return currentUserIds.map(normalizeIdentityValue).includes(sponsorId);
};

const shouldResolveActivityOwnerBeforeAction = (activity, currentUserIds = [], currentUserNames = []) => {
  const hasCurrentUserIdentity = currentUserIds.length > 0 || currentUserNames.length > 0;
  if (!hasCurrentUserIdentity || !isActivityJoined(activity)) {
    return false;
  }

  const hasOwnerId = Boolean(getActivityOwnerUserId(activity));
  const hasOwnerName = Boolean(
    String(activity?.sponsorName || activity?.organizerName || activity?.organizer || '').trim()
  );

  return !hasOwnerId || !hasOwnerName;
};

const normalizeKeyword = value => (typeof value === 'string' ? value.trim() : '');
const isAlreadyJoinedActivityMessage = value => {
  const normalizedValue = String(value || '').trim();

  return (
    ACTIVITY_ALREADY_JOINED_PATTERN.test(normalizedValue) ||
    normalizedValue.includes('\u5df2\u53c2\u4e0e') ||
    normalizedValue.includes('\u5df2\u53c2\u52a0') ||
    normalizedValue.includes('\u60a8\u5df2\u53c2\u4e0e\u8be5\u6d3b\u52a8')
  );
};
const getJoinFeedbackMessage = (error, fallbackMessage = '') =>
  getRequestErrorMessage(error, fallbackMessage);

const normalizeActivityTab = value => {
  const normalizedValue = String(value || '').trim();
  return ACTIVITY_TABS.includes(normalizedValue) ? normalizedValue : DEFAULT_ACTIVITY_TAB;
};

const normalizeActivityQueryParams = params => {
  const normalizedParams = {
    tab: normalizeActivityTab(params?.tab),
  };

  const parsedType = Number(params?.type);
  if (parsedType === 1 || parsedType === 2) {
    normalizedParams.type = parsedType;
  }

  const keyword = normalizeKeyword(params?.keyword);
  if (keyword) {
    normalizedParams.keyword = keyword;
  }

  return normalizedParams;
};

const buildActivityCacheKey = params =>
  [
    normalizeActivityTab(params?.tab),
    params?.type ?? '',
    encodeURIComponent(params?.keyword || ''),
  ].join('|');

const getTabFromActivityCacheKey = cacheKey => String(cacheKey || '').split('|')[0] || DEFAULT_ACTIVITY_TAB;

const getObjectKeysPreview = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).slice(0, 20);
};

const extractActivityRowsFromResponse = response => {
  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  if (Array.isArray(response?.data?.rows)) {
    return response.data.rows;
  }

  if (Array.isArray(response?.data?.list)) {
    return response.data.list;
  }

  if (Array.isArray(response?.data?.records)) {
    return response.data.records;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response)) {
    return response;
  }

  const candidates = [
    response?.data,
    response?.result,
    response?.page?.records,
    response?.page?.list,
    response?.page?.items,
  ];

  return candidates.find(Array.isArray) || [];
};

const createActivityCacheEntry = (response, joinedOverrideMap = {}) => {
  const rawRows = extractActivityRowsFromResponse(response);
  const rows = normalizeActivityList(applyActivityJoinOverrides(rawRows, joinedOverrideMap));
  const total = Number(
    response?.total ??
    response?.data?.total ??
    response?.data?.count ??
    response?.data?.recordsTotal
  );

  return {
    rawRows,
    rows,
    total: Number.isFinite(total) ? total : rows.length,
    fetchedAt: Date.now(),
  };
};

const logActivityResponseShape = ({ params, response }) => {
  const topLevelKeys = getObjectKeysPreview(response);
  const dataKeys = getObjectKeysPreview(response?.data);
  const resultKeys = getObjectKeysPreview(response?.result);
  const pageKeys = getObjectKeysPreview(response?.page);

  console.log('[ActivityDebug] response meta =');
  console.log(
    JSON.stringify(
      {
        query: params,
        code: response?.code,
        msg: response?.msg ?? response?.message ?? null,
        topLevelKeys,
        dataKeys,
        resultKeys,
        pageKeys,
        dataType: Array.isArray(response?.data) ? 'array' : typeof response?.data,
        rowsLength: Array.isArray(response?.rows) ? response.rows.length : null,
        dataRowsLength: Array.isArray(response?.data?.rows) ? response.data.rows.length : null,
        dataListLength: Array.isArray(response?.data?.list) ? response.data.list.length : null,
        dataRecordsLength: Array.isArray(response?.data?.records) ? response.data.records.length : null,
        dataItemsLength: Array.isArray(response?.data?.items) ? response.data.items.length : null,
        dataArrayLength: Array.isArray(response?.data) ? response.data.length : null,
      },
      null,
      2
    )
  );
};

const logActivityDebugSnapshot = ({
  stage,
  params,
  cacheKey,
  rawRows = [],
  rows = [],
}) => {
  const rawPreviewRows = Array.isArray(rawRows)
    ? rawRows.slice(0, 8).map(item => ({
        id: item?.id,
        title: item?.title,
        isJoined: item?.isJoined,
        joinStatus: item?.joinStatus,
        joined: item?.joined,
        coverImage: item?.coverImage,
        image: item?.image,
        imageUrl: item?.imageUrl,
        imageUrls: item?.imageUrls,
        images: item?.images,
      }))
    : [];
  const normalizedPreviewRows = Array.isArray(rows)
    ? rows.slice(0, 8).map(item => ({
        id: item?.id,
        title: item?.title,
        isJoined: item?.isJoined,
        joinStatus: item?.joinStatus,
        joined: item?.joined,
        image: item?.image,
        coverImage: item?.coverImage,
        images: item?.images,
      }))
    : [];
  const matchedRawRows = Array.isArray(rawRows)
    ? rawRows.filter(item => {
        const title = String(item?.title || '').trim();
        return (
          title === ACTIVITY_DEBUG_TITLE ||
          ACTIVITY_DEBUG_KEYWORDS.some(keyword => title.includes(keyword))
        );
      })
    : [];
  const matchedRows = Array.isArray(rows)
    ? rows.filter(item => {
        const title = String(item?.title || '').trim();
        return (
          title === ACTIVITY_DEBUG_TITLE ||
          ACTIVITY_DEBUG_KEYWORDS.some(keyword => title.includes(keyword))
        );
      })
    : [];
  const matchedRawRow = Array.isArray(rawRows)
    ? matchedRawRows[0] || null
    : null;
  const matchedRow = Array.isArray(rows)
    ? matchedRows[0] || null
    : null;

  console.log(`[ActivityDebug] stage=${stage}`);
  console.log('[ActivityDebug] query=', params);
  console.log('[ActivityDebug] cacheKey=', cacheKey);
  console.log('[ActivityDebug] rawRowCount=', Array.isArray(rawRows) ? rawRows.length : 0);
  console.log('[ActivityDebug] normalizedRowCount=', Array.isArray(rows) ? rows.length : 0);
  console.log('[ActivityDebug] raw preview rows =');
  console.log(JSON.stringify(rawPreviewRows, null, 2));
  console.log('[ActivityDebug] normalized preview rows =');
  console.log(JSON.stringify(normalizedPreviewRows, null, 2));
  console.log(
    '[ActivityDebug] raw matched titles =',
    matchedRawRows.map(item => item?.title)
  );
  console.log(
    '[ActivityDebug] normalized matched titles =',
    matchedRows.map(item => item?.title)
  );

  if (matchedRawRow) {
    console.log(`[ActivityDebug] matched raw activity "${ACTIVITY_DEBUG_TITLE}" =`);
    console.log(
      JSON.stringify(
        {
          id: matchedRawRow?.id,
          title: matchedRawRow?.title,
          coverImage: matchedRawRow?.coverImage,
          image: matchedRawRow?.image,
          imageUrl: matchedRawRow?.imageUrl,
          imageUrls: matchedRawRow?.imageUrls,
          images: matchedRawRow?.images,
          cover: matchedRawRow?.cover,
          coverUrl: matchedRawRow?.coverUrl,
          coverImg: matchedRawRow?.coverImg,
          poster: matchedRawRow?.poster,
          posterUrl: matchedRawRow?.posterUrl,
          thumbnail: matchedRawRow?.thumbnail,
          bannerImages: matchedRawRow?.bannerImages,
          gallery: matchedRawRow?.gallery,
        },
        null,
        2
      )
    );
  } else {
    console.log(`[ActivityDebug] raw activity "${ACTIVITY_DEBUG_TITLE}" not found in this response`);
  }

  if (matchedRow) {
    console.log(`[ActivityDebug] matched normalized activity "${ACTIVITY_DEBUG_TITLE}" =`);
    console.log(
      JSON.stringify(
        {
          id: matchedRow?.id,
          title: matchedRow?.title,
          image: matchedRow?.image,
          coverImage: matchedRow?.coverImage,
          images: matchedRow?.images,
        },
        null,
        2
      )
    );
  } else {
    console.log(`[ActivityDebug] normalized activity "${ACTIVITY_DEBUG_TITLE}" not found in this response`);
  }
};

const shouldDebugActivityItem = activity => {
  const title = String(activity?.title || '').trim();
  if (!title) {
    return false;
  }

  return title === ACTIVITY_DEBUG_TITLE || ACTIVITY_DEBUG_KEYWORDS.some(keyword => title.includes(keyword));
};

const isActivityCacheFresh = cacheEntry =>
  Boolean(cacheEntry) && Date.now() - cacheEntry.fetchedAt < ACTIVITY_CACHE_TTL;

const getRequestErrorMessage = (error, fallbackMessage) => {
  const candidates = [
    error?.message,
    error?.msg,
    error?.data?.msg,
    error?.data?.message,
    error?.response?.data?.msg,
    error?.response?.data?.message,
  ];

  const resolvedMessage =
    candidates.find(candidate => typeof candidate === 'string' && candidate.trim()) || fallbackMessage;

  if (ACTIVITY_INTERNAL_ERROR_PATTERN.test(resolvedMessage)) {
    return '\u6d3b\u52a8\u6570\u636e\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
  }

  return resolvedMessage;
};

const getOrganizerIcon = organizerType => {
  switch (organizerType) {
    case 'team':
      return 'people';
    case 'personal':
      return 'person';
    case 'platform':
      return 'shield-checkmark';
    default:
      return 'person';
  }
};

const getOrganizerColor = organizerType => {
  switch (organizerType) {
    case 'team':
      return '#8b5cf6';
    case 'personal':
      return '#3b82f6';
    case 'platform':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

export default function ActivityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const viewerScrollRef = useRef(null);
  const activityCacheRef = useRef(new Map());
  const activityRequestRef = useRef(new Map());
  const activityOwnerRequestRef = useRef(new Set());
  const activeQueryKeyRef = useRef('');
  const activityJoinOverridesRef = useRef({});
  const isFromProfile = Boolean(route?.params?.fromProfile);
  const parsedRouteType = Number(route?.params?.type);
  const selectedType = parsedRouteType === 1 || parsedRouteType === 2 ? parsedRouteType : null;

  const [activeTabKey, setActiveTabKey] = useState(DEFAULT_ACTIVITY_TAB);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [joiningActivityIds, setJoiningActivityIds] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserIds, setCurrentUserIds] = useState([]);
  const [currentUserNames, setCurrentUserNames] = useState([]);

  const currentTabKey = isFromProfile ? 'my' : activeTabKey;

  const tabs = useMemo(
    () => [
      { key: 'all', label: t('screens.activity.tabs.all') },
      { key: 'hot', label: t('screens.activity.tabs.hot') },
      { key: 'new', label: t('screens.activity.tabs.new') },
      { key: 'ended', label: t('screens.activity.tabs.ended') },
      { key: 'my', label: t('screens.activity.tabs.mine') },
      { key: 'history', label: t('screens.activity.tabs.history') },
    ],
    [t]
  );

  const buildCurrentActivityParams = useCallback(
    (overrides = {}) =>
      normalizeActivityQueryParams({
        tab: overrides.tab ?? currentTabKey,
        type: overrides.type ?? selectedType,
        keyword: overrides.keyword ?? searchKeyword,
      }),
    [currentTabKey, searchKeyword, selectedType]
  );

  const requestActivityQuery = useCallback(async (params, options = {}) => {
    const normalizedParams = normalizeActivityQueryParams(params);
    const cacheKey = buildActivityCacheKey(normalizedParams);
    const cachedEntry = activityCacheRef.current.get(cacheKey);

    if (!options.force && cachedEntry) {
      return cachedEntry;
    }

    if (activityRequestRef.current.has(cacheKey)) {
      return activityRequestRef.current.get(cacheKey);
    }

    const requestPromise = (async () => {
      const response = await activityApi.getActivityCenterList(normalizedParams);

      if (response?.code !== undefined && response.code !== 200) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      logActivityResponseShape({
        params: normalizedParams,
        response,
      });

      const nextCacheEntry = createActivityCacheEntry(
        response,
        activityJoinOverridesRef.current
      );
      logActivityDebugSnapshot({
        stage: 'network',
        params: normalizedParams,
        cacheKey,
        rawRows: nextCacheEntry.rawRows,
        rows: nextCacheEntry.rows,
      });
      activityCacheRef.current.set(cacheKey, nextCacheEntry);
      return nextCacheEntry;
    })();

    activityRequestRef.current.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      if (activityRequestRef.current.get(cacheKey) === requestPromise) {
        activityRequestRef.current.delete(cacheKey);
      }
    }
  }, [t]);

  const loadActivities = useCallback(async ({ force = false, silent = false } = {}) => {
    const params = buildCurrentActivityParams();
    const cacheKey = buildActivityCacheKey(params);
    const cachedEntry = activityCacheRef.current.get(cacheKey);

    activeQueryKeyRef.current = cacheKey;

    if (cachedEntry) {
      logActivityDebugSnapshot({
        stage: 'cache',
        params,
        cacheKey,
        rawRows: cachedEntry.rawRows,
        rows: cachedEntry.rows,
      });
      setActivities(cachedEntry.rows);
      setErrorMessage('');
      setLoading(false);

      if (!force && isActivityCacheFresh(cachedEntry)) {
        setRefreshing(false);
        return;
      }
    }

    if (silent) {
      setRefreshing(true);
    } else if (!cachedEntry) {
      setActivities([]);
      setLoading(true);
    }

    try {
      const nextCacheEntry = await requestActivityQuery(params, {
        force: true,
      });

      if (activeQueryKeyRef.current === cacheKey) {
        logActivityDebugSnapshot({
          stage: 'apply',
          params,
          cacheKey,
          rawRows: nextCacheEntry.rawRows,
          rows: nextCacheEntry.rows,
        });
        setActivities(nextCacheEntry.rows);
        setErrorMessage('');
      }
    } catch (error) {
      if ((!cachedEntry || force) && activeQueryKeyRef.current === cacheKey) {
        setErrorMessage(getRequestErrorMessage(error, t('common.serverError')));
      }
    } finally {
      if (activeQueryKeyRef.current === cacheKey) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [buildCurrentActivityParams, requestActivityQuery, t]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserIdentity = async () => {
      try {
        const [userInfoRaw, currentUsername] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('currentUsername'),
        ]);

        const nextNames = [];
        let nextUserIds = [];

        if (userInfoRaw) {
          try {
            const userInfo = JSON.parse(userInfoRaw);
            nextUserIds = getCurrentUserIdCandidates(userInfo);
            nextNames.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.warn('Failed to parse current user info for activity ownership:', parseError);
          }
        }

        nextNames.push(currentUsername);

        if (!isMounted) {
          return;
        }

        const uniqueCurrentUserNames = Array.from(
          new Set(
            nextNames
              .map(item => String(item ?? '').trim())
              .filter(Boolean)
          )
        );

        setCurrentUserId(nextUserIds[0] || '');
        setCurrentUserIds(nextUserIds);
        setCurrentUserNames(uniqueCurrentUserNames);

        return {
          currentUserId: nextUserIds[0] || '',
          currentUserIds: nextUserIds,
          currentUserNames: uniqueCurrentUserNames,
        };
      } catch (storageError) {
        if (!isMounted) {
          return {
            currentUserId: '',
            currentUserIds: [],
            currentUserNames: [],
          };
        }

        console.warn('Failed to load current user identity for activity ownership:', storageError);
        setCurrentUserId('');
        setCurrentUserIds([]);
        setCurrentUserNames([]);

        return {
          currentUserId: '',
          currentUserIds: [],
          currentUserNames: [],
        };
      }
    };

    const initializeActivityState = async () => {
      const nextOverrides = await loadActivityJoinOverrides();
      await loadCurrentUserIdentity();

      if (!isMounted) {
        return;
      }

      activityJoinOverridesRef.current = nextOverrides;
      await loadActivities();
    };

    void initializeActivityState();

    return () => {
      isMounted = false;
    };
  }, [loadActivities]);

  useFocusEffect(
    useCallback(() => {
      void loadActivities({ force: true, silent: true });
    }, [loadActivities])
  );

  useEffect(() => {
    if (!showImageViewer) {
      return;
    }

    const timer = setTimeout(() => {
      viewerScrollRef.current?.scrollTo({
        x: currentImageIndex * screenWidth,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [showImageViewer, currentImageIndex]);

  const mutateActivityCaches = useCallback((mutator) => {
    setActivities(currentActivities => mutator(currentActivities, currentTabKey));

    const nextCache = new Map();
    activityCacheRef.current.forEach((cacheEntry, cacheKey) => {
      nextCache.set(cacheKey, {
        ...cacheEntry,
        rows: mutator(cacheEntry.rows, getTabFromActivityCacheKey(cacheKey)),
      });
    });

    activityCacheRef.current = nextCache;
  }, [currentTabKey]);

  const invalidateActivityTabs = useCallback((tabKeys) => {
    const targetTabs = new Set((Array.isArray(tabKeys) ? tabKeys : []).map(normalizeActivityTab));
    const nextCache = new Map();

    activityCacheRef.current.forEach((cacheEntry, cacheKey) => {
      if (!targetTabs.has(getTabFromActivityCacheKey(cacheKey))) {
        nextCache.set(cacheKey, cacheEntry);
      }
    });

    activityCacheRef.current = nextCache;
  }, []);

  const handleActivityChange = useCallback((updatedActivity) => {
    if (!updatedActivity?.id) {
      return;
    }

    mutateActivityCaches((activityList, tabKey) =>
      activityList.reduce((result, activity) => {
        if (activity.id !== updatedActivity.id) {
          result.push(activity);
          return result;
        }

        if (tabKey === 'my' && !updatedActivity.joined) {
          return result;
        }

        result.push(updatedActivity);
        return result;
      }, [])
    );

    invalidateActivityTabs(['my']);
  }, [invalidateActivityTabs, mutateActivityCaches]);

  useEffect(() => {
    const hasCurrentUserIdentity = currentUserIds.length > 0 || currentUserNames.length > 0;
    if (!hasCurrentUserIdentity || activities.length === 0) {
      return;
    }

    const candidates = activities.filter(activity => {
      if (!activity?.id || activityOwnerRequestRef.current.has(String(activity.id))) {
        return false;
      }

      if (isActivityOwnedByCurrentUser(activity, {
        currentUserId,
        currentUserIds,
        currentUserNames,
      }) || isActivitySponsorMatchedToCurrentUser(activity, currentUserIds)) {
        return false;
      }

      return shouldResolveActivityOwnerBeforeAction(activity, currentUserIds, currentUserNames);
    });

    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;

    candidates.forEach(activity => {
      const activityId = String(activity.id);
      activityOwnerRequestRef.current.add(activityId);

      void activityApi.getActivityDetail(activity.id)
        .then(response => {
          if (cancelled || Number(response?.code) !== 200) {
            return;
          }

          const detailPayload = response?.data || response?.result || response;
          const normalizedDetail = normalizeActivityItem({
            ...activity,
            ...(detailPayload || {}),
            id: detailPayload?.id ?? activity.id,
          });

          if (normalizedDetail) {
            handleActivityChange(normalizedDetail);
          }
        })
        .catch(error => {
          console.warn('Failed to resolve activity owner for list item:', error);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activities,
    currentUserId,
    currentUserIds,
    currentUserNames,
    handleActivityChange,
  ]);

  const openImageViewer = (images, initialIndex = 0) => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    setViewerImages(images);
    setCurrentImageIndex(initialIndex);
    setShowImageViewer(true);
  };

  const handleImagePress = activity => {
    openImageViewer(getActivityImages(activity), 0);
  };

  const handleOpenActivityDetail = async activity => {
    const previewImage = getActivityImages(activity)[0];

    if (previewImage) {
      await Promise.race([
        Image.prefetch(previewImage).catch(() => false),
        new Promise(resolve => setTimeout(resolve, 120)),
      ]);
    }

    navigation.navigate('ActivityDetail', {
      activity,
      onActivityChange: handleActivityChange,
    });
  };

  const updateJoiningActivityState = useCallback((activityId, isJoining) => {
    const normalizedActivityId = String(activityId || '');

    setJoiningActivityIds(currentIds => {
      if (!normalizedActivityId) {
        return currentIds;
      }

      if (isJoining) {
        return currentIds.includes(normalizedActivityId)
          ? currentIds
          : [...currentIds, normalizedActivityId];
      }

      return currentIds.filter(currentId => currentId !== normalizedActivityId);
    });
  }, []);

  const handleActivityCreated = useCallback((createdActivity) => {
    const normalizedCreatedActivity = normalizeActivityItem(createdActivity);

    activityCacheRef.current = new Map();
    activeQueryKeyRef.current = '';

    if (normalizedCreatedActivity) {
      setErrorMessage('');
    }

    void loadActivities({ force: true });
  }, [loadActivities]);

  const handleJoinActivity = useCallback(async id => {
    const targetActivity = activities.find(activity => activity.id === id);
    const normalizedActivityId = String(id || '');
    const hasJoined = isActivityJoined(targetActivity);
    const isOwnedByCurrentUser = isActivityOwnedByCurrentUser(targetActivity, {
      currentUserId,
      currentUserIds,
      currentUserNames,
    }) || isActivitySponsorMatchedToCurrentUser(targetActivity, currentUserIds);

    if (
      !targetActivity ||
      isOwnedByCurrentUser ||
      targetActivity.status === 'ended' ||
      joiningActivityIds.includes(normalizedActivityId)
    ) {
      return;
    }

    if (hasJoined) {
      showAppAlert(t('common.ok'), t('screens.activity.actions.quitConfirm'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: ACTIVITY_CANCEL_LABEL,
          onPress: async () => {
            updateJoiningActivityState(id, true);

            try {
              const response = await activityApi.cancelActivity(id);

              if (Number(response?.code) !== 200) {
                throw new Error(response?.msg || t('common.serverError'));
              }

              activityJoinOverridesRef.current = await removeActivityJoinedOverride(id);

              const cancelledActivity =
                getQuitActivityStateFromResponse(targetActivity, response?.data) ||
                getQuitActivityState(targetActivity);

              if (cancelledActivity) {
                handleActivityChange(cancelledActivity);
                return;
              }

              activityCacheRef.current = new Map();
              await loadActivities({ force: true, silent: true });
            } catch (error) {
              const feedbackMessage = getJoinFeedbackMessage(error, t('common.serverError'));
              showAppAlert(t('common.ok'), feedbackMessage);
            } finally {
              updateJoiningActivityState(id, false);
            }
          },
        },
      ]);
      return;
    }

    updateJoiningActivityState(id, true);

    try {
      const response = await activityApi.joinActivity(id);

      if (Number(response?.code) !== 200 && !isAlreadyJoinedActivityMessage(response?.msg)) {
        throw new Error(response?.msg || t('common.serverError'));
      }

      activityJoinOverridesRef.current = await markActivityJoinedOverride(id);

      const joinedActivity =
        getJoinedActivityStateFromResponse(targetActivity, response?.data) ||
        getKnownJoinedActivityState(targetActivity);
      invalidateActivityTabs(['my']);

      if (joinedActivity) {
        handleActivityChange(joinedActivity);
        return;
      }

      activityCacheRef.current = new Map();
      await loadActivities({ force: true, silent: true });
    } catch (error) {
      const feedbackMessage = getJoinFeedbackMessage(error, t('common.serverError'));

      if (isAlreadyJoinedActivityMessage(feedbackMessage)) {
        activityJoinOverridesRef.current = await markActivityJoinedOverride(id);
        const joinedActivity = getKnownJoinedActivityState(targetActivity);
        if (joinedActivity) {
          invalidateActivityTabs(['my']);
          handleActivityChange(joinedActivity);
          return;
        }
      }

      showAppAlert(t('common.ok'), feedbackMessage);
    } finally {
      updateJoiningActivityState(id, false);
    }
  }, [
    activities,
    currentUserId,
    currentUserIds,
    currentUserNames,
    handleActivityChange,
    invalidateActivityTabs,
    joiningActivityIds,
    loadActivities,
    t,
    updateJoiningActivityState,
  ]);

  const handleSubmitSearch = () => {
    const normalizedKeyword = normalizeKeyword(searchInputValue);

    if (normalizedKeyword === searchKeyword) {
      void loadActivities({ force: true });
      return;
    }

    setSearchKeyword(normalizedKeyword);
  };

  const handleClearSearch = () => {
    if (!searchInputValue && !searchKeyword) {
      return;
    }

    setSearchInputValue('');

    if (searchKeyword) {
      setSearchKeyword('');
    } else {
      void loadActivities({ force: true });
    }
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.emptyText}>{t('common.loading')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyText}>
          {errorMessage || t('screens.activity.empty')}
        </Text>
        {errorMessage ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadActivities({ force: true })}
            activeOpacity={0.85}
          >
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {isFromProfile ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <Text style={styles.headerTitle}>
          {isFromProfile ? t('screens.activity.myActivities') : t('screens.activity.title')}
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('CreateActivity', {
            onActivityCreated: handleActivityCreated,
          })}
          style={styles.createBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>{t('screens.activity.create')}</Text>
        </TouchableOpacity>
      </View>

      {!isFromProfile ? (
        <>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                value={searchInputValue}
                onChangeText={setSearchInputValue}
                onSubmitEditing={handleSubmitSearch}
                placeholder={t('screens.activity.searchPlaceholder')}
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchInputValue ? (
                <TouchableOpacity
                  style={styles.searchIconButton}
                  onPress={handleClearSearch}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.searchIconButton}
                onPress={handleSubmitSearch}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-forward-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, activeTabKey === tab.key && styles.tabItemActive]}
                  onPress={() => setActiveTabKey(tab.key)}
                >
                  <Text style={[styles.tabText, activeTabKey === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      ) : null}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadActivities({ force: true, silent: true })}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        {activities.length > 0
          ? activities.map(item => {
              const itemImages = getActivityImages(item);
              const displayImageUri = item.image || item.coverImage || itemImages[0] || '';
              const hasJoined = isActivityJoined(item);
              const isOwnedByCurrentUser = isActivityOwnedByCurrentUser(item, {
                currentUserId,
                currentUserIds,
                currentUserNames,
              }) || isActivitySponsorMatchedToCurrentUser(item, currentUserIds);
              const isResolvingOwnerBeforeAction = shouldResolveActivityOwnerBeforeAction(
                item,
                currentUserIds,
                currentUserNames
              );
              const tagLabel =
                item.tags?.[0] ||
                (item.status === 'ended'
                  ? item.statusName || t('screens.activity.tag.ended')
                  : null);
              const typeLabel =
                item.typeName ||
                (item.type ? t(`screens.activity.type.${item.type}`) : '');

              return (
                <View key={item.id} style={styles.activityCard}>
                  <TouchableOpacity
                    style={styles.coverImageContainer}
                    onPress={() => handleImagePress(item)}
                    activeOpacity={0.92}
                  >
                    {displayImageUri ? (
                      <Image
                        source={{ uri: displayImageUri }}
                        style={styles.activityImage}
                        onLoad={() => {
                          if (shouldDebugActivityItem(item)) {
                            console.log('[ActivityImageDebug] image loaded', {
                              id: item.id,
                              title: item.title,
                              displayImageUri,
                              image: item.image,
                              coverImage: item.coverImage,
                              itemImages,
                            });
                          }
                        }}
                        onError={event => {
                          console.log('[ActivityImageDebug] image failed to load', {
                            id: item.id,
                            title: item.title,
                            displayImageUri,
                            image: item.image,
                            coverImage: item.coverImage,
                            itemImages,
                            error: event?.nativeEvent,
                          });
                        }}
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={28} color="#cbd5e1" />
                      </View>
                    )}

                    {itemImages.length > 0 ? (
                      <View style={styles.previewIconBadge}>
                        <Ionicons name="expand-outline" size={14} color="#fff" />
                      </View>
                    ) : null}

                    {itemImages.length > 1 ? (
                      <View style={styles.imageCountBadge}>
                        <Ionicons name="images" size={14} color="#fff" />
                        <Text style={styles.imageCountText}>1/{itemImages.length}</Text>
                      </View>
                    ) : null}

                    {(tagLabel || typeLabel) ? (
                      <View style={styles.activityBadges}>
                        {tagLabel ? (
                          <View
                            style={[
                              styles.activityTag,
                              item.status === 'ended'
                                ? styles.activityTagEnded
                                : styles.activityTagDefault,
                            ]}
                          >
                            <Text style={styles.activityTagText}>{tagLabel}</Text>
                          </View>
                        ) : null}
                        {typeLabel ? (
                          <View
                            style={[
                              styles.typeTag,
                              item.type === 'offline'
                                ? styles.typeTagOffline
                                : styles.typeTagOnline,
                            ]}
                          >
                            <Ionicons
                              name={
                                item.type === 'offline'
                                  ? 'location-outline'
                                  : 'globe-outline'
                              }
                              size={10}
                              color="#fff"
                            />
                            <Text style={styles.typeTagText}>{typeLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.activityInfo}>
                    <TouchableOpacity
                      style={styles.activityInfoTouchable}
                      activeOpacity={0.86}
                      onPress={() => handleOpenActivityDetail(item)}
                    >
                      <View style={styles.titleRow}>
                        <Text style={styles.activityTitle}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                      </View>

                      <Text style={styles.activityDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>

                      {item.type === 'offline' && item.address ? (
                        <View style={styles.addressRow}>
                          <Ionicons name="location" size={14} color="#ef4444" />
                          <Text style={styles.addressText} numberOfLines={1}>
                            {item.address}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.activityMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons
                            name={getOrganizerIcon(item.organizerType)}
                            size={14}
                            color={getOrganizerColor(item.organizerType)}
                          />
                          <View style={styles.organizerMetaContent}>
                            <Text
                              style={[
                                styles.metaText,
                                { color: getOrganizerColor(item.organizerType) },
                              ]}
                            >
                              {item.organizerType === 'platform'
                                ? t('screens.activity.organizer.platform')
                                : item.organizer}
                            </Text>
                            {isOwnedByCurrentUser ? (
                              <View style={styles.ownerBadge}>
                                <Text style={styles.ownerBadgeText}>{ACTIVITY_OWNER_BADGE_LABEL}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={14} color="#9ca3af" />
                          <Text style={styles.metaText}>
                            {item.participants}
                            {t('screens.activity.participants')}
                          </Text>
                        </View>

                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                          <Text style={styles.metaText}>
                            {item.startTime} ~ {item.endTime}
                          </Text>
                        </View>
                      </View>

                      {item.joined && item.progress ? (
                        <View style={styles.progressRow}>
                          <Text style={styles.progressLabel}>{t('screens.activity.progress')}</Text>
                          <Text style={styles.progressText}>{item.progress}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {isOwnedByCurrentUser || isResolvingOwnerBeforeAction ? null : (
                      <TouchableOpacity
                        disabled={
                          item.status === 'ended' ||
                          joiningActivityIds.includes(String(item.id))
                        }
                        style={[
                          styles.joinBtn,
                          hasJoined && styles.joinedBtn,
                          item.status === 'ended' && styles.endedBtn,
                        ]}
                        onPress={() => handleJoinActivity(item.id)}
                      >
                        <Text style={[styles.joinBtnText, hasJoined && styles.joinedBtnText]}>
                          {item.status === 'ended'
                            ? t('screens.activity.actions.ended')
                            : hasJoined
                              ? (joiningActivityIds.includes(String(item.id))
                                ? ACTIVITY_CANCELLING_LABEL
                                : ACTIVITY_CANCEL_LABEL)
                              : joiningActivityIds.includes(String(item.id))
                                ? t('common.loading')
                                : t('screens.activity.actions.join')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          : renderEmptyState()}
      </ScrollView>

      <Modal visible={showImageViewer} animationType="fade" transparent={false} statusBarTranslucent>
        <View style={styles.imageViewerContainer}>
          <View style={[styles.imageViewerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowImageViewer(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imageViewerCounter}>
              {viewerImages.length > 0 ? `${currentImageIndex + 1}/${viewerImages.length}` : '0/0'}
            </Text>
            <View style={styles.viewerHeaderSpacer} />
          </View>

          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
              );
              setCurrentImageIndex(index);
            }}
            style={styles.imageViewerScroll}
          >
            {viewerImages.map((image, index) => (
              <View key={`${image}-${index}`} style={styles.imageSlide}>
                <Image source={{ uri: image }} style={styles.fullImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.imageViewerFooter}>
            {viewerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.imageIndicator,
                  index === currentImageIndex && styles.imageIndicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    minHeight: 38,
    minWidth: 74,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 12,
    minHeight: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
    paddingVertical: 0,
  },
  searchIconButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tabScroll: {
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  coverImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#eef2f7',
  },
  activityImage: {
    width: '100%',
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  previewIconBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: modalTokens.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.overlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  activityBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  activityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activityTagDefault: {
    backgroundColor: '#ef4444',
  },
  activityTagEnded: {
    backgroundColor: '#9ca3af',
  },
  activityTagText: {
    color: '#fff',
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  typeTagOnline: {
    backgroundColor: '#8b5cf6',
  },
  typeTagOffline: {
    backgroundColor: '#f59e0b',
  },
  typeTagText: {
    color: '#fff',
    fontSize: scaleFont(10),
    fontWeight: '500',
  },
  activityInfo: {
    padding: 14,
  },
  activityInfoTouchable: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activityTitle: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  activityDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: scaleFont(12),
    color: '#ef4444',
  },
  activityMeta: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerMetaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  ownerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  ownerBadgeText: {
    color: '#e11d48',
    fontSize: scaleFont(10),
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
  },
  progressLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  progressText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinedBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  endedBtn: {
    backgroundColor: '#e5e7eb',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  joinedBtnText: {
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: scaleFont(15),
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: modalTokens.overlay,
  },
  imageViewerCounter: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '500',
  },
  viewerHeaderSpacer: {
    width: 28,
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageSlide: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  imageIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
});

