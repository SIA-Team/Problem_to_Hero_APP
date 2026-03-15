import React from 'react';
import { View, StyleSheet } from 'react-native';

const SupplementAnswerSkeleton = ({ count = 2 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonAuthorInfo}>
              <View style={styles.skeletonAuthorName} />
              <View style={styles.skeletonLocation} />
            </View>
          </View>
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '70%' }]} />
          </View>
          <View style={styles.skeletonActions}>
            <View style={styles.skeletonActionBtn} />
            <View style={styles.skeletonActionBtn} />
            <View style={styles.skeletonActionBtn} />
            <View style={styles.skeletonActionBtn} />
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  skeletonAuthorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonAuthorName: {
    width: 80,
    height: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 6,
  },
  skeletonLocation: {
    width: 50,
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  skeletonContent: {
    marginBottom: 12,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 7,
    marginBottom: 8,
  },
  skeletonActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skeletonActionBtn: {
    width: 40,
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
});

export default SupplementAnswerSkeleton;