import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import TranslateButton from '../components/TranslateButton';
import { useTranslation } from '../i18n/withTranslation';

// 关注的用户数据
const followedUsers = [{
  id: 1,
  name: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow1',
  title: '资深Python开发 · 10年经验',
  followers: '12.5万',
  questions: 156,
  answers: 892,
  isFollowed: true
}, {
  id: 2,
  name: '王医生',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow2',
  title: '三甲医院主治医师',
  followers: '8.3万',
  questions: 89,
  answers: 567,
  isFollowed: true,
  verified: true
}, {
  id: 3,
  name: '美食达人',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow3',
  title: '美食博主 · 探店达人',
  followers: '25万',
  questions: 234,
  answers: 1205,
  isFollowed: true
}, {
  id: 4,
  name: '程序员小明',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow4',
  title: '全栈开发工程师',
  followers: '5.6万',
  questions: 78,
  answers: 423,
  isFollowed: true
}, {
  id: 5,
  name: '设计师小李',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow5',
  title: 'UI/UX设计师',
  followers: '3.2万',
  questions: 45,
  answers: 189,
  isFollowed: true
}];

// 推荐用户数据
const recommendUsers = [{
  id: 101,
  name: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec1',
  title: '数据分析师 · 3年经验',
  followers: '2.1万',
  questions: 34,
  answers: 156,
  isFollowed: false
}, {
  id: 102,
  name: '前端大神',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec2',
  title: '前端架构师',
  followers: '18万',
  questions: 123,
  answers: 789,
  isFollowed: false,
  verified: true
}, {
  id: 103,
  name: '产品经理老张',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rec3',
  title: '产品总监 · 8年经验',
  followers: '6.8万',
  questions: 67,
  answers: 345,
  isFollowed: false
}];

// 关注用户的问题数据
const followedQuestions = [{
  id: 1,
  author: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow1',
  verified: true,
  time: '30分钟前',
  type: 'reward',
  reward: 50,
  answerTypes: ['public'],
  title: '如何在三个月内从零基础学会Python编程？有没有系统的学习路线推荐？',
  likes: 256,
  comments: 23,
  solvedPercent: 65
}, {
  id: 2,
  author: '王医生',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow2',
  verified: true,
  time: '1小时前',
  type: 'free',
  answerTypes: ['public'],
  title: '作为医生，如何平衡工作和生活？有没有同行分享一下经验？',
  likes: 89,
  comments: 12,
  solvedPercent: 25
}, {
  id: 3,
  author: '美食达人',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow3',
  time: '2小时前',
  type: 'free',
  answerTypes: ['public'],
  title: '有什么简单又好吃的家常菜推荐？最好是新手也能做的那种',
  likes: 368,
  comments: 45,
  solvedPercent: 92
}, {
  id: 4,
  author: '程序员小明',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow4',
  time: '3小时前',
  type: 'reward',
  reward: 100,
  answerTypes: ['public', 'targeted'],
  title: '35岁程序员如何规划职业发展？是继续技术深耕还是转管理？',
  likes: 1200,
  comments: 456,
  solvedPercent: 30
}];

