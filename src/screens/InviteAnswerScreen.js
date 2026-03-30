import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';

import { scaleFont } from '../utils/responsive';
export default function InviteAnswerScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [inviteTab, setInviteTab] = useState('');
  
  // Initialize inviteTab with translated value
  React.useEffect(() => {
    if (!inviteTab) {
      setInviteTab(t('screens.inviteAnswer.tabs.local'));
    }
  }, [t, inviteTab]);
  const [searchLocalUser, setSearchLocalUser] = useState('');
  const [searchTwitterUser, setSearchTwitterUser] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.inviteAnswer.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* 平台选择标签 */}
      <View style={styles.platformTabs}>
        <TouchableOpacity 
          style={[styles.platformTab, inviteTab === t('screens.inviteAnswer.tabs.local') && styles.platformTabActive]}
          onPress={() => setInviteTab(t('screens.inviteAnswer.tabs.local'))}
        >
          <Text style={[styles.platformTabText, inviteTab === t('screens.inviteAnswer.tabs.local') && styles.platformTabTextActive]}>{t('screens.inviteAnswer.tabs.local')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.platformTab, inviteTab === t('screens.inviteAnswer.tabs.twitter') && styles.platformTabActive]}
          onPress={() => setInviteTab(t('screens.inviteAnswer.tabs.twitter'))}
        >
          <Ionicons name="logo-twitter" size={16} color={inviteTab === t('screens.inviteAnswer.tabs.twitter') ? '#1DA1F2' : '#9ca3af'} />
          <Text style={[styles.platformTabText, inviteTab === t('screens.inviteAnswer.tabs.twitter') && styles.platformTabTextActive]}>{t('screens.inviteAnswer.tabs.twitter')}</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={inviteTab === t('screens.inviteAnswer.tabs.local') ? t('screens.inviteAnswer.search.placeholder') : t('screens.inviteAnswer.search.placeholderTwitter')}
            placeholderTextColor="#9ca3af"
            value={inviteTab === t('screens.inviteAnswer.tabs.local') ? searchLocalUser : searchTwitterUser}
            onChangeText={(text) => {
              if (inviteTab === t('screens.inviteAnswer.tabs.local')) setSearchLocalUser(text);
              else setSearchTwitterUser(text);
            }}
          />
        </View>
      </View>

      {/* 用户列表 */}
      <ScrollView 
        style={styles.userList} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {inviteTab === t('screens.inviteAnswer.tabs.local') && [1, 2, 3, 4, 5].map(i => (
          <View key={`local-${i}`} style={styles.userItem}>
            <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=invite${i}` }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{t('screens.inviteAnswer.search.placeholder')}{i}</Text>
              <Text style={styles.userDesc}>{t('screens.inviteAnswer.userInfo.developer')} · {i * 10}{t('screens.inviteAnswer.userInfo.answers')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.inviteBtn} 
              onPress={() => {
                showToast(`${t('screens.inviteAnswer.alerts.invitedLocal')}${i}`, 'success');
                navigation.goBack();
              }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.inviteBtnText}>{t('screens.inviteAnswer.actions.invite')}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {inviteTab === t('screens.inviteAnswer.tabs.twitter') && [1, 2, 3, 4, 5].map(i => (
          <View key={`tw-${i}`} style={styles.userItem}>
            <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=tw${i}` }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>@twitter_user{i}</Text>
              <Text style={styles.userDesc}>{i}{t('screens.inviteAnswer.userInfo.followers')}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.inviteBtn, styles.inviteBtnTwitter]} 
              onPress={() => {
                showToast(`${t('screens.inviteAnswer.alerts.invitedTwitter')}${i}`, 'success');
                navigation.goBack();
              }}
            >
              <Ionicons name="logo-twitter" size={16} color="#fff" />
              <Text style={styles.inviteBtnText}>{t('screens.inviteAnswer.actions.invite')}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
    borderBottomColor: '#f3f4f6' 
  },
  closeBtn: { 
    padding: 8, 
    minWidth: 44, 
    minHeight: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: scaleFont(18), 
    fontWeight: '600', 
    color: '#1f2937', 
    flex: 1, 
    textAlign: 'center' 
  },
  platformTabs: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    gap: 8 
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
    gap: 4 
  },
  platformTabActive: { 
    backgroundColor: '#eff6ff', 
    borderColor: '#3b82f6' 
  },
  platformTabText: { 
    fontSize: scaleFont(14), 
    color: '#6b7280', 
    fontWeight: '500' 
  },
  platformTabTextActive: { 
    color: '#3b82f6', 
    fontWeight: '600' 
  },
  searchContainer: { 
    paddingHorizontal: 16, 
    marginBottom: 16 
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
    gap: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: scaleFont(14), 
    color: '#1f2937', 
    padding: 0 
  },
  userList: { 
    flex: 1, 
    paddingHorizontal: 16 
  },
  userItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  userAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22 
  },
  userInfo: { 
    flex: 1, 
    marginLeft: 12 
  },
  userName: { 
    fontSize: scaleFont(14), 
    fontWeight: '500', 
    color: '#1f2937', 
    marginBottom: 4 
  },
  userDesc: { 
    fontSize: scaleFont(12), 
    color: '#9ca3af' 
  },
  inviteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ef4444', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16, 
    gap: 4 
  },
  inviteBtnText: { 
    fontSize: scaleFont(12), 
    color: '#fff', 
    fontWeight: '600' 
  },
  inviteBtnTwitter: { 
    backgroundColor: '#1DA1F2' 
  },
});
