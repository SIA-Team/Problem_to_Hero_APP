import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';

const QuestionDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.titleSection}>
        <SkeletonBlock width="80%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="60%" height={20} />
      </View>

      <View style={styles.authorSection}>
        <SkeletonBlock width={32} height={32} style={{ borderRadius: 16 }} />
        <View style={styles.authorInfo}>
          <SkeletonBlock width={100} height={16} style={{ marginBottom: 4 }} />
          <SkeletonBlock width={150} height={14} />
        </View>
      </View>

      <View style={styles.contentSection}>
        <SkeletonBlock width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="100%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="90%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="95%" height={16} />
      </View>

      <View style={styles.rewardSection}>
        <SkeletonBlock width={80} height={32} style={{ marginRight: 12 }} />
        <SkeletonBlock width={100} height={32} />
      </View>

      <View style={styles.tabsSection}>
        <SkeletonBlock width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBlock width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBlock width={80} height={40} style={{ marginRight: 16 }} />
        <SkeletonBlock width={60} height={40} />
      </View>

      {[1, 2, 3].map(item => (
        <View key={item} style={styles.listItemSection}>
          <View style={styles.listItemHeader}>
            <SkeletonBlock width={24} height={24} style={{ borderRadius: 12, marginRight: 8 }} />
            <SkeletonBlock width={100} height={16} />
          </View>
          <SkeletonBlock width="100%" height={16} style={{ marginTop: 12, marginBottom: 8 }} />
          <SkeletonBlock width="100%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="80%" height={16} />
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
