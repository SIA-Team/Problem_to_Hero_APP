import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, Platform, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import i18n from '../i18n';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';
import { getRegionData } from '../data/regionData';
import emergencyApi from '../services/api/emergencyApi';
import uploadApi from '../services/api/uploadApi';
import { buildEmergencyAddressText, resolveChinaRegionFromAddress } from '../utils/chinaRegionMatcher';

import { scaleFont } from '../utils/responsive';

const DEFAULT_EMERGENCY_SETTINGS = {
  dailyFreeTotal: 0,
  freeHelperSlots: 5,
  extraHelperPriceCents: 200,
  extraPublishPriceCents: 500,
  nearbyNotifyRadiusKm: 5,
};

export default function EmergencyScreen({ navigation }) {
  const t = (key) => {
    if (!i18n || typeof i18n.t !== 'function') {
      return key;
    }
    return i18n.t(key);
  };

  const regionData = React.useMemo(() => getRegionData(), []);
  
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
  const [emergencyQuota, setEmergencyQuota] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionStep, setRegionStep] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState({ country: '', city: '', state: '', district: '' });
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [locationAddress, setLocationAddress] = useState(null);
  const [resolvedChinaRegion, setResolvedChinaRegion] = useState(null);
  const [emergencySettings, setEmergencySettings] = useState(DEFAULT_EMERGENCY_SETTINGS);
  const [emergencyFeeEstimate, setEmergencyFeeEstimate] = useState(null);

  const toSafeNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const formatAmount = (value) => {
    const num = toSafeNumber(value, 0);
    if (Number.isInteger(num)) {
      return String(num);
    }
    return num.toFixed(2).replace(/\.?0+$/, '');
  };

  const normalizeEmergencySettings = React.useCallback((rawSettings = {}) => {
    const normalized = {
      dailyFreeTotal: Math.max(0, Math.round(toSafeNumber(rawSettings?.dailyFreeTotal, DEFAULT_EMERGENCY_SETTINGS.dailyFreeTotal))),
      freeHelperSlots: Math.max(0, Math.round(toSafeNumber(rawSettings?.freeHelperSlots, DEFAULT_EMERGENCY_SETTINGS.freeHelperSlots))),
      extraHelperPriceCents: Math.max(0, Math.round(toSafeNumber(rawSettings?.extraHelperPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraHelperPriceCents))),
      extraPublishPriceCents: Math.max(0, Math.round(toSafeNumber(rawSettings?.extraPublishPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraPublishPriceCents))),
      nearbyNotifyRadiusKm: Math.max(0, toSafeNumber(rawSettings?.nearbyNotifyRadiusKm, DEFAULT_EMERGENCY_SETTINGS.nearbyNotifyRadiusKm)),
    };

    setEmergencySettings(normalized);
    return normalized;
  }, []);

  const loadEmergencySettings = React.useCallback(async () => {
    try {
      const response = await emergencyApi.getPublicSettings();
      return normalizeEmergencySettings(response?.data || {});
    } catch (error) {
      console.error('Failed to load emergency public settings:', error);
      return DEFAULT_EMERGENCY_SETTINGS;
    }
  }, [normalizeEmergencySettings]);

  const loadEmergencyQuota = React.useCallback(async (fallbackTotal = 0) => {
    try {
      const response = await emergencyApi.getQuota();
      if (response?.code !== 200) {
        throw new Error(response?.msg || 'Failed to load emergency quota');
      }

      const quotaData = response?.data || {};
      const total = Number(quotaData.total);
      const remaining = Number(quotaData.remaining);

      setEmergencyQuota({
        total: Number.isFinite(total) && total >= 0 ? total : Math.max(0, Number(fallbackTotal) || 0),
        remaining: Number.isFinite(remaining) && remaining >= 0 ? remaining : 0,
      });
    } catch (error) {
      console.error('Failed to load emergency quota:', error);
      setEmergencyQuota((prev) => prev || {
        total: Math.max(0, Number(fallbackTotal) || 0),
        remaining: 0,
      });
    }
  }, []);

  const buildLocalFeeEstimate = React.useCallback((neededHelperCount) => {
    const requestedHelperCount = Math.max(1, Math.round(toSafeNumber(neededHelperCount, 1)));
    const quotaTotal = Number(emergencyQuota?.total);
    const quotaRemaining = Number(emergencyQuota?.remaining);
    const dailyFreeTotal = Number.isFinite(quotaTotal) && quotaTotal >= 0
      ? quotaTotal
      : Math.max(0, Math.round(toSafeNumber(emergencySettings?.dailyFreeTotal, DEFAULT_EMERGENCY_SETTINGS.dailyFreeTotal)));
    const remainingFree = Number.isFinite(quotaRemaining) && quotaRemaining >= 0
      ? quotaRemaining
      : Math.max(0, dailyFreeTotal);
    const usedToday = Math.max(0, dailyFreeTotal - remainingFree);
    const freeHelperSlots = Math.max(0, Math.round(toSafeNumber(emergencySettings?.freeHelperSlots, DEFAULT_EMERGENCY_SETTINGS.freeHelperSlots)));
    const extraHelperPriceCents = Math.max(0, Math.round(toSafeNumber(emergencySettings?.extraHelperPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraHelperPriceCents)));
    const extraPublishPriceCents = Math.max(0, Math.round(toSafeNumber(emergencySettings?.extraPublishPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraPublishPriceCents)));
    const helperOverageCount = Math.max(0, requestedHelperCount - freeHelperSlots);
    const helperOverageFeeCents = helperOverageCount * extraHelperPriceCents;
    const publishOverageFeeCents = remainingFree <= 0 ? extraPublishPriceCents : 0;

    return {
      dailyFreeTotal,
      usedToday,
      remainingFree,
      freeHelperSlots,
      extraHelperPriceCents,
      extraPublishPriceCents,
      helperOverageCount,
      helperOverageFeeCents,
      publishOverageFeeCents,
      totalFeeCents: helperOverageFeeCents + publishOverageFeeCents,
    };
  }, [emergencyQuota, emergencySettings]);

  const normalizeEmergencyFeeEstimate = React.useCallback((rawData = {}, neededHelperCount) => {
    const fallback = buildLocalFeeEstimate(neededHelperCount);
    const dailyFreeTotal = Math.max(0, Math.round(toSafeNumber(rawData?.dailyFreeTotal, fallback.dailyFreeTotal)));
    const remainingFree = Math.max(0, Math.round(toSafeNumber(rawData?.remainingFree, fallback.remainingFree)));
    const freeHelperSlots = Math.max(0, Math.round(toSafeNumber(rawData?.freeHelperSlots, fallback.freeHelperSlots)));
    const extraHelperPriceCents = Math.max(0, Math.round(toSafeNumber(rawData?.extraHelperPriceCents, fallback.extraHelperPriceCents)));
    const extraPublishPriceCents = Math.max(0, Math.round(toSafeNumber(rawData?.extraPublishPriceCents, fallback.extraPublishPriceCents)));
    const helperOverageCount = Math.max(0, Math.round(toSafeNumber(rawData?.helperOverageCount, Math.max(0, Math.round(toSafeNumber(neededHelperCount, 1)) - freeHelperSlots))));
    const helperOverageFeeCents = Math.max(0, Math.round(toSafeNumber(rawData?.helperOverageFeeCents, helperOverageCount * extraHelperPriceCents)));
    const publishOverageFeeCents = Math.max(0, Math.round(toSafeNumber(rawData?.publishOverageFeeCents, remainingFree <= 0 ? extraPublishPriceCents : 0)));
    const totalFeeCents = Math.max(0, Math.round(toSafeNumber(rawData?.totalFeeCents, helperOverageFeeCents + publishOverageFeeCents)));
    const usedToday = Math.max(0, Math.round(toSafeNumber(rawData?.usedToday, Math.max(0, dailyFreeTotal - remainingFree))));

    return {
      dailyFreeTotal,
      usedToday,
      remainingFree,
      freeHelperSlots,
      extraHelperPriceCents,
      extraPublishPriceCents,
      helperOverageCount,
      helperOverageFeeCents,
      publishOverageFeeCents,
      totalFeeCents,
    };
  }, [buildLocalFeeEstimate]);

  const loadEmergencyFeeEstimate = React.useCallback(async (neededHelperCount) => {
    const requestedHelperCount = Math.max(1, Math.round(toSafeNumber(neededHelperCount, 1)));
    try {
      const response = await emergencyApi.getFeeEstimate({ neededHelperCount: requestedHelperCount });
      if (response?.code !== 200) {
        throw new Error(response?.msg || 'Failed to load emergency fee estimate');
      }

      const estimateData = normalizeEmergencyFeeEstimate(response?.data || {}, requestedHelperCount);
      setEmergencyFeeEstimate(estimateData);
      return estimateData;
    } catch (error) {
      console.error('Failed to load emergency fee estimate:', error);
      const fallbackData = buildLocalFeeEstimate(requestedHelperCount);
      setEmergencyFeeEstimate(fallbackData);
      return fallbackData;
    }
  }, [buildLocalFeeEstimate, normalizeEmergencyFeeEstimate]);

  useFocusEffect(
    React.useCallback(() => {
      const syncEmergencyData = async () => {
        const settings = await loadEmergencySettings();
        await loadEmergencyQuota(settings?.dailyFreeTotal ?? 0);
        await loadEmergencyFeeEstimate(1);
      };

      syncEmergencyData();
    }, [loadEmergencyFeeEstimate, loadEmergencyQuota, loadEmergencySettings])
  );

  React.useEffect(() => {
    const helperCount = Math.max(1, Number(emergencyForm.rescuerCount) || 1);
    const timer = setTimeout(() => {
      loadEmergencyFeeEstimate(helperCount);
    }, 250);

    return () => clearTimeout(timer);
  }, [emergencyForm.rescuerCount, loadEmergencyFeeEstimate]);

  const fallbackEstimate = buildLocalFeeEstimate(emergencyForm.rescuerCount || 1);
  const activeFeeEstimate = emergencyFeeEstimate || fallbackEstimate;
  const quotaLoaded = emergencyQuota !== null || emergencyFeeEstimate !== null;
  const freeCount = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.dailyFreeTotal, 0)));
  const remainingFree = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.remainingFree, 0)));
  const freeCountDisplay = quotaLoaded ? `${remainingFree}/${freeCount}` : '--/--';
  const hasRemainingFree = !quotaLoaded || remainingFree > 0;

  const freeRescuerLimit = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.freeHelperSlots, DEFAULT_EMERGENCY_SETTINGS.freeHelperSlots)));
  const extraRescuerFeeCents = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.extraHelperPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraHelperPriceCents)));
  const extraPublishFeeCents = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.extraPublishPriceCents, DEFAULT_EMERGENCY_SETTINGS.extraPublishPriceCents)));
  const helperOverageCount = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.helperOverageCount, Math.max(0, (Number(emergencyForm.rescuerCount) || 1) - freeRescuerLimit))));
  const helperOverageFeeCents = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.helperOverageFeeCents, helperOverageCount * extraRescuerFeeCents)));
  const publishOverageFeeCents = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.publishOverageFeeCents, hasRemainingFree ? 0 : extraPublishFeeCents)));
  const totalEstimatedFeeCents = Math.max(0, Math.round(toSafeNumber(activeFeeEstimate?.totalFeeCents, helperOverageFeeCents + publishOverageFeeCents)));

  const extraRescuerFee = extraRescuerFeeCents / 100;
  const helperOverageFee = helperOverageFeeCents / 100;
  const publishOverageFee = publishOverageFeeCents / 100;
  const totalEstimatedFee = totalEstimatedFeeCents / 100;
  const nearbyNotifyRadiusKm = Math.max(0, toSafeNumber(emergencySettings?.nearbyNotifyRadiusKm, DEFAULT_EMERGENCY_SETTINGS.nearbyNotifyRadiusKm));

  const getRegionOptions = () => {
    if (regionStep === 0) return regionData.countries;
    if (regionStep === 1) return regionData.cities[selectedRegion.country] || [];
    if (regionStep === 2) return regionData.states[selectedRegion.city] || [];
    if (regionStep === 3) return regionData.districts[selectedRegion.state] || [];
    return [];
  };

  const selectRegion = (value) => {
    if (regionStep === 0) {
      setSelectedRegion({ ...selectedRegion, country: value, city: '', state: '', district: '' });
      if (regionData.cities[value] && regionData.cities[value].length > 0) {
        setRegionStep(1);
      }
    } else if (regionStep === 1) {
      setSelectedRegion({ ...selectedRegion, country: selectedRegion.country, city: value, state: '', district: '' });
      if (regionData.states[value] && regionData.states[value].length > 0) {
        setRegionStep(2);
      }
    } else if (regionStep === 2) {
      setSelectedRegion({ ...selectedRegion, country: selectedRegion.country, city: selectedRegion.city, state: value, district: '' });
      if (regionData.districts[value] && regionData.districts[value].length > 0) {
        setRegionStep(3);
      }
    } else {
      setSelectedRegion({ ...selectedRegion, country: selectedRegion.country, city: selectedRegion.city, state: selectedRegion.state, district: value });
    }
  };

  const confirmRegionSelection = () => {
    const parts = [selectedRegion.country, selectedRegion.city, selectedRegion.state, selectedRegion.district].filter(Boolean);
    const locationText = parts.join(' ');
    setEmergencyForm((prev) => ({ ...prev, location: locationText }));
    setSelectedCoordinates(null);
    setLocationAddress(null);
    setResolvedChinaRegion(null);
    setShowRegionModal(false);
    setRegionStep(0);
  };

  const openRegionSelector = () => {
    setShowRegionModal(true);
    setRegionStep(0);
  };

  // Use useMemo to prevent calling t() during initial render
  const quickTitles = React.useMemo(() => [
    t('emergency.quickTitle1'),
    t('emergency.quickTitle2'),
    t('emergency.quickTitle3')
  ], []);

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
    if (emergencyImages.length >= 3) {
      showAppAlert(t('common.ok'), '最多只能上传3张图片');
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
      showAppAlert('错误', '选择图片失败，请重试');
    }
  };

  // 拍照
  const takePhoto = async () => {
    // 检查图片数量限制
    if (emergencyImages.length >= 3) {
      showAppAlert(t('common.ok'), '最多只能上传3张图片');
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
      showAppAlert('错误', '拍照失败，请重试');
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

  const normalizePhoneNumber = (phone) => String(phone || '').replace(/[\s\-\(\)]/g, '').trim();

  const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    return phoneRegex.test(normalizePhoneNumber(phone));
  };

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
      const matchedRegion = resolveChinaRegionFromAddress(address);

      setEmergencyForm((prev) => ({ ...prev, location: locationText }));
      setSelectedCoordinates({
        latitude: toSafeNumber(currentPosition?.coords?.latitude, 0),
        longitude: toSafeNumber(currentPosition?.coords?.longitude, 0),
      });
      setLocationAddress(address);
      setResolvedChinaRegion(matchedRegion);
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

    const imageUrls = [];
    for (let index = 0; index < emergencyImages.length; index += 1) {
      const image = emergencyImages[index];
      const uploadResult = await uploadApi.uploadImage({
        uri: image.uri,
        name: `emergency_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
      });

      if (uploadResult?.code !== 200 || !uploadResult?.data) {
        throw new Error(uploadResult?.msg || '图片上传失败');
      }

      imageUrls.push(uploadResult.data);
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
    setSelectedRegion({ country: '', city: '', state: '', district: '' });
    setRegionStep(0);
    setSelectedCoordinates(null);
    setLocationAddress(null);
    setResolvedChinaRegion(null);
  };

  const handleSubmit = async () => {
    if (!emergencyForm.title.trim()) {
      showAppAlert(t('emergency.enterTitle'));
      return;
    }

    if (!emergencyForm.description.trim()) {
      showAppAlert('提示', '请填写详细描述');
      return;
    }

    if (!emergencyForm.contact.trim()) {
      showAppAlert('提示', '请填写联系电话');
      return;
    }

    if (!isValidPhoneNumber(emergencyForm.contact)) {
      showAppAlert('提示', '请输入正确的联系电话，支持国内和国际号码');
      return;
    }

    if (!emergencyForm.location.trim()) {
      showAppAlert('提示', '请先定位或手动选择地区');
      return;
    }

    setShowProgressModal(true);

    try {
      const requestedHelperCount = Math.max(1, Number(emergencyForm.rescuerCount) || 1);
      const latestFeeEstimate = await loadEmergencyFeeEstimate(requestedHelperCount);
      const latestTotalFeeCents = Math.max(0, Math.round(toSafeNumber(latestFeeEstimate?.totalFeeCents, totalEstimatedFeeCents)));

      const imageUrls = await uploadEmergencyImages();
      const locationDisplay = emergencyForm.location.trim();
      const specificLocation = (emergencyForm.specificLocation || '').trim();

      const addressText =
        buildEmergencyAddressText({
          provinceName: resolvedChinaRegion?.provinceName || '',
          cityName: resolvedChinaRegion?.cityName || '',
          districtName: resolvedChinaRegion?.districtName || '',
          street: locationAddress?.street || specificLocation,
          streetNumber: locationAddress?.streetNumber || '',
          name: locationAddress?.name || '',
        }) || [locationDisplay, specificLocation].filter(Boolean).join(' ');

      const publishPayload = {
        title: emergencyForm.title.trim(),
        description: emergencyForm.description.trim(),
        urgencyLevel: 0,
        category: 0,
        neededHelperCount: requestedHelperCount,
        contactType: 0,
        contactValue: normalizePhoneNumber(emergencyForm.contact),
        provinceId: Number(resolvedChinaRegion?.provinceId || 0),
        cityId: Number(resolvedChinaRegion?.cityId || 0),
        districtId: Number(resolvedChinaRegion?.districtId || 0),
        addressText: addressText || locationDisplay,
        regionDisplay: locationDisplay,
        latitude: toSafeNumber(selectedCoordinates?.latitude, 0),
        longitude: toSafeNumber(selectedCoordinates?.longitude, 0),
        imageUrls,
        acknowledgeFees: latestTotalFeeCents > 0,
      };

      const response = await emergencyApi.publish(publishPayload);
      if (response?.code !== 200) {
        throw new Error(response?.msg || '发布失败，请稍后重试');
      }

      await loadEmergencyQuota(emergencySettings?.dailyFreeTotal ?? 0);
      await loadEmergencyFeeEstimate(1);
      resetEmergencyForm();
      
      showAppAlert(
        t('emergency.published'),
        `紧急求助已成功发布！\n\n附近 ${formatAmount(nearbyNotifyRadiusKm)}km 用户将收到通知。`,
        [{ text: t('emergency.confirm'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Emergency publish failed:', error);
      showAppAlert('提示', extractRequestErrorMessage(error));
    } finally {
      setShowProgressModal(false);
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
          style={[styles.submitBtn, (!emergencyForm.title.trim() || showProgressModal) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!emergencyForm.title.trim() || showProgressModal}
        >
          <Text style={[styles.submitText, (!emergencyForm.title.trim() || showProgressModal) && styles.submitTextDisabled]}>
            {t('emergency.publish')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Warning */}
      <View style={styles.warning}>
        <Ionicons name="warning" size={18} color="#f59e0b" />
        <Text style={styles.warningText}>{t('emergency.warning')}</Text>
      </View>

      {/* Free Count Banner */}
      <View style={styles.freeCountBanner}>
        <View style={styles.freeCountLeft}>
          <Ionicons name="gift" size={20} color={hasRemainingFree ? "#22c55e" : "#9ca3af"} />
          <Text style={styles.freeCountText}>{t('emergency.freeCount')}</Text>
          <Text style={[styles.freeCountNumber, !hasRemainingFree && { color: '#9ca3af' }]}>
            {freeCountDisplay}
          </Text>
        </View>
        {quotaLoaded && publishOverageFeeCents > 0 && (
          <TouchableOpacity 
            style={styles.monthlyPayButton}
            onPress={() => showAppAlert('提示', `超出免费次数后，本次发布额外费用为 $${formatAmount(publishOverageFee)}`)}
          >
            <Text style={styles.monthlyPayButtonText}>{`${t('emergency.pay')} $${formatAmount(publishOverageFee)}`}</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        )}
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
          <View style={styles.quickTitlesContainer}>
            <Text style={styles.quickTitlesLabel}>{t('emergency.quickTitles')}</Text>
            <View style={styles.quickTitlesRow}>
              {quickTitles.map((title, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickTitleTag}
                  onPress={() => setEmergencyForm({...emergencyForm, title: title})}
                >
                  <Text style={styles.quickTitleText}>{title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithCounter}>
            <Text style={styles.formLabel}>{t('emergency.description')}</Text>
            <Text style={[
              styles.charCounter,
              emergencyForm.description.length > 200 && styles.charCounterError
            ]}>
              {emergencyForm.description.length}/200
            </Text>
          </View>
          <TextInput
            style={[styles.formInput, styles.formTextarea]}
            placeholder={t('emergency.descriptionPlaceholder')}
            placeholderTextColor="#bbb"
            value={emergencyForm.description}
            onChangeText={(text) => {
              if (text.length <= 200) {
                setEmergencyForm({...emergencyForm, description: text});
              }
            }}
            multiline
            textAlignVertical="top"
            maxLength={200}
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
              {emergencyImages.length < 3 && (
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
            <Text style={styles.imageHint}>最多可上传3张图片，帮助他人更好地了解情况况?</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('emergency.location')}</Text>
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
          <Text style={styles.formLabel}>{t('emergency.contact')}</Text>
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
              <Text style={styles.rescuerFreeText}>{t('emergency.rescuerFree')}</Text>
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
            {totalEstimatedFeeCents === 0 ? (
              <View style={styles.rescuerFeeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.rescuerFeeTextFree}>{t('emergency.rescuerFeeTextFree')}</Text>
              </View>
            ) : (
              <View style={styles.rescuerFeeCard}>
                <View style={styles.rescuerFeeRow}>
                  <View style={styles.rescuerFeeLeft}>
                    <Text style={styles.rescuerFeeLabel}>费用预估</Text>
                    {helperOverageFeeCents > 0 && (
                      <Text style={styles.rescuerFeeExtra}>
                        救援人数超额费：{helperOverageCount}{t('emergency.rescuerUnit')} × ${formatAmount(extraRescuerFee)} = ${formatAmount(helperOverageFee)}
                      </Text>
                    )}
                    {publishOverageFeeCents > 0 && (
                      <Text style={styles.rescuerFeeExtra}>超额发布费：${formatAmount(publishOverageFee)}</Text>
                    )}
                  </View>
                  <View style={styles.rescuerFeeRight}>
                    <Text style={styles.rescuerFeeTotalLabel}>{t('emergency.needPay')}</Text>
                    <Text style={styles.rescuerFeeTotal}>${formatAmount(totalEstimatedFee)}</Text>
                  </View>
                </View>
                <Text style={styles.rescuerFeeNote}>{t('emergency.rescuerFeeNote')}</Text>
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => showAppAlert(
                    `${t('emergency.pay')} $${formatAmount(totalEstimatedFee)}`,
                    t('emergency.paymentMethods')
                  )}
                >
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>{t('emergency.payNow')} ${formatAmount(totalEstimatedFee)}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>{t('emergency.tips')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip1')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip2')}</Text>
          <Text style={styles.tipsText}>{t('emergency.tip3')}</Text>
          <Text style={styles.tipsText}>{`• 当前通知半径：${formatAmount(nearbyNotifyRadiusKm)}km`}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 区域选择弹窗 */}
      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowRegionModal(false);
              setRegionStep(0);
            }}
          />
          <View style={[styles.regionModal, { paddingBottom: 30 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowRegionModal(false);
                  setRegionStep(0);
                }}
              >
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>选择区域</Text>
              <TouchableOpacity onPress={confirmRegionSelection}>
                <Text style={styles.confirmText}>确认</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breadcrumbContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScrollContent}>
                <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(0)}>
                  <Text style={[styles.breadcrumbText, regionStep === 0 && styles.breadcrumbTextActive]}>
                    {selectedRegion.country || '国家'}
                  </Text>
                </TouchableOpacity>

                {selectedRegion.country && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(1)}>
                      <Text style={[styles.breadcrumbText, regionStep === 1 && styles.breadcrumbTextActive]}>
                        {selectedRegion.city || '省份'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedRegion.city && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(2)}>
                      <Text style={[styles.breadcrumbText, regionStep === 2 && styles.breadcrumbTextActive]}>
                        {selectedRegion.state || '城市'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedRegion.state && (
                  <>
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                    <TouchableOpacity style={styles.breadcrumbItem} onPress={() => setRegionStep(3)}>
                      <Text style={[styles.breadcrumbText, regionStep === 3 && styles.breadcrumbTextActive]}>
                        {selectedRegion.district || '区县'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>

            <ScrollView style={styles.regionList}>
              {getRegionOptions().map((option, idx) => (
                <TouchableOpacity key={idx} style={styles.regionOption} onPress={() => selectRegion(option)}>
                  <Text style={styles.regionOptionText}>{option}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.loadingHint}>请稍候，正在提交真实数据...</Text>
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
  freeCountText: { fontSize: scaleFont(14), color: '#374151' },
  freeCountNumber: { fontSize: scaleFont(16), fontWeight: 'bold', color: '#22c55e' },
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
  rescuerFeeLeft: { flex: 1 },
  rescuerFeeLabel: { fontSize: scaleFont(13), color: '#92400e', marginBottom: 4 },
  rescuerFeeExtra: { fontSize: scaleFont(15), color: '#ea580c', fontWeight: '600' },
  rescuerFeeRight: { alignItems: 'flex-end' },
  rescuerFeeTotalLabel: { fontSize: scaleFont(12), color: '#92400e', marginBottom: 2 },
  rescuerFeeTotal: { fontSize: scaleFont(24), fontWeight: 'bold', color: '#ef4444' },
  rescuerFeeNote: { fontSize: scaleFont(12), color: '#92400e', marginTop: 8 },
  payButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#ef4444', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginTop: 12, 
    gap: 8 
  },
  payButtonText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
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





