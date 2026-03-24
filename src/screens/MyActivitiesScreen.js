import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../utils/toast';

const MOCK_ACTIVITIES = [
  {
    id: 1,
    title: 'Python 7 天打卡挑战',
    organizer: '编程成长营',
    cover: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
    status: '进行中',
    participants: 128,
    reward: '$88',
    joinedAt: '今天加入',
  },
  {
    id: 2,
    title: '前端项目实战训练',
    organizer: '前端研究社',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    status: '进行中',
    participants: 86,
    reward: '$120',
    joinedAt: '昨天加入',
  },
  {
    id: 3,
    title: '算法刷题冲刺营',
    organizer: '算法共学组',
    cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    status: '已结束',
    participants: 203,
    reward: '$66',
    joinedAt: '3 天前加入',
  },
];

export default function MyActivitiesScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setActivities(MOCK_ACTIVITIES);
    } catch (error) {
      console.error('加载我的活动失败:', error);
      showToast('加载失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const handleOpenActivity = activity => {
    navigation.navigate('ActivityDetail', {
      activity: {
        id: activity.id,
        title: activity.title,
        organizerName: activity.organizer,
        image: activity.cover,
        participants: activity.participants,
        reward: activity.reward,
        status: activity.status === '进行中' ? 'active' : 'ended',
        joined: true,
      },
    });
  };

  const handleCreateActivity = () => {
    navigation.navigate('CreateActivity');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的活动</Text>
          <View style={styles.headerSpacer} />
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
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的活动</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateActivity} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createBtnText}>创建</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activities.length}</Text>
            <Text style={styles.summaryLabel}>已参加</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activities.filter(item => item.status === '进行中').length}</Text>
            <Text style={styles.summaryLabel}>进行中</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activities.filter(item => item.status === '已结束').length}</Text>
            <Text style={styles.summaryLabel}>已结束</Text>
          </View>
        </View>

        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>你还没有参加任何活动</Text>
            <Text style={styles.emptyHint}>去发现一些感兴趣的活动吧</Text>
          </View>
        ) : (
          activities.map(activity => (
            <TouchableOpacity
              key={activity.id}
              style={styles.card}
              onPress={() => handleOpenActivity(activity)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: activity.cover }} style={styles.cover} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  <View style={[styles.statusBadge, activity.status === '已结束' && styles.statusBadgeEnded]}>
                    <Text style={[styles.statusText, activity.status === '已结束' && styles.statusTextEnded]}>
                      {activity.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.organizerText}>{activity.organizer}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{activity.participants} 人</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{activity.reward}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{activity.joinedAt}</Text>
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
    backgroundColor: '#f7f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eceff3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 24,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  createBtnText: {
    marginLeft: 4,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    marginTop: 16,
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#9ca3af',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#eef2f7',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cover: {
    width: '100%',
    height: 146,
    backgroundColor: '#e5e7eb',
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeEnded: {
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  statusTextEnded: {
    color: '#6b7280',
  },
  organizerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    marginBottom: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#9ca3af',
  },
});
