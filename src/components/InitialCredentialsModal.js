import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalTokens } from './modalTokens';
import { scaleFont } from '../utils/responsive';

export default function InitialCredentialsModal({
  visible,
  username = '',
  password = '',
  onConfirm,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#ef4444" />
            </View>
            <Text style={styles.title}>请记住您的登录信息</Text>
          </View>

          <Text style={styles.desc}>
            系统已为您分配登录账号，请尽快修改密码，并妥善保存以下用户名和密码，后续登录需要使用。
          </Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>用户名</Text>
              <Text style={styles.infoValue}>{username}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>密码</Text>
              <Text style={styles.infoValue}>{password}</Text>
            </View>
          </View>

          <View style={styles.noticeBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
            <Text style={styles.noticeText}>
              若因未妥善保存用户名和密码导致无法登录，进而造成数据丢失，平台不承担相关责任。
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmButtonText}>确认</Text>
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
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
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
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  desc: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(22),
    color: modalTokens.textSecondary,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: modalTokens.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: scaleFont(12),
    color: modalTokens.textMuted,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: modalTokens.border,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFont(12),
    lineHeight: scaleFont(18),
    color: '#92400e',
  },
  confirmButton: {
    backgroundColor: modalTokens.danger,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#fff',
  },
});
