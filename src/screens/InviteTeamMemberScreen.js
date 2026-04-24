import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import EditTextModal from '../components/EditTextModal';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';
import { DEFAULT_MENTION_SEARCH_LIMIT } from '../utils/mentionComposer';
import twitterInviteUsers from '../utils/twitterInviteUsers';
import {
  getTwitterInviteStatusText,
  loadQuestionTwitterInvites,
  saveQuestionTwitterInvite,
} from '../services/twitterInviteState';
import {
  LOCAL_INVITE_STATUSES,
  loadQuestionLocalInvites,
  saveQuestionLocalInvite,
} from '../services/localInviteState';
import {
  buildLocalInviteDisplayName,
  buildLocalInviteUserDescription,
  mergeLocalInviteUsers,
  normalizeFollowingInviteUsers,
  normalizeLocalInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';
import {
  isPrivateMessagingServiceUnavailableError,
  sendPlainPrivateMessage,
} from '../utils/privateShareService';
import { openTwitterShare } from '../utils/shareService';
import userApi from '../services/api/userApi';

const interpolate = (template, values = {}) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? '')),
    String(template ?? '')
  );

const FOLLOWING_REQUEST = {
  pageNum: 1,
  page: 1,
  pageSize: 20,
  size: 20,
  limit: 20,
};

const FALLBACK_SEARCH_KEYWORDS = ['a', 'e', 'm', '1', '8'];

