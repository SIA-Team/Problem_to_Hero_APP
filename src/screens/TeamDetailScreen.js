import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
const initialMessages = [{
  id: 1,
  author: '张三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
  content: '大家好，欢迎加入Python学习团队！',
  time: '2小时前',
  likes: 15,
  dislikes: 0,
  shares: 3,
  bookmarks: 8
}, {
  id: 2,
  author: '李四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
  content: '请问有人知道装饰器怎么用吗？',
  time: '1小时前',
  likes: 8,
  dislikes: 0,
  shares: 2,
  bookmarks: 5
}, {
  id: 3,
  author: '王五',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
  content: '我可以分享一下装饰器的用法，等会发个教程',
  time: '30分钟前',
  likes: 23,
  dislikes: 0,
  shares: 6,
  bookmarks: 12
}];

// 团队公告数据
const announcements = [{
  id: 1,
  title: '本周学习主题：Python装饰器',
  content: '欢迎大家加入团队！本周我们将重点学习Python装饰器的使用方法和应用场景。',
  author: '张三',
  time: '2天前',
  isPinned: true
}, {
  id: 2,
  title: '团队学习计划',
  content: '每周三晚上8点进行线上讨论，欢迎大家积极参与。',
  author: '张三',
  time: '5天前',
  isPinned: false
}, {
  id: 3,
  title: '资源分享',
  content: '推荐大家看一下廖雪峰的Python教程，非常适合入门学习。',
  author: '李四',
  time: '1周前',
  isPinned: false
}];

// 团队成员数据
const teamMembers = [{
  id: 1,
  name: '张三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member1',
  role: '队长'
}, {
  id: 2,
  name: '李四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member2',
  role: '成员'
}, {
  id: 3,
  name: '王五',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member3',
  role: '成员'
}, {
  id: 4,
  name: '赵六',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member4',
  role: '成员'
}, {
  id: 5,
  name: '孙七',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member5',
  role: '成员'
}, {
  id: 6,
  name: '周八',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member6',
  role: '成员'
}, {
  id: 7,
  name: '吴九',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member7',
  role: '成员'
}, {
  id: 8,
  name: '郑十',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member8',
  role: '成员'
}, {
  id: 9,
  name: '钱十一',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member9',
  role: '成员'
}, {
  id: 10,
  name: '陈十二',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member10',
  role: '成员'
}, {
  id: 11,
  name: '林十三',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member11',
  role: '成员'
}, {
  id: 12,
  name: '黄十四',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member12',
  role: '成员'
}];

