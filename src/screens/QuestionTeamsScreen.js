import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';

// 模拟该问题下的团队数据
const questionTeams = [
  { 
    id: 1, 
    name: 'Python学习互助团', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team1',
    members: 156, 
    leader: '张三丰',
    description: '一起学习Python，互相帮助解决问题',
    isJoined: true,
    isPending: false,
    activeLevel: 'active',
    activeColor: '#22c55e',
    creatorId: 1,      // 创建者ID
    currentUserId: 1,  // 当前用户ID（模拟）
    isAdmin: true,     // 是否是管理员
    role: 'admin'      // 用户在团队中的角色
  },
  { 
    id: 2, 
    name: '编程新手交流群', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team2',
    members: 89, 
    leader: '李小龙',
    description: '新手友好，大佬带飞',
    isJoined: false,
    isPending: false,
    activeLevel: 'moderatelyActive',
    activeColor: '#f59e0b',
    creatorId: 2,      // 创建者ID
    currentUserId: 1,  // 当前用户ID
    isAdmin: false,    // 不是管理员
    role: 'notJoined'  // 用户在团队中的角色
  },
  { 
    id: 3, 
    name: '代码审查小组', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team3',
    members: 234, 
    leader: '王医生',
    description: '互相审查代码，提升编程能力',
    isJoined: true,
    isPending: false,
    activeLevel: 'veryActive',
    activeColor: '#ef4444',
    creatorId: 2,      // 创建者ID
    currentUserId: 3,  // 当前用户ID（队长3）
    isAdmin: false,    // 不是管理员
    role: 'member'     // 用户在团队中的角色
  },
  { 
    id: 4, 
    name: '算法刷题团', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team4',
    members: 67, 
    leader: '程序员小明',
    description: '每天一道算法题，坚持就是胜利',
    isJoined: false,
    isPending: false,
    activeLevel: 'active',
    activeColor: '#22c55e',
    creatorId: 4,      // 创建者ID
    currentUserId: 1,  // 当前用户ID
    isAdmin: false,    // 不是管理员
    role: 'notJoined'  // 用户在团队中的角色
  },
];

export default function QuestionTeamsScreen({ route, navigation }) {
  const { questionId, questionTitle } = route.params || {};
  const { t } = useTranslation();
  const [teams, setTeams] = useState(questionTeams);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [showPendingModal, setShowPendingModal] = useState(false);
  const handleTeamPress = (team) => {
    // 所有团队都可以点击查看，但未加入的团队只能看到成员信息
    navigation.navigate('TeamDetail', { 
      team: {
        id: team.id,
        name: team.name,
        avatar: team.avatar,
        role: team.role,
        members: team.members,
        questions: 45,
        description: team.description,
        createdAt: '2025-12-15',
        isActive: true,
        creatorId: team.creatorId,
        currentUserId: team.currentUserId,
        isAdmin: team.isAdmin
      },
      isJoined: team.isJoined,
      isPending: team.isPending,
      restrictedView: !team.isJoined // 未加入的团队使用限制访问模式
    });
  };

  const handleApplyJoin = (teamId, teamName) => {
    Alert.alert(
      t('screens.questionTeams.alerts.applyTitle'),
      t('screens.questionTeams.alerts.applyMessage').replace('{name}', teamName),
      [
        { text: t('screens.questionTeams.alerts.cancel'), style: 'cancel' },
        { 
          text: t('screens.questionTeams.alerts.confirmApply'), 
          onPress: () => {
            setTeams(teams.map(t => t.id === teamId ? { ...t, isPending: true } : t));
            setShowPendingModal(true);
          }
        }
      ]
    );
  };

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      Alert.alert(t('screens.questionTeams.alerts.hint'), t('screens.questionTeams.alerts.nameRequired'));
      return;
    }
    Alert.alert(t('screens.questionTeams.alerts.success'), t('screens.questionTeams.alerts.createSuccess').replace('{name}', newTeamName));
    setShowCreateModal(false);
    setNewTeamName('');
    setNewTeamDesc('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{t('screens.questionTeams.title')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{questionTitle || t('screens.questionTeams.defaultQuestionTitle')}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* 操作按钮 */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createBtnText}>{t('screens.questionTeams.createTeam')}</Text>
        </TouchableOpacity>
      </View>

      {/* 团队列表 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{t('screens.questionTeams.listHeader.title')} ({teams.length})</Text>
          <Text style={styles.listDesc}>{t('screens.questionTeams.listHeader.description')}</Text>
        </View>

        {teams.map(team => (
          <View key={team.id} style={styles.teamCard}>
            <TouchableOpacity 
              style={styles.teamCardHeader}
              onPress={() => handleTeamPress(team)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
            >
              <Avatar uri={team.avatar} name={team.name} size={52} />
              <View style={styles.teamInfo}>
                <View style={styles.teamTitleRow}>
                  <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
                  {team.isJoined && (
                    <View style={styles.joinedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                      <Text style={styles.joinedText}>{t('screens.questionTeams.badges.joined')}</Text>
                    </View>
                  )}
                  {team.isPending && (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={12} color="#f59e0b" />
                      <Text style={styles.pendingText}>{t('screens.questionTeams.badges.pending')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.teamDesc} numberOfLines={2}>{team.description}</Text>
                {/* 显示用户角色 */}
                {team.isJoined && (
                  <View style={styles.userRoleRow}>
                    <Ionicons name="person-circle-outline" size={14} color="#6b7280" />
                    <Text style={styles.userRoleText}>{t('screens.questionTeams.userRole.label')}</Text>
                    <View style={[styles.roleBadge, team.isAdmin && styles.roleBadgeAdmin]}>
                      <Text style={[styles.roleBadgeText, team.isAdmin && styles.roleBadgeTextAdmin]}>
                        {t(`screens.questionTeams.userRole.${team.role}`)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            <View style={styles.teamFooter}>
              <View style={styles.teamMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={14} color="#9ca3af" />
                  <Text style={styles.metaText}>{team.members}{t('screens.questionTeams.meta.people')}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={14} color="#9ca3af" />
                  <Text style={styles.metaText}>{team.leader}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={[styles.activeTag, { backgroundColor: team.activeColor + '15' }]}>
                  <View style={[styles.activeDot, { backgroundColor: team.activeColor }]} />
                  <Text style={[styles.activeText, { color: team.activeColor }]}>{t(`screens.questionTeams.activeLevel.${team.activeLevel}`)}</Text>
                </View>
              </View>
              
              {!team.isJoined && !team.isPending && (
                <TouchableOpacity 
                  style={styles.applyBtn}
                  onPress={() => handleApplyJoin(team.id, team.name)}
                  activeOpacity={0.6}
                  accessible={true}
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.applyBtnText}>{t('screens.questionTeams.actions.apply')}</Text>
                </TouchableOpacity>
              )}
              
              {team.isPending && (
                <View style={styles.pendingTag}>
                  <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
                  <Text style={styles.pendingTagText}>{t('screens.questionTeams.actions.waitingVote')}</Text>
                </View>
              )}
              
              {team.isJoined && (
                <TouchableOpacity 
                  style={styles.enterTag}
                  onPress={() => handleTeamPress(team)}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text style={styles.enterTagText}>{t('screens.questionTeams.actions.enter')}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {teams.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>{t('screens.questionTeams.empty.title')}</Text>
            <Text style={styles.emptyHint}>{t('screens.questionTeams.empty.hint')}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 创建团队弹窗 */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('screens.questionTeams.createModal.title')}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('screens.questionTeams.createModal.nameLabel')} {t('screens.questionTeams.createModal.nameRequired')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.questionTeams.createModal.namePlaceholder')}
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                  maxLength={20}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('screens.questionTeams.createModal.descLabel')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('screens.questionTeams.createModal.descPlaceholder')}
                  value={newTeamDesc}
                  onChangeText={setNewTeamDesc}
                  multiline
                  numberOfLines={3}
                  maxLength={100}
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateTeam}>
                <Text style={styles.submitBtnText}>{t('screens.questionTeams.createModal.submit')}</Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.pendingModalTitle}>{t('screens.questionTeams.pendingModal.title')}</Text>
            <Text style={styles.pendingModalDesc}>
              {t('screens.questionTeams.pendingModal.description')}
            </Text>
            <TouchableOpacity 
              style={styles.pendingModalBtn}
              onPress={() => setShowPendingModal(false)}
            >
              <Text style={styles.pendingModalBtnText}>{t('screens.questionTeams.pendingModal.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerTitleContainer: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
  actionBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  createBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, gap: 6 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  content: { flex: 1 },
  listHeader: { padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  listDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  teamCard: { backgroundColor: '#fff', marginBottom: 8, paddingTop: 16, paddingHorizontal: 16 },
  teamCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' },
  teamInfo: { flex: 1, marginLeft: 12 },
  teamTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  teamName: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1 },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3, marginLeft: 8 },
  joinedText: { fontSize: 11, color: '#22c55e', fontWeight: '500' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3, marginLeft: 8 },
  pendingText: { fontSize: 11, color: '#f59e0b', fontWeight: '500' },
  teamDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 6 },
  userRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userRoleText: { fontSize: 12, color: '#6b7280' },
  roleBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleBadgeAdmin: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  roleBadgeText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  roleBadgeTextAdmin: { color: '#ef4444' },
  teamFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDivider: { width: 1, height: 12, backgroundColor: '#e5e7eb' },
  metaText: { fontSize: 12, color: '#6b7280' },
  activeTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontWeight: '500' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2', gap: 4, cursor: 'pointer', zIndex: 10, position: 'relative' },
  applyBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '500' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#fef3c7', gap: 4 },
  pendingTagText: { color: '#f59e0b', fontSize: 12, fontWeight: '500' },
  enterTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  enterTagText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  emptyHint: { fontSize: 13, color: '#d1d5db', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: modalTokens.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: modalTokens.surface, borderTopLeftRadius: modalTokens.sheetRadius, borderTopRightRadius: modalTokens.sheetRadius, borderTopWidth: 1, borderColor: modalTokens.border, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: modalTokens.textPrimary },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: modalTokens.border, borderRadius: 12, backgroundColor: modalTokens.surfaceSoft, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: modalTokens.textPrimary },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  submitBtn: { backgroundColor: modalTokens.danger, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // 等待审核弹窗
  pendingModal: { backgroundColor: modalTokens.surface, borderRadius: 24, borderWidth: 1, borderColor: modalTokens.border, padding: 24, marginHorizontal: 32, alignItems: 'center' },
  pendingModalIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pendingModalTitle: { fontSize: 20, fontWeight: '700', color: modalTokens.textPrimary, marginBottom: 12 },
  pendingModalDesc: { fontSize: 14, color: modalTokens.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  pendingModalBtn: { backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  pendingModalBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
