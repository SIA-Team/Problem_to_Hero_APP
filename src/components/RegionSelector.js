import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';
import { scaleFont } from '../utils/responsive';
import regionService from '../services/regionService';

const ROOT_PARENT_ID = '0';
const LEVEL_KEYS = ['country', 'city', 'state', 'district'];
const LEVEL_ID_KEYS = ['countryId', 'cityId', 'stateId', 'districtId'];
const DEFAULT_REGION = {
  country: '',
  countryId: '',
  city: '',
  cityId: '',
  state: '',
  stateId: '',
  district: '',
  districtId: '',
};

const getParentKey = (parentId) =>
  parentId === undefined || parentId === null || parentId === ''
    ? ROOT_PARENT_ID
    : String(parentId);

const normalizeSelectedRegion = (selectedRegion = {}) => ({
  ...DEFAULT_REGION,
  ...selectedRegion,
});

const getLevelLabel = (step, t) => {
  if (step === 0) {
    return t ? t('home.country') : '国家';
  }

  if (step === 1) {
    return '地区';
  }

  if (step === 2) {
    return '城市';
  }

  return '区县';
};

const getParentIdForStep = (step, region) => {
  if (step === 0) {
    return ROOT_PARENT_ID;
  }

  if (step === 1) {
    return region.countryId || null;
  }

  if (step === 2) {
    return region.cityId || null;
  }

  if (step === 3) {
    return region.stateId || null;
  }

  return null;
};

const buildNextRegion = (region, step, option) => {
  const nextRegion = normalizeSelectedRegion(region);
  const currentKey = LEVEL_KEYS[step];
  const currentIdKey = LEVEL_ID_KEYS[step];

  nextRegion[currentKey] = option.name;
  nextRegion[currentIdKey] = option.id;

  for (let index = step + 1; index < LEVEL_KEYS.length; index += 1) {
    nextRegion[LEVEL_KEYS[index]] = '';
    nextRegion[LEVEL_ID_KEYS[index]] = '';
  }

  return nextRegion;
};

