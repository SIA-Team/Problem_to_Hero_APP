import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';

import { scaleFont } from '../utils/responsive';
// 模拟题库数据
const platformBanks = [
  { id: 1, name: 'React Native基础知识', questionCount: 50, author: '平台', type: 'platform', mainCategory: '行业', subCategory: '互联网' },
  { id: 2, name: 'JavaScript高级特性', questionCount: 40, author: '平台', type: 'platform', mainCategory: '行业', subCategory: '互联网' },
  { id: 3, name: 'React Hooks实战', questionCount: 35, author: '平台', type: 'platform', mainCategory: '行业', subCategory: '互联网' },
  { id: 4, name: 'TypeScript入门', questionCount: 45, author: '平台', type: 'platform', mainCategory: '行业', subCategory: '互联网' },
];

const userBanks = [
  { id: 5, name: 'Node.js后端开发', questionCount: 30, author: '张三', type: 'user', mainCategory: '行业', subCategory: '互联网' },
  { id: 6, name: 'CSS布局技巧', questionCount: 25, author: '李四', type: 'user', mainCategory: '个人', subCategory: '职业发展' },
  { id: 7, name: 'Python数据分析', questionCount: 20, author: '王五', type: 'user', mainCategory: '个人', subCategory: '兴趣爱好' },
];

export default function QuestionBankScreen({ navigation }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('platform');



  const renderBankCard = (bank) => {
    // 构建分类显示文本
    const categoryText = bank.subCategory 
      ? `${bank.mainCategory} - ${bank.subCategory}`
      : bank.mainCategory;

    return (
      <View 
        key={bank.id} 
        style={styles.bankCard}
      >
        <View style={styles.bankHeader}>
          <View style={styles.bankTitleRow}>
            <Ionicons 
              name={bank.type === 'platform' ? 'shield-checkmark' : 'person'} 
              size={18} 
              color={bank.type === 'platform' ? '#f59e0b' : '#3b82f6'} 
            />
            <Text style={styles.bankName}>{bank.name}</Text>
          </View>
        </View>

        <View style={styles.bankMeta}>
          <View style={styles.bankMetaItem}>
            <Ionicons name="document-text-outline" size={14} color="#9ca3af" />
            <Text style={styles.bankMetaText}>{bank.questionCount}{t('screens.questionBank.questionCount')}</Text>
          </View>
          <View style={styles.bankMetaItem}>
            <Ionicons name="folder-outline" size={14} color="#9ca3af" />
            <Text style={styles.bankMetaText}>{categoryText}</Text>
          </View>
          <View style={styles.bankMetaItem}>
            <Ionicons name="person-outline" size={14} color="#9ca3af" />
            <Text style={styles.bankMetaText}>{bank.author}</Text>
          </View>
        </View>

        <View style={styles.bankFooter}>
          <TouchableOpacity 
            style={styles.startExamBtn}
            onPress={() => navigation.navigate('WisdomExam', { bankId: bank.id, bankName: bank.name })}
          >
            <Ionicons name="play-circle" size={16} color="#fff" />
            <Text style={styles.startExamText}>{t('screens.questionBank.startExam')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>{t('screens.questionBank.title')}</Text>
        <TouchableOpacity 
          style={styles.uploadBtn}
          onPress={() => navigation.navigate('UploadBank')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={20} color="#f59e0b" />
          <Text style={styles.uploadBtnText}>{t('screens.questionBank.upload')}</Text>
        </TouchableOpacity>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'platform' && styles.tabActive]}
          onPress={() => setActiveTab('platform')}
        >
          <Ionicons 
            name="shield-checkmark" 
            size={18} 
            color={activeTab === 'platform' ? '#f59e0b' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, activeTab === 'platform' && styles.tabTextActive]}>
            {t('screens.questionBank.tabs.platform')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'user' && styles.tabActive]}
          onPress={() => setActiveTab('user')}
        >
          <Ionicons 
            name="people" 
            size={18} 
            color={activeTab === 'user' ? '#f59e0b' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, activeTab === 'user' && styles.tabTextActive]}>
            {t('screens.questionBank.tabs.user')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'platform' ? (
          <>
            {platformBanks.map(renderBankCard)}
          </>
        ) : (
          <>
            {userBanks.map(renderBankCard)}
          </>
        )}
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
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fef3c7', borderRadius: 8 },
  uploadBtnText: { fontSize: scaleFont(13), color: '#f59e0b', fontWeight: '600' },

  // 标签栏
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#f59e0b' },
  tabText: { fontSize: scaleFont(14), color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#f59e0b', fontWeight: '600' },

  // 题库卡片
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  bankCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bankTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  bankName: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', flex: 1 },
  bankMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  bankMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bankMetaText: { fontSize: scaleFont(12), color: '#9ca3af' },
  bankFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  startExamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', paddingVertical: 10, borderRadius: 8, gap: 6 },
  startExamText: { fontSize: scaleFont(14), color: '#fff', fontWeight: '600' },
});
