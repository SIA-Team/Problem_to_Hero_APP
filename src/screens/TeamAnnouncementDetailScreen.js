import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { scaleFont } from '../utils/responsive';
import { getTeamAnnouncementById } from '../services/teamDetailService';

export default function TeamAnnouncementDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const announcement = React.useMemo(
    () =>
      getTeamAnnouncementById({
        announcementId: route?.params?.announcementId ?? route?.params?.id,
        announcement: route?.params?.announcement,
        announcements: route?.params?.announcements,
        teamId: route?.params?.teamId,
        teamName: route?.params?.teamName,
      }),
    [
      route?.params?.announcement,
      route?.params?.announcementId,
      route?.params?.announcements,
      route?.params?.id,
      route?.params?.teamId,
      route?.params?.teamName,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.teamAnnouncementDetail.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{announcement?.title || t('screens.teamAnnouncementDetail.emptyTitle')}</Text>
            {announcement?.isPinned ? (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color="#ef4444" />
                <Text style={styles.pinnedText}>{t('screens.teamAnnouncementDetail.pinned')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaSection}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('screens.teamAnnouncementDetail.authorLabel')}</Text>
              <Text style={styles.metaValue}>
                {announcement?.authorName || announcement?.author || t('screens.teamAnnouncementDetail.unknownAuthor')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('screens.teamAnnouncementDetail.publishTimeLabel')}</Text>
              <Text style={styles.metaValue}>{announcement?.createdAt || '--'}</Text>
            </View>
            {announcement?.teamName ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('screens.teamAnnouncementDetail.teamLabel')}</Text>
                <Text style={styles.metaValue}>{announcement.teamName}</Text>
              </View>
            ) : null}
            {announcement?.updatedAt ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('screens.teamAnnouncementDetail.updatedAtLabel')}</Text>
                <Text style={styles.metaValue}>{announcement.updatedAt}</Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('screens.teamAnnouncementDetail.viewsLabel')}</Text>
              <Text style={styles.metaValue}>{announcement?.viewCount ?? 0}</Text>
            </View>
          </View>

          <View style={styles.bodySection}>
            <Text style={styles.bodyText}>
              {announcement?.content || t('screens.teamAnnouncementDetail.emptyContent')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: scaleFont(20),
    fontWeight: '700',
    lineHeight: 28,
    color: '#111827',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pinnedText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#ef4444',
  },
  metaSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: scaleFont(13),
    color: '#111827',
  },
  bodySection: {
    paddingTop: 4,
  },
  bodyText: {
    fontSize: scaleFont(15),
    lineHeight: 24,
    color: '#374151',
  },
});