// 关注的话题数据
const followedTopics = [{
  id: 1,
  name: '#Python学习',
  icon: 'code-slash',
  color: '#3b82f6',
  followers: '25.6万',
  questions: '12.3万',
  description: '分享Python学习经验和技巧'
}, {
  id: 2,
  name: '#家常菜谱',
  icon: 'restaurant',
  color: '#f97316',
  followers: '18.9万',
  questions: '8.6万',
  description: '美味家常菜做法分享'
}, {
  id: 3,
  name: '#职业发展',
  icon: 'briefcase',
  color: '#8b5cf6',
  followers: '32.1万',
  questions: '15.8万',
  description: '职场经验与职业规划'
}, {
  id: 4,
  name: '#健康养生',
  icon: 'fitness',
  color: '#22c55e',
  followers: '45.2万',
  questions: '21.3万',
  description: '健康生活方式分享'
}, {
  id: 5,
  name: '#数码科技',
  icon: 'phone-portrait',
  color: '#06b6d4',
  followers: '28.7万',
  questions: '13.5万',
  description: '数码产品评测与讨论'
}];
export default function FollowScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();

  // Tabs array using translation
  const tabs = React.useMemo(() => [t('follow.questions'), t('follow.users'), t('follow.topics')], [t]);
  const [activeTab, setActiveTab] = useState('');

  // Initialize activeTab with translated value
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('follow.questions'));
    }
  }, [t, activeTab]);
  const [likedItems, setLikedItems] = useState({});
  const [userFollowState, setUserFollowState] = useState({});
  const [topicFollowState, setTopicFollowState] = useState({});
  const [searchText, setSearchText] = useState('');

  // 翻译状态
  const [translatedContent, setTranslatedContent] = useState({});
  const toggleLike = id => {
    setLikedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const toggleFollowUser = userId => {
    setUserFollowState(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };
  const toggleFollowTopic = topicId => {
    setTopicFollowState(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };
  const formatNumber = num => num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;

  // 过滤用户
  const filteredFollowedUsers = followedUsers.filter(user => user.name.toLowerCase().includes(searchText.toLowerCase()));
  const filteredRecommendUsers = recommendUsers.filter(user => user.name.toLowerCase().includes(searchText.toLowerCase()));
  return <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('follow.title')}</Text>
        <View style={{
        width: 22
      }} />
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>)}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 问题列表 */}
        <View style={{
        display: activeTab === t('follow.questions') ? 'flex' : 'none'
      }}>
          {followedQuestions.map(item => <TouchableOpacity key={item.id} style={styles.questionCard} onPress={() => navigation.navigate('QuestionDetail', {
          id: item.id
        })}>
              <View style={styles.questionTitleWrapper}>
                <Text style={styles.questionTitle}>
                  {item.type === 'reward' && item.reward && <Text style={styles.rewardTagInline}> ${item.reward} </Text>}
                  {translatedContent[item.id]?.title || item.title}
                </Text>
                
                {/* 翻译按钮 */}
                <TranslateButton text={item.title} compact={false} onTranslated={(translatedText, isTranslated) => {
              setTranslatedContent(prev => ({
                ...prev,
                [item.id]: {
                  ...prev[item.id],
                  title: isTranslated ? translatedText : null
                }
              }));
            }} />
              </View>
              <View style={styles.questionHeaderRow}>
                <View style={styles.questionHeaderLeft}>
                  <Avatar uri={item.avatar} name={item.author} size={17} />
                  <Text style={styles.authorName}>{item.author}</Text>
                  {Boolean(item.verified) && <Ionicons name="checkmark-circle" size={10} color="#3b82f6" style={{
                marginLeft: 2
              }} />}
                  <Text style={styles.metaSeparator}>·</Text>
                  <Text style={styles.questionTime}>{item.time}</Text>
                </View>
              </View>
              <View style={styles.questionFooter}>
                <View style={styles.questionStats}>
                  <TouchableOpacity style={styles.statBtn} onPress={() => toggleLike(item.id)}>
                    <Ionicons name={likedItems[item.id] ? "thumbs-up" : "thumbs-up-outline"} size={16} color={likedItems[item.id] ? "#ef4444" : "#6b7280"} />
                    <Text style={[styles.statText, likedItems[item.id] && {
                  color: '#ef4444'
                }]}>{formatNumber(item.likes + (likedItems[item.id] ? 1 : 0))}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statBtn}>
                    <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                    <Text style={styles.statText}>{item.comments}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.answerBtn} onPress={() => navigation.navigate('QuestionDetail', {
              id: item.id,
              openAnswerModal: true
            })}>
                  <Ionicons name="create-outline" size={14} color="#fff" />
                  <Text style={styles.answerBtnText}>{t('follow.answer')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>)}
        </View>

        {/* 用户列表 */}
        <View style={{
        display: activeTab === t('follow.users') ? 'flex' : 'none'
      }}>
          {/* 搜索框 */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput style={styles.searchInput} placeholder={t('follow.searchUsers')} value={searchText} onChangeText={setSearchText} />
              {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>}
            </View>
          </View>

          {/* 已关注用户 */}
          <View style={styles.userSection}>
            <Text style={styles.sectionTitle}>{t('follow.followed')} ({filteredFollowedUsers.length})</Text>
            {filteredFollowedUsers.map(user => <TouchableOpacity key={user.id} style={styles.userCard}>
                <Avatar uri={user.avatar} name={user.name} size={48} />
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {Boolean(user.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                  </View>
                  <Text style={styles.userTitle}>{user.title}</Text>
                  <Text style={styles.userStats}>{user.followers} {t('follow.followers')} · {user.questions} {t('home.questions')} · {user.answers} {t('home.answers')}</Text>
                </View>
                <TouchableOpacity style={[styles.followBtn, userFollowState[user.id] === false && styles.followBtnInactive]} onPress={() => toggleFollowUser(user.id)}>
                  <Text style={[styles.followBtnText, userFollowState[user.id] === false && styles.followBtnTextInactive]}>
                    {userFollowState[user.id] === false ? t('follow.follow') : t('follow.following')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>)}
          </View>

          {/* 推荐用户 */}
          <View style={styles.userSection}>
            <Text style={styles.sectionTitle}>{t('follow.recommendFollow')}</Text>
            {filteredRecommendUsers.map(user => <TouchableOpacity key={user.id} style={styles.userCard}>
                <Avatar uri={user.avatar} name={user.name} size={48} />
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {Boolean(user.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                  </View>
                  <Text style={styles.userTitle}>{user.title}</Text>
                  <Text style={styles.userStats}>{user.followers} {t('follow.followers')} · {user.questions} {t('home.questions')} · {user.answers} {t('home.answers')}</Text>
                </View>
                <TouchableOpacity style={[styles.followBtn, userFollowState[user.id] && styles.followBtnActive]} onPress={() => toggleFollowUser(user.id)}>
                  <Text style={[styles.followBtnText, userFollowState[user.id] && styles.followBtnTextActive]}>
                    {userFollowState[user.id] ? t('follow.following') : t('follow.follow')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 话题列表 */}
        <View style={{
        display: activeTab === t('follow.topics') ? 'flex' : 'none'
      }}>
          <View style={styles.topicSection}>
            <Text style={styles.sectionTitle}>{t('follow.followedTopics')} ({followedTopics.length})</Text>
            {followedTopics.map(topic => <TouchableOpacity key={topic.id} style={styles.topicCard}>
                <View style={[styles.topicIcon, {
              backgroundColor: topic.color + '20'
            }]}>
                  <Ionicons name={topic.icon} size={24} color={topic.color} />
                </View>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicName}>{topic.name}</Text>
                  <Text style={styles.topicDesc}>{topic.description}</Text>
                  <Text style={styles.topicStats}>{topic.followers} {t('home.followers')} · {topic.questions} {t('home.questions')}</Text>
                </View>
                <TouchableOpacity style={[styles.followBtn, topicFollowState[topic.id] === false && styles.followBtnInactive]} onPress={() => toggleFollowTopic(topic.id)}>
                  <Text style={[styles.followBtnText, topicFollowState[topic.id] === false && styles.followBtnTextInactive]}>
                    {topicFollowState[topic.id] === false ? t('follow.follow') : t('follow.following')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>)}
          </View>
        </View>

        <View style={{
        height: 20
      }} />
      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative'
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280'
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 2,
    backgroundColor: '#ef4444',
    borderRadius: 1
  },
  content: {
    flex: 1
  },
  // 问题卡片样式
  questionCard: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  questionTitleWrapper: {
    marginBottom: 10
  },
  questionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 22
  },
  rewardTagInline: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#ef4444',
    fontWeight: '600',
    lineHeight: 22
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0
  },
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0
  },
  questionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  questionAuthorInfo: {
    flex: 1,
    marginLeft: 10
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  authorName: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 4
  },
  questionTime: {
    fontSize: 12,
    color: '#999999'
  },
  metaSeparator: {
    fontSize: 12,
    color: '#999999',
    marginHorizontal: 3
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  typeTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500'
  },
  // 新的悬赏容器样式
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rewardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  answerTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1
  },
  answerTypeText: {
    fontSize: 10,
    fontWeight: '500'
  },
  publicTag: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac'
  },
  targetedTag: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe'
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  questionStats: {
    flexDirection: 'row',
    gap: 16
  },
  statBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 12,
    color: '#6b7280'
  },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3
  },
  answerBtnText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500'
  },
  // 搜索框样式
  searchSection: {
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 8
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14
  },
  // 用户列表样式
  userSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  userInfo: {
    flex: 1,
    marginLeft: 12
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937'
  },
  userTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  userStats: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fef2f2'
  },
  followBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500'
  },
  followBtnInactive: {
    backgroundColor: '#f3f4f6'
  },
  followBtnTextInactive: {
    color: '#6b7280'
  },
  followBtnActive: {
    backgroundColor: '#fef2f2'
  },
  followBtnTextActive: {
    color: '#ef4444'
  },
  // 话题列表样式
  topicSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  topicInfo: {
    flex: 1,
    marginLeft: 12
  },
  topicName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937'
  },
  topicDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },
  topicStats: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4
  }
});