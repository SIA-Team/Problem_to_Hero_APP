import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { formatNumber } from '../utils/numberFormatter';
import { getLastLocationLevel } from '../utils/locationFormatter';
import { useTranslation } from '../i18n/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const scaleSpacing = size => (SCREEN_WIDTH / 375) * size;

export default function PublicProfileHero({
  userData,
  onStatPress,
  isFollowing,
  isFollowSubmitting,
  onFollowPress,
  isOwnProfile,
  onMessagePress,
}) {
  const { t } = useTranslation();

  if (!userData) {
    return null;
  }

  const verificationText =
    userData.verification?.text || (userData.verification?.verified ? '已认证' : '');

  const summaryItems = [];

  if (userData.location) {
    summaryItems.push({
      key: 'location',
      icon: 'location-outline',
      label: t('screens.settings.profile.location'),
      value: getLastLocationLevel(userData.location),
    });
  }

  if (userData.occupation) {
    summaryItems.push({
      key: 'occupation',
      icon: 'briefcase-outline',
      label: t('screens.settings.profile.occupation'),
      value: userData.occupation,
    });
  }

  if (userData.expertiseSummary) {
    summaryItems.push({
      key: 'expertise',
      icon: 'sparkles-outline',
      label: t('screens.settings.profile.expertise'),
      value: userData.expertiseSummary,
    });
  }

  if (userData.verification?.verified) {
    summaryItems.push({
      key: 'verification',
      label: t('profile.verification'),
      value: verificationText,
      isVerification: true,
    });
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri:
            userData.coverImage ||
            'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop',
        }}
        style={styles.coverImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.usernameWrapper}>
          <Text style={styles.usernameOnCover}>{userData.username}</Text>
        </View>

        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            <Avatar uri={userData.avatar} name={userData.username} size={scaleSpacing(62)} />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.statsAndAvatarRow}>
        <View style={styles.leftSection}>
          <View style={styles.statsRow}>
            {(userData.statsItems || []).map(item => (
              <TouchableOpacity
                key={item.key || item.label}
                style={styles.statItem}
                onPress={() => onStatPress && onStatPress(item.pressType || item.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.statNumber}>{formatNumber(item.value || 0)}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isOwnProfile ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={() => onFollowPress && onFollowPress(!isFollowing)}
                disabled={isFollowSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'add'}
                  size={scale(16)}
                  color={isFollowing ? '#ef4444' : '#fff'}
                />
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? '已关注' : '关注'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.messageButton}
                onPress={onMessagePress}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={scale(18)} color="#1f2937" />
              </TouchableOpacity>
            </View>
          ) : null}

          {userData.bio || summaryItems.length > 0 ? (
            <View style={styles.profileSummarySection}>
              {userData.bio ? (
                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryLabel}>{t('screens.settings.profile.bio')}</Text>
                  <Text style={styles.bioText} numberOfLines={3}>
                    {userData.bio}
                  </Text>
                </View>
              ) : null}

              {summaryItems.length > 0 ? (
                <View style={styles.summaryFacts}>
                  {summaryItems.map(item => (
                    <View key={item.key} style={styles.summaryItem}>
                      <View style={styles.summaryIconWrap}>
                        {item.isVerification ? (
                          <View style={styles.verificationBadge}>
                            <Text style={styles.verificationBadgeText}>V</Text>
                          </View>
                        ) : (
                          <Ionicons name={item.icon} size={16} color="#ef4444" />
                        )}
                      </View>
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryItemLabel}>{item.label}</Text>
                        <Text
                          style={styles.summaryItemValue}
                          numberOfLines={item.key === 'expertise' ? 2 : 1}
                        >
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: scaleSpacing(184),
    backgroundColor: '#d1d5db',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  usernameWrapper: {
    position: 'absolute',
    left: scaleSpacing(16),
    bottom: scaleSpacing(18),
    zIndex: 1,
  },
  usernameOnCover: {
    fontSize: scale(22),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatarWrapper: {
    position: 'absolute',
    right: scaleSpacing(16),
    bottom: -scaleSpacing(22),
    zIndex: 2,
  },
  avatarContainer: {
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: scaleSpacing(35),
    backgroundColor: '#fff',
  },
  statsAndAvatarRow: {
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(12),
    paddingBottom: scaleSpacing(6),
    backgroundColor: '#fff',
  },
  leftSection: {
    paddingRight: scaleSpacing(90),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: scaleSpacing(12),
    flexWrap: 'wrap',
    marginBottom: scaleSpacing(4),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scaleSpacing(3),
  },
  statNumber: {
    fontSize: scale(16),
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: scale(14),
    fontWeight: '400',
    color: '#8e8e93',
  },
  bioText: {
    fontSize: scale(14),
    fontWeight: '400',
    lineHeight: scale(21),
    color: '#374151',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: scaleSpacing(8),
    marginTop: scaleSpacing(8),
    marginBottom: scaleSpacing(4),
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scaleSpacing(6),
    backgroundColor: '#ef4444',
    paddingHorizontal: scaleSpacing(16),
    paddingVertical: scaleSpacing(8),
    borderRadius: scaleSpacing(6),
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  followButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
    color: '#ef4444',
  },
  messageButton: {
    width: scaleSpacing(40),
    height: scaleSpacing(40),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: scaleSpacing(6),
  },
  profileSummarySection: {
    marginTop: scaleSpacing(12),
    paddingTop: scaleSpacing(14),
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: scaleSpacing(12),
  },
  summaryBlock: {
    gap: scaleSpacing(6),
  },
  summaryLabel: {
    fontSize: scale(12),
    fontWeight: '600',
    color: '#9ca3af',
  },
  summaryFacts: {
    gap: scaleSpacing(10),
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scaleSpacing(10),
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSpacing(12),
    backgroundColor: '#f9fafb',
  },
  summaryIconWrap: {
    width: scaleSpacing(32),
    height: scaleSpacing(32),
    borderRadius: scaleSpacing(16),
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
    gap: scaleSpacing(3),
  },
  summaryItemLabel: {
    fontSize: scale(12),
    color: '#9ca3af',
  },
  summaryItemValue: {
    fontSize: scale(14),
    fontWeight: '500',
    lineHeight: scale(20),
    color: '#1f2937',
  },
  verificationBadge: {
    width: scaleSpacing(16),
    height: scaleSpacing(16),
    borderRadius: scaleSpacing(8),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationBadgeText: {
    color: '#fff',
    fontSize: scale(10),
    fontWeight: '700',
  },
});
