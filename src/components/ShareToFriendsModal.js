import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showAppAlert } from '../utils/appAlert';
import {
  buildPrivateSharePayload,
  sendPrivateShareMessage,
} from '../utils/privateShareService';
import userApi from '../services/api/userApi';
import { showToast } from '../utils/toast';
import {
  buildLocalInviteDisplayName,
  buildLocalInviteUserDescription,
  mergeLocalInviteUsers,
  normalizeFollowingInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';

import { scaleFont } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FOLLOWING_PAGE_SIZE = 100;
const MAX_FOLLOWING_PAGES = 10;
const DEFAULT_SHEET_HEIGHT = SCREEN_HEIGHT * 0.68;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;
const MIN_SHEET_HEIGHT = 320;
const SHEET_TOP_CLEARANCE = 12;

const toPositiveNumber = (value) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
};

const extractFollowingTotal = (response) => {
  const payload = response?.data;
  const nestedData = payload?.data;

  return (
    toPositiveNumber(payload?.total) ||
    toPositiveNumber(payload?.count) ||
    toPositiveNumber(payload?.totalCount) ||
    toPositiveNumber(payload?.pagination?.total) ||
    toPositiveNumber(payload?.page?.total) ||
    toPositiveNumber(nestedData?.total) ||
    toPositiveNumber(nestedData?.count) ||
    toPositiveNumber(nestedData?.totalCount) ||
    null
  );
};

