import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';

import { scaleFont } from '../utils/responsive';
// 模拟考核历史数据
const examHistory = [
  { 
    id: 1, 
    bankName: 'React Native基础知识', 
    date: '2026-01-25 14:30', 
    score: 95, 
    rank: 'excellent',
    duration: '05:23',
    totalQuestions: 10,
    correctCount: 9
  },
  { 
    id: 2, 
    bankName: 'JavaScript高级特性', 
    date: '2026-01-20 10:15', 
    score: 85, 
    rank: 'good',
    duration: '07:45',
    totalQuestions: 10,
    correctCount: 8
  },
  { 
    id: 3, 
    bankName: 'React Hooks实战', 
    date: '2026-01-15 16:20', 
    score: 90, 
    rank: 'excellent',
    duration: '06:12',
    totalQuestions: 10,
    correctCount: 9
  },
  { 
    id: 4, 
    bankName: 'TypeScript入门', 
    date: '2026-01-10 09:30', 
    score: 75, 
    rank: 'pass',
    duration: '08:30',
    totalQuestions: 10,
    correctCount: 7
  },
  { 
    id: 5, 
    bankName: 'React Native基础知识', 
    date: '2026-01-05 15:45', 
    score: 80, 
    rank: 'good',
    duration: '07:00',
    totalQuestions: 10,
    correctCount: 8
  },
];

export default function ExamHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  
  const getRankColor = (rankKey) => {
    switch (rankKey) {
      case 'excellent': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'pass': return '#f59e0b';
      case 'fail': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#22c55e';
    if (score >= 80) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.examHistory.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 统计卡片 */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{examHistory.length}</Text>
          <Text style={styles.statLabel}>{t('screens.examHistory.stats.totalExams')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {examHistory.filter(e => e.score >= 60).length}
          </Text>
          <Text style={styles.statLabel}>{t('screens.examHistory.stats.passed')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {(examHistory.reduce((sum, e) => sum + e.score, 0) / examHistory.length).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>{t('screens.examHistory.stats.avgScore')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {examHistory.map(exam => (
          <TouchableOpacity 
            key={exam.id} 
            style={styles.examCard}
            onPress={() => navigation.navigate('ExamDetail', { examId: exam.id })}
          >
            <View style={styles.examHeader}>
              <View style={styles.examBankName}>
                <Ionicons name="library" size={16} color="#8b5cf6" />
                <Text style={styles.examBankNameText}>{exam.bankName}</Text>
              </View>
              <View style={[styles.examRankBadge, { backgroundColor: `${getRankColor(exam.rank)}15` }]}>
                <Text style={[styles.examRankText, { color: getRankColor(exam.rank) }]}>
                  {t(`screens.examHistory.rank.${exam.rank}`)}
                </Text>
              </View>
            </View>

            <View style={styles.examScoreRow}>
              <Text style={[styles.examScore, { color: getScoreColor(exam.score) }]}>
                {exam.score}{t('screens.examHistory.scoreUnit')}
              </Text>
              <Text style={styles.examCorrect}>
                {t('screens.examHistory.correctCount')
                  .replace('{correct}', exam.correctCount)
                  .replace('{total}', exam.totalQuestions)}
              </Text>
            </View>

            <View style={styles.examMeta}>
              <View style={styles.examMetaItem}>
                <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                <Text style={styles.examMetaText}>{exam.date}</Text>
              </View>
              <View style={styles.examMetaItem}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.examMetaText}>
                  {t('screens.examHistory.duration').replace('{time}', exam.duration)}
                </Text>
              </View>
            </View>

            <View style={styles.examFooter}>
              <Text style={styles.examDetailLink}>{t('screens.examHistory.viewDetail')}</Text>
              <Ionicons name="chevron-forward" size={16} color="#f59e0b" />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: scaleFont(18), fontWeight: '600', color: '#1f2937' },

  // 统计卡片
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  statLabel: { fontSize: scaleFont(12), color: '#9ca3af' },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginHorizontal: 16 },

  // 考核卡片
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  examCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  examHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  examBankName: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  examBankNameText: { fontSize: scaleFont(15), fontWeight: '600', color: '#1f2937', flex: 1 },
  examRankBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  examRankText: { fontSize: scaleFont(12), fontWeight: '600' },
  examScoreRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12, gap: 12 },
  examScore: { fontSize: scaleFont(32), fontWeight: 'bold' },
  examCorrect: { fontSize: scaleFont(14), color: '#6b7280' },
  examMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  examMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  examMetaText: { fontSize: scaleFont(12), color: '#9ca3af' },
  examFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  examDetailLink: { fontSize: scaleFont(13), color: '#f59e0b', fontWeight: '500' },
});
