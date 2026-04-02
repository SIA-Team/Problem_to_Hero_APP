import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { modalTokens } from './modalTokens';

const padNumber = (value) => String(value).padStart(2, '0');

const parseDateTime = (dateTimeStr) => {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };

  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    return fallback;
  }

  const match = dateTimeStr.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return fallback;
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

const formatDateTime = ({ year, month, day }) =>
  `${year}-${padNumber(month)}-${padNumber(day)}`;

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

export default function DateTimePickerModal({
  visible,
  onClose,
  currentDateTime,
  onSelect,
  title,
  cancelText = '\u53d6\u6d88',
  confirmText = '\u786e\u5b9a',
}) {
  const bottomSafeInset = useBottomSafeInset(20);
  const parsedCurrent = useMemo(
    () => parseDateTime(currentDateTime),
    [currentDateTime]
  );
  const currentYear = new Date().getFullYear();
  const startYear = Math.min(parsedCurrent.year, currentYear - 1);
  const endYear = Math.max(parsedCurrent.year, currentYear + 10);
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index
  );
  const months = Array.from({ length: 12 }, (_, index) => index + 1);

  const [selectedYear, setSelectedYear] = useState(parsedCurrent.year);
  const [selectedMonth, setSelectedMonth] = useState(parsedCurrent.month);
  const [selectedDay, setSelectedDay] = useState(parsedCurrent.day);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextValue = parseDateTime(currentDateTime);
    setSelectedYear(nextValue.year);
    setSelectedMonth(nextValue.month);
    setSelectedDay(nextValue.day);
  }, [currentDateTime, visible]);

  useEffect(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedDay, selectedMonth, selectedYear]);

  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, index) => index + 1
  );

  const handleConfirm = () => {
    onSelect(
      formatDateTime({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
      })
    );
    onClose();
  };

  const renderPicker = (items, selectedValue, onValueChange, unit) => (
    <View style={styles.pickerColumn}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerScrollContent}
      >
        {items.map((item) => {
          const isSelected = item === selectedValue;

          return (
            <TouchableOpacity
              key={`${unit}-${item}`}
              style={[
                styles.pickerItem,
                isSelected && styles.pickerItemSelected,
              ]}
              onPress={() => onValueChange(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  isSelected && styles.pickerItemTextSelected,
                ]}
              >
                {padNumber(item)}
                <Text style={styles.unitText}>{unit}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
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
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.pickerRow}>
              {renderPicker(years, selectedYear, setSelectedYear, '\u5e74')}
              {renderPicker(months, selectedMonth, setSelectedMonth, '\u6708')}
              {renderPicker(days, selectedDay, setSelectedDay, '\u65e5')}
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
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    height: 220,
    paddingHorizontal: 4,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerScrollContent: {
    paddingVertical: 88,
  },
  pickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
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