export default function ShareToFriendsModal({ visible, onClose, shareData = {}, onShare }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = useBottomSafeInset(20);
  const loadRequestIdRef = React.useRef(0);
  const searchRequestIdRef = React.useRef(0);
  const listItemAnimations = React.useRef([]).current;
  const isClosingRef = React.useRef(false);

  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [backdropOpacity] = useState(new Animated.Value(0));
  const [keyboardOffsetAnim] = useState(new Animated.Value(0));
  const [sheetHeightAnim] = useState(new Animated.Value(DEFAULT_SHEET_HEIGHT));
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingLoadError, setFollowingLoadError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [sending, setSending] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const sharePreview = React.useMemo(() => buildPrivateSharePayload(shareData), [shareData]);
  const normalizedSearchKeyword = React.useMemo(() => String(searchText ?? '').trim(), [searchText]);
  const displayList = React.useMemo(() => {
    if (normalizedSearchKeyword) {
      return mergeLocalInviteUsers(searchedUsers);
    }

    return mergeLocalInviteUsers(followingList);
  }, [followingList, normalizedSearchKeyword, searchedUsers]);
  const resolveSheetHeight = React.useCallback(
    (nextKeyboardHeight = 0) => {
      const availableHeight = SCREEN_HEIGHT - Math.max(nextKeyboardHeight, 0) - Math.max(insets.top, 12) - SHEET_TOP_CLEARANCE;

      if (availableHeight <= MIN_SHEET_HEIGHT) {
        return Math.max(availableHeight, 240);
      }

      return Math.min(DEFAULT_SHEET_HEIGHT, Math.min(MAX_SHEET_HEIGHT, availableHeight));
    },
    [insets.top]
  );

  const initializeListAnimations = React.useCallback(
    (users) => {
      listItemAnimations.length = 0;
      users.forEach(() => {
        listItemAnimations.push(new Animated.Value(0));
      });

      if (users.length === 0) {
        return;
      }

      setTimeout(() => {
        const animations = listItemAnimations.map((anim, index) =>
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
            delay: index * 30,
          })
        );
        Animated.stagger(30, animations).start();
      }, 150);
    },
    [listItemAnimations]
  );

  const loadFollowingList = React.useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoadingFollowing(true);
    setFollowingLoadError('');

    try {
      let pageNum = 1;
      let expectedTotal = null;
      let mergedUsers = [];

      while (pageNum <= MAX_FOLLOWING_PAGES) {
        const response = await userApi.getFollowing({
          pageNum,
          page: pageNum,
          pageSize: FOLLOWING_PAGE_SIZE,
          size: FOLLOWING_PAGE_SIZE,
          limit: FOLLOWING_PAGE_SIZE,
        });

        const pageUsers = normalizeFollowingInviteUsers(response);
        mergedUsers = mergeLocalInviteUsers([...mergedUsers, ...pageUsers]);

        if (expectedTotal === null) {
          expectedTotal = extractFollowingTotal(response);
        }

        if (pageUsers.length < FOLLOWING_PAGE_SIZE) {
          break;
        }

        if (expectedTotal && mergedUsers.length >= expectedTotal) {
          break;
        }

        pageNum += 1;
      }

      if (loadRequestIdRef.current !== requestId) {
        return;
      }

      setFollowingList(mergedUsers);
      initializeListAnimations(mergedUsers);
    } catch (error) {
      if (loadRequestIdRef.current !== requestId) {
        return;
      }

      console.error('Failed to load following list:', error);
      setFollowingList([]);
      setFollowingLoadError(t('screens.messagesScreen.shareToFriendsModal.errors.loadFollowing'));
      showToast(t('screens.messagesScreen.shareToFriendsModal.errors.loadFollowingToast'), 'error');
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoadingFollowing(false);
      }
    }
  }, [initializeListAnimations, t]);

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }),
      ]).start();

      isClosingRef.current = false;
      loadFollowingList();
      return;
    }

    loadRequestIdRef.current += 1;
    backdropOpacity.setValue(0);
    slideAnim.setValue(SCREEN_HEIGHT);
    isClosingRef.current = false;

    setSearchText('');
    setSelectedUsers([]);
    setFollowingList([]);
    setSearchedUsers([]);
    setFollowingLoadError('');
    setSearchError('');
    setLoadingFollowing(false);
    setSearchLoading(false);
    setSending(false);
    setKeyboardHeight(0);
    keyboardOffsetAnim.setValue(0);
    sheetHeightAnim.setValue(resolveSheetHeight(0));
  }, [backdropOpacity, keyboardOffsetAnim, loadFollowingList, resolveSheetHeight, sheetHeightAnim, slideAnim, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    if (!normalizedSearchKeyword) {
      searchRequestIdRef.current += 1;
      setSearchedUsers([]);
      setSearchError('');
      setSearchLoading(false);
      return undefined;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError('');
        const response = await userApi.searchPublicProfiles(normalizedSearchKeyword, 20);

        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        const normalizedUsers = normalizePublicUserSearchResponse(response);
        setSearchedUsers(normalizedUsers);
        initializeListAnimations(normalizedUsers);
      } catch (error) {
        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        console.warn('Failed to search site users in share modal:', error);
        setSearchedUsers([]);
        setSearchError(t('screens.messagesScreen.shareToFriendsModal.errors.searchUsers'));
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [initializeListAnimations, normalizedSearchKeyword, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animateSheetLayout = (nextKeyboardHeight, event) => {
      const nextSheetHeight = resolveSheetHeight(nextKeyboardHeight);

      Animated.parallel([
        Animated.timing(keyboardOffsetAnim, {
          toValue: nextKeyboardHeight,
          duration: event?.duration ?? 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(sheetHeightAnim, {
          toValue: nextSheetHeight,
          duration: event?.duration ?? 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    };

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const keyboardTop = event?.endCoordinates?.screenY ?? SCREEN_HEIGHT;
      const nextKeyboardHeight = Math.max(SCREEN_HEIGHT - keyboardTop, 0);
      setKeyboardHeight(nextKeyboardHeight);
      animateSheetLayout(nextKeyboardHeight, event);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardHeight(0);
      animateSheetLayout(0, event);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardOffsetAnim, resolveSheetHeight, sheetHeightAnim, visible]);

  const handleClose = React.useCallback(() => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    if (Platform.OS === 'ios') {
      onClose?.();
      return;
    }

    loadRequestIdRef.current += 1;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      onClose?.();
    });
  }, [backdropOpacity, onClose, slideAnim]);

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((currentUser) => currentUser.id === user.id);
      if (isSelected) {
        return prev.filter((currentUser) => currentUser.id !== user.id);
      }

      return [...prev, user];
    });
  };

  const handleSendShare = async () => {
    if (selectedUsers.length === 0) {
      showToast(t('screens.messagesScreen.shareToFriendsModal.toasts.selectUser'), 'warning');
      return;
    }

    if (sending) {
      return;
    }

    setSending(true);

    try {
      const results = await Promise.allSettled(
        selectedUsers.map((user) =>
          sendPrivateShareMessage({
            recipientUserId: user.userId || user.id,
            shareData,
          })
        )
      );

      const successUsers = selectedUsers.filter((_, index) => results[index]?.status === 'fulfilled');
      const failedUsers = selectedUsers.filter((_, index) => results[index]?.status !== 'fulfilled');
      const successfulDeliveries = results
        .map((result, index) => {
          if (result?.status !== 'fulfilled') {
            return null;
          }

          return {
            user: selectedUsers[index],
            conversationId: result.value?.conversationId || '',
          };
        })
        .filter(Boolean);

      if (successUsers.length > 0 && onShare) {
        onShare('friends', {
          ...shareData,
          users: successUsers,
          failedUsers,
        });
      }

      if (failedUsers.length === 0) {
        const primaryDelivery = successfulDeliveries[0] || null;
        const shouldOpenConversationDirectly = successUsers.length === 1 && primaryDelivery?.user;
        handleClose();
        showAppAlert(
          t('screens.messagesScreen.shareToFriendsModal.alerts.successTitle'),
          t('screens.messagesScreen.shareToFriendsModal.alerts.successMessage', { count: successUsers.length }),
          [
            { text: t('common.ok') },
            {
              text: shouldOpenConversationDirectly
                ? t('screens.messagesScreen.shareToFriendsModal.alerts.viewConversation')
                : t('screens.messagesScreen.shareToFriendsModal.alerts.openMessages'),
              onPress: () => {
                if (shouldOpenConversationDirectly) {
                  const targetUser = primaryDelivery.user;
                  const resolvedPeerUserId = `${targetUser?.userId || targetUser?.id || ''}`.trim();
                  if (!resolvedPeerUserId) {
                    navigation.navigate({
                      name: 'Messages',
                      params: {
                        focusSection: 'privateMessages',
                        focusRequestId: Date.now(),
                      },
                      merge: true,
                    });
                    return;
                  }

                  navigation.navigate('PrivateConversation', {
                    conversationId: primaryDelivery.conversationId || undefined,
                    peerUserId: resolvedPeerUserId,
                    userId: resolvedPeerUserId,
                    id: resolvedPeerUserId,
                    peerNickName: buildLocalInviteDisplayName(targetUser),
                    username: targetUser?.username || '',
                    name: buildLocalInviteDisplayName(targetUser),
                    peerAvatar: targetUser?.avatar || '',
                  });
                  return;
                }

                navigation.navigate({
                  name: 'Messages',
                  params: {
                    focusSection: 'privateMessages',
                    focusRequestId: Date.now(),
                  },
                  merge: true,
                });
              },
            },
          ]
        );
        return;
      }

      if (successUsers.length > 0) {
        showToast(
          t('screens.messagesScreen.shareToFriendsModal.toasts.partialSuccess', {
            successCount: successUsers.length,
            failedCount: failedUsers.length,
          }),
          'warning'
        );
        setSelectedUsers(failedUsers);
      } else {
        showToast(t('screens.messagesScreen.shareToFriendsModal.errors.sendShare'), 'error');
      }
    } catch (error) {
      console.error('Failed to send share:', error);
      showToast(error?.message || t('screens.messagesScreen.shareToFriendsModal.errors.sendShare'), 'error');
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item, index }) => {
    const isSelected = selectedUsers.some((user) => user.id === item.id);
    const animValue = listItemAnimations[index] || new Animated.Value(1);
    const primaryName = buildLocalInviteDisplayName(item);
    const secondaryLabel = buildLocalInviteUserDescription(item);

    const animatedStyle = {
      opacity: animValue,
      transform: [
        {
          scale: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
        {
          translateX: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0],
          }),
        },
      ],
    };

    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity style={styles.userItem} onPress={() => toggleUserSelection(item)} activeOpacity={0.7}>
          <View style={styles.userLeft}>
            <Avatar uri={item.avatar} name={primaryName} size={44} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{primaryName}</Text>
              <Text style={styles.userUsername}>{secondaryLabel}</Text>
            </View>
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const emptyStateTitle = searchError
    ? t('screens.messagesScreen.shareToFriendsModal.empty.searchErrorTitle')
    : followingLoadError
      ? t('screens.messagesScreen.shareToFriendsModal.empty.loadErrorTitle')
      : normalizedSearchKeyword
        ? t('screens.messagesScreen.shareToFriendsModal.empty.noSearchResultsTitle')
        : t('screens.messagesScreen.shareToFriendsModal.empty.noFollowingTitle');

  const emptyStateHint = searchError
    ? t('screens.messagesScreen.shareToFriendsModal.empty.searchErrorHint')
    : followingLoadError
      ? t('screens.messagesScreen.shareToFriendsModal.empty.loadErrorHint')
      : normalizedSearchKeyword
        ? t('screens.messagesScreen.shareToFriendsModal.empty.noSearchResultsHint')
        : t('screens.messagesScreen.shareToFriendsModal.empty.noFollowingHint');

  const handleRetry = React.useCallback(() => {
    if (normalizedSearchKeyword) {
      searchRequestIdRef.current += 1;
      setSearchLoading(true);
      setSearchError('');

      const requestId = searchRequestIdRef.current;
      userApi.searchPublicProfiles(normalizedSearchKeyword, 20)
        .then(response => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }

          const normalizedUsers = normalizePublicUserSearchResponse(response);
          setSearchedUsers(normalizedUsers);
          initializeListAnimations(normalizedUsers);
        })
        .catch(error => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }

          console.warn('Failed to retry site user search in share modal:', error);
          setSearchedUsers([]);
          setSearchError(t('screens.messagesScreen.shareToFriendsModal.errors.searchUsers'));
        })
        .finally(() => {
          if (searchRequestIdRef.current === requestId) {
            setSearchLoading(false);
          }
        });
      return;
    }

    loadFollowingList();
  }, [initializeListAnimations, loadFollowingList, normalizedSearchKeyword, t]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          style={styles.keyboardAvoidingView}
        >
          <Animated.View
            style={[
              styles.container,
              {
                marginBottom: keyboardOffsetAnim,
                transform: [{ translateY: slideAnim }],
                height: sheetHeightAnim,
                paddingBottom: keyboardHeight > 0 ? 0 : bottomSafeInset,
              },
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('screens.messagesScreen.shareToFriendsModal.title')}</Text>
              <TouchableOpacity
                onPress={handleSendShare}
                disabled={selectedUsers.length === 0 || sending}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.sendButton,
                    (selectedUsers.length === 0 || sending) && styles.sendButtonDisabled,
                  ]}
                >
                  {sending ? t('screens.messagesScreen.shareToFriendsModal.sending') : t('screens.messagesScreen.shareToFriendsModal.send')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('screens.messagesScreen.shareToFriendsModal.searchPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : searchText.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="share-outline" size={16} color="#6B7280" />
                <Text style={styles.previewLabel}>{t('screens.messagesScreen.shareToFriendsModal.previewLabel')}</Text>
              </View>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {sharePreview.title}
              </Text>
              <Text style={styles.previewSummary} numberOfLines={2}>
                {sharePreview.summary}
              </Text>
            </View>

            {selectedUsers.length > 0 && (
              <View style={styles.selectedContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedList}
                  keyboardShouldPersistTaps="handled"
                >
                  {selectedUsers.map((user) => (
                    <View key={user.id} style={styles.selectedUser}>
                      <Avatar
                        uri={user.avatar}
                        name={buildLocalInviteDisplayName(user)}
                        size={40}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => toggleUserSelection(user)}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.listContainer}>
              {loadingFollowing && !normalizedSearchKeyword ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : searchLoading && normalizedSearchKeyword && displayList.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : displayList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>{emptyStateTitle}</Text>
                  <Text style={styles.emptyHint}>{emptyStateHint}</Text>
                  {searchError || followingLoadError ? (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                      <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <FlatList
                  data={displayList}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => String(item.id)}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                />
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1F2937',
  },
  sendButton: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#3B82F6',
  },
  sendButtonDisabled: {
    color: '#D1D5DB',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#1F2937',
    padding: 0,
  },
  previewCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    marginLeft: 6,
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#6B7280',
  },
  previewTitle: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    color: '#111827',
    lineHeight: scaleFont(21),
  },
  previewSummary: {
    marginTop: 6,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(19),
    color: '#6B7280',
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedList: {
    gap: 12,
    paddingTop: 2,
    paddingRight: 6,
  },
  selectedUser: {
    position: 'relative',
    paddingTop: 4,
    paddingRight: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: scaleFont(13),
    color: '#6B7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyHint: {
    marginTop: 8,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    color: '#9CA3AF',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  retryButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#2563EB',
  },
});
