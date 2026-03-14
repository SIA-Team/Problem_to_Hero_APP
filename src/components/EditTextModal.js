import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

/**
 * 通用文本编辑弹窗组件
 * 可用于昵称、个人简介、职业、所在地等单字段编辑
 */
export default function EditTextModal({
  visible,
  onClose,
  title = '编辑',
  currentValue = '',
  onSave,
  placeholder = '请输入内容',
  minLength = 0,
  maxLength = 100,
  multiline = false,
  hint = '',
  keyboardType = 'default',
  loading = false,
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setValue(currentValue || '');
      setError('');
    }
  }, [visible, currentValue]);

  const validateValue = (text) => {
    setValue(text);
    setError('');

    if (minLength > 0 && text.trim().length < minLength) {
      setError(`至少${minLength}个字符`);
      return false;
    }

    if (text.length > maxLength) {
      setError(`不能超过${maxLength}个字符`);
      return false;
    }

    return true;
  };

  const handleSave = () => {
    const trimmedValue = value.trim();
    
    if (minLength > 0 && !trimmedValue) {
      setError('内容不能为空');
      return;
    }

    if (validateValue(value)) {
      onSave(trimmedValue);
      onClose();
    }
  };

  const handleCancel = () => {
    setValue(currentValue || '');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalContainer, multiline && styles.modalContainerLarge]}>
                {/* 标题 */}
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* 输入框 */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      multiline && styles.inputMultiline,
                      error && styles.inputError,
                    ]}
                    value={value}
                    onChangeText={validateValue}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    maxLength={maxLength}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    autoFocus={true}
                    returnKeyType={multiline ? 'default' : 'done'}
                    onSubmitEditing={multiline ? undefined : handleSave}
                    keyboardType={keyboardType}
                  />
                  {!multiline && value.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setValue('')}
                      style={styles.clearButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#ccc" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 提示和字数统计 */}
                <View style={styles.infoRow}>
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : hint ? (
                    <Text style={styles.hintText}>{hint}</Text>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <Text style={[styles.countText, value.length > maxLength && styles.countError]}>
                    {value.length}/{maxLength}
                  </Text>
                </View>

                {/* 按钮 */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.saveButton,
                      (minLength > 0 && !value.trim() || error || loading) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={minLength > 0 && !value.trim() || !!error || loading}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>保存</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
    shadowColor: modalTokens.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  modalContainerLarge: {
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  input: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    color: modalTokens.textPrimary,
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: 12,
    paddingRight: 16,
  },
  inputError: {
    borderColor: modalTokens.danger,
    backgroundColor: modalTokens.dangerSoft,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 20,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: modalTokens.textMuted,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: modalTokens.danger,
  },
  countText: {
    fontSize: 12,
    color: modalTokens.textMuted,
    marginLeft: 8,
  },
  countError: {
    color: modalTokens.danger,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: modalTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: modalTokens.textSecondary,
  },
  saveButton: {
    backgroundColor: modalTokens.danger,
  },
  saveButtonDisabled: {
    backgroundColor: '#fda4af',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
