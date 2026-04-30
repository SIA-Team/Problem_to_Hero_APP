import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scaleFont } from '../utils/responsive';

const formatActivityTimeDisplay = rawValue => {
  const normalizedValue = String(rawValue || '').trim();
  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/
  );

  if (!match) {
    return {
      date: normalizedValue,
      time: '',
    };
  }

  const [, year, month, day, hour = '', minute = ''] = match;

  return {
    date: `${year}-${month}-${day}`,
    time: hour && minute ? `${hour}:${minute}` : '',
  };
};

export default function ActivityCreationForm({
  copy,
  form,
  lockedTeamId = null,
  lockedTeamName = '',
  boundQuestionTitle = '',
  bottomSpacerHeight = 20,
  onFieldFocus,
  onFieldLayout,
  onAddImage,
  onFieldChange,
  onOpenTeamSelector,
  onOpenTimeField,
  onOrganizerTypeChange,
  onRemoveImage,
  onSelectTeam,
  showTeamSelector,
  teams,
  onCloseTeamSelector,
  timeInputMode = 'text',
}) {
  const isLockedTeam = Boolean(lockedTeamId && lockedTeamName);
  const hasSelectedTeam = Boolean(form.organizerType === 'team' && form.teamName);
  const imageLabel = copy.imagesLabel;
  const startTimeDisplay = formatActivityTimeDisplay(form.startTime);
  const endTimeDisplay = formatActivityTimeDisplay(form.endTime);

  return (
    <>
      {boundQuestionTitle ? (
        <View style={styles.boundQuestionCard}>
          <View style={styles.boundQuestionHeader}>
            <Ionicons name="link" size={16} color="#22c55e" />
            <Text style={styles.boundQuestionLabel}>{copy.boundQuestionLabel}</Text>
          </View>
          <Text style={styles.boundQuestionText} numberOfLines={2}>
            {boundQuestionTitle}
          </Text>
        </View>
      ) : null}

      {!isLockedTeam ? (
        <>
          <Text style={styles.inputLabel}>
            {copy.organizerLabel} <Text style={styles.required}>{copy.organizerRequired}</Text>
          </Text>
          <View style={styles.organizerSelector}>
            <TouchableOpacity
              style={[styles.organizerOption, form.organizerType === 'personal' && styles.organizerOptionActive]}
              onPress={() => onOrganizerTypeChange('personal')}
            >
              <Ionicons name="person" size={20} color={form.organizerType === 'personal' ? '#fff' : '#666'} />
              <Text style={[styles.organizerOptionText, form.organizerType === 'personal' && styles.organizerOptionTextActive]}>
                {copy.organizerPersonal}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.organizerOption, form.organizerType === 'team' && styles.organizerOptionActive]}
              onPress={() => onOrganizerTypeChange('team')}
            >
              <Ionicons name="people" size={20} color={form.organizerType === 'team' ? '#fff' : '#666'} />
              <Text style={[styles.organizerOptionText, form.organizerType === 'team' && styles.organizerOptionTextActive]}>
                {copy.organizerTeam}
              </Text>
            </TouchableOpacity>
          </View>

          {hasSelectedTeam ? (
            <TouchableOpacity style={styles.selectedTeamBanner} onPress={onOpenTeamSelector}>
              <View style={styles.selectedTeamInfo}>
                <Ionicons name="people" size={18} color="#8b5cf6" />
                <Text style={styles.selectedTeamName}>{form.teamName}</Text>
              </View>
              <View style={styles.changeTeamBtn}>
                <Text style={styles.changeTeamText}>{copy.selectedTeamChange}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
              </View>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.inputLabel}>{copy.organizerLabel}</Text>
          <View style={styles.fixedOrganizerBanner}>
            <Ionicons name="people" size={20} color="#8b5cf6" />
            <Text style={styles.fixedOrganizerText}>{lockedTeamName}</Text>
            <View style={styles.fixedOrganizerBadge}>
              <Text style={styles.fixedOrganizerBadgeText}>{copy.organizerTeamBadge}</Text>
            </View>
          </View>
        </>
      )}

      <Text style={styles.inputLabel}>{copy.activityTypeLabel}</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeOption, form.activityType === 'online' && styles.typeOptionActive]}
          onPress={() => onFieldChange('activityType', 'online')}
        >
          <Ionicons name="globe-outline" size={20} color={form.activityType === 'online' ? '#fff' : '#666'} />
          <Text style={[styles.typeOptionText, form.activityType === 'online' && styles.typeOptionTextActive]}>
            {copy.activityTypeOnline}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, form.activityType === 'offline' && styles.typeOptionActive]}
          onPress={() => onFieldChange('activityType', 'offline')}
        >
          <Ionicons name="location-outline" size={20} color={form.activityType === 'offline' ? '#fff' : '#666'} />
          <Text style={[styles.typeOptionText, form.activityType === 'offline' && styles.typeOptionTextActive]}>
            {copy.activityTypeOffline}
          </Text>
        </TouchableOpacity>
      </View>

      <View onLayout={event => onFieldLayout?.('title', event.nativeEvent.layout.y)}>
        <Text style={styles.inputLabel}>
          {copy.titleLabel} <Text style={styles.required}>{copy.titleRequired}</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={copy.titlePlaceholder}
          placeholderTextColor="#bbb"
          value={form.title}
          onChangeText={text => onFieldChange('title', text)}
          maxLength={50}
          onFocus={() => onFieldFocus?.('title')}
        />
      </View>

      <View onLayout={event => onFieldLayout?.('description', event.nativeEvent.layout.y)}>
        <Text style={styles.inputLabel}>
          {copy.descriptionLabel} <Text style={styles.required}>{copy.descriptionRequired}</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={copy.descriptionPlaceholder}
          placeholderTextColor="#bbb"
          value={form.description}
          onChangeText={text => onFieldChange('description', text)}
          multiline
          maxLength={500}
          textAlignVertical="top"
          onFocus={() => onFieldFocus?.('description')}
        />
      </View>

      <View onLayout={event => onFieldLayout?.('time', event.nativeEvent.layout.y)}>
        <Text style={styles.inputLabel}>
          {copy.timeLabel} <Text style={styles.required}>{copy.timeRequired}</Text>
        </Text>
        <View style={styles.timeContainer}>
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeInputLabel}>{copy.timeStartDate}</Text>
            {timeInputMode === 'picker' ? (
              <TouchableOpacity
                style={styles.timePickerButton}
                activeOpacity={0.75}
                onPress={() => {
                  onFieldFocus?.('time');
                  onOpenTimeField?.('startTime');
                }}
              >
                <View style={styles.timePickerContent}>
                  {startTimeDisplay ? (
                    <>
                      <Text style={styles.timePickerDate}>{startTimeDisplay.date}</Text>
                      {startTimeDisplay.time ? (
                        <Text style={styles.timePickerTime}>{startTimeDisplay.time}</Text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Text style={styles.timePickerEmptyLabel}>{copy.timeUnsetLabel}</Text>
                      <Text style={styles.timePickerEmptyValue} numberOfLines={1}>
                        {copy.timeStartPlaceholder}
                      </Text>
                    </>
                  )}
                </View>
                <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.timeInputField}
                placeholder={copy.timeStartPlaceholder}
                placeholderTextColor="#9ca3af"
                value={form.startTime}
                onChangeText={text => onFieldChange('startTime', text)}
                onFocus={() => onFieldFocus?.('time')}
              />
            )}
          </View>
          <View style={styles.timeSeparatorWrapper}>
            <Text style={styles.timeSeparator}>{copy.timeTo}</Text>
          </View>
          <View style={styles.timeInputWrapper}>
            <Text style={styles.timeInputLabel}>{copy.timeEndDate}</Text>
            {timeInputMode === 'picker' ? (
              <TouchableOpacity
                style={styles.timePickerButton}
                activeOpacity={0.75}
                onPress={() => {
                  onFieldFocus?.('time');
                  onOpenTimeField?.('endTime');
                }}
              >
                <View style={styles.timePickerContent}>
                  {endTimeDisplay ? (
                    <>
                      <Text style={styles.timePickerDate}>{endTimeDisplay.date}</Text>
                      {endTimeDisplay.time ? (
                        <Text style={styles.timePickerTime}>{endTimeDisplay.time}</Text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Text style={styles.timePickerEmptyLabel}>{copy.timeUnsetLabel}</Text>
                      <Text style={styles.timePickerEmptyValue} numberOfLines={1}>
                        {copy.timeEndPlaceholder}
                      </Text>
                    </>
                  )}
                </View>
                <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.timeInputField}
                placeholder={copy.timeEndPlaceholder}
                placeholderTextColor="#9ca3af"
                value={form.endTime}
                onChangeText={text => onFieldChange('endTime', text)}
                onFocus={() => onFieldFocus?.('time')}
              />
            )}
          </View>
        </View>
      </View>

      {form.activityType === 'offline' ? (
        <View onLayout={event => onFieldLayout?.('location', event.nativeEvent.layout.y)}>
          <Text style={styles.inputLabel}>
            {copy.locationLabel} <Text style={styles.required}>{copy.locationRequired}</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder={copy.locationPlaceholder}
            placeholderTextColor="#bbb"
            value={form.location}
            onChangeText={text => onFieldChange('location', text)}
            onFocus={() => onFieldFocus?.('location')}
          />
        </View>
      ) : null}

      <Text style={styles.inputLabel}>{imageLabel}</Text>
      <View style={styles.imageGrid}>
        {form.images.map((img, idx) => (
          <View key={`${img}-${idx}`} style={styles.imageItem}>
            <View style={styles.imageCard}>
              <Image source={{ uri: img }} style={styles.uploadedImage} />
            </View>
            <TouchableOpacity
              style={styles.removeImage}
              onPress={() => onRemoveImage(idx)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {form.images.length < 9 ? (
          <TouchableOpacity style={styles.addImageBtn} onPress={onAddImage}>
            <Ionicons name="add" size={24} color="#9ca3af" />
            <Text style={styles.addImageText}>{copy.imagesAdd}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View onLayout={event => onFieldLayout?.('contact', event.nativeEvent.layout.y)}>
        <Text style={styles.inputLabel}>{copy.contactLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder={copy.contactPlaceholder}
          placeholderTextColor="#bbb"
          value={form.contact}
          onChangeText={text => onFieldChange('contact', text)}
          onFocus={() => onFieldFocus?.('contact')}
        />
      </View>

      <View style={{ height: bottomSpacerHeight }} />

      <Modal
        visible={showTeamSelector}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onCloseTeamSelector}
      >
        <View style={styles.teamSelectorOverlay}>
          <Pressable style={styles.teamSelectorBackdrop} onPress={onCloseTeamSelector} />
          <SafeAreaView style={styles.teamSelectorSafeArea} edges={['bottom']}>
            <View style={styles.teamSelectorModal}>
              <View style={styles.teamSelectorHandle} />
              <View style={styles.teamSelectorHeader}>
                <Text style={styles.teamSelectorTitle}>{copy.teamSelectorTitle}</Text>
                <TouchableOpacity onPress={onCloseTeamSelector} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.teamSelectorList}
                contentContainerStyle={styles.teamSelectorListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {teams.length > 0 ? (
                  teams.map(team => (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.teamSelectorItem, form.teamId === team.id && styles.teamSelectorItemActive]}
                      onPress={() => onSelectTeam(team)}
                    >
                      <View style={styles.teamSelectorItemLeft}>
                        <View style={styles.teamSelectorIcon}>
                          {team.avatar ? (
                            <Image source={{ uri: team.avatar }} style={styles.teamSelectorAvatar} />
                          ) : (
                            <Ionicons name="people" size={20} color="#8b5cf6" />
                          )}
                        </View>
                        <View style={styles.teamSelectorInfo}>
                          <Text style={styles.teamSelectorName}>{team.name}</Text>
                          <Text style={styles.teamSelectorMembers}>
                            {team.members}
                            {copy.teamSelectorMembers}
                          </Text>
                        </View>
                      </View>
                      {form.teamId === team.id ? <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" /> : null}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.teamSelectorEmptyState}>
                    <Ionicons name="people-outline" size={28} color="#c4b5fd" />
                    <Text style={styles.teamSelectorEmptyText}>{copy.validationTeamRequired}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  boundQuestionCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  boundQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  boundQuestionLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    color: '#22c55e',
  },
  boundQuestionText: {
    fontSize: scaleFont(14),
    color: '#374151',
    lineHeight: scaleFont(20),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  organizerSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
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
    gap: 6,
  },
  organizerOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  organizerOptionText: {
    fontSize: scaleFont(14),
    color: '#666',
  },
  organizerOptionTextActive: {
    color: '#fff',
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
    marginBottom: 8,
  },
  fixedOrganizerText: {
    flex: 1,
    fontSize: scaleFont(15),
    color: '#6b21a8',
    fontWeight: '500',
  },
  fixedOrganizerBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  fixedOrganizerBadgeText: {
    fontSize: scaleFont(11),
    color: '#fff',
    fontWeight: '600',
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
    marginBottom: 8,
  },
  selectedTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedTeamName: {
    fontSize: scaleFont(14),
    color: '#6b21a8',
    fontWeight: '500',
  },
  changeTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeTeamText: {
    fontSize: scaleFont(13),
    color: '#8b5cf6',
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
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
    gap: 6,
  },
  typeOptionActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  typeOptionText: {
    fontSize: scaleFont(14),
    color: '#666',
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: scaleFont(12),
    color: '#6b7280',
    marginBottom: 6,
  },
  timeInputField: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: scaleFont(14),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  timePickerButton: {
    minHeight: 58,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timePickerContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
  },
  timePickerDate: {
    fontSize: scaleFont(11),
    color: '#94a3b8',
    lineHeight: scaleFont(14),
  },
  timePickerEmptyLabel: {
    fontSize: scaleFont(11),
    color: '#94a3b8',
    lineHeight: scaleFont(14),
  },
  timePickerEmptyValue: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
    fontWeight: '500',
    lineHeight: scaleFont(19),
  },
  timePickerTime: {
    fontSize: scaleFont(17),
    color: '#111827',
    fontWeight: '600',
    lineHeight: scaleFont(21),
  },
  timePickerValue: {
    flex: 1,
    fontSize: scaleFont(14),
    color: '#1f2937',
  },
  timePickerPlaceholder: {
    color: '#9ca3af',
    lineHeight: scaleFont(20),
  },
  timeSeparatorWrapper: {
    paddingBottom: 18,
  },
  timeSeparator: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItem: {
    width: 80,
    height: 80,
    position: 'relative',
    overflow: 'visible',
  },
  imageCard: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17,24,39,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: scaleFont(10),
    color: '#9ca3af',
    marginTop: 4,
  },
  teamSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  teamSelectorBackdrop: {
    flex: 1,
  },
  teamSelectorSafeArea: {
    justifyContent: 'flex-end',
  },
  teamSelectorModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    minHeight: 320,
  },
  teamSelectorHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  teamSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  teamSelectorTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#1f2937',
  },
  teamSelectorList: {
    flex: 1,
  },
  teamSelectorListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  teamSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  teamSelectorItemActive: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  teamSelectorItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamSelectorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamSelectorAvatar: {
    width: '100%',
    height: '100%',
  },
  teamSelectorInfo: {
    flex: 1,
  },
  teamSelectorName: {
    fontSize: scaleFont(15),
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  teamSelectorMembers: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
  },
  teamSelectorEmptyState: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  teamSelectorEmptyText: {
    fontSize: scaleFont(14),
    color: '#9ca3af',
  },
});
