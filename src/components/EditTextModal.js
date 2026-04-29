import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

export default function EditTextModal({
  visible,
  onClose,
  title = 'Edit',
  currentValue = '',
  onSave,
  placeholder = 'Enter content',
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
  }, [currentValue, visible]);

  const validateValue = (text) => {
    setValue(text);
    setError('');

    if (minLength > 0 && text.trim().length < minLength) {
      setError(`At least ${minLength} characters`);
      return false;
    }

    if (text.length > maxLength) {
      setError(`No more than ${maxLength} characters`);
      return false;
    }

    return true;
  };

  const handleSave = () => {
    const trimmedValue = value.trim();

    if (minLength > 0 && !trimmedValue) {
      setError('Content is required');
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
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={[styles.modalContainer, multiline && styles.modalContainerLarge]}>
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
                autoFocus
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

            <View style={styles.infoRow}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : hint ? (
                <Text style={styles.hintText}>{hint}</Text>
              ) : (
                <View style={styles.infoSpacer} />
              )}
              <Text style={[styles.countText, value.length > maxLength && styles.countError]}>
                {value.length}/{maxLength}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (minLength > 0 && !value.trim()) || error || loading
                    ? styles.saveButtonDisabled
                    : null,
                ]}
                onPress={handleSave}
                disabled={(minLength > 0 && !value.trim()) || !!error || loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
  infoSpacer: {
    flex: 1,
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
