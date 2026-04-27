import React, { useState, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CategoryIcon from '../components/CategoryIcon';
import { useTranslation } from '../i18n/withTranslation';
import { emptyChannelGroups, fetchChannelCatalog, hasChannelCatalogData } from '../services/channelCatalogService';
import { createCombinedChannel } from '../services/channelCombinedCreateService';
import { fetchMyCreatedCombinedChannels } from '../services/channelCombinedService';
import questionCategoryService from '../services/questionCategoryService';
import {
  fetchMySubscribedChannelItems,
  removeMySubscribedChannel,
  saveMySubscribedChannelOrder,
  subscribeChannel,
} from '../services/channelSubscribedService';
import { getRegionChildren } from '../services/regionService';
import { showAppAlert } from '../utils/appAlert';

import { scaleFont } from '../utils/responsive';
// 鍦板尯鏁版嵁锛堜娇鐢ㄥ璇█鏁版嵁锛?
// 宸茬Щ闄ょ‖缂栫爜鏁版嵁锛屾敼鐢?getRegionData()

// 鎶栧姩鍔ㄧ敾缁勪欢
const moveArrayItem = (list, fromIndex, toIndex) => {
  if (
    !Array.isArray(list) ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }

  const next = [...list];
  const [movedItem] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, movedItem);
  return next;
};

const COMBO_CATEGORY_PARENT_NAME_ALIASES = {
  country: ['国家', '国家问题', 'country', 'national'],
  industry: ['行业', '行业问题', 'industry'],
  enterprise: ['企业', '企业问题', 'enterprise', 'company'],
  personal: ['个人', '个人问题', 'personal', 'individual'],
};

const normalizeComboCategoryText = value =>
  String(value || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

const matchesComboCategoryType = (category, categoryType) => {
  const aliases = COMBO_CATEGORY_PARENT_NAME_ALIASES[categoryType] || [];
  const normalizedName = normalizeComboCategoryText(category?.name);

  if (!normalizedName) {
    return false;
  }

  return aliases.some(alias => {
    const normalizedAlias = normalizeComboCategoryText(alias);
    return (
      normalizedName === normalizedAlias ||
      normalizedName.includes(normalizedAlias) ||
      normalizedAlias.includes(normalizedName)
    );
  });
};

const MyChannelTagContent = ({
  channel,
  isEditMode,
  onDelete,
  isDeleteDisabled = false,
  isUnavailable = false,
  unavailableLabel = '',
}) => (
  <View
    style={[
      styles.myChannelTag,
      isEditMode ? styles.myChannelTagEditMode : styles.myChannelTagViewMode,
      isUnavailable ? styles.myChannelTagUnavailable : null,
      isUnavailable && isEditMode ? styles.myChannelTagUnavailableEditMode : null,
      isUnavailable && !isEditMode ? styles.myChannelTagUnavailableViewMode : null,
    ]}
  >
    <Text style={[styles.myChannelText, isUnavailable ? styles.myChannelTextUnavailable : null]}>
      {channel}
    </Text>
    {isUnavailable ? (
      <View
        style={[
          styles.myChannelStatusBadge,
          isEditMode ? styles.myChannelStatusBadgeEditMode : null,
        ]}
      >
        <Text style={styles.myChannelStatusBadgeText}>{unavailableLabel}</Text>
      </View>
    ) : null}
    {isEditMode && (
      <TouchableOpacity
        disabled={isDeleteDisabled}
        onPress={onDelete}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        style={styles.deleteIconContainer}
      >
        <Ionicons name="close" size={14} color="#374151" />
      </TouchableOpacity>
    )}
  </View>
);

const ShakingChannelTag = ({
  channel,
  channelKey,
  onDelete,
  onLongPress,
  isDragging,
  isEditMode,
  setTagRef,
  isUnavailable,
  unavailableLabel,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimationRef = useRef(null);
  
  useEffect(() => {
    if (isEditMode) {
      // 涓烘瘡涓爣绛炬坊鍔犱笉鍚岀殑寤惰繜锛岃鎶栧姩鏁堟灉鏇磋嚜鐒?
      shakeAnimationRef.current?.stop?.();

      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true
          })
        ])
      );
      
      shakeAnimationRef.current = shakeAnimation;
      shakeAnimation.start();
    }

    if (!isEditMode) {
      shakeAnimationRef.current?.stop?.();
      shakeAnimationRef.current = null;
      shakeAnim.stopAnimation(() => {
        shakeAnim.setValue(0);
      });
    }

    return () => {
      shakeAnimationRef.current?.stop?.();
      shakeAnimationRef.current = null;
      shakeAnim.stopAnimation(() => {
        shakeAnim.setValue(0);
      });
    };
  }, [isEditMode]);
  
  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-2deg', '2deg']
  });
  const wrapperStyle = isDragging ? styles.myChannelTagDraggingPlaceholder : null;
  const animatedTransform = isEditMode ? [{
    rotate
  }] : [];
  
  return (
    <Animated.View
      ref={node => setTagRef(channelKey, node)}
      collapsable={false}
      style={{
        transform: animatedTransform,
        opacity: isDragging ? 0 : 1,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        delayLongPress={180}
        disabled={!isEditMode}
        onLongPress={onLongPress}
        style={[styles.myChannelTagWrapper, wrapperStyle]}
      >
        <MyChannelTagContent
          channel={channel}
          isEditMode={isEditMode}
          onDelete={onDelete}
          isUnavailable={isUnavailable}
          unavailableLabel={unavailableLabel}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const DraggingChannelOverlay = ({
  channel,
  isEditMode,
  dragPosition,
  dragScale,
  width,
  isUnavailable,
  unavailableLabel,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimationRef = useRef(null);

  useEffect(() => {
    if (isEditMode) {
      shakeAnimationRef.current?.stop?.();

      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true
          })
        ])
      );

      shakeAnimationRef.current = shakeAnimation;
      shakeAnimation.start();
    }

    if (!isEditMode) {
      shakeAnimationRef.current?.stop?.();
      shakeAnimationRef.current = null;
      shakeAnim.stopAnimation(() => {
        shakeAnim.setValue(0);
      });
    }

    return () => {
      shakeAnimationRef.current?.stop?.();
      shakeAnimationRef.current = null;
      shakeAnim.stopAnimation(() => {
        shakeAnim.setValue(0);
      });
    };
  }, [isEditMode, shakeAnim]);

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-2deg', '2deg']
  });

  return <Animated.View
    pointerEvents="none"
    style={[styles.draggingTagOverlay, {
    width,
    transform: [{
      translateX: dragPosition.x
    }, {
      translateY: dragPosition.y
    }, {
      scale: dragScale
    }, ...(isEditMode ? [{
      rotate
    }] : [])]
  }]}
  >
      <View style={styles.myChannelTagWrapper}>
        <View style={styles.draggingTagShadow}>
          <MyChannelTagContent
            channel={channel}
            isEditMode={isEditMode}
            isDeleteDisabled
            isUnavailable={isUnavailable}
            unavailableLabel={unavailableLabel}
          />
        </View>
      </View>
    </Animated.View>;
};

const getChannelDisplayName = channel => {
  if (typeof channel === 'string') {
    return channel.trim();
  }

  return String(channel?.name ?? '').trim();
};

const getChannelIdentityKey = channel => {
  const targetType = String(channel?.targetType ?? '').trim();
  const targetKey = String(channel?.targetKey ?? '').trim();

  if (!targetType || !targetKey) {
    return '';
  }

  return `${targetType}::${targetKey}`;
};

const isChannelUnavailable = channel =>
  Boolean(channel && typeof channel === 'object' && channel.isUnavailable);

