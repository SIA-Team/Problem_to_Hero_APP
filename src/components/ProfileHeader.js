import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTranslation } from '../i18n/useTranslation';
import { formatNumber } from '../utils/numberFormatter';
import { getLastLocationLevel } from '../utils/locationFormatter';

// 获取屏幕宽度
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');

// 响应式字体大小计算函数（基于375px设计稿）
const scale = size => SCREEN_WIDTH / 375 * size;

// 响应式间距计算函数
const scaleSpacing = size => SCREEN_WIDTH / 375 * size;

/**
 * 认证图标组件 - 圆形背景 + V字母（使用纯 React Native 组件）
 */
const VerificationIcon = ({
  size = 16,
  color = '#3b82f6'
}) => {
  return <View style={{
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    justifyContent: 'center',
    alignItems: 'center'
  }}>
      <Text style={{
      color: '#fff',
      fontSize: size * 0.6,
      fontWeight: '700',
      fontFamily: 'monospace'
    }}>
        V
      </Text>
    </View>;
};

/**
 * 头像组件 - 完全独立，不受关注状态影响
 * 使用 key 属性确保头像不会因为父组件重新渲染而重新加载
 */
const MemoizedAvatar = memo(({
  avatar,
  username,
  size
}) => {
  return <Avatar key={avatar} uri={avatar} name={username} size={size} />;
}, (prevProps, nextProps) => {
  // 只有当头像 URI 或用户名改变时才重新渲染
  return prevProps.avatar === nextProps.avatar && prevProps.username === nextProps.username;
});

/**
 * 关注按钮组件 - 独立出来，只在关注状态改变时重新渲染
 */
const FollowButton = memo(({
  isFollowing,
  onFollowPress
}) => {
  return <TouchableOpacity style={[styles.followButtonSmall, isFollowing && styles.followingButtonSmall]} onPress={() => onFollowPress && onFollowPress(!isFollowing)} activeOpacity={0.8}>
      <Ionicons name={isFollowing ? "checkmark" : "add"} size={scale(18)} color={isFollowing ? "#ef4444" : "#fff"} />
    </TouchableOpacity>;
}, (prevProps, nextProps) => {
  // 只有当关注状态改变时才重新渲染
  return prevProps.isFollowing === nextProps.isFollowing;
});

/**
 * 头像和关注按钮容器 - 组合两个独立的组件
 */
const AvatarWithFollowButton = memo(({
  avatar,
  username,
  isFollowing,
  onFollowPress,
  isOwnProfile
}) => {
  return <View style={styles.avatarWrapper}>
      <View style={styles.avatarContainer}>
        <MemoizedAvatar uri={avatar} name={username} size={scaleSpacing(66)} />
        {/* 关注按钮 - 在头像右下角 */}
        {!isOwnProfile && <FollowButton isFollowing={isFollowing} onFollowPress={onFollowPress} />}
      </View>
    </View>;
}, (prevProps, nextProps) => {
  // 只有当这些属性改变时才重新渲染容器
  return prevProps.avatar === nextProps.avatar && prevProps.username === nextProps.username && prevProps.isFollowing === nextProps.isFollowing && prevProps.isOwnProfile === nextProps.isOwnProfile;
});

/**
 * 用户主页头部组件（今日头条风格 - 响应式版本）
 * 顶部背景图 + 头像叠加在右下角 + 优化的用户信息布局
 */
