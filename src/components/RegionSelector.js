import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';
import { scaleFont } from '../utils/responsive';
import { getRegionData } from '../data/regionData';

export default function RegionSelector({ visible, onClose, selectedRegion, onRegionChange, t }) {
  const regionData = useMemo(() => getRegionData(), []);
  const [regionStep, setRegionStep] = useState(0);

  const getRegionOptions = () => {
    if (regionStep === 0) return regionData.countries;
    if (regionStep === 1) return regionData.cities[selectedRegion.country] || [];
    if (regionStep === 2) return regionData.states[selectedRegion.city] || [];
    if (regionStep === 3) return regionData.districts[selectedRegion.state] || [];
    return [];
  };

  const selectRegion = (value) => {
    if (regionStep === 0) {
      onRegionChange({ ...selectedRegion, country: value, city: '', state: '', district: '' });
      // 自动跳转到下一层
      if (regionData.cities[value] && regionData.cities[value].length > 0) {
        setRegionStep(1);
      }
    } else if (regionStep === 1) {
      onRegionChange({ ...selectedRegion, city: value, state: '', district: '' });
      // 自动跳转到下一层
      if (regionData.states[value] && regionData.states[value].length > 0) {
        setRegionStep(2);
      }
    } else if (regionStep === 2) {
      onRegionChange({ ...selectedRegion, state: value, district: '' });
      // 自动跳转到下一层
      if (regionData.districts[value] && regionData.districts[value].length > 0) {
        setRegionStep(3);
      }
    } else {
      onRegionChange({ ...selectedRegion, district: value });
    }
  };

  const handleClose = () => {
    setRegionStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.regionModal, { paddingBottom: 30 }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t ? t('home.selectRegion') : '选择地区'}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.confirmText}>{t ? t('home.confirm') : '确认'}</Text>
            </TouchableOpacity>
          </View>

          {/* 面包屑导航 */}
          <View style={styles.breadcrumbContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScrollContent}>
              <TouchableOpacity
                style={styles.breadcrumbItem}
                onPress={() => setRegionStep(0)}
              >
                <Text style={[styles.breadcrumbText, regionStep === 0 && styles.breadcrumbTextActive]}>
                  {selectedRegion.country || (t ? t('home.country') : '国家')}
                </Text>
              </TouchableOpacity>

              {selectedRegion.country && (
                <>
                  <View style={styles.breadcrumbSeparatorWrapper}>
                    <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                  </View>
                  <TouchableOpacity
                    style={styles.breadcrumbItem}
                    onPress={() => setRegionStep(1)}
                  >
                    <Text style={[styles.breadcrumbText, regionStep === 1 && styles.breadcrumbTextActive]}>
                      {selectedRegion.city}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedRegion.city && selectedRegion.state && (
                <>
                  <View style={styles.breadcrumbSeparatorWrapper}>
                    <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                  </View>
                  <TouchableOpacity
                    style={styles.breadcrumbItem}
                    onPress={() => setRegionStep(2)}
                  >
                    <Text style={[styles.breadcrumbText, regionStep === 2 && styles.breadcrumbTextActive]}>
                      {selectedRegion.state}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedRegion.state && selectedRegion.district && (
                <>
                  <View style={styles.breadcrumbSeparatorWrapper}>
                    <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                  </View>
                  <TouchableOpacity
                    style={styles.breadcrumbItem}
                    onPress={() => setRegionStep(3)}
                  >
                    <Text style={[styles.breadcrumbText, regionStep === 3 && styles.breadcrumbTextActive]}>
                      {selectedRegion.district}
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: modalTokens.overlay
  },
  regionModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '70%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  modalTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  confirmText: {
    fontSize: scaleFont(14),
    color: '#ef4444',
    fontWeight: '600'
  },
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
  regionList: {
    padding: 8
  },
  regionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  regionOptionText: {
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary
  }
});
