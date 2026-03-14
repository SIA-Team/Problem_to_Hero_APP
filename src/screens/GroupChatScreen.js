import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { modalTokens } from '../components/modalTokens';
import { useTranslation } from '../i18n/withTranslation';

const initialMessages = [
  { id: 1, author: '技术小白', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=msg1', content: '这个问题我也很想知道答案，关注了！', time: '10', likes: 12, dislikes: 1, shares: 3, bookmarks: 5, isFeatured: false },
  { id: 2, author: 'Python爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=msg2', content: '我觉得3个月入门完全可以，关键是要坚持每天练习', time: '25', likes: 28, dislikes: 2, shares: 8, bookmarks: 15, isFeatured: true },
  { id: 3, author: '数据分析师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=msg3', content: '推荐先从基础语法开始，然后学pandas和numpy，这两个库在数据分析中用得最多', time: '60', likes: 45, dislikes: 3, shares: 12, bookmarks: 28, isFeatured: true },
  { id: 4, author: '转行成功', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=msg4', content: '我就是文科转行的，现在已经做了2年数据分析了，加油！', time: '120', likes: 67, dislikes: 1, shares: 18, bookmarks: 34, isFeatured: false },
  { id: 5, author: '编程导师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=msg5', content: '建议找一个实际项目来练手，比如爬虫或者数据可视化，这样学得更快', time: '180', likes: 89, dislikes: 2, shares: 25, bookmarks: 56, isFeatured: false },
];

export default function GroupChatScreen({ navigation, route }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [isJoined, setIsJoined] = useState(true);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // featured | all | latest

  const question = route?.params?.question || {
    title: '如何在三个月内从零基础学会Python编程？有没有系统的学习路线推荐？',
    author: '张三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    memberCount: 128
  };

  // Helper function to format time
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes}${t('screens.groupChat.minutesAgo')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}${t('screens.groupChat.hoursAgo')}`;
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMessage = {
      id: Date.now(),
      author: '我',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      content: inputText,
      time: '0',
      likes: 0,
      dislikes: 0,
      shares: 0,
      bookmarks: 0
    };
    setMessages([newMessage, ...messages]);
    setInputText('');
  };

  const handleExitGroup = () => {
    Alert.alert(
      t('screens.groupChat.exitConfirmTitle'),
      t('screens.groupChat.exitConfirmMessage'),
      [
        { text: t('screens.groupChat.cancel'), style: 'cancel' },
        { text: t('screens.groupChat.confirmExit'), style: 'destructive', onPress: () => {
          setIsJoined(false);
          navigation.goBack();
        }}
      ]
    );
  };

  const openReplyModal = (msg) => {
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
      content: `${t('screens.groupChat.replyTo')} @${replyTarget.author}：${replyText}`,
      time: '0',
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

  const handleReport = (msg) => {
    Alert.alert(t('screens.groupChat.reportTitle'), t('screens.groupChat.reportConfirm'), [
      { text: t('screens.groupChat.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => Alert.alert(t('screens.groupChat.hint'), t('screens.groupChat.reportSuccess')) }
    ]);
  };

  // 获取过滤后的留言列表
  const getFilteredMessages = () => {
    switch (activeTab) {
      case 'featured':
        // 只显示精选留言
        return messages.filter(m => m.isFeatured);
      case 'all':
      default:
        // 精选置顶，其他按原顺序
        const featured = messages.filter(m => m.isFeatured);
        const others = messages.filter(m => !m.isFeatured);
        return [...featured, ...others];
    }
  };

  const filteredMessages = getFilteredMessages();
  const featuredCount = messages.filter(m => m.isFeatured).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('screens.groupChat.title')}</Text>
          <Text style={styles.memberCount}>{question.memberCount} {t('screens.groupChat.memberCount')}</Text>
        </View>
        <TouchableOpacity onPress={handleExitGroup} style={styles.exitBtn}>
          <Ionicons name="exit-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 问题卡片 */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Image source={{ uri: question.avatar }} style={styles.questionAvatar} />
            <Text style={styles.questionAuthor}>{question.author}</Text>
            <View style={styles.questionTag}>
              <Text style={styles.questionTagText}>{t('screens.groupChat.questioner')}</Text>
            </View>
          </View>
          <Text style={styles.questionTitle}>{question.title}</Text>
        </View>

        {/* 留言列表 */}
        <View style={styles.messagesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.groupChat.messagesSection')}</Text>
            <Text style={styles.messageCount}>{messages.length} {t('screens.groupChat.messageCount')}</Text>
          </View>

          {/* Tab 切换 */}
          <View style={styles.sortFilterBar}>
            <View style={styles.sortFilterLeft}>
              <TouchableOpacity 
                style={[styles.sortFilterBtn, activeTab === 'featured' && styles.sortFilterBtnActive]}
                onPress={() => setActiveTab('featured')}
              >
                <Ionicons name="star" size={14} color={activeTab === 'featured' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, activeTab === 'featured' && styles.sortFilterTextActive]}>
                  精选
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sortFilterBtn, activeTab === 'all' && styles.sortFilterBtnActive]}
                onPress={() => setActiveTab('all')}
              >
                <Ionicons name="list" size={14} color={activeTab === 'all' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, activeTab === 'all' && styles.sortFilterTextActive]}>
                  全部
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredMessages.map(msg => (
            <View key={msg.id} style={styles.messageCard}>
              <View style={styles.msgHeader}>
                <Avatar uri={msg.avatar} name={msg.author} size={24} />
                <Text style={styles.msgAuthor}>{msg.author}</Text>
                <Text style={styles.msgTime}>{msg.time === '0' ? t('screens.groupChat.justNow') : formatTime(parseInt(msg.time))}</Text>
              </View>
              <Text style={styles.msgText}>{msg.content}</Text>
              <View style={styles.msgActions}>
                <TouchableOpacity style={styles.msgActionBtn} onPress={() => setLiked({ ...liked, [msg.id]: !liked[msg.id] })}>
                  <Ionicons name={liked[msg.id] ? "thumbs-up" : "thumbs-up-outline"} size={14} color={liked[msg.id] ? "#ef4444" : "#6b7280"} />
                  <Text style={[styles.msgActionText, liked[msg.id] && { color: '#ef4444' }]}>{msg.likes + (liked[msg.id] ? 1 : 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgActionBtn} onPress={() => setDisliked({ ...disliked, [msg.id]: !disliked[msg.id] })}>
                  <Ionicons name={disliked[msg.id] ? "thumbs-down" : "thumbs-down-outline"} size={14} color={disliked[msg.id] ? "#3b82f6" : "#6b7280"} />
                  <Text style={[styles.msgActionText, disliked[msg.id] && { color: '#3b82f6' }]}>{msg.dislikes + (disliked[msg.id] ? 1 : 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgActionBtn}>
                  <Ionicons name="arrow-redo-outline" size={14} color="#6b7280" />
                  <Text style={styles.msgActionText}>{msg.shares}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgActionBtn} onPress={() => setBookmarked({ ...bookmarked, [msg.id]: !bookmarked[msg.id] })}>
                  <Ionicons name={bookmarked[msg.id] ? "bookmark" : "star-outline"} size={14} color={bookmarked[msg.id] ? "#f59e0b" : "#6b7280"} />
                  <Text style={[styles.msgActionText, bookmarked[msg.id] && { color: '#f59e0b' }]}>{msg.bookmarks + (bookmarked[msg.id] ? 1 : 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgActionBtn} onPress={() => handleReport(msg)}>
                  <Ionicons name="flag-outline" size={14} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.replyBtn} onPress={() => openReplyModal(msg)}>
                  <Ionicons name="return-down-back-outline" size={14} color="#ef4444" />
                  <Text style={styles.replyBtnText}>{t('screens.groupChat.reply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 回复弹窗 */}
      <Modal visible={showReplyModal} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowReplyModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.replyModal}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>{t('screens.groupChat.replyModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {replyTarget && (
              <View style={styles.replyTargetCard}>
                <Image source={{ uri: replyTarget.avatar }} style={styles.replyTargetAvatar} />
                <View style={styles.replyTargetInfo}>
                  <Text style={styles.replyTargetAuthor}>{replyTarget.author}</Text>
                  <Text style={styles.replyTargetContent} numberOfLines={2}>{replyTarget.content}</Text>
                </View>
              </View>
            )}

            <View style={styles.replyInputWrapper}>
              <TextInput
                style={styles.replyInput}
                placeholder={t('screens.groupChat.replyPlaceholder').replace('{author}', replyTarget?.author || '')}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
            </View>

            <View style={styles.replyModalFooter}>
              <TouchableOpacity style={styles.replyCancelBtn} onPress={() => setShowReplyModal(false)}>
                <Text style={styles.replyCancelText}>{t('screens.groupChat.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]} 
                onPress={handleReply}
                disabled={!replyText.trim()}
              >
                <Text style={styles.replySubmitText}>{t('screens.groupChat.send')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 底部输入栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('screens.groupChat.inputPlaceholder')}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  memberCount: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  exitBtn: { padding: 4 },
  content: { flex: 1 },
  questionCard: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  questionAvatar: { width: 36, height: 36, borderRadius: 18 },
  questionAuthor: { fontSize: 14, fontWeight: '500', color: '#1f2937', marginLeft: 10 },
  questionTag: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  questionTagText: { fontSize: 11, color: '#ef4444' },
  questionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', lineHeight: 24 },
  messagesSection: { backgroundColor: '#fff', paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  messageCount: { fontSize: 13, color: '#9ca3af' },
  
  // 筛选条样式（与问题详情页一致）
  sortFilterBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#fafafa', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  sortFilterLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16 
  },
  sortFilterBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 12 
  },
  sortFilterBtnActive: { 
    backgroundColor: '#fef2f2' 
  },
  sortFilterText: { 
    fontSize: 13, 
    color: '#9ca3af' 
  },
  sortFilterTextActive: { 
    color: '#ef4444', 
    fontWeight: '500' 
  },
  sortFilterCount: { 
    fontSize: 12, 
    color: '#9ca3af' 
  },
  
  // 精选留言样式（已移除，不再显示精选标识）
  messageCard: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6',
  },
  msgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  msgAuthor: { fontSize: 12, fontWeight: '500', color: '#9ca3af' },
  msgTime: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  msgText: { fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 10 },
  msgActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  msgActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msgActionText: { fontSize: 12, color: '#6b7280' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  replyBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: modalTokens.overlay, justifyContent: 'flex-end' },
  replyModal: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, paddingBottom: 34 },
  replyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  replyModalTitle: { fontSize: 16, fontWeight: '600', color: modalTokens.textPrimary },
  replyTargetCard: { flexDirection: 'row', padding: 16, backgroundColor: modalTokens.surfaceSoft, margin: 16, marginBottom: 0, borderRadius: 12, borderWidth: 1, borderColor: modalTokens.border },
  replyTargetAvatar: { width: 32, height: 32, borderRadius: 16 },
  replyTargetInfo: { flex: 1, marginLeft: 10 },
  replyTargetAuthor: { fontSize: 13, fontWeight: '500', color: modalTokens.textPrimary },
  replyTargetContent: { fontSize: 12, color: modalTokens.textSecondary, marginTop: 2, lineHeight: 18 },
  replyInputWrapper: { margin: 16, backgroundColor: modalTokens.surfaceSoft, borderRadius: 12, padding: 12, minHeight: 100, borderWidth: 1, borderColor: modalTokens.border },
  replyInput: { fontSize: 14, color: modalTokens.textPrimary, textAlignVertical: 'top' },
  replyModalFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, gap: 12 },
  replyCancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  replyCancelText: { fontSize: 14, color: modalTokens.textSecondary },
  replySubmitBtn: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  replySubmitBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  replySubmitText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  inputWrapper: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
  input: { fontSize: 14, color: '#1f2937' },
  sendBtn: { backgroundColor: '#ef4444', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
});
