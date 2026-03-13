import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import IdentitySelector from '../components/IdentitySelector';
import { useTranslation } from '../i18n/withTranslation';

// 评论数据
const initialComments = [
  { id: 1, author: '学习者小王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cmt1', content: '写得太好了!我正好在学Python,这个学习路线很清晰,收藏了!', likes: 89, dislikes: 2, shares: 12, bookmarks: 34, time: '30分钟前' },
  { id: 2, author: '数据分析新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cmt2', content: '请问NumPy和Pandas哪个应该先学?', likes: 45, dislikes: 1, shares: 5, bookmarks: 18, time: '1小时前' },
  { id: 3, author: '转行成功', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cmt3', content: '我就是按照类似的路线学的,现在已经入职数据分析岗位了,感谢分享!', likes: 156, dislikes: 3, shares: 28, bookmarks: 67, time: '2小时前' },
  { id: 4, author: '编程小白', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cmt4', content: '廖雪峰的教程确实不错,我也在看', likes: 23, dislikes: 0, shares: 3, bookmarks: 8, time: '3小时前' },
];

// 补充回答数据
const supplementAnswers = [
  { id: 1, author: '资深开发者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sup1', location: '北京', content: '补充一点:学Python的时候一定要多动手写代码,光看不练是学不会的。建议每天至少写100行代码。', likes: 67, dislikes: 1, comments: 8, shares: 15, bookmarks: 28 },
  { id: 2, author: '培训讲师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sup2', location: '上海', content: '关于学习资源,除了廖雪峰的教程,还推荐B站上的黑马程序员Python教程,讲得很详细。', likes: 45, dislikes: 2, comments: 12, shares: 22, bookmarks: 56 },
];

const answerTabs = ['补充回答 (2)', '全部评论 (128)'];

export default function AnswerDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  
  // Generate tabs with translations
  const getTabLabel = (index, count) => {
    if (index === 0) {
      return `${t('screens.answerDetail.tabs.supplements')} (${count})`;
    } else {
      return `${t('screens.answerDetail.tabs.comments')} (${count})`;
    }
  };
  
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0 for supplements, 1 for comments - default to supplements
  const [sortFilter, setSortFilter] = useState('featured'); // featured or latest
  const [liked, setLiked] = useState({});
  const [disliked, setDisliked] = useState({});
  const [bookmarked, setBookmarked] = useState({});
  const [answerLiked, setAnswerLiked] = useState(false);
  const [answerBookmarked, setAnswerBookmarked] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [following, setFollowing] = useState(false);

  // 仲裁相关状态
  const [showArbitrationModal, setShowArbitrationModal] = useState(false);
  const [arbitrationReason, setArbitrationReason] = useState('');
  const [selectedExperts, setSelectedExperts] = useState([]);
  const [expertSearchText, setExpertSearchText] = useState('');

  // 补充回答相关状态
  const [showSupplementAnswerModal, setShowSupplementAnswerModal] = useState(false);
  const [supplementAnswerText, setSupplementAnswerText] = useState('');
  const [supplementIdentity, setSupplementIdentity] = useState('personal');
  const [supplementSelectedTeams, setSupplementSelectedTeams] = useState([]);

  // 提交补充回答
  const handleSubmitSupplementAnswer = () => {
    if (!supplementAnswerText.trim()) return;
    Alert.alert(t('screens.answerDetail.alerts.success'), t('screens.answerDetail.alerts.supplementSubmitted'));
    setSupplementAnswerText('');
    setShowSupplementAnswerModal(false);
  };

  // 可邀请的专家列表
  const expertsList = [
    { id: 1, name: '李明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert1', title: 'Python架构师', verified: true, expertise: 'Python开发' },
    { id: 2, name: '王芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert2', title: '数据科学家', verified: true, expertise: '数据分析' },
    { id: 3, name: '赵强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert3', title: '技术总监', verified: true, expertise: '技术管理' },
    { id: 4, name: '刘洋', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert4', title: 'AI工程师', verified: true, expertise: '机器学习' },
    { id: 5, name: '陈静', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=expert5', title: '全栈开发', verified: true, expertise: 'Web开发' },
  ];

  // 回答信息(实际应从route.params获取)
  const answer = route?.params?.answer || {
    author: 'Python老司机',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1',
    verified: true,
    title: '资深Python开发 · 10年经验',
    content: '作为一个从零开始学Python的过来人,我来分享一下我的经验:\n\n1. 学习时间:如果每天能保证2-3小时的学习时间,3个月完全可以入门并做一些简单的项目。\n\n2. 学习路线:\n- 第1个月:Python基础语法、数据类型、函数、面向对象\n- 第2个月:常用库(NumPy、Pandas)、数据处理\n- 第3个月:实战项目、数据可视化\n\n3. 推荐资源:廖雪峰的Python教程(免费)、《Python编程从入门到实践》',
    likes: 256,
    dislikes: 3,
    shares: 45,
    bookmarks: 89,
    comments: 128,
    views: 1234,
    time: '1小时前',
    adopted: true,
    invitedBy: { name: '张三丰', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=inviter1' }
  };

  // 处理仲裁申请
  const handleSubmitArbitration = () => {
    if (!arbitrationReason.trim()) {
      Alert.alert(t('screens.answerDetail.alerts.hint'), t('screens.answerDetail.alerts.arbitrationReasonRequired'));
      return;
    }
    if (selectedExperts.length < 3) {
      Alert.alert(t('screens.answerDetail.alerts.hint'), t('screens.answerDetail.alerts.minExpertsRequired'));
      return;
    }
    if (selectedExperts.length > 5) {
      Alert.alert(t('screens.answerDetail.alerts.hint'), t('screens.answerDetail.alerts.maxExpertsExceeded'));
      return;
    }

    Alert.alert(t('screens.answerDetail.alerts.success'), t('screens.answerDetail.alerts.arbitrationSubmitted'));
    setShowArbitrationModal(false);
    setArbitrationReason('');
    setSelectedExperts([]);
  };

  // 切换专家选择
  const toggleExpertSelection = (expertId) => {
    if (selectedExperts.includes(expertId)) {
      setSelectedExperts(selectedExperts.filter(id => id !== expertId));
    } else {
      if (selectedExperts.length >= 5) {
        Alert.alert(t('screens.answerDetail.alerts.hint'), t('screens.answerDetail.alerts.maxExpertsExceeded'));
        return;
      }
      setSelectedExperts([...selectedExperts, expertId]);
    }
  };

  // 过滤专家列表
  const filteredExperts = expertsList.filter(expert =>
    expert.name.toLowerCase().includes(expertSearchText.toLowerCase()) ||
    expert.title.toLowerCase().includes(expertSearchText.toLowerCase()) ||
    expert.expertise.toLowerCase().includes(expertSearchText.toLowerCase())
  );

  const handleReply = (comment) => {
    setReplyTarget(comment);
    setShowReplyModal(true);
  };

  const submitReply = () => {
    if (replyText.trim()) {
      Alert.alert(t('screens.answerDetail.alerts.success'), t('screens.answerDetail.alerts.replyPublished'));
      setReplyText('');
      setShowReplyModal(false);
    }
  };

  const handleComment = () => {
    if (inputText.trim()) {
      const newComment = {
        id: comments.length + 1,
        author: '我',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
        content: inputText,
        likes: 0,
        dislikes: 0,
        shares: 0,
        bookmarks: 0,
        time: t('screens.answerDetail.time.justNow')
      };
      setComments([newComment, ...comments]);
      setInputText('');
      Alert.alert(t('screens.answerDetail.alerts.success'), t('screens.answerDetail.alerts.commentPublished'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.answerDetail.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="arrow-redo-outline" size={22} color="#6b7280" />
            <Text style={styles.shareBtnText}>{answer.shares}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="flag-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 回答内容 */}
        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <Image source={{ uri: answer.avatar }} style={styles.answerAvatar} />
            <View style={styles.answerAuthorInfo}>
              <View style={styles.answerAuthorRow}>
                <Text style={styles.answerAuthor}>{answer.author}</Text>
                {answer.verified && <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />}
                
                {/* 采纳按钮 - 放在用户名后面 */}
                <TouchableOpacity 
                  style={styles.adoptAnswerBtn}
                  onPress={() => {
                    Alert.alert(t('screens.answerDetail.alerts.adoptAnswerTitle'), t('screens.answerDetail.alerts.adoptAnswerMessage'), [
                      { text: t('screens.answerDetail.alerts.cancel'), style: 'cancel' },
                      { text: t('screens.answerDetail.alerts.confirm'), onPress: () => console.log('采纳答案') }
                    ]);
                  }}
                >
                  <Text style={styles.adoptAnswerBtnText}>{t('screens.answerDetail.actions.adopt')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.answerAuthorTitle}>{answer.title}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={() => setFollowing(!following)}
            >
              <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                {following ? t('screens.answerDetail.actions.following') : t('screens.answerDetail.actions.follow')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.answerContent}>{answer.content}</Text>

          {/* 时间和标签区域 - 合并在一行 */}
          <View style={styles.answerMetaWithBadges}>
            <View style={styles.answerMetaLeft}>
              <Ionicons name="eye-outline" size={14} color="#9ca3af" />
              <Text style={styles.answerViews}>{answer.views || 0} {t('screens.answerDetail.stats.views')}</Text>
              <Text style={styles.answerMetaSeparator}>·</Text>
              <Text style={styles.answerTime}>{answer.time}</Text>
            </View>
            
            {/* 标签区域 - 放在右侧 */}
            <View style={styles.badgesSectionRight}>
              {/* 已采纳标签 */}
              {answer.adopted && (
                <View style={styles.adoptedBadgeCompact}>
                  <Text style={styles.adoptedBadgeCompactText}>{t('screens.answerDetail.badges.adopted')}</Text>
                </View>
              )}
              
              {/* 邀请者标签 */}
              {answer.invitedBy && (
                <View style={styles.inviterBadgeCompact}>
                  <Image source={{ uri: answer.invitedBy.avatar }} style={styles.inviterAvatarCompact} />
                  <Text style={styles.inviterTextCompact}>{t('screens.answerDetail.badges.invitedBy').replace('{name}', answer.invitedBy.name)}</Text>
                </View>
              )}

              {/* 仲裁按钮 */}
              {answer.adopted && (
                <TouchableOpacity 
                  style={styles.arbitrationBtnCompact}
                  onPress={() => setShowArbitrationModal(true)}
                >
                  <Ionicons name="gavel-outline" size={12} color="#6b7280" />
                  <Text style={styles.arbitrationBtnTextCompact}>{t('screens.answerDetail.actions.arbitration')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Tab标签 */}
        <View style={styles.tabsSection}>
          <View style={styles.tabs}>
            {[0, 1].map(tabIndex => {
              const count = tabIndex === 0 ? supplementAnswers.length : comments.length;
              const label = getTabLabel(tabIndex, count);
              return (
                <TouchableOpacity 
                  key={tabIndex} 
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tabIndex)}
                >
                  <Text style={[styles.tabText, activeTab === tabIndex && styles.tabTextActive]}>{label}</Text>
                  {activeTab === tabIndex && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 筛选条 */}
          <View style={styles.sortFilterBar}>
            <View style={styles.sortFilterLeft}>
              <TouchableOpacity 
                style={[styles.sortFilterBtn, sortFilter === 'featured' && styles.sortFilterBtnActive]}
                onPress={() => setSortFilter('featured')}
              >
                <Ionicons name="star" size={14} color={sortFilter === 'featured' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, sortFilter === 'featured' && styles.sortFilterTextActive]}>{t('screens.answerDetail.filter.featured')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortFilterBtn, sortFilter === 'latest' && styles.sortFilterBtnActive]}
                onPress={() => setSortFilter('latest')}
              >
                <Ionicons name="time" size={14} color={sortFilter === 'latest' ? '#ef4444' : '#9ca3af'} />
                <Text style={[styles.sortFilterText, sortFilter === 'latest' && styles.sortFilterTextActive]}>{t('screens.answerDetail.filter.latest')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sortFilterCount}>
              {activeTab === 0 ? t('screens.answerDetail.stats.supplementCount').replace('{count}', supplementAnswers.length) : t('screens.answerDetail.stats.commentCount').replace('{count}', comments.length)}
            </Text>
          </View>
        </View>

        {/* 内容区域 */}
        <View style={styles.contentSection}>
          {activeTab === 0 ? (
            // 补充回答列表
            <>
              {supplementAnswers.map(supplement => (
                <View key={supplement.id} style={styles.supplementCard}>
                  <View style={styles.supplementHeader}>
                    <Image source={{ uri: supplement.avatar }} style={styles.supplementAvatar} />
                    <View style={styles.supplementAuthorInfo}>
                      <View style={styles.supplementAuthorRow}>
                        <Text style={styles.supplementAuthor}>{supplement.author}</Text>
                        
                        {/* 采纳按钮 - 放在用户名后面 */}
                        <TouchableOpacity 
                          style={styles.adoptAnswerBtn}
                          onPress={() => {
                            Alert.alert(t('screens.answerDetail.alerts.adoptSupplementTitle'), t('screens.answerDetail.alerts.adoptSupplementMessage'), [
                              { text: t('screens.answerDetail.alerts.cancel'), style: 'cancel' },
                              { text: t('screens.answerDetail.alerts.confirm'), onPress: () => console.log('采纳补充回答') }
                            ]);
                          }}
                        >
                          <Text style={styles.adoptAnswerBtnText}>{t('screens.answerDetail.actions.adopt')}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.supplementMeta}>
                        <Ionicons name="location-outline" size={12} color="#9ca3af" />
                        <Text style={styles.supplementLocation}>{supplement.location}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.supplementContent}>{supplement.content}</Text>
                  <View style={styles.supplementActions}>
                    <View style={styles.supplementActionsLeft}>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="thumbs-up-outline" size={16} color="#6b7280" />
                        <Text style={styles.supplementActionText}>{supplement.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
                        <Text style={styles.supplementActionText}>{supplement.comments}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="arrow-redo-outline" size={16} color="#6b7280" />
                        <Text style={styles.supplementActionText}>{supplement.shares}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="star-outline" size={16} color="#6b7280" />
                        <Text style={styles.supplementActionText}>{supplement.bookmarks}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.supplementActionsRight}>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="thumbs-down-outline" size={16} color="#6b7280" />
                        <Text style={styles.supplementActionText}>{supplement.dislikes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.supplementActionBtn}>
                        <Ionicons name="flag-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          ) : (
            // 评论列表
            <>
              {comments.map(comment => (
                <View key={comment.id} style={styles.commentCard}>
                  <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.author}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <View style={styles.commentActions}>
                      <View style={styles.commentActionsLeft}>
                        <TouchableOpacity 
                          style={styles.commentActionBtn}
                          onPress={() => setLiked({ ...liked, [comment.id]: !liked[comment.id] })}
                        >
                          <Ionicons 
                            name={liked[comment.id] ? "thumbs-up" : "thumbs-up-outline"} 
                            size={14} 
                            color={liked[comment.id] ? "#ef4444" : "#9ca3af"} 
                          />
                          <Text style={[styles.commentActionText, liked[comment.id] && { color: '#ef4444' }]}>
                            {comment.likes + (liked[comment.id] ? 1 : 0)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.commentActionBtn}
                          onPress={() => handleReply(comment)}
                        >
                          <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{t('screens.answerDetail.actions.reply')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn}>
                          <Ionicons name="arrow-redo-outline" size={14} color="#9ca3af" />
                          <Text style={styles.commentActionText}>{comment.shares}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.commentActionBtn}
                          onPress={() => setBookmarked({ ...bookmarked, [comment.id]: !bookmarked[comment.id] })}
                        >
                          <Ionicons 
                            name={bookmarked[comment.id] ? "bookmark" : "bookmark-outline"} 
                            size={14} 
                            color={bookmarked[comment.id] ? "#f59e0b" : "#9ca3af"} 
                          />
                          <Text style={[styles.commentActionText, bookmarked[comment.id] && { color: '#f59e0b' }]}>
                            {comment.bookmarks + (bookmarked[comment.id] ? 1 : 0)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.commentActionsRight}>
                        <TouchableOpacity 
                          style={styles.commentActionBtn}
                          onPress={() => setDisliked({ ...disliked, [comment.id]: !disliked[comment.id] })}
                        >
                          <Ionicons 
                            name={disliked[comment.id] ? "thumbs-down" : "thumbs-down-outline"} 
                            size={14} 
                            color="#9ca3af" 
                          />
                          <Text style={styles.commentActionText}>{comment.dislikes + (disliked[comment.id] ? 1 : 0)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentActionBtn}>
                          <Ionicons name="flag-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* 底部栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <TouchableOpacity 
            style={styles.bottomIconBtn}
            onPress={() => setAnswerLiked(!answerLiked)}
          >
            <Ionicons 
              name={answerLiked ? "thumbs-up" : "thumbs-up-outline"} 
              size={20} 
              color={answerLiked ? "#ef4444" : "#6b7280"} 
            />
            <Text style={[styles.bottomIconText, answerLiked && { color: '#ef4444' }]}>
              {answer.likes + (answerLiked ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.bottomIconBtn}
            onPress={() => setAnswerBookmarked(!answerBookmarked)}
          >
            <Ionicons 
              name={answerBookmarked ? "star" : "star-outline"} 
              size={20} 
              color={answerBookmarked ? "#f59e0b" : "#6b7280"} 
            />
            <Text style={[styles.bottomIconText, answerBookmarked && { color: '#f59e0b' }]}>
              {(answer.bookmarks || 0) + (answerBookmarked ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomIconBtn}>
            <Ionicons name="thumbs-down-outline" size={20} color="#6b7280" />
            <Text style={styles.bottomIconText}>{answer.dislikes || 0}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomBarRight}>
          <TouchableOpacity 
            style={styles.bottomCommentInput}
            onPress={() => {
              // 可以打开评论输入弹窗或聚焦输入框
            }}
          >
            <Text style={styles.bottomCommentPlaceholder}>{t('screens.answerDetail.placeholders.writeComment')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.bottomSupplementBtn}
            onPress={() => {
              setShowSupplementAnswerModal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.bottomSupplementBtnText}>{t('screens.answerDetail.actions.supplementAnswer')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 回复弹窗 */}
      <Modal visible={showReplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.replyModal}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>{t('screens.answerDetail.modals.replyTitle').replace('{author}', replyTarget?.author || '')}</Text>
              <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.replyInput}
              placeholder={t('screens.answerDetail.placeholders.writeReply')}
              placeholderTextColor="#9ca3af"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
            />
            <TouchableOpacity 
              style={[styles.replySubmitBtn, !replyText.trim() && styles.replySubmitBtnDisabled]}
              onPress={submitReply}
              disabled={!replyText.trim()}
            >
              <Text style={styles.replySubmitText}>{t('screens.answerDetail.actions.publish')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 申请仲裁弹窗 */}
      <Modal visible={showArbitrationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.arbitrationModal}>
            <View style={styles.arbitrationModalHandle} />
            <View style={styles.arbitrationModalHeader}>
              <Text style={styles.arbitrationModalTitle}>{t('screens.answerDetail.modals.arbitrationTitle')}</Text>
              <TouchableOpacity onPress={() => setShowArbitrationModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.arbitrationContent} showsVerticalScrollIndicator={false}>
              {/* 说明 */}
              <View style={styles.arbitrationInfo}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.arbitrationInfoText}>
                  {t('screens.answerDetail.arbitration.info')}
                </Text>
              </View>

              {/* 仲裁理由 */}
              <Text style={styles.arbitrationSectionTitle}>{t('screens.answerDetail.arbitration.reasonLabel')}</Text>
              <TextInput
                style={styles.arbitrationReasonInput}
                placeholder={t('screens.answerDetail.placeholders.arbitrationReason')}
                placeholderTextColor="#9ca3af"
                value={arbitrationReason}
                onChangeText={setArbitrationReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* 邀请专家 */}
              <View style={styles.arbitrationExpertsHeader}>
                <Text style={styles.arbitrationSectionTitle}>{t('screens.answerDetail.arbitration.inviteExpertsLabel')}</Text>
                <Text style={styles.arbitrationExpertsCount}>
                  {t('screens.answerDetail.arbitration.expertsCount').replace('{count}', selectedExperts.length)}
                </Text>
              </View>

              {/* 专家搜索框 */}
              <View style={styles.expertSearchBox}>
                <Ionicons name="search-outline" size={18} color="#9ca3af" />
                <TextInput
                  style={styles.expertSearchInput}
                  placeholder={t('screens.answerDetail.placeholders.searchExpert')}
                  placeholderTextColor="#9ca3af"
                  value={expertSearchText}
                  onChangeText={setExpertSearchText}
                />
                {expertSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setExpertSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 推荐专家标题 */}
              <View style={styles.recommendedExpertsHeader}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.recommendedExpertsTitle}>{t('screens.answerDetail.arbitration.recommendedExperts')}</Text>
              </View>

              {expertsList
                .filter(expert => {
                  if (!expertSearchText) return true;
                  const searchLower = expertSearchText.toLowerCase();
                  return (
                    expert.name.toLowerCase().includes(searchLower) ||
                    expert.title.toLowerCase().includes(searchLower) ||
                    expert.expertise.toLowerCase().includes(searchLower)
                  );
                })
                .map(expert => (
                <TouchableOpacity
                  key={expert.id}
                  style={[
                    styles.expertItem,
                    selectedExperts.includes(expert.id) && styles.expertItemSelected
                  ]}
                  onPress={() => toggleExpertSelection(expert.id)}
                >
                  <Avatar uri={expert.avatar} name={expert.name} size={44} />
                  <View style={styles.expertInfo}>
                    <View style={styles.expertNameRow}>
                      <Text style={styles.expertName}>{expert.name}</Text>
                      {expert.verified && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                    </View>
                    <Text style={styles.expertTitle}>{expert.title}</Text>
                    <Text style={styles.expertExpertise}>{t('screens.answerDetail.arbitration.expertiseLabel')}{expert.expertise}</Text>
                  </View>
                  <View style={[
                    styles.expertCheckbox,
                    selectedExperts.includes(expert.id) && styles.expertCheckboxSelected
                  ]}>
                    {selectedExperts.includes(expert.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* 搜索无结果提示 */}
              {expertSearchText && expertsList.filter(expert => {
                const searchLower = expertSearchText.toLowerCase();
                return (
                  expert.name.toLowerCase().includes(searchLower) ||
                  expert.title.toLowerCase().includes(searchLower) ||
                  expert.expertise.toLowerCase().includes(searchLower)
                );
              }).length === 0 && (
                <View style={styles.noExpertsFound}>
                  <Ionicons name="search-outline" size={32} color="#d1d5db" />
                  <Text style={styles.noExpertsFoundText}>{t('screens.answerDetail.arbitration.noExpertsFound')}</Text>
                  <Text style={styles.noExpertsFoundDesc}>{t('screens.answerDetail.arbitration.tryOtherKeywords')}</Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.arbitrationModalFooter}>
              <TouchableOpacity
                style={[
                  styles.submitArbitrationBtn,
                  (!arbitrationReason.trim() || selectedExperts.length < 3) && styles.submitArbitrationBtnDisabled
                ]}
                onPress={handleSubmitArbitration}
                disabled={!arbitrationReason.trim() || selectedExperts.length < 3}
              >
                <Text style={styles.submitArbitrationBtnText}>
                  {t('screens.answerDetail.arbitration.submitButton')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelArbitrationBtn}
                onPress={() => {
                  setShowArbitrationModal(false);
                  setArbitrationReason('');
                  setSelectedExperts([]);
                }}
              >
                <Text style={styles.cancelArbitrationBtnText}>{t('screens.answerDetail.alerts.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 补充回答弹窗 */}
      <Modal visible={showSupplementAnswerModal} animationType="slide">
        <SafeAreaView style={styles.answerModal}>
          <View style={styles.answerModalHeader}>
            <TouchableOpacity 
              onPress={() => { 
                setShowSupplementAnswerModal(false); 
                setSupplementAnswerText('');
              }} 
              style={styles.answerCloseBtn}
            >
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.answerHeaderCenter}>
              <Text style={styles.answerModalTitle}>补充回答</Text>
            </View>
            <TouchableOpacity 
              style={[styles.answerPublishBtn, !supplementAnswerText.trim() && styles.answerPublishBtnDisabled]}
              onPress={handleSubmitSupplementAnswer}
              disabled={!supplementAnswerText.trim()}
            >
              <Text style={[styles.answerPublishText, !supplementAnswerText.trim() && styles.answerPublishTextDisabled]}>发布</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.supplementAnswerContext}>
            <View style={styles.supplementAnswerHeader}>
              <Ionicons name="document-text" size={18} color="#3b82f6" />
              <Text style={styles.supplementAnswerLabel}>原回答</Text>
            </View>
            <View style={styles.supplementAnswerAuthor}>
              <Avatar uri={answer.avatar} name={answer.author} size={24} />
              <Text style={styles.supplementAnswerAuthorName}>{answer.author}</Text>
            </View>
            <Text style={styles.supplementAnswerContent} numberOfLines={3}>{answer.content}</Text>
          </View>

          <ScrollView style={styles.answerContentArea} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.answerTextInput}
              placeholder="补充你的回答，提供更多信息..."
              placeholderTextColor="#bbb"
              value={supplementAnswerText}
              onChangeText={setSupplementAnswerText}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            
            {/* 身份选择器 */}
            <View style={styles.answerIdentitySection}>
              <IdentitySelector
                selectedIdentity={supplementIdentity}
                selectedTeams={supplementSelectedTeams}
                onIdentityChange={setSupplementIdentity}
                onTeamsChange={setSupplementSelectedTeams}
              />
            </View>
          </ScrollView>

          <View style={styles.answerToolbar}>
            <View style={styles.answerToolsLeft}>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="image-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="at-outline" size={24} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.answerToolItem}>
                <Ionicons name="pricetag-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerWordCount}>{supplementAnswerText.length}/2000</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 80, justifyContent: 'flex-end' },
  shareBtn: { padding: 4, flexDirection: 'row', alignItems: 'center', gap: 2 },
  shareBtnText: { fontSize: 12, color: '#6b7280' },
  content: { flex: 1 },
  answerSection: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  // 时间和标签合并区域
  answerMetaWithBadges: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  answerMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgesSectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  // 标签区域样式 - 紧凑版
  badgesSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  adoptedBadgeCompact: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adoptedBadgeCompactText: { fontSize: 11, color: '#22c55e', fontWeight: '600' },
  inviterBadgeCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  inviterAvatarCompact: { width: 14, height: 14, borderRadius: 7 },
  inviterTextCompact: { fontSize: 10, color: '#3b82f6', fontWeight: '500', textAlign: 'center' },
  arbitrationBtnCompact: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  arbitrationBtnTextCompact: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  inviterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 12, alignSelf: 'flex-start' },
  inviterAvatar: { width: 16, height: 16, borderRadius: 8 },
  inviterText: { fontSize: 12, color: '#3b82f6', fontWeight: '500' },
  answerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  answerAvatar: { width: 48, height: 48, borderRadius: 24 },
  answerAuthorInfo: { flex: 1, marginLeft: 12 },
  answerAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  answerAuthor: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  // 采纳按钮样式 - 与问题详情页一致
  adoptAnswerBtn: { 
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 4, 
    paddingVertical: 0, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#22c55e',
    marginLeft: 6
  },
  adoptAnswerBtnText: { 
    fontSize: 12, 
    color: '#22c55e', 
    fontWeight: '700',
    letterSpacing: 0.2
  },
  answerAuthorTitle: { fontSize: 13, color: '#9ca3af' },
  followBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  followBtnActive: { backgroundColor: '#f3f4f6' },
  followBtnText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  followBtnTextActive: { color: '#6b7280' },
  adoptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  adoptedText: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  answerContent: { fontSize: 15, color: '#374151', lineHeight: 24, marginBottom: 12 },
  answerMeta: { marginBottom: 12 },
  answerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answerViews: { fontSize: 13, color: '#9ca3af' },
  answerMetaSeparator: { fontSize: 13, color: '#d1d5db', marginHorizontal: 2 },
  answerTime: { fontSize: 13, color: '#9ca3af' },
  tabsSection: { backgroundColor: '#fff', marginBottom: 8 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tabItem: { flex: 1, paddingVertical: 12, position: 'relative', alignItems: 'center' },
  tabText: { fontSize: 14, color: '#6b7280' },
  tabTextActive: { color: '#ef4444', fontWeight: '600' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#ef4444', borderRadius: 1 },
  sortFilterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sortFilterLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sortFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  sortFilterBtnActive: { backgroundColor: '#fef2f2' },
  sortFilterText: { fontSize: 13, color: '#9ca3af' },
  sortFilterTextActive: { color: '#ef4444', fontWeight: '500' },
  sortFilterCount: { fontSize: 12, color: '#9ca3af' },
  contentSection: { backgroundColor: '#fff' },
  supplementCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  supplementHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  supplementAvatar: { width: 40, height: 40, borderRadius: 20 },
  supplementAuthorInfo: { flex: 1, marginLeft: 12 },
  supplementAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  supplementAuthor: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  supplementMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  supplementLocation: { fontSize: 12, color: '#9ca3af' },
  supplementContent: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  supplementActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supplementActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  supplementActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  supplementActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  supplementActionText: { fontSize: 13, color: '#6b7280' },
  commentCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  commentTime: { fontSize: 12, color: '#9ca3af' },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  commentActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  commentActionsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionText: { fontSize: 12, color: '#9ca3af' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  bottomBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bottomBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginLeft: 16 },
  bottomIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bottomIconText: { fontSize: 12, color: '#6b7280' },
  bottomCommentInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  bottomCommentPlaceholder: { fontSize: 13, color: '#9ca3af' },
  bottomSupplementBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  bottomSupplementBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  replyModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '60%' },
  replyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  replyModalTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  replyInput: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, fontSize: 14, color: '#1f2937', minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  replySubmitBtn: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  replySubmitBtnDisabled: { backgroundColor: '#fca5a5' },
  replySubmitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  // 仲裁申请弹窗样式
  arbitrationModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  arbitrationModalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  arbitrationModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  arbitrationModalTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
  arbitrationContent: { maxHeight: 500, paddingHorizontal: 20, paddingTop: 16 },
  arbitrationInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe' },
  arbitrationInfoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 20 },
  arbitrationSectionTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 10 },
  arbitrationReasonInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#1f2937', minHeight: 100, marginBottom: 20 },
  arbitrationExpertsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  arbitrationExpertsCount: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  expertSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, gap: 8 },
  expertSearchInput: { flex: 1, fontSize: 14, color: '#1f2937', padding: 0 },
  recommendedExpertsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  recommendedExpertsTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  noExpertsFound: { alignItems: 'center', paddingVertical: 40 },
  noExpertsFoundText: { fontSize: 15, fontWeight: '500', color: '#6b7280', marginTop: 12 },
  noExpertsFoundDesc: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  expertItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  expertItemSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6', borderWidth: 2 },
  expertInfo: { flex: 1, marginLeft: 12 },
  expertNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  expertName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  expertTitle: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  expertExpertise: { fontSize: 11, color: '#9ca3af' },
  expertCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  expertCheckboxSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  arbitrationModalFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  submitArbitrationBtn: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  submitArbitrationBtnDisabled: { backgroundColor: '#fca5a5' },
  submitArbitrationBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  cancelArbitrationBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelArbitrationBtnText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  // 补充回答弹窗样式
  answerModal: { flex: 1, backgroundColor: '#fff' },
  answerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  answerCloseBtn: { padding: 4, zIndex: 10 },
  answerHeaderCenter: { flex: 1, alignItems: 'center' },
  answerModalTitle: { fontSize: 17, fontWeight: '600', color: '#222' },
  answerPublishBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, zIndex: 1 },
  answerPublishBtnDisabled: { backgroundColor: '#ffcdd2' },
  answerPublishText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  answerPublishTextDisabled: { color: '#fff' },
  answerContentArea: { flex: 1, backgroundColor: '#fff' },
  answerTextInput: { padding: 16, fontSize: 16, color: '#333', lineHeight: 26, minHeight: 300 },
  answerIdentitySection: { paddingHorizontal: 16, paddingBottom: 16 },
  answerToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
  answerToolsLeft: { flexDirection: 'row', alignItems: 'center' },
  answerToolItem: { padding: 10 },
  answerWordCount: { fontSize: 13, color: '#999' },
  supplementAnswerContext: { backgroundColor: '#f0f9ff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0f2fe' },
  supplementAnswerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  supplementAnswerLabel: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  supplementAnswerAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  supplementAnswerAuthorName: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  supplementAnswerContent: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
});
