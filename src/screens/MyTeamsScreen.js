import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { modalTokens } from '../components/modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import teamApi from '../services/api/teamApi';
import { showAppAlert } from '../utils/appAlert';
import { isVisibleMyTeam, mapTeamToDetailRoute, normalizeMyTeam } from '../utils/teamTransforms';
import { executeTeamExitFlow, getTransferLeaderCandidates } from '../utils/teamExit';
import { formatAmount } from '../utils/rewardAmount';

import { scaleFont } from '../utils/responsive';
/*
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
*/
export default function MyTeamsScreen({
  navigation
}) {
  const bottomSafeInset = useBottomSafeInset(20);
  const [teams, setTeams] = useState([]);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [hasLoadedMyTeams, setHasLoadedMyTeams] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [exitConfirmTeam, setExitConfirmTeam] = useState(null);
  const [exitConfirmRequiresTransfer, setExitConfirmRequiresTransfer] = useState(false);
  const [showTransferLeaderModal, setShowTransferLeaderModal] = useState(false);
  const [selectedExitTeam, setSelectedExitTeam] = useState(null);
  const [selectedNewLeader, setSelectedNewLeader] = useState(null);
  const [exitSubmitting, setExitSubmitting] = useState(false);
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };
  const transferLeaderCandidates = React.useMemo(() => getTransferLeaderCandidates([selectedExitTeam?.teamMembers, selectedExitTeam?.memberList, selectedExitTeam?.members]), [selectedExitTeam]);
  const selectedNewLeaderMember = React.useMemo(() => transferLeaderCandidates.find(member => String(member.userId) === String(selectedNewLeader)) || null, [selectedNewLeader, transferLeaderCandidates]);
  const isTeamLeader = team => Boolean(team?.isLeader) || team?.role === '\u961f\u957f' || team?.role === '闃熼暱' || Number(team?.userRole) === 3;
  const visibleTeams = React.useMemo(() => teams.filter(isVisibleMyTeam), [teams]);
  const createdTeamCount = React.useMemo(() => visibleTeams.filter(team => isTeamLeader(team)).length, [visibleTeams]);
  const totalTeamMembers = React.useMemo(() => visibleTeams.reduce((sum, team) => sum + (Number(team?.members) || 0), 0), [visibleTeams]);
  useFocusEffect(React.useCallback(() => {
    let isActive = true;
    const loadMyTeams = async () => {
      try {
        setLoadingMyTeams(true);
        const response = await teamApi.getMyTeams();
        const isSuccess = response?.code === 0 || response?.code === 200;

        if (!isSuccess) {
          throw new Error(response?.msg || 'Failed to fetch my teams');
        }

        const teamList = Array.isArray(response?.data) ? response.data : [];
        const normalizedTeams = teamList.map(team => normalizeMyTeam(team));

        if (!isActive) {
          return;
        }

        setTeams(normalizedTeams);
        setHasLoadedMyTeams(true);
      } catch (requestError) {
        console.error('Failed to fetch my teams:', requestError);

        if (!isActive) {
          return;
        }

        setHasLoadedMyTeams(true);
      } finally {
        if (isActive) {
          setLoadingMyTeams(false);
        }
      }
    };

    loadMyTeams();

    return () => {
      isActive = false;
    };
  }, []));
  const closeExitConfirmModal = () => {
    setShowExitConfirmModal(false);
    setExitConfirmTeam(null);
    setExitConfirmRequiresTransfer(false);
  };
  const openExitConfirmModal = (team, requiresTransfer) => {
    setExitConfirmTeam(team);
    setExitConfirmRequiresTransfer(Boolean(requiresTransfer));
    setTimeout(() => {
      setShowExitConfirmModal(true);
    }, 180);
  };
  const closeTransferLeaderModal = () => {
    setShowTransferLeaderModal(false);
    setSelectedExitTeam(null);
    setSelectedNewLeader(null);
  };
  const openTransferLeaderModal = team => {
    setSelectedExitTeam(team);
    setSelectedNewLeader(null);
    setTimeout(() => {
      setShowTransferLeaderModal(true);
    }, 180);
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
    navigation.navigate('TeamDetail', mapTeamToDetailRoute(team));
  };
  const handleCreateTeam = () => {
    handleOpenCreateModal();
  };
  const handleSubmitCreate = () => {
    submitCreateTeam();
  };
  const submitCreateTeam = async () => {
    const trimmedName = teamName.trim();
    const trimmedDescription = teamDescription.trim();

    if (!trimmedName) {
      showAppAlert('\u63d0\u793a', '\u8bf7\u8f93\u5165\u56e2\u961f\u540d\u79f0');
      return;
    }

    try {
      setCreatingTeam(true);
      const response = await teamApi.createTeam({
        questionIds: selectedQuestions.map(question => question.id),
        name: trimmedName,
        description: trimmedDescription,
        avatar: '',
        maxMembers: 0
      });
      const isSuccess = response?.code === 0 || response?.code === 200;

      if (!isSuccess || !response?.data) {
        throw new Error(response?.msg || 'Failed to create team');
      }

      const createdTeam = normalizeMyTeam(response.data);
      setTeams(prevTeams => [createdTeam, ...prevTeams.filter(team => String(team.id) !== String(createdTeam.id))]);
      handleCloseCreateModal();
      setTeamName('');
      setSelectedQuestions([]);
      setTeamDescription('');
      showAppAlert('\u6210\u529f', `\u56e2\u961f"${createdTeam.name}"\u521b\u5efa\u6210\u529f\uff01`);
    } catch (requestError) {
      console.error('Failed to create team from my teams screen:', requestError);
      showAppAlert('\u63d0\u793a', requestError?.message || '\u521b\u5efa\u56e2\u961f\u5931\u8d25');
    } finally {
      setCreatingTeam(false);
    }
  };
  const handleExitTeamRequest = async (team, newCaptainUserId) => {
    try {
      setExitSubmitting(true);
      await executeTeamExitFlow({
        teamId: team?.id,
        newCaptainUserId,
      });
      setTeams(prevTeams => prevTeams.filter(item => String(item.id) !== String(team.id)));
      closeTransferLeaderModal();
      showAppAlert('\u6210\u529f', '\u60a8\u5df2\u9000\u51fa\u8be5\u56e2\u961f');
      return true;
    } catch (requestError) {
      console.error('Failed to exit team from my teams screen:', requestError);
      showAppAlert('\u63d0\u793a', requestError?.message || '\u9000\u51fa\u56e2\u961f\u5931\u8d25');
      return false;
    } finally {
      setExitSubmitting(false);
    }
  };
  const handleLeaveTeam = team => {
    if (exitSubmitting) {
      return;
    }

    if (isTeamLeader(team)) {
      const nextLeaderCandidates = getTransferLeaderCandidates([team?.teamMembers, team?.memberList, team?.members]);

      if (nextLeaderCandidates.length === 0) {
        showAppAlert('\u63d0\u793a', '\u5f53\u524d\u6682\u65e0\u53ef\u79fb\u4ea4\u7684\u56e2\u5458\uff0c\u65e0\u6cd5\u9000\u51fa\u56e2\u961f');
        return;
      }

      openExitConfirmModal(team, true);
      return;
    }

    openExitConfirmModal(team, false);
  };
  const handleConfirmExitModal = async () => {
    const currentTeam = exitConfirmTeam;
    const requiresTransfer = exitConfirmRequiresTransfer;

    closeExitConfirmModal();

    if (!currentTeam) {
      return;
    }

    if (requiresTransfer) {
      openTransferLeaderModal(currentTeam);
      return;
    }

    await handleExitTeamRequest(currentTeam);
  };
  const handleConfirmTransferLeader = async () => {
    if (!selectedExitTeam) {
      return;
    }

    if (!selectedNewLeaderMember?.userId) {
      showAppAlert('\u63d0\u793a', '\u8bf7\u9009\u62e9\u65b0\u7684\u961f\u957f');
      return;
    }

    await handleExitTeamRequest(selectedExitTeam, selectedNewLeaderMember.userId);
  };
  const handleOpenTeamActions = team => {
    showAppAlert('\u56e2\u961f\u64cd\u4f5c', '\u9009\u62e9\u64cd\u4f5c', [{
      text: '\u67e5\u770b\u8be6\u60c5',
      onPress: () => handleTeamPress(team)
    }, {
      text: '\u56e2\u961f\u8bbe\u7f6e',
      onPress: () => showAppAlert('\u56e2\u961f\u8bbe\u7f6e', '\u6253\u5f00\u56e2\u961f\u8bbe\u7f6e\u9875\u9762')
    }, {
      text: '\u9000\u51fa\u56e2\u961f',
      style: 'destructive',
      onPress: () => handleLeaveTeam(team)
    }, {
      text: '\u53d6\u6d88',
      style: 'cancel'
    }]);
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
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
            <Text style={styles.statValue}>{visibleTeams.length}</Text>
            <Text style={styles.statLabel}>加入团队</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{createdTeamCount}</Text>
            <Text style={styles.statLabel}>创建团队</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalTeamMembers}</Text>
            <Text style={styles.statLabel}>团队成员</Text>
          </View>
        </View>

        {/* 团队列表 */}
        <View style={styles.teamsSection}>
          <Text style={styles.sectionTitle}>全部团队 ({visibleTeams.length})</Text>
          {visibleTeams.map(team => <TouchableOpacity key={team.id} style={styles.teamCard} onPress={() => handleTeamPress(team)} activeOpacity={0.7}>
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
                  {team.createdAt ? <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>创建于 {team.createdAt}</Text>
                    </View> : null}
                </View>
              </View>
              <TouchableOpacity style={styles.moreBtn} onPress={e => {
            e.stopPropagation();
            handleOpenTeamActions(team);
          }}>
                <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </TouchableOpacity>)}
        </View>

        {/* 空状态 */}
        {hasLoadedMyTeams && !loadingMyTeams && visibleTeams.length === 0 && <View style={styles.emptyState}>
            <Ionicons name="people-circle-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>还没有加入任何团队</Text>
            <Text style={styles.emptyHint}>创建或加入团队，与志同道合的伙伴一起学习</Text>
          </View>}

      <View style={{
        height: 40
      }} />
      </ScrollView>

      <Modal visible={showExitConfirmModal} animationType="fade" transparent onRequestClose={() => {
      if (!exitSubmitting) {
        closeExitConfirmModal();
      }
    }}>
        <View style={styles.exitConfirmOverlay}>
          <View style={styles.exitConfirmCard}>
            <Text style={styles.exitConfirmTitle}>{'\u9000\u51fa\u56e2\u961f'}</Text>
            <Text style={styles.exitConfirmMessage}>
              {exitConfirmRequiresTransfer ? '\u8bf7\u6307\u5b9a\u4e00\u4eba\u4e3a\u961f\u957f' : `\u786e\u5b9a\u8981\u9000\u51fa"${exitConfirmTeam?.name || ''}"\u5417\uff1f`}
            </Text>
            <View style={styles.exitConfirmActions}>
              <TouchableOpacity style={styles.exitConfirmCancelBtn} onPress={closeExitConfirmModal} disabled={exitSubmitting} activeOpacity={0.85}>
                <Text style={styles.exitConfirmCancelText}>{'\u53d6\u6d88'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitConfirmConfirmBtn} onPress={handleConfirmExitModal} disabled={exitSubmitting} activeOpacity={0.85}>
                <Text style={styles.exitConfirmConfirmText}>{'\u786e\u8ba4'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 选择新队长弹窗 */}
      <Modal visible={showTransferLeaderModal} animationType="slide" transparent onRequestClose={() => {
      if (exitSubmitting) {
        return;
      }
      closeTransferLeaderModal();
    }}>
        <View style={styles.modalOverlay}>
          <View style={styles.transferLeaderModal}>
            <View style={styles.transferLeaderHeader}>
              <TouchableOpacity onPress={() => {
              if (exitSubmitting) {
                return;
              }
              closeTransferLeaderModal();
            }}>
                <Text style={styles.transferLeaderCancelText}>{'\u53d6\u6d88'}</Text>
              </TouchableOpacity>
              <Text style={styles.transferLeaderTitle}>{'\u9009\u62e9\u65b0\u961f\u957f'}</Text>
              <TouchableOpacity onPress={handleConfirmTransferLeader} disabled={!selectedNewLeader || exitSubmitting}>
                <Text style={[styles.transferLeaderConfirmText, (!selectedNewLeader || exitSubmitting) && styles.transferLeaderConfirmTextDisabled]}>
                  {exitSubmitting ? '\u786e\u8ba4\u4e2d...' : '\u786e\u8ba4'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.transferLeaderList} contentContainerStyle={styles.transferLeaderListContent} showsVerticalScrollIndicator={false}>
              {transferLeaderCandidates.map(member => <TouchableOpacity key={`${member.id}-${member.userId}`} style={styles.transferLeaderItem} onPress={() => {
              if (!exitSubmitting) {
                setSelectedNewLeader(member.userId);
              }
            }} disabled={exitSubmitting}>
                  <View style={styles.transferLeaderRadio}>
                    {String(selectedNewLeader) === String(member.userId) && <View style={styles.transferLeaderRadioInner} />}
                  </View>
                  <Avatar uri={member.avatar} name={member.name} size={40} />
                  <View style={styles.transferLeaderInfo}>
                    <Text style={styles.transferLeaderName}>{member.name}</Text>
                    <Text style={styles.transferLeaderRole}>{member.role}</Text>
                  </View>
                </TouchableOpacity>)}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseCreateModal} statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <KeyboardDismissView>
            <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>创建团队</Text>
            <TouchableOpacity onPress={handleCloseCreateModal} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetContent} contentContainerStyle={[styles.sheetContentContainer, {
          paddingBottom: bottomSafeInset + 96
        }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
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
                        <Text style={styles.rewardTagSmallText}>{formatAmount(q.reward)}</Text>
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
            <Text style={styles.formLabel}>团队说明</Text>
            <TextInput style={styles.textArea} placeholder="介绍一下这个团队的目标和规则..." placeholderTextColor="#9ca3af" value={teamDescription} onChangeText={setTeamDescription} multiline numberOfLines={4} />
          </View>

          <View style={{
            height: 100
          }} />
          </ScrollView>

          <View style={[styles.sheetFooter, {
          paddingBottom: bottomSafeInset
        }]}>
            <TouchableOpacity style={[styles.submitBtn, (!teamName.trim() || creatingTeam) && styles.submitBtnDisabled]} onPress={submitCreateTeam} disabled={!teamName.trim() || creatingTeam}>
              <Text style={styles.submitBtnText}>{creatingTeam ? '\u521b\u5efa\u4e2d...' : '创建团队'}</Text>
            </TouchableOpacity>
          </View>
            </SafeAreaView>
          </KeyboardDismissView>
        </KeyboardAvoidingView>
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
    fontSize: scaleFont(17),
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
    fontSize: scaleFont(14),
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
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4
  },
  statLabel: {
    fontSize: scaleFont(12),
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
    fontSize: scaleFont(15),
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
    fontSize: scaleFont(15),
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
    fontSize: scaleFont(11),
    color: '#6b7280',
    fontWeight: '500'
  },
  roleTextLeader: {
    color: '#ef4444'
  },
  teamDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
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
    fontSize: scaleFont(11),
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
    fontSize: scaleFont(16),
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16
  },
  emptyHint: {
    fontSize: scaleFont(13),
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40
  },
  exitConfirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  exitConfirmCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowRadius: 18,
    elevation: 10
  },
  exitConfirmTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8
  },
  exitConfirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    marginBottom: 16
  },
  exitConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end'
  },
  exitConfirmCancelBtn: {
    minWidth: 84,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6'
  },
  exitConfirmCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600'
  },
  exitConfirmConfirmBtn: {
    minWidth: 84,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444'
  },
  exitConfirmConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end'
  },
  transferLeaderModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 20,
    maxHeight: '78%'
  },
  transferLeaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  transferLeaderCancelText: {
    fontSize: scaleFont(16),
    color: '#6b7280',
    fontWeight: '500'
  },
  transferLeaderTitle: {
    fontSize: scaleFont(18),
    color: '#111827',
    fontWeight: '600'
  },
  transferLeaderConfirmText: {
    fontSize: scaleFont(16),
    color: '#ef4444',
    fontWeight: '600'
  },
  transferLeaderConfirmTextDisabled: {
    color: '#d1d5db'
  },
  transferLeaderList: {
    flexGrow: 0
  },
  transferLeaderListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12
  },
  transferLeaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  transferLeaderRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  transferLeaderRadioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444'
  },
  transferLeaderInfo: {
    marginLeft: 14,
    flex: 1
  },
  transferLeaderName: {
    fontSize: scaleFont(16),
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4
  },
  transferLeaderRole: {
    fontSize: scaleFont(14),
    color: '#94a3b8'
  },
  // Modal 样式
  modalContainer: {
    flex: 1,
    backgroundColor: modalTokens.surface
  },
  modalKeyboardView: {
    flex: 1
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
    fontSize: scaleFont(17),
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
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  formHint: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginBottom: 12
  },
  textInput: {
    backgroundColor: modalTokens.surfaceSoft,
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: modalTokens.textPrimary
  },
  charCount: {
    fontSize: scaleFont(11),
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
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '600'
  },
  questionOptionTitle: {
    flex: 1,
    fontSize: scaleFont(13),
    color: modalTokens.textPrimary,
    lineHeight: scaleFont(18)
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
    fontSize: scaleFont(14),
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
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  }
});
