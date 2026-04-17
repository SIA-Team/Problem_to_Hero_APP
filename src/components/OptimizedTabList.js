import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View, ActivityIndicator, StyleSheet } from 'react-native';
import { FlatList } from 'react-native';
import { showToast } from '../utils/toast';

const tabDataCache = new Map();

const getCacheKey = (tabKey, pageSize) => `${String(tabKey ?? 'default')}::${Number(pageSize) || 20}`;

const getCachedEntry = (cacheKey, cacheTimeout) => {
  const cachedEntry = tabDataCache.get(cacheKey);
  if (!cachedEntry) {
    return null;
  }

  if (Date.now() - cachedEntry.timestamp > cacheTimeout) {
    tabDataCache.delete(cacheKey);
    return null;
  }

  return cachedEntry;
};

export default function OptimizedTabList({
  tabKey,
  fetchFunction,
  isActive,
  renderItem,
  onItemPress,
  pageSize = 20,
  cacheTimeout = 5 * 60 * 1000,
}) {
  const cacheKey = useMemo(() => getCacheKey(tabKey, pageSize), [pageSize, tabKey]);
  const initialCachedEntry = useMemo(() => getCachedEntry(cacheKey, cacheTimeout), [cacheKey, cacheTimeout]);
  const [items, setItems] = useState(() => initialCachedEntry?.items || []);
  const [page, setPage] = useState(() => initialCachedEntry?.nextPage || 1);
  const [hasMore, setHasMore] = useState(() => initialCachedEntry?.hasMore ?? true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(() => !initialCachedEntry);
  const [loadingMore, setLoadingMore] = useState(false);

  const persistCache = useCallback((nextItems, nextPage, nextHasMore) => {
    tabDataCache.set(cacheKey, {
      items: nextItems,
      nextPage,
      hasMore: nextHasMore,
      timestamp: Date.now(),
    });
  }, [cacheKey]);

  const loadPage = useCallback(async ({ targetPage = 1, replace = false }) => {
    if (typeof fetchFunction !== 'function') {
      return;
    }

    if (replace) {
      setRefreshing(true);
    } else if (targetPage === 1) {
      setLoadingInitial(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const nextItemsRaw = await fetchFunction({
        page: targetPage,
        pageSize,
      });
      const nextPageItems = Array.isArray(nextItemsRaw) ? nextItemsRaw : [];
      const mergedItems = replace || targetPage === 1 ? nextPageItems : [...items, ...nextPageItems];
      const nextHasMore = nextPageItems.length >= pageSize;
      const nextPage = nextHasMore ? targetPage + 1 : targetPage;

      setItems(mergedItems);
      setPage(nextPage);
      setHasMore(nextHasMore);
      persistCache(mergedItems, nextPage, nextHasMore);
    } catch (error) {
      console.warn('OptimizedTabList load failed:', error);
      showToast(error?.message || '加载失败，请稍后重试', 'error');
    } finally {
      setRefreshing(false);
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [fetchFunction, items, pageSize, persistCache]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const cachedEntry = getCachedEntry(cacheKey, cacheTimeout);
    if (cachedEntry) {
      setItems(cachedEntry.items || []);
      setPage(cachedEntry.nextPage || 1);
      setHasMore(cachedEntry.hasMore ?? true);
      setLoadingInitial(false);
      return;
    }

    loadPage({ targetPage: 1, replace: true });
  }, [cacheKey, cacheTimeout, isActive, loadPage]);

  const handleRefresh = useCallback(() => {
    loadPage({ targetPage: 1, replace: true });
  }, [loadPage]);

  const handleLoadMore = useCallback(() => {
    if (!isActive || loadingInitial || loadingMore || refreshing || !hasMore) {
      return;
    }

    loadPage({ targetPage: page, replace: false });
  }, [hasMore, isActive, loadPage, loadingInitial, loadingMore, page, refreshing]);

  const keyExtractor = useCallback((item, index) => {
    const candidateId = item?.id ?? item?.questionId ?? `${tabKey}-${index}`;
    return String(candidateId);
  }, [tabKey]);

  const renderWrappedItem = useCallback(({ item, index }) => {
    if (typeof renderItem === 'function') {
      return renderItem({
        item,
        index,
        onPress: onItemPress,
      });
    }

    return null;
  }, [onItemPress, renderItem]);

  if (!isActive) {
    return null;
  }

  if (loadingInitial && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderWrappedItem}
      keyExtractor={keyExtractor}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#ef4444']}
          tintColor="#ef4444"
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#ef4444" />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
