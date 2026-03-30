import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showAppAlert } from '../utils/appAlert';
import { showToast } from '../utils/toast';
import reportApi from '../services/api/reportApi';

import { scaleFont } from '../utils/responsive';
const REPORT_TARGET_TYPE_MAP = {
  question: 1,
  answer: 2,
  supplement: 3,
  comment: 5,
};

export default function ReportScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    type = 'question',
    targetType: routeTargetType,
    targetId: routeTargetId,
  } = route?.params || {};

  const [selectedReasonId, setSelectedReasonId] = useState(null);
  const [otherRemark, setOtherRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = useMemo(
    () => [
      { id: 1, label: t('screens.report.reasons.spam') },
      { id: 2, label: t('screens.report.reasons.illegal') },
      { id: 3, label: t('screens.report.reasons.vulgar') },
      { id: 4, label: t('screens.report.reasons.infringement') },
      { id: 5, label: t('screens.report.reasons.falseInfo') },
      { id: 6, label: t('screens.report.reasons.other') },
    ],
    [t]
  );

  const resolvedTargetType =
    Number(routeTargetType) || REPORT_TARGET_TYPE_MAP[type] || REPORT_TARGET_TYPE_MAP.question;
  const resolvedTargetId = Number(routeTargetId) || 0;

  const handleSubmit = async () => {
    if (!selectedReasonId) {
      showAppAlert(
        t('screens.report.alerts.selectReasonTitle'),
        t('screens.report.alerts.selectReasonMessage')
      );
      return;
    }

    if (!resolvedTargetId) {
      showToast('Invalid report target', 'error');
      return;
    }

    if (submitting) {
      return;
    }

    const selectedReason = reportReasons.find((reason) => reason.id === selectedReasonId);
    const reasonLabel = selectedReason?.label || '';
    const reasonDetail = typeof otherRemark === 'string' ? otherRemark.trim() : '';
    const remarkNote = reasonDetail
      ? t('screens.report.alerts.remarkNote').replace('{remark}', reasonDetail)
      : '';

    try {
      setSubmitting(true);

      const payload = {
        targetType: resolvedTargetType,
        targetId: resolvedTargetId,
        reasonType: selectedReasonId,
      };

      if (reasonDetail) {
        payload.reasonDetail = reasonDetail;
      }

      const response = await reportApi.submitReport(payload);

      if (response?.code === 200) {
        showAppAlert(
          t('screens.report.alerts.successTitle'),
          t('screens.report.alerts.successMessage').replace('{reasons}', reasonLabel) + remarkNote,
          [
            {
              text: t('common.ok'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      showToast(response?.msg || 'Failed to submit report', 'error');
    } catch (error) {
      console.error('Report submission failed:', error);
      showToast(error?.message || 'Network error, please try again later', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'answer':
        return t('screens.report.title.answer');
      case 'supplement':
        return t('screens.report.title.supplement');
      case 'comment':
        return t('screens.report.title.comment');
      default:
        return t('screens.report.title.question');
    }
  };

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
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>{t('screens.report.subtitle')}</Text>

          {reportReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={styles.reportItem}
              onPress={() => setSelectedReasonId(reason.id === selectedReasonId ? null : reason.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.reportItemText}>{reason.label}</Text>
              <View
                style={[
                  styles.checkbox,
                  selectedReasonId === reason.id && styles.checkboxActive,
                ]}
              >
                {selectedReasonId === reason.id ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.remarkContainer}>
            <Text style={styles.remarkLabel}>{t('screens.report.remarkLabel')}</Text>
            <TextInput
              style={styles.remarkInput}
              placeholder={t('screens.report.remarkPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              value={otherRemark}
              onChangeText={setOtherRemark}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {t('screens.report.charCount').replace('{current}', otherRemark.length)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.7}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('screens.report.submitButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <Text style={styles.cancelText}>{t('screens.report.cancelButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flexOne: { flex: 1 },
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
  headerSpacer: {
    width: 44,
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  subtitle: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  reportItemText: {
    fontSize: scaleFont(15),
    color: '#1f2937',
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  remarkContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  remarkLabel: {
    fontSize: scaleFont(14),
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  remarkInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    fontSize: scaleFont(14),
    color: '#1f2937',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  charCount: {
    fontSize: scaleFont(12),
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: scaleFont(15),
    color: '#fff',
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelText: {
    fontSize: scaleFont(15),
    color: '#6b7280',
    fontWeight: '500',
  },
});
