import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { showToast } from '../utils/toast';

import { scaleFont } from '../utils/responsive';
const MOCK_GROUPS = [
  {
    id: 1,
    name: 'Python学习交流群',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group1',
    memberCount: 128,
    lastMessage: '大家好，有人在吗？',
    lastMessageTime: '10:30',
    unreadCount: 3,
  },
  {
    id: 2,
    name: '前端开发讨论组',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group2',
    memberCount: 256,
    lastMessage: 'React 18 有什么新特性？',
    lastMessageTime: '昨天',
    unreadCount: 0,
  },
  {
    id: 3,
    name: '算法刷题小组',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=group3',
    memberCount: 89,
    lastMessage: '今天的每日一题做了吗？',
    lastMessageTime: '2天前',
    unreadCount: 15,
  },
];

export default function MyGroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setGroups(MOCK_GROUPS);
    } catch (error) {
      console.error('加载群聊列表失败:', error);
      showToast('加载失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleGroupPress = group => {
    navigation.navigate('GroupChat', {
      groupId: group.id,
      question: {
        title: group.name,
        author: group.name,
        memberCount: group.memberCount,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的群聊</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的群聊</Text>
        <TouchableOpacity onPress={() => showToast('创建群聊功能开发中', 'info')}>
          <Ionicons name="add-circle-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>还没有加入任何群聊</Text>
            <Text style={styles.emptyHint}>快去加入感兴趣的群聊吧</Text>
          </View>
        ) : (
          groups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupItem}
              onPress={() => handleGroupPress(group)}
              activeOpacity={0.7}
            >
              <View style={styles.groupAvatar}>
                <Avatar source={{ uri: group.avatar }} size={50} name={group.name} />
                {group.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {group.unreadCount > 99 ? '99+' : group.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <Text style={styles.groupTime}>{group.lastMessageTime}</Text>
                </View>

                <View style={styles.groupFooter}>
                  <Text style={styles.groupMessage} numberOfLines={1}>
                    {group.lastMessage}
                  </Text>
                  <View style={styles.groupMeta}>
                    <Ionicons name="people" size={12} color="#9ca3af" />
                    <Text style={styles.memberCount}>{group.memberCount}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
  },
  headerPlaceholder: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    marginTop: 8,
  },
  groupItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  groupAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadText: {
    color: '#fff',
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupName: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  groupTime: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupMessage: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginRight: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    marginLeft: 4,
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
});
