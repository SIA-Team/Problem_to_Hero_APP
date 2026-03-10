import React from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTabData } from '../hooks/useTabData';

/**
 * 优化的 Tab 列表组件
 * 支持懒加载、缓存、分页、下拉刷新
 */
const OptimizedTabList = ({
  tabKey,
  fetchFunction,
  isActive,
  renderItem,
  ListEmptyComponent,
  ListHeaderComponent,
  onItemPress,
  cacheTimeout = 5 * 60 * 1000,
  pageSize = 20,
}) => {
  const {
    data,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useTabData(tabKey, fetchFunction, isActive, {
    pageSize,
    cacheTimeout,
    enableCache: true,
    autoLoad: true,
  });
  
  // 渲染加载更多指示器
  const renderFooter = () => {
    if (!hasMore && data.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>没有更多了</Text>
        </View>
      );
    }
    
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.footerText}>加载中...</Text>
        </View>
      );
    }
    
    return null;
  };
  
  // 渲染空状态
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>加载失败</Text>
          <Text style={styles.emptyHint}>请下拉刷新重试</Text>
        </View>
      );
    }
    
    if (ListEmptyComponent) {
      return ListEmptyComponent;
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无内容</Text>
      </View>
    );
  };
  
  return (
    <FlatList
      data={data}
      renderItem={({ item, index }) => renderItem({ item, index, onPress: onItemPress })}
      keyExtractor={(item, index) => item.id?.toString() || index.toString()}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={['#3b82f6']}
          tintColor="#3b82f6"
        />
      }
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={ListHeaderComponent}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
    />
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default OptimizedTabList;
