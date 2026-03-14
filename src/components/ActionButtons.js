import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/useTranslation';
import { showAppAlert } from '../utils/appAlert';

/**
 * 操作按钮组件（今日头条风格）
 * 包含关注按钮和发私信按钮
 */
export default function ActionButtons({ 
  isFollowing, 
  isOwnProfile, 
  isLoggedIn = true,
  onFollowPress, 
  onMessagePress,
  onLoginRequired 
}) {
  const { t } = useTranslation();

  // 如果是自己的主页，隐藏按钮
  if (isOwnProfile) {
    return null;
  }

  /**
   * 处理关注按钮点击
   */
  const handleFollowPress = () => {
    if (!isLoggedIn) {
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

    if (isFollowing) {
      // 显示取消关注确认对话框
      showAppAlert(
        t('profile.unfollowConfirmTitle'),
        t('profile.unfollowConfirmMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('profile.unfollow'),
            style: 'destructive',
            onPress: () => {
              if (onFollowPress) {
                onFollowPress(false);
              }
            },
          },
        ]
      );
    } else {
      if (onFollowPress) {
        onFollowPress(true);
      }
    }
  };

  /**
   * 处理发私信按钮点击
   */
  const handleMessagePress = () => {
    if (!isLoggedIn) {
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

    if (onMessagePress) {
      onMessagePress();
    }
  };

  return (
    <View style={styles.container}>
      {/* 关注按钮 */}
      <TouchableOpacity 
        style={[
          styles.followButton,
          isFollowing && styles.followingButton
        ]}
        onPress={handleFollowPress}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isFollowing ? "checkmark" : "add"} 
          size={18} 
          color="#fff" 
        />
        <Text style={styles.followButtonText}>
          {isFollowing ? t('profile.following') : t('profile.follow')}
        </Text>
      </TouchableOpacity>

      {/* 发私信按钮 */}
      <TouchableOpacity 
        style={styles.messageButton}
        onPress={handleMessagePress}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-outline" size={18} color="#6b7280" />
        <Text style={styles.messageButtonText}>{t('profile.sendMessage')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  followingButton: {
    backgroundColor: '#6b7280',
    shadowColor: '#6b7280',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 6,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
});
