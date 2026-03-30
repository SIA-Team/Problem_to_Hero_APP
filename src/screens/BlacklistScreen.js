import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import Toast from '../components/Toast';
import blacklistApi from '../services/api/blacklistApi';
import { removeBlockedUser } from '../services/blacklistState';
import { invalidateBlacklistRelatedCaches } from '../utils/blacklistContent';
import { normalizeEntityId } from '../utils/jsonLongId';
import { showAppAlert } from '../utils/appAlert';

import { scaleFont } from '../utils/responsive';
const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || '';
};

const formatBlockedTime = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const pad = (num) => String(num).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const extractBlacklistPayload = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  if (value.userBaseInfo && typeof value.userBaseInfo === 'object') {
    return {
      ...value,
      ...value.userBaseInfo,
    };
  }

  if (value.userInfo && typeof value.userInfo === 'object') {
    return {
      ...value,
      ...value.userInfo,
    };
  }

  if (value.blockedUser && typeof value.blockedUser === 'object') {
    return {
      ...value,
      ...value.blockedUser,
    };
  }

  return value;
};

const normalizeBlacklistItem = (item, fallbackKey) => {
  const payload = extractBlacklistPayload(item);
  const blockedUserId = normalizeEntityId(
    payload?.blockedUserId ??
      payload?.blockedUid ??
      payload?.userId ??
      payload?.uid ??
      payload?.targetUserId ??
      payload?.displayUserId
  );
  const recordId = normalizeEntityId(
    payload?.recordId ??
      payload?.blacklistRecordId ??
      payload?.blacklistId ??
      payload?.blockedRecordId ??
      payload?.id
  );
  const displayName = normalizeText(
    payload?.nickName ??
      payload?.nickname ??
      payload?.userName ??
      payload?.userNickname ??
      payload?.username ??
      payload?.authorNickName ??
      payload?.name ??
      payload?.displayName
  );
  const avatar = normalizeText(
    payload?.avatar ??
      payload?.userAvatar ??
      payload?.authorAvatar ??
      payload?.avatarUrl ??
      payload?.headImg
  );

  return {
    ...payload,
    rowKey: recordId || blockedUserId || fallbackKey,
    blockedUserId,
    recordId,
    displayName: displayName || '用户 ID',
    avatar: avatar || null,
    blockedTime:
      payload?.createTime ??
      payload?.blockedTime ??
      payload?.blockTime ??
      payload?.createdAt ??
      payload?.create_at ??
      null,
    removeTime:
      payload?.removeTime ??
      payload?.removedTime ??
      payload?.unblockTime ??
      payload?.operateTime ??
      payload?.updateTime ??
      null,
  };
};

const normalizeBlacklistItems = (items) =>
  (Array.isArray(items) ? items : []).map((item, index) =>
    normalizeBlacklistItem(item, `blacklist-${index}`)
  );

export default function BlacklistScreen({ navigation }) {
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState(new Set());
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadBlacklist = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const data = await blacklistApi.getBlacklist();
      setBlacklist(normalizeBlacklistItems(data));
    } catch (error) {
      console.error('加载黑名单失败:', error);
      showToast('加载失败，请重试', 'error');

      if (!isRefresh) {
        setBlacklist([]);
      }
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBlacklist(true);
  }, []);

  const handleRemoveFromBlacklist = (item) => {
    const blockedUserId = item?.blockedUserId || '--';

    showAppAlert(
      '移除黑名单',
      `确定将用户 ID ${blockedUserId} 移出黑名单吗？移出后对方可以再次与你互动。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => removeFromBlacklist(item),
        },
      ]
    );
  };

  const removeFromBlacklist = async (item) => {
    const rowKey = item?.rowKey;

    try {
      setRemovingIds((prev) => new Set(prev).add(rowKey));

      const response = await blacklistApi.removeFromBlacklist(item?.blockedUserId);

      if (response?.code === 200) {
        removeBlockedUser(item?.blockedUserId);
        await invalidateBlacklistRelatedCaches();

        setBlacklist((prev) => prev.filter((user) => user?.rowKey !== rowKey));
        showToast(response?.msg || '已移出黑名单', 'success');
        return;
      }

      showToast(response?.msg || '移出黑名单失败，请重试', 'error');
    } catch (error) {
      console.error('移出黑名单失败:', error);
      showToast(error?.message || '操作失败，请重试', 'error');
    } finally {
      setRemovingIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(rowKey);
        return nextSet;
      });
    }
  };

  const renderItem = ({ item, index }) => {
    const isRemoving = removingIds.has(item?.rowKey);

    return (
      <Animated.View
        style={[
          styles.listItem,
          index === blacklist.length - 1 && styles.listItemLast,
        ]}
      >
        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userIdText}>{item?.blockedUserId || '--'}</Text>
            <Text style={styles.blockedTime}>
              拉黑时间: {formatBlockedTime(item?.blockedTime)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.removeBtn,
            isRemoving && styles.removeBtnDisabled,
          ]}
          onPress={() => handleRemoveFromBlacklist(item)}
          disabled={isRemoving}
          activeOpacity={0.7}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.removeBtnText}>移除</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="shield-checkmark-outline" size={80} color="#d1d5db" />
        </View>
        <Text style={styles.emptyTitle}>黑名单为空</Text>
        <Text style={styles.emptyDesc}>
          你还没有拉黑任何用户{'\n'}
          拉黑后的用户将无法再次与你互动
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>黑名单</Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && blacklist.length > 0 && (
        <View style={styles.statsBar}>
          <Ionicons name="people-outline" size={18} color="#6b7280" />
          <Text style={styles.statsText}>
            已拉黑 {blacklist.length} 位用户
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={blacklist}
          renderItem={renderItem}
          keyExtractor={(item) => String(item?.rowKey)}
          contentContainerStyle={[
            styles.listContent,
            blacklist.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ef4444"
              colors={['#ef4444']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 6,
  },
  statsText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemLast: {
    marginBottom: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  userIdText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#1f2937',
  },
  blockedTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 4,
  },
  removeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
    minWidth: 78,
    alignItems: 'center',
  },
  removeBtnDisabled: {
    opacity: 0.5,
  },
  removeBtnText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
});