const getCatalogChannelState = (catalog, channel) => {
  if (!catalog || !channel || typeof channel !== 'object') {
    return null;
  }

  const identityKey = getChannelIdentityKey(channel);
  const nameKey = getChannelDisplayName(channel);

  if (identityKey && catalog.channelStateByIdentity?.[identityKey]) {
    return catalog.channelStateByIdentity[identityKey];
  }

  if (nameKey && catalog.channelStateByName?.[nameKey]) {
    return catalog.channelStateByName[nameKey];
  }

  return null;
};

const decorateChannelsWithCatalogState = (channels, catalog) =>
  (Array.isArray(channels) ? channels : []).map(channel => {
    if (!channel || typeof channel === 'string') {
      return channel;
    }

    const catalogState = getCatalogChannelState(catalog, channel);
    const nextIsUnavailable = Boolean(catalogState?.isUnavailable);

    if (
      channel.isUnavailable === nextIsUnavailable &&
      channel.unavailableReason === (nextIsUnavailable ? 'disabled' : '')
    ) {
      return channel;
    }

    return {
      ...channel,
      isUnavailable: nextIsUnavailable,
      unavailableReason: nextIsUnavailable ? 'disabled' : '',
    };
  });

const isLocalOnlyChannel = channel =>
  !channel || typeof channel === 'string' || !getChannelIdentityKey(channel);

const getRenderableChannelKey = (channel, index) =>
  getChannelIdentityKey(channel) || getChannelDisplayName(channel) || String(index);

const applyDraftChannelChanges = (baseChannels, persistedChannels, draftChannels) => {
  const persistedKeySet = new Set(
    persistedChannels.map(channel => getChannelIdentityKey(channel)).filter(Boolean)
  );
  const draftKeySet = new Set(
    draftChannels.map(channel => getChannelIdentityKey(channel)).filter(Boolean)
  );
  const pendingRemovedKeySet = new Set(
    persistedChannels
      .map(channel => getChannelIdentityKey(channel))
      .filter(identityKey => identityKey && !draftKeySet.has(identityKey))
  );
  const pendingAddedChannels = draftChannels.filter(channel => {
    const identityKey = getChannelIdentityKey(channel);
    return identityKey && !persistedKeySet.has(identityKey);
  });
  const nextChannels = baseChannels.filter(channel => {
    const identityKey = getChannelIdentityKey(channel);
    return !identityKey || !pendingRemovedKeySet.has(identityKey);
  });
  const nextChannelKeySet = new Set(
    nextChannels.map(channel => getChannelIdentityKey(channel)).filter(Boolean)
  );

  pendingAddedChannels.forEach(channel => {
    const identityKey = getChannelIdentityKey(channel);

    if (!identityKey || nextChannelKeySet.has(identityKey)) {
      return;
    }

    nextChannels.push(channel);
    nextChannelKeySet.add(identityKey);
  });

  return nextChannels;
};

