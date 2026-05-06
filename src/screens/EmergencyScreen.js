import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import i18n from '../i18n';
import { modalTokens } from '../components/modalTokens';
import RegionSelector from '../components/RegionSelector';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import emergencyApi from '../services/api/emergencyApi';
import walletApi from '../services/api/walletApi';
import uploadApi from '../services/api/uploadApi';
import { buildEmergencyAddressText, resolveChinaRegionFromAddress } from '../utils/chinaRegionMatcher';

import { scaleFont } from '../utils/responsive';

const MAX_IMAGE_COUNT = 3;
const MAX_DESCRIPTION_LENGTH = 500;
const DEFAULT_EMERGENCY_SETTINGS = {
  quickTitles: [],
  feeConfig: {
    period: 'DAY',
    freeCount: 0,
    extraFeeCents: 0,
  },
  timeoutConfig: {
    responseMinutes: 30,
    autoCompleteEnabled: true,
  },
  freeHelperSlots: 5,
  extraHelperPriceCents: 0,
  nearbyNotifyRadiusKm: 5,
};
const DEFAULT_EMERGENCY_QUOTA = {
  period: 'DAY',
  total: 0,
  used: 0,
  remaining: 0,
};
const DEFAULT_EMERGENCY_COST_ESTIMATE = {
  period: 'DAY',
  freePerPeriod: 0,
  usedInPeriod: 0,
  remainingFree: 0,
  freeHelperSlots: 5,
  extraHelperPoints: 0,
  extraPublishPoints: 0,
  helperOverageCount: 0,
  helperOveragePoints: 0,
  publishOveragePoints: 0,
  needConsume: false,
  consumePoints: 0,
  availablePoints: 0,
};
const QUICK_TITLE_CATEGORY_MAP = {
  个人安全求助: 1,
  紧急医疗求助: 2,
  财物丢失求助: 3,
};

const DEFAULT_SELECTED_REGION = {
  country: '',
  countryId: '',
  city: '',
  cityId: '',
  state: '',
  stateId: '',
  district: '',
  districtId: '',
};

const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 30000;

const isSuccessResponse = (response) => {
  const code = Number(response?.code ?? response?.data?.code);
  return code === 200 || code === 0;
};

const extractResponsePayload = (response) => {
  const data = response?.data;

  if (data && typeof data === 'object' && !Array.isArray(data) && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data;
  }

  return data;
};

const withAsyncTimeout = (promiseFactory, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve()
      .then(() => promiseFactory())
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const toPositiveIntOrUndefined = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return undefined;
  }

  const normalized = Math.trunc(num);
  return normalized > 0 ? normalized : undefined;
};

const normalizePoints = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return Math.max(0, Math.round(fallback));
  }

  return Math.max(0, Math.round(num));
};

const normalizeMajorUnitPoints = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return Math.max(0, Math.round((Number(fallback) + Number.EPSILON) * 100) / 100);
  }

  return Math.max(0, Math.round((num + Number.EPSILON) * 100) / 100);
};

const convertCentBasedPointsToMajorUnit = (value) => normalizePoints(value, 0) / 100;

const formatCentBasedPointsDisplay = (value) => {
  const normalized = convertCentBasedPointsToMajorUnit(value);
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }

  return normalized.toFixed(2).replace(/\.?0+$/, '');
};

const clampHelperCount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 1;
  }

  return Math.min(20, Math.max(1, Math.round(num)));
};

const inferEmergencyCategory = (title) => {
  const normalizedTitle = String(title || '').trim();

  if (QUICK_TITLE_CATEGORY_MAP[normalizedTitle]) {
    return QUICK_TITLE_CATEGORY_MAP[normalizedTitle];
  }

  if (normalizedTitle.includes('安全')) {
    return 1;
  }
  if (normalizedTitle.includes('医疗') || normalizedTitle.includes('急救')) {
    return 2;
  }
  if (normalizedTitle.includes('财物') || normalizedTitle.includes('丢失')) {
    return 3;
  }
  if (normalizedTitle.includes('车辆') || normalizedTitle.includes('车')) {
    return 4;
  }
  if (normalizedTitle.includes('动物') || normalizedTitle.includes('宠物')) {
    return 5;
  }

  return 6;
};

const getEmergencyPeriodLabel = (period) => {
  switch (String(period || '').toUpperCase()) {
    case 'DAY':
      return '每日';
    case 'WEEK':
      return '每周';
    case 'MONTH':
      return '每月';
    default:
      return '';
  }
};

const buildLocatedSpecificAddress = (address = {}) => {
  const streetLine = [address.streetNumber, address.street].filter(Boolean).join(' ');
  return [address.name, streetLine].filter(Boolean).join(' ').trim();
};

const resolveEmergencyRegionPayload = ({ resolvedChinaRegion, selectedRegion }) => {
  const directProvinceId = toPositiveIntOrUndefined(resolvedChinaRegion?.provinceId);
  const directCityId = toPositiveIntOrUndefined(resolvedChinaRegion?.cityId);
  const directDistrictId = toPositiveIntOrUndefined(resolvedChinaRegion?.districtId);
  const manualProvinceId = toPositiveIntOrUndefined(selectedRegion?.cityId);
  const manualCityId = toPositiveIntOrUndefined(selectedRegion?.stateId);
  const manualDistrictId = toPositiveIntOrUndefined(selectedRegion?.districtId);

  const baseProvinceId = directProvinceId || manualProvinceId || manualCityId || manualDistrictId;
  const baseCityId = directCityId || manualCityId || manualDistrictId || baseProvinceId;
  const baseDistrictId = directDistrictId || manualDistrictId || manualCityId || baseCityId || baseProvinceId;

  return {
    provinceId: baseProvinceId,
    cityId: baseCityId,
    districtId: baseDistrictId,
    provinceName:
      resolvedChinaRegion?.provinceName ||
      selectedRegion?.city ||
      selectedRegion?.state ||
      selectedRegion?.district ||
      '',
    cityName:
      resolvedChinaRegion?.cityName ||
      selectedRegion?.state ||
      selectedRegion?.district ||
      selectedRegion?.city ||
      '',
    districtName:
      resolvedChinaRegion?.districtName ||
      selectedRegion?.district ||
      selectedRegion?.state ||
      selectedRegion?.city ||
      '',
  };
};

