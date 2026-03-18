import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTranslation } from '../i18n/useTranslation';
import { formatNumber } from '../utils/numberFormatter';

/**
 * 通用内容卡片组件
 * 支持文章、视频、微头条、转发等类型
 */
export default function ContentCard({
  item,
  onPress,
  userData
}) {
  const {
    t
  } = useTranslation();

  /**
   * 格式化时间
   */
  const formatTime = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  /**
   * 渲染文章卡片
   */
  const renderArticleCard = () => <View style={styles.contentArea}>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      {Boolean(item.summary) && <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>}
      {Boolean(item.coverImage) && <Image source={{
      uri: item.coverImage
    }} style={styles.coverImage} />}
    </View>;

  /**
   * 渲染视频卡片
   */
  const renderVideoCard = () => <View style={styles.contentArea}>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      {Boolean(item.videoThumbnail) && <View style={styles.videoContainer}>
          <Image source={{
        uri: item.videoThumbnail
      }} style={styles.videoThumbnail} />
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#fff" />
          </View>
          {Boolean(item.videoDuration) && <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {Math.floor(item.videoDuration / 60)}:{String(item.videoDuration % 60).padStart(2, '0')}
              </Text>
            </View>}
        </View>}
    </View>;

  /**
   * 渲染微头条卡片
   */
  const renderMicroPostCard = () => <View style={styles.contentArea}>
      <Text style={styles.microPostContent} numberOfLines={6}>{item.content}</Text>
      {Boolean(item.images && item.images.length > 0) && <View style={styles.imagesGrid}>
          {item.images.slice(0, 3).map((img, index) => <Image key={index} source={{
        uri: img
      }} style={styles.gridImage} />)}
        </View>}
    </View>;

  /**
   * 渲染转发卡片
   */
  const renderRepostCard = () => <View style={styles.contentArea}>
      {Boolean(item.repostComment) && <Text style={styles.repostComment} numberOfLines={3}>{item.repostComment}</Text>}
      {Boolean(item.originalContent) && <View style={styles.originalContentBox}>
          <Text style={styles.originalTitle} numberOfLines={2}>
            {item.originalContent.title || item.originalContent.content}
          </Text>
        </View>}
    </View>;

  /**
   * 根据类型渲染内容
   */
  const renderContent = () => {
    switch (item.type) {
      case 'article':
        return renderArticleCard();
      case 'video':
        return renderVideoCard();
      case 'micropost':
        return renderMicroPostCard();
      case 'repost':
        return renderRepostCard();
      default:
        return null;
    }
  };
  return <TouchableOpacity style={styles.container} onPress={() => onPress(item)} activeOpacity={0.95}>
      {/* 用户信息行 */}
      <View style={styles.header}>
        <Avatar uri={userData?.avatar} name={userData?.username} size={36} />
        <View style={styles.headerInfo}>
          <Text style={styles.username}>{userData?.username}</Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>

      {/* 内容区域 */}
      {renderContent()}

      {/* 互动数据行 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="share-social-outline" size={18} color="#6b7280" />
          <Text style={styles.statText}>{formatNumber(item.sharesCount || 0)}</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={18} color="#6b7280" />
          <Text style={styles.statText}>{formatNumber(item.commentsCount)}</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="heart-outline" size={18} color="#6b7280" />
          <Text style={styles.statText}>{formatNumber(item.likesCount)}</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={18} color="#6b7280" />
          <Text style={styles.statText}>{formatNumber(item.collectsCount || 0)}</Text>
        </View>
      </View>
    </TouchableOpacity>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10
  },
  headerInfo: {
    flex: 1
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2
  },
  time: {
    fontSize: 12,
    color: '#9ca3af'
  },
  contentArea: {
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 8
  },
  summary: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f3f4f6'
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden'
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6'
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{
      translateX: -20
    }, {
      translateY: -20
    }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  durationText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500'
  },
  microPostContent: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22
  },
  imagesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  gridImage: {
    flex: 1,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#f3f4f6'
  },
  repostComment: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 12
  },
  originalContentBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444'
  },
  originalTitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 13,
    color: '#6b7280'
  }
});