export default function InviteTeamMemberScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [inviteTab, setInviteTab] = useState('local');
  const [searchLocalUser, setSearchLocalUser] = useState('');
  const [searchTwitterUser, setSearchTwitterUser] = useState('');
  const [currentInviteUsername, setCurrentInviteUsername] = useState('');
  const [currentInviteUserId, setCurrentInviteUserId] = useState('');
  const [recommendedLocalUsers, setRecommendedLocalUsers] = useState([]);
  const [searchedLocalUsers, setSearchedLocalUsers] = useState([]);
  const [invitedLocalUsersState, setInvitedLocalUsersState] = useState([]);
  const [loadingLocalInviteUsers, setLoadingLocalInviteUsers] = useState(false);
  const [loadingLocalSearch, setLoadingLocalSearch] = useState(false);
  const [sendingLocalInviteUserId, setSendingLocalInviteUserId] = useState(null);
  const [showTwitterInviteEditor, setShowTwitterInviteEditor] = useState(false);
  const [twitterInviteDraftText, setTwitterInviteDraftText] = useState('');
  const [selectedTwitterInviteUser, setSelectedTwitterInviteUser] = useState(null);
  const [pendingTwitterInvitePlatform, setPendingTwitterInvitePlatform] = useState(null);
  const [invitedTwitterUsersState, setInvitedTwitterUsersState] = useState([]);
  const [loadingTwitterInvites, setLoadingTwitterInvites] = useState(false);

  const translate = useCallback((key, fallback = '') => {
    const value = t(key);
    return typeof value === 'string' && !value.includes('.') ? value : fallback;
  }, [t]);

  const currentTeamId = useMemo(() => {
    const candidateTeamId = route?.params?.teamId ?? route?.params?.id ?? null;
    const normalizedTeamId = String(candidateTeamId ?? '').trim();
    return normalizedTeamId || null;
  }, [route?.params?.id, route?.params?.teamId]);

  const teamStateKey = useMemo(
    () => (currentTeamId ? `team:${currentTeamId}` : null),
    [currentTeamId]
  );

  const teamName = String(route?.params?.teamName ?? '').trim();
  const normalizedTeamName = teamName || translate('screens.inviteTeamMember.defaults.teamName', 'this team');
  const teamShareUrl = useMemo(
    () => (currentTeamId ? `problemvshero://team/${currentTeamId}` : ''),
    [currentTeamId]
  );
  const routeExcludedLocalUsers = useMemo(
    () => normalizeLocalInviteUsers(route?.params?.excludedLocalUsers ?? []),
    [route?.params?.excludedLocalUsers]
  );
  const excludedLocalUserIds = useMemo(
    () => new Set(
      routeExcludedLocalUsers
        .map(user => String(user?.id ?? user?.userId ?? '').trim())
        .filter(Boolean)
    ),
    [routeExcludedLocalUsers]
  );

  const localInvitedStatusText = translate('screens.inviteTeamMember.status.invited', 'Invited');
  const localRetryStatusText = translate('screens.inviteTeamMember.status.retry', 'Retry');
  const twitterInitiatedStatusText = translate('screens.inviteTeamMember.status.initiated', 'Initiated');

  const getLocalStatusText = useCallback(record => (
    String(record?.status ?? '').trim() === LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE
      ? localRetryStatusText
      : localInvitedStatusText
  ), [localInvitedStatusText, localRetryStatusText]);

  const getTwitterStatusText = useCallback(record => {
    const normalizedStatus = String(record?.status ?? '').trim();
    if (normalizedStatus === 'invited' || normalizedStatus === 'initiated') {
      return twitterInitiatedStatusText;
    }
    return twitterInitiatedStatusText;
  }, [twitterInitiatedStatusText]);

  const loadInvitedTwitterUsers = useCallback(async () => {
    if (!teamStateKey) {
      setInvitedTwitterUsersState([]);
      return;
    }
    try {
      setLoadingTwitterInvites(true);
      const storedInvites = await loadQuestionTwitterInvites(teamStateKey);
      setInvitedTwitterUsersState(storedInvites);
    } catch (error) {
      console.error('Failed to load invite team member twitter invites:', error);
      setInvitedTwitterUsersState([]);
    } finally {
      setLoadingTwitterInvites(false);
    }
  }, [teamStateKey]);

  const loadInvitedLocalUsers = useCallback(async () => {
    if (!teamStateKey) {
      setInvitedLocalUsersState([]);
      return;
    }
    try {
      setLoadingLocalInviteUsers(true);
      const storedInvites = await loadQuestionLocalInvites(teamStateKey);
      setInvitedLocalUsersState(storedInvites);
    } catch (error) {
      console.error('Failed to load invite team member local invites:', error);
      setInvitedLocalUsersState([]);
    } finally {
      setLoadingLocalInviteUsers(false);
    }
  }, [teamStateKey]);

  const loadRecommendedLocalUsers = useCallback(async () => {
    try {
      let mergedUsers = [];

      try {
        const response = await userApi.getFollowing(FOLLOWING_REQUEST);
        mergedUsers = mergeLocalInviteUsers(normalizeFollowingInviteUsers(response));
      } catch (followError) {
        console.warn('Failed to load following users for team invite recommendation:', followError);
      }

      if (mergedUsers.length < 6) {
        const fallbackResults = await Promise.allSettled(
          FALLBACK_SEARCH_KEYWORDS.map(keyword => userApi.searchPublicProfiles(keyword, 10))
        );

        fallbackResults.forEach(result => {
          if (result.status !== 'fulfilled') {
            return;
          }

          mergedUsers = mergeLocalInviteUsers([
            ...mergedUsers,
            ...normalizePublicUserSearchResponse(result.value),
          ]);
        });
      }

      setRecommendedLocalUsers(mergedUsers.slice(0, DEFAULT_MENTION_SEARCH_LIMIT));
    } catch (error) {
      console.warn('Failed to load invite team member recommended local users:', error);
      setRecommendedLocalUsers([]);
    }
  }, []);

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
            if (isMounted) {
              const normalizedUserId = String(userInfo?.userId ?? userInfo?.id ?? userInfo?.uid ?? '').trim();
              if (normalizedUserId) {
                setCurrentInviteUserId(normalizedUserId);
              }
            }
            candidates.push(
              userInfo?.username,
              userInfo?.nickName,
              userInfo?.nickname,
              userInfo?.userName,
              userInfo?.name
            );
          } catch (parseError) {
            console.error('Failed to parse current user info for invite team member copy:', parseError);
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
        console.error('Failed to load current user name for invite team member copy:', storageError);
      }
    };

    loadCurrentInviteUsername();
    loadInvitedLocalUsers();
    loadInvitedTwitterUsers();
    loadRecommendedLocalUsers();

    return () => {
      isMounted = false;
    };
  }, [loadInvitedLocalUsers, loadInvitedTwitterUsers, loadRecommendedLocalUsers]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadInvitedLocalUsers();
      loadInvitedTwitterUsers();
      loadRecommendedLocalUsers();
    });

    return unsubscribe;
  }, [loadInvitedLocalUsers, loadInvitedTwitterUsers, loadRecommendedLocalUsers, navigation]);

  useEffect(() => {
    const normalizedKeyword = searchLocalUser.trim();

    if (!normalizedKeyword) {
      setSearchedLocalUsers([]);
      setLoadingLocalSearch(false);
      return undefined;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      try {
        setLoadingLocalSearch(true);
        const response = await userApi.searchPublicProfiles(normalizedKeyword, 20);
        if (!isActive) {
          return;
        }
        setSearchedLocalUsers(normalizePublicUserSearchResponse(response));
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('Failed to search local users in invite team member screen:', error);
        setSearchedLocalUsers([]);
      } finally {
        if (isActive) {
          setLoadingLocalSearch(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchLocalUser]);

  const invitedLocalUsersMap = useMemo(() => (
    invitedLocalUsersState.reduce((result, item) => {
      if (item?.id) {
        result[item.id] = item;
      }
      return result;
    }, {})
  ), [invitedLocalUsersState]);

  const invitedTwitterUsersMap = useMemo(() => (
    invitedTwitterUsersState.reduce((result, item) => {
      if (item?.id) {
        result[item.id] = item;
      }
      return result;
    }, {})
  ), [invitedTwitterUsersState]);

  const displayedLocalUsers = useMemo(() => {
    const normalizedKeyword = searchLocalUser.trim();
    const sourceUsers = normalizedKeyword ? searchedLocalUsers : recommendedLocalUsers;

    return mergeLocalInviteUsers(sourceUsers).filter(user => {
      const normalizedId = String(user?.id ?? user?.userId ?? '').trim();
      if (!normalizedId) {
        return false;
      }
      if (excludedLocalUserIds.has(normalizedId)) {
        return false;
      }
      if (currentInviteUserId && normalizedId === currentInviteUserId) {
        return false;
      }
      return !invitedLocalUsersMap[normalizedId] || String(invitedLocalUsersMap[normalizedId]?.status ?? '').trim() !== LOCAL_INVITE_STATUSES.INVITED;
    });
  }, [currentInviteUserId, excludedLocalUserIds, invitedLocalUsersMap, recommendedLocalUsers, searchLocalUser, searchedLocalUsers]);

  const visibleInvitedLocalUsers = useMemo(() => {
    const normalizedKeyword = searchLocalUser.trim().toLowerCase();

    if (!normalizedKeyword) {
      return invitedLocalUsersState;
    }

    return invitedLocalUsersState.filter(user => {
      const searchSource = [
        buildLocalInviteDisplayName(user),
        user?.username,
        user?.profession,
        user?.signature,
        user?.location,
      ]
        .map(item => String(item ?? '').toLowerCase())
        .join(' ');

      return searchSource.includes(normalizedKeyword);
    });
  }, [invitedLocalUsersState, searchLocalUser]);

  const normalizedTwitterSearch = useMemo(
    () => searchTwitterUser.trim().toLowerCase(),
    [searchTwitterUser]
  );

  const filteredTwitterUsers = useMemo(() => {
    if (!normalizedTwitterSearch) {
      return twitterInviteUsers.filter(user => !invitedTwitterUsersMap[user.id]);
    }

    return twitterInviteUsers.filter(user => {
      const searchSource = [user?.name, user?.followers, user?.id]
        .map(item => String(item ?? '').toLowerCase())
        .join(' ');

      return searchSource.includes(normalizedTwitterSearch);
    });
  }, [invitedTwitterUsersMap, normalizedTwitterSearch]);

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

  const buildLocalInviteMessage = useCallback(targetUser => {
    const inviterName = currentInviteUsername.trim()
      ? currentInviteUsername.replace(/^@/, '').trim()
      : 'ProblemVsHero';
    const targetName = buildLocalInviteDisplayName(targetUser);
    const lines = [
      interpolate(
        translate('screens.inviteTeamMember.messages.localInviteGreeting', 'Hi {name},'),
        { name: targetName }
      ),
      interpolate(
        translate('screens.inviteTeamMember.messages.localInviteIntro', 'I am {inviter} and would like to invite you to a team on Problem vs Hero.'),
        { inviter: inviterName }
      ),
      interpolate(
        translate('screens.inviteTeamMember.messages.localInviteTeamLine', 'Team: {teamName}'),
        { teamName: normalizedTeamName }
      ),
    ];

    if (teamShareUrl) {
      lines.push(
        interpolate(
          translate('screens.inviteTeamMember.messages.localInviteLinkLine', 'View team: {shareUrl}'),
          { shareUrl: teamShareUrl }
        )
      );
    }

    lines.push(
      translate('screens.inviteTeamMember.messages.localInviteClosing', 'If you are interested, come join us.')
    );

    return lines.filter(Boolean).join('\n');
  }, [currentInviteUsername, normalizedTeamName, teamShareUrl, translate]);

  const handleLocalInvite = useCallback(async targetUser => {
    if (!targetUser?.userId) {
      showToast(translate('screens.inviteTeamMember.toasts.incompleteUser', 'User info is incomplete.'), 'warning');
      return;
    }
    if (!teamStateKey) {
      showToast(translate('screens.inviteTeamMember.toasts.missingTeamId', 'Team ID is missing.'), 'warning');
      return;
    }
    if (sendingLocalInviteUserId) {
      return;
    }

    const existingInviteRecord = invitedLocalUsersMap[targetUser.userId];
    if (existingInviteRecord && String(existingInviteRecord?.status ?? '').trim() === LOCAL_INVITE_STATUSES.INVITED) {
      showToast(localInvitedStatusText, 'info');
      return;
    }

    const inviteText = buildLocalInviteMessage(targetUser);

    try {
      setSendingLocalInviteUserId(targetUser.userId);
      await sendPlainPrivateMessage({
        recipientUserId: targetUser.userId,
        content: inviteText,
      });

      let savedInvite;
      try {
        savedInvite = await saveQuestionLocalInvite(teamStateKey, targetUser, {
          status: LOCAL_INVITE_STATUSES.INVITED,
          inviteText,
        });
      } catch (storageError) {
        console.error('Failed to persist local team invite state:', storageError);
        savedInvite = {
          ...targetUser,
          id: String(targetUser.userId),
          status: LOCAL_INVITE_STATUSES.INVITED,
          inviteText,
          updatedAt: new Date().toISOString(),
        };
      }

      setInvitedLocalUsersState(previousItems => [
        savedInvite,
        ...previousItems.filter(item => item.id !== savedInvite.id),
      ]);
      showToast(translate('screens.inviteTeamMember.toasts.localInvited', 'Invited'), 'success');
    } catch (error) {
      if (isPrivateMessagingServiceUnavailableError(error)) {
        console.warn('Private messaging service unavailable in invite team member screen:', error?.originalMessage || error?.message);

        let retryInviteRecord;
        try {
          retryInviteRecord = await saveQuestionLocalInvite(teamStateKey, targetUser, {
            status: LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE,
            inviteText,
          });
        } catch (storageError) {
          console.error('Failed to persist retryable local team invite state:', storageError);
          retryInviteRecord = {
            ...targetUser,
            id: String(targetUser.userId),
            status: LOCAL_INVITE_STATUSES.SERVICE_UNAVAILABLE,
            inviteText,
            updatedAt: new Date().toISOString(),
          };
        }

        setInvitedLocalUsersState(previousItems => [
          retryInviteRecord,
          ...previousItems.filter(item => item.id !== retryInviteRecord.id),
        ]);
        showToast(translate('screens.inviteTeamMember.toasts.serviceUnavailable', 'Private messaging is temporarily unavailable.'), 'warning');
        return;
      }

      console.error('Failed to send local invite in invite team member screen:', error);
      showToast(error?.message || translate('screens.inviteTeamMember.toasts.sendFailed', 'Failed to send invite.'), 'error');
    } finally {
      setSendingLocalInviteUserId(null);
    }
  }, [buildLocalInviteMessage, invitedLocalUsersMap, localInvitedStatusText, sendingLocalInviteUserId, teamStateKey, translate]);

  const buildTwitterInviteDraftText = useCallback(twitterUser => {
    const inviterHandle = currentInviteUsername.trim() || '@ProblemVsHero';
    return interpolate(
      translate(
        'screens.inviteTeamMember.messages.twitterInvite',
        '{target} {inviter} invited you to join the team "{teamName}" on Problem vs Hero.'
      ),
      {
        target: twitterUser?.name || '@ProblemVsHero',
        inviter: inviterHandle,
        teamName: normalizedTeamName,
      }
    );
  }, [currentInviteUsername, normalizedTeamName, translate]);

  const closeTwitterInviteEditor = useCallback(() => {
    setShowTwitterInviteEditor(false);
    setTwitterInviteDraftText('');
    setSelectedTwitterInviteUser(null);
  }, []);

  const openTwitterInviteEditor = useCallback(user => {
    if (!teamStateKey) {
      showToast(translate('screens.inviteTeamMember.toasts.missingTeamId', 'Team ID is missing.'), 'warning');
      return;
    }

    setSelectedTwitterInviteUser(user);
    setTwitterInviteDraftText(buildTwitterInviteDraftText(user));
    setShowTwitterInviteEditor(true);
  }, [buildTwitterInviteDraftText, teamStateKey, translate]);

  const handleTwitterInviteShare = useCallback(async customShareText => {
    if (!selectedTwitterInviteUser?.id) {
      showToast(translate('screens.inviteTeamMember.toasts.selectTwitterUser', 'Please select a Twitter user.'), 'warning');
      return;
    }
    if (!teamStateKey) {
      showToast(translate('screens.inviteTeamMember.toasts.missingTeamId', 'Team ID is missing.'), 'warning');
      return;
    }

    setPendingTwitterInvitePlatform('twitter');

    try {
      const result = await openTwitterShare({
        title: normalizedTeamName,
        url: teamShareUrl || 'problemvshero://',
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
        const savedInvite = await saveQuestionTwitterInvite(teamStateKey, selectedTwitterInviteUser, {
          status: 'initiated',
          inviteText: customShareText,
          openedVia: result?.openedVia,
        });

        setInvitedTwitterUsersState(previousItems => [
          savedInvite,
          ...previousItems.filter(item => item.id !== savedInvite.id),
        ]);
      } catch (storageError) {
        console.error('Failed to persist team twitter invite state:', storageError);
        setInvitedTwitterUsersState(previousItems => [
          fallbackInviteRecord,
          ...previousItems.filter(item => item.id !== fallbackInviteRecord.id),
        ]);
      }

      showToast(
        result?.openedVia === 'browser'
          ? translate('screens.inviteTeamMember.toasts.twitterBrowserFallback', 'Opened web share because Twitter is unavailable.')
          : translate('screens.inviteTeamMember.toasts.twitterInitiated', 'Invite started.'),
        result?.openedVia === 'browser' ? 'info' : 'success'
      );
      closeTwitterInviteEditor();
    } catch (error) {
      console.error('Failed to invite via twitter from invite team member screen:', error);
      showToast(translate('screens.inviteTeamMember.toasts.openTwitterFailed', 'Unable to open Twitter.'), 'error');
    } finally {
      setPendingTwitterInvitePlatform(null);
    }
  }, [closeTwitterInviteEditor, normalizedTeamName, selectedTwitterInviteUser, teamShareUrl, teamStateKey, translate]);

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
        <Text style={styles.headerTitle}>{translate('screens.inviteTeamMember.title', 'Invite Team Members')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.platformTabs}>
        <TouchableOpacity
          style={[styles.platformTab, inviteTab === 'local' && styles.platformTabActive]}
          onPress={() => setInviteTab('local')}
        >
          <Text style={[styles.platformTabText, inviteTab === 'local' && styles.platformTabTextActive]}>
            {translate('screens.inviteTeamMember.tabs.platform', 'Local')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.platformTab, inviteTab === 'twitter' && styles.platformTabActive]}
          onPress={() => setInviteTab('twitter')}
        >
          <Ionicons name="logo-twitter" size={16} color={inviteTab === 'twitter' ? '#1DA1F2' : '#9ca3af'} />
          <Text style={[styles.platformTabText, inviteTab === 'twitter' && styles.platformTabTextActive]}>
            {translate('screens.inviteTeamMember.tabs.twitter', 'Twitter')}
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
                ? translate('screens.inviteTeamMember.search.placeholder', 'Search users')
                : translate('screens.inviteTeamMember.search.placeholderTwitter', 'Search Twitter users')
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
        {inviteTab === 'local' && (
          <View>
            <Text style={styles.sectionTitle}>
              {searchLocalUser.trim()
                ? translate('screens.inviteTeamMember.sections.searchResults', 'Search Results')
                : translate('screens.inviteTeamMember.sections.recommended', 'Recommended')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
              {displayedLocalUsers.slice(0, 8).map(user => {
                const invitedRecord = invitedLocalUsersMap[user.id];
                const inviteCompleted = String(invitedRecord?.status ?? '').trim() === LOCAL_INVITE_STATUSES.INVITED;
                const inviteStatusText = getLocalStatusText(invitedRecord);
                const inviteNeedsRetry = Boolean(invitedRecord) && !inviteCompleted;
                const isSendingInvite = sendingLocalInviteUserId === user.userId;

                return (
                  <View key={user.id} style={styles.recommendUserCard}>
                    <Avatar uri={user.avatar} name={buildLocalInviteDisplayName(user)} size={36} />
                    <View style={styles.recommendUserTextContainer}>
                      <Text style={styles.recommendUserName} numberOfLines={1}>{buildLocalInviteDisplayName(user)}</Text>
                      <Text style={styles.recommendUserDesc} numberOfLines={1}>{buildLocalInviteUserDescription(user)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.recommendInviteBtn,
                        inviteCompleted
                          ? styles.recommendInviteBtnInvited
                          : inviteNeedsRetry
                            ? styles.recommendInviteBtnRetry
                            : styles.recommendInviteBtnLocal,
                      ]}
                      onPress={() => {
                        if (inviteCompleted) {
                          showToast(inviteStatusText, 'info');
                          return;
                        }
                        handleLocalInvite(user);
                      }}
                      disabled={Boolean(sendingLocalInviteUserId)}
                    >
                      {isSendingInvite ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : inviteCompleted || inviteNeedsRetry ? (
                        <Text style={styles.recommendInviteBtnText}>{inviteStatusText}</Text>
                      ) : (
                        <Ionicons name="add" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {displayedLocalUsers.length === 0 && !loadingLocalSearch && (
                <View style={styles.emptyInlineCard}>
                  <Text style={styles.emptyInlineText}>
                    {searchLocalUser.trim()
                      ? translate('screens.inviteTeamMember.empty.noSearchResults', 'No matching users found')
                      : translate('screens.inviteTeamMember.empty.noLocalUsers', 'No local users available to invite')}
                  </Text>
                </View>
              )}

              {loadingLocalSearch && (
                <View style={styles.emptyInlineCard}>
                  <Text style={styles.emptyInlineText}>
                    {translate('screens.inviteTeamMember.empty.loading', 'Loading...')}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {translate('screens.inviteTeamMember.sections.invited', 'Invited')}
            </Text>
            {visibleInvitedLocalUsers.length === 0 && !loadingLocalInviteUsers && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {searchLocalUser.trim()
                    ? translate('screens.inviteTeamMember.empty.noInvitedSearch', 'No matching invite records')
                    : translate('screens.inviteTeamMember.empty.noInvited', 'Successful invites will appear here')}
                </Text>
              </View>
            )}

            {visibleInvitedLocalUsers.map(user => (
              <View key={`invited-local-${user.id}`} style={styles.userItem}>
                <Avatar uri={user.avatar} name={buildLocalInviteDisplayName(user)} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{buildLocalInviteDisplayName(user)}</Text>
                  <Text style={styles.userDesc}>{buildLocalInviteUserDescription(user)}</Text>
                </View>
                <View style={styles.invitedTag}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.invitedTagText}>{getLocalStatusText(user)}</Text>
                </View>
              </View>
            ))}

            {loadingLocalInviteUsers && (
              <View style={styles.loadingIndicator}>
                <Text style={styles.loadingText}>
                  {translate('screens.inviteTeamMember.empty.loading', 'Loading...')}
                </Text>
              </View>
            )}
          </View>
        )}

        {inviteTab === 'twitter' && (
          <View>
            <Text style={styles.sectionTitle}>
              {translate('screens.inviteTeamMember.sections.recommended', 'Recommended')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendScroll}>
              {recommendedTwitterUsers.map(user => {
                const invitedRecord = invitedTwitterUsersMap[user.id];
                const inviteCompleted = Boolean(invitedRecord);
                const inviteStatusText = getTwitterStatusText(invitedRecord);

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
                          showToast(inviteStatusText, 'info');
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
                  <Text style={styles.emptyInlineText}>
                    {translate('screens.inviteTeamMember.empty.noTwitterUsers', 'No matching Twitter users')}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.sectionTitle}>
              {translate('screens.inviteTeamMember.sections.initiated', 'Invites Started')}
            </Text>
            {invitedTwitterUsers.length === 0 && !loadingTwitterInvites && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {normalizedTwitterSearch
                    ? translate('screens.inviteTeamMember.empty.noInvitedSearch', 'No matching invite records')
                    : translate('screens.inviteTeamMember.empty.noTwitterInvites', 'Saved Twitter invites will appear here')}
                </Text>
              </View>
            )}

            {invitedTwitterUsers.map(user => (
              <View key={`invited-twitter-${user.id}`} style={styles.userItem}>
                <Avatar uri={user.avatar} name={user.name} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userDesc}>{user.followers}</Text>
                </View>
                <View style={styles.invitedTag}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.invitedTagText}>{getTwitterStatusText(user)}</Text>
                </View>
              </View>
            ))}

            {loadingTwitterInvites && (
              <View style={styles.loadingIndicator}>
                <Text style={styles.loadingText}>
                  {translate('screens.inviteTeamMember.empty.loading', 'Loading...')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <EditTextModal
        visible={showTwitterInviteEditor}
        onClose={closeTwitterInviteEditor}
        title={translate('screens.inviteTeamMember.editor.title', 'Edit Twitter invite text')}
        currentValue={twitterInviteDraftText}
        onSave={handleTwitterInviteShare}
        placeholder={interpolate(
          translate('screens.inviteTeamMember.editor.placeholder', 'Enter text to share on Twitter. You can mention {name}.'),
          { name: selectedTwitterInviteUser?.name || '@username' }
        )}
        maxLength={220}
        multiline
        hint={translate('screens.inviteTeamMember.editor.hint', 'The link will be appended automatically')}
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
    minWidth: 90,
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
  recommendInviteBtnLocal: {
    backgroundColor: '#ef4444',
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
  recommendInviteBtnRetry: {
    backgroundColor: '#f59e0b',
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