export default function EmergencyScreen({ navigation }) {
  const t = (key) => {
    if (!i18n || typeof i18n.t !== 'function') {
      return key;
    }
    return i18n.t(key);
  };

  const [emergencyForm, setEmergencyForm] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    contact: '', 
    specificLocation: '',
    rescuerCount: 1 
  });
  const [emergencyImages, setEmergencyImages] = useState([]); // 紧急求助图片片?
  const [showProgressModal, setShowProgressModal] = useState(false); // 显示进度模态框
  const [emergencyQuota, setEmergencyQuota] = useState(DEFAULT_EMERGENCY_QUOTA);
  const [isLocating, setIsLocating] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_SELECTED_REGION);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [locationAddress, setLocationAddress] = useState(null);
  const [resolvedChinaRegion, setResolvedChinaRegion] = useState(null);
  const [emergencySettings, setEmergencySettings] = useState(DEFAULT_EMERGENCY_SETTINGS);
  const [emergencyCostEstimate, setEmergencyCostEstimate] = useState(DEFAULT_EMERGENCY_COST_ESTIMATE);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsAcknowledged, setPointsAcknowledged] = useState(false);
  const [pricingInitialized, setPricingInitialized] = useState(false);
  const [progressMessage, setProgressMessage] = useState('请稍候，正在提交紧急求助...');
  const emergencyFormRef = React.useRef({
    title: '',
    description: '',
    location: '',
    contact: '',
    specificLocation: '',
    rescuerCount: 1,
  });
  const emergencyQuotaRef = React.useRef(DEFAULT_EMERGENCY_QUOTA);
  const emergencySettingsRef = React.useRef(DEFAULT_EMERGENCY_SETTINGS);
  const emergencyPointsBalanceRef = React.useRef(0);

  const toSafeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  React.useEffect(() => {
    emergencyFormRef.current = emergencyForm;
  }, [emergencyForm]);

  React.useEffect(() => {
    emergencyQuotaRef.current = emergencyQuota;
  }, [emergencyQuota]);

  React.useEffect(() => {
    emergencySettingsRef.current = emergencySettings;
  }, [emergencySettings]);

  React.useEffect(() => {
    emergencyPointsBalanceRef.current = pointsBalance;
  }, [pointsBalance]);

  const normalizeEmergencySettings = React.useCallback((rawSettings = {}) => {
    const feeConfig = rawSettings?.feeConfig || {};
    const timeoutConfig = rawSettings?.timeoutConfig || {};
    const quickTitles = Array.isArray(rawSettings?.quickTitles)
      ? rawSettings.quickTitles
          .filter((item) => item && item.isoff !== true && String(item.name || '').trim())
          .map((item) => String(item.name || '').trim())
      : [];

    const normalized = {
      quickTitles,
      feeConfig: {
        period: feeConfig?.period || DEFAULT_EMERGENCY_SETTINGS.feeConfig.period,
        freeCount: Math.max(0, Math.round(toSafeNumber(feeConfig?.freeCount, DEFAULT_EMERGENCY_SETTINGS.feeConfig.freeCount))),
        extraFeeCents: Math.max(0, Math.round(toSafeNumber(feeConfig?.extraFeeCents, DEFAULT_EMERGENCY_SETTINGS.feeConfig.extraFeeCents))),
      },
      timeoutConfig: {
        responseMinutes: Math.max(1, Math.round(toSafeNumber(timeoutConfig?.responseMinutes, DEFAULT_EMERGENCY_SETTINGS.timeoutConfig.responseMinutes))),
        autoCompleteEnabled: timeoutConfig?.autoCompleteEnabled ?? DEFAULT_EMERGENCY_SETTINGS.timeoutConfig.autoCompleteEnabled,
      },
      freeHelperSlots: Math.max(0, Math.round(toSafeNumber(rawSettings?.freeHelperSlots, DEFAULT_EMERGENCY_SETTINGS.freeHelperSlots))),
      extraHelperPriceCents: Math.max(0, Math.round(toSafeNumber(rawSettings?.extraHelperPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraHelperPriceCents))),
      nearbyNotifyRadiusKm: Math.max(0, toSafeNumber(rawSettings?.nearbyNotifyRadiusKm, DEFAULT_EMERGENCY_SETTINGS.nearbyNotifyRadiusKm)),
    };

    setEmergencySettings(normalized);
    return normalized;
  }, []);

  const loadEmergencySettings = React.useCallback(async () => {
    try {
      const response = await emergencyApi.getPublicSettings();
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || 'Failed to load emergency public settings');
      }
      return normalizeEmergencySettings(extractResponsePayload(response) || {});
    } catch (error) {
      console.error('Failed to load emergency public settings:', error);
      showToast('紧急求助配置加载失败', 'error');
      setEmergencySettings(DEFAULT_EMERGENCY_SETTINGS);
      return DEFAULT_EMERGENCY_SETTINGS;
    }
  }, [normalizeEmergencySettings]);

  const normalizeEmergencyQuota = React.useCallback((rawQuota = {}, fallbackTotal = 0) => {
    const total = Math.max(0, Math.round(toSafeNumber(rawQuota?.total, fallbackTotal)));
    const used = Math.max(0, Math.round(toSafeNumber(rawQuota?.used, DEFAULT_EMERGENCY_QUOTA.used)));
    const remaining = Math.max(0, Math.round(toSafeNumber(rawQuota?.remaining, Math.max(0, total - used))));
    const normalized = {
      period: rawQuota?.period || DEFAULT_EMERGENCY_QUOTA.period,
      total,
      used,
      remaining,
    };
    setEmergencyQuota(normalized);
    return normalized;
  }, []);

  const loadEmergencyQuota = React.useCallback(async (fallbackTotal = 0) => {
    try {
      const response = await emergencyApi.getQuota();
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || 'Failed to load emergency quota');
      }
      return normalizeEmergencyQuota(extractResponsePayload(response) || {}, fallbackTotal);
    } catch (error) {
      console.error('Failed to load emergency quota:', error);
      showToast('免费额度加载失败', 'error');
      return normalizeEmergencyQuota(DEFAULT_EMERGENCY_QUOTA, fallbackTotal);
    }
  }, [normalizeEmergencyQuota]);

  const loadWalletPointsBalance = React.useCallback(async () => {
    try {
      const response = await walletApi.getPointsOverview();
      const nextBalance = normalizeMajorUnitPoints(response?.data?.balance, 0);
      setPointsBalance(nextBalance);
      return nextBalance;
    } catch (error) {
      console.error('Failed to load points balance:', error);
      return emergencyPointsBalanceRef.current;
    }
  }, []);

  const buildLocalCostEstimate = React.useCallback((neededHelperCount, sourceQuota, sourceSettings, sourcePointsBalance) => {
    const resolvedQuota = sourceQuota || emergencyQuotaRef.current;
    const resolvedSettings = sourceSettings || emergencySettingsRef.current;
    const requestedHelperCount = clampHelperCount(neededHelperCount);
    const freePerPeriod = Math.max(
      0,
      Math.round(
        toSafeNumber(
          resolvedQuota?.total,
          resolvedSettings?.feeConfig?.freeCount ?? DEFAULT_EMERGENCY_SETTINGS.feeConfig.freeCount
        )
      )
    );
    const remainingFree = Math.max(0, Math.round(toSafeNumber(resolvedQuota?.remaining, freePerPeriod)));
    const usedInPeriod = Math.max(0, Math.round(toSafeNumber(resolvedQuota?.used, freePerPeriod - remainingFree)));
    const freeHelperSlots = Math.max(0, Math.round(toSafeNumber(resolvedSettings?.freeHelperSlots, DEFAULT_EMERGENCY_COST_ESTIMATE.freeHelperSlots)));
    const extraHelperPoints = Math.max(0, Math.round(toSafeNumber(resolvedSettings?.extraHelperPriceCents, DEFAULT_EMERGENCY_COST_ESTIMATE.extraHelperPoints)));
    const extraPublishPoints = Math.max(0, Math.round(toSafeNumber(resolvedSettings?.feeConfig?.extraFeeCents, DEFAULT_EMERGENCY_COST_ESTIMATE.extraPublishPoints)));
    const helperOverageCount = Math.max(0, requestedHelperCount - freeHelperSlots);
    const helperOveragePoints = helperOverageCount * extraHelperPoints;
    const publishOveragePoints = remainingFree <= 0 ? extraPublishPoints : 0;
    const consumePoints = helperOveragePoints + publishOveragePoints;

    return {
      period: resolvedQuota?.period || resolvedSettings?.feeConfig?.period || DEFAULT_EMERGENCY_COST_ESTIMATE.period,
      freePerPeriod,
      usedInPeriod,
      remainingFree,
      freeHelperSlots,
      extraHelperPoints,
      extraPublishPoints,
      helperOverageCount,
      helperOveragePoints,
      publishOveragePoints,
      needConsume: consumePoints > 0,
      consumePoints,
      availablePoints: normalizeMajorUnitPoints(sourcePointsBalance, emergencyPointsBalanceRef.current),
    };
  }, []);

  const normalizeEmergencyCostEstimate = React.useCallback((rawData = {}, neededHelperCount, sourceQuota, sourceSettings, sourcePointsBalance) => {
    const fallback = buildLocalCostEstimate(neededHelperCount, sourceQuota, sourceSettings, sourcePointsBalance);
    const helperOveragePoints = Math.max(0, Math.round(toSafeNumber(rawData?.helperOverageFeeCents, rawData?.helperOveragePoints ?? fallback.helperOveragePoints)));
    const publishOveragePoints = Math.max(0, Math.round(toSafeNumber(rawData?.publishOverageFeeCents, rawData?.publishOveragePoints ?? fallback.publishOveragePoints)));
    const consumePoints = normalizePoints(rawData?.totalFeeCents, rawData?.consumePoints ?? (helperOveragePoints + publishOveragePoints));

    return {
      period: rawData?.period || fallback.period,
      freePerPeriod: Math.max(0, Math.round(toSafeNumber(rawData?.freePerPeriod, fallback.freePerPeriod))),
      usedInPeriod: Math.max(0, Math.round(toSafeNumber(rawData?.usedInPeriod, fallback.usedInPeriod))),
      remainingFree: Math.max(0, Math.round(toSafeNumber(rawData?.remainingFree, fallback.remainingFree))),
      freeHelperSlots: Math.max(0, Math.round(toSafeNumber(rawData?.freeHelperSlots, fallback.freeHelperSlots))),
      extraHelperPoints: Math.max(0, Math.round(toSafeNumber(rawData?.extraHelperPriceCents, rawData?.extraHelperPoints ?? fallback.extraHelperPoints))),
      extraPublishPoints: Math.max(0, Math.round(toSafeNumber(rawData?.extraPublishFeeCents, rawData?.extraPublishPoints ?? fallback.extraPublishPoints))),
      helperOverageCount: Math.max(0, Math.round(toSafeNumber(rawData?.helperOverageCount, fallback.helperOverageCount))),
      helperOveragePoints,
      publishOveragePoints,
      needConsume: consumePoints > 0,
      consumePoints,
      availablePoints: normalizeMajorUnitPoints(sourcePointsBalance, fallback.availablePoints),
    };
  }, [buildLocalCostEstimate]);

  const loadEmergencyCostEstimate = React.useCallback(async (neededHelperCount, options = {}) => {
    const requestedHelperCount = clampHelperCount(neededHelperCount);
    const sourceQuota = options?.quota || emergencyQuotaRef.current;
    const sourceSettings = options?.settings || emergencySettingsRef.current;
    const sourcePointsBalance =
      options?.pointsBalance === undefined
        ? emergencyPointsBalanceRef.current
        : options.pointsBalance;

    try {
      const response = await emergencyApi.getFeeEstimate({ neededHelperCount: requestedHelperCount });
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || 'Failed to load emergency points estimate');
      }

      const estimateData = normalizeEmergencyCostEstimate(
        extractResponsePayload(response) || {},
        requestedHelperCount,
        sourceQuota,
        sourceSettings,
        sourcePointsBalance
      );
      setEmergencyCostEstimate(estimateData);
      return estimateData;
    } catch (error) {
      console.error('Failed to load emergency points estimate:', error);
      if (!options?.silent) {
        showToast('积分消耗计算失败，请稍后重试', 'error');
      }
      const fallbackData = buildLocalCostEstimate(requestedHelperCount, sourceQuota, sourceSettings, sourcePointsBalance);
      setEmergencyCostEstimate(fallbackData);
      return fallbackData;
    }
  }, [buildLocalCostEstimate, normalizeEmergencyCostEstimate]);

  React.useEffect(() => {
    let isActive = true;

    const syncEmergencyData = async () => {
      setPricingInitialized(false);
      const requestedHelperCount = clampHelperCount(emergencyFormRef.current?.rescuerCount);
      const [settingsResult, quotaResult, pointsBalanceResult] = await Promise.allSettled([
        loadEmergencySettings(),
        loadEmergencyQuota(DEFAULT_EMERGENCY_SETTINGS.feeConfig.freeCount),
        loadWalletPointsBalance(),
      ]);

      if (!isActive) {
        return;
      }

      const resolvedSettings = settingsResult.status === 'fulfilled'
        ? settingsResult.value
        : DEFAULT_EMERGENCY_SETTINGS;
      const resolvedQuota = quotaResult.status === 'fulfilled'
        ? quotaResult.value
        : normalizeEmergencyQuota(
          DEFAULT_EMERGENCY_QUOTA,
          resolvedSettings?.feeConfig?.freeCount ?? DEFAULT_EMERGENCY_SETTINGS.feeConfig.freeCount
        );
      const resolvedPointsBalance = pointsBalanceResult.status === 'fulfilled'
        ? pointsBalanceResult.value
        : emergencyPointsBalanceRef.current;

      await loadEmergencyCostEstimate(requestedHelperCount, {
        settings: resolvedSettings,
        quota: resolvedQuota,
        pointsBalance: resolvedPointsBalance,
        silent: true,
      });

      if (isActive) {
        setPricingInitialized(true);
      }
    };

    syncEmergencyData();

    return () => {
      isActive = false;
    };
  }, [loadEmergencyCostEstimate, loadEmergencyQuota, loadEmergencySettings, loadWalletPointsBalance, normalizeEmergencyQuota]);

  React.useEffect(() => {
    if (!pricingInitialized) {
      return undefined;
    }

    const helperCount = clampHelperCount(emergencyForm.rescuerCount);
    const timer = setTimeout(() => {
      loadEmergencyCostEstimate(helperCount, { silent: true });
    }, 250);

    return () => clearTimeout(timer);
  }, [emergencyForm.rescuerCount, loadEmergencyCostEstimate, pricingInitialized]);

  const fallbackEstimate = buildLocalCostEstimate(emergencyForm.rescuerCount || 1, emergencyQuota, emergencySettings, pointsBalance);
  const activeCostEstimate = emergencyCostEstimate || fallbackEstimate;
  const freeCount = Math.max(0, Math.round(toSafeNumber(emergencyQuota?.total, DEFAULT_EMERGENCY_QUOTA.total)));
  const remainingFree = Math.max(0, Math.round(toSafeNumber(emergencyQuota?.remaining, DEFAULT_EMERGENCY_QUOTA.remaining)));
  const freeCountDisplay = `${remainingFree}/${freeCount}`;
  const quotaPeriodLabel = getEmergencyPeriodLabel(emergencyQuota?.period || emergencySettings?.feeConfig?.period);
  const freeCountLabel = quotaPeriodLabel ? `${quotaPeriodLabel}免费次数：` : '免费次数：';
  const hasRemainingFree = remainingFree > 0;

  const freeRescuerLimit = Math.max(0, Math.round(toSafeNumber(activeCostEstimate?.freeHelperSlots, DEFAULT_EMERGENCY_SETTINGS.freeHelperSlots)));
  const helperOverageCount = Math.max(0, Math.round(toSafeNumber(activeCostEstimate?.helperOverageCount, Math.max(0, (Number(emergencyForm.rescuerCount) || 1) - freeRescuerLimit))));
  const helperOveragePoints = normalizePoints(activeCostEstimate?.helperOveragePoints, 0);
  const publishOveragePoints = normalizePoints(activeCostEstimate?.publishOveragePoints, 0);
  const totalConsumePoints = normalizePoints(activeCostEstimate?.consumePoints, helperOveragePoints + publishOveragePoints);
  const requiredBalancePoints = convertCentBasedPointsToMajorUnit(totalConsumePoints);
  const helperOveragePointsDisplay = formatCentBasedPointsDisplay(helperOveragePoints);
  const publishOveragePointsDisplay = formatCentBasedPointsDisplay(publishOveragePoints);
  const totalConsumePointsDisplay = formatCentBasedPointsDisplay(totalConsumePoints);
  const needConsumePoints = Boolean(activeCostEstimate?.needConsume) || totalConsumePoints > 0;
  const nearbyNotifyRadiusKm = Math.max(0, toSafeNumber(emergencySettings?.nearbyNotifyRadiusKm, DEFAULT_EMERGENCY_SETTINGS.nearbyNotifyRadiusKm));
  const quickTitles = React.useMemo(() => emergencySettings.quickTitles || [], [emergencySettings.quickTitles]);

  React.useEffect(() => {
    setPointsAcknowledged(false);
  }, [emergencyForm.rescuerCount, totalConsumePoints]);

  const regionDisplay = React.useMemo(() => {
    const parts = [
      resolvedChinaRegion?.provinceName || selectedRegion.city || '',
      resolvedChinaRegion?.cityName || selectedRegion.state || '',
      resolvedChinaRegion?.districtName || selectedRegion.district || '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join('·');
    }

    return (emergencyForm.location || '').trim();
  }, [emergencyForm.location, resolvedChinaRegion, selectedRegion.city, selectedRegion.district, selectedRegion.state]);

  const normalizedTitle = emergencyForm.title.trim();
  const normalizedDescription = emergencyForm.description.trim();
  const normalizedContactValue = normalizePhoneNumber(emergencyForm.contact);
  const requestedHelperCount = clampHelperCount(emergencyForm.rescuerCount);
  const locationInputValue = (emergencyForm.location || '').trim();
  const hasCoordinates = Number.isFinite(Number(selectedCoordinates?.latitude)) && Number.isFinite(Number(selectedCoordinates?.longitude));
  const draftRegionPayload = resolveEmergencyRegionPayload({ resolvedChinaRegion, selectedRegion });
  const hasRegionSelection = Boolean(
    draftRegionPayload.provinceId ||
    draftRegionPayload.cityId ||
    draftRegionPayload.districtId
  );
  const hasPublishLocation = hasCoordinates || hasRegionSelection;
  const hasLocationSelectionText = Boolean(locationInputValue || regionDisplay);
  const hasVisibleAddress = Boolean(regionDisplay || (emergencyForm.specificLocation || '').trim());
  const requiresPointsAcknowledgement = needConsumePoints;
  const canSubmit =
    Boolean(normalizedTitle) &&
    Boolean(normalizedDescription) &&
    Boolean(normalizedContactValue) &&
    isValidPhoneNumber(normalizedContactValue) &&
    requestedHelperCount >= 1 &&
    requestedHelperCount <= 20 &&
    hasPublishLocation &&
    hasLocationSelectionText &&
    hasVisibleAddress &&
    (!requiresPointsAcknowledgement || pointsAcknowledged) &&
    !showProgressModal;

  const openRegionSelector = () => {
    setShowRegionModal(true);
  };

  const handleRegionChange = React.useCallback((nextRegion) => {
    const normalizedRegion = {
      ...DEFAULT_SELECTED_REGION,
      ...nextRegion,
    };
    const locationText = [
      normalizedRegion.country,
      normalizedRegion.city,
      normalizedRegion.state,
      normalizedRegion.district,
    ]
      .filter(Boolean)
      .join(' ');

    setSelectedRegion(normalizedRegion);
    setEmergencyForm((prev) => ({ ...prev, location: locationText }));
    setSelectedCoordinates(null);
    setLocationAddress(null);
    setResolvedChinaRegion({
      provinceId: toPositiveIntOrUndefined(normalizedRegion.cityId),
      cityId: toPositiveIntOrUndefined(normalizedRegion.stateId),
      districtId: toPositiveIntOrUndefined(normalizedRegion.districtId),
      provinceName: normalizedRegion.city || '',
      cityName: normalizedRegion.state || '',
      districtName: normalizedRegion.district || '',
    });
  }, []);

  // 请求相册权限
  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAppAlert('提示', '需要相册访问权限才能上传图片');
        return false;
      }
    }
    return true;
  };

  // 选择图片
  const pickImage = async () => {
    // 检查图片数量限制
    if (emergencyImages.length >= MAX_IMAGE_COUNT) {
      showToast(`图片数量不能超过${MAX_IMAGE_COUNT}张`, 'warning');
      return;
    }

    // 请求权限
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          id: Date.now(),
          uri: result.assets[0].uri
        };
        setEmergencyImages([...emergencyImages, newImage]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      showToast('选择图片失败，请重试', 'error');
    }
  };

  // 拍照
  const takePhoto = async () => {
    // 检查图片数量限制
    if (emergencyImages.length >= MAX_IMAGE_COUNT) {
      showToast(`图片数量不能超过${MAX_IMAGE_COUNT}张`, 'warning');
      return;
    }

    // 请求相机权限
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAppAlert('提示', '需要相机访问权限才能拍照');
        return;
      }
    }

    try {
      // 打开相机
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = {
          id: Date.now(),
          uri: result.assets[0].uri
        };
        setEmergencyImages([...emergencyImages, newImage]);
      }
    } catch (error) {
      console.error('拍照失败:', error);
      showToast('拍照失败，请重试', 'error');
    }
  };

  // 显示图片选择选项
  const showImagePickerOptions = () => {
    showAppAlert(
      '选择图片',
      '请选择图片来源',
      [
        {
          text: '拍照',
          onPress: takePhoto
        },
        {
          text: '从相册选择',
          onPress: pickImage
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  // 删除图片
  const removeImage = (id) => {
    setEmergencyImages(emergencyImages.filter(img => img.id !== id));
  };

  function normalizePhoneNumber(phone) {
    return String(phone || '').replace(/[\s\-\(\)]/g, '').trim();
  }

  function isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    return phoneRegex.test(normalizePhoneNumber(phone));
  }

  const handleLocate = async () => {
    try {
      setIsLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAppAlert('提示', '需要定位权限才能获取当前位置，您也可以手动选择地区。', [
          { text: '手动选择', onPress: openRegionSelector },
          { text: '知道了', style: 'cancel' },
        ]);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const addressList = await Location.reverseGeocodeAsync({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });

      if (!addressList || addressList.length === 0) {
        showAppAlert('提示', '未能识别当前位置，请手动选择地区。', [
          { text: '手动选择', onPress: openRegionSelector },
          { text: '知道了', style: 'cancel' },
        ]);
        return;
      }

      const address = addressList[0];
      const locationParts = [
        address.country,
        address.region || address.city,
        address.city,
        address.district || address.subregion,
      ].filter(Boolean);

      const locationText = locationParts.join(' ');
      const locatedSpecificAddress = buildLocatedSpecificAddress(address);
      const matchedRegion = resolveChinaRegionFromAddress(address);

      setEmergencyForm((prev) => ({
        ...prev,
        location: locationText,
        specificLocation: prev.specificLocation || locatedSpecificAddress,
      }));
      setSelectedCoordinates({
        latitude: toSafeNumber(currentPosition?.coords?.latitude, 0),
        longitude: toSafeNumber(currentPosition?.coords?.longitude, 0),
      });
      setLocationAddress(address);
      setResolvedChinaRegion(matchedRegion);
      setSelectedRegion(
        matchedRegion
          ? {
              ...DEFAULT_SELECTED_REGION,
              country: address.country || '中国',
              city: matchedRegion.provinceName,
              cityId: String(matchedRegion.provinceId),
              state: matchedRegion.cityName,
              stateId: String(matchedRegion.cityId),
              district: matchedRegion.districtName,
              districtId: String(matchedRegion.districtId),
            }
          : DEFAULT_SELECTED_REGION
      );
      showAppAlert('成功', '已获取当前位置');
    } catch (error) {
      console.error('Failed to locate emergency address:', error);
      showAppAlert('提示', '定位失败，请稍后重试或手动选择地区。', [
        { text: '手动选择', onPress: openRegionSelector },
        { text: '知道了', style: 'cancel' },
      ]);
    } finally {
      setIsLocating(false);
    }
  };

  const uploadEmergencyImages = async () => {
    if (!Array.isArray(emergencyImages) || emergencyImages.length === 0) {
      return [];
    }

    if (emergencyImages.length > MAX_IMAGE_COUNT) {
      throw new Error(`图片数量不能超过${MAX_IMAGE_COUNT}张`);
    }

    const imageUrls = [];
    for (let index = 0; index < emergencyImages.length; index += 1) {
      const image = emergencyImages[index];
      setProgressMessage(`正在上传图片 ${index + 1}/${emergencyImages.length}...`);
      const uploadResult = await withAsyncTimeout(
        () => uploadApi.uploadImage({
          uri: image.uri,
          name: `emergency_${Date.now()}_${index}.jpg`,
          type: 'image/jpeg',
        }),
        UPLOAD_TIMEOUT_MS,
        `第 ${index + 1} 张图片上传超时，请稍后重试`
      );

      const uploadPayload = extractResponsePayload(uploadResult);
      if (!isSuccessResponse(uploadResult) || !uploadPayload) {
        throw new Error(uploadResult?.msg || '图片上传失败');
      }

      const uploadUrl = typeof uploadPayload === 'string'
        ? uploadPayload
        : (
          uploadPayload?.url ||
          uploadPayload?.imageUrl ||
          uploadPayload?.fileUrl ||
          uploadPayload?.path ||
          ''
        );

      if (!uploadUrl) {
        throw new Error(`第 ${index + 1} 张图片上传结果无效`);
      }

      imageUrls.push(uploadUrl);
    }

    return imageUrls;
  };

  const extractRequestErrorMessage = (error, fallback = '发布失败，请稍后重试') => {
    const candidates = [
      error?.message,
      error?.msg,
      error?.data?.msg,
      error?.data?.message,
      error?.response?.data?.msg,
      error?.response?.data?.message,
    ];

    return candidates.find((item) => typeof item === 'string' && item.trim()) || fallback;
  };

  const getEmergencyPointsErrorMessage = (error, fallback = '操作失败，请稍后重试') => {
    const rawMessage = extractRequestErrorMessage(error, fallback);

    if (/insufficient|积分不足|余额不足|金额不足/i.test(rawMessage)) {
      return '积分不足，请前往 Web 端获取积分后再发布';
    }

    if (/deduct|consume|扣减失败|支付失败/i.test(rawMessage)) {
      return '积分扣减失败，请稍后重试';
    }

    return rawMessage
      .replace(/本次预计需支付/g, '本次预计需消耗')
      .replace(/支付失败/g, '积分扣减失败')
      .replace(/金额不足/g, '积分不足')
      .replace(/余额/g, '积分余额');
  };

  const resetEmergencyForm = () => {
    setEmergencyForm({
      title: '',
      description: '',
      location: '',
      contact: '',
      specificLocation: '',
      rescuerCount: 1,
    });
    setEmergencyImages([]);
    setSelectedRegion(DEFAULT_SELECTED_REGION);
    setSelectedCoordinates(null);
    setLocationAddress(null);
    setResolvedChinaRegion(null);
    setEmergencyCostEstimate(DEFAULT_EMERGENCY_COST_ESTIMATE);
  };

  const closeProgressModal = React.useCallback(() => {
    setShowProgressModal(false);
    setProgressMessage('请稍候，正在提交紧急求助...');
  }, []);

  const handleSubmit = async () => {
    if (showProgressModal) {
      return;
    }

    if (!normalizedTitle) {
      showToast('求助标题不能为空', 'warning');
      return;
    }

    if (normalizedTitle.length > 100) {
      showToast('求助标题不能超过100字', 'warning');
      return;
    }

    if (!normalizedDescription) {
      showToast('详细描述不能为空', 'warning');
      return;
    }

    if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      showToast(`详细描述不能超过${MAX_DESCRIPTION_LENGTH}字`, 'warning');
      return;
    }

    if (!normalizedContactValue) {
      showToast('联系电话不能为空', 'warning');
      return;
    }

    if (!isValidPhoneNumber(normalizedContactValue)) {
      showToast('请输入正确的手机号', 'warning');
      return;
    }

    if (requestedHelperCount < 1 || requestedHelperCount > 20) {
      showToast('需要救援人数必须为1-20', 'warning');
      return;
    }

    if (!hasPublishLocation) {
      showToast('请先定位或手动选择地址', 'warning');
      return;
    }

    if (!hasVisibleAddress) {
      showToast('请补充位置描述', 'warning');
      return;
    }

    if (emergencyImages.length > MAX_IMAGE_COUNT) {
      showToast(`图片数量不能超过${MAX_IMAGE_COUNT}张`, 'warning');
      return;
    }

    if (requiresPointsAcknowledgement && !pointsAcknowledged) {
      showToast('请先确认本次发布可能消耗积分', 'warning');
      return;
    }

    let latestPointsBalance = emergencyPointsBalanceRef.current;
    if (needConsumePoints) {
      latestPointsBalance = await loadWalletPointsBalance();
      if (normalizeMajorUnitPoints(latestPointsBalance, 0) < requiredBalancePoints) {
        showToast('积分不足，请前往 Web 端获取积分后再发布', 'warning');
        return;
      }
    }

    try {
      setProgressMessage('正在发布紧急求助...');
      setShowProgressModal(true);

      const locationDisplay = regionDisplay || emergencyForm.location.trim();
      const specificLocation = (emergencyForm.specificLocation || '').trim();
      const submitRegionPayload = resolveEmergencyRegionPayload({ resolvedChinaRegion, selectedRegion });

      const addressText =
        buildEmergencyAddressText({
          provinceName: submitRegionPayload.provinceName,
          cityName: submitRegionPayload.cityName,
          districtName: submitRegionPayload.districtName,
          street: locationAddress?.street || specificLocation,
          streetNumber: locationAddress?.streetNumber || '',
          name: locationAddress?.name || '',
        }) || [locationDisplay, specificLocation].filter(Boolean).join(' ');

      const { provinceId, cityId, districtId } = submitRegionPayload;

      if (!provinceId || !cityId || !districtId) {
        showToast('请重新定位或选择地址', 'warning');
        return;
      }

      const imageUrls = await uploadEmergencyImages();
      const publishPayload = {
        title: normalizedTitle,
        description: normalizedDescription,
        urgencyLevel: 1,
        category: inferEmergencyCategory(normalizedTitle),
        neededHelperCount: requestedHelperCount,
        contactType: 1,
        contactValue: normalizedContactValue,
        provinceId,
        cityId,
        districtId,
        addressText: addressText || locationDisplay,
        regionDisplay: locationDisplay,
        latitude: toSafeNumber(selectedCoordinates?.latitude, 0),
        longitude: toSafeNumber(selectedCoordinates?.longitude, 0),
        imageUrls,
        acknowledgeFees: requiresPointsAcknowledgement ? pointsAcknowledged : false,
      };

      setProgressMessage('正在提交紧急求助...');
      const response = await withAsyncTimeout(
        () => emergencyApi.publish(publishPayload),
        REQUEST_TIMEOUT_MS,
        '发布请求超时，请稍后重试'
      );
      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || '发布失败，请稍后重试');
      }

      const responsePayload = extractResponsePayload(response) || {};
      const chargedPoints = convertCentBasedPointsToMajorUnit(responsePayload?.chargedPoints);
      const balanceAfter = responsePayload?.balanceAfter === undefined || responsePayload?.balanceAfter === null
        ? null
        : convertCentBasedPointsToMajorUnit(responsePayload.balanceAfter);
      const pointsTxnNo = responsePayload?.pointsTxnNo ? String(responsePayload.pointsTxnNo).trim() : '';
      const helpId = responsePayload?.helpId ?? null;

      if (chargedPoints > 0 || balanceAfter !== null || pointsTxnNo) {
        const syncResponse = await walletApi.syncServerPointsDebit(chargedPoints, {
          balanceAfter,
          txnNo: pointsTxnNo,
          sourceType: 'BOUNTY',
          remark: normalizedTitle ? `紧急求助发布 - ${normalizedTitle}` : '紧急求助发布',
          refId: helpId,
          refType: 'EMERGENCY',
        });

        if (syncResponse?.code !== 0 && syncResponse?.code !== 200) {
          throw new Error(syncResponse?.msg || '积分扣减失败，请稍后重试');
        }

        if (syncResponse?.data?.balance !== undefined) {
          setPointsBalance(normalizeMajorUnitPoints(syncResponse.data.balance, pointsBalance));
        }
      }

      resetEmergencyForm();
      showToast('发布成功', 'success');

      Promise.allSettled([
        loadEmergencyQuota(emergencySettings?.feeConfig?.freeCount ?? 0),
        loadEmergencyCostEstimate(1, { silent: true }),
        loadWalletPointsBalance(),
      ]).catch((refreshError) => {
        console.error('Emergency post-publish refresh failed:', refreshError);
      });

      closeProgressModal();
      navigation.navigate('EmergencyList', { initialTab: 'mine' });
    } catch (error) {
      console.error('Emergency publish failed:', error);
      showToast(getEmergencyPointsErrorMessage(error), 'error');
    } finally {
      closeProgressModal();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.headerTitle}>{t('emergency.title')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
            {t('emergency.publish')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning */}
      <View style={styles.warning}>
        <Ionicons name="warning" size={18} color="#f59e0b" />
        <Text style={styles.warningText}>{`紧急求助将推送给附近 ${nearbyNotifyRadiusKm}km 内的用户，请确保求助信息真实准确。`}</Text>
      </View>

      {/* Free Count Banner */}
      <View style={styles.freeCountBanner}>
        <View style={styles.freeCountLeft}>
          <Ionicons name="gift" size={20} color={hasRemainingFree ? "#22c55e" : "#9ca3af"} />
          <Text style={styles.freeCountText}>{freeCountLabel}</Text>
          <Text style={[styles.freeCountNumber, !hasRemainingFree && { color: '#9ca3af' }]}>
            {freeCountDisplay}
          </Text>
        </View>
        <View style={styles.freeCountActions}>
          <TouchableOpacity
            style={styles.myPublishButton}
            onPress={() => navigation.navigate('EmergencyList', { initialTab: 'mine' })}
          >
            <Ionicons name="document-text-outline" size={14} color="#2563eb" />
            <Text style={styles.myPublishButtonText}>{'\u6211\u7684\u53d1\u5e03'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.formArea} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            {t('emergency.formTitle')} <Text style={{ color: '#ef4444' }}>*</Text>
          </Text>
          <TextInput
            style={styles.formInput}
            placeholder={t('emergency.formTitlePlaceholder')}
            placeholderTextColor="#bbb"
            value={emergencyForm.title}
            onChangeText={(text) => setEmergencyForm({...emergencyForm, title: text})}
          />
          {quickTitles.length > 0 ? (
            <View style={styles.quickTitlesContainer}>
              <Text style={styles.quickTitlesLabel}>{t('emergency.quickTitles')}</Text>
              <View style={styles.quickTitlesRow}>
                {quickTitles.map((title, index) => (
                  <TouchableOpacity
                    key={`${title}-${index}`}
                    style={styles.quickTitleTag}
                    onPress={() => setEmergencyForm({...emergencyForm, title })}
                  >
                    <Text style={styles.quickTitleText}>{title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithCounter}>
            <Text style={styles.formLabel}>{t('emergency.description')}</Text>
            <Text style={[
              styles.charCounter,
              emergencyForm.description.length > MAX_DESCRIPTION_LENGTH && styles.charCounterError
            ]}>
              {emergencyForm.description.length}/{MAX_DESCRIPTION_LENGTH}
            </Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.formTextarea]}
            placeholder={t('emergency.descriptionPlaceholder')}
            placeholderTextColor="#bbb"
            value={emergencyForm.description}
            onChangeText={(text) => {
              if (text.length <= MAX_DESCRIPTION_LENGTH) {
                setEmergencyForm({...emergencyForm, description: text});
              }
            }}
            multiline
            textAlignVertical="top"
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          
          {/* 图片上传区域 */}
          <View style={styles.imageUploadSection}>
            <View style={styles.imageGrid}>
              {emergencyImages.map((image) => (
                <View key={image.id} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.uploadedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(image.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {/* 添加图片按钮 */}
              {emergencyImages.length < MAX_IMAGE_COUNT && (
                <View style={styles.addImageBtnWrapper}>
                  <TouchableOpacity 
                    style={styles.addImageBtn}
                    onPress={showImagePickerOptions}
                  >
                    <Ionicons name="camera-outline" size={28} color="#9ca3af" />
                    <Text style={styles.addImageText}>添加图片</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={styles.imageHint}>{`最多可上传${MAX_IMAGE_COUNT}张图片，帮助他人更好地了解情况`}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{`${t('emergency.location')} *`}</Text>
          <View style={styles.locationRow}>
            <TouchableOpacity style={styles.locationInput} activeOpacity={0.85} onPress={openRegionSelector}>
              <Ionicons name="location" size={18} color="#ef4444" />
              <Text
                style={[
                  styles.locationDisplayText,
                  !emergencyForm.location && styles.locationPlaceholderText
                ]}
                numberOfLines={1}
              >
                {emergencyForm.location || t('emergency.locationPlaceholder')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.locationBtn, isLocating && styles.locationBtnDisabled]} onPress={handleLocate} disabled={isLocating}>
              <Ionicons name="navigate" size={18} color="#3b82f6" />
              <Text style={styles.locationBtnText}>{isLocating ? '定位中...' : t('emergency.locate')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Specific Location */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>具体位置</Text>
          <TextInput
            style={styles.formInput}
            placeholder="您所在位置"
            placeholderTextColor="#bbb"
            value={emergencyForm.specificLocation || ''}
            onChangeText={(text) => setEmergencyForm({...emergencyForm, specificLocation: text})}
          />
        </View>

        {/* Contact */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{`${t('emergency.contact')} *`}</Text>
          <View style={styles.contactInput}>
            <Ionicons name="call" size={18} color="#6b7280" />
            <TextInput
              style={styles.contactText}
              placeholder={t('emergency.contactPlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.contact}
              onChangeText={(text) => setEmergencyForm({...emergencyForm, contact: text})}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Rescuer Count */}
        <View style={styles.formGroup}>
          <View style={styles.rescuerCountHeader}>
            <Text style={styles.formLabel}>{t('emergency.rescuerCount')}</Text>
            <View style={styles.rescuerFreeTag}>
              <Ionicons name="information-circle" size={14} color="#22c55e" />
              <Text style={styles.rescuerFreeText}>{`${freeRescuerLimit}人内免费`}</Text>
            </View>
          </View>
          
          <View style={styles.rescuerCountInputWrapper}>
            <TextInput
              style={styles.rescuerCountInput}
              placeholder={t('emergency.rescuerPlaceholder')}
              placeholderTextColor="#bbb"
              value={emergencyForm.rescuerCount === 0 ? '' : emergencyForm.rescuerCount.toString()}
              onChangeText={(text) => {
                if (text === '') {
                  setEmergencyForm({...emergencyForm, rescuerCount: 0});
                  return;
                }
                const num = parseInt(text);
                if (!isNaN(num)) {
                  const validNum = Math.max(1, Math.min(20, num));
                  setEmergencyForm({...emergencyForm, rescuerCount: validNum});
                }
              }}
              onBlur={() => {
                if (emergencyForm.rescuerCount === 0) {
                  setEmergencyForm({...emergencyForm, rescuerCount: 1});
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.rescuerCountUnit}>{t('emergency.rescuerUnit')}</Text>
          </View>

          <View style={styles.rescuerFeeInfo}>
            {!needConsumePoints ? (
              <View style={styles.rescuerFeeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.rescuerFeeTextFree}>当前人数免费</Text>
              </View>
            ) : (
              <View style={styles.rescuerFeeCard}>
                <Text style={styles.rescuerFeeLabel}>{`本次预计需消耗：${totalConsumePointsDisplay} 积分`}</Text>
                <Text style={styles.rescuerFeeExtra}>{`积分余额：${pointsBalance}`}</Text>
                {publishOveragePoints > 0 ? (
                  <Text style={styles.rescuerFeeExtra}>{`超额发布消耗：${publishOveragePointsDisplay} 积分`}</Text>
                ) : null}
                <Text style={styles.rescuerFeeExtra}>{`救援人数超额消耗：${helperOveragePointsDisplay} 积分`}</Text>
                <TouchableOpacity
                  style={styles.pointsAcknowledgeRow}
                  activeOpacity={0.85}
                  onPress={() => setPointsAcknowledged((prev) => !prev)}
                >
                  <View style={[styles.pointsCheckbox, pointsAcknowledged && styles.pointsCheckboxChecked]}>
                    {pointsAcknowledged ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={styles.pointsAcknowledgeText}>我已知晓本次发布可能消耗积分</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>{t('emergency.tips')}</Text>
          <Text style={styles.tipsText}>• 请确保描述真实准确，虚假求助将被处罚</Text>
          <Text style={styles.tipsText}>• 如遇生命危险，请优先拨打急救电话</Text>
          <Text style={styles.tipsText}>{`• 当前通知半径：${nearbyNotifyRadiusKm}km`}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <RegionSelector
        visible={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        selectedRegion={selectedRegion}
        onRegionChange={handleRegionChange}
        t={t}
      />

      {/* 通知发送进度模态框 */}
      <Modal
        visible={showProgressModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.progressModalOverlay}>
          <View style={styles.progressModalContent}>
            <View style={styles.progressHeader}>
              <Ionicons name="alert-circle" size={32} color="#ef4444" />
              <Text style={styles.progressTitle}>正在发布紧急求助</Text>
            </View>
            
            <View style={styles.progressBody}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={styles.loadingHint}>{progressMessage}</Text>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: modalTokens.border 
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: scaleFont(17), fontWeight: '600', color: modalTokens.textPrimary },
  submitBtn: { backgroundColor: modalTokens.danger, paddingHorizontal: modalTokens.actionPaddingX, paddingVertical: modalTokens.actionPaddingY, borderRadius: modalTokens.actionRadius },
  submitBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  submitText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  submitTextDisabled: { color: '#fff' },
  warning: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fffbeb', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    gap: 8 
  },
  warningText: { flex: 1, fontSize: scaleFont(13), color: '#92400e', lineHeight: scaleFont(18) },
  freeCountBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  freeCountLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freeCountActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  freeCountText: { fontSize: scaleFont(14), color: '#374151' },
  freeCountNumber: { fontSize: scaleFont(16), fontWeight: 'bold', color: '#22c55e' },
  myPublishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18
  },
  myPublishButtonText: { fontSize: scaleFont(12), color: '#2563eb', fontWeight: '600' },
  monthlyPayButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#ef4444', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  monthlyPayButtonText: { fontSize: scaleFont(13), color: '#fff', fontWeight: '600' },
  formArea: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  formLabel: { fontSize: scaleFont(14), fontWeight: '500', color: '#374151' },
  charCounter: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    fontWeight: '500'
  },
  charCounterError: {
    color: '#ef4444'
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
  quickTitlesContainer: { marginTop: 12 },
  quickTitlesLabel: { fontSize: scaleFont(12), color: '#6b7280', marginBottom: 8 },
  quickTitlesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickTitleTag: { 
    backgroundColor: '#fef2f2', 
    borderWidth: 1, 
    borderColor: '#fecaca', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  quickTitleText: { fontSize: scaleFont(12), color: '#ef4444', fontWeight: '500' },
  formTextarea: { minHeight: 100, textAlignVertical: 'top' },
  
  // 图片上传样式
  imageUploadSection: { marginTop: 12 },
  imageGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  imageItem: { 
    width: '33.33%',
    aspectRatio: 1, 
    paddingHorizontal: 4,
    marginBottom: 8, 
    position: 'relative'
  },
  uploadedImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  removeImageBtn: { 
    position: 'absolute', 
    top: 4, 
    right: 8, 
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  addImageBtn: { 
    width: '100%',
    height: '100%',
    backgroundColor: '#f9fafb', 
    borderWidth: 1.5, 
    borderColor: '#e5e7eb', 
    borderStyle: 'dashed',
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  addImageBtnWrapper: {
    width: '33.33%',
    aspectRatio: 1,
    paddingHorizontal: 4,
    marginBottom: 8
  },
  addImageText: { 
    fontSize: scaleFont(12), 
    color: '#9ca3af', 
    marginTop: 4,
    fontWeight: '500'
  },
  imageHint: { 
    fontSize: scaleFont(12), 
    color: '#6b7280', 
    marginTop: 8,
    lineHeight: scaleFont(18),
    paddingHorizontal: 4
  },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationInput: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  locationDisplayText: { flex: 1, paddingVertical: 12, fontSize: scaleFont(15), color: '#1f2937' },
  locationPlaceholderText: { color: '#bbb' },
  locationBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    borderRadius: 8, 
    gap: 4 
  },
  locationBtnDisabled: { opacity: 0.7 },
  locationBtnText: { fontSize: scaleFont(13), color: '#3b82f6', fontWeight: '500' },
  contactInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  contactText: { flex: 1, paddingVertical: 12, fontSize: scaleFont(15), color: '#1f2937' },
  rescuerCountHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  rescuerFreeTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#bbf7d0' 
  },
  rescuerFreeText: { fontSize: scaleFont(12), color: '#16a34a', fontWeight: '500' },
  rescuerCountInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8 
  },
  rescuerCountInput: { flex: 1, paddingVertical: 12, fontSize: scaleFont(15), color: '#1f2937' },
  rescuerCountUnit: { fontSize: scaleFont(15), color: '#6b7280', fontWeight: '500' },
  rescuerFeeInfo: { marginTop: 12 },
  rescuerFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rescuerFeeTextFree: { fontSize: scaleFont(14), color: '#22c55e', fontWeight: '500' },
  rescuerFeeCard: { 
    backgroundColor: '#fff7ed', 
    borderWidth: 1, 
    borderColor: '#fed7aa', 
    borderRadius: 8, 
    padding: 12 
  },
  rescuerFeeLabel: { fontSize: scaleFont(14), color: '#92400e', fontWeight: '600', marginBottom: 6 },
  rescuerFeeExtra: { fontSize: scaleFont(13), color: '#c2410c', fontWeight: '500', marginTop: 4 },
  pointsAcknowledgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  pointsCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#f97316',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsCheckboxChecked: {
    backgroundColor: '#f97316',
  },
  pointsAcknowledgeText: {
    flex: 1,
    fontSize: scaleFont(13),
    color: '#7c2d12',
    lineHeight: scaleFont(18),
  },
  tips: { 
    backgroundColor: '#fef2f2', 
    borderRadius: 8, 
    padding: 12, 
    marginTop: 8 
  },
  tipsTitle: { fontSize: scaleFont(13), fontWeight: '500', color: '#991b1b', marginBottom: 8 },
  tipsText: { fontSize: scaleFont(12), color: '#b91c1c', lineHeight: scaleFont(20) },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: modalTokens.overlay },
  regionModal: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  modalTitle: { fontSize: scaleFont(16), fontWeight: '600', color: modalTokens.textPrimary },
  confirmText: { fontSize: scaleFont(14), color: '#ef4444', fontWeight: '600' },
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
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center'
  },
  regionList: { padding: 8 },
  regionOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  regionOptionText: { fontSize: scaleFont(15), color: modalTokens.textPrimary },

  progressModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressModalContent: {
    backgroundColor: modalTokens.surface,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: modalTokens.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginTop: 12,
  },
  progressBody: {
    alignItems: 'center',
  },
  loadingHint: {
    marginTop: 16,
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
  },
  progressNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressNumber: {
    fontSize: scaleFont(48),
    fontWeight: '700',
    color: '#ef4444',
    lineHeight: scaleFont(56),
  },
  progressTotal: {
    fontSize: scaleFont(24),
    fontWeight: '600',
    color: modalTokens.textMuted,
    marginLeft: 4,
  },
  progressLabel: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: modalTokens.surfaceMuted,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  progressInfoText: {
    fontSize: scaleFont(13),
    color: modalTokens.textSecondary,
  },
  progressComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
  },
  progressCompleteText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#22c55e',
  },
});





