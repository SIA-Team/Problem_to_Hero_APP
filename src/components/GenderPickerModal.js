import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { modalTokens } from './modalTokens';

/**
 * 性别选择弹窗组件（底部弹出式 ActionSheet 风格）
 */
export default function GenderPickerModal({ visible, onClose, currentGender, onSelect }) {
  const insets = useSafeAreaInsets();
  
  const genderOptions = [
    { value: '男', label: '男' },
    { value: '女', label: '女' },
    { value: '保密', label: '保密' },
  ];

  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          style={[styles.modalContainer, { paddingBottom: insets.bottom || 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <View style={styles.header}>
            <Text style={styles.title}>选择性别</Text>
          </View>

          {/* 选项列表 */}
          <View style={styles.optionsList}>
            {genderOptions.map((option, index) => {
              const isSelected = currentGender === option.value;
              const isLast = index === genderOptions.length - 1;
              
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    !isLast && styles.optionItemBorder
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.6}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={24} color="#ef4444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 取消按钮 */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.6}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
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
    backgroundColor: modalTokens.surfaceSoft,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
  },
  title: {
    fontSize: 15,
    color: modalTokens.textSecondary,
    fontWeight: '600',
  },
  optionsList: {
    backgroundColor: modalTokens.surface,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: modalTokens.surface,
  },
  optionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: modalTokens.border,
  },
  optionText: {
    fontSize: 17,
    color: modalTokens.textPrimary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: modalTokens.danger,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: modalTokens.surface,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  cancelText: {
    fontSize: 17,
    color: modalTokens.textSecondary,
    fontWeight: '600',
  },
});
