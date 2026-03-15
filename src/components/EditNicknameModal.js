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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

/**
 * 修改昵称弹窗组件
 * 参考微信、QQ 的设计风格
 */
export default function EditNicknameModal({ visible, onClose, currentNickname, onSave }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNickname(currentNickname || '');
      setError('');
    }
  }, [visible, currentNickname]);

  const validateNickname = (text) => {
    setNickname(text);
    setError('');

    if (!text.trim()) {
      setError('昵称不能为空');
      return false;
    }

    if (text.length < 2) {
      setError('昵称至少2个字符');
      return false;
    }

    if (text.length > 20) {
      setError('昵称不能超过20个字符');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (validateNickname(nickname)) {
      onSave(nickname.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    setNickname(currentNickname || '');
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
              <View style={styles.modalContainer}>
                {/* 标题 */}
                <View style={styles.header}>
                  <Text style={styles.title}>修改昵称</Text>
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
                    style={[styles.input, error && styles.inputError]}
                    value={nickname}
                    onChangeText={validateNickname}
                    placeholder="请输入昵称"
                    placeholderTextColor="#999"
                    maxLength={20}
                    autoFocus={true}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                  {nickname.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setNickname('')}
                      style={styles.clearButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#ccc" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 字数统计 */}
                <View style={styles.infoRow}>
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : (
                    <Text style={styles.hintText}>2-20个字符，可包含中英文、数字</Text>
                  )}
                  <Text style={[styles.countText, nickname.length > 20 && styles.countError]}>
                    {nickname.length}/20
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
                      (!nickname.trim() || error) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!nickname.trim() || !!error}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>保存</Text>
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
  inputError: {
    borderColor: modalTokens.danger,
    backgroundColor: modalTokens.dangerSoft,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
