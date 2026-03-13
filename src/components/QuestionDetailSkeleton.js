import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const QuestionDetailSkeleton = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const SkeletonBox = ({ width, height, style }) => (
    <View style={[styles.skeletonBox, { width, height }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 标题骨架 */}
      <View style={styles.titleSection}>
        <SkeletonBox width="80%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={20} />
      </View>

      {/* 作者信息骨架 */}
      <View style={styles.authorSection}>
        <SkeletonBox width={32} height={32} style={{ borderRadius: 16 }} />
        <View style={styles.authorInfo}>
          <SkeletonBox width={100} height={16} style={{ marginBottom: 4 }} />
          <SkeletonBox width={150} height={14} />
        </View>
      </View>

      {/* 内容骨架 */}
      <View style={styles.contentSection}>
        <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="90%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="95%" height={16} />
      </View>

      {/* 悬赏信息骨架 */}
      <View style={styles.rewardSection}>
        <SkeletonBox width={80} height={32} style={{ marginRight: 12 }} />
        <SkeletonBox width={100} height={32} />
      </View>

      {/* 标签页骨架 */}
      <View style={styles.tabsSection}>
        <SkeletonBox width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBox width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBox width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBox width={60} height={40} />
      </View>

      {/* 列表项骨架 */}
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.listItemSection}>
          <View style={styles.listItemHeader}>
            <SkeletonBox width={24} height={24} style={{ borderRadius: 12, marginRight: 8 }} />
            <SkeletonBox width={100} height={16} />
          </View>
          <SkeletonBox width="100%" height={16} style={{ marginTop: 12, marginBottom: 8 }} />
          <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonBox width="80%" height={16} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  skeletonBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  titleSection: {
    marginBottom: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorInfo: {
    marginLeft: 8,
    flex: 1,
  },
  contentSection: {
    marginBottom: 16,
  },
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  tabsSection: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listItemSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default QuestionDetailSkeleton;
