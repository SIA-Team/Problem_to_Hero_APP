import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
export default function InviteTeamMemberScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    teamName
  } = route?.params || {};
  const [inviteTab, setInviteTab] = useState('platform');
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // 模拟用户数据
  const platformUsers = [{
    id: 1,
    name: '李明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    verified: true,
    title: 'Python开发者'
  }, {
    id: 2,
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    verified: false,
    title: 'Web工程师'
  }, {
    id: 3,
    name: '刘强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
    verified: true,
    title: '全栈开发'
  }];
  const twitterUsers = [{
    id: 11,
    name: '@pythondev',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw1',
    verified: true,
    followers: '10k'
  }, {
    id: 12,
    name: '@webmaster',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tw2',
    verified: false,
    followers: '5k'
  }];
  const facebookUsers = [{
    id: 21,
    name: 'Python学习小组',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb1',
    verified: false,
    members: '2.5k'
  }, {
    id: 22,
    name: '编程爱好者',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fb2',
    verified: true,
    members: '8k'
  }];
  const getCurrentUserList = () => {
    switch (inviteTab) {
      case 'platform':
        return platformUsers;
      case 'twitter':
        return twitterUsers;
      case 'facebook':
        return facebookUsers;
      default:
        return [];
    }
  };
  const handleToggleUser = user => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  const handleSendInvite = () => {
    if (selectedUsers.length === 0) return;
    showAppAlert(t('screens.inviteTeamMember.alerts.successTitle'), t('screens.inviteTeamMember.alerts.successMessage').replace('{count}', selectedUsers.length), [{
      text: t('screens.inviteTeamMember.alerts.confirm'),
      onPress: () => navigation.goBack()
    }]);
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }}>
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('screens.inviteTeamMember.title')}</Text>
          {Boolean(teamName) && <Text style={styles.headerSubtitle}>{teamName}</Text>}
        </View>
        <View style={{
        width: 44
      }} />
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, inviteTab === 'platform' && styles.tabActive]} onPress={() => {
        setInviteTab('platform');
        setSelectedUsers([]);
        setSearchText('');
      }}>
          <Ionicons name="people" size={18} color={inviteTab === 'platform' ? '#f59e0b' : '#9ca3af'} />
          <Text style={[styles.tabText, inviteTab === 'platform' && styles.tabTextActive]}>
            {t('screens.inviteTeamMember.tabs.platform')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, inviteTab === 'twitter' && styles.tabActive]} onPress={() => {
        setInviteTab('twitter');
        setSelectedUsers([]);
        setSearchText('');
      }}>
          <Ionicons name="logo-twitter" size={18} color={inviteTab === 'twitter' ? '#f59e0b' : '#9ca3af'} />
          <Text style={[styles.tabText, inviteTab === 'twitter' && styles.tabTextActive]}>
            {t('screens.inviteTeamMember.tabs.twitter')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, inviteTab === 'facebook' && styles.tabActive]} onPress={() => {
        setInviteTab('facebook');
        setSelectedUsers([]);
        setSearchText('');
      }}>
          <Ionicons name="logo-facebook" size={18} color={inviteTab === 'facebook' ? '#f59e0b' : '#9ca3af'} />
          <Text style={[styles.tabText, inviteTab === 'facebook' && styles.tabTextActive]}>
            {t('screens.inviteTeamMember.tabs.facebook')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 搜索框 */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput style={styles.searchInput} placeholder={t('screens.inviteTeamMember.search.placeholder')} placeholderTextColor="#9ca3af" value={searchText} onChangeText={setSearchText} />
      </View>

      {/* 已选择用户数量 */}
      {selectedUsers.length > 0 && <View style={styles.selectedCountBadge}>
          <Text style={styles.selectedCountText}>
            {t('screens.inviteTeamMember.selectedCount').replace('{count}', selectedUsers.length)}
          </Text>
        </View>}

      {/* 用户列表 */}
      <ScrollView style={styles.userList} contentContainerStyle={{
      paddingBottom: 100
    }} showsVerticalScrollIndicator={false}>
        {getCurrentUserList().map(user => {
        const isSelected = selectedUsers.some(u => u.id === user.id);
        return <TouchableOpacity key={user.id} style={[styles.userItem, isSelected && styles.userItemSelected]} onPress={() => handleToggleUser(user)}>
              <View style={styles.userLeft}>
                <Avatar uri={user.avatar} size={40} />
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {Boolean(user.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                  </View>
                  <Text style={styles.userMeta}>
                    {inviteTab === 'platform' && user.title}
                    {inviteTab === 'twitter' && `${user.followers} ${t('screens.inviteTeamMember.userMeta.followers')}`}
                    {inviteTab === 'facebook' && `${user.members} ${t('screens.inviteTeamMember.userMeta.members')}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {Boolean(isSelected) && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>;
      })}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={[styles.footer, {
      paddingBottom: Math.max(insets.bottom, 20)
    }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>{t('screens.inviteTeamMember.actions.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sendBtn, selectedUsers.length === 0 && styles.sendBtnDisabled]} onPress={handleSendInvite} disabled={selectedUsers.length === 0}>
          <Ionicons name="send" size={16} color="#fff" />
          <Text style={styles.sendBtnText}>{t('screens.inviteTeamMember.actions.sendInvite')}</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    marginTop: 2
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    gap: 6
  },
  tabActive: {
    backgroundColor: '#fef3c7'
  },
  tabText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
    padding: 0
  },
  selectedCountBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  selectedCountText: {
    fontSize: scaleFont(13),
    color: '#f59e0b',
    fontWeight: '500',
    textAlign: 'center'
  },
  userList: {
    flex: 1,
    paddingHorizontal: 16
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb'
  },
  userItemSelected: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d'
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  userInfo: {
    flex: 1
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  userName: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#1f2937'
  },
  userMeta: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b'
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500'
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6
  },
  sendBtnDisabled: {
    backgroundColor: '#fcd34d',
    opacity: 0.5
  },
  sendBtnText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600'
  }
});