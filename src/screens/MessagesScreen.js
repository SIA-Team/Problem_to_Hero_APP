import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';

// 顶部快捷入口数据
const quickEntries = [{
  key: 'comment',
  icon: 'chatbubbles',
  color: '#3b82f6',
  count: 12
}, {
  key: 'like',
  icon: 'heart',
  color: '#ef4444',
  count: 28
}, {
  key: 'bookmark',
  icon: 'bookmark',
  color: '#f59e0b',
  count: 5
}, {
  key: 'follow',
  icon: 'person-add',
  color: '#22c55e',
  count: 8
}];

// 邀请回答数据
const inviteAnswers = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite1',
  name: '张三丰',
  question: '如何在三个月内从零基础学会Python编程？',
  time: '10分钟前'
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=invite2',
  name: '李小龙',
  question: '35岁程序员如何规划职业发展？',
  time: '30分钟前'
}];

// 仲裁邀请数据
const arbitrationInvites = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  name: '张三丰',
  question: '如何在三个月内从零基础学会Python编程？',
  answer: 'Python老司机',
  reason: '原答案中关于学习时间的估计不够准确，对于零基础学习者来说，3个月时间过于乐观...',
  time: '5分钟前',
  status: 'pending' // pending: 待投票, voted: 已投票
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  name: '李四',
  question: 'React和Vue应该选择哪个？',
  answer: '前端专家',
  reason: '答案过于偏向React，没有客观分析两者的优劣...',
  time: '1小时前',
  status: 'voted'
}];

// 消息列表数据
const messageGroups = [{
  type: 'official',
  icon: 'megaphone',
  iconBg: '#dbeafe',
  iconColor: '#3b82f6',
  lastMessage: '平台新功能上线通知：现已支持视频回答...',
  time: '1小时前',
  unread: 2
}, {
  type: 'question',
  icon: 'help-circle',
  iconBg: '#dcfce7',
  iconColor: '#22c55e',
  lastMessage: '您关注的问题「如何学习Python」有3个新回答',
  time: '2小时前',
  unread: 3
}, {
  type: 'system',
  icon: 'settings',
  iconBg: '#f3f4f6',
  iconColor: '#6b7280',
  lastMessage: '您的账户安全设置已更新',
  time: '昨天',
  unread: 0
}];

// 私信用户数据
const privateMessages = [{
  id: 1,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
  name: 'Python老司机',
  verified: true,
  lastMessage: '谢谢你的回答，帮了我很大的忙！',
  time: '30分钟前',
  unread: 2
}, {
  id: 2,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
  name: '数据分析师小王',
  lastMessage: '请问你有时间交流一下吗？',
  time: '1小时前',
  unread: 1
}, {
  id: 3,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
  name: '美食达人',
  lastMessage: '好的，我会试试你推荐的方法',
  time: '3小时前',
  unread: 0
}, {
  id: 4,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
  name: '编程新手',
  lastMessage: '太感谢了！',
  time: '昨天',
  unread: 0
}];

