import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';

// 模拟用户团队数据
const userTeams = [{
  id: 1,
  name: 'Python技术团队',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team1',
  members: 128,
  verified: true
}, {
  id: 2,
  name: '数据分析小组',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team2',
  members: 56,
  verified: false
}, {
  id: 3,
  name: 'AI研究团队',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team3',
  members: 89,
  verified: true
}, {
  id: 4,
  name: 'Web开发团队',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=team4',
  members: 234,
  verified: true
}];
export default function IdentitySelector({
  selectedIdentity = 'personal',
  selectedTeams = [],
  onIdentityChange,
  onTeamsChange
}) {
  const {
    t
  } = useTranslation();
  const [localIdentity, setLocalIdentity] = useState(selectedIdentity);
  const [localSelectedTeams, setLocalSelectedTeams] = useState(selectedTeams);
  const handleIdentityChange = identity => {
    setLocalIdentity(identity);
    if (onIdentityChange) {
      onIdentityChange(identity);
    }
    if (identity === 'personal') {
      setLocalSelectedTeams([]);
      if (onTeamsChange) {
        onTeamsChange([]);
      }
    }
  };
  const toggleTeam = teamId => {
    let newSelectedTeams;
    if (localSelectedTeams.includes(teamId)) {
      newSelectedTeams = localSelectedTeams.filter(id => id !== teamId);
    } else {
      newSelectedTeams = [...localSelectedTeams, teamId];
    }
    setLocalSelectedTeams(newSelectedTeams);
    if (onTeamsChange) {
      onTeamsChange(newSelectedTeams);
    }
  };
  return <View style={styles.container}>
      {/* 身份选择标题 */}
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={18} color="#6b7280" />
        <Text style={styles.headerTitle}>{t('components.identitySelector.header')}</Text>
      </View>

      {/* 身份选项 */}
      <View style={styles.identityOptions}>
        {/* 个人身份 */}
        <TouchableOpacity style={[styles.identityOption, localIdentity === 'personal' && styles.identityOptionActive]} onPress={() => handleIdentityChange('personal')} activeOpacity={0.7}>
          <View style={styles.identityOptionLeft}>
            <View style={[styles.identityRadio, localIdentity === 'personal' && styles.identityRadioActive]}>
              {localIdentity === 'personal' && <View style={styles.identityRadioDot} />}
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.identityName, localIdentity === 'personal' && styles.identityNameActive]}>{t('components.identitySelector.personal.title')}</Text>
              <Text style={styles.identityDesc}>{t('components.identitySelector.personal.description')}</Text>
            </View>
          </View>
          <Ionicons name="person" size={20} color={localIdentity === 'personal' ? '#ef4444' : '#9ca3af'} />
        </TouchableOpacity>

        {/* 团队身份 */}
        <TouchableOpacity style={[styles.identityOption, localIdentity === 'team' && styles.identityOptionActive]} onPress={() => handleIdentityChange('team')} activeOpacity={0.7}>
          <View style={styles.identityOptionLeft}>
            <View style={[styles.identityRadio, localIdentity === 'team' && styles.identityRadioActive]}>
              {localIdentity === 'team' && <View style={styles.identityRadioDot} />}
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.identityName, localIdentity === 'team' && styles.identityNameActive]}>{t('components.identitySelector.team.title')}</Text>
              <Text style={styles.identityDesc}>{t('components.identitySelector.team.description')}</Text>
            </View>
          </View>
          <Ionicons name="people" size={20} color={localIdentity === 'team' ? '#ef4444' : '#9ca3af'} />
        </TouchableOpacity>
      </View>

      {/* 团队选择列表 */}
      {localIdentity === 'team' && <View style={styles.teamsSection}>
          <View style={styles.teamsSectionHeader}>
            <Text style={styles.teamsSectionTitle}>{t('components.identitySelector.selectTeam')}</Text>
            <Text style={styles.teamsCount}>
              {t('components.identitySelector.selectedCount', {
            count: localSelectedTeams.length
          }).replace('{count}', localSelectedTeams.length)}
            </Text>
          </View>
          
          <ScrollView style={styles.teamsList} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
            {userTeams.map(team => <TouchableOpacity key={team.id} style={[styles.teamItem, localSelectedTeams.includes(team.id) && styles.teamItemSelected]} onPress={() => toggleTeam(team.id)} activeOpacity={0.7}>
                <Image source={{
            uri: team.avatar
          }} style={styles.teamAvatar} />
                <View style={styles.teamInfo}>
                  <View style={styles.teamNameRow}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {Boolean(team.verified) && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
                  </View>
                  <Text style={styles.teamMembers}>{team.members} {t('components.identitySelector.members')}</Text>
                </View>
                <View style={[styles.teamCheckbox, localSelectedTeams.includes(team.id) && styles.teamCheckboxSelected]}>
                  {localSelectedTeams.includes(team.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>)}
          </ScrollView>
        </View>}
    </View>;
}
const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151'
  },
  // 身份选项
  identityOptions: {
    gap: 10,
    marginBottom: 16
  },
  identityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14
  },
  identityOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2
  },
  identityOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  identityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  identityRadioActive: {
    borderColor: '#ef4444'
  },
  identityRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444'
  },
  identityInfo: {
    flex: 1
  },
  identityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2
  },
  identityNameActive: {
    color: '#ef4444'
  },
  identityDesc: {
    fontSize: 12,
    color: '#9ca3af'
  },
  // 团队选择
  teamsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  teamsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  teamsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  teamsCount: {
    fontSize: 12,
    color: '#6b7280'
  },
  teamsList: {
    maxHeight: 200
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  teamItemSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  teamInfo: {
    flex: 1,
    marginLeft: 10
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },
  teamMembers: {
    fontSize: 12,
    color: '#6b7280'
  },
  teamCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  teamCheckboxSelected: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  }
});