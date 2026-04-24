import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import RelationUserList from '../components/RelationUserList';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';
import { navigateToPublicProfile } from '../utils/publicProfileNavigation';
import userApi from '../services/api/userApi';
import { refreshMyFollowingCount } from '../services/myFollowingCountState';
import { showToast } from '../utils/toast';

const RECOMMEND_USERS = [
  {
    id: '101',
    userId: '101',
    name: '数据分析师小陈',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec1',
    title: '数据分析师 · 3年经验',
    followers: '2.1万',
    questions: 34,
    answers: 156,
  },
  {
    id: '102',
    userId: '102',
    name: '前端架构师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec2',
    title: '前端架构师',
    followers: '18万',
    questions: 123,
    answers: 789,
    verified: true,
  },
  {
    id: '103',
    userId: '103',
    name: '产品经理老周',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec3',
    title: '产品总监 · 8年经验',
    followers: '6.8万',
    questions: 67,
    answers: 345,
  },
];

const INITIAL_FOLLOWED_TOPICS = [
  {
    id: '1',
    name: '#Python学习',
    icon: 'code-slash',
    color: '#3b82f6',
    followers: '25.6万',
    questions: '12.3万',
    description: '分享 Python 学习经验和实战技巧',
  },
  {
    id: '2',
    name: '#家常菜谱',
    icon: 'restaurant',
    color: '#f97316',
    followers: '18.9万',
    questions: '8.6万',
    description: '美味家常菜做法分享',
  },
  {
    id: '3',
    name: '#职业发展',
    icon: 'briefcase',
    color: '#8b5cf6',
    followers: '32.1万',
    questions: '15.8万',
    description: '职场经验与职业规划交流',
  },
];

const buildRecommendStats = (user, t) =>
  [
    user.followers ? `${user.followers} ${t('follow.followers')}` : null,
    `${user.questions} ${t('home.questions')}`,
    `${user.answers} ${t('home.answers')}`,
  ]
    .filter(Boolean)
    .join(' 路 ');

