import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import KeyboardDismissView from '../components/KeyboardDismissView';
import { useTranslation } from '../i18n/withTranslation';
import { modalTokens } from '../components/modalTokens';
import { showToast } from '../utils/toast';
import useBottomSafeInset from '../hooks/useBottomSafeInset';

import { scaleFont } from '../utils/responsive';
const activitiesData = [
  { id: 1, title: 'Python学习交流会', type: '线上活动', date: '2026-01-20', time: '19:00-21:00', location: '腾讯会议', participants: 45, maxParticipants: 100, organizer: '张三丰', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1', status: '报名中', description: '本次活动将邀请多位Python专家分享学习经验和实战技巧,适合零基础和有一定基础的学习者参加。' },
  { id: 2, title: 'Python实战项目分享', type: '线下活动', date: '2026-01-25', time: '14:00-17:00', location: '北京市海淀区中关村创业大街', participants: 28, maxParticipants: 50, organizer: 'Python老司机', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer1', status: '报名中', description: '分享真实的Python项目开发经验,包括数据分析、Web开发等多个方向。' },
  { id: 3, title: '数据分析入门讲座', type: '线上活动', date: '2026-01-18', time: '20:00-21:30', location: 'Zoom会议', participants: 120, maxParticipants: 200, organizer: '数据分析师小王', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=answer2', status: '即将开始', description: '从零开始学习数据分析,掌握Python数据分析的核心技能。' },
];

export default function QuestionActivityListScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { questionId, questionTitle } = route?.params || {};
  const bottomSafeInset = useBottomSafeInset(20);
  const [joinedActivities, setJoinedActivities] = useState({});
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ 
    title: '', 
    description: '', 
    startTime: '', 
    endTime: '', 
    location: '', 
    maxParticipants: '', 
    activityType: 'online',
    organizerType: 'personal',
    images: []
  });

  const handleJoinActivity = (activityId) => {
    setJoinedActivities({ ...joinedActivities, [activityId]: !joinedActivities[activityId] });
    if (!joinedActivities[activityId]) {
      showToast(t('screens.questionActivityList.joinSuccess'), 'success');
    } else {
      showToast(t('screens.questionActivityList.cancelSuccess'), 'info');
    }
  };

  const handleCreateActivity = () => {
    if (!activityForm.title.trim()) {
      showToast(t('screens.questionActivityList.modal.validation.titleRequired'), 'warning');
      return;
    }
    if (!activityForm.description.trim()) {
      showToast(t('screens.questionActivityList.modal.validation.descriptionRequired'), 'warning');
      return;
    }
    if (!activityForm.startTime || !activityForm.endTime) {
      showToast(t('screens.questionActivityList.modal.validation.timeRequired'), 'warning');
      return;
    }
    if (activityForm.activityType === 'offline' && !activityForm.location.trim()) {
      showToast(t('screens.questionActivityList.modal.validation.locationRequired'), 'warning');
      return;
    }
    showToast(t('screens.questionActivityList.modal.createSuccess'), 'success');
    setShowActivityModal(false);
    setActivityForm({ 
      title: '', 
      description: '', 
      startTime: '', 
      endTime: '', 
      location: '', 
      maxParticipants: '', 
      activityType: 'online',
      organizerType: 'personal',
      images: []
    });
  };

  const addActivityImage = () => {
    if (activityForm.images.length < 9) {
      setActivityForm({
        ...activityForm,
        images: [...activityForm.images, `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}?w=800&h=600&fit=crop`]
      });
    } else {
      showToast(t('screens.questionActivityList.modal.images.maxLimit'), 'warning');
    }
  };

  const removeActivityImage = (index) => {
    setActivityForm({
      ...activityForm,
      images: activityForm.images.filter((_, i) => i !== index)
    });
  };

  useEffect(() => {
    if (!route?.params?.openCreateModal) {
      return;
    }

    setShowActivityModal(true);
    navigation.setParams({
      openCreateModal: undefined
    });
  }, [navigation, route?.params?.openCreateModal]);

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('screens.questionActivityList.title')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{questionTitle}</Text>
        </View>
        <TouchableOpacity 
          style={styles.publishBtn} 
          onPress={() => setShowActivityModal(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Text style={styles.publishBtnText}>{t('screens.questionActivityList.publish')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.length}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalActivities')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.filter(a => a.status === '报名中').length}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.enrolling')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{activitiesData.reduce((sum, a) => sum + a.participants, 0)}</Text>
            <Text style={styles.statLabel}>{t('screens.questionActivityList.stats.totalParticipants')}</Text>
          </View>
        </View>

        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.questionActivityList.activityList')}</Text>
            <TouchableOpacity style={styles.filterBtn}>
              <Ionicons name="filter-outline" size={16} color="#6b7280" />
              <Text style={styles.filterText}>{t('screens.questionActivityList.filter')}</Text>
            </TouchableOpacity>
          </View>

          {activitiesData.map(activity => (
            <TouchableOpacity 
              key={activity.id} 
              style={styles.activityCard}
              activeOpacity={0.7}
            >
              <View style={styles.activityHeader}>
                <View style={styles.activityTypeTag}>
                  <Ionicons 
                    name={activity.type === '线上活动' ? 'videocam' : 'location'} 
                    size={12} 
                    color={activity.type === '线上活动' ? '#3b82f6' : '#22c55e'} 
                  />
                  <Text style={[styles.activityTypeText, { color: activity.type === '线上活动' ? '#3b82f6' : '#22c55e' }]}>
                    {activity.type === '线上活动' ? t('screens.questionActivityList.activityType.online') : t('screens.questionActivityList.activityType.offline')}
                  </Text>
                </View>
                <View style={[styles.activityStatusTag, activity.status === '即将开始' && styles.activityStatusTagUrgent]}>
                  <Text style={[styles.activityStatusText, activity.status === '即将开始' && styles.activityStatusTextUrgent]}>
                    {activity.status === '报名中' ? t('screens.questionActivityList.status.enrolling') : t('screens.questionActivityList.status.starting')}
                  </Text>
                </View>
              </View>

              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription} numberOfLines={2}>{activity.description}</Text>

              <View style={styles.activityInfo}>
                <View style={styles.activityInfoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                  <Text style={styles.activityInfoText}>{activity.date} {activity.time}</Text>
                </View>
                <View style={styles.activityInfoRow}>
                  <Ionicons name={activity.type === '线上活动' ? 'videocam-outline' : 'location-outline'} size={14} color="#9ca3af" />
                  <Text style={styles.activityInfoText} numberOfLines={1}>{activity.location}</Text>
                </View>
              </View>

              <View style={styles.activityFooter}>
                <View style={styles.activityOrganizer}>
                  <Image source={{ uri: activity.avatar }} style={styles.organizerAvatar} />
                  <View style={styles.organizerInfo}>
                    <Text style={styles.organizerLabel}>{t('screens.questionActivityList.organizer')}</Text>
                    <Text style={styles.organizerName}>{activity.organizer}</Text>
                  </View>
                </View>
                <View style={styles.activityActions}>
                  <View style={styles.participantsInfo}>
                    <Ionicons name="people" size={14} color="#6b7280" />
                    <Text style={styles.participantsText}>{activity.participants}/{activity.maxParticipants}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.joinBtn, joinedActivities[activity.id] && styles.joinBtnActive]}
                    onPress={() => handleJoinActivity(activity.id)}
                  >
                    <Ionicons 
                      name={joinedActivities[activity.id] ? "checkmark-circle" : "add-circle-outline"} 
                      size={16} 
                      color={joinedActivities[activity.id] ? "#22c55e" : "#fff"} 
                    />
                    <Text style={[styles.joinBtnText, joinedActivities[activity.id] && styles.joinBtnTextActive]}>
                      {joinedActivities[activity.id] ? t('screens.questionActivityList.joined') : t('screens.questionActivityList.join')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptySpace} />
      </ScrollView>

      {/* 发起活动弹窗 */}
      <Modal visible={showActivityModal} animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalKeyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <KeyboardDismissView>
        <SafeAreaView style={styles.activityModal} edges={['top']}>
          <View style={styles.activityModalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)} style={styles.activityCloseBtn}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <View style={styles.activityHeaderCenter}>
              <Text style={styles.activityModalTitle}>{t('screens.questionActivityList.modal.createTitle')}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.activityPublishBtn, !activityForm.title.trim() && styles.activityPublishBtnDisabled]}
              onPress={handleCreateActivity}
              disabled={!activityForm.title.trim()}
            >
              <Text style={[styles.activityPublishText, !activityForm.title.trim() && styles.activityPublishTextDisabled]}>{t('screens.questionActivityList.modal.publish')}</Text>
            </TouchableOpacity>
          </View>

          {/* 绑定问题显示 */}
          <View style={styles.boundQuestionCard}>
            <View style={styles.boundQuestionHeader}>
              <Ionicons name="link" size={16} color="#22c55e" />
              <Text style={styles.boundQuestionLabel}>{t('screens.questionActivityList.modal.boundQuestion')}</Text>
            </View>
            <Text style={styles.boundQuestionText} numberOfLines={2}>{questionTitle}</Text>
          </View>

          <ScrollView
            style={styles.activityFormArea}
            contentContainerStyle={[styles.activityFormContent, { paddingBottom: bottomSafeInset + 28 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* 发起身份选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.organizerType.label')} <Text style={styles.required}>{t('screens.questionActivityList.modal.organizerType.required')}</Text></Text>
              <View style={styles.organizerSelector}>
                <TouchableOpacity 
                  style={[styles.organizerOption, activityForm.organizerType === 'personal' && styles.organizerOptionActive]}
                  onPress={() => setActivityForm({...activityForm, organizerType: 'personal'})}
                >
                  <Ionicons name="person" size={20} color={activityForm.organizerType === 'personal' ? '#fff' : '#666'} />
                  <Text style={[styles.organizerOptionText, activityForm.organizerType === 'personal' && styles.organizerOptionTextActive]}>{t('screens.questionActivityList.modal.organizerType.personal')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.organizerOption, activityForm.organizerType === 'team' && styles.organizerOptionActive]}
                  onPress={() => setActivityForm({...activityForm, organizerType: 'team'})}
                >
                  <Ionicons name="people" size={20} color={activityForm.organizerType === 'team' ? '#fff' : '#666'} />
                  <Text style={[styles.organizerOptionText, activityForm.organizerType === 'team' && styles.organizerOptionTextActive]}>{t('screens.questionActivityList.modal.organizerType.team')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 活动类型选择 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.activityType.label')}</Text>
              <View style={styles.activityTypeSelector}>
                <TouchableOpacity 
                  style={[styles.activityTypeSelectorBtn, activityForm.activityType === 'online' && styles.activityTypeSelectorBtnActive]}
                  onPress={() => setActivityForm({...activityForm, activityType: 'online'})}
                >
                  <Ionicons name="globe-outline" size={20} color={activityForm.activityType === 'online' ? '#fff' : '#666'} />
                  <Text style={[styles.activityTypeSelectorText, activityForm.activityType === 'online' && styles.activityTypeSelectorTextActive]}>{t('screens.questionActivityList.modal.activityType.online')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.activityTypeSelectorBtn, activityForm.activityType === 'offline' && styles.activityTypeSelectorBtnActive]}
                  onPress={() => setActivityForm({...activityForm, activityType: 'offline'})}
                >
                  <Ionicons name="location-outline" size={20} color={activityForm.activityType === 'offline' ? '#fff' : '#666'} />
                  <Text style={[styles.activityTypeSelectorText, activityForm.activityType === 'offline' && styles.activityTypeSelectorTextActive]}>{t('screens.questionActivityList.modal.activityType.offline')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.title.label')} <Text style={styles.required}>{t('screens.questionActivityList.modal.title.required')}</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('screens.questionActivityList.modal.title.placeholder')}
                placeholderTextColor="#bbb"
                value={activityForm.title}
                onChangeText={(text) => setActivityForm({...activityForm, title: text})}
                maxLength={50}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.description.label')} <Text style={styles.required}>{t('screens.questionActivityList.modal.description.required')}</Text></Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder={t('screens.questionActivityList.modal.description.placeholder')}
                placeholderTextColor="#bbb"
                value={activityForm.description}
                onChangeText={(text) => setActivityForm({...activityForm, description: text})}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            {/* 活动时间 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.time.label')} <Text style={styles.required}>{t('screens.questionActivityList.modal.time.required')}</Text></Text>
              <View style={styles.timeContainer}>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeInputLabel}>{t('screens.questionActivityList.modal.time.startDate')}</Text>
                  <TextInput
                    style={styles.timeInputField}
                    placeholder={t('screens.questionActivityList.modal.time.startPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={activityForm.startTime}
                    onChangeText={(text) => setActivityForm({...activityForm, startTime: text})}
                  />
                </View>
                <View style={styles.timeSeparatorWrapper}>
                  <Text style={styles.timeSeparator}>{t('screens.questionActivityList.modal.time.to')}</Text>
                </View>
                <View style={styles.timeInputWrapper}>
                  <Text style={styles.timeInputLabel}>{t('screens.questionActivityList.modal.time.endDate')}</Text>
                  <TextInput
                    style={styles.timeInputField}
                    placeholder={t('screens.questionActivityList.modal.time.endPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={activityForm.endTime}
                    onChangeText={(text) => setActivityForm({...activityForm, endTime: text})}
                  />
                </View>
              </View>
            </View>

            {/* 活动地址 - 仅线下活动显示 */}
            {activityForm.activityType === 'offline' && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {t('screens.questionActivityList.modal.location.label')} <Text style={styles.required}>{t('screens.questionActivityList.modal.location.required')}</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('screens.questionActivityList.modal.location.placeholder')}
                  placeholderTextColor="#bbb"
                  value={activityForm.location}
                  onChangeText={(text) => setActivityForm({...activityForm, location: text})}
                />
              </View>
            )}

            {/* 活动图片 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.images.label')}</Text>
              <View style={styles.imageGrid}>
                {activityForm.images.map((img, idx) => (
                  <View key={idx} style={styles.imageItem}>
                    <Image source={{ uri: img }} style={styles.uploadedImage} />
                    <TouchableOpacity 
                      style={styles.removeImage} 
                      onPress={() => removeActivityImage(idx)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {activityForm.images.length < 9 && (
                  <TouchableOpacity style={styles.addImageBtn} onPress={addActivityImage}>
                    <Ionicons name="add" size={24} color="#9ca3af" />
                    <Text style={styles.addImageText}>{t('screens.questionActivityList.modal.images.add')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 联系方式 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('screens.questionActivityList.modal.contact.label')}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={t('screens.questionActivityList.modal.contact.placeholder')}
                placeholderTextColor="#bbb"
                value={activityForm.contact}
                onChangeText={(text) => setActivityForm({...activityForm, contact: text})}
              />
            </View>

            <View style={{ height: bottomSafeInset + 16 }} />
          </ScrollView>
        </SafeAreaView>
        </KeyboardDismissView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937' },
  headerSubtitle: { fontSize: scaleFont(12), color: '#9ca3af', marginTop: 2 },
  publishBtn: { backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  publishBtnText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  content: { flex: 1 },
  statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 16, marginBottom: 8 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: scaleFont(20), fontWeight: 'bold', color: '#ef4444', marginBottom: 4 },
  statLabel: { fontSize: scaleFont(12), color: '#9ca3af' },
  statDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  activitiesSection: { backgroundColor: '#fff', paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  filterText: { fontSize: scaleFont(13), color: '#6b7280' },
  activityCard: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activityTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f0f9ff' },
  activityTypeText: { fontSize: scaleFont(11), fontWeight: '500' },
  activityStatusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f0fdf4' },
  activityStatusTagUrgent: { backgroundColor: '#fef3c7' },
  activityStatusText: { fontSize: scaleFont(11), fontWeight: '500', color: '#22c55e' },
  activityStatusTextUrgent: { color: '#f59e0b' },
  activityTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  activityDescription: { fontSize: scaleFont(14), color: '#6b7280', lineHeight: scaleFont(20), marginBottom: 12 },
  activityInfo: { gap: 8, marginBottom: 12 },
  activityInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityInfoText: { fontSize: scaleFont(13), color: '#6b7280', flex: 1 },
  activityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  activityOrganizer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  organizerAvatar: { width: 32, height: 32, borderRadius: 16 },
  organizerInfo: { flex: 1 },
  organizerLabel: { fontSize: scaleFont(10), color: '#9ca3af' },
  organizerName: { fontSize: scaleFont(13), fontWeight: '500', color: '#374151' },
  activityActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  participantsInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantsText: { fontSize: scaleFont(12), color: '#6b7280' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  joinBtnActive: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#22c55e' },
  joinBtnText: { fontSize: scaleFont(13), color: '#fff', fontWeight: '500' },
  joinBtnTextActive: { color: '#22c55e' },
  emptySpace: { height: 20 },
  // 发起活动弹窗样式
  modalKeyboardView: { flex: 1 },
  activityModal: { flex: 1, backgroundColor: modalTokens.surface },
  activityModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: modalTokens.border },
  activityCloseBtn: { padding: 4 },
  activityHeaderCenter: { flex: 1, alignItems: 'center' },
  activityModalTitle: { fontSize: scaleFont(17), fontWeight: '600', color: modalTokens.textPrimary },
  activityPublishBtn: { backgroundColor: modalTokens.danger, paddingHorizontal: modalTokens.actionPaddingX, paddingVertical: modalTokens.actionPaddingY, borderRadius: modalTokens.actionRadius },
  activityPublishBtnDisabled: { backgroundColor: modalTokens.dangerSoft },
  activityPublishText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
  activityPublishTextDisabled: { color: '#fff' },
  boundQuestionCard: { backgroundColor: '#f0fdf4', padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  boundQuestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  boundQuestionLabel: { fontSize: scaleFont(12), fontWeight: '500', color: '#22c55e' },
  boundQuestionText: { fontSize: scaleFont(14), color: '#374151', lineHeight: scaleFont(20) },
  activityFormArea: { flex: 1, padding: 16, backgroundColor: modalTokens.surface },
  activityFormContent: { flexGrow: 1 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: scaleFont(14), fontWeight: '500', color: '#374151', marginBottom: 8 },
  formInput: { backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: scaleFont(15), color: modalTokens.textPrimary },
  formTextarea: { minHeight: 100, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', alignItems: 'center' },
  formSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  formSelectText: { fontSize: scaleFont(15), color: modalTokens.textSecondary, flex: 1 },
  formInputWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: modalTokens.surfaceSoft, borderWidth: 1, borderColor: modalTokens.border, borderRadius: 8, paddingHorizontal: 12 },
  formInputInner: { flex: 1, paddingVertical: 12, fontSize: scaleFont(15), color: modalTokens.textPrimary },
  activityTypeSelector: { flexDirection: 'row', gap: 12 },
  activityTypeSelectorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: modalTokens.border, backgroundColor: modalTokens.surfaceSoft, gap: 8 },
  activityTypeSelectorBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  activityTypeSelectorText: { fontSize: scaleFont(14), color: modalTokens.textSecondary, fontWeight: '500' },
  activityTypeSelectorTextActive: { color: '#fff' },
  required: { color: '#ef4444' },
  organizerSelector: { flexDirection: 'row', gap: 12 },
  organizerOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: modalTokens.border, gap: 6 },
  organizerOptionActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  organizerOptionText: { fontSize: scaleFont(14), color: modalTokens.textSecondary },
  organizerOptionTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeInputWrapper: { flex: 1 },
  timeInputLabel: { fontSize: scaleFont(12), color: modalTokens.textSecondary, marginBottom: 6 },
  timeInputField: { backgroundColor: modalTokens.surfaceSoft, borderRadius: 8, padding: 12, fontSize: scaleFont(14), borderWidth: 1, borderColor: modalTokens.border, color: modalTokens.textPrimary },
  timeSeparatorWrapper: { paddingBottom: 12 },
  timeSeparator: { fontSize: scaleFont(14), color: modalTokens.textSecondary, fontWeight: '500' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageItem: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e5e7eb', position: 'relative', overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%' },
  removeImage: { position: 'absolute', top: -8, right: -8, zIndex: 10 },
  addImageBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  addImageText: { fontSize: scaleFont(10), color: '#9ca3af', marginTop: 4 },
});