// 根据是否是管理员显示不同的tabs
const getTabsForRole = (isAdmin, t) => {
  if (isAdmin) {
    return [t('screens.teamDetail.tabs.discussion'), t('screens.teamDetail.tabs.announcement'), t('screens.teamDetail.tabs.approval')];
  }
  return [t('screens.teamDetail.tabs.discussion'), t('screens.teamDetail.tabs.announcement')];
};
export default function TeamDetailScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const team = route?.params?.team || {
    id: 1,
    name: 'Python学习互助团队',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=team1',
    role: '队长',
    members: 12,
    questions: 45,
    description: '专注Python学习，互帮互助，共同进步',
    createdAt: '2025-12-15',
    isActive: true,
    creatorId: 1,
    // 创建者ID
    currentUserId: 1,
    // 当前用户ID（模拟）
    isAdmin: true // 是否是管理员（队长或管理员）
  };

  // 限制访问模式：未加入的团队只能查看成员信息
  const restrictedView = route?.params?.restrictedView || false;
  const routeIsJoined = route?.params?.isJoined;
  const routeIsPending = route?.params?.isPending;
  const [activeTab, setActiveTab] = useState('');

  // Initialize activeTab with translated value
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(t('screens.teamDetail.tabs.discussion'));
    }
  }, [t, activeTab]);
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [isJoined, setIsJoined] = useState(routeIsJoined !== undefined ? routeIsJoined : team.role === '队长' || team.role === '成员');
  const [isPending, setIsPending] = useState(routeIsPending || false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showPublishAnnouncementModal, setShowPublishAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // 邀请功能相关状态
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTab, setInviteTab] = useState('platform'); // platform, twitter, facebook
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchText, setSearchText] = useState('');

  // 申请管理员相关状态
  const [showApplyAdminModal, setShowApplyAdminModal] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [hasApplied, setHasApplied] = useState(false);

  // 解散团队弹窗
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [dismissConfirmText, setDismissConfirmText] = useState('');

  // 审批消息数据（管理员可见）
  const [joinRequests, setJoinRequests] = useState([{
    id: 1,
    user: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    reason: '我对Python很感兴趣，希望能加入团队一起学习',
    time: '2小时前',
    type: 'join',
    status: 'pending'
  }, {
    id: 2,
    user: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    reason: '想和大家一起交流学习经验',
    time: '5小时前',
    type: 'join',
    status: 'pending'
  }]);
  const [adminRequests, setAdminRequests] = useState([{
    id: 3,
    user: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    reason: '我有3年Python开发经验，可以帮助团队成员解决技术问题，组织学习活动',
    time: '1天前',
    type: 'admin',
    status: 'pending'
  }]);
  const tabs = getTabsForRole(team.isAdmin, t);

  // 可邀请的用户列表
  const platformUsers = [{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    title: 'Python开发者',
    verified: true
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    title: 'Web工程师',
    verified: false
  }, {
    id: 3,
    name: '刘强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    title: '全栈开发',
    verified: true
  }, {
    id: 4,
    name: '陈静',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4',
    title: '前端专家',
    verified: true
  }, {
    id: 5,
    name: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5',
    title: '后端工程师',
    verified: false
  }];
  const twitterUsers = [{
    id: 't1',
    name: '@pythondev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter1',
    followers: '10K',
    verified: true
  }, {
    id: 't2',
    name: '@webmaster',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter2',
    followers: '5K',
    verified: false
  }, {
    id: 't3',
    name: '@coder_life',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=twitter3',
    followers: '8K',
    verified: true
  }];
  const facebookUsers = [{
    id: 'f1',
    name: 'Python Learning Group',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb1',
    members: '2K',
    verified: true
  }, {
    id: 'f2',
    name: 'Web Dev Community',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb2',
    members: '1.5K',
    verified: false
  }, {
    id: 'f3',
    name: 'Coding Together',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb3',
    members: '3K',
    verified: true
  }];

  // 已加入团队时只显示部分成员
  const maxVisibleMembers = 10;
  const visibleMembers = teamMembers.slice(0, maxVisibleMembers);
  const hasMoreMembers = teamMembers.length > maxVisibleMembers;
  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMessage = {
      id: Date.now(),
      author: '我',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      content: inputText,
      time: t('screens.teamDetail.chat.justNow'),
      likes: 0,
      dislikes: 0,
      shares: 0,
      bookmarks: 0
    };
    setMessages([newMessage, ...messages]);
    setInputText('');
  };

  // 邀请用户处理
  const handleToggleUser = user => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  const handleSendInvite = () => {
    if (selectedUsers.length === 0) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.invite.selectUser'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.invite.sent').replace('{count}', selectedUsers.length));
    setShowInviteModal(false);
    setSelectedUsers([]);
    setSearchText('');
  };

  // 申请管理员处理
  const handleApplyAdmin = () => {
    if (!applyReason.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.applyAdmin.fillReason'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.applicationSubmitted'));
    setShowApplyAdminModal(false);
    setHasApplied(true);
    setApplyReason('');
  };

  // 审批加入团队申请
  const handleApproveJoin = (requestId, approve) => {
    const request = joinRequests.find(r => r.id === requestId);
    if (approve) {
      showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.joinApproved').replace('{user}', request.user));
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
    } else {
      showAppAlert(t('screens.teamDetail.alerts.rejected'), t('screens.teamDetail.alerts.joinRejected').replace('{user}', request.user));
      setJoinRequests(joinRequests.filter(r => r.id !== requestId));
    }
  };

  // 审批管理员申请
  const handleApproveAdmin = (requestId, approve) => {
    const request = adminRequests.find(r => r.id === requestId);
    if (approve) {
      showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.adminApproved').replace('{user}', request.user));
      setAdminRequests(adminRequests.filter(r => r.id !== requestId));
    } else {
      showAppAlert(t('screens.teamDetail.alerts.rejected'), t('screens.teamDetail.alerts.adminRejected').replace('{user}', request.user));
      setAdminRequests(adminRequests.filter(r => r.id !== requestId));
    }
  };

  // 获取当前标签页的用户列表
  const getCurrentUserList = () => {
    let users = [];
    switch (inviteTab) {
      case 'platform':
        users = platformUsers;
        break;
      case 'twitter':
        users = twitterUsers;
        break;
      case 'facebook':
        users = facebookUsers;
        break;
    }
    if (searchText.trim()) {
      return users.filter(u => u.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    return users;
  };
  const handleExitTeam = () => {
    showAppAlert(t('screens.teamDetail.exit.title'), t('screens.teamDetail.exit.message'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('screens.teamDetail.exit.confirmButton'),
      style: 'destructive',
      onPress: () => {
        showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.teamExited'));
        navigation.goBack();
      }
    }]);
  };
  const handleDismissTeam = () => {
    setShowDismissModal(true);
  };
  const handleConfirmDismiss = () => {
    if (dismissConfirmText !== team.name) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.dismiss.incorrectName'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.teamDismissed'));
    setShowDismissModal(false);
    setDismissConfirmText('');
    navigation.goBack();
  };
  const handleJoinTeam = () => {
    showAppAlert(t('screens.teamDetail.join.applyTitle'), t('screens.teamDetail.join.applyMessage'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => {
        setIsPending(true);
        setShowPendingModal(true);
      }
    }]);
  };
  const openReplyModal = msg => {
    setReplyTarget(msg);
    setReplyText('');
    setShowReplyModal(true);
  };
  const handleReply = () => {
    if (!replyText.trim()) return;
    const newMessage = {
      id: Date.now(),
      author: '我',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      content: `回复 @${replyTarget.author}：${replyText}`,
      time: t('screens.teamDetail.chat.justNow'),
      likes: 0,
      dislikes: 0,
      shares: 0,
      bookmarks: 0
    };
    setMessages([newMessage, ...messages]);
    setReplyText('');
    setShowReplyModal(false);
    setReplyTarget(null);
  };
  const handleReport = msg => {
    showAppAlert(t('screens.teamDetail.report.title'), t('screens.teamDetail.report.message'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.report.submitted'))
    }]);
  };
  const handlePublishAnnouncement = () => {
    if (!announcementTitle.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.alerts.enterTitle'));
      return;
    }
    if (!announcementContent.trim()) {
      showAppAlert(t('screens.teamDetail.alerts.hint'), t('screens.teamDetail.alerts.enterContent'));
      return;
    }
    showAppAlert(t('screens.teamDetail.alerts.success'), t('screens.teamDetail.alerts.announcementPublished'));
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setIsPinned(false);
    setShowPublishAnnouncementModal(false);
  };
  return <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{restrictedView ? t('screens.teamDetail.teamMembers') : t('screens.teamDetail.title')}</Text>
        </View>
        {!restrictedView && <View style={styles.headerActions}>
            {/* 管理员显示：邀请、发起活动、发布公告 */}
            {Boolean(team.isAdmin) && <>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('InviteTeamMember', {
            teamName: team.name
          })}>
                  <Ionicons name="person-add" size={22} color="#22c55e" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => {
            navigation.navigate('Main', {
              screen: '活动',
              params: {
                createMode: true,
                teamId: team.id,
                teamName: team.name,
                fromTeamDetail: true
              }
            });
          }}>
                  <Ionicons name="calendar" size={22} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPublishAnnouncementModal(true)}>
                  <Ionicons name="megaphone" size={22} color="#f59e0b" />
                </TouchableOpacity>
              </>}
          </View>}
        {Boolean(restrictedView) && <View style={{
        width: 24
      }} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 限制访问提示 */}
        {Boolean(restrictedView) && <View style={styles.restrictedNotice}>
            <Ionicons name="lock-closed" size={20} color="#f59e0b" />
            <Text style={styles.restrictedNoticeText}>{t('screens.teamDetail.restrictedNotice')}</Text>
          </View>}

        {/* 团队信息卡片 - 限制访问模式下不显示 */}
        {!restrictedView && <View style={styles.teamInfoCard}>
            <View style={styles.teamTitleRow}>
              <Text style={styles.teamName}>{team.name}</Text>
              {/* 管理员：显示解散团队按钮 */}
              {Boolean(team.isAdmin) && <TouchableOpacity style={styles.compactDismissBtn} onPress={handleDismissTeam}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  <Text style={styles.compactDismissBtnText}>{t('screens.teamDetail.actions.dismiss')}</Text>
                </TouchableOpacity>}
              {/* 普通成员：显示三个操作按钮 */}
              {!team.isAdmin && team.currentUserId !== team.creatorId && <View style={styles.compactActionsRow}>
                  <TouchableOpacity style={styles.compactActionBtn} onPress={() => {
              navigation.navigate('Main', {
                screen: '活动',
                params: {
                  createMode: true,
                  teamId: team.id,
                  teamName: team.name,
                  fromTeamDetail: true
                }
              });
            }}>
                    <Ionicons name="calendar" size={14} color="#3b82f6" />
                    <Text style={styles.compactActionBtnText}>{t('screens.teamDetail.actions.activity')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compactActionBtn, styles.compactActionBtnPurple, hasApplied && styles.compactActionBtnDisabled]} onPress={() => !hasApplied && setShowApplyAdminModal(true)} disabled={hasApplied}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={hasApplied ? '#9ca3af' : '#8b5cf6'} />
                    <Text style={[styles.compactActionBtnText, styles.compactActionBtnTextPurple, hasApplied && styles.compactActionBtnTextDisabled]}>
                      {hasApplied ? t('screens.teamDetail.actions.applied') : t('screens.teamDetail.actions.admin')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.compactActionBtn, styles.compactActionBtnRed]} onPress={handleExitTeam}>
                    <Ionicons name="exit-outline" size={14} color="#ef4444" />
                    <Text style={[styles.compactActionBtnText, styles.compactActionBtnTextRed]}>{t('screens.teamDetail.actions.exit')}</Text>
                  </TouchableOpacity>
                </View>}
            </View>
            <Text style={styles.teamDesc} numberOfLines={2}>{team.description}</Text>
            <View style={styles.teamStats}>
              <View style={styles.teamStatItem}>
                <Ionicons name="people" size={14} color="#9ca3af" />
                <Text style={styles.teamStatText}>{team.members} {t('screens.teamDetail.stats.members')}</Text>
              </View>
              <View style={styles.teamStatItem}>
                <Ionicons name="chatbubbles" size={14} color="#9ca3af" />
                <Text style={styles.teamStatText}>{team.questions} {t('screens.teamDetail.stats.questions')}</Text>
              </View>
            </View>
          </View>}

        {/* 团队成员区域 - 根据是否加入显示不同样式 */}
        <View style={styles.teamMembersSection}>
          <View style={styles.membersSectionHeader}>
            <Text style={styles.teamMembersTitle}>{t('screens.teamDetail.teamMembers')} ({teamMembers.length})</Text>
            {Boolean(!restrictedView && hasMoreMembers) && <TouchableOpacity onPress={() => setShowMembersModal(true)}>
                <Text style={styles.viewAllText}>{t('screens.teamDetail.actions.viewAll')}</Text>
              </TouchableOpacity>}
          </View>
          
          {/* 限制访问模式：网格显示全部成员 */}
          {restrictedView ? <View style={styles.teamMembersGrid}>
              {teamMembers.map(member => <View key={member.id} style={styles.teamMemberGridItem}>
                  <View style={styles.teamMemberAvatarWrapper}>
                    <Avatar uri={member.avatar} name={member.name} size={56} />
                    {member.role === '队长' && <View style={styles.teamLeaderBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>}
                  </View>
                  <Text style={styles.teamMemberName} numberOfLines={1}>{member.name}</Text>
                  {member.role === '队长' && <Text style={styles.teamMemberRole}>队长</Text>}
                </View>)}
            </View> : (/* 已加入模式：横向滚动显示部分成员 */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamMembersScroll}>
              {visibleMembers.map(member => <View key={member.id} style={styles.teamMemberItem}>
                  <View style={styles.teamMemberAvatarWrapper}>
                    <Avatar uri={member.avatar} name={member.name} size={56} />
                    {member.role === '队长' && <View style={styles.teamLeaderBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                      </View>}
                  </View>
                  <Text style={styles.teamMemberName} numberOfLines={1}>{member.name}</Text>
                  {member.role === '队长' && <Text style={styles.teamMemberRole}>队长</Text>}
                </View>)}
            </ScrollView>)}
        </View>

        {/* Tab标签和内容区域 - 限制访问模式下不显示 */}
        {!restrictedView && <>
            {/* Tab标签 */}
            <View style={styles.tabsSection}>
              <View style={styles.tabs}>
                {tabs.map(tab => <TouchableOpacity key={tab} style={styles.tabItem} onPress={() => setActiveTab(tab)}>
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    {activeTab === tab && <View style={styles.tabIndicator} />}
                    {/* 审批消息显示未读数量 */}
                    {tab === '审批消息' && joinRequests.length + adminRequests.length > 0 && <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{joinRequests.length + adminRequests.length}</Text>
                      </View>}
                  </TouchableOpacity>)}
              </View>
            </View>

            {/* 内容区域 */}
            {activeTab === '团队讨论' ? <View style={styles.teamChatSection}>
                {messages.map(msg => <View key={msg.id} style={styles.teamChatMessage}>
                    <View style={styles.teamChatBubble}>
                      <View style={styles.teamChatHeader}>
                        <Avatar uri={msg.avatar} name={msg.author} size={32} />
                        <Text style={styles.teamChatUser}>{msg.author}</Text>
                        <Text style={styles.teamChatTime}>{msg.time}</Text>
                      </View>
                      <Text style={styles.teamChatText}>{msg.content}</Text>
                      <View style={styles.messageActions}>
                        <View style={styles.messageActionsLeft}>
                          <TouchableOpacity style={styles.messageActionBtn} onPress={() => setLiked({
                    ...liked,
                    [msg.id]: !liked[msg.id]
                  })}>
                            <Ionicons name={liked[msg.id] ? "thumbs-up" : "thumbs-up-outline"} size={14} color={liked[msg.id] ? "#f59e0b" : "#9ca3af"} />
                            <Text style={[styles.messageActionText, liked[msg.id] && {
                      color: '#f59e0b'
                    }]}>
                              {msg.likes + (liked[msg.id] ? 1 : 0)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.messageActionBtn} onPress={() => openReplyModal(msg)}>
                            <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                            <Text style={styles.messageActionText}>{t('screens.teamDetail.actions.reply')}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.messageActionsRight}>
                          <TouchableOpacity style={styles.messageActionBtn} onPress={() => setDisliked({
                    ...disliked,
                    [msg.id]: !disliked[msg.id]
                  })}>
                            <Ionicons name={disliked[msg.id] ? "thumbs-down" : "thumbs-down-outline"} size={14} color="#9ca3af" />
                            <Text style={styles.messageActionText}>{msg.dislikes + (disliked[msg.id] ? 1 : 0)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.messageActionBtn} onPress={() => handleReport(msg)}>
                            <Ionicons name="flag-outline" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>)}
              </View> : activeTab === '团队公告' ? (/* 团队公告列表 */
        <View style={styles.announcementList}>
                {announcements.map(announcement => <View key={announcement.id} style={styles.announcementItem}>
                    {Boolean(announcement.isPinned) && <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color="#ef4444" />
                        <Text style={styles.pinnedText}>{t('screens.teamDetail.announcement.pinned')}</Text>
                      </View>}
                    <Text style={styles.announcementTitle}>{announcement.title}</Text>
                    <Text style={styles.announcementContent}>{announcement.content}</Text>
                    <View style={styles.announcementFooter}>
                      <View style={styles.announcementAuthor}>
                        <Ionicons name="person-circle-outline" size={14} color="#9ca3af" />
                        <Text style={styles.announcementAuthorText}>{announcement.author}</Text>
                      </View>
                      <Text style={styles.announcementTime}>{announcement.time}</Text>
                    </View>
                  </View>)}
              </View>) : (/* 审批消息列表 - 仅管理员可见 */
        <ScrollView style={styles.approvalList} showsVerticalScrollIndicator={false}>
                {/* 加入团队申请 */}
                {joinRequests.length > 0 && <View style={styles.approvalSection}>
                    <Text style={styles.approvalSectionTitle}>{t('screens.teamDetail.approval.joinRequests')} ({joinRequests.length})</Text>
                    {joinRequests.map(request => <View key={request.id} style={styles.approvalItem}>
                        <View style={styles.approvalHeader}>
                          <Avatar uri={request.avatar} name={request.user} size={40} />
                          <View style={styles.approvalUserInfo}>
                            <Text style={styles.approvalUserName}>{request.user}</Text>
                            <Text style={styles.approvalTime}>{request.time}</Text>
                          </View>
                        </View>
                        <View style={styles.approvalReasonBox}>
                          <Text style={styles.approvalReasonLabel}>{t('screens.teamDetail.approval.reasonLabel')}</Text>
                          <Text style={styles.approvalReasonText}>{request.reason}</Text>
                        </View>
                        <View style={styles.approvalActions}>
                          <TouchableOpacity style={styles.approvalRejectBtn} onPress={() => handleApproveJoin(request.id, false)}>
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                            <Text style={styles.approvalRejectText}>{t('screens.teamDetail.approval.reject')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.approvalApproveBtn} onPress={() => handleApproveJoin(request.id, true)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approvalApproveText}>{t('screens.teamDetail.approval.approve')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>)}
                  </View>}

                {/* 管理员申请 */}
                {adminRequests.length > 0 && <View style={styles.approvalSection}>
                    <Text style={styles.approvalSectionTitle}>{t('screens.teamDetail.approval.adminRequests')} ({adminRequests.length})</Text>
                    {adminRequests.map(request => <View key={request.id} style={styles.approvalItem}>
                        <View style={styles.approvalHeader}>
                          <Avatar uri={request.avatar} name={request.user} size={40} />
                          <View style={styles.approvalUserInfo}>
                            <View style={styles.approvalUserNameRow}>
                              <Text style={styles.approvalUserName}>{request.user}</Text>
                              <View style={styles.adminApplyBadge}>
                                <Ionicons name="shield-checkmark" size={12} color="#8b5cf6" />
                                <Text style={styles.adminApplyBadgeText}>{t('screens.teamDetail.approval.applyAdmin')}</Text>
                              </View>
                            </View>
                            <Text style={styles.approvalTime}>{request.time}</Text>
                          </View>
                        </View>
                        <View style={styles.approvalReasonBox}>
                          <Text style={styles.approvalReasonLabel}>{t('screens.teamDetail.approval.reasonLabel')}</Text>
                          <Text style={styles.approvalReasonText}>{request.reason}</Text>
                        </View>
                        <View style={styles.approvalActions}>
                          <TouchableOpacity style={styles.approvalRejectBtn} onPress={() => handleApproveAdmin(request.id, false)}>
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                            <Text style={styles.approvalRejectText}>{t('screens.teamDetail.approval.reject')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.approvalApproveBtn} onPress={() => handleApproveAdmin(request.id, true)}>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.approvalApproveText}>{t('screens.teamDetail.approval.approve')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>)}
                  </View>}

                {/* 空状态 */}
                {joinRequests.length === 0 && adminRequests.length === 0 && <View style={styles.approvalEmpty}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color="#d1d5db" />
                    <Text style={styles.approvalEmptyText}>{t('screens.teamDetail.approval.empty')}</Text>
                    <Text style={styles.approvalEmptyHint}>{t('screens.teamDetail.approval.emptyHint')}</Text>
                  </View>}
              </ScrollView>)}
          </>}
      </ScrollView>

      {/* 底部输入栏 - 限制访问模式下不显示 */}
      {Boolean(!restrictedView && isJoined && activeTab === '团队讨论') && <View style={styles.teamChatInputContainer}>
          <TextInput style={styles.teamChatInput} placeholder={t('screens.teamDetail.chat.inputPlaceholder')} placeholderTextColor="#9ca3af" value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={styles.teamChatSendBtn} onPress={handleSend} disabled={!inputText.trim()}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>}

      {/* 加入团队按钮 - 限制访问模式下显示 */}
      {Boolean(restrictedView) && <View style={styles.teamActions}>
          {isPending ? <View style={styles.pendingNotice}>
              <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
              <Text style={styles.pendingNoticeText}>{t('screens.teamDetail.join.pendingNotice')}</Text>
            </View> : <TouchableOpacity style={styles.teamJoinBtn} onPress={handleJoinTeam}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.teamJoinBtnText}>{t('screens.teamDetail.join.applyButton')}</Text>
            </TouchableOpacity>}
        </View>}

      {/* 回复弹窗 */}
      <Modal visible={showReplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.replyModal}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>{t('screens.teamDetail.reply.title')} {replyTarget?.author}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.replyInput} placeholder={t('screens.teamDetail.reply.placeholder')} placeholderTextColor="#9ca3af" value={replyText} onChangeText={setReplyText} multiline autoFocus />
            <TouchableOpacity style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]} onPress={handleReply} disabled={!replyText.trim()}>
              <Text style={styles.replySubmitText}>{t('screens.teamDetail.reply.submitButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 成员列表弹窗 - 仅在已加入模式下使用 */}
      {!restrictedView && <Modal visible={showMembersModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.membersModal}>
              <View style={styles.membersModalHeader}>
                <Text style={styles.membersModalTitle}>{t('screens.teamDetail.members.title')} {t('screens.teamDetail.members.count').replace('{count}', teamMembers.length)}</Text>
                <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.membersModalList} showsVerticalScrollIndicator={false}>
                {teamMembers.map(member => <View key={member.id} style={styles.memberModalItem}>
                    <Avatar uri={member.avatar} name={member.name} size={48} />
                    <View style={styles.memberModalInfo}>
                      <View style={styles.memberModalNameRow}>
                        <Text style={styles.memberModalName}>{member.name}</Text>
                        {member.role === '队长' && <View style={styles.leaderBadgeLarge}>
                            <Ionicons name="star" size={10} color="#f59e0b" />
                            <Text style={styles.leaderBadgeText}>{t('screens.teamDetail.roles.leader')}</Text>
                          </View>}
                      </View>
                      <Text style={styles.memberModalRole}>{member.role}</Text>
                    </View>
                  </View>)}
              </ScrollView>
            </View>
          </View>
        </Modal>}

      {/* 发布公告弹窗 */}
      <Modal visible={showPublishAnnouncementModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.publishAnnouncementModal}>
            <View style={styles.publishAnnouncementHeader}>
              <Text style={styles.publishAnnouncementTitle}>{t('screens.teamDetail.announcement.publishTitle')}</Text>
              <TouchableOpacity onPress={() => setShowPublishAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.publishAnnouncementForm}>
                <Text style={styles.formLabel}>{t('screens.teamDetail.announcement.titleLabel')}</Text>
                <TextInput style={styles.formInput} placeholder={t('screens.teamDetail.announcement.titlePlaceholder')} placeholderTextColor="#9ca3af" value={announcementTitle} onChangeText={setAnnouncementTitle} />
                <Text style={styles.formLabel}>{t('screens.teamDetail.announcement.contentLabel')}</Text>
                <TextInput style={[styles.formInput, styles.formTextarea]} placeholder={t('screens.teamDetail.announcement.contentPlaceholder')} placeholderTextColor="#9ca3af" value={announcementContent} onChangeText={setAnnouncementContent} multiline numberOfLines={6} textAlignVertical="top" />
                <TouchableOpacity style={styles.pinnedCheckbox} onPress={() => setIsPinned(!isPinned)}>
                  <Ionicons name={isPinned ? "checkbox" : "square-outline"} size={20} color={isPinned ? "#f59e0b" : "#9ca3af"} />
                  <Text style={styles.pinnedCheckboxText}>{t('screens.teamDetail.announcement.pinnedCheckbox')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.publishAnnouncementSubmitBtn} onPress={handlePublishAnnouncement}>
              <Text style={styles.publishAnnouncementSubmitText}>{t('screens.teamDetail.announcement.publishButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 等待审核弹窗 */}
      <Modal visible={showPendingModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pendingModal}>
            <View style={styles.pendingModalIcon}>
              <Ionicons name="hourglass" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.pendingModalTitle}>{t('screens.teamDetail.join.pendingModalTitle')}</Text>
            <Text style={styles.pendingModalDesc}>
              {t('screens.teamDetail.join.pendingModalDesc')}
            </Text>
            <TouchableOpacity style={styles.pendingModalBtn} onPress={() => setShowPendingModal(false)}>
              <Text style={styles.pendingModalBtnText}>{t('screens.teamDetail.join.pendingModalButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 申请管理员弹窗 */}
      <Modal visible={showApplyAdminModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.applyAdminModal}>
            <View style={styles.applyAdminModalHandle} />
            
            <View style={styles.applyAdminModalHeader}>
              <Text style={styles.applyAdminModalTitle}>{t('screens.teamDetail.applyAdmin.title')}</Text>
              <Text style={styles.applyAdminModalSubtitle}>
                {t('screens.teamDetail.applyAdmin.subtitle')}
              </Text>
            </View>

            <ScrollView style={styles.applyAdminModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.applyAdminSection}>
                <Text style={styles.applyAdminLabel}>{t('screens.teamDetail.applyAdmin.reasonLabel')} <Text style={{
                  color: '#ef4444'
                }}>{t('screens.teamDetail.applyAdmin.reasonRequired')}</Text></Text>
                <TextInput style={styles.applyAdminTextarea} placeholder={t('screens.teamDetail.applyAdmin.reasonPlaceholder')} placeholderTextColor="#9ca3af" value={applyReason} onChangeText={setApplyReason} multiline textAlignVertical="top" />
              </View>

              <View style={styles.applyAdminTips}>
                <Text style={styles.applyAdminTipsTitle}>{t('screens.teamDetail.applyAdmin.tipsTitle')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip1')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip2')}</Text>
                <Text style={styles.applyAdminTipsText}>{t('screens.teamDetail.applyAdmin.tip3')}</Text>
              </View>
            </ScrollView>

            <View style={styles.applyAdminModalFooter}>
              <TouchableOpacity style={styles.cancelApplyBtn} onPress={() => {
              setShowApplyAdminModal(false);
              setApplyReason('');
            }}>
                <Text style={styles.cancelApplyBtnText}>{t('screens.teamDetail.applyAdmin.cancelButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitApplyBtn, !applyReason.trim() && styles.submitApplyBtnDisabled]} onPress={handleApplyAdmin} disabled={!applyReason.trim()}>
                <Text style={styles.submitApplyBtnText}>{t('screens.teamDetail.applyAdmin.submitButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 解散团队弹窗 */}
      <Modal visible={showDismissModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dismissModal}>
            <View style={styles.dismissModalHandle} />
            
            <View style={styles.dismissModalHeader}>
              <View style={styles.dismissModalIconWrapper}>
                <Ionicons name="warning" size={48} color="#ef4444" />
              </View>
              <Text style={styles.dismissModalTitle}>{t('screens.teamDetail.dismiss.title')}</Text>
              <Text style={styles.dismissModalSubtitle}>
                {t('screens.teamDetail.dismiss.subtitle')}
              </Text>
            </View>

            <View style={styles.dismissModalContent}>
              <View style={styles.dismissWarningBox}>
                <Text style={styles.dismissWarningTitle}>{t('screens.teamDetail.dismiss.warningTitle')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning1')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning2')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning3')}</Text>
                <Text style={styles.dismissWarningText}>{t('screens.teamDetail.dismiss.warning4')}</Text>
              </View>

              <View style={styles.dismissConfirmSection}>
                <Text style={styles.dismissConfirmLabel}>
                  {t('screens.teamDetail.dismiss.confirmLabel')} <Text style={styles.dismissTeamNameHighlight}>"{team.name}"</Text> {t('screens.teamDetail.dismiss.confirmHighlight')}
                </Text>
                <TextInput style={styles.dismissConfirmInput} placeholder={t('screens.teamDetail.dismiss.confirmPlaceholder')} placeholderTextColor="#9ca3af" value={dismissConfirmText} onChangeText={setDismissConfirmText} />
              </View>
            </View>

            <View style={styles.dismissModalFooter}>
              <TouchableOpacity style={styles.cancelDismissBtn} onPress={() => {
              setShowDismissModal(false);
              setDismissConfirmText('');
            }}>
                <Text style={styles.cancelDismissBtnText}>{t('screens.teamDetail.dismiss.cancelButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDismissBtn, dismissConfirmText !== team.name && styles.confirmDismissBtnDisabled]} onPress={handleConfirmDismiss} disabled={dismissConfirmText !== team.name}>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.confirmDismissBtnText}>{t('screens.teamDetail.dismiss.confirmButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f9fafb'
  },
  moreActionsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#f9fafb'
  },
  content: {
    flex: 1
  },
  teamInfoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 8
  },
  // 紧凑型操作按钮（放在标题右侧）
  compactActionsRow: {
    flexDirection: 'row',
    gap: 6
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  compactActionBtnPurple: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe'
  },
  compactActionBtnRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  compactActionBtnDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb'
  },
  compactActionBtnText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600'
  },
  compactActionBtnTextPurple: {
    color: '#8b5cf6'
  },
  compactActionBtnTextRed: {
    color: '#ef4444'
  },
  compactActionBtnTextDisabled: {
    color: '#9ca3af'
  },
  compactDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  compactDismissBtnText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600'
  },
  teamDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8
  },
  teamStats: {
    flexDirection: 'row',
    gap: 16
  },
  teamStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  teamStatText: {
    fontSize: 12,
    color: '#9ca3af'
  },
  // 团队成员区域 - 支持两种显示模式
  teamMembersSection: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  teamMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280'
  },
  viewAllText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500'
  },
  // 横向滚动模式（已加入团队）
  teamMembersScroll: {
    paddingHorizontal: 16
  },
  teamMemberItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 64
  },
  // 网格模式（未加入团队）
  teamMembersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8
  },
  teamMemberGridItem: {
    alignItems: 'center',
    width: '20%',
    marginBottom: 16
  },
  // 通用样式
  teamMemberAvatarWrapper: {
    position: 'relative',
    marginBottom: 6
  },
  teamMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f59e0b'
  },
  teamLeaderBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  teamMemberName: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2
  },
  teamMemberRole: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600'
  },
  // Tab标签
  tabsSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tabs: {
    flexDirection: 'row'
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center'
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280'
  },
  tabTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#f59e0b'
  },
  tabBadge: {
    position: 'absolute',
    top: 6,
    right: '25%',
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  // 团队聊天区域 - 参照团队弹窗样式
  teamChatSection: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff'
  },
  teamChatMessage: {
    marginBottom: 16
  },
  teamChatBubble: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12
  },
  teamChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8
  },
  teamChatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  teamChatUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1
  },
  teamChatTime: {
    fontSize: 11,
    color: '#9ca3af'
  },
  teamChatText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
    paddingLeft: 40
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 40
  },
  messageActionsLeft: {
    flexDirection: 'row',
    gap: 16,
    flex: 1
  },
  messageActionsRight: {
    flexDirection: 'row',
    gap: 12
  },
  messageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  messageActionText: {
    fontSize: 12,
    color: '#9ca3af'
  },
  // 团队聊天输入栏 - 参照团队弹窗样式
  teamChatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8
  },
  teamChatInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    maxHeight: 100
  },
  teamChatSendBtn: {
    backgroundColor: '#f59e0b',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  // 团队操作按钮 - 参照团队弹窗样式
  teamActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  teamJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  teamJoinBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  teamLeaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  teamLeaveBtnText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600'
  },
  // 限制访问提示
  restrictedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a'
  },
  restrictedNoticeText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8
  },
  pendingNoticeText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500'
  },
  // 公告列表
  announcementList: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  announcementItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8
  },
  pinnedText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600'
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22
  },
  announcementContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  announcementAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  announcementAuthorText: {
    fontSize: 12,
    color: '#9ca3af'
  },
  announcementTime: {
    fontSize: 12,
    color: '#9ca3af'
  },
  // 审批消息列表
  approvalList: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  approvalSection: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  approvalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  approvalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  approvalUserInfo: {
    flex: 1,
    marginLeft: 12
  },
  approvalUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  approvalUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937'
  },
  approvalTime: {
    fontSize: 12,
    color: '#9ca3af'
  },
  adminApplyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  adminApplyBadgeText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '500'
  },
  approvalReasonBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  approvalReasonLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4
  },
  approvalReasonText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12
  },
  approvalRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  approvalRejectText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600'
  },
  approvalApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8
  },
  approvalApproveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  approvalEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  approvalEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16
  },
  approvalEmptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8
  },
  // 回复弹窗
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  replyModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    maxHeight: '60%'
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  replyModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  replyInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: modalTokens.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  replySubmitBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  replySubmitBtnDisabled: {
    backgroundColor: '#fcd34d'
  },
  replySubmitText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  // 成员列表弹窗
  membersModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    maxHeight: '70%'
  },
  membersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  membersModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  membersModalList: {
    flex: 1
  },
  memberModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  memberModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: modalTokens.surfaceMuted
  },
  memberModalInfo: {
    flex: 1,
    marginLeft: 12
  },
  memberModalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  memberModalName: {
    fontSize: 15,
    fontWeight: '500',
    color: modalTokens.textPrimary
  },
  memberModalRole: {
    fontSize: 13,
    color: modalTokens.textMuted
  },
  leaderBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  leaderBadgeText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600'
  },
  // 发布公告弹窗
  publishAnnouncementModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    padding: 16,
    maxHeight: '80%'
  },
  publishAnnouncementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  publishAnnouncementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  publishAnnouncementForm: {
    marginBottom: 16
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  formInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: modalTokens.textPrimary,
    marginBottom: 16
  },
  formTextarea: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  pinnedCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pinnedCheckboxText: {
    fontSize: 14,
    color: '#374151'
  },
  publishAnnouncementSubmitBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  publishAnnouncementSubmitText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  // 等待审核弹窗
  pendingModal: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center'
  },
  pendingModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  pendingModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: modalTokens.textPrimary,
    marginBottom: 12
  },
  pendingModalDesc: {
    fontSize: 14,
    color: modalTokens.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24
  },
  pendingModalBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  pendingModalBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  // 申请管理员按钮
  applyAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  applyAdminBtnDisabled: {
    backgroundColor: '#f3f4f6'
  },
  applyAdminBtnText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '500'
  },
  applyAdminBtnTextDisabled: {
    color: '#9ca3af'
  },
  // 邀请弹窗
  inviteModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '85%',
    paddingBottom: 20
  },
  inviteModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  inviteModalHeader: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 4
  },
  inviteModalSubtitle: {
    fontSize: 13,
    color: modalTokens.textSecondary
  },
  inviteTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8
  },
  inviteTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  inviteTabActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  inviteTabText: {
    fontSize: 13,
    color: modalTokens.textMuted,
    fontWeight: '500'
  },
  inviteTabTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  inviteSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 12
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: 14,
    color: modalTokens.textPrimary
  },
  selectedCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    alignSelf: 'flex-start'
  },
  selectedCountText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600'
  },
  inviteUserList: {
    maxHeight: 350,
    paddingHorizontal: 20
  },
  inviteUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  inviteUserItemSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  inviteUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  inviteUserInfo: {
    flex: 1
  },
  inviteUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  inviteUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: modalTokens.textPrimary
  },
  inviteUserMeta: {
    fontSize: 12,
    color: modalTokens.textMuted
  },
  inviteCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: modalTokens.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  inviteCheckboxSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  inviteModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelInviteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelInviteBtnText: {
    fontSize: 15,
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  sendInviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 12
  },
  sendInviteBtnDisabled: {
    backgroundColor: '#d1d5db'
  },
  sendInviteBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  // 申请管理员弹窗
  applyAdminModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '70%',
    paddingBottom: 20
  },
  applyAdminModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  applyAdminModalHeader: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  applyAdminModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 4
  },
  applyAdminModalSubtitle: {
    fontSize: 13,
    color: modalTokens.textSecondary
  },
  applyAdminModalContent: {
    maxHeight: 300,
    paddingHorizontal: 20
  },
  applyAdminSection: {
    marginBottom: 16
  },
  applyAdminLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  applyAdminTextarea: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: modalTokens.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top'
  },
  applyAdminTips: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  applyAdminTipsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#166534',
    marginBottom: 8
  },
  applyAdminTipsText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 20
  },
  applyAdminModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelApplyBtnText: {
    fontSize: 15,
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  submitApplyBtn: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitApplyBtnDisabled: {
    backgroundColor: '#d1d5db'
  },
  submitApplyBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  // 解散团队弹窗
  dismissModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '80%',
    paddingBottom: 20
  },
  dismissModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: modalTokens.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16
  },
  dismissModalHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  dismissModalIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  dismissModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: modalTokens.textPrimary,
    marginBottom: 8
  },
  dismissModalSubtitle: {
    fontSize: 14,
    color: modalTokens.textSecondary,
    textAlign: 'center'
  },
  dismissModalContent: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  dismissWarningBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  dismissWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 12
  },
  dismissWarningText: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 22,
    marginBottom: 4
  },
  dismissConfirmSection: {
    marginTop: 8
  },
  dismissConfirmLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20
  },
  dismissTeamNameHighlight: {
    fontWeight: '600',
    color: '#ef4444'
  },
  dismissConfirmInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: modalTokens.textPrimary
  },
  dismissModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  cancelDismissBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: modalTokens.border,
    alignItems: 'center'
  },
  cancelDismissBtnText: {
    fontSize: 15,
    color: modalTokens.textSecondary,
    fontWeight: '500'
  },
  confirmDismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12
  },
  confirmDismissBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  confirmDismissBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  }
});