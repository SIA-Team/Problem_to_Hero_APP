import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';

import { scaleFont } from '../utils/responsive';
export default function WisdomIndexScreen({ navigation }) {
  const { t } = useTranslation();
  const wisdomData = {
    index: 92.5,
    answerCount: 234,
    adoptedCount: 156,
    fansCount: 1200,
    questionCount: 45,
    avgScore: 88.5,
    examHistory: [
      { 
        id: 1, 
        bankName: 'React Native基础知识', 
        bankType: 'platform',
        bankAuthor: '平台',
        mainCategory: '行业',
        subCategory: '互联网',
        date: '2026-01-25', 
        score: 95, 
        rank: '优秀' 
      },
      { 
        id: 2, 
        bankName: 'JavaScript高级特性', 
        bankType: 'platform',
        bankAuthor: '平台',
        mainCategory: '行业',
        subCategory: '互联网',
        date: '2026-01-20', 
        score: 85, 
        rank: '良好' 
      },
      { 
        id: 3, 
        bankName: 'CSS布局技巧', 
        bankType: 'user',
        bankAuthor: '李四',
        mainCategory: '个人',
        subCategory: '职业发展',
        date: '2026-01-15', 
        score: 90, 
        rank: '优秀' 
      },
    ]
  };

  const indicators = [
    { label: t('screens.wisdomIndex.indicators.answerCount'), value: wisdomData.answerCount, icon: 'chatbubbles', color: '#3b82f6' },
    { label: t('screens.wisdomIndex.indicators.adoptedCount'), value: wisdomData.adoptedCount, icon: 'checkmark-circle', color: '#22c55e' },
    { label: t('screens.wisdomIndex.indicators.fansCount'), value: wisdomData.fansCount, icon: 'people', color: '#f59e0b' },
    { label: t('screens.wisdomIndex.indicators.questionCount'), value: wisdomData.questionCount, icon: 'bulb', color: '#8b5cf6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.wisdomIndex.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 智慧指数卡片 */}
        <View style={styles.indexCard}>
          <View style={styles.indexIconWrapper}>
            <Ionicons name="bulb" size={48} color="#f59e0b" />
          </View>
          <Text style={styles.indexLabel}>{t('screens.wisdomIndex.currentIndexLabel')}</Text>
          <Text style={styles.indexValue}>{wisdomData.index}</Text>
          <View style={styles.indexBar}>
            <View style={[styles.indexBarFill, { width: `${wisdomData.index}%` }]} />
          </View>
          <Text style={styles.indexDesc}>{t('screens.wisdomIndex.exceedsUsers').replace('{percent}', Math.floor(wisdomData.index))}</Text>
        </View>

        {/* 指标卡片 */}
        <View style={styles.indicatorsSection}>
          <Text style={styles.sectionTitle}>{t('screens.wisdomIndex.indicators.title')}</Text>
          <View style={styles.indicatorsGrid}>
            {indicators.map((item, index) => (
              <View key={index} style={styles.indicatorCard}>
                <View style={[styles.indicatorIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.indicatorValue}>{item.value}</Text>
                <Text style={styles.indicatorLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 平均分数 */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.scoreTitle}>{t('screens.wisdomIndex.avgScore.title')}</Text>
          </View>
          <Text style={styles.scoreValue}>{wisdomData.avgScore}{t('screens.wisdomIndex.avgScore.unit')}</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${wisdomData.avgScore}%` }]} />
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('WisdomExam')}
          >
            <Ionicons name="school" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('screens.wisdomIndex.actions.dailyImprovement')}</Text>
          </TouchableOpacity>

          <View style={styles.secondaryBtns}>
            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('ExamHistory')}
            >
              <Ionicons name="list" size={20} color="#3b82f6" />
              <Text style={styles.secondaryBtnText}>{t('screens.wisdomIndex.actions.examDetail')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('QuestionBank')}
            >
              <Ionicons name="library" size={20} color="#8b5cf6" />
              <Text style={styles.secondaryBtnText}>{t('screens.wisdomIndex.actions.questionBank')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近考核记录 */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.wisdomIndex.recentExams.title')}</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ExamHistory')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>{t('screens.wisdomIndex.recentExams.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {wisdomData.examHistory.map(exam => {
            // 构建分类显示文本
            const categoryText = exam.subCategory 
              ? `${exam.mainCategory} - ${exam.subCategory}`
              : exam.mainCategory;

            return (
              <TouchableOpacity 
                key={exam.id} 
                style={styles.historyItem}
                onPress={() => navigation.navigate('ExamDetail', { examId: exam.id })}
              >
                <View style={styles.historyLeft}>
                  <Ionicons 
                    name={exam.bankType === 'platform' ? 'shield-checkmark' : 'person'} 
                    size={20} 
                    color={exam.bankType === 'platform' ? '#f59e0b' : '#3b82f6'} 
                  />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyBankName}>{exam.bankName}</Text>
                    <View style={styles.historyMeta}>
                      <View style={styles.historyMetaItem}>
                        <Ionicons name="folder-outline" size={12} color="#9ca3af" />
                        <Text style={styles.historyMetaText}>{categoryText}</Text>
                      </View>
                      <View style={styles.historyMetaItem}>
                        <Ionicons name="person-outline" size={12} color="#9ca3af" />
                        <Text style={styles.historyMetaText}>{exam.bankAuthor === '平台' ? t('screens.wisdomIndex.recentExams.platform') : exam.bankAuthor}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>{exam.date}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyScore}>{exam.score}{t('screens.wisdomIndex.recentExams.scoreUnit')}</Text>
                  <Text style={styles.historyRank}>{exam.rank === '优秀' ? t('screens.wisdomIndex.recentExams.rank.excellent') : t('screens.wisdomIndex.recentExams.rank.good')}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

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
  
  // 智慧指数卡片
  indexCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 24, alignItems: 'center' },
  indexIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  indexLabel: { fontSize: scaleFont(14), color: '#6b7280', marginBottom: 8 },
  indexValue: { fontSize: scaleFont(48), fontWeight: 'bold', color: '#f59e0b', marginBottom: 16 },
  indexBar: { width: '100%', height: 8, backgroundColor: '#fef3c7', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  indexBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  indexDesc: { fontSize: scaleFont(13), color: '#9ca3af' },

  // 指标区域
  indicatorsSection: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  indicatorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  indicatorCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', width: '48%' },
  indicatorIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  indicatorValue: { fontSize: scaleFont(24), fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  indicatorLabel: { fontSize: scaleFont(12), color: '#6b7280', textAlign: 'center' },

  // 平均分数卡片
  scoreCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  scoreTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937' },
  scoreValue: { fontSize: scaleFont(36), fontWeight: 'bold', color: '#f59e0b', marginBottom: 12 },
  scoreBar: { width: '100%', height: 8, backgroundColor: '#fef3c7', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },

  // 操作按钮
  actionsSection: { marginHorizontal: 16, marginTop: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 12, gap: 8, marginBottom: 12 },
  primaryBtnText: { fontSize: scaleFont(16), color: '#fff', fontWeight: '600' },
  secondaryBtns: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  secondaryBtnText: { fontSize: scaleFont(14), color: '#374151', fontWeight: '500' },

  // 历史记录
  historySection: { marginHorizontal: 16, marginTop: 16 },
  historySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllText: { fontSize: scaleFont(13), color: '#f59e0b', fontWeight: '500' },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8 },
  historyLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  historyInfo: { flex: 1 },
  historyBankName: { fontSize: scaleFont(14), fontWeight: '500', color: '#1f2937', marginBottom: 6 },
  historyMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  historyMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyMetaText: { fontSize: scaleFont(11), color: '#9ca3af' },
  historyDate: { fontSize: scaleFont(12), color: '#9ca3af' },
  historyRight: { alignItems: 'flex-end' },
  historyScore: { fontSize: scaleFont(18), fontWeight: 'bold', color: '#f59e0b', marginBottom: 2 },
  historyRank: { fontSize: scaleFont(12), color: '#6b7280' },
});