// 可发私信的用户列表
const allUsers = [{
  id: 1,
  name: 'Python老司机',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm1',
  title: '资深Python开发',
  verified: true
}, {
  id: 2,
  name: '数据分析师小王',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm2',
  title: '数据分析师'
}, {
  id: 3,
  name: '美食达人',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm3',
  title: '美食博主'
}, {
  id: 4,
  name: '编程新手',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pm4',
  title: '学生'
}, {
  id: 5,
  name: '王医生',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow2',
  title: '三甲医院主治医师',
  verified: true
}, {
  id: 6,
  name: '程序员小明',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow4',
  title: '全栈开发工程师'
}, {
  id: 7,
  name: '设计师小李',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=follow5',
  title: 'UI/UX设计师'
}];
export default function MessagesScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [currentArbitration, setCurrentArbitration] = useState(null);
  const [voteChoice, setVoteChoice] = useState(null); // 'agree' or 'disagree'
  const [voteReason, setVoteReason] = useState('');
  const [showArbitrationResultModal, setShowArbitrationResultModal] = useState(false);
  const [currentArbitrationResult, setCurrentArbitrationResult] = useState(null);

  // Get quick entry labels from translations
  const quickEntryLabels = {
    comment: t('screens.messagesScreen.quickEntries.commentForward'),
    like: t('screens.messagesScreen.quickEntries.likeAgree'),
    bookmark: t('screens.messagesScreen.quickEntries.bookmarked'),
    follow: t('screens.messagesScreen.quickEntries.followSubscribe')
  };

  // Get message group titles from translations
  const messageGroupTitles = {
    official: t('screens.messagesScreen.messageGroups.official'),
    question: t('screens.messagesScreen.messageGroups.questionAnswer'),
    system: t('screens.messagesScreen.messageGroups.system')
  };
  const handleMarkAllRead = () => {
    showAppAlert(t('screens.messagesScreen.alerts.markAllReadTitle'), t('screens.messagesScreen.alerts.markAllReadMessage'), [{
      text: t('common.cancel'),
      style: 'cancel'
    }, {
      text: t('common.confirm'),
      onPress: () => showAppAlert(t('screens.messagesScreen.alerts.success'), t('screens.messagesScreen.alerts.markAllReadSuccess'))
    }]);
  };
  const handleSendMessage = () => {
    if (!selectedUser) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.selectUserHint'));
      return;
    }
    if (!messageContent.trim()) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.enterMessageHint'));
      return;
    }
    showAppAlert(t('screens.messagesScreen.alerts.success'), t('screens.messagesScreen.alerts.sendSuccess').replace('{name}', selectedUser.name));
    setShowPrivateModal(false);
    setSelectedUser(null);
    setMessageContent('');
    setSearchText('');
  };
  const handleOpenVoteModal = arbitration => {
    setCurrentArbitration(arbitration);
    setShowVoteModal(true);
  };
  const handleSubmitVote = () => {
    if (!voteChoice) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.selectVoteHint'));
      return;
    }
    if (!voteReason.trim()) {
      showAppAlert(t('screens.messagesScreen.alerts.hint'), t('screens.messagesScreen.alerts.enterReasonHint'));
      return;
    }
    showAppAlert(t('screens.messagesScreen.alerts.success'), t('screens.messagesScreen.alerts.voteSuccess'));
    setShowVoteModal(false);
    setCurrentArbitration(null);
    setVoteChoice(null);
    setVoteReason('');
  };
  const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(searchText.toLowerCase()));
  return <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.messagesScreen.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Text style={styles.markAllRead}>{t('screens.messagesScreen.markAllRead')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendMsgBtn} onPress={() => setShowPrivateModal(true)} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 顶部快捷入口 */}
        <View style={styles.quickSection}>
          <View style={styles.quickGrid}>
            {quickEntries.map(entry => <TouchableOpacity key={entry.key} style={styles.quickItem}>
                <View style={[styles.quickIcon, {
              backgroundColor: entry.color + '20'
            }]}>
                  <Ionicons name={entry.icon} size={22} color={entry.color} />
                  {entry.count > 0 && <View style={styles.quickBadge}>
                      <Text style={styles.quickBadgeText}>{entry.count}</Text>
                    </View>}
                </View>
                <Text style={styles.quickLabel}>{quickEntryLabels[entry.key]}</Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {/* 邀请回答模块 */}
        <View style={styles.inviteSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="hand-left" size={18} color="#f59e0b" />
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.inviteAnswer.title')}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionMore}>{t('screens.messagesScreen.inviteAnswer.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {inviteAnswers.map(item => <TouchableOpacity key={item.id} style={styles.inviteItem}>
              <Avatar uri={item.avatar} name={item.name} size={40} />
              <View style={styles.inviteContent}>
                <Text style={styles.inviteName}>{item.name} {t('screens.messagesScreen.inviteAnswer.invitedYou')}</Text>
                <Text style={styles.inviteQuestion} numberOfLines={1}>{item.question}</Text>
              </View>
              <View style={styles.inviteRight}>
                <Text style={styles.inviteTime}>{item.time}</Text>
                <TouchableOpacity style={styles.inviteBtn}>
                  <Text style={styles.inviteBtnText}>{t('screens.messagesScreen.inviteAnswer.goAnswer')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>)}
        </View>

        {/* 仲裁邀请 */}
        <View style={styles.arbitrationSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="gavel" size={18} color="#ef4444" />
              <Text style={styles.sectionTitle}>{t('screens.messagesScreen.arbitration.title')}</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.sectionMore}>{t('screens.messagesScreen.inviteAnswer.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {arbitrationInvites.map(item => <View key={item.id} style={styles.arbitrationItem}>
              <Avatar uri={item.avatar} name={item.name} size={40} />
              <View style={styles.arbitrationContent}>
                <View style={styles.arbitrationHeader}>
                  <Text style={styles.arbitrationName}>{item.name} {t('screens.messagesScreen.arbitration.invitedYou')}</Text>
                  {item.status === 'voted' && <View style={styles.votedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                      <Text style={styles.votedBadgeText}>{t('screens.messagesScreen.arbitration.voted')}</Text>
                    </View>}
                </View>
                <Text style={styles.arbitrationQuestion} numberOfLines={1}>
                  {t('screens.messagesScreen.arbitration.question')}：{item.question}
                </Text>
                <Text style={styles.arbitrationAnswer} numberOfLines={1}>
                  {t('screens.messagesScreen.arbitration.answerAuthor')}：{item.answer}
                </Text>
                <Text style={styles.arbitrationReason} numberOfLines={2}>
                  {t('screens.messagesScreen.arbitration.reason')}：{item.reason}
                </Text>
              </View>
              <View style={styles.arbitrationRight}>
                <Text style={styles.arbitrationTime}>{item.time}</Text>
                {item.status === 'pending' ? <TouchableOpacity style={styles.voteBtn} onPress={() => handleOpenVoteModal(item)}>
                    <Ionicons name="hand-right" size={14} color="#fff" />
                    <Text style={styles.voteBtnText}>{t('screens.messagesScreen.arbitration.goVote')}</Text>
                  </TouchableOpacity> : <TouchableOpacity style={styles.viewVoteBtn}>
                    <Text style={styles.viewVoteBtnText}>{t('screens.messagesScreen.arbitration.view')}</Text>
                  </TouchableOpacity>}
              </View>
            </View>)}
        </View>

        {/* 消息分组 */}
        <View style={styles.messageGroupSection}>
          {messageGroups.map((group, idx) => <TouchableOpacity key={idx} style={styles.messageGroupItem}>
              <View style={[styles.groupIcon, {
            backgroundColor: group.iconBg
          }]}>
                <Ionicons name={group.icon} size={22} color={group.iconColor} />
              </View>
              <View style={styles.groupContent}>
                <View style={styles.groupTitleRow}>
                  <Text style={styles.groupTitle}>{messageGroupTitles[group.type]}</Text>
                  <Text style={styles.groupTime}>{group.time}</Text>
                </View>
                <Text style={styles.groupMessage} numberOfLines={1}>{group.lastMessage}</Text>
              </View>
              {group.unread > 0 && <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{group.unread}</Text>
                </View>}
            </TouchableOpacity>)}
        </View>

        {/* 私信列表 */}
        <View style={styles.privateSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.messagesScreen.privateMessages.title')}</Text>
          </View>
          {privateMessages.map(item => <TouchableOpacity key={item.id} style={styles.privateItem}>
              <Avatar uri={item.avatar} name={item.name} size={48} />
              <View style={styles.privateContent}>
                <View style={styles.privateTitleRow}>
                  <Text style={styles.privateName}>{item.name}</Text>
                  {Boolean(item.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                  <Text style={styles.privateTime}>{item.time}</Text>
                </View>
                <Text style={styles.privateMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              {item.unread > 0 && <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>{item.unread}</Text>
                </View>}
            </TouchableOpacity>)}
        </View>

        <View style={{
        height: 20
      }} />
      </ScrollView>

      {/* 发送私信弹窗 */}
      <Modal visible={showPrivateModal} animationType="slide">
        <SafeAreaView style={styles.privateModal}>
          <View style={styles.privateModalHeader}>
            <TouchableOpacity onPress={() => {
            setShowPrivateModal(false);
            setSelectedUser(null);
            setMessageContent('');
            setSearchText('');
          }}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.privateModalTitle}>{t('screens.messagesScreen.privateModal.title')}</Text>
            <TouchableOpacity style={[styles.sendBtn, (!selectedUser || !messageContent.trim()) && styles.sendBtnDisabled]} onPress={handleSendMessage} disabled={!selectedUser || !messageContent.trim()}>
              <Text style={[styles.sendBtnText, (!selectedUser || !messageContent.trim()) && styles.sendBtnTextDisabled]}>{t('screens.messagesScreen.privateModal.send')}</Text>
            </TouchableOpacity>
          </View>

          {/* 搜索用户 */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput style={styles.searchInput} placeholder={t('screens.messagesScreen.privateModal.searchPlaceholder')} value={searchText} onChangeText={setSearchText} />
              {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>}
            </View>
          </View>

          {/* 已选择的用户 */}
          <View style={[styles.selectedUserSection, {
          display: selectedUser ? 'flex' : 'none'
        }]}>
            <Text style={styles.selectedLabel}>{t('screens.messagesScreen.privateModal.sendTo')}</Text>
            <View style={styles.selectedUserTag}>
              <Avatar uri={selectedUser?.avatar} name={selectedUser?.name} size={24} />
              <Text style={styles.selectedUserName}>{selectedUser?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 用户列表 */}
          <View style={[styles.userListSection, {
          display: selectedUser ? 'none' : 'flex'
        }]}>
            <Text style={styles.userListTitle}>{t('screens.messagesScreen.privateModal.selectUser')}</Text>
            <ScrollView style={styles.userList}>
              {filteredUsers.map(user => <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => setSelectedUser(user)}>
                  <Avatar uri={user.avatar} name={user.name} size={44} />
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{user.name}</Text>
                      {Boolean(user.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                    </View>
                    <Text style={styles.userTitle}>{user.title}</Text>
                  </View>
                </TouchableOpacity>)}
            </ScrollView>
          </View>

          {/* 私信内容 */}
          <View style={[styles.messageInputSection, {
          display: selectedUser ? 'flex' : 'none'
        }]}>
            <Text style={styles.messageInputLabel}>{t('screens.messagesScreen.privateModal.messageContent')}</Text>
            <TextInput style={styles.messageTextInput} placeholder={t('screens.messagesScreen.privateModal.messagePlaceholder')} placeholderTextColor="#bbb" value={messageContent} onChangeText={setMessageContent} multiline textAlignVertical="top" />
          </View>
        </SafeAreaView>
      </Modal>

      {/* 专家投票弹窗 */}
      <Modal visible={showVoteModal} animationType="slide" transparent>
        <View style={styles.voteModalOverlay}>
          <View style={styles.voteModal}>
            <View style={styles.voteModalHandle} />
            <Text style={styles.voteModalTitle}>{t('screens.messagesScreen.voteModal.title')}</Text>

            {Boolean(currentArbitration) && <ScrollView style={styles.voteModalContent} showsVerticalScrollIndicator={false}>
                {/* 问题信息 */}
                <View style={styles.voteQuestionCard}>
                  <Text style={styles.voteQuestionLabel}>{t('screens.messagesScreen.voteModal.questionLabel')}</Text>
                  <Text style={styles.voteQuestionText}>{currentArbitration.question}</Text>
                  <View style={styles.voteAnswerRow}>
                    <Text style={styles.voteAnswerLabel}>{t('screens.messagesScreen.voteModal.answerAuthorLabel')}</Text>
                    <Text style={styles.voteAnswerAuthor}>{currentArbitration.answer}</Text>
                  </View>
                </View>

                {/* 仲裁理由 */}
                <View style={styles.voteReasonCard}>
                  <Text style={styles.voteReasonLabel}>{t('screens.messagesScreen.voteModal.reasonLabel')}</Text>
                  <Text style={styles.voteReasonText}>{currentArbitration.reason}</Text>
                  <View style={styles.voteApplicantRow}>
                    <Avatar uri={currentArbitration.avatar} name={currentArbitration.name} size={20} />
                    <Text style={styles.voteApplicantName}>{currentArbitration.name}</Text>
                    <Text style={styles.voteApplicantTime}>{currentArbitration.time}</Text>
                  </View>
                </View>

                {/* 投票选项 */}
                <Text style={styles.voteChoiceTitle}>{t('screens.messagesScreen.voteModal.voteChoiceTitle')}</Text>
                <View style={styles.voteChoices}>
                  <TouchableOpacity style={[styles.voteChoiceBtn, voteChoice === 'agree' && styles.voteChoiceBtnActive]} onPress={() => setVoteChoice('agree')}>
                    <View style={[styles.voteChoiceRadio, voteChoice === 'agree' && styles.voteChoiceRadioActive]}>
                      {voteChoice === 'agree' && <View style={styles.voteChoiceRadioDot} />}
                    </View>
                    <View style={styles.voteChoiceContent}>
                      <Text style={[styles.voteChoiceLabel, voteChoice === 'agree' && styles.voteChoiceLabelActive]}>{t('screens.messagesScreen.voteModal.agreeOverthrow')}</Text>
                      <Text style={styles.voteChoiceDesc}>
                        {t('screens.messagesScreen.voteModal.agreeOverthrowDesc')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.voteChoiceBtn, voteChoice === 'disagree' && styles.voteChoiceBtnActive]} onPress={() => setVoteChoice('disagree')}>
                    <View style={[styles.voteChoiceRadio, voteChoice === 'disagree' && styles.voteChoiceRadioActive]}>
                      {voteChoice === 'disagree' && <View style={styles.voteChoiceRadioDot} />}
                    </View>
                    <View style={styles.voteChoiceContent}>
                      <Text style={[styles.voteChoiceLabel, voteChoice === 'disagree' && styles.voteChoiceLabelActive]}>{t('screens.messagesScreen.voteModal.maintainOriginal')}</Text>
                      <Text style={styles.voteChoiceDesc}>
                        {t('screens.messagesScreen.voteModal.maintainOriginalDesc')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 投票理由 */}
                <Text style={styles.voteReasonInputLabel}>{t('screens.messagesScreen.voteModal.reasonInputLabel')}</Text>
                <TextInput style={styles.voteReasonInput} placeholder={t('screens.messagesScreen.voteModal.reasonPlaceholder')} placeholderTextColor="#9ca3af" value={voteReason} onChangeText={setVoteReason} multiline numberOfLines={4} textAlignVertical="top" />

                <View style={{
              height: 20
            }} />
              </ScrollView>}

            <View style={styles.voteModalFooter}>
              <TouchableOpacity style={[styles.submitVoteBtn, (!voteChoice || !voteReason.trim()) && styles.submitVoteBtnDisabled]} onPress={handleSubmitVote} disabled={!voteChoice || !voteReason.trim()}>
                <Text style={styles.submitVoteBtnText}>{t('screens.messagesScreen.voteModal.submitVote')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelVoteBtn} onPress={() => {
              setShowVoteModal(false);
              setCurrentArbitration(null);
              setVoteChoice(null);
              setVoteReason('');
            }}>
                <Text style={styles.cancelVoteBtnText}>{t('screens.messagesScreen.voteModal.cancel')}</Text>
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
    backgroundColor: '#f3f4f6'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backBtn: {
    marginRight: 12
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  markAllRead: {
    fontSize: 13,
    color: '#6b7280'
  },
  sendMsgBtn: {
    padding: 4
  },
  content: {
    flex: 1
  },
  // 快捷入口样式
  quickSection: {
    backgroundColor: '#fff',
    paddingVertical: 16
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  quickItem: {
    alignItems: 'center'
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  quickBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  quickLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 6
  },
  // 邀请回答样式
  inviteSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937'
  },
  sectionMore: {
    fontSize: 13,
    color: '#ef4444'
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  inviteContent: {
    flex: 1,
    marginLeft: 10
  },
  inviteName: {
    fontSize: 13,
    color: '#6b7280'
  },
  inviteQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 2
  },
  inviteRight: {
    alignItems: 'flex-end'
  },
  inviteTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6
  },
  inviteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12
  },
  inviteBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500'
  },
  // 消息分组样式
  messageGroupSection: {
    backgroundColor: '#fff',
    marginTop: 8
  },
  messageGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupContent: {
    flex: 1,
    marginLeft: 12
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937'
  },
  groupTime: {
    fontSize: 12,
    color: '#9ca3af'
  },
  groupMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4
  },
  groupBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  groupBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  // 私信列表样式
  privateSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  privateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  privateContent: {
    flex: 1,
    marginLeft: 12
  },
  privateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  privateName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937'
  },
  privateTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 'auto'
  },
  privateMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4
  },
  privateBadge: {
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  privateBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  // 发送私信弹窗样式
  privateModal: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  privateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  privateModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: modalTokens.textPrimary
  },
  sendBtn: {
    backgroundColor: modalTokens.danger,
    paddingHorizontal: modalTokens.actionPaddingX,
    paddingVertical: modalTokens.actionPaddingY,
    borderRadius: modalTokens.actionRadius
  },
  sendBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  sendBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  sendBtnTextDisabled: {
    color: '#fff'
  },
  searchSection: {
    padding: 12,
    backgroundColor: '#fff'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: modalTokens.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14
  },
  selectedUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: modalTokens.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  selectedLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 8
  },
  selectedUserTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6
  },
  selectedUserName: {
    fontSize: 13,
    color: '#1f2937'
  },
  userListSection: {
    flex: 1,
    padding: 12
  },
  userListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12
  },
  userList: {
    flex: 1
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
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
    color: '#9ca3af',
    marginTop: 2
  },
  messageInputSection: {
    flex: 1,
    padding: 16
  },
  messageInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  messageTextInput: {
    flex: 1,
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: modalTokens.textPrimary,
    minHeight: 150
  },
  // 仲裁邀请样式
  arbitrationSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 12
  },
  arbitrationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  arbitrationContent: {
    flex: 1,
    marginLeft: 10
  },
  arbitrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  arbitrationName: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  votedBadgeText: {
    fontSize: 10,
    color: '#22c55e',
    fontWeight: '600'
  },
  arbitrationQuestion: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2
  },
  arbitrationAnswer: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2
  },
  arbitrationReason: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 18
  },
  arbitrationRight: {
    alignItems: 'flex-end',
    marginLeft: 10
  },
  arbitrationTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  voteBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  viewVoteBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  viewVoteBtnText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
  },
  // 专家投票弹窗样式
  voteModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end'
  },
  voteModal: {
    backgroundColor: modalTokens.surface,
    borderTopLeftRadius: modalTokens.sheetRadius,
    borderTopRightRadius: modalTokens.sheetRadius,
    borderTopWidth: 1,
    borderColor: modalTokens.border,
    maxHeight: '90%'
  },
  voteModalHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12
  },
  voteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: modalTokens.textPrimary,
    textAlign: 'center',
    marginBottom: 16
  },
  voteModalContent: {
    maxHeight: 500,
    paddingHorizontal: 20
  },
  voteQuestionCard: {
    backgroundColor: modalTokens.surfaceSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: modalTokens.border
  },
  voteQuestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6
  },
  voteQuestionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 8
  },
  voteAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  voteAnswerLabel: {
    fontSize: 12,
    color: '#9ca3af'
  },
  voteAnswerAuthor: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6'
  },
  voteReasonCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  voteReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 6
  },
  voteReasonText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
    marginBottom: 10
  },
  voteApplicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  voteApplicantName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e'
  },
  voteApplicantTime: {
    fontSize: 11,
    color: '#d97706',
    marginLeft: 'auto'
  },
  voteChoiceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  voteChoices: {
    gap: 12,
    marginBottom: 20
  },
  voteChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb'
  },
  voteChoiceBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  voteChoiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  voteChoiceRadioActive: {
    borderColor: '#3b82f6'
  },
  voteChoiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6'
  },
  voteChoiceContent: {
    flex: 1,
    marginLeft: 12
  },
  voteChoiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4
  },
  voteChoiceLabelActive: {
    color: '#3b82f6'
  },
  voteChoiceDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18
  },
  voteReasonInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10
  },
  voteReasonInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20
  },
  voteModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  submitVoteBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  submitVoteBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  submitVoteBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  },
  cancelVoteBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  cancelVoteBtnText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500'
  }
});