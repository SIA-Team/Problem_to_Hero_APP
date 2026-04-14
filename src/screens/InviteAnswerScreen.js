import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import EditTextModal from '../components/EditTextModal';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';
import twitterInviteUsers from '../utils/twitterInviteUsers';
import { buildProblemToHeroInviteText, openTwitterShare } from '../utils/shareService';
import { getTwitterInviteStatusText, loadQuestionTwitterInvites, saveQuestionTwitterInvite } from '../services/twitterInviteState';

const localInviteUsers = [1, 2, 3, 4, 5].map(index => ({
  id: `local-${index}`,
  name: `用户${index}`,
  description: `Python开发者 · 回答过 ${index * 10} 个问题`,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=invite${index}`,
}));

export default function InviteAnswerScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [inviteTab, setInviteTab] = useState('local');
  const [searchLocalUser, setSearchLocalUser] = useState('');
  const [searchTwitterUser, setSearchTwitterUser] = useState('');
  const [showTwitterInviteEditor, setShowTwitterInviteEditor] = useState(false);
  const [twitterInviteDraftText, setTwitterInviteDraftText] = useState('');
  const [selectedTwitterInviteUser, setSelectedTwitterInviteUser] = useState(null);
  const [pendingTwitterInvitePlatform, setPendingTwitterInvitePlatform] = useState(null);
  const [currentInviteUsername, setCurrentInviteUsername] = useState('');
  const [invitedTwitterUsersState, setInvitedTwitterUsersState] = useState([]);
  const [loadingTwitterInvites, setLoadingTwitterInvites] = useState(false);

  const currentQuestionId = useMemo(() => {
    const candidateQuestionId = route?.params?.questionId ?? route?.params?.id ?? null;
    const normalizedQuestionId = String(candidateQuestionId ?? '').trim();
    return normalizedQuestionId || null;
  }, [route?.params?.id, route?.params?.questionId]);

  const questionTitle = String(route?.params?.questionTitle ?? '').trim();
  const questionContent = String(route?.params?.questionContent ?? '').trim();

  const loadInvitedTwitterUsers = React.useCallback(async () => {
    if (!currentQuestionId) {
      setInvitedTwitterUsersState([]);
      return;
    }

    try {
      setLoadingTwitterInvites(true);
      const storedInvites = await loadQuestionTwitterInvites(currentQuestionId);
      setInvitedTwitterUsersState(storedInvites);
    } catch (error) {
      console.error('Failed to load invite answer twitter invites:', error);
      setInvitedTwitterUsersState([]);
    } finally {
      setLoadingTwitterInvites(false);
    }
  }, [currentQuestionId]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentInviteUsername = async () => {
      try {
        const [userInfoRaw, currentUsername] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('currentUsername'),
        ]);

        const candidates = [];

        if (userInfoRaw) {
          try {
            const userInfo = JSON.parse(userInfoRaw);
            candidates.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.error('Failed to parse current user info for invite answer twitter copy:', parseError);
          }
        }

        candidates.push(currentUsername);

        const normalizedName = candidates
          .map(item => String(item ?? '').trim())
          .find(Boolean);

        if (isMounted && normalizedName) {
          setCurrentInviteUsername(normalizedName.startsWith('@') ? normalizedName : `@${normalizedName}`);
        }
      } catch (storageError) {
        console.error('Failed to load current user name for invite answer twitter copy:', storageError);
      }
    };

    loadCurrentInviteUsername();
    loadInvitedTwitterUsers();

    return () => {
      isMounted = false;
    };
  }, [loadInvitedTwitterUsers]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadInvitedTwitterUsers();
    });

    return unsubscribe;
  }, [navigation, loadInvitedTwitterUsers]);

  const invitedTwitterUsersMap = useMemo(() => {
    return invitedTwitterUsersState.reduce((result, item) => {
      if (item?.id) {
        result[item.id] = item;
      }
      return result;
    }, {});
  }, [invitedTwitterUsersState]);

  const filteredLocalUsers = useMemo(() => {
    const normalizedSearch = searchLocalUser.trim().toLowerCase();

    if (!normalizedSearch) {
      return localInviteUsers;
    }

    return localInviteUsers.filter(user => {
      return `${user.name} ${user.description}`.toLowerCase().includes(normalizedSearch);
    });
  }, [searchLocalUser]);

  const normalizedTwitterSearch = useMemo(
    () => searchTwitterUser.trim().toLowerCase(),
    [searchTwitterUser]
  );

  const filteredTwitterUsers = useMemo(() => {
    if (!normalizedTwitterSearch) {
      return twitterInviteUsers;
    }

    return twitterInviteUsers.filter(user => {
      const searchSource = [user?.name, user?.followers, user?.id]
        .map(item => String(item ?? '').toLowerCase())
        .join(' ');

      return searchSource.includes(normalizedTwitterSearch);
    });
  }, [normalizedTwitterSearch]);

  const recommendedTwitterUsers = useMemo(
    () => filteredTwitterUsers.slice(0, 5),
    [filteredTwitterUsers]
  );

  const invitedTwitterUsers = useMemo(() => {
    if (!normalizedTwitterSearch) {
      return invitedTwitterUsersState;
    }

    return invitedTwitterUsersState.filter(user => {
      const searchSource = [user?.name, user?.followers, user?.id]
        .map(item => String(item ?? '').toLowerCase())
        .join(' ');

      return searchSource.includes(normalizedTwitterSearch);
    });
  }, [invitedTwitterUsersState, normalizedTwitterSearch]);

  const buildQuestionSharePayload = () => ({
    title: questionTitle,
    content: questionContent,
    type: 'sharequestion',
    qid: currentQuestionId ? Number(currentQuestionId) || currentQuestionId : null,
  });

  const buildTwitterInviteDraftText = React.useCallback((twitterUser, sharePayload) => {
    const inviterUsername = typeof currentInviteUsername === 'string' && currentInviteUsername.trim()
      ? currentInviteUsername.trim()
      : 'ProblemToHero';

    return buildProblemToHeroInviteText({
      twitterHandle: twitterUser?.name,
      inviterUsername,
      title: sharePayload?.title,
    });
  }, [currentInviteUsername]);

  const closeTwitterInviteEditor = React.useCallback(() => {
    setShowTwitterInviteEditor(false);
    setTwitterInviteDraftText('');
    setSelectedTwitterInviteUser(null);
  }, []);

  const openTwitterInviteEditor = user => {
    if (!currentQuestionId) {
      showToast('缺少问题ID，暂时无法发起邀请', 'warning');
      return;
    }

    const sharePayload = buildQuestionSharePayload();
    setSelectedTwitterInviteUser(user);
    setTwitterInviteDraftText(buildTwitterInviteDraftText(user, sharePayload));
    setShowTwitterInviteEditor(true);
  };

  const handleTwitterInviteShare = async customShareText => {
    if (!selectedTwitterInviteUser?.id) {
      showToast('请选择要邀请的推特用户', 'warning');
      return;
    }
    if (!currentQuestionId) {
      showToast('缺少问题ID，暂时无法发起邀请', 'warning');
      return;
    }

    setPendingTwitterInvitePlatform('twitter');

    try {
      const result = await openTwitterShare({
        ...buildQuestionSharePayload(),
        shareText: customShareText,
      });

      const fallbackInviteRecord = {
        ...selectedTwitterInviteUser,
        status: 'initiated',
        statusText: getTwitterInviteStatusText('initiated'),
        inviteText: String(customShareText ?? '').trim(),
        openedVia: result?.openedVia || '',
        updatedAt: new Date().toISOString(),
      };

      try {
        const savedInvite = await saveQuestionTwitterInvite(currentQuestionId, selectedTwitterInviteUser, {
          status: 'initiated',
          inviteText: customShareText,
          openedVia: result?.openedVia,
        });

        setInvitedTwitterUsersState(previousItems => [
          savedInvite,
          ...previousItems.filter(item => item.id !== savedInvite.id),
        ]);
      } catch (storageError) {
        console.error('Failed to persist invite answer twitter state:', storageError);
        setInvitedTwitterUsersState(previousItems => [
          fallbackInviteRecord,
          ...previousItems.filter(item => item.id !== fallbackInviteRecord.id),
        ]);
      }

      if (result?.openedVia === 'browser') {
        showToast('Twitter app not installed, opened web share', 'info');
      } else {
        showToast('已发起邀请', 'success');
      }

      closeTwitterInviteEditor();
    } catch (error) {
      console.error('Failed to invite via twitter from invite answer screen:', error);
      showToast('Unable to open Twitter', 'error');
    } finally {
      setPendingTwitterInvitePlatform(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.inviteAnswer.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {questionTitle ? (
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>当前问题</Text>
          <Text style={styles.questionTitle} numberOfLines={2}>{questionTitle}</Text>
        </View>
      ) : null}

      <View style={styles.platformTabs}>
        <TouchableOpacity
          style={[styles.platformTab, inviteTab === 'local' && styles.platformTabActive]}
          onPress={() => setInviteTab('local')}
        >
          <Text style={[styles.platformTabText, inviteTab === 'local' && styles.platformTabTextActive]}>
            {t('screens.inviteAnswer.tabs.local')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.platformTab, inviteTab === 'twitter' && styles.platformTabActive]}
          onPress={() => setInviteTab('twitter')}
        >
          <Ionicons name="logo-twitter" size={16} color={inviteTab === 'twitter' ? '#1DA1F2' : '#9ca3af'} />
          <Text style={[styles.platformTabText, inviteTab === 'twitter' && styles.platformTabTextActive]}>
            {t('screens.inviteAnswer.tabs.twitter')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              inviteTab === 'local'
                ? t('screens.inviteAnswer.search.placeholder')
                : t('screens.inviteAnswer.search.placeholderTwitter')
            }
            placeholderTextColor="#9ca3af"
            value={inviteTab === 'local' ? searchLocalUser : searchTwitterUser}
            onChangeText={text => {
              if (inviteTab === 'local') {
                setSearchLocalUser(text);
              } else {
                setSearchTwitterUser(text);
              }
            }}
          />
        </View>
      </View>

      <ScrollView
        style={styles.userList}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {inviteTab === 'local' && filteredLocalUsers.map(user => (
          <View key={user.id} style={styles.userItem}>
            <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userDesc}>{user.description}</Text>
            </View>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => {
                showToast(`${t('screens.inviteAnswer.alerts.invitedLocal')}${user.name}`, 'success');
                navigation.goBack();
              }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.inviteBtnText}>{t('screens.inviteAnswer.actions.invite')}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {inviteTab === 'local' && filteredLocalUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>没有匹配的本站用户</Text>
          </View>
        )}

        {inviteTab === 'twitter' && (
          <View>
            <Text style={styles.sectionTitle}>推荐邀请</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
              {recommendedTwitterUsers.map(user => {
                const invitedRecord = invitedTwitterUsersMap[user.id];
                const inviteCompleted = Boolean(invitedRecord);
                const inviteStatusText = invitedRecord?.statusText || '已发起';

                return (
                  <View key={user.id} style={styles.recommendUserCard}>
                    <Avatar uri={user.avatar} name={user.name} size={36} />
                    <View style={styles.recommendUserTextContainer}>
                      <Text style={styles.recommendUserName} numberOfLines={1}>{user.name}</Text>
                      <Text style={styles.recommendUserDesc} numberOfLines={1}>{user.followers}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.recommendInviteBtn,
                        inviteCompleted ? styles.recommendInviteBtnInvited : styles.recommendInviteBtnTwitter,
                      ]}
                      onPress={() => {
                        if (inviteCompleted) {
                          showToast(invitedRecord?.statusText || '已发起邀请', 'info');
                          return;
                        }

                        openTwitterInviteEditor(user);
                      }}
                      disabled={pendingTwitterInvitePlatform === 'twitter'}
                    >
                      {pendingTwitterInvitePlatform === 'twitter' && selectedTwitterInviteUser?.id === user.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : inviteCompleted ? (
                        <Text style={styles.recommendInviteBtnText}>{inviteStatusText}</Text>
                      ) : (
                        <Ionicons name="logo-twitter" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {recommendedTwitterUsers.length === 0 && (
                <View style={styles.emptyInlineCard}>
                  <Text style={styles.emptyInlineText}>没有匹配的推特用户</Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.sectionTitle}>已发起邀请</Text>
            {invitedTwitterUsers.length === 0 && !loadingTwitterInvites && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {normalizedTwitterSearch ? '没有匹配的邀请记录' : '保存文案并跳转到推特后，会展示在这里'}
                </Text>
              </View>
            )}

            {invitedTwitterUsers.map(user => (
              <View key={`invited-${user.id}`} style={styles.userItem}>
                <Avatar uri={user.avatar} name={user.name} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userDesc}>{user.followers}</Text>
                </View>
                <View style={styles.invitedTag}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.invitedTagText}>{user.statusText || '已发起邀请'}</Text>
                </View>
              </View>
            ))}

            {loadingTwitterInvites && (
              <View style={styles.loadingIndicator}>
                <Text style={styles.loadingText}>加载中...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <EditTextModal
        visible={showTwitterInviteEditor}
        onClose={closeTwitterInviteEditor}
        title="编辑推特邀请文案"
        currentValue={twitterInviteDraftText}
        onSave={handleTwitterInviteShare}
        placeholder={`请输入要分享到推特的文案，可手动添加 ${selectedTwitterInviteUser?.name || '@用户名'}`}
        maxLength={220}
        multiline
        hint="链接会自动追加到文案后面"
        loading={pendingTwitterInvitePlatform === 'twitter'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  questionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  questionLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 6,
  },
  questionTitle: {
    fontSize: scaleFont(14),
    color: '#111827',
    fontWeight: '600',
    lineHeight: scaleFont(20),
  },
  platformTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  platformTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  platformTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  platformTabText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500',
  },
  platformTabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
    padding: 0,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  recommendScroll: {
    marginBottom: 18,
  },
  recommendUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#fafafa',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 8,
  },
  recommendUserTextContainer: {
    flex: 1,
  },
  recommendUserName: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  recommendUserDesc: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
  },
  recommendInviteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendInviteBtnTwitter: {
    backgroundColor: '#1DA1F2',
  },
  recommendInviteBtnInvited: {
    backgroundColor: '#22c55e',
    width: 'auto',
    minWidth: 54,
    paddingHorizontal: 8,
  },
  recommendInviteBtnText: {
    fontSize: scaleFont(10),
    color: '#fff',
    fontWeight: '500',
  },
  emptyInlineCard: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyInlineText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  userDesc: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  inviteBtnText: {
    fontSize: scaleFont(12),
    color: '#fff',
    fontWeight: '600',
  },
  invitedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  invitedTagText: {
    fontSize: scaleFont(12),
    color: '#22c55e',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
  },
  emptyStateText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    textAlign: 'center',
  },
  loadingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
});
