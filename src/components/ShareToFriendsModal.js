import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showAppAlert } from '../utils/appAlert';
import {
  buildPrivateSharePayload,
  filterFriendUsers,
  mergeFriendUsers,
  normalizeFollowingResponse,
  sendPrivateShareMessage,
} from '../utils/privateShareService';
import userApi from '../services/api/userApi';
import { showToast } from '../utils/toast';

import { scaleFont } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FOLLOWING_PAGE_SIZE = 100;
const MAX_FOLLOWING_PAGES = 10;

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
  const navigation = useNavigation();
  const bottomSafeInset = useBottomSafeInset(20);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? 18 : 0;
  const loadRequestIdRef = React.useRef(0);
  const listItemAnimations = React.useRef([]).current;

  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [backdropOpacity] = useState(new Animated.Value(0));
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [followingList, setFollowingList] = useState([]);

  const sharePreview = React.useMemo(() => buildPrivateSharePayload(shareData), [shareData]);
  const displayList = React.useMemo(
    () => filterFriendUsers(followingList, searchText),
    [followingList, searchText]
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
    setLoading(true);
    setLoadError('');

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

        const pageUsers = normalizeFollowingResponse(response);
        mergedUsers = mergeFriendUsers([...mergedUsers, ...pageUsers]);

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
      setLoadError('Unable to load your following list right now.');
      showToast('Unable to load your following list right now', 'error');
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [initializeListAnimations]);

  useEffect(() => {
    if (visible) {
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();

      loadFollowingList();
      return;
    }

    loadRequestIdRef.current += 1;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    setSearchText('');
    setSelectedUsers([]);
    setFollowingList([]);
    setLoadError('');
    setSending(false);
    setKeyboardHeight(0);
  }, [backdropOpacity, loadFollowingList, slideAnim, visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event) => {
      const nextHeight = Math.max((event?.endCoordinates?.height || 0) - bottomSafeInset + 12, 0);
      setKeyboardHeight(nextHeight);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomSafeInset, visible]);

  const handleClose = () => {
    loadRequestIdRef.current += 1;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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
      showToast('Please select at least one user', 'warning');
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

      if (successUsers.length > 0 && onShare) {
        onShare('friends', {
          ...shareData,
          users: successUsers,
          failedUsers,
        });
      }

      if (failedUsers.length === 0) {
        handleClose();
        showAppAlert('Shared successfully', `Shared with ${successUsers.length} user(s).`, [
          { text: 'OK' },
          {
            text: 'Messages',
            onPress: () => navigation.navigate('Messages'),
          },
        ]);
        return;
      }

      if (successUsers.length > 0) {
        showToast(`Sent to ${successUsers.length} user(s), ${failedUsers.length} failed`, 'warning');
        setSelectedUsers(failedUsers);
      } else {
        showToast('Unable to send site share right now', 'error');
      }
    } catch (error) {
      console.error('Failed to send share:', error);
      showToast(error?.message || 'Unable to send site share right now', 'error');
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item, index }) => {
    const isSelected = selectedUsers.some((user) => user.id === item.id);
    const animValue = listItemAnimations[index] || new Animated.Value(1);
    const primaryName = item.nickname || item.username || `User ${item.userId || item.id}`;
    const secondaryLabel = item.username ? `@${item.username}` : `ID: ${item.userId || item.id}`;

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

  const emptyStateTitle = loadError
    ? 'Unable to load users'
    : searchText.trim()
      ? 'No matching users'
      : 'No followed users yet';

  const emptyStateHint = loadError
    ? 'Tap retry to load your following list again.'
    : searchText.trim()
      ? 'Try a different nickname or username. Only followed users are searchable here right now.'
      : 'Users you follow will appear here and can be shared to directly.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={keyboardVerticalOffset}
              style={styles.keyboardAvoidingView}
            >
              <Animated.View
                style={[
                  styles.container,
                  {
                    transform: [{ translateY: slideAnim }],
                    marginBottom: keyboardHeight,
                    paddingBottom: bottomSafeInset,
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
                  <Text style={styles.headerTitle}>Share to Friends</Text>
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
                      {sending ? 'Sending...' : 'Send'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search users..."
                      placeholderTextColor="#9CA3AF"
                      value={searchText}
                      onChangeText={setSearchText}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchText('')}>
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <Ionicons name="share-outline" size={16} color="#6B7280" />
                    <Text style={styles.previewLabel}>Share Preview</Text>
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
                            name={user.nickname || user.username || `User ${user.userId || user.id}`}
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
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                  ) : displayList.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyText}>{emptyStateTitle}</Text>
                      <Text style={styles.emptyHint}>{emptyStateHint}</Text>
                      {loadError ? (
                        <TouchableOpacity style={styles.retryButton} onPress={loadFollowingList}>
                          <Text style={styles.retryButtonText}>Retry</Text>
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
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: modalTokens.overlay.backgroundColor,
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.85,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedList: {
    gap: 12,
  },
  selectedUser: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  listContainer: {
    flex: 1,
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
