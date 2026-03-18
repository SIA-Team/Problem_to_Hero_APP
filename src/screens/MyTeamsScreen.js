import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { modalTokens } from '../components/modalTokens';
import { showAppAlert } from '../utils/appAlert';

// 我的团队数据
const myTeams = [{
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
  isAdmin: true // 是否是管理员
}, {
  id: 2,
  name: '数据分析实战团队',
  avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=team2',
  role: '成员',
  members: 8,
  questions: 23,
  description: '数据分析实战项目，分享经验与技巧',
  createdAt: '2026-01-05',
  isActive: true,
  creatorId: 2,
  // 创建者ID（不是当前用户）
  currentUserId: 3,
  // 当前用户ID（队长3）
  isAdmin: false // 不是管理员
}];
export default function MyTeamsScreen({
  navigation
}) {
  const [teams, setTeams] = useState(myTeams);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  // 我的问题列表（用于创建团队时选择）
  const myQuestions = [{
    id: 1,
    title: '如何在三个月内从零基础学会Python编程？',
    type: 'reward',
    reward: 50
  }, {
    id: 2,
    title: '第一次养猫需要准备什么？',
    type: 'free'
  }, {
    id: 3,
    title: '35岁程序员如何规划职业发展？',
    type: 'reward',
    reward: 100
  }];
  const handleTeamPress = team => {
    navigation.navigate('TeamDetail', {
      team: team
    });
  };
  const handleCreateTeam = () => {
    handleOpenCreateModal();
  };
  const handleSubmitCreate = () => {
    if (!teamName.trim()) {
      showAppAlert('提示', '请输入团队名称');
      return;
    }
    if (!teamDescription.trim()) {
      showAppAlert('提示', '请输入团队说明');
      return;
    }
    showAppAlert('成功', `团队"${teamName}"创建成功！${selectedQuestions.length > 0 ? `已关联${selectedQuestions.length}个问题` : ''}`);
    handleCloseCreateModal();
    setTeamName('');
    setSelectedQuestions([]);
    setTeamDescription('');
  };
  const handleLeaveTeam = team => {
    showAppAlert('退出团队', `确定要退出"${team.name}"吗？`, [{
      text: '取消',
      style: 'cancel'
    }, {
      text: '退出',
      style: 'destructive',
      onPress: () => {
        setTeams(teams.filter(t => t.id !== team.id));
        showAppAlert('已退出', '您已退出该团队');
      }
    }]);
  };
  const handleDismissTeam = team => {
    showAppAlert('解散团队', `确定要解散"${team.name}"吗？此操作不可恢复。`, [{
      text: '取消',
      style: 'cancel'
    }, {
      text: '解散',
      style: 'destructive',
      onPress: () => {
        setTeams(teams.filter(t => t.id !== team.id));
        showAppAlert('已解散', '团队已解散');
      }
    }]);
  };
  return <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>我的团队</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleCreateTeam} style={styles.createBtn} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }} activeOpacity={0.7}>
              <Text style={styles.createBtnText}>创建</Text>
            </TouchableOpacity>
          </View>
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 团队统计 */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{teams.length}</Text>
            <Text style={styles.statLabel}>加入团队</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{teams.filter(t => t.role === '队长').length}</Text>
            <Text style={styles.statLabel}>创建团队</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{teams.reduce((sum, t) => sum + t.members, 0)}</Text>
            <Text style={styles.statLabel}>团队成员</Text>
          </View>
        </View>

        {/* 团队列表 */}
        <View style={styles.teamsSection}>
          <Text style={styles.sectionTitle}>全部团队 ({teams.length})</Text>
          {teams.map(team => <TouchableOpacity key={team.id} style={styles.teamCard} onPress={() => handleTeamPress(team)} activeOpacity={0.7}>
              <Avatar uri={team.avatar} name={team.name} size={56} />
              <View style={styles.teamInfo}>
                <View style={styles.teamHeader}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <View style={[styles.roleTag, team.role === '队长' && styles.roleTagLeader]}>
                    <Text style={[styles.roleText, team.role === '队长' && styles.roleTextLeader]}>
                      {team.role}
                    </Text>
                  </View>
                </View>
                <Text style={styles.teamDesc} numberOfLines={2}>{team.description}</Text>
                <View style={styles.teamMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{team.members}人</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="chatbubble-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>{team.questions}个问题</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.metaText}>创建于 {team.createdAt}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={e => {
            e.stopPropagation();
            showAppAlert('团队操作', `选择操作`, [{
              text: '查看详情',
              onPress: () => handleTeamPress(team)
            }, {
              text: '团队设置',
              onPress: () => showAppAlert('团队设置', '打开团队设置页面')
            }, team.role === '队长' ? {
              text: '解散团队',
              style: 'destructive',
              onPress: () => handleDismissTeam(team)
            } : {
              text: '退出团队',
              style: 'destructive',
              onPress: () => handleLeaveTeam(team)
            }, {
              text: '取消',
              style: 'cancel'
            }]);
          }}>
                <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </TouchableOpacity>)}
        </View>

        {/* 空状态 */}
        {teams.length === 0 && <View style={styles.emptyState}>
            <Ionicons name="people-circle-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>还没有加入任何团队</Text>
            <Text style={styles.emptyHint}>创建或加入团队，与志同道合的伙伴一起学习</Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreateTeam}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>创建团队</Text>
            </TouchableOpacity>
          </View>}

        <View style={{
        height: 40
      }} />
      </ScrollView>

      {/* 创建团队弹窗 */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseCreateModal}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>创建团队</Text>
            <TouchableOpacity onPress={handleCloseCreateModal} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetContent} contentContainerStyle={styles.sheetContentContainer} keyboardShouldPersistTaps="handled">
          {/* 选择问题 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>选择问题</Text>
            <Text style={styles.formHint}>选择一个或多个您发布的问题作为团队讨论主题（可选）</Text>
            {myQuestions.map(q => {
              const isSelected = selectedQuestions.some(sq => sq.id === q.id);
              return <TouchableOpacity key={q.id} style={[styles.questionOption, isSelected && styles.questionOptionSelected]} onPress={() => {
                if (isSelected) {
                  setSelectedQuestions(selectedQuestions.filter(sq => sq.id !== q.id));
                } else {
                  setSelectedQuestions([...selectedQuestions, q]);
                }
              }}>
                  <View style={styles.questionOptionContent}>
                    {q.type === 'reward' && <View style={styles.rewardTagSmall}>
                        <Text style={styles.rewardTagSmallText}>${q.reward}</Text>
                      </View>}
                    <Text style={styles.questionOptionTitle} numberOfLines={2}>{q.title}</Text>
                  </View>
                  <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                    {Boolean(isSelected) && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>;
            })}
          </View>

          {/* 团队名称 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>团队名称 <Text style={{
                color: '#ef4444'
              }}>*</Text></Text>
            <TextInput style={styles.textInput} placeholder="给团队起个响亮的名字..." placeholderTextColor="#9ca3af" value={teamName} onChangeText={setTeamName} maxLength={30} />
            <Text style={styles.charCount}>{teamName.length}/30</Text>
          </View>

          {/* 团队说明 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>团队说明 <Text style={{
                color: '#ef4444'
              }}>*</Text></Text>
            <TextInput style={styles.textArea} placeholder="介绍一下这个团队的目标和规则..." placeholderTextColor="#9ca3af" value={teamDescription} onChangeText={setTeamDescription} multiline numberOfLines={4} />
          </View>

          <View style={{
            height: 100
          }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={[styles.submitBtn, (!teamName.trim() || !teamDescription.trim()) && styles.submitBtnDisabled]} onPress={handleSubmitCreate} disabled={!teamName.trim() || !teamDescription.trim()}>
              <Text style={styles.submitBtnText}>创建团队</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
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
  headerLeft: {
    width: 40,
    alignItems: 'flex-start'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end'
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937'
  },
  createBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16
  },
  createBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16
  },
  teamsSection: {
    marginTop: 16,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  teamCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
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
  teamAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6'
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1
  },
  roleTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  roleTagLeader: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  roleText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500'
  },
  roleTextLeader: {
    color: '#ef4444'
  },
  teamDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8
  },
  teamMeta: {
    flexDirection: 'row',
    gap: 12
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaText: {
    fontSize: 11,
    color: '#9ca3af'
  },
  moreBtn: {
    padding: 4
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16
  },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40
  },
  // Modal 样式
  modalContainer: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: modalTokens.textPrimary
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 16,
    padding: 4
  },
  sheetContent: {
    flex: 1
  },
  sheetContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border,
    backgroundColor: modalTokens.surface
  },
  formGroup: {
    marginBottom: 20
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  formHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12
  },
  textInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: modalTokens.textPrimary
  },
  charCount: {
    fontSize: 11,
    color: modalTokens.textMuted,
    textAlign: 'right',
    marginTop: 4
  },
  questionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  questionOptionSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  questionOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rewardTagSmall: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  rewardTagSmallText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  questionOptionTitle: {
    flex: 1,
    fontSize: 13,
    color: modalTokens.textPrimary,
    lineHeight: 18
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: modalTokens.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioBtnSelected: {
    borderColor: '#ef4444'
  },
  radioBtnInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444'
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: modalTokens.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkBoxSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#ef4444'
  },
  textArea: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: modalTokens.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  createModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: modalTokens.border
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  submitBtnDisabled: {
    backgroundColor: modalTokens.dangerSoft
  },
  submitBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600'
  }
});