// 棰戦亾鏁版嵁 - 浣跨敤缈昏瘧閿?
export default function ChannelManageScreen({
  navigation
}) {
  const {
    t,
    i18n
  } = useTranslation();
  const locale = i18n?.locale || 'en';

  const [remoteChannelCatalog, setRemoteChannelCatalog] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState('loading');
  const appStateRef = useRef(AppState.currentState);
  const catalogLoadPromiseRef = useRef(null);
  const hasLoadedCatalogOnceRef = useRef(false);
  const [isCreatingCombo, setIsCreatingCombo] = useState(false);
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [regionOptions, setRegionOptions] = useState([]);
  const [regionStatus, setRegionStatus] = useState('idle');
  const [regionErrorMessage, setRegionErrorMessage] = useState('');
  const [comboCategoryOptionsByType, setComboCategoryOptionsByType] = useState(emptyChannelGroups);
  const [comboCategoryStatus, setComboCategoryStatus] = useState('idle');
  const [comboCategoryErrorMessage, setComboCategoryErrorMessage] = useState('');
  const comboCategoryRequestIdRef = useRef(0);
  const channelOptionsByType = React.useMemo(() => {
    if (!remoteChannelCatalog?.groupsByType) {
      return emptyChannelGroups;
    }

    return {
      country: remoteChannelCatalog.groupsByType.country || [],
      industry: remoteChannelCatalog.groupsByType.industry || [],
      enterprise: remoteChannelCatalog.groupsByType.enterprise || [],
      personal: remoteChannelCatalog.groupsByType.personal || []
    };
  }, [remoteChannelCatalog]);
  const isCatalogLoading = catalogStatus === 'loading';
  const isCatalogError = catalogStatus === 'error';

  // 鎴戠殑棰戦亾 - 浣跨敤缈昏瘧鍚庣殑榛樿鍊?
  const [persistedMyChannels, setPersistedMyChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const myChannelNames = React.useMemo(
    () => myChannels.map(channel => getChannelDisplayName(channel)).filter(Boolean),
    [myChannels]
  );
  const availableChannelOptionsByType = React.useMemo(() => ({
    country: channelOptionsByType.country.filter(channel => !myChannelNames.includes(getChannelDisplayName(channel))),
    industry: channelOptionsByType.industry.filter(channel => !myChannelNames.includes(getChannelDisplayName(channel))),
    enterprise: channelOptionsByType.enterprise.filter(channel => !myChannelNames.includes(getChannelDisplayName(channel))),
    personal: channelOptionsByType.personal.filter(channel => !myChannelNames.includes(getChannelDisplayName(channel))),
  }), [channelOptionsByType, myChannelNames]);
  const [comboChannels, setComboChannels] = useState([]);
  
  // 缂栬緫妯″紡鐘舵€?
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggingChannelKey, setDraggingChannelKey] = useState('');
  const [draggingChannelSnapshot, setDraggingChannelSnapshot] = useState(null);
  const myChannelTagRefs = useRef(new Map());
  const myChannelTagLayoutsRef = useRef(new Map());
  const scrollViewRef = useRef(null);
  const draggingChannelKeyRef = useRef('');
  const handleDragChannelMoveRef = useRef(null);
  const isFinishingDragRef = useRef(false);
  const dragRefreshFrameRef = useRef(null);
  const autoScrollFrameRef = useRef(null);
  const dragPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const scrollMetricsRef = useRef({
    offsetY: 0,
    viewportHeight: 0,
    contentHeight: 0,
    pageY: 0,
  });

  // 缁勫悎棰戦亾鍒涘缓
  const [showComboCreator, setShowComboCreator] = useState(true);
  const [comboStep, setComboStep] = useState('region'); // 'region' 鎴?'category'
  const [regionStep, setRegionStep] = useState(0); // 0:鍥藉 1:鐪佷唤 2:鍩庡競 3:鍖哄煙
  const [comboSelection, setComboSelection] = useState({
    country: null,
    province: null,
    city: null,
    district: null,
    categoryType: null,
    // 'country', 'industry', 'personal'
    category: null
  });
  const [myComboChannels, setMyComboChannels] = useState([]);

  // 鍖哄煙鎼滅储
  const [regionSearchText, setRegionSearchText] = useState('');

  const hasPendingChannelChanges = React.useMemo(() => {
    const persistedKeys = persistedMyChannels
      .map(channel => getChannelIdentityKey(channel))
      .filter(Boolean);
    const draftKeys = myChannels
      .map(channel => getChannelIdentityKey(channel))
      .filter(Boolean);

    if (persistedKeys.length !== draftKeys.length) {
      return true;
    }

    return persistedKeys.some((identityKey, index) => identityKey !== draftKeys[index]);
  }, [myChannels, persistedMyChannels]);

  const loadChannelCatalog = React.useCallback(async ({ preserveStatus = false } = {}) => {
    if (catalogLoadPromiseRef.current) {
      return catalogLoadPromiseRef.current;
    }

    if (!preserveStatus) {
      setCatalogStatus('loading');
    }

    const request = (async () => {
      try {
        const catalog = await fetchChannelCatalog();

        if (hasChannelCatalogData(catalog)) {
          setRemoteChannelCatalog(catalog);
          setCatalogStatus('success');
          return catalog;
        }

        setRemoteChannelCatalog(null);
        setCatalogStatus('empty');
        return catalog;
      } catch (error) {
        console.error('Failed to load channel catalog:', error);
        setRemoteChannelCatalog(null);
        setCatalogStatus('error');
        throw error;
      } finally {
        hasLoadedCatalogOnceRef.current = true;
        catalogLoadPromiseRef.current = null;
      }
    })();

    catalogLoadPromiseRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncChannelCatalog = async () => {
      await loadChannelCatalog();

      if (!isMounted) {
        return;
      }
    };

    syncChannelCatalog();

    return () => {
      isMounted = false;
    };
  }, [loadChannelCatalog]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasLoadedCatalogOnceRef.current) {
        return undefined;
      }

      loadChannelCatalog({ preserveStatus: true }).catch(error => {
        console.error('Failed to refresh channel catalog on focus:', error);
      });

      return undefined;
    }, [loadChannelCatalog])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const isReturningToForeground =
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active';

      if (isReturningToForeground && hasLoadedCatalogOnceRef.current) {
        loadChannelCatalog({ preserveStatus: true }).catch(error => {
          console.error('Failed to refresh channel catalog after app became active:', error);
        });
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [loadChannelCatalog]);

  useEffect(() => {
    let isMounted = true;

    const syncMyChannels = async () => {
      try {
        const subscribedChannels = await reloadMyChannels();
        const decoratedSubscribedChannels = decorateChannelsWithCatalogState(
          subscribedChannels,
          remoteChannelCatalog
        );

        if (!isMounted) {
          return;
        }

        setPersistedMyChannels(decoratedSubscribedChannels);
        setMyChannels(decoratedSubscribedChannels);
      } catch (error) {
        console.error('Failed to load my subscribed channels:', error);

        if (!isMounted) {
          return;
        }

        setPersistedMyChannels([]);
        setMyChannels([]);
      }
    };

    syncMyChannels();

    return () => {
      isMounted = false;
    };
  }, [locale, reloadMyChannels]);

  const getRegionParentIdByStep = React.useCallback(() => {
    switch (regionStep) {
      case 0:
        return '0';
      case 1:
        return comboSelection.country?.id || null;
      case 2:
        return comboSelection.province?.id || null;
      case 3:
        return comboSelection.city?.id || null;
      default:
        return null;
    }
  }, [comboSelection.city?.id, comboSelection.country?.id, comboSelection.province?.id, regionStep]);

  const loadRegionOptions = React.useCallback(async () => {
    const parentId = getRegionParentIdByStep();

    if (parentId === null) {
      setRegionOptions([]);
      setRegionStatus('empty');
      setRegionErrorMessage('');
      return [];
    }

    setRegionStatus('loading');
    setRegionErrorMessage('');

    try {
      const children = await getRegionChildren(parentId);
      setRegionOptions(children);
      setRegionStatus(children.length > 0 ? 'success' : 'empty');
      return children;
    } catch (error) {
      console.error('Failed to load region options:', error);
      setRegionOptions([]);
      setRegionStatus('error');
      setRegionErrorMessage(error?.message || '');
      return [];
    }
  }, [getRegionParentIdByStep]);

  useEffect(() => {
    if (comboStep !== 'region') {
      return;
    }

    loadRegionOptions();
  }, [comboStep, loadRegionOptions]);

  const filteredRegionOptions = React.useMemo(() => {
    if (!regionSearchText.trim()) {
      return regionOptions;
    }

    const keyword = regionSearchText.trim().toLowerCase();
    return regionOptions.filter(option =>
      option.name.toLowerCase().includes(keyword)
    );
  }, [regionOptions, regionSearchText]);

  const loadComboCategoryOptions = React.useCallback(async () => {
    if (!comboSelection.categoryType) {
      setComboCategoryStatus('idle');
      setComboCategoryErrorMessage('');
      return [];
    }

    const requestId = comboCategoryRequestIdRef.current + 1;
    comboCategoryRequestIdRef.current = requestId;
    setComboCategoryStatus('loading');
    setComboCategoryErrorMessage('');

    try {
      const level1Categories = await questionCategoryService.getLevel1Categories();
      const parentCategory = level1Categories.find(category =>
        matchesComboCategoryType(category, comboSelection.categoryType)
      );

      if (!parentCategory) {
        if (comboCategoryRequestIdRef.current !== requestId) {
          return [];
        }

        setComboCategoryOptionsByType(currentOptions => ({
          ...currentOptions,
          [comboSelection.categoryType]: [],
        }));
        setComboCategoryStatus('empty');
        return [];
      }

      const level2Categories = await questionCategoryService.getLevel2Categories(
        parentCategory.id,
        {
          parentName: parentCategory.name,
        }
      );

      if (comboCategoryRequestIdRef.current !== requestId) {
        return level2Categories;
      }

      setComboCategoryOptionsByType(currentOptions => ({
        ...currentOptions,
        [comboSelection.categoryType]: level2Categories,
      }));
      setComboCategoryStatus(level2Categories.length > 0 ? 'success' : 'empty');
      return level2Categories;
    } catch (error) {
      if (comboCategoryRequestIdRef.current !== requestId) {
        return [];
      }

      console.error('Failed to load combo category options:', error);
      setComboCategoryOptionsByType(currentOptions => ({
        ...currentOptions,
        [comboSelection.categoryType]: [],
      }));
      setComboCategoryStatus('error');
      setComboCategoryErrorMessage(error?.message || '');
      return [];
    }
  }, [comboSelection.categoryType]);

  const reloadMyChannels = React.useCallback(async () => {
    return fetchMySubscribedChannelItems();
  }, []);

  useEffect(() => {
    if (comboStep !== 'category') {
      return;
    }

    if (!comboSelection.categoryType) {
      setComboCategoryStatus('idle');
      setComboCategoryErrorMessage('');
      return;
    }

    loadComboCategoryOptions();
  }, [comboSelection.categoryType, comboStep, loadComboCategoryOptions]);

  const setMyChannelTagRef = React.useCallback((channelKey, node) => {
    if (!channelKey) {
      return;
    }

    if (node) {
      myChannelTagRefs.current.set(channelKey, node);
      return;
    }

    myChannelTagRefs.current.delete(channelKey);
    myChannelTagLayoutsRef.current.delete(channelKey);
  }, []);

  const refreshMyChannelLayouts = React.useCallback(() => {
    if (dragRefreshFrameRef.current) {
      cancelAnimationFrame(dragRefreshFrameRef.current);
    }

    dragRefreshFrameRef.current = requestAnimationFrame(() => {
      myChannels.forEach((channel, index) => {
        const channelKey = getRenderableChannelKey(channel, index);
        const tagRef = myChannelTagRefs.current.get(channelKey);

        if (!tagRef?.measureInWindow) {
          return;
        }

        tagRef.measureInWindow((x, y, width, height) => {
          myChannelTagLayoutsRef.current.set(channelKey, {
            x,
            y,
            width,
            height,
          });
        });
      });

      if (scrollViewRef.current?.measureInWindow) {
        scrollViewRef.current.measureInWindow((x, y, width, height) => {
          scrollMetricsRef.current = {
            ...scrollMetricsRef.current,
            pageY: y,
            viewportHeight: height,
          };
        });
      }
    });
  }, [myChannels]);

  const stopAutoScroll = React.useCallback(() => {
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const resetDraggingChannels = React.useCallback(() => {
    draggingChannelKeyRef.current = '';
    isFinishingDragRef.current = false;
    setDraggingChannelKey('');
    setDraggingChannelSnapshot(null);
    dragScale.setValue(1);
  }, [dragScale]);

  const finishDraggingChannels = React.useCallback(() => {
    const activeChannelKey = draggingChannelKeyRef.current;

    stopAutoScroll();

    if (!activeChannelKey || !draggingChannelSnapshot || isFinishingDragRef.current) {
      resetDraggingChannels();
      return;
    }

    isFinishingDragRef.current = true;
    refreshMyChannelLayouts();

    requestAnimationFrame(() => {
      const finalLayout = myChannelTagLayoutsRef.current.get(activeChannelKey);

      if (!finalLayout) {
        resetDraggingChannels();
        return;
      }

      Animated.parallel([
        Animated.spring(dragPosition, {
          toValue: {
            x: finalLayout.x,
            y: finalLayout.y,
          },
          useNativeDriver: true,
          friction: 8,
          tension: 120,
        }),
        Animated.spring(dragScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 120,
        }),
      ]).start(() => {
        resetDraggingChannels();
      });
    });
  }, [
    dragPosition,
    dragScale,
    draggingChannelSnapshot,
    refreshMyChannelLayouts,
    resetDraggingChannels,
    stopAutoScroll,
  ]);

  const reloadMyCreatedCombinedChannels = React.useCallback(async () => {
    return fetchMyCreatedCombinedChannels();
  }, []);

  const syncPersistedMyChannels = React.useCallback((nextPersistedChannels, options = {}) => {
    const { preserveDraftChanges = false } = options;
    const decoratedPersistedChannels = decorateChannelsWithCatalogState(
      nextPersistedChannels,
      remoteChannelCatalog
    );

    setPersistedMyChannels(decoratedPersistedChannels);
    setMyChannels(currentChannels =>
      decorateChannelsWithCatalogState(
        preserveDraftChanges
          ? applyDraftChannelChanges(
            decoratedPersistedChannels,
            decorateChannelsWithCatalogState(persistedMyChannels, remoteChannelCatalog),
            currentChannels
          )
          : decoratedPersistedChannels,
        remoteChannelCatalog
      )
    );
  }, [persistedMyChannels, remoteChannelCatalog]);

  useEffect(() => {
    if (!remoteChannelCatalog) {
      return;
    }

    setPersistedMyChannels(currentChannels =>
      decorateChannelsWithCatalogState(currentChannels, remoteChannelCatalog)
    );
    setMyChannels(currentChannels =>
      decorateChannelsWithCatalogState(currentChannels, remoteChannelCatalog)
    );
  }, [remoteChannelCatalog]);

  useEffect(() => {
    refreshMyChannelLayouts();
  }, [isEditMode, myChannels, refreshMyChannelLayouts]);

  useEffect(() => {
    if (isEditMode) {
      return undefined;
    }

    finishDraggingChannels();
    return undefined;
  }, [finishDraggingChannels, isEditMode]);

  useEffect(() => () => {
    if (dragRefreshFrameRef.current) {
      cancelAnimationFrame(dragRefreshFrameRef.current);
    }
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncMyCreatedCombinedChannels = async () => {
      try {
        const createdCombinedChannels = await reloadMyCreatedCombinedChannels();

        if (!isMounted) {
          return;
        }

        setComboChannels(createdCombinedChannels);
      } catch (error) {
        console.error('Failed to load my created combined channels:', error);

        if (!isMounted) {
          return;
        }

        setComboChannels([]);
      }
    };

    syncMyCreatedCombinedChannels();

    return () => {
      isMounted = false;
    };
  }, [locale, reloadMyCreatedCombinedChannels]);

  // 鍒囨崲棰戦亾璁㈤槄
  const toggleChannel = channel => {
    const channelName = getChannelDisplayName(channel);

    if (!channelName) {
      return;
    }

    const existingChannel = myChannels.find(item => getChannelDisplayName(item) === channelName);

    if (existingChannel) {
      if (!isEditMode) {
        return;
      }

      if (!isChannelUnavailable(existingChannel)) {
        const nextAvailableChannelCount = myChannels.filter(item => {
          if (getChannelDisplayName(item) === channelName) {
            return false;
          }

          return !isLocalOnlyChannel(item) && !isChannelUnavailable(item);
        }).length;

        if (nextAvailableChannelCount <= 0) {
          showAppAlert(t('common.ok'), t('channelManage.keepOneAvailableChannel'));
          return;
        }
      }

      setMyChannels(currentChannels =>
        currentChannels.filter(item => getChannelDisplayName(item) !== channelName)
      );

      return;
    }

    if (!channel || typeof channel === 'string') {
      showAppAlert(t('common.ok'), t('common.noData'));
      return;
    }

    const targetType = String(channel.targetType || '').trim() || 'CATEGORY';
    const targetKey = String(channel.targetKey || channel.id || '').trim();
    const identityKey = getChannelIdentityKey({
      targetType,
      targetKey,
    });

    if (!targetKey || !identityKey) {
      showAppAlert(t('common.ok'), t('common.noData'));
      return;
    }

    const persistedChannel = persistedMyChannels.find(
      item => getChannelIdentityKey(item) === identityKey
    );

    setMyChannels(currentChannels => {
      if (currentChannels.some(item => getChannelIdentityKey(item) === identityKey)) {
        return currentChannels;
      }

      return [
        ...currentChannels,
        persistedChannel || {
          ...channel,
          name: channelName,
          targetType,
          targetKey,
          raw: channel.raw || channel,
        },
      ];
    });
  };

  // 缁勫悎棰戦亾閫夋嫨閫昏緫
  const runAutoScroll = React.useCallback((direction, pageX, pageY) => {
    if (!draggingChannelKeyRef.current || isFinishingDragRef.current) {
      stopAutoScroll();
      return;
    }

    const maxOffsetY = Math.max(
      0,
      scrollMetricsRef.current.contentHeight - scrollMetricsRef.current.viewportHeight
    );
    const nextOffsetY = Math.min(
      maxOffsetY,
      Math.max(0, scrollMetricsRef.current.offsetY + direction * 14)
    );

    if (nextOffsetY === scrollMetricsRef.current.offsetY) {
      stopAutoScroll();
      return;
    }

    scrollMetricsRef.current = {
      ...scrollMetricsRef.current,
      offsetY: nextOffsetY,
    };

    scrollViewRef.current?.scrollTo({
      y: nextOffsetY,
      animated: false,
    });
    refreshMyChannelLayouts();
    handleDragChannelMoveRef.current?.(pageX, pageY);

    autoScrollFrameRef.current = requestAnimationFrame(() => {
      runAutoScroll(direction, pageX, pageY);
    });
  }, [refreshMyChannelLayouts, stopAutoScroll]);

  const maybeAutoScrollWhileDragging = React.useCallback((pageX, pageY) => {
    const { pageY: scrollPageY, viewportHeight } = scrollMetricsRef.current;

    if (!viewportHeight) {
      stopAutoScroll();
      return;
    }

    const threshold = 72;
    const topEdge = scrollPageY + threshold;
    const bottomEdge = scrollPageY + viewportHeight - threshold;

    let direction = 0;

    if (pageY < topEdge) {
      direction = -1;
    } else if (pageY > bottomEdge) {
      direction = 1;
    }

    if (!direction) {
      stopAutoScroll();
      return;
    }

    if (autoScrollFrameRef.current) {
      return;
    }

    runAutoScroll(direction, pageX, pageY);
  }, [runAutoScroll, stopAutoScroll]);

  const handleDragChannelStart = React.useCallback((
    channelKey,
    channelLabel,
    event,
    isUnavailableChannel = false,
    unavailableLabel = ''
  ) => {
    if (!isEditMode || !channelKey) {
      return;
    }

    stopAutoScroll();
    isFinishingDragRef.current = false;
    refreshMyChannelLayouts();
    const tagRef = myChannelTagRefs.current.get(channelKey);

    if (!tagRef?.measureInWindow) {
      return;
    }

    tagRef.measureInWindow((x, y, width, height) => {
      const pageX = event?.nativeEvent?.pageX ?? x + width / 2;
      const pageY = event?.nativeEvent?.pageY ?? y + height / 2;
      const offsetX = pageX - x;
      const offsetY = pageY - y;

      draggingChannelKeyRef.current = channelKey;
      setDraggingChannelKey(channelKey);
      setDraggingChannelSnapshot({
        channel: channelLabel,
        isUnavailable: isUnavailableChannel,
        unavailableLabel,
        width,
        height,
        offsetX,
        offsetY,
      });
      dragPosition.setValue({
        x,
        y,
      });
      dragScale.setValue(1);
      Animated.spring(dragScale, {
        toValue: 1.06,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }).start();
    });
  }, [dragPosition, dragScale, isEditMode, refreshMyChannelLayouts, stopAutoScroll]);

  const handleDragChannelMove = React.useCallback((pageX, pageY) => {
    const activeChannelKey = draggingChannelKeyRef.current;

    if (!activeChannelKey || !draggingChannelSnapshot) {
      return;
    }

    dragPosition.setValue({
      x: pageX - draggingChannelSnapshot.offsetX,
      y: pageY - draggingChannelSnapshot.offsetY,
    });

    let closestChannelKey = '';
    let closestDistance = Number.POSITIVE_INFINITY;

    myChannels.forEach((channel, index) => {
      const channelKey = getRenderableChannelKey(channel, index);
      const layout = myChannelTagLayoutsRef.current.get(channelKey);

      if (!layout) {
        return;
      }

      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2;
      const distance = Math.hypot(pageX - centerX, pageY - centerY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestChannelKey = channelKey;
      }
    });

    if (!closestChannelKey || closestChannelKey === activeChannelKey) {
      return;
    }

    setMyChannels(currentChannels => {
      const fromIndex = currentChannels.findIndex((channel, index) =>
        getRenderableChannelKey(channel, index) === activeChannelKey
      );
      const toIndex = currentChannels.findIndex((channel, index) =>
        getRenderableChannelKey(channel, index) === closestChannelKey
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return currentChannels;
      }

      return moveArrayItem(currentChannels, fromIndex, toIndex);
    });
  }, [dragPosition, draggingChannelSnapshot, myChannels]);

  handleDragChannelMoveRef.current = handleDragChannelMove;

  const channelDragResponder = React.useMemo(() => ({
    onStartShouldSetResponderCapture: () => Boolean(draggingChannelKeyRef.current),
    onMoveShouldSetResponderCapture: () => Boolean(draggingChannelKeyRef.current),
    onResponderMove: event => {
      const { pageX, pageY } = event.nativeEvent;
      handleDragChannelMove(pageX, pageY);
      maybeAutoScrollWhileDragging(pageX, pageY);
    },
    onResponderRelease: finishDraggingChannels,
    onResponderTerminate: finishDraggingChannels,
  }), [finishDraggingChannels, handleDragChannelMove, maybeAutoScrollWhileDragging]);

  const getRegionOptions = () => {
    return filteredRegionOptions;
  };
  const getCategoryOptions = () => {
    if (!comboSelection.categoryType) {
      return [{
        id: 'country',
        name: t('channelManage.categoryTypes.country'),
        icon: 'flag',
        color: '#3b82f6'
      }, {
        id: 'industry',
        name: t('channelManage.categoryTypes.industry'),
        icon: 'briefcase',
        color: '#22c55e'
      }, {
        id: 'enterprise',
        name: t('channelManage.categoryTypes.enterprise'),
        icon: 'business',
        color: '#f59e0b'
      }, {
        id: 'personal',
        name: t('channelManage.categoryTypes.personal'),
        icon: 'person',
        color: '#8b5cf6'
      }];
    }

    // 杩斿洖瀵瑰簲绫诲瀷鐨勯閬撳垪琛?
    if (comboSelection.categoryType === 'country') return comboCategoryOptionsByType.country;
    if (comboSelection.categoryType === 'industry') return comboCategoryOptionsByType.industry;
    if (comboSelection.categoryType === 'enterprise') return comboCategoryOptionsByType.enterprise;
    if (comboSelection.categoryType === 'personal') return comboCategoryOptionsByType.personal;
    return [];
  };
  const selectRegionOption = option => {
    const newSelection = {
      ...comboSelection
    };
    switch (regionStep) {
      case 0:
        // 閫夋嫨鍥藉
        newSelection.country = option;
        newSelection.province = null;
        newSelection.city = null;
        newSelection.district = null;
        setRegionStep(1);
        break;
      case 1:
        // 閫夋嫨鐪佷唤/宸?
        newSelection.province = option;
        newSelection.city = null;
        newSelection.district = null;
        setRegionStep(2);
        break;
      case 2:
        // 閫夋嫨鍩庡競
        newSelection.city = option;
        newSelection.district = null;
        setRegionStep(3);
        break;
      case 3:
        // 閫夋嫨鍖哄煙
        newSelection.district = option;
        break;
    }
    setComboSelection(newSelection);
    setRegionSearchText(''); // 娓呯┖鎼滅储妗?
  };
  const selectCategoryOption = option => {
    console.log('馃幆 selectCategoryOption called with:', option);
    console.log('馃搳 Current categoryType:', comboSelection.categoryType);
    const newSelection = {
      ...comboSelection
    };
    if (!comboSelection.categoryType) {
      // 閫夋嫨鍒嗙被绫诲瀷
      console.log('鉁?Selecting category type:', option.id);
      newSelection.categoryType = option.id;
      newSelection.category = null;
    } else {
      // 閫夋嫨鍏蜂綋鍒嗙被
      console.log('鉁?Selecting specific category:', option.name);
      newSelection.category = option;
    }
    console.log('馃摝 New selection:', newSelection);
    setComboSelection(newSelection);
  };
  const goToCategory = () => {
    setComboStep('category');
  };
  const backToRegion = () => {
    setComboStep('region');
    setComboSelection({
      ...comboSelection,
      categoryType: null,
      category: null
    });
  };
  const resolveSelectedRegionId = () => {
    const selectedRegionNode =
      comboSelection.district ||
      comboSelection.city ||
      comboSelection.province ||
      comboSelection.country;
    const numericRegionId = Number(
      selectedRegionNode?.regionId ??
      selectedRegionNode?.id ??
      selectedRegionNode?.value
    );

    return Number.isInteger(numericRegionId) && numericRegionId > 0 ? numericRegionId : 0;
  };
  const resolveSelectedLocationText = () => {
    const parts = [
      comboSelection.country?.name,
      comboSelection.province?.name,
      comboSelection.city?.name,
      comboSelection.district?.name ?? comboSelection.district
    ].filter(Boolean);

    return parts.join('-');
  };
  const createComboChannel = async () => {
    const {
      categoryType,
      category
    } = comboSelection;
    if (!categoryType || !category) {
      showAppAlert(t('common.ok'), t('channelManage.selectCategoryPrompt'));
      return;
    }
    const locationText = resolveSelectedLocationText();
    const autoGeneratedName = `${locationText.replace(/-/g, '')}${category.name || ''}`.trim() || category.name || '';
    const parentCategoryId = Number(category.parentId);
    const subCategoryId = Number(category.id);

    if (!autoGeneratedName) {
      showAppAlert(t('common.ok'), t('channelManage.selectCategoryPrompt'));
      return;
    }

    if (!Number.isInteger(parentCategoryId) || parentCategoryId <= 0 || !Number.isInteger(subCategoryId) || subCategoryId <= 0) {
      showAppAlert(t('common.ok'), t('common.noData'));
      return;
    }

    const selectedRegionId = resolveSelectedRegionId();

    if (!Number.isInteger(selectedRegionId) || selectedRegionId <= 0) {
      showAppAlert(t('common.ok'), t('channelManage.selectRegionPrompt'));
      return;
    }

    if (isCreatingCombo) {
      return;
    }

    setIsCreatingCombo(true);

    try {
      await createCombinedChannel({
        name: autoGeneratedName,
        regionId: selectedRegionId,
        locationText,
        parentCategoryId,
        subCategoryId
      });

      const [subscribedResult, combinedResult] = await Promise.allSettled([
        reloadMyChannels(),
        reloadMyCreatedCombinedChannels()
      ]);

      if (subscribedResult.status === 'fulfilled') {
        syncPersistedMyChannels(subscribedResult.value, {
          preserveDraftChanges: true
        });
      }

      if (combinedResult.status === 'fulfilled') {
        setComboChannels(combinedResult.value);
      }

      setComboStep('region');
      setRegionStep(0);
      setComboSelection({
        country: null,
        province: null,
        city: null,
        district: null,
        categoryType: null,
        category: null
      });
      setShowComboCreator(false);
      showAppAlert(t('common.ok'), t('channelManage.createSuccess'));
    } catch (error) {
      showAppAlert(t('common.ok'), error?.message || t('common.retry'));
    } finally {
      setIsCreatingCombo(false);
    }
  };
  const renderComboCategoryContent = () => {
    const categoryOptions = getCategoryOptions();

    if (!comboSelection.categoryType) {
      return categoryOptions.length > 0
        ? categoryOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.comboOption, option.icon && styles.comboOptionWithIcon]}
              onPress={() => selectCategoryOption(option)}
            >
              {Boolean(option.icon) && (
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor: option.color + '20',
                    },
                  ]}
                >
                  <Ionicons name={option.icon} size={18} color={option.color} />
                </View>
              )}
              <Text style={styles.comboOptionText}>{option.name}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ))
        : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>;
    }

    if (comboCategoryStatus === 'loading') {
      return <Text style={styles.inlineHintText}>{t('common.loading')}</Text>;
    }

    if (comboCategoryStatus === 'error') {
      return (
        <View style={styles.inlineStateRow}>
          <Text style={styles.inlineEmptyText}>
            {comboCategoryErrorMessage || t('common.noData')}
          </Text>
          <TouchableOpacity onPress={loadComboCategoryOptions}>
            <Text style={styles.inlineRetryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return categoryOptions.length > 0
      ? categoryOptions.map((option, index) => (
          <TouchableOpacity
            key={option.id || index}
            style={[styles.comboOption, option.icon && styles.comboOptionWithIcon]}
            onPress={() => selectCategoryOption(option)}
          >
            {Boolean(option.icon) && (
              <View
                style={[
                  styles.categoryIcon,
                  {
                    backgroundColor: option.color + '20',
                  },
                ]}
              >
                <CategoryIcon
                  icon={option.originalIcon || option.icon}
                  size={18}
                  color={option.color}
                />
              </View>
            )}
            <Text style={styles.comboOptionText}>{option.name}</Text>
          </TouchableOpacity>
        ))
      : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>;
  };
  const getSelectedPath = () => {
    const {
      country,
      province,
      city,
      district,
      categoryType,
      category
    } = comboSelection;
    const parts = [];
    if (country) parts.push(country.name);
    if (province) parts.push(province.name);
    if (city) parts.push(city.name);
    if (district) parts.push(district.name || district);
    if (categoryType) {
      const typeNames = {
        country: t('channelManage.categoryTypes.country'),
        industry: t('channelManage.categoryTypes.industry'),
        enterprise: t('channelManage.categoryTypes.enterprise'),
        personal: t('channelManage.categoryTypes.personal')
      };
      parts.push(typeNames[categoryType]);
    }
    if (category) parts.push(category.name);
    return parts.length > 0 ? parts.join(' > ') : t('channelManage.notSelected');
  };
  const handleDonePress = async () => {
    if (isSavingChannels) {
      return;
    }

    if (!hasPendingChannelChanges) {
      navigation.goBack();
      return;
    }

    const persistedChannelKeySet = new Set(
      persistedMyChannels.map(channel => getChannelIdentityKey(channel)).filter(Boolean)
    );
    const draftChannelKeySet = new Set(
      myChannels.map(channel => getChannelIdentityKey(channel)).filter(Boolean)
    );
    const channelsToSubscribe = myChannels.filter(channel => {
      const identityKey = getChannelIdentityKey(channel);
      return identityKey && !persistedChannelKeySet.has(identityKey) && !isChannelUnavailable(channel);
    });
    const channelsToRemove = persistedMyChannels.filter(channel => {
      const identityKey = getChannelIdentityKey(channel);
      return identityKey && !draftChannelKeySet.has(identityKey);
    });
    const finalSubscribedCount = myChannels.filter(
      channel => !isLocalOnlyChannel(channel) && !isChannelUnavailable(channel)
    ).length;

    if (finalSubscribedCount <= 0) {
      showAppAlert(t('common.ok'), t('channelManage.keepOneAvailableChannel'));
      return;
    }

    setIsSavingChannels(true);

    try {
      for (const channel of channelsToSubscribe) {
        await subscribeChannel({
          targetType: channel.targetType,
          targetKey: channel.targetKey,
        });
      }

      for (const channel of channelsToRemove) {
        await removeMySubscribedChannel({
          targetType: channel.targetType,
          targetKey: channel.targetKey,
        });
      }

      await saveMySubscribedChannelOrder({
        items: myChannels
          .filter(channel => !isLocalOnlyChannel(channel) && !isChannelUnavailable(channel))
          .map((channel, index) => ({
            targetType: channel.targetType,
            targetKey: channel.targetKey,
            sortOrder: index,
          })),
      });

      const subscribedChannels = await reloadMyChannels();
      syncPersistedMyChannels(subscribedChannels);

      showAppAlert(
        t('common.ok'),
        t('channelManage.saveSuccess'),
        [{
          text: t('common.ok'),
          onPress: () => navigation.goBack()
        }],
        {
          cancelable: false
        }
      );
    } catch (error) {
      try {
        const subscribedChannels = await reloadMyChannels();
        syncPersistedMyChannels(subscribedChannels);
      } catch (reloadError) {
        console.error('Failed to reload subscribed channels after save failure:', reloadError);
      }

      showAppAlert(t('common.ok'), error?.message || t('common.retry'));
    } finally {
      setIsSavingChannels(false);
    }
  };
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (isSavingChannels) {
        event.preventDefault();
        return;
      }

      if (!hasPendingChannelChanges) {
        return;
      }

      event.preventDefault();

      const isChineseLocale = String(locale || '').toLowerCase().startsWith('zh');

      showAppAlert(
        isChineseLocale ? '未保存更改' : 'Unsaved Changes',
        isChineseLocale
          ? '你有未保存的频道变更，确定要放弃并离开当前页面吗？'
          : 'You have unsaved channel changes. Discard them and leave this page?',
        [
          {
            text: t('common.cancel'),
            style: 'cancel'
          },
          {
            text: t('common.confirm'),
            onPress: () => navigation.dispatch(event.data.action)
          }
        ],
        {
          cancelable: true
        }
      );
    });

    return unsubscribe;
  }, [hasPendingChannelChanges, isSavingChannels, locale, navigation, t]);
  return <SafeAreaView style={styles.container}>
      {/* 澶撮儴 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('channelManage.title')}</Text>
        <TouchableOpacity onPress={handleDonePress} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }}>
          <Text style={styles.saveBtn}>{t('channelManage.done')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!draggingChannelSnapshot}
        scrollEventThrottle={16}
        onLayout={() => {
        refreshMyChannelLayouts();
      }}
        onContentSizeChange={(width, height) => {
        scrollMetricsRef.current = {
          ...scrollMetricsRef.current,
          contentHeight: height
        };
      }}
        onScroll={event => {
        scrollMetricsRef.current = {
          ...scrollMetricsRef.current,
          offsetY: event.nativeEvent.contentOffset.y,
          viewportHeight: event.nativeEvent.layoutMeasurement.height,
          contentHeight: event.nativeEvent.contentSize.height
        };
      }}
      >
        {/* 鎴戠殑棰戦亾 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Ionicons name="star" size={18} color="#f59e0b" />
              <Text style={styles.sectionTitle}>{t('channelManage.myChannels')}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsEditMode(!isEditMode)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editBtn}>
                {isEditMode ? t('channelManage.done') : t('channelManage.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.myChannelsContainer} {...channelDragResponder}>
            {myChannels.length > 0 ? myChannels.map((channel, index) => (
              <ShakingChannelTag
                key={getRenderableChannelKey(channel, index)}
                channelKey={getRenderableChannelKey(channel, index)}
                channel={getChannelDisplayName(channel)}
                index={index}
                isDragging={draggingChannelKey === getRenderableChannelKey(channel, index)}
                isEditMode={isEditMode}
                isUnavailable={isChannelUnavailable(channel)}
                unavailableLabel={t('channelManage.channelUnavailable')}
                onDelete={() => toggleChannel(channel)}
                onLongPress={event => handleDragChannelStart(
                  getRenderableChannelKey(channel, index),
                  getChannelDisplayName(channel),
                  event,
                  isChannelUnavailable(channel),
                  t('channelManage.channelUnavailable')
                )}
                setTagRef={setMyChannelTagRef}
              />
            )) : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>}
          </View>
        </View>

        {/* 鍥藉闂 */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleLeft, styles.channelSectionTitleRow]}>
            <Ionicons name="flag" size={18} color="#3b82f6" />
            <Text style={styles.sectionTitle}>{t('channelManage.countryIssues')}</Text>
          </View>
          <View style={styles.channelsGrid}>
            {isCatalogLoading ? <Text style={styles.inlineHintText}>{t('common.loading')}</Text> : availableChannelOptionsByType.country.length > 0 ? availableChannelOptionsByType.country.map((channel, idx) => <TouchableOpacity key={channel.targetKey || channel.id || idx} style={styles.channelTagWrapper} onPress={() => toggleChannel(channel)}>
                <View style={styles.channelTag}>
                  <Text style={styles.channelText}>{getChannelDisplayName(channel)}</Text>
                  <View style={styles.plusIconContainer}>
                    <Text style={styles.channelPlusIcon}>+</Text>
                  </View>
                </View>
              </TouchableOpacity>) : <View style={styles.inlineStateRow}>
                <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>
                {isCatalogError ? <TouchableOpacity onPress={loadChannelCatalog}>
                    <Text style={styles.inlineRetryText}>{t('common.retry')}</Text>
                  </TouchableOpacity> : null}
              </View>}
          </View>
        </View>

        {/* 琛屼笟闂 */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleLeft, styles.channelSectionTitleRow]}>
            <Ionicons name="briefcase" size={18} color="#22c55e" />
            <Text style={styles.sectionTitle}>{t('channelManage.industryIssues')}</Text>
          </View>
          <View style={styles.channelsGrid}>
            {isCatalogLoading ? <Text style={styles.inlineHintText}>{t('common.loading')}</Text> : availableChannelOptionsByType.industry.length > 0 ? availableChannelOptionsByType.industry.map((channel, idx) => <TouchableOpacity key={channel.targetKey || channel.id || idx} style={styles.channelTagWrapper} onPress={() => toggleChannel(channel)}>
                <View style={styles.channelTag}>
                  <Text style={styles.channelText}>{getChannelDisplayName(channel)}</Text>
                  <View style={styles.plusIconContainer}>
                    <Text style={styles.channelPlusIcon}>+</Text>
                  </View>
                </View>
              </TouchableOpacity>) : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>}
          </View>
        </View>

        {/* 浼佷笟闂 */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleLeft, styles.channelSectionTitleRow]}>
            <Ionicons name="business" size={18} color="#f59e0b" />
            <Text style={styles.sectionTitle}>{t('channelManage.enterpriseIssues')}</Text>
          </View>
          <View style={styles.channelsGrid}>
            {isCatalogLoading ? <Text style={styles.inlineHintText}>{t('common.loading')}</Text> : availableChannelOptionsByType.enterprise.length > 0 ? availableChannelOptionsByType.enterprise.map((channel, idx) => <TouchableOpacity key={channel.targetKey || channel.id || idx} style={styles.channelTagWrapper} onPress={() => toggleChannel(channel)}>
                <View style={styles.channelTag}>
                  <Text style={styles.channelText}>{getChannelDisplayName(channel)}</Text>
                  <View style={styles.plusIconContainer}>
                    <Text style={styles.channelPlusIcon}>+</Text>
                  </View>
                </View>
              </TouchableOpacity>) : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>}
          </View>
        </View>

        {/* 涓汉闂 */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleLeft, styles.channelSectionTitleRow]}>
            <Ionicons name="person" size={18} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>{t('channelManage.personalIssues')}</Text>
          </View>
          <View style={styles.channelsGrid}>
            {isCatalogLoading ? <Text style={styles.inlineHintText}>{t('common.loading')}</Text> : availableChannelOptionsByType.personal.length > 0 ? availableChannelOptionsByType.personal.map((channel, idx) => <TouchableOpacity key={channel.targetKey || channel.id || idx} style={styles.channelTagWrapper} onPress={() => toggleChannel(channel)}>
                <View style={styles.channelTag}>
                  <Text style={styles.channelText}>{getChannelDisplayName(channel)}</Text>
                  <View style={styles.plusIconContainer}>
                    <Text style={styles.channelPlusIcon}>+</Text>
                  </View>
                </View>
              </TouchableOpacity>) : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text>}
          </View>
        </View>

        {/* 缁勫悎棰戦亾 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="layers" size={16} color="#ef4444" /> {t('channelManage.comboChannels')}
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowComboCreator(!showComboCreator)}>
              <Ionicons name={showComboCreator ? "remove-circle" : "add-circle"} size={20} color="#ef4444" />
              <Text style={styles.addBtnText}>{showComboCreator ? t('channelManage.collapse') : t('channelManage.expand')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionNote}>
            {t('channelManage.comboDescription')}
          </Text>

          {/* 鍒涘缓缁勫悎棰戦亾琛ㄥ崟 */}
          {Boolean(showComboCreator) && <View style={styles.comboCreator}>
              <View style={styles.comboSteps}>
                <View style={styles.comboStepHeader}>
                  <Text style={styles.comboStepTitle}>
                    {comboStep === 'region' ? t('channelManage.step1') : t('channelManage.step2')}
                  </Text>
                </View>
                <Text style={styles.comboPath}>{t('channelManage.selected')} {getSelectedPath()}</Text>
                
                {/* 鍖哄煙鎼滅储妗?- 鍙湪鍖哄煙閫夋嫨姝ラ鏄剧ず */}
                {comboStep === 'region' && <View style={styles.regionSearchContainer}>
                    <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput style={styles.regionSearchInput} placeholder={t('channelManage.searchRegion') || '鎼滅储鍦板尯...'} placeholderTextColor="#9ca3af" value={regionSearchText} onChangeText={setRegionSearchText} />
                    {regionSearchText.length > 0 && <TouchableOpacity onPress={() => setRegionSearchText('')} hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10
              }}>
                        <Ionicons name="close-circle" size={16} color="#9ca3af" />
                      </TouchableOpacity>}
                  </View>}
                
                <ScrollView style={styles.comboOptions} nestedScrollEnabled>
                  {comboStep === 'region' ?
              // 鍖哄煙閫夋嫨
              regionStatus === 'loading' ? <Text style={styles.inlineHintText}>{t('common.loading')}</Text> : getRegionOptions().length > 0 ? getRegionOptions().map((option, index) => <TouchableOpacity key={index} style={styles.comboOption} onPress={() => selectRegionOption(option)}>
                        <Text style={styles.comboOptionText}>
                          {typeof option === 'string' ? option : option.name}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                      </TouchableOpacity>) : regionStatus === 'error' ? <View style={styles.inlineStateRow}>
                        <Text style={styles.inlineEmptyText}>{regionErrorMessage || t('common.noData')}</Text>
                        <TouchableOpacity onPress={loadRegionOptions}>
                          <Text style={styles.inlineRetryText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                      </View> : <Text style={styles.inlineEmptyText}>{t('common.noData')}</Text> :
              // 鍒嗙被閫夋嫨
              renderComboCategoryContent()}
                </ScrollView>

                <View style={styles.comboActions}>
                  {comboStep === 'region' ? <>
                      {regionStep > 0 && <TouchableOpacity style={styles.comboBackBtn} onPress={() => {
                  setRegionStep(regionStep - 1);
                  const newSelection = {
                    ...comboSelection
                  };
                  if (regionStep === 1) {
                    newSelection.country = null;
                    newSelection.province = null;
                    newSelection.city = null;
                    newSelection.district = null;
                  }
                  if (regionStep === 2) {
                    newSelection.province = null;
                    newSelection.city = null;
                    newSelection.district = null;
                  }
                  if (regionStep === 3) {
                    newSelection.city = null;
                    newSelection.district = null;
                  }
                  setComboSelection(newSelection);
                  setRegionSearchText('');
                }}>
                          <Ionicons name="arrow-back" size={16} color="#6b7280" />
                          <Text style={styles.comboBackText}>{t('channelManage.previousStep')}</Text>
                        </TouchableOpacity>}
                      <TouchableOpacity style={styles.comboNextBtn} onPress={goToCategory}>
                        <Text style={styles.comboNextText}>{t('channelManage.nextStep')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                      </TouchableOpacity>
                    </> : <>
                      <TouchableOpacity style={styles.comboBackBtn} onPress={() => {
                  if (comboSelection.categoryType) {
                    // 杩斿洖鍒板垎绫荤被鍨嬮€夋嫨
                    setComboSelection({
                      ...comboSelection,
                      categoryType: null,
                      category: null
                    });
                  } else {
                    // 杩斿洖鍒板尯鍩熼€夋嫨
                    backToRegion();
                    setRegionSearchText(''); // 娓呯┖鎼滅储妗?
                  }
                }}>
                        <Ionicons name="arrow-back" size={16} color="#6b7280" />
                        <Text style={styles.comboBackText}>{t('channelManage.previousStep')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.comboCreateBtn, !comboSelection.category && styles.comboCreateBtnDisabled]} onPress={() => {
                  console.log('馃攳 Create button pressed');
                  console.log('馃搨 comboSelection.category:', comboSelection.category);
                  console.log('鉁?Can create:', comboSelection.category);
                  createComboChannel();
                }} disabled={!comboSelection.category || isCreatingCombo}>
                        <Text style={styles.comboCreateText}>
                          {t('channelManage.createChannel')}
                        </Text>
                      </TouchableOpacity>
                    </>}
                </View>
              </View>
            </View>}

          {/* 宸插垱寤虹殑缁勫悎棰戦亾 */}
          <View style={styles.comboList}>
            {false && myComboChannels.map(combo => <View key={combo.id} style={styles.comboItem}>
                <View style={styles.comboItemContent}>
                  <Text style={styles.comboItemName}>{combo.name}</Text>
                  <Text style={styles.comboItemPath}>{combo.path}</Text>
                </View>
                <TouchableOpacity onPress={() => {
              setMyComboChannels(myComboChannels.filter(c => c.id !== combo.id));
            }}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>)}
          </View>
        </View>

        <View style={{
        height: 30
      }} />
      </ScrollView>
      {draggingChannelSnapshot ? (
        <DraggingChannelOverlay
          channel={draggingChannelSnapshot.channel}
          isEditMode={isEditMode}
          dragPosition={dragPosition}
          dragScale={dragScale}
          width={draggingChannelSnapshot.width}
          isUnavailable={draggingChannelSnapshot.isUnavailable}
          unavailableLabel={draggingChannelSnapshot.unavailableLabel}
        />
      ) : null}
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center'
  },
  saveBtn: {
    fontSize: scaleFont(16),
    color: '#ef4444',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 8
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  channelSectionTitleRow: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937'
  },
  editBtn: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '500'
  },
  inlineStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 6
  },
  inlineHintText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    width: '100%',
    paddingVertical: 6
  },
  inlineEmptyText: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    width: '100%',
    paddingVertical: 6
  },
  inlineRetryText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    fontWeight: '500'
  },
  // 鎴戠殑棰戦亾鏍峰紡
  myChannelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -4,
    marginBottom: -4
  },
  myChannelTagWrapper: {
    marginRight: 4,
    marginBottom: 4
  },
  myChannelTagDraggingPlaceholder: {
    borderRadius: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.12)'
  },
  draggingTagOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 999
  },
  draggingTagShadow: {
    shadowColor: '#111827',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8
  },
  myChannelTag: {
    position: 'relative',
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 6
  },
  myChannelTagViewMode: {
    paddingHorizontal: 14
  },
  myChannelTagEditMode: {
    paddingLeft: 14,
    paddingRight: 22
  },
  myChannelTagUnavailable: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  myChannelTagUnavailableViewMode: {
    paddingRight: 58
  },
  myChannelTagUnavailableEditMode: {
    paddingRight: 68
  },
  myChannelText: {
    fontSize: scaleFont(15),
    color: '#374151',
    fontWeight: '400'
  },
  myChannelTextUnavailable: {
    color: '#9ca3af'
  },
  myChannelStatusBadge: {
    position: 'absolute',
    right: 8,
    bottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#e5e7eb'
  },
  myChannelStatusBadgeEditMode: {
    right: 18
  },
  myChannelStatusBadgeText: {
    fontSize: scaleFont(10),
    color: '#6b7280',
    fontWeight: '500'
  },
  deleteIconContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 2
  },
  // 棰戦亾缃戞牸鏍峰紡
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -8,
    marginBottom: -8
  },
  channelTagWrapper: {
    marginRight: 8,
    marginBottom: 8
  },
  channelTag: {
    position: 'relative',
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  channelText: {
    fontSize: scaleFont(15),
    color: '#374151',
    fontWeight: '400'
  },
  plusIconContainer: {
    position: 'absolute',
    top: -2,
    right: 0,
    padding: 2
  },
  channelPlusIcon: {
    fontSize: scaleFont(14),
    color: '#374151',
    fontWeight: '600'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionNote: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    lineHeight: scaleFont(18),
    marginBottom: 8
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addBtnText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '500'
  },
  comboCreator: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  comboDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: scaleFont(18)
  },
  comboInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12
  },
  comboSteps: {
    marginTop: 8
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 60
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepDotActive: {
    backgroundColor: '#ef4444'
  },
  stepDotText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#9ca3af'
  },
  stepDotTextActive: {
    color: '#fff'
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6
  },
  stepLineActive: {
    backgroundColor: '#ef4444'
  },
  comboStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  comboStepTitle: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937'
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  skipBtnText: {
    fontSize: scaleFont(12),
    color: '#ef4444'
  },
  comboPath: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    marginBottom: 8
  },
  regionSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchIcon: {
    marginRight: 6
  },
  regionSearchInput: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#374151',
    padding: 0
  },
  comboOptions: {
    maxHeight: 200,
    marginBottom: 12
  },
  comboOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 4
  },
  comboOptionWithIcon: {
    paddingVertical: 8
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  comboOptionText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#374151'
  },
  comboActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  comboBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  comboBackText: {
    fontSize: scaleFont(13),
    color: '#6b7280'
  },
  comboNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 6
  },
  comboNextText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  comboCreateBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center'
  },
  comboCreateBtnDisabled: {
    backgroundColor: '#fca5a5',
    opacity: 0.6
  },
  comboCreateText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600'
  },
  comboList: {
    display: 'none'
  },
  comboItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  comboItemContent: {
    flex: 1
  },
  comboItemName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  comboItemPath: {
    fontSize: scaleFont(11),
    color: '#ef4444'
  }
});