export default function RegionSelector({
  visible,
  onClose,
  selectedRegion,
  onRegionChange,
  t,
}) {
  const [draftRegion, setDraftRegion] = useState(() => normalizeSelectedRegion(selectedRegion));
  const [regionStep, setRegionStep] = useState(0);
  const [optionsByParentId, setOptionsByParentId] = useState({});
  const [loadingParentId, setLoadingParentId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchText, setSearchText] = useState('');

  const currentParentId = getParentIdForStep(regionStep, draftRegion);
  const currentParentKey = getParentKey(currentParentId);

  const loadOptions = async (parentId, options = {}) => {
    const parentKey = getParentKey(parentId);
    const { forceRefresh = false } = options;

    setLoadingParentId(parentKey);
    setErrorMessage('');

    try {
      const regionOptions = await regionService.getRegionChildren(parentKey, { forceRefresh });
      setOptionsByParentId((previous) => ({
        ...previous,
        [parentKey]: regionOptions,
      }));
      return regionOptions;
    } catch (error) {
      setErrorMessage(error?.message || '获取区域数据失败');
      return [];
    } finally {
      setLoadingParentId((previous) => (previous === parentKey ? null : previous));
    }
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftRegion(normalizeSelectedRegion(selectedRegion));
    setRegionStep(0);
    setSearchText('');
    setErrorMessage('');
    loadOptions(ROOT_PARENT_ID);
  }, [visible, selectedRegion]);

  const currentOptions = useMemo(
    () => optionsByParentId[currentParentKey] || [],
    [currentParentKey, optionsByParentId]
  );

  const filteredOptions = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return currentOptions;
    }

    return currentOptions.filter((option) => option.name.toLowerCase().includes(keyword));
  }, [currentOptions, searchText]);

  const isCurrentStepLoading = loadingParentId === currentParentKey;
  const currentSelectedId = draftRegion[LEVEL_ID_KEYS[regionStep]];

  const handleDismiss = () => {
    setRegionStep(0);
    setSearchText('');
    setErrorMessage('');
    onClose?.();
  };

  const handleConfirm = () => {
    onRegionChange?.(draftRegion);
    handleDismiss();
  };

  const openStep = async (step) => {
    const parentId = getParentIdForStep(step, draftRegion);
    if (step > 0 && !parentId) {
      return;
    }

    setRegionStep(step);
    setSearchText('');
    await loadOptions(parentId);
  };

  const handleSelectOption = async (option) => {
    const nextRegion = buildNextRegion(draftRegion, regionStep, option);
    const nextStep = regionStep + 1;

    setDraftRegion(nextRegion);
    setSearchText('');

    if (nextStep >= LEVEL_KEYS.length) {
      return;
    }

    const nextOptions = await loadOptions(option.id);
    if (nextOptions.length > 0) {
      setRegionStep(nextStep);
    }
  };

  const renderBreadcrumb = (step) => {
    const regionKey = LEVEL_KEYS[step];
    const displayText = draftRegion[regionKey] || getLevelLabel(step, t);
    const isActive = regionStep === step;

    return (
      <TouchableOpacity
        key={regionKey}
        style={styles.breadcrumbItem}
        onPress={() => openStep(step)}
      >
        <Text style={[styles.breadcrumbText, isActive && styles.breadcrumbTextActive]}>
          {displayText}
        </Text>
      </TouchableOpacity>
    );
  };

  const breadcrumbSteps = useMemo(() => {
    const steps = [0];

    if (draftRegion.country) {
      steps.push(1);
    }

    if (draftRegion.city) {
      steps.push(2);
    }

    if (draftRegion.state) {
      steps.push(3);
    }

    return steps;
  }, [draftRegion.country, draftRegion.city, draftRegion.state]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDismiss}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleDismiss}
        />
        <View style={[styles.regionModal, { paddingBottom: 30 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleDismiss}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t ? t('home.selectRegion') : '选择区域'}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmText}>{t ? t('home.confirm') : '确定'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.breadcrumbContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breadcrumbScrollContent}
            >
              {breadcrumbSteps.map((step, index) => (
                <React.Fragment key={LEVEL_KEYS[step]}>
                  {index > 0 ? (
                    <View style={styles.breadcrumbSeparatorWrapper}>
                      <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                    </View>
                  ) : null}
                  {renderBreadcrumb(step)}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>

          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={`搜索${getLevelLabel(regionStep, t)}`}
                placeholderTextColor="#9ca3af"
                returnKeyType="search"
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView style={styles.regionList} keyboardShouldPersistTaps="handled">
            {isCurrentStepLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator size="small" color="#ef4444" />
                <Text style={styles.stateText}>加载中...</Text>
              </View>
            ) : null}

            {!isCurrentStepLoading && errorMessage ? (
              <View style={styles.stateContainer}>
                <Text style={styles.stateText}>{errorMessage}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => loadOptions(currentParentId, { forceRefresh: true })}
                >
                  <Text style={styles.retryButtonText}>重试</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!isCurrentStepLoading && !errorMessage && filteredOptions.length === 0 ? (
              <View style={styles.stateContainer}>
                <Text style={styles.stateText}>
                  {searchText ? '未找到匹配区域' : '暂无可选区域'}
                </Text>
              </View>
            ) : null}

            {!isCurrentStepLoading && !errorMessage
              ? filteredOptions.map((option) => {
                  const isSelected = currentSelectedId && String(currentSelectedId) === option.id;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.regionOption, isSelected && styles.regionOptionSelected]}
                      onPress={() => handleSelectOption(option)}
                    >
                      <Text
                        style={[
                          styles.regionOptionText,
                          isSelected && styles.regionOptionTextSelected,
                        ]}
                      >
                        {option.name}
                      </Text>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                        size={18}
                        color={isSelected ? '#ef4444' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  );
                })
              : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: modalTokens.overlay,
  },
  regionModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  modalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  confirmText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '600',
  },
  breadcrumbContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  breadcrumbScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  breadcrumbText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '400',
    lineHeight: scaleFont(20),
  },
  breadcrumbTextActive: {
    color: '#ef4444',
    fontWeight: '500',
  },
  breadcrumbSeparatorWrapper: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    padding: 0,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary,
  },
  regionList: {
    padding: 8,
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
    borderRadius: 12,
  },
  regionOptionSelected: {
    backgroundColor: '#fef2f2',
    borderBottomColor: '#fecaca',
  },
  regionOptionText: {
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary,
  },
  regionOptionTextSelected: {
    color: '#ef4444',
    fontWeight: '500',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  stateText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
  },
  retryButtonText: {
    fontSize: scaleFont(13),
    color: '#ef4444',
    fontWeight: '600',
  },
});