export default function FollowScreen({ navigation }) {
  const { t } = useTranslation();
  const tabs = useMemo(
    () => [
      { key: 'users', label: t('follow.users') },
      { key: 'topics', label: t('follow.topics') },
    ],
    [t]
  );

  const [activeTab, setActiveTab] = useState('users');
  const [userFollowState, setUserFollowState] = useState({});
  const [followedTopics, setFollowedTopics] = useState(INITIAL_FOLLOWED_TOPICS);
  const [injectedFollowingUsers, setInjectedFollowingUsers] = useState([]);
  const [followSubmittingMap, setFollowSubmittingMap] = useState({});

  const isUsersTabActive = activeTab === 'users';

  const isSuccessResponse = response => {
    const code = Number(response?.code ?? response?.data?.code);
    return code === 200 || code === 0;
  };

  const buildInjectedFollowUser = user => ({
    userId: user.userId ?? user.id,
    id: user.userId ?? user.id,
    nickName: user.name,
    avatar: user.avatar,
    profession: user.title,
    verified: user.verified ? 1 : 0,
    followersCount: user.followers,
    questionCount: user.questions,
    answerCount: user.answers,
  });

  const applyRecommendFollowState = (user, nextFollowing) => {
    const userId = String(user?.userId ?? user?.id ?? '').trim();
    if (!userId) {
      return;
    }

    setUserFollowState(prev => ({
      ...prev,
      [userId]: nextFollowing,
    }));

    setInjectedFollowingUsers(prev => {
      if (!nextFollowing) {
        return prev.filter(item => String(item?.userId ?? item?.id) !== userId);
      }

      const nextUser = buildInjectedFollowUser(user);
      const exists = prev.some(item => String(item?.userId ?? item?.id) === userId);
      return exists ? prev : [nextUser, ...prev];
    });
  };

  const handleUserCardPress = user => {
    navigateToPublicProfile(navigation, user);
  };

  const handleRecommendFollowToggle = async user => {
    const userId = String(user?.userId ?? user?.id ?? '').trim();
    if (!userId || followSubmittingMap[userId]) {
      return;
    }

    const currentlyFollowing = Boolean(userFollowState[userId]);
    const nextFollowing = !currentlyFollowing;
    const fallbackErrorMessage = currentlyFollowing
      ? '取消关注失败，请稍后重试'
      : '关注失败，请稍后重试';
    const fallbackSuccessMessage = currentlyFollowing ? '已取消关注' : '已关注';

    setFollowSubmittingMap(prev => ({
      ...prev,
      [userId]: true,
    }));
    applyRecommendFollowState(user, nextFollowing);

    try {
      const response = currentlyFollowing
        ? await userApi.unfollowUser(userId)
        : await userApi.followUser(userId);

      if (!isSuccessResponse(response)) {
        throw new Error(response?.msg || fallbackErrorMessage);
      }

      refreshMyFollowingCount().catch(error => {
        console.error('Refresh following count after recommend follow action failed:', error);
      });

      showToast(response?.msg || fallbackSuccessMessage, 'success');
      return;
    } catch (error) {
      applyRecommendFollowState(user, currentlyFollowing);
      showToast(error?.message || fallbackErrorMessage, 'error');
      return;
    } finally {
      setFollowSubmittingMap(prev => ({
        ...prev,
        [userId]: false,
      }));
    }
  };

  const handleTopicPress = topic => {
    navigation.navigate('TopicDetail', {
      topicId: topic.id,
      topic,
    });
  };

  const handleTopicUnfollow = topicId => {
    setFollowedTopics(prev => prev.filter(topic => String(topic.id) !== String(topicId)));
  };

  const renderRecommendSection = ({ searchText }) => {
    if (searchText.trim()) {
      return null;
    }

    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{t('follow.recommendFollow')}</Text>
        {RECOMMEND_USERS.map(user => {
          const recommendUserId = String(user.userId ?? user.id);
          const isFollowing = Boolean(userFollowState[recommendUserId]);
          const isSubmitting = Boolean(followSubmittingMap[recommendUserId]);

          return (
          <View key={user.id} style={styles.userCard}>
            <TouchableOpacity
              style={styles.userCardMain}
              activeOpacity={0.8}
              onPress={() => handleUserCardPress(user)}
            >
              <Avatar uri={user.avatar} name={user.name} size={48} />
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  {Boolean(user.verified) ? (
                    <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                  ) : null}
                </View>
                <Text style={styles.userTitle}>{user.title}</Text>
                <Text style={styles.userStats}>{buildRecommendStats(user, t)}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={() => handleRecommendFollowToggle(user)}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing && styles.followBtnTextActive,
                ]}
              >
                {isFollowing ? t('follow.following') : t('follow.follow')}
              </Text>
            </TouchableOpacity>
          </View>
          );
        })}
      </View>
    );
  };

  const renderTopicsTab = () => {
    if (followedTopics.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetags-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>{t('follow.topicsEmptyTitle')}</Text>
          <Text style={styles.emptyHint}>{t('follow.topicsEmptyHint')}</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>
            {t('follow.followedTopics')} ({followedTopics.length})
          </Text>
          {followedTopics.map(topic => (
            <View key={topic.id} style={styles.topicCard}>
              <TouchableOpacity
                style={styles.topicMain}
                activeOpacity={0.82}
                onPress={() => handleTopicPress(topic)}
              >
                <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
                  <Ionicons name={topic.icon} size={24} color={topic.color} />
                </View>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicName}>{topic.name}</Text>
                  <Text style={styles.topicDesc}>{topic.description}</Text>
                  <Text style={styles.topicStats}>
                    {topic.followers} {t('home.followers')} 路 {topic.questions} {t('home.questions')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.followBtn, styles.followBtnActive]}
                onPress={() => handleTopicUnfollow(topic.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.followBtnText, styles.followBtnTextActive]}>
                  {t('follow.following')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('follow.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {isUsersTabActive ? (
        <RelationUserList
          navigation={navigation}
          relationType="following"
          isOwnList
          injectedUsers={injectedFollowingUsers}
          showSearch
          listStyle={styles.flexList}
          ListFooterExtra={renderRecommendSection}
        />
      ) : (
        renderTopicsTab()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerPlaceholder: {
    width: 22,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1,
  },
  flexList: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  sectionBlock: {
    marginTop: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  userName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
  },
  userTitle: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 4,
  },
  userStats: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topicMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topicName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
  },
  topicDesc: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginTop: 2,
  },
  topicStats: {
    fontSize: scaleFont(11),
    color: '#9ca3af',
    marginTop: 4,
  },
  followBtn: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: '#fef2f2',
  },
  followBtnText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500',
  },
  followBtnTextActive: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
    color: '#9ca3af',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
