import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { formatNumber } from '../utils/numberFormatter';
import { getLastLocationLevel } from '../utils/locationFormatter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const scaleSpacing = size => (SCREEN_WIDTH / 375) * size;

export default function PublicProfileHero({
  userData,
  onStatPress,
  isFollowing,
  onFollowPress,
  isOwnProfile,
  onMessagePress,
}) {
  if (!userData) {
    return null;
  }

  const verificationText =
    userData.verification?.text ||
    (userData.verification?.verified ? '已认证' : '');

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: userData.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop',
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
            <Avatar uri={userData.avatar} name={userData.username} size={scaleSpacing(66)} />
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
              >
                <Text style={styles.statNumber}>{formatNumber(item.value || 0)}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {userData.bio ? (
            <View style={styles.bioSectionCompact}>
              <Text style={styles.bioText} numberOfLines={2}>
                {userData.bio}
              </Text>
            </View>
          ) : null}

          {!isOwnProfile && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={() => onFollowPress && onFollowPress(!isFollowing)}
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
          )}

          <View style={styles.metaRow}>
            {userData.occupation ? (
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={scale(13)} color="#8e8e93" />
                <Text style={styles.metaText}>{userData.occupation}</Text>
              </View>
            ) : null}

            {userData.verification?.verified ? (
              <View style={styles.metaItem}>
                <View style={styles.verificationBadge}>
                  <Text style={styles.verificationBadgeText}>V</Text>
                </View>
                <Text style={styles.metaText}>{verificationText}</Text>
              </View>
            ) : null}

            {userData.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={scale(13)} color="#8e8e93" />
                <Text style={styles.metaText}>IP属地: {getLastLocationLevel(userData.location)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.avatarPlaceholder} />
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
    height: scaleSpacing(200),
    backgroundColor: '#d1d5db',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  usernameWrapper: {
    position: 'absolute',
    left: scaleSpacing(16),
    bottom: scaleSpacing(16),
    zIndex: 1,
  },
  usernameOnCover: {
    fontSize: scale(22),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
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
    position: 'relative',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: scaleSpacing(36),
    backgroundColor: '#fff',
  },
  statsAndAvatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(12),
    paddingBottom: scaleSpacing(12),
    backgroundColor: '#fff',
  },
  leftSection: {
    flex: 1,
    paddingRight: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: scaleSpacing(10),
    flexWrap: 'wrap',
    marginBottom: scaleSpacing(8),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scaleSpacing(3),
  },
  statNumber: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: scale(14),
    color: '#8e8e93',
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
  bioSectionCompact: {
    marginTop: scaleSpacing(8),
    marginBottom: scaleSpacing(8),
  },
  bioText: {
    fontSize: scale(14),
    lineHeight: scale(20),
    color: '#8e8e93',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: scaleSpacing(12),
    marginTop: scaleSpacing(4),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(4),
  },
  metaText: {
    fontSize: scale(12),
    color: '#8e8e93',
  },
  avatarPlaceholder: {
    width: scaleSpacing(40),
    height: scaleSpacing(66),
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1d5db',
    borderRadius: scaleSpacing(6),
  },
});
