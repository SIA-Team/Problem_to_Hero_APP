import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { modalTokens } from './modalTokens';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { showToast } from '../utils/toast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 分享给好友弹窗组件
 * 支持搜索用户和选择关注的好友
 * 
 * @param {boolean} visible - 是否显示
 * @param {function} onClose - 关闭回调
 * @param {object} shareData - 分享的数据
 * @param {function} onShare - 分享回调
 */
export default function ShareToFriendsModal({ visible, onClose, shareData = {}, onShare }) {
  const bottomSafeInset = useBottomSafeInset(20);
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [backdropOpacity] = useState(new Animated.Value(0));
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  
  // 用户列表项动画
  const listItemAnimations = React.useRef([]).current;

  useEffect(() => {
    if (visible) {
      // 背景遮罩淡入
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // 弹窗滑入
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      
      // 加载关注列表
      loadFollowingList();
    } else {
      // 关闭动画
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
      
      // 重置状态
      setSearchText('');
      setSelectedUsers([]);
      setSearchResults([]);
    }
  }, [visible]);

  const handleClose = () => {
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

  // 加载关注列表
  const loadFollowingList = async () => {
    setLoading(true);
    try {
      // TODO: 调用API获取关注列表
      // const response = await userApi.getFollowingList();
      // setFollowingList(response.data);
      
      // 模拟数据
      const mockFollowing = [
        {
          id: 1,
          username: 'john_doe',
          nickname: 'John Doe',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
        },
        {
          id: 2,
          username: 'jane_smith',
          nickname: 'Jane Smith',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
        },
        {
          id: 3,
          username: 'mike_wilson',
          nickname: 'Mike Wilson',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
        },
      ];
      setFollowingList(mockFollowing);
      
      // 初始化列表项动画
      listItemAnimations.length = 0;
      mockFollowing.forEach(() => {
        listItemAnimations.push(new Animated.Value(0));
      });
      
      // 延迟启动列表项动画
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
      }, 300);
    } catch (error) {
      console.error('加载关注列表失败:', error);
      showToast('Failed to load following list', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  const handleSearch = async (text) => {
    setSearchText(text);
    
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // TODO: 调用API搜索用户
      // const response = await userApi.searchUsers(text);
      // setSearchResults(response.data);
      
      // 模拟搜索结果
      const mockResults = followingList.filter(user => 
        user.username.toLowerCase().includes(text.toLowerCase()) ||
        user.nickname.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(mockResults);
    } catch (error) {
      console.error('搜索用户失败:', error);
    }
  };

  // 切换用户选择
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // 发送分享
  const handleSendShare = () => {
    if (selectedUsers.length === 0) {
      showToast('Please select at least one friend', 'warning');
      return;
    }

    handleClose();
    if (onShare) {
      onShare('friends', { ...shareData, users: selectedUsers });
    }
    showToast(`Shared to ${selectedUsers.length} friend(s)`, 'success');
  };

  // 渲染用户项
  const renderUserItem = ({ item, index }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    
    // 获取对应的动画值
    const animValue = listItemAnimations[index] || new Animated.Value(1);
    
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
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => toggleUserSelection(item)}
          activeOpacity={0.7}
        >
          <View style={styles.userLeft}>
            <Avatar
              source={{ uri: item.avatar }}
              size={44}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.nickname}</Text>
              <Text style={styles.userUsername}>@{item.username}</Text>
            </View>
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const displayList = searchText.trim() ? searchResults : followingList;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[
          styles.overlay,
          {
            opacity: backdropOpacity,
          }
        ]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [{ translateY: slideAnim }],
                  paddingBottom: bottomSafeInset,
                },
              ]}
            >
              {/* 标题栏 */}
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
                  disabled={selectedUsers.length === 0}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[
                    styles.sendButton,
                    selectedUsers.length === 0 && styles.sendButtonDisabled
                  ]}>
                    Send
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 搜索框 */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 已选择的用户 */}
              {selectedUsers.length > 0 && (
                <View style={styles.selectedContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectedList}
                  >
                    {selectedUsers.map(user => (
                      <View key={user.id} style={styles.selectedUser}>
                        <Avatar source={{ uri: user.avatar }} size={40} />
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

              {/* 用户列表 */}
              <View style={styles.listContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : displayList.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>
                      {searchText.trim() ? 'No users found' : 'No following yet'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={displayList}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </Animated.View>
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  sendButton: {
    fontSize: 16,
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
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
