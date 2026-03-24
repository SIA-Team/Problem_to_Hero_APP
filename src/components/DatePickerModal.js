import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';

/**
 * 日期选择弹窗组件（纯 JS 实现，无需原生包）
 * 底部弹出式滚轮选择器
 */
export default function DatePickerModal({ visible, onClose, currentDate, onSelect }) {
  const bottomSafeInset = useBottomSafeInset(20);
  
  // 解析当前日期
  const parseDate = (dateStr) => {
    if (!dateStr) return { year: 1990, month: 1, day: 1 };
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0]) || 1990,
      month: parseInt(parts[1]) || 1,
      day: parseInt(parts[2]) || 1,
    };
  };

  const current = parseDate(currentDate);
  const [selectedYear, setSelectedYear] = useState(current.year);
  const [selectedMonth, setSelectedMonth] = useState(current.month);
  const [selectedDay, setSelectedDay] = useState(current.day);

  // 生成年份列表（1900 - 当前年份）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i);

  // 月份列表
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 根据年月计算天数
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );

  const handleConfirm = () => {
    const year = String(selectedYear);
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    onSelect(`${year}-${month}-${day}`);
    onClose();
  };

  const renderPicker = (items, selectedValue, onValueChange, unit) => {
    return (
      <View style={styles.pickerColumn}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.pickerScrollContent}
        >
          {items.map((item) => {
            const isSelected = item === selectedValue;
            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.pickerItem,
                  isSelected && styles.pickerItemSelected,
                ]}
                onPress={() => onValueChange(item)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    isSelected && styles.pickerItemTextSelected,
                  ]}
                >
                  {item}
                  {unit && <Text style={styles.unitText}>{unit}</Text>}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalContainer, { paddingBottom: bottomSafeInset }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 头部操作栏 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.title}>选择生日</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
              <Text style={styles.confirmText}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 日期选择器 */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerRow}>
              {renderPicker(years, selectedYear, setSelectedYear, '年')}
              {renderPicker(months, selectedMonth, setSelectedMonth, '月')}
              {renderPicker(days, selectedDay, setSelectedDay, '日')}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: modalTokens.border,
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: modalTokens.textSecondary,
  },
  confirmText: {
    fontSize: 16,
    color: modalTokens.danger,
    fontWeight: '700',
    textAlign: 'right',
  },
  pickerContainer: {
    backgroundColor: modalTokens.surface,
    paddingVertical: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    height: 200,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerScrollContent: {
    paddingVertical: 80,
  },
  pickerItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
  },
  pickerItemText: {
    fontSize: 16,
    color: modalTokens.textMuted,
  },
  pickerItemTextSelected: {
    fontSize: 18,
    color: modalTokens.textPrimary,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 14,
    marginLeft: 2,
  },
});
