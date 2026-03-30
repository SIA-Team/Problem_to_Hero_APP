import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { scaleFont } from '../utils/responsive';
export default function CreateActivityScreen({
  navigation,
  route
}) {
  const {
    t
  } = useTranslation();
  const insets = useSafeAreaInsets();
  const teamId = route?.params?.teamId;
  const teamName = route?.params?.teamName;
  const fromTeamDetail = route?.params?.fromTeamDetail === true;
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    desc: '',
    type: 'online',
    startTime: '',
    endTime: '',
    address: '',
    image: '',
    images: [],
    contact: '',
    organizerType: teamId ? 'team' : 'personal',
    teamId: teamId || null,
    teamName: teamName || ''
  });
  const myTeams = [{
    id: 1,
    name: 'Python学习互助团队',
    members: 12
  }, {
    id: 2,
    name: 'JavaScript开发者社区',
    members: 25
  }, {
    id: 3,
    name: '数据分析爱好者',
    members: 8
  }];
  const handleCreateActivity = () => {
    if (!newActivity.title.trim()) {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.validation.titleRequired'));
      return;
    }
    if (!newActivity.desc.trim()) {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.validation.descriptionRequired'));
      return;
    }
    if (!newActivity.startTime || !newActivity.endTime) {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.validation.timeRequired'));
      return;
    }
    if (newActivity.type === 'offline' && !newActivity.address.trim()) {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.validation.locationRequired'));
      return;
    }
    if (newActivity.organizerType === 'team' && !newActivity.teamName) {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.validation.teamRequired'));
      return;
    }
    showAppAlert(t('screens.createActivity.success.title'), t('screens.createActivity.success.message'), [{
      text: t('screens.createActivity.success.confirm'),
      onPress: () => {
        navigation.goBack();
      }
    }]);
  };
  const addActivityImage = () => {
    if (newActivity.images.length < 9) {
      setNewActivity({
        ...newActivity,
        images: [...newActivity.images, `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`]
      });
    } else {
      showAppAlert(t('screens.createActivity.validation.hint'), t('screens.createActivity.images.maxLimit'));
    }
  };
  const removeActivityImage = index => {
    setNewActivity({
      ...newActivity,
      images: newActivity.images.filter((_, i) => i !== index)
    });
  };
  const handleSelectTeam = team => {
    setNewActivity({
      ...newActivity,
      teamId: team.id,
      teamName: team.name
    });
    setShowTeamSelector(false);
  };
  const handleOrganizerTypeChange = type => {
    if (type === 'team' && !teamId) {
      setShowTeamSelector(true);
    } else {
      setNewActivity({
        ...newActivity,
        organizerType: type,
        teamId: null,
        teamName: ''
      });
    }
  };
  return <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }} activeOpacity={0.7}>
          <Ionicons name="close" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.createActivity.title')}</Text>
        <TouchableOpacity onPress={handleCreateActivity} style={styles.submitBtn} hitSlop={{
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      }} activeOpacity={0.7}>
          <Text style={styles.submitText}>{t('screens.createActivity.publish')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 发起身份选择 - 仅在非团队详情页进入时显示 */}
        {!teamId && <>
            <Text style={styles.inputLabel}>{t('screens.createActivity.organizerType.label')} <Text style={styles.required}>{t('screens.createActivity.organizerType.required')}</Text></Text>
            <View style={styles.organizerSelector}>
              <TouchableOpacity style={[styles.organizerOption, newActivity.organizerType === 'personal' && styles.organizerOptionActive]} onPress={() => handleOrganizerTypeChange('personal')}>
                <Ionicons name="person" size={20} color={newActivity.organizerType === 'personal' ? '#fff' : '#666'} />
                <Text style={[styles.organizerOptionText, newActivity.organizerType === 'personal' && styles.organizerOptionTextActive]}>{t('screens.createActivity.organizerType.personal')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.organizerOption, newActivity.organizerType === 'team' && styles.organizerOptionActive]} onPress={() => handleOrganizerTypeChange('team')}>
                <Ionicons name="people" size={20} color={newActivity.organizerType === 'team' ? '#fff' : '#666'} />
                <Text style={[styles.organizerOptionText, newActivity.organizerType === 'team' && styles.organizerOptionTextActive]}>{t('screens.createActivity.organizerType.team')}</Text>
              </TouchableOpacity>
            </View>

            {/* 已选择的团队显示 */}
            {Boolean(newActivity.organizerType === 'team' && newActivity.teamName) && <TouchableOpacity style={styles.selectedTeamBanner} onPress={() => setShowTeamSelector(true)}>
                <View style={styles.selectedTeamInfo}>
                  <Ionicons name="people" size={18} color="#8b5cf6" />
                  <Text style={styles.selectedTeamName}>{newActivity.teamName}</Text>
                </View>
                <View style={styles.changeTeamBtn}>
                  <Text style={styles.changeTeamText}>{t('screens.createActivity.selectedTeam.change')}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
                </View>
              </TouchableOpacity>}

            {/* 未选择团队提示 */}
            {newActivity.organizerType === 'team' && !newActivity.teamName && <TouchableOpacity style={styles.selectTeamPrompt} onPress={() => setShowTeamSelector(true)}>
                <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" />
                <Text style={styles.selectTeamPromptText}>{t('screens.createActivity.selectedTeam.select')}</Text>
              </TouchableOpacity>}
          </>}

        {/* 从团队详情页进入时显示固定的团队身份 */}
        {Boolean(teamId && teamName) && <>
            <Text style={styles.inputLabel}>{t('screens.createActivity.organizerType.label')}</Text>
            <View style={styles.fixedOrganizerBanner}>
              <Ionicons name="people" size={20} color="#8b5cf6" />
              <Text style={styles.fixedOrganizerText}>{teamName}</Text>
              <View style={styles.fixedOrganizerBadge}>
                <Text style={styles.fixedOrganizerBadgeText}>{t('screens.createActivity.organizerType.teamBadge')}</Text>
              </View>
            </View>
          </>}

        {/* 活动类型 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.activityType.label')}</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity style={[styles.typeOption, newActivity.type === 'online' && styles.typeOptionActive]} onPress={() => setNewActivity({
          ...newActivity,
          type: 'online'
        })}>
            <Ionicons name="globe-outline" size={20} color={newActivity.type === 'online' ? '#fff' : '#666'} />
            <Text style={[styles.typeOptionText, newActivity.type === 'online' && styles.typeOptionTextActive]}>{t('screens.createActivity.activityType.online')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeOption, newActivity.type === 'offline' && styles.typeOptionActive]} onPress={() => setNewActivity({
          ...newActivity,
          type: 'offline'
        })}>
            <Ionicons name="location-outline" size={20} color={newActivity.type === 'offline' ? '#fff' : '#666'} />
            <Text style={[styles.typeOptionText, newActivity.type === 'offline' && styles.typeOptionTextActive]}>{t('screens.createActivity.activityType.offline')}</Text>
          </TouchableOpacity>
        </View>

        {/* 活动标题 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.activityTitle.label')} <Text style={styles.required}>{t('screens.createActivity.activityTitle.required')}</Text></Text>
        <TextInput style={styles.input} placeholder={t('screens.createActivity.activityTitle.placeholder')} value={newActivity.title} onChangeText={text => setNewActivity({
        ...newActivity,
        title: text
      })} maxLength={50} />

        {/* 活动内容 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.description.label')} <Text style={styles.required}>{t('screens.createActivity.description.required')}</Text></Text>
        <TextInput style={[styles.input, styles.textArea]} placeholder={t('screens.createActivity.description.placeholder')} value={newActivity.desc} onChangeText={text => setNewActivity({
        ...newActivity,
        desc: text
      })} multiline maxLength={500} />

        {/* 活动时间 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.time.label')} <Text style={styles.required}>{t('screens.createActivity.time.required')}</Text></Text>
        <View style={styles.timeContainer}>
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeInputLabel}>{t('screens.createActivity.time.startDate')}</Text>
            <TextInput style={styles.timeInputField} placeholder={t('screens.createActivity.time.startPlaceholder')} placeholderTextColor="#9ca3af" value={newActivity.startTime} onChangeText={text => setNewActivity({
            ...newActivity,
            startTime: text
          })} />
          </View>
          <View style={styles.timeSeparatorWrapper}>
            <Text style={styles.timeSeparator}>{t('screens.createActivity.time.to')}</Text>
          </View>
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeInputLabel}>{t('screens.createActivity.time.endDate')}</Text>
            <TextInput style={styles.timeInputField} placeholder={t('screens.createActivity.time.endPlaceholder')} placeholderTextColor="#9ca3af" value={newActivity.endTime} onChangeText={text => setNewActivity({
            ...newActivity,
            endTime: text
          })} />
          </View>
        </View>

        {/* 活动地址（线下活动） */}
        {newActivity.type === 'offline' && <>
            <Text style={styles.inputLabel}>{t('screens.createActivity.location.label')} <Text style={styles.required}>{t('screens.createActivity.location.required')}</Text></Text>
            <TextInput style={styles.input} placeholder={t('screens.createActivity.location.placeholder')} value={newActivity.address} onChangeText={text => setNewActivity({
          ...newActivity,
          address: text
        })} />
          </>}

        {/* 活动图片 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.images.label')}</Text>
        <View style={styles.imageGrid}>
          {newActivity.images.map((img, idx) => <View key={idx} style={styles.imageItem}>
              <Image source={{
            uri: img
          }} style={styles.uploadedImage} />
              <TouchableOpacity style={styles.removeImage} onPress={() => removeActivityImage(idx)}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>)}
          {newActivity.images.length < 9 && <TouchableOpacity style={styles.addImageBtn} onPress={addActivityImage}>
              <Ionicons name="add" size={24} color="#9ca3af" />
              <Text style={styles.addImageText}>{t('screens.createActivity.images.add')}</Text>
            </TouchableOpacity>}
        </View>

        {/* 联系方式 */}
        <Text style={styles.inputLabel}>{t('screens.createActivity.contact.label')}</Text>
        <TextInput style={styles.input} placeholder={t('screens.createActivity.contact.placeholder')} value={newActivity.contact} onChangeText={text => setNewActivity({
        ...newActivity,
        contact: text
      })} />
        
        <View style={{
        height: insets.bottom + 20
      }} />
      </ScrollView>

      {/* 团队选择器弹窗 */}
      {Boolean(showTeamSelector) && <View style={styles.teamSelectorOverlay}>
          <View style={styles.teamSelectorModal}>
            <View style={styles.teamSelectorHeader}>
              <Text style={styles.teamSelectorTitle}>{t('screens.createActivity.teamSelector.title')}</Text>
              <TouchableOpacity onPress={() => setShowTeamSelector(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.teamSelectorList}>
              {myTeams.map(team => <TouchableOpacity key={team.id} style={[styles.teamSelectorItem, newActivity.teamId === team.id && styles.teamSelectorItemActive]} onPress={() => handleSelectTeam(team)}>
                  <View style={styles.teamSelectorItemLeft}>
                    <View style={styles.teamSelectorIcon}>
                      <Ionicons name="people" size={20} color="#8b5cf6" />
                    </View>
                    <View style={styles.teamSelectorInfo}>
                      <Text style={styles.teamSelectorName}>{team.name}</Text>
                      <Text style={styles.teamSelectorMembers}>{team.members}{t('screens.createActivity.teamSelector.members')}</Text>
                    </View>
                  </View>
                  {newActivity.teamId === team.id && <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />}
                </TouchableOpacity>)}
            </ScrollView>
          </View>
        </View>}
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center'
  },
  submitBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitText: {
    fontSize: scaleFont(16),
    color: '#ef4444',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 16
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16
  },
  required: {
    color: '#ef4444'
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  organizerSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8
  },
  organizerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6
  },
  organizerOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  organizerOptionText: {
    fontSize: scaleFont(14),
    color: '#666'
  },
  organizerOptionTextActive: {
    color: '#fff'
  },
  fixedOrganizerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 8
  },
  fixedOrganizerText: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#6b21a8',
    fontWeight: '500'
  },
  fixedOrganizerBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  fixedOrganizerBadgeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600'
  },
  selectedTeamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  selectedTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  selectedTeamName: {
    fontSize: scaleFont(14),
    color: '#6b21a8',
    fontWeight: '500'
  },
  changeTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  changeTeamText: {
    fontSize: scaleFont(13),
    color: '#8b5cf6',
    fontWeight: '500'
  },
  selectTeamPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 8,
    borderStyle: 'dashed'
  },
  selectTeamPromptText: {
    fontSize: scaleFont(14),
    color: '#8b5cf6',
    fontWeight: '500'
  },
  teamSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  teamSelectorModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%'
  },
  teamSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  teamSelectorTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937'
  },
  teamSelectorList: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  teamSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb'
  },
  teamSelectorItemActive: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff'
  },
  teamSelectorItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  teamSelectorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  teamSelectorInfo: {
    flex: 1
  },
  teamSelectorName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2
  },
  teamSelectorMembers: {
    fontSize: scaleFont(12),
    color: '#9ca3af'
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6
  },
  typeOptionActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  },
  typeOptionText: {
    fontSize: scaleFont(14),
    color: '#666'
  },
  typeOptionTextActive: {
    color: '#fff'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  timeInputWrapper: {
    flex: 1
  },
  timeInputLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 6
  },
  timeInputField: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937'
  },
  timeSeparatorWrapper: {
    paddingBottom: 12
  },
  timeSeparator: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  imageItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    position: 'relative',
    overflow: 'hidden'
  },
  uploadedImage: {
    width: '100%',
    height: '100%'
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addImageText: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
    marginTop: 4
  }
});