import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PICKER_HEIGHT = 220;
const PICKER_ITEM_HEIGHT = 44;
const PICKER_VERTICAL_PADDING = (PICKER_HEIGHT - PICKER_ITEM_HEIGHT) / 2;

const padNumber = value => String(value).padStart(2, '0');

const parseDateTime = dateTimeStr => {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };

  if (!dateTimeStr || typeof dateTimeStr !== 'string') {
    return fallback;
  }

  const match = dateTimeStr.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?$/
  );

  if (!match) {
    return fallback;
  }

  const [, year, month, day, hour = '00', minute = '00'] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
};

const formatDateTime = ({ year, month, day, hour, minute }) =>
  `${year}-${padNumber(month)}-${padNumber(day)} ${padNumber(hour)}:${padNumber(minute)}`;

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

const formatPickerValue = (value, unit) =>
  unit === '年' ? `${value}${unit}` : `${padNumber(value)}${unit}`;

const clampIndex = (index, itemsLength) => {
  if (itemsLength <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), itemsLength - 1);
};

export default function DateTimePickerModal({
  visible,
  onClose,
  currentDateTime,
  onSelect,
  title,
  cancelText = '取消',
  confirmText = '确定',
}) {
  const bottomSafeInset = useBottomSafeInset(20);
  const yearScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const parsedCurrent = useMemo(() => parseDateTime(currentDateTime), [currentDateTime]);
  const currentYear = new Date().getFullYear();
  const startYear = Math.min(parsedCurrent.year, currentYear - 1);
  const endYear = Math.max(parsedCurrent.year, currentYear + 10);
  const years = useMemo(
    () => Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index),
    [endYear, startYear]
  );
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, index) => index), []);

  const [selectedYear, setSelectedYear] = useState(parsedCurrent.year);
  const [selectedMonth, setSelectedMonth] = useState(parsedCurrent.month);
  const [selectedDay, setSelectedDay] = useState(parsedCurrent.day);
  const [selectedHour, setSelectedHour] = useState(parsedCurrent.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsedCurrent.minute);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextValue = parseDateTime(currentDateTime);
    setSelectedYear(nextValue.year);
    setSelectedMonth(nextValue.month);
    setSelectedDay(nextValue.day);
    setSelectedHour(nextValue.hour);
    setSelectedMinute(nextValue.minute);
  }, [currentDateTime, visible]);

  useEffect(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [selectedDay, selectedMonth, selectedYear]);

  const days = useMemo(
    () =>
      Array.from(
        { length: getDaysInMonth(selectedYear, selectedMonth) },
        (_, index) => index + 1
      ),
    [selectedMonth, selectedYear]
  );

  const scrollToValue = useCallback((scrollRef, items, selectedValue, animated = false) => {
    const targetIndex = items.findIndex(item => item === selectedValue);
    if (targetIndex < 0 || !scrollRef?.current?.scrollTo) {
      return;
    }

    scrollRef.current.scrollTo({
      y: targetIndex * PICKER_ITEM_HEIGHT,
      animated,
    });
  }, []);

  const syncPickerValueFromOffset = useCallback((offsetY, items, onValueChange) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const targetIndex = clampIndex(Math.round(offsetY / PICKER_ITEM_HEIGHT), items.length);
    const nextValue = items[targetIndex];

    if (nextValue !== undefined) {
      onValueChange(nextValue);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const syncTimer = setTimeout(() => {
      scrollToValue(yearScrollRef, years, selectedYear, false);
      scrollToValue(monthScrollRef, months, selectedMonth, false);
      scrollToValue(dayScrollRef, days, selectedDay, false);
      scrollToValue(hourScrollRef, hours, selectedHour, false);
      scrollToValue(minuteScrollRef, minutes, selectedMinute, false);
    }, 30);

    return () => clearTimeout(syncTimer);
  }, [
    days,
    hours,
    minutes,
    months,
    selectedDay,
    selectedHour,
    selectedMinute,
    selectedMonth,
    selectedYear,
    scrollToValue,
    visible,
    years,
  ]);

  const handleConfirm = () => {
    onSelect(
      formatDateTime({
        year: selectedYear,
        month: selectedMonth,
        day: selectedDay,
        hour: selectedHour,
        minute: selectedMinute,
      })
    );
    onClose();
  };

  const renderPicker = (items, selectedValue, onValueChange, unit, scrollRef) => (
    <View style={styles.pickerColumn}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerScrollContent}
        snapToInterval={PICKER_ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={event => {
          syncPickerValueFromOffset(event.nativeEvent.contentOffset.y, items, onValueChange);
        }}
        onScrollEndDrag={event => {
          syncPickerValueFromOffset(event.nativeEvent.contentOffset.y, items, onValueChange);
        }}
      >
        {items.map(item => {
          const isSelected = item === selectedValue;

          return (
            <TouchableOpacity
              key={`${unit}-${item}`}
              style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
              onPress={() => onValueChange(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}
              >
                {formatPickerValue(item, unit)}
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
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalContainer, { paddingBottom: bottomSafeInset }]}
          onPress={event => event.stopPropagation()}
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
            <View style={styles.selectionIndicator} pointerEvents="none" />
            <View style={styles.pickerRow}>
              {renderPicker(years, selectedYear, setSelectedYear, '年', yearScrollRef)}
              {renderPicker(months, selectedMonth, setSelectedMonth, '月', monthScrollRef)}
              {renderPicker(days, selectedDay, setSelectedDay, '日', dayScrollRef)}
              {renderPicker(hours, selectedHour, setSelectedHour, '时', hourScrollRef)}
              {renderPicker(minutes, selectedMinute, setSelectedMinute, '分', minuteScrollRef)}
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
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 16 + PICKER_VERTICAL_PADDING,
    height: PICKER_ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: modalTokens.surfaceSoft,
  },
  pickerRow: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
    paddingHorizontal: 4,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerScrollContent: {
    paddingVertical: PICKER_VERTICAL_PADDING,
  },
  pickerItem: {
    height: PICKER_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  pickerItemSelected: {
    borderRadius: 12,
  },
  pickerItemText: {
    fontSize: 15,
    color: modalTokens.textMuted,
  },
  pickerItemTextSelected: {
    fontSize: 17,
    color: modalTokens.textPrimary,
    fontWeight: '700',
  },
});
