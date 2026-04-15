import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import RelationUserList from '../components/RelationUserList';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';

const recommendUsers = [
  {
    id: 101,
    name: '数据分析师小陈',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec1',
    title: '数据分析师 · 3年经验',
    followers: '2.1万',
    questions: 34,
    answers: 156,
  },
  {
    id: 102,
    name: '前端大咖',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec2',
    title: '前端架构师',
    followers: '18万',
    questions: 123,
    answers: 789,
    verified: true,
  },
  {
    id: 103,
    name: '产品经理老张',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec3',
    title: '产品总监 · 8年经验',
    followers: '6.8万',
    questions: 67,
    answers: 345,
  },
];

const followedTopics = [
  {
    id: 1,
    name: '#Python学习',
    icon: 'code-slash',
    color: '#3b82f6',
    followers: '25.6万',
    questions: '12.3万',
    description: '分享 Python 学习经验和实战技巧',
  },
  {
    id: 2,
    name: '#家常菜谱',
    icon: 'restaurant',
    color: '#f97316',
    followers: '18.9万',
    questions: '8.6万',
    description: '美味家常菜做法分享',
  },
  {
    id: 3,
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
    .join(' · ');

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
  const [topicFollowState, setTopicFollowState] = useState({});

  const isUsersTabActive = activeTab === 'users';

  const renderRecommendSection = ({ searchText }) => {
    if (searchText.trim()) {
      return null;
    }

    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{t('follow.recommendFollow')}</Text>
        {recommendUsers.map(user => (
          <TouchableOpacity key={user.id} style={styles.userCard} activeOpacity={0.8}>
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
            <TouchableOpacity
              style={[styles.followBtn, userFollowState[user.id] && styles.followBtnActive]}
              onPress={() =>
                setUserFollowState(prev => ({
                  ...prev,
                  [user.id]: !prev[user.id],
                }))
              }
            >
              <Text
                style={[
                  styles.followBtnText,
                  userFollowState[user.id] && styles.followBtnTextActive,
                ]}
              >
                {userFollowState[user.id] ? t('follow.following') : t('follow.follow')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
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
          showSearch
          listStyle={styles.flexList}
          ListFooterExtra={renderRecommendSection}
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>
              {t('follow.followedTopics')} ({followedTopics.length})
            </Text>
            {followedTopics.map(topic => (
              <TouchableOpacity key={topic.id} style={styles.topicCard} activeOpacity={0.8}>
                <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
                  <Ionicons name={topic.icon} size={24} color={topic.color} />
                </View>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicName}>{topic.name}</Text>
                  <Text style={styles.topicDesc}>{topic.description}</Text>
                  <Text style={styles.topicStats}>
                    {topic.followers} {t('home.followers')} · {topic.questions}{' '}
                    {t('home.questions')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    topicFollowState[topic.id] === false && styles.followBtnInactive,
                  ]}
                  onPress={() =>
                    setTopicFollowState(prev => ({
                      ...prev,
                      [topic.id]: !prev[topic.id],
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.followBtnText,
                      topicFollowState[topic.id] === false && styles.followBtnTextInactive,
                    ]}
                  >
                    {topicFollowState[topic.id] === false
                      ? t('follow.follow')
                      : t('follow.following')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 4,
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
  followBtn: {
    minWidth: 74,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: '#fee2e2',
  },
  followBtnInactive: {
    backgroundColor: '#fee2e2',
  },
  followBtnText: {
    fontSize: scaleFont(13),
    color: '#fff',
    fontWeight: '600',
  },
  followBtnTextActive: {
    color: '#ef4444',
  },
  followBtnTextInactive: {
    color: '#ef4444',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  topicName: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 4,
  },
  topicStats: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  bottomSpacer: {
    height: 20,
  },
});