function ProfileHeader({
  userData,
  onStatPress,
  isFollowing,
  onFollowPress,
  isOwnProfile
}) {
  const {
    t
  } = useTranslation();
  if (!userData) return null;
  const {
    username,
    avatar,
    coverImage,
    bio,
    verification,
    stats,
    tags = [],
    location,
    gender,
    occupation,
    mcn
  } = userData;

  /**
   * 获取认证图标和颜色
   */
  const getVerificationInfo = () => {
    if (!verification || !verification.verified) return null;
    switch (verification.type) {
      case 'personal':
        return {
          icon: 'checkmark-circle',
          color: '#3b82f6'
        };
      case 'enterprise':
        return {
          icon: 'business',
          color: '#f59e0b'
        };
      case 'government':
        return {
          icon: 'shield-checkmark',
          color: '#ef4444'
        };
      default:
        return null;
    }
  };
  const verificationInfo = getVerificationInfo();
  return <View style={styles.container}>
      {/* 背景图区域 */}
      <ImageBackground source={{
      uri: coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop'
    }} style={styles.coverImage} resizeMode="cover">
        {/* 半透明遮罩层 */}
        <View style={styles.overlay} />
        
        {/* 用户名显示在背景图左下角 */}
        <View style={styles.usernameWrapper}>
          <Text style={styles.usernameOnCover}>{username}</Text>
        </View>
        
        {/* 头像叠加在背景图右下角 - 使用独立组件 */}
        <AvatarWithFollowButton avatar={avatar} username={username} isFollowing={isFollowing} onFollowPress={onFollowPress} isOwnProfile={isOwnProfile} />
      </ImageBackground>

      {/* 统计数据和头像区域 - 左右布局 */}
      <View style={styles.statsAndAvatarRow}>
        {/* 左侧：统计数据和认证信息 */}
        <View style={styles.leftSection}>
          {/* 统计数据 */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => onStatPress && onStatPress('likes')}>
              <Text style={styles.statNumber}>{formatNumber(stats.likesCount)}</Text>
              <Text style={styles.statLabel}>点赞</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statItem} onPress={() => onStatPress && onStatPress('followers')}>
              <Text style={styles.statNumber}>{formatNumber(stats.followersCount)}</Text>
              <Text style={styles.statLabel}>粉丝</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statItem} onPress={() => onStatPress && onStatPress('following')}>
              <Text style={styles.statNumber}>{formatNumber(stats.followingCount)}</Text>
              <Text style={styles.statLabel}>关注</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statItem} onPress={() => onStatPress && onStatPress('friends')}>
              <Text style={styles.statNumber}>{formatNumber(stats.friendsCount || 0)}</Text>
              <Text style={styles.statLabel}>朋友</Text>
            </TouchableOpacity>
          </View>

          {/* 认证信息 - 紧跟在统计数据下方 */}
          {Boolean(verification && verification.verified) && <View style={styles.verificationRowCompact}>
              <VerificationIcon size={scaleSpacing(16)} color="#3b82f6" />
              <Text style={styles.verificationTextCompact}>律师</Text>
            </View>}

          {/* 简介 - 在认证信息下方 */}
          {Boolean(bio) && <View style={styles.bioSectionCompact}>
              <Text style={styles.bioText} numberOfLines={2}>{bio}</Text>
            </View>}

          {/* 底部元信息行 - 在简介下方 */}
          <View style={styles.metaRow}>
            {/* IP归属地 */}
            {Boolean(location) && <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={scale(13)} color="#8e8e93" />
                <Text style={styles.metaText}>IP属地: {getLastLocationLevel(location)}</Text>
              </View>}

            {/* 性别 */}
            {Boolean(gender) && <View style={styles.metaItem}>
                <Ionicons name={gender === 'male' ? 'male' : 'female'} size={scale(13)} color={gender === 'male' ? '#3b82f6' : '#ec4899'} />
                <Text style={styles.metaText}>
                  {gender === 'male' ? '男' : '女'}
                </Text>
              </View>}
          </View>
        </View>

        {/* 右侧：头像占位空间 */}
        <View style={styles.avatarPlaceholder} />
      </View>
    </View>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  coverImage: {
    width: '100%',
    height: scaleSpacing(200),
    backgroundColor: '#e5e7eb',
    justifyContent: 'flex-end'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  usernameWrapper: {
    position: 'absolute',
    left: scaleSpacing(16),
    bottom: scaleSpacing(16),
    zIndex: 1
  },
  usernameOnCover: {
    fontSize: scale(22),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 3
  },
  avatarWrapper: {
    position: 'absolute',
    right: scaleSpacing(16),
    bottom: -scaleSpacing(22),
    // 调整位置（66/3 = 22，下方占1/3）
    zIndex: 2
  },
  avatarContainer: {
    position: 'relative',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: scaleSpacing(36),
    // (66 + 3*2) / 2 = 36
    backgroundColor: '#fff'
  },
  // 小型关注按钮（在头像右下角）
  followButtonSmall: {
    position: 'absolute',
    bottom: -scaleSpacing(4),
    right: -scaleSpacing(4),
    width: scaleSpacing(28),
    height: scaleSpacing(28),
    borderRadius: scaleSpacing(14),
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  followingButtonSmall: {
    backgroundColor: '#fff'
  },
  // 统计数据和头像行 - 左右布局
  statsAndAvatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    // 改为顶部对齐
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(12),
    paddingBottom: scaleSpacing(12),
    backgroundColor: '#fff'
  },
  // 左侧区域（统计数据 + 认证信息）
  leftSection: {
    flex: 1,
    paddingRight: 0 // 移除右侧内边距，让文本可以延伸
  },
  // 统计数据行 - 4个统计项横向排列
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: scaleSpacing(10),
    flexWrap: 'wrap',
    marginBottom: scaleSpacing(8) // 给认证信息留出空间
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scaleSpacing(3)
  },
  statNumber: {
    fontSize: scale(15),
    fontWeight: '700',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: scale(14),
    color: '#8e8e93'
  },
  // 紧凑的认证信息行（在统计数据下方）
  verificationRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
    marginTop: scaleSpacing(4)
  },
  verificationTextCompact: {
    fontSize: scale(13),
    color: '#8e8e93',
    fontWeight: '500'
  },
  // 简介区域（紧凑版，在认证信息下方）
  bioSectionCompact: {
    marginTop: scaleSpacing(8),
    marginBottom: scaleSpacing(8)
  },
  bioText: {
    fontSize: scale(14),
    lineHeight: scale(20),
    color: '#8e8e93'
  },
  // 底部元信息行（在简介下方）
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: scaleSpacing(12),
    marginTop: scaleSpacing(4)
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(4)
  },
  metaText: {
    fontSize: scale(12),
    color: '#8e8e93'
  },
  // 右侧头像占位空间
  avatarPlaceholder: {
    width: scaleSpacing(40),
    // 减小占位宽度，给简介更多空间
    height: scaleSpacing(66)
  }
});

// 使用 memo 优化，防止不必要的重新渲染
// 关键：不检查 isFollowing，因为它的变化只应该影响关注按钮，不应该重新渲染整个头部
export default memo(ProfileHeader, (prevProps, nextProps) => {
  return prevProps.userData?.id === nextProps.userData?.id && prevProps.userData?.avatar === nextProps.userData?.avatar && prevProps.userData?.username === nextProps.userData?.username && prevProps.userData?.bio === nextProps.userData?.bio && prevProps.userData?.stats?.followersCount === nextProps.userData?.stats?.followersCount && prevProps.userData?.stats?.followingCount === nextProps.userData?.stats?.followingCount && prevProps.userData?.stats?.likesCount === nextProps.userData?.stats?.likesCount && prevProps.isOwnProfile === nextProps.isOwnProfile
  // 注意：故意不检查 isFollowing，让它的变化只影响 FollowButton 子组件
;
});