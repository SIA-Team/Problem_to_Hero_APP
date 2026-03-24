import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 公开主页顶部导航栏组件
 * 左侧：返回按钮
 * 中间：留空
 * 右侧：转发按钮
 */
export default function PublicProfileHeader({
  bio,
  onBack,
  onShare,
  showBlacklist = false,
  onBlacklist,
  blacklistLabel = '加入黑名单',
  blacklistDisabled = false,
}) {
  const insets = useSafeAreaInsets();
  
  // 计算安全的顶部内边距
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 8 : 0);

  /**
   * 处理转发
   */
  const handleShare = async () => {
    if (onShare) {
      onShare();
    }
  };

  const handleBlacklist = () => {
    if (onBlacklist) {
      onBlacklist();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeTopPadding + 12 }]}>
      {/* 返回按钮 */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>

      {/* 中间留空 */}
      <View style={styles.centerSection} />

      {/* 转发按钮 */}
      <View style={styles.actions}>
        {showBlacklist ? <TouchableOpacity style={[styles.blacklistButton, blacklistDisabled && styles.blacklistButtonDisabled]} onPress={handleBlacklist} disabled={blacklistDisabled}>
            <Text style={styles.blacklistText}>{blacklistLabel}</Text>
          </TouchableOpacity> : null}
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blacklistButton: {
    minWidth: 88,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  blacklistButtonDisabled: {
    opacity: 0.6,
  },
  blacklistText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
});
