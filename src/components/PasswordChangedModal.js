import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';

/**
 * 密码修改成功提示模态框
 * 参考主流应用（微信、支付宝、银行APP）的设计
 */
export default function PasswordChangedModal({ visible, username, onConfirm }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 成功图标 */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
          </View>

          {/* 标题 */}
          <Text style={styles.title}>密码修改成功</Text>

          {/* 提示信息 */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={18} color="#3b82f6" />
              <Text style={styles.infoText}>为了您的账号安全，请重新登录</Text>
            </View>
          </View>

          {/* 用户名显示 */}
          <View style={styles.usernameBox}>
            <Text style={styles.usernameLabel}>您的用户名</Text>
            <View style={styles.usernameValueContainer}>
              <Ionicons name="person" size={16} color="#6b7280" />
              <Text style={styles.usernameValue}>{username}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>请牢记</Text>
              </View>
            </View>
            <Text style={styles.usernameHint}>登录时需要使用此用户名</Text>
          </View>

          {/* 确认按钮 */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>确定，去登录</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
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
    padding: 20,
  },
  container: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: modalTokens.border,
    shadowColor: modalTokens.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 16,
  },
  infoBox: {
    width: '100%',
    backgroundColor: modalTokens.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1d4ed8',
    lineHeight: 20,
  },
  usernameBox: {
    width: '100%',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
  },
  usernameLabel: {
    fontSize: 12,
    color: modalTokens.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  usernameValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  usernameValue: {
    fontSize: 18,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: modalTokens.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  usernameHint: {
    fontSize: 12,
    color: modalTokens.textMuted,
    fontStyle: 'italic',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: modalTokens.danger,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    gap: 8,
    shadowColor: modalTokens.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
