import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

/**
 * 退出登录确认弹窗组件
 */
export default function LogoutConfirmModal({
  visible,
  onClose,
  onConfirm,
  username,
  isLoading = false,
  showDefaultPassword = false // 是否显示默认密码
}) {
  const defaultPassword = '12345678';
  return <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 标题 */}
          <Text style={styles.title}>退出登录</Text>

          {/* 提示信息 */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>请记住当前的用户名和密码</Text>
            
            {/* 用户名 */}
            {Boolean(username) && <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoLabel}>用户名：</Text>
                </View>
                <Text style={styles.infoValue}>{username}</Text>
              </View>}

            {/* 默认密码（仅在未修改密码时显示） */}
            {Boolean(showDefaultPassword) && <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="lock-closed-outline" size={16} color="#6b7280" />
                  <Text style={styles.infoLabel}>默认密码：</Text>
                </View>
                <Text style={styles.infoValue}>{defaultPassword}</Text>
              </View>}
          </View>

          {/* 按钮组 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} activeOpacity={0.7} disabled={isLoading}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirmButton, isLoading && styles.confirmButtonDisabled]} onPress={onConfirm} activeOpacity={0.7} disabled={isLoading}>
              {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmButtonText}>退出登录</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
    shadowColor: modalTokens.shadow,
    shadowOffset: {
      width: 0,
      height: 12
    },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 16,
    textAlign: 'center'
  },
  messageContainer: {
    width: '100%',
    marginBottom: 24
  },
  message: {
    fontSize: 15,
    color: modalTokens.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16
  },
  infoBox: {
    backgroundColor: modalTokens.surfaceSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6
  },
  infoLabel: {
    fontSize: 13,
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 16,
    color: modalTokens.textPrimary,
    fontWeight: '600',
    marginLeft: 22
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButton: {
    backgroundColor: modalTokens.surfaceMuted,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: modalTokens.textSecondary
  },
  confirmButton: {
    backgroundColor: modalTokens.danger
  },
  confirmButtonDisabled: {
    backgroundColor: '#fda4af'
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});