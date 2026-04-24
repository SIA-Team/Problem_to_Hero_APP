import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import questionApi from '../services/api/questionApi';
import teamApi from '../services/api/teamApi';
import { showAppAlert } from '../utils/appAlert';
import { mapTeamToDetailRoute, normalizeQuestionTeam } from '../utils/teamTransforms';
import {
  executeTeamJoinApply,
  isTeamJoinPendingError,
  loadTeamJoinPendingOverrides,
  markTeamJoinPendingOverride,
  saveTeamJoinPendingOverrides,
} from '../utils/teamJoin';

import { scaleFont } from '../utils/responsive';
const EMPTY_ERROR_KEY = '__EMPTY_NO_DATA__';

const getRoleKey = (userRole, isJoined) => {
  if (!isJoined) {
    return 'notJoined';
  }

  switch (Number(userRole)) {
    case 3:
      return 'leader';
    case 2:
      return 'admin';
    case 1:
      return 'member';
    default:
      return 'member';
  }
};

const getStatusMeta = (status, statusDesc) => {
  switch (Number(status)) {
    case 1:
      return {
        text: statusDesc || '招募中',
        color: '#22c55e',
      };
    case 2:
      return {
        text: statusDesc || '满员',
        color: '#f59e0b',
      };
    case 3:
      return {
        text: statusDesc || '已结束',
        color: '#9ca3af',
      };
    default:
      return {
        text: statusDesc || '未知状态',
        color: '#6b7280',
      };
  }
};

const normalizeTeam = (team) => {
  const isJoined = Boolean(team?.isJoined);
  const role = getRoleKey(team?.userRole, isJoined);
  const statusMeta = getStatusMeta(team?.status, team?.statusDesc);

  return {
    id: String(team?.id ?? ''),
    questionId: String(team?.questionId ?? ''),
    questionIds: Array.isArray(team?.questionIds) ? team.questionIds.map((id) => String(id)) : [],
    name: team?.name || '',
    description: team?.description || '',
    avatar: team?.avatar || '',
    memberCount: Number(team?.memberCount) || 0,
    maxMembers: Number(team?.maxMembers) || 0,
    status: Number(team?.status) || 0,
    statusDesc: statusMeta.text,
    creatorName: team?.creatorName || '-',
    isJoined,
    isPending: false,
    userRole: Number(team?.userRole) || 0,
    role,
    isLeader: role === 'leader',
    isAdmin: role === 'leader' || role === 'admin',
    myMemberStatus: Number(team?.myMemberStatus) || 0,
    statusColor: statusMeta.color,
  };
};

export default function QuestionTeamsScreen({ route, navigation }) {
  const { questionId, questionTitle } = route.params || {};
  const { t } = useTranslation();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [currentUserNames, setCurrentUserNames] = useState([]);
  const [applyingTeamId, setApplyingTeamId] = useState(null);
  const [pendingApplyOverrides, setPendingApplyOverrides] = useState({});
  const [pendingOverridesReady, setPendingOverridesReady] = useState(false);
  const [showApplyReasonModal, setShowApplyReasonModal] = useState(false);
  const [applyReasonText, setApplyReasonText] = useState('');
  const [applyTargetTeam, setApplyTargetTeam] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserNames = async () => {
      try {
        const [userInfoRaw, currentUsername] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('currentUsername'),
        ]);
        const nextNames = [];

        if (userInfoRaw) {
          try {
            const userInfo = JSON.parse(userInfoRaw);
            nextNames.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.error('Failed to parse userInfo for team creator matching:', parseError);
          }
        }

        nextNames.push(currentUsername);

        if (isMounted) {
          setCurrentUserNames(
            nextNames
              .map((item) => String(item ?? '').trim())
              .filter(Boolean)
          );
        }
      } catch (storageError) {
        console.error('Failed to load current user info for team creator matching:', storageError);
      }
    };

    loadCurrentUserNames();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPendingOverrides = async () => {
      const pendingOverrides = await loadTeamJoinPendingOverrides();

      if (isMounted) {
        setPendingApplyOverrides(pendingOverrides);
        setPendingOverridesReady(true);
      }
    };

    loadPendingOverrides();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!pendingOverridesReady) {
      return () => {
        isMounted = false;
      };
    }

    const loadQuestionTeams = async () => {
      if (questionId === undefined || questionId === null || questionId === '') {
        if (isMounted) {
          setTeams([]);
          setError(EMPTY_ERROR_KEY);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError('');
      }

      try {
        const response = await questionApi.getQuestionTeams(questionId);
        const isSuccess = response?.code === 0 || response?.code === 200;

        if (!isSuccess) {
          throw new Error(response?.msg || 'Failed to load question teams');
        }

        const rawTeams = Array.isArray(response?.data)
          ? response.data.map((team) =>
              normalizeQuestionTeam(team, { currentUserNames })
            )
          : [];
        const nextTeams = await hydrateTeamsWithMembershipState(rawTeams);

        if (isMounted) {
          setTeams(nextTeams);
        }
        await syncPendingOverridesWithTeams(nextTeams);
      } catch (requestError) {
        console.error('Failed to load question teams:', requestError);

        if (isMounted) {
          setTeams([]);
          setError(requestError?.message || 'Failed to load question teams');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadQuestionTeams();

    return () => {
      isMounted = false;
    };
  }, [questionId, currentUserNames, pendingOverridesReady]);

  const handleTeamPress = (team) => {
    navigation.navigate('TeamDetail', mapTeamToDetailRoute({
      ...team,
      isPending: Boolean(team?.isPending || shouldUsePendingOverride(team)),
    }));
  };

  const hydrateTeamsWithMembershipState = async (sourceTeams = []) => {
    const hydratedTeams = await Promise.all(sourceTeams.map(async team => {
      if (!team?.id) {
        return team;
      }

      try {
        const response = await teamApi.getTeamDetail(team.id);
        const isSuccess = response?.code === 0 || response?.code === 200;

        if (!isSuccess || !response?.data) {
          return team;
        }

        return {
          ...team,
          ...normalizeQuestionTeam(response.data, {
            currentUserNames
          })
        };
      } catch (requestError) {
        console.error('Failed to hydrate team membership state:', requestError);
        return team;
      }
    }));

    return hydratedTeams;
  };

  const syncPendingOverridesWithTeams = React.useCallback(async (sourceTeams = []) => {
    const nextPendingOverrides = sourceTeams.reduce((accumulator, team) => {
      if (team?.id && team?.isPending && !team?.isJoined) {
        accumulator[String(team.id)] = true;
      }
      return accumulator;
    }, {});

    const normalizedOverrides = await saveTeamJoinPendingOverrides(nextPendingOverrides);
    setPendingApplyOverrides(normalizedOverrides);
    return normalizedOverrides;
  }, []);

  const markTeamPending = async (teamId) => {
    const nextState = await markTeamJoinPendingOverride(teamId);
    setPendingApplyOverrides((prevState) => ({
      ...prevState,
      ...nextState,
    }));
    return nextState;
  };

  const refreshQuestionTeams = async () => {
    if (questionId === undefined || questionId === null || questionId === '') {
      return [];
    }

    const latestResponse = await questionApi.getQuestionTeams(questionId);
    const latestSuccess = latestResponse?.code === 0 || latestResponse?.code === 200;

    if (!latestSuccess) {
      throw new Error(latestResponse?.msg || 'Failed to refresh question teams');
    }

    const rawTeams = Array.isArray(latestResponse?.data)
      ? latestResponse.data.map((team) =>
          normalizeQuestionTeam(team, { currentUserNames })
        )
      : [];
    const latestTeams = await hydrateTeamsWithMembershipState(rawTeams);

    setTeams(latestTeams);
    await syncPendingOverridesWithTeams(latestTeams);
    return latestTeams;
  };

  useFocusEffect(React.useCallback(() => {
    let isActive = true;

    if (!pendingOverridesReady) {
      return () => {
        isActive = false;
      };
    }

    const refreshOnFocus = async () => {
      try {
        setLoading(true);
        setError('');
        await refreshQuestionTeams();
      } catch (requestError) {
        console.error('Failed to refresh question teams on focus:', requestError);

        if (isActive) {
          setError(requestError?.message || 'Failed to refresh question teams');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    refreshOnFocus();

    return () => {
      isActive = false;
    };
  }, [pendingOverridesReady, questionId, currentUserNames]));

  const shouldUsePendingOverride = (team) =>
    Boolean(
      pendingApplyOverrides[String(team?.id)] &&
        !team?.isJoined &&
        !team?.isPending &&
        !team?.isFrozen &&
        !team?.isRejected &&
        !team?.isExited
    );

  const handleApplyJoin = (teamId, teamName) => {
    setApplyTargetTeam({ id: teamId, name: teamName });
    setApplyReasonText('');
    setShowApplyReasonModal(true);
  };

  const handleConfirmApply = async () => {
    if (!applyTargetTeam) return;

    const { id: teamId, name: teamName } = applyTargetTeam;
    const reason = applyReasonText.trim();

    setShowApplyReasonModal(false);

    try {
      setApplyingTeamId(String(teamId));
      await executeTeamJoinApply({
        teamId,
        reason,
      });
      await markTeamPending(teamId);
      await refreshQuestionTeams();
      showAppAlert(
        t('screens.questionTeams.alerts.success'),
        '\u7533\u8bf7\u5df2\u63d0\u4ea4'
      );
    } catch (requestError) {
      console.error('Failed to apply join from question teams screen:', requestError);
      if (isTeamJoinPendingError(requestError)) {
        await markTeamPending(teamId);
      }
      try {
        const latestTeams = await refreshQuestionTeams();
        const latestTeam = latestTeams.find((team) => String(team.id) === String(teamId));

        if (latestTeam?.isPending) {
          showAppAlert(
            t('screens.questionTeams.alerts.hint'),
            isTeamJoinPendingError(requestError)
              ? requestError?.message || '\u60a8\u5df2\u5728\u7533\u8bf7\u4e2d'
              : '\u5f53\u524d\u7533\u8bf7\u72b6\u6001\u5df2\u540c\u6b65'
          );
          return;
        }
      } catch (refreshError) {
        console.error('Failed to refresh question teams after apply error:', refreshError);
      }
      showAppAlert(
        t('screens.questionTeams.alerts.hint'),
        requestError?.message || t('screens.questionTeams.alerts.applyTitle')
      );
    } finally {
      setApplyingTeamId(null);
      setApplyTargetTeam(null);
      setApplyReasonText('');
    }
  };
  const handleCloseCreateModal = React.useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCreateTeam = async () => {
    const trimmedName = newTeamName.trim();
    const trimmedDescription = newTeamDesc.trim();

    if (!trimmedName) {
      showAppAlert(
        t('screens.questionTeams.alerts.hint'),
        t('screens.questionTeams.alerts.nameRequired')
      );
      return;
    }

    if (questionId === undefined || questionId === null || questionId === '') {
      showAppAlert(t('screens.questionTeams.alerts.hint'), t('common.noData'));
      return;
    }

    try {
      setCreatingTeam(true);
      const response = await teamApi.createTeam({
        questionIds: [questionId],
        name: trimmedName,
        description: trimmedDescription,
        avatar: '',
        maxMembers: 0,
      });
      const isSuccess = response?.code === 0 || response?.code === 200;

      if (!isSuccess || !response?.data) {
        throw new Error(response?.msg || 'Failed to create team');
      }

      const createdTeam = normalizeQuestionTeam(response.data, {
        currentUserNames,
        forceCreatorMembership: true,
      });
      setTeams((prevTeams) => [
        createdTeam,
        ...prevTeams.filter((team) => team.id !== createdTeam.id),
      ]);
      handleCloseCreateModal();
      setNewTeamName('');
      setNewTeamDesc('');
      showAppAlert(
        t('screens.questionTeams.alerts.success'),
        t('screens.questionTeams.alerts.createSuccess').replace('{name}', createdTeam.name)
      );
    } catch (requestError) {
      console.error('Failed to create question team:', requestError);
      showAppAlert(
        t('screens.questionTeams.alerts.hint'),
        requestError?.message || 'Failed to create team'
      );
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {questionTitle || t('screens.questionTeams.defaultQuestionTitle')}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createBtnText}>
            {t('screens.questionTeams.createTeam')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {t('screens.questionTeams.listHeader.title')} ({teams.length})
          </Text>
          <Text style={styles.listDesc}>
            {t('screens.questionTeams.listHeader.description')}
          </Text>
        </View>

        {teams.map((team) => (
          <View key={team.id} style={styles.teamCard}>
            <TouchableOpacity
              style={styles.teamCardHeader}
              onPress={() => handleTeamPress(team)}
              activeOpacity={0.7}
              accessible
              accessibilityRole="button"
            >
              <Avatar uri={team.avatar} name={team.name} size={52} />
              <View style={styles.teamInfo}>
                <View style={styles.teamTitleRow}>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {team.name}
                  </Text>
                  {Boolean(team.isJoined) && (
                    <View style={styles.joinedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#22c55e"
                      />
                      <Text style={styles.joinedText}>
                        {t('screens.questionTeams.badges.joined')}
                      </Text>
                    </View>
                  )}
                </View>
                {team.description ? (
                  <Text style={styles.teamDesc} numberOfLines={2}>
                    {team.description}
                  </Text>
                ) : null}
                <View style={styles.capacityRow}>
                  <Ionicons name="people-outline" size={14} color="#9ca3af" />
                  <Text style={styles.capacityText}>
                    {team.memberCount}
                    {team.maxMembers > 0 ? `/${team.maxMembers}` : ''}
                  </Text>
                </View>
                {Boolean(team.isJoined) && (
                  <View style={styles.userRoleRow}>
                    <Ionicons
                      name="person-circle-outline"
                      size={14}
                      color="#6b7280"
                    />
                    <Text style={styles.userRoleText}>
                      {t('screens.questionTeams.userRole.label')}
                    </Text>
                    <View
                      style={[
                        styles.roleBadge,
                        team.isAdmin && styles.roleBadgeAdmin,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          team.isAdmin && styles.roleBadgeTextAdmin,
                        ]}
                      >
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
                  <Text style={styles.metaText}>
                    {team.memberCount}
                    {team.maxMembers > 0 ? `/${team.maxMembers}` : ''}
                    {t('screens.questionTeams.meta.people')}
                  </Text>
                </View>
                {team.creatorName && team.creatorName !== '-' ? (
                  <>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Ionicons name="person" size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>{team.creatorName}</Text>
                    </View>
                  </>
                ) : null}
                <View style={styles.metaDivider} />
                <View
                  style={[
                    styles.activeTag,
                    { backgroundColor: `${team.statusColor}15` },
                  ]}
                >
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: team.statusColor },
                    ]}
                  />
                  <Text
                    style={[styles.activeText, { color: team.statusColor }]}
                  >
                    {team.statusDesc}
                  </Text>
                </View>
              </View>

              {!team.isJoined && !Boolean(team.isPending || shouldUsePendingOverride(team)) && Boolean(team.isFrozen) && (
                <View style={styles.frozenTag}>
                  <Ionicons name="ban-outline" size={14} color="#9ca3af" />
                  <Text style={styles.frozenTagText}>不可申请</Text>
                </View>
              )}

              {!team.isJoined && !Boolean(team.isPending || shouldUsePendingOverride(team)) && !team.isFrozen && (
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => handleApplyJoin(team.id, team.name)}
                  disabled={applyingTeamId === String(team.id)}
                  activeOpacity={0.6}
                  accessible
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={applyingTeamId === String(team.id) ? '#fca5a5' : '#ef4444'}
                  />
                  <Text style={[styles.applyBtnText, applyingTeamId === String(team.id) && { color: '#fca5a5' }]}>
                    {applyingTeamId === String(team.id) ? t('common.loading') : t('screens.questionTeams.actions.apply')}
                  </Text>
                </TouchableOpacity>
              )}

              {Boolean(team.isPending || shouldUsePendingOverride(team)) && (
                <View style={styles.pendingTag}>
                  <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
                  <Text style={styles.pendingTagText}>
                    {'审核中'}
                  </Text>
                </View>
              )}

              {Boolean(team.isJoined) && (
                <TouchableOpacity
                  style={styles.enterTag}
                  onPress={() => handleTeamPress(team)}
                  accessible
                  accessibilityRole="button"
                >
                  <Text style={styles.enterTagText}>
                    {t('screens.questionTeams.actions.enter')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.emptyText}>{t('common.loading')}</Text>
          </View>
        )}

        {!loading && teams.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {t('screens.questionTeams.empty.title')}
            </Text>
            <Text style={styles.emptyHint}>
              {error === EMPTY_ERROR_KEY
                ? t('common.noData')
                : error || t('screens.questionTeams.empty.hint')}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={handleCloseCreateModal}
      >
        <KeyboardAvoidingView
          style={styles.modalCenterKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.createModalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                Keyboard.dismiss();
                handleCloseCreateModal();
              }}
            />
            <View style={styles.createModalCard}>
              <View style={styles.createModalHeader}>
                <Text style={styles.modalTitle}>
                  {t('screens.questionTeams.createModal.title')}
                </Text>
                <TouchableOpacity onPress={handleCloseCreateModal} style={styles.createModalCloseBtn}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.createModalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {t('screens.questionTeams.createModal.nameLabel')}{' '}
                    {t('screens.questionTeams.createModal.nameRequired')}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('screens.questionTeams.createModal.namePlaceholder')}
                    value={newTeamName}
                    onChangeText={setNewTeamName}
                    maxLength={20}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {t('screens.questionTeams.createModal.descLabel')}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={t('screens.questionTeams.createModal.descPlaceholder')}
                    value={newTeamDesc}
                    onChangeText={setNewTeamDesc}
                    multiline
                    numberOfLines={3}
                    maxLength={100}
                    textAlignVertical="top"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (creatingTeam || !newTeamName.trim()) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleCreateTeam}
                  disabled={creatingTeam || !newTeamName.trim()}
                >
                  <Text style={styles.submitBtnText}>
                    {creatingTeam ? t('common.loading') : t('screens.questionTeams.createModal.submit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 申请加入团队理由输入模态框 */}
      <Modal
        visible={showApplyReasonModal}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => {
          if (!applyingTeamId) {
            setShowApplyReasonModal(false);
            setApplyTargetTeam(null);
            setApplyReasonText('');
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalCenterKeyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.applyReasonOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              if (!applyingTeamId) {
                setShowApplyReasonModal(false);
                setApplyTargetTeam(null);
                setApplyReasonText('');
              }
            }}
          />
          <View style={styles.applyReasonCard}>
            <Text style={styles.applyReasonTitle}>申请加入团队</Text>
            <Text style={styles.applyReasonTeamName}>"{applyTargetTeam?.name}"</Text>
            <Text style={styles.applyReasonLabel}>申请理由（选填）</Text>
            <TextInput
              style={styles.applyReasonInput}
              placeholder="请简单说明您的申请理由..."
              placeholderTextColor="#9ca3af"
              value={applyReasonText}
              onChangeText={setApplyReasonText}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.applyReasonCount}>{applyReasonText.length}/200</Text>
            <View style={styles.applyReasonActions}>
              <TouchableOpacity
                style={styles.applyReasonCancelBtn}
                onPress={() => {
                  setShowApplyReasonModal(false);
                  setApplyTargetTeam(null);
                  setApplyReasonText('');
                }}
                disabled={applyingTeamId}
              >
                <Text style={styles.applyReasonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyReasonConfirmBtn}
                onPress={handleConfirmApply}
                disabled={applyingTeamId}
              >
                <Text style={styles.applyReasonConfirmText}>
                  {applyingTeamId ? '提交中...' : '提交申请'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  listHeader: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
  },
  listDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    cursor: 'pointer',
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
    marginLeft: 8,
  },
  joinedText: {
    fontSize: scaleFont(11),
    color: '#22c55e',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
    marginLeft: 8,
  },
  pendingText: {
    fontSize: scaleFont(11),
    color: '#f59e0b',
    fontWeight: '500',
  },
  teamDesc: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    lineHeight: scaleFont(18),
    marginBottom: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  capacityText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  userRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userRoleText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  roleBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeAdmin: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  roleBadgeText: {
    fontSize: scaleFont(11),
    color: '#6b7280',
    fontWeight: '500',
  },
  roleBadgeTextAdmin: {
    color: '#ef4444',
  },
  teamFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e5e7eb',
  },
  metaText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeText: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    gap: 4,
    cursor: 'pointer',
    zIndex: 10,
    position: 'relative',
    flexShrink: 0,
  },
  applyBtnText: {
    color: '#ef4444',
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
    gap: 4,
    flexShrink: 0,
  },
  pendingTagText: {
    color: '#f59e0b',
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  frozenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
    flexShrink: 0,
  },
  frozenTagText: {
    color: '#9ca3af',
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  enterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  enterTagText: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: scaleFont(16),
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: scaleFont(13),
    color: '#d1d5db',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  modalCenterKeyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  applyReasonOverlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  createModalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: 24,
    backgroundColor: modalTokens.surface,
    borderWidth: 1,
    borderColor: modalTokens.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowRadius: 20,
    elevation: 12,
  },
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: modalTokens.border,
  },
  createModalCloseBtn: {
    padding: 4,
  },
  createModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: modalTokens.border,
    borderRadius: 12,
    backgroundColor: modalTokens.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaleFont(15),
    color: modalTokens.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: modalTokens.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  pendingModal: {
    backgroundColor: modalTokens.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: modalTokens.border,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  pendingModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pendingModalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: modalTokens.textPrimary,
    marginBottom: 12,
  },
  pendingModalDesc: {
    fontSize: scaleFont(14),
    color: modalTokens.textSecondary,
    lineHeight: scaleFont(22),
    textAlign: 'center',
    marginBottom: 24,
  },
  pendingModalBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  pendingModalBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600',
  },
  applyReasonCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  applyReasonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  applyReasonTeamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 16,
  },
  applyReasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  applyReasonInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
  },
  applyReasonCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  applyReasonActions: {
    flexDirection: 'row',
    gap: 10,
  },
  applyReasonCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyReasonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyReasonConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyReasonConